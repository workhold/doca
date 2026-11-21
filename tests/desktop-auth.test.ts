import { createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createApp } from "@server/app/create-app.js";
import { createUser, tokenHash } from "@core/modules/identity/passwords.js";
import { openTestDatabase } from "./database.js";

const origin = "http://localhost:39130";
const host = "localhost:39130";
const password = "desktop-test-password";
let db: Awaited<ReturnType<typeof openTestDatabase>>;
let app: Awaited<ReturnType<typeof createApp>>;
let userId: string;

async function request(
  method: "GET" | "POST",
  path: string,
  payload?: object,
  headers: Record<string, string> = {},
) {
  return app.inject({
    method,
    url: `/api/v1${path}`,
    headers: { host, ...headers },
    ...(payload ? { payload } : {}),
  });
}

async function browserLogin() {
  const response = await request("POST", "/auth/login", {
    login: "desktop-user",
    password,
  }, { origin });
  expect(response.statusCode, response.body).toBe(200);
  return String(response.headers["set-cookie"]).split(";")[0]!;
}

async function startFlow() {
  const state = randomBytes(32).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const start = await request("POST", "/auth/desktop/start", { state, challenge });
  expect(start.statusCode, start.body).toBe(200);
  expect(start.json().url).toBe(`${origin}/#/desktop-connect?state=${state}`);
  return { state, verifier };
}

async function approve(state: string, cookie: string) {
  const response = await request("POST", "/auth/desktop/approve", { state }, { origin, cookie });
  expect(response.statusCode, response.body).toBe(200);
  const url = new URL(response.json().url);
  expect(url.protocol).toBe("doca:");
  expect(url.searchParams.get("state")).toBe(state);
  return url.searchParams.get("code")!;
}

beforeEach(async () => {
  db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
  const user = await createUser(db, {
    login: "desktop-user",
    displayName: "Desktop User",
    password,
  }, { bootstrap: true });
  userId = user.id;
  app = await createApp(db, { origin });
});

afterEach(async () => {
  await app?.close();
  await db?.destroy();
});

it("exchanges a browser-approved code once and keeps desktop access after browser expiry", async () => {
  const browser = await browserLogin();
  const flow = await startFlow();
  const code = await approve(flow.state, browser);
  const payload = { ...flow, code, deviceName: "Test desktop" };
  const rejected = await request("POST", "/auth/desktop/exchange", {
    ...payload,
    verifier: randomBytes(32).toString("base64url"),
  });
  expect(rejected.statusCode).toBe(401);
  const exchanged = await request("POST", "/auth/desktop/exchange", payload);
  expect(exchanged.statusCode, exchanged.body).toBe(200);
  const token = exchanged.json().token as string;
  expect(token).toMatch(/^doca_desktop_v1_[a-f0-9]{64}$/);
  expect((await request("POST", "/auth/desktop/exchange", payload)).statusCode).toBe(401);
  expect(await db.selectFrom("desktop_sessions").select("id").where("id", "=", tokenHash(token)).executeTakeFirst()).toBeTruthy();

  await db.updateTable("sessions")
    .set({ expires_at: "2000-01-01T00:00:00.000Z" })
    .where("user_id", "=", userId)
    .execute();
  const authenticated = await request("GET", "/me", undefined, { authorization: `Bearer ${token}` });
  expect(authenticated.statusCode, authenticated.body).toBe(200);
  const logout = await request("POST", "/auth/logout", {}, { authorization: `Bearer ${token}` });
  expect(logout.statusCode, logout.body).toBe(200);
  expect((await request("GET", "/me", undefined, { authorization: `Bearer ${token}` })).statusCode).toBe(401);
});

it("rejects a handoff after browser logout and revokes a desktop credential when disabled", async () => {
  const browser = await browserLogin();
  const flow = await startFlow();
  const code = await approve(flow.state, browser);
  expect((await request("POST", "/auth/logout", {}, { origin, cookie: browser })).statusCode).toBe(200);
  expect((await request("POST", "/auth/desktop/exchange", { ...flow, code, deviceName: "Desktop" })).statusCode).toBe(401);

  const nextBrowser = await browserLogin();
  const nextFlow = await startFlow();
  const nextCode = await approve(nextFlow.state, nextBrowser);
  const exchange = await request("POST", "/auth/desktop/exchange", { ...nextFlow, code: nextCode, deviceName: "Desktop" });
  expect(exchange.statusCode, exchange.body).toBe(200);
  const token = exchange.json().token as string;
  const wsHeaders = { host, origin, authorization: `Bearer ${token}` };
  const socket = await app.injectWS("/api/v1/ws", {
    headers: wsHeaders,
    rawHeaders: Object.entries(wsHeaders).flat(),
  });
  const authenticated = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Desktop WebSocket did not authenticate")), 2000);
    socket.on("message", (message) => {
      if (JSON.parse(message.toString()).type === "error") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  socket.send(JSON.stringify({ type: "unsupported" }));
  await authenticated;
  await db.updateTable("users").set({ status: "disabled" }).where("id", "=", userId).execute();
  expect((await request("GET", "/me", undefined, { authorization: `Bearer ${token}` })).statusCode).toBe(401);
  const closed = new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Disabled desktop WebSocket remained open")), 2000);
    socket.once("close", (code) => { clearTimeout(timeout); resolve(code); });
  });
  socket.send(JSON.stringify({ type: "leave" }));
  expect(await closed).toBe(4401);
});

it("allows an administrator to revoke desktop credentials without changing browser access", async () => {
  const browser = await browserLogin();
  const flow = await startFlow();
  const code = await approve(flow.state, browser);
  const exchange = await request("POST", "/auth/desktop/exchange", { ...flow, code, deviceName: "Admin test" });
  expect(exchange.statusCode, exchange.body).toBe(200);
  const token = exchange.json().token as string;
  const revoked = await request("POST", `/admin/users/${userId}/desktop/revoke`, {}, { origin, cookie: browser });
  expect(revoked.statusCode, revoked.body).toBe(200);
  expect((await request("GET", "/me", undefined, { authorization: `Bearer ${token}` })).statusCode).toBe(401);
  expect((await request("GET", "/me", undefined, { cookie: browser })).statusCode).toBe(200);
});
