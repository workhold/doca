import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { revokeDesktopSessions, tokenHash, type Actor } from "@core/modules/identity/passwords.js";
import { fail } from "@core/shared/errors.js";
import type { DB } from "@db/index.js";
import { transact } from "@db/transactions.js";

const bearerPrefix = "doca_desktop_v1_";
const statePattern = /^[a-f0-9]{64}$/;
const codePattern = /^[a-f0-9]{64}$/;
const verifierPattern = /^[A-Za-z0-9_-]{43,128}$/;
const challengePattern = /^[A-Za-z0-9_-]{43}$/;
const now = () => new Date().toISOString();

export function desktopBearerToken(header: string | undefined) {
  const match = /^Bearer (doca_desktop_v1_[a-f0-9]{64})$/.exec(header ?? "");
  return match?.[1] ?? null;
}

export function isDesktopToken(token: string | null): token is string {
  return !!token && token.startsWith(bearerPrefix) &&
    /^[a-f0-9]{64}$/.test(token.slice(bearerPrefix.length));
}

export async function desktopSessionUser(db: DB, token: string): Promise<Actor | null> {
  if (!isDesktopToken(token)) return null;
  const user = await db
    .selectFrom("desktop_sessions")
    .innerJoin("users", "users.id", "desktop_sessions.user_id")
    .select(["users.id", "users.public_id", "users.display_name", "users.admin"])
    .where("desktop_sessions.id", "=", tokenHash(token))
    .where("desktop_sessions.revoked_at", "is", null)
    .where("users.status", "=", "active")
    .executeTakeFirst();
  return user ?? null;
}

function browserToken(req: FastifyRequest) {
  const value = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("doca_session="))
    ?.slice("doca_session=".length);
  return value && statePattern.test(value) ? value : null;
}

