import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { DB } from "@db/index.js";
import { transact } from "@db/transactions.js";
import { mcpFail as fail } from "../services/ai/mcp-errors.js";
import type { Actor } from "@core/modules/identity/passwords.js";
import { securityAudit } from "@core/modules/identity/accounts.js";
import { lockAIUser } from "@core/modules/ai/config.js";
import {
  grantIds,
  newMcpToken,
  type McpService,
} from "../services/ai/mcp-access.js";
import type { McpRuntime } from "../services/ai/mcp-runtime.js";
import { registerMcpExecutions } from "./mcp-executions.js";

export function parseMcp<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) fail(400, result.error.message);
  return result.data;
}
const serviceInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    enabled: z.boolean(),
    grantMode: z.enum(["all", "selected"]),
    toolIds: grantIds,
    skillIds: grantIds,
    expiresAt: z.iso.datetime().nullable(),
  })
  .strict();
function publicService(service: McpService) {
  const { token_hash: _hash, tool_ids, skill_ids, ...fields } = service;
  return {
    ...fields,
    toolIds: grantIds.parse(JSON.parse(tool_ids)),
    skillIds: grantIds.parse(JSON.parse(skill_ids)),
  };
}
export async function registerMcpManagement(
  api: FastifyInstance,
  db: DB,
  auth: (req: FastifyRequest) => Actor,
  admin: (req: FastifyRequest) => Actor,
  runtime: McpRuntime,
  publicOrigin?: string,
) {
  registerMcpExecutions(api, db, auth, runtime);
  const endpoint = (req: FastifyRequest) =>
    `${publicOrigin ?? `${req.protocol}://${req.headers.host}`}/api/v1/mcp`;
  api.get("/api/v1/me/mcp", async (req) => {
    const actor = auth(req),
      row = await db
        .selectFrom("mcp_user_settings")
        .selectAll()
        .where("user_id", "=", actor.id)
        .executeTakeFirst();
    return { enabled: !!row?.enabled, revision: row?.revision ?? 0 };
  });
  api.put("/api/v1/me/mcp", async (req) => {
    const actor = auth(req),
      input = parseMcp(
        z
          .object({ enabled: z.boolean(), revision: z.number().int().min(0) })
          .strict(),
        req.body,
      );
    const result = await transact(db, async (tx) => {
      await lockAIUser(tx, actor.id);
      const row = await tx
        .selectFrom("mcp_user_settings")
        .selectAll()
        .where("user_id", "=", actor.id)
        .executeTakeFirst();
      if ((row?.revision ?? 0) !== input.revision)
        fail(409, "MCP settings changed; reload before saving");
      const next = {
        user_id: actor.id,
        enabled: Number(input.enabled),
        revision: input.revision + 1,
        updated_at: new Date().toISOString(),
      };
      if (row)
        await tx
          .updateTable("mcp_user_settings")
          .set(next)
          .where("user_id", "=", actor.id)
          .execute();
      else await tx.insertInto("mcp_user_settings").values(next).execute();
      await securityAudit(tx, actor.id, actor.id, "mcp.personal.settings", {
        enabled: input.enabled,
      });
      return { enabled: input.enabled, revision: next.revision };
    });
    if (!input.enabled)
      for (const service of await db
        .selectFrom("mcp_services")
        .select("id")
        .where("kind", "=", "personal")
        .where("owner_id", "=", actor.id)
        .execute())
        await runtime.invalidate(service.id);
    return result;
  });
  for (const kind of ["personal", "admin"] as const) {
    const base =
      kind === "personal"
        ? "/api/v1/me/mcp-services"
        : "/api/v1/admin/mcp-services";
    const principal = kind === "personal" ? auth : admin;
    async function owned(req: FastifyRequest) {
      const actor = principal(req),
        serviceId = parseMcp(
          z.object({ id: z.string().uuid() }).strict(),
          req.params,
        ).id;
      const service = await db
        .selectFrom("mcp_services")
        .selectAll()
        .where("id", "=", serviceId)
        .where("kind", "=", kind)
        .executeTakeFirst();
      if (!service || (kind === "personal" && service.owner_id !== actor.id))
        fail(404, "MCP service is unavailable");
      return { actor, service };
    }
    async function validateGrants(
      actor: Actor,
      input: z.infer<typeof serviceInput>,
    ) {
      if (
        input.grantMode === "all" &&
        input.toolIds.length + input.skillIds.length
      )
        fail(400, "All grants must not contain a selected allowlist");
      if (
        input.grantMode === "selected" &&
        !input.toolIds.length &&
        !input.skillIds.length
      )
        fail(400, "Select at least one capability");
      if (input.expiresAt && input.expiresAt <= new Date().toISOString())
        fail(400, "Expiration must be in the future");
      const catalog = await runtime.catalog(actor);
      if (
        input.toolIds.some(
          (tool) => !catalog.tools.some((item) => item.id === tool),
        ) ||
        input.skillIds.some(
          (skill) => !catalog.skills.some((item) => item.id === skill),
        )
      )
        fail(400, "Unknown tool or skill grant");
    }
    api.get(base, async (req) => {
      const actor = principal(req);
      let query = db
        .selectFrom("mcp_services")
        .selectAll()
        .where("kind", "=", kind);
      if (kind === "personal") query = query.where("owner_id", "=", actor.id);
      return {
        endpoint: endpoint(req),
        services: (await query.orderBy("created_at", "desc").execute()).map(
          publicService,
        ),
      };
    });
    api.get(`${base}/catalog`, async (req) => {
      const catalog = await runtime.catalog(principal(req));
      return {
        tools: catalog.tools.map(({ id, description }) => ({
          id,
          description: description.slice(0, 240),
        })),
        skills: catalog.skills.map(({ content: _content, ...skill }) => skill),
      };
    });
    api.post(base, async (req) => {
      const actor = principal(req),
        input = parseMcp(serviceInput, req.body);
      await validateGrants(actor, input);
      const credential = newMcpToken(),
        now = new Date().toISOString();
      const service: McpService = {
        id: randomUUID(),
        kind,
        owner_id: actor.id,
        name: input.name,
        token_hash: credential.token_hash,
        token_hint: credential.token_hint,
        enabled: Number(input.enabled),
        grant_mode: input.grantMode,
        tool_ids: JSON.stringify(input.toolIds),
        skill_ids: JSON.stringify(input.skillIds),
        expires_at: input.expiresAt,
        revoked_at: null,
        revision: 1,
        created_at: now,
        updated_at: now,
      };
      await transact(db, async (tx) => {
        await tx.insertInto("mcp_services").values(service).execute();
        await securityAudit(tx, actor.id, actor.id, "mcp.service.created", {
          serviceId: service.id,
          kind,
          grantMode: input.grantMode,
          toolIds: input.toolIds,
          skillIds: input.skillIds,
        });
      });
      return {
        service: publicService(service),
        token: credential.token,
        endpoint: endpoint(req),
      };
    });
    api.put(`${base}/:id`, async (req) => {
      const { actor, service } = await owned(req),
        input = parseMcp(
          serviceInput.extend({ revision: z.number().int().positive() }),
          req.body,
        );
      await validateGrants(actor, input);
      await transact(db, async (tx) => {
        const updated = await tx
          .updateTable("mcp_services")
          .set({
            name: input.name,
            enabled: Number(input.enabled),
            grant_mode: input.grantMode,
            tool_ids: JSON.stringify(input.toolIds),
            skill_ids: JSON.stringify(input.skillIds),
            expires_at: input.expiresAt,
            revision: input.revision + 1,
            updated_at: new Date().toISOString(),
          })
          .where("id", "=", service.id)
          .where("revision", "=", input.revision)
          .where("revoked_at", "is", null)
          .executeTakeFirst();
        if (Number(updated.numUpdatedRows) !== 1)
          fail(409, "MCP service changed or was revoked; reload before saving");
        await securityAudit(
          tx,
          actor.id,
          service.owner_id,
          "mcp.service.updated",
          {
            serviceId: service.id,
            grantMode: input.grantMode,
            toolIds: input.toolIds,
            skillIds: input.skillIds,
            enabled: input.enabled,
          },
        );
      });
      await runtime.invalidate(service.id);
      return publicService(
        await db
          .selectFrom("mcp_services")
          .selectAll()
          .where("id", "=", service.id)
          .executeTakeFirstOrThrow(),
      );
    });
    for (const action of ["rotate", "revoke"] as const)
      api.post(`${base}/:id/${action}`, async (req) => {
        const { actor, service } = await owned(req),
          { revision } = parseMcp(
            z.object({ revision: z.number().int().positive() }).strict(),
            req.body,
          );
        const credential = newMcpToken(),
          now = new Date().toISOString();
        await transact(db, async (tx) => {
          const updated = await tx
            .updateTable("mcp_services")
            .set({
              ...(action === "rotate"
                ? {
                    token_hash: credential.token_hash,
                    token_hint: credential.token_hint,
                  }
                : { revoked_at: now, enabled: 0 }),
              revision: revision + 1,
              updated_at: now,
            })
            .where("id", "=", service.id)
            .where("revision", "=", revision)
            .where("revoked_at", "is", null)
            .executeTakeFirst();
          if (Number(updated.numUpdatedRows) !== 1)
            fail(409, "MCP service changed or was revoked");
          await securityAudit(
            tx,
            actor.id,
            service.owner_id,
            `mcp.service.${action}`,
            { serviceId: service.id },
          );
        });
        await runtime.invalidate(service.id);
        return {
          service: publicService(
            await db
              .selectFrom("mcp_services")
              .selectAll()
              .where("id", "=", service.id)
              .executeTakeFirstOrThrow(),
          ),
          ...(action === "rotate" ? { token: credential.token } : {}),
          endpoint: endpoint(req),
        };
      });
  }
}