function validChallenge(verifier: string, expected: string) {
  if (!verifierPattern.test(verifier) || !challengePattern.test(expected)) return false;
  const actual = createHash("sha256").update(verifier).digest("base64url");
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function registerDesktopClient(
  api: FastifyInstance,
  db: DB,
  options: {
    origin: URL;
    limit: (key: string, max?: number) => Promise<void>;
    admin: (req: FastifyRequest) => Actor;
    sessionToken: (req: FastifyRequest) => string | null;
  },
) {
  api.post<{ Body: { state: string; challenge: string } }>(
    "/api/v1/auth/desktop/start",
    {
      schema: {
        body: Type.Object({
          state: Type.String({ pattern: "^[a-f0-9]{64}$" }),
          challenge: Type.String({ pattern: "^[A-Za-z0-9_-]{43}$" }),
        }, { additionalProperties: false }),
      },
    },
    async (req) => {
      await options.limit(`desktop-start:${req.ip}`, 10);
      const id = tokenHash(req.body.state);
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      const inserted = await transact(db, async (tx) => {
        await tx.deleteFrom("desktop_auth_flows").where("expires_at", "<=", now()).execute();
        return tx.insertInto("desktop_auth_flows")
          .values({
            id,
            challenge: req.body.challenge,
            code_hash: null,
            user_id: null,
            browser_session_id: null,
            expires_at: expiresAt,
            created_at: now(),
          })
          .onConflict((conflict) => conflict.column("id").doNothing())
          .executeTakeFirst();
      });
      if (!inserted.numInsertedOrUpdatedRows) fail(409, "桌面登录请求已存在，请重新发起");
      return {
        url: `${options.origin.origin}/#/desktop-connect?state=${req.body.state}`,
        expiresAt,
      };
    },
  );

  api.post<{ Body: { state: string } }>(
    "/api/v1/auth/desktop/approve",
    {
      schema: {
        body: Type.Object({
          state: Type.String({ pattern: "^[a-f0-9]{64}$" }),
        }, { additionalProperties: false }),
      },
    },
    async (req) => {
      await options.limit(`desktop-approve:${req.ip}`, 20);
      const cookie = browserToken(req);
      if (!cookie) fail(401, "请先在浏览器中登录");
      const code = randomBytes(32).toString("hex");
      const result = await transact(db, async (tx) => {
        const session = await tx
          .selectFrom("sessions")
          .innerJoin("users", "users.id", "sessions.user_id")
          .select(["users.id"])
          .where("sessions.id", "=", tokenHash(cookie))
          .where("sessions.expires_at", ">", now())
          .where("users.status", "=", "active")
          .executeTakeFirst();
        if (!session) fail(401, "浏览器登录已失效");
        const updated = await tx.updateTable("desktop_auth_flows")
          .set({
            code_hash: tokenHash(code),
            user_id: session.id,
            browser_session_id: tokenHash(cookie),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
          })
          .where("id", "=", tokenHash(req.body.state))
          .where("code_hash", "is", null)
          .where("expires_at", ">", now())
          .executeTakeFirst();
        if (!updated.numUpdatedRows) fail(409, "桌面登录请求已失效，请重新发起");
        return session;
      });
      return {
        url: `doca://auth/complete?origin=${encodeURIComponent(options.origin.origin)}&state=${req.body.state}&code=${code}`,
        user: result.id,
      };
    },
  );

  api.post<{ Body: { state: string; code: string; verifier: string; deviceName: string } }>(
    "/api/v1/auth/desktop/exchange",
    {
      schema: {
        body: Type.Object({
          state: Type.String({ pattern: "^[a-f0-9]{64}$" }),
          code: Type.String({ pattern: "^[a-f0-9]{64}$" }),
          verifier: Type.String({ pattern: "^[A-Za-z0-9_-]{43,128}$" }),
          deviceName: Type.String({ minLength: 1, maxLength: 160 }),
        }, { additionalProperties: false }),
      },
    },
    async (req) => {
      await options.limit(`desktop-exchange:${req.ip}`, 20);
      const token = bearerPrefix + randomBytes(32).toString("hex");
      const user = await transact(db, async (tx) => {
        const flow = await tx.selectFrom("desktop_auth_flows")
          .selectAll()
          .where("id", "=", tokenHash(req.body.state))
          .where("code_hash", "=", tokenHash(req.body.code))
          .where("expires_at", ">", now())
          .executeTakeFirst();
        if (!flow || !flow.user_id || !flow.browser_session_id ||
          !validChallenge(req.body.verifier, flow.challenge))
          fail(401, "桌面登录授权无效");
        const browser = await tx.selectFrom("sessions")
          .select("user_id")
          .where("id", "=", flow.browser_session_id)
          .where("user_id", "=", flow.user_id)
          .where("expires_at", ">", now())
          .executeTakeFirst();
        const active = await tx.selectFrom("users")
          .select(["id", "display_name", "status"])
          .where("id", "=", flow.user_id)
          .executeTakeFirst();
        if (!browser || active?.status !== "active") fail(401, "浏览器登录或账号已失效");
        const claimed = await tx.deleteFrom("desktop_auth_flows")
          .where("id", "=", flow.id)
          .where("code_hash", "=", flow.code_hash)
          .executeTakeFirst();
        if (!claimed.numDeletedRows) fail(409, "桌面登录授权已使用");
        await tx.insertInto("desktop_sessions")
          .values({
            id: tokenHash(token),
            user_id: active.id,
            device_name: req.body.deviceName.trim(),
            created_at: now(),
            revoked_at: null,
          })
          .execute();
        return { id: active.id, displayName: active.display_name };
      });
      return { token, user };
    },
  );

  api.post("/api/v1/auth/desktop/revoke", async (req) => {
    const token = options.sessionToken(req);
    if (!isDesktopToken(token)) fail(401, "需要桌面登录");
    const session = await desktopSessionUser(db, token);
    if (!session) fail(401, "桌面登录已失效");
    await db.updateTable("desktop_sessions")
      .set({ revoked_at: now() })
      .where("id", "=", tokenHash(token))
      .where("revoked_at", "is", null)
      .execute();
    return { ok: true };
  });

  api.post<{ Params: { id: string } }>(
    "/api/v1/admin/users/:id/desktop/revoke",
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: "uuid" }) }),
      },
    },
    async (req) => {
      const actor = options.admin(req);
      await transact(db, async (tx) => {
        await revokeDesktopSessions(tx, req.params.id);
        await tx.insertInto("audit_events").values({
          id: randomUUID(), actor_id: actor.id, resource_id: null,
          action: "desktop_session.revoked", created_at: now(),
        }).execute();
      });
      return { ok: true };
    },
  );
}
