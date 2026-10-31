import { afterEach, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { openTestDatabase } from "./database.js";
import type { DB, Schema } from "@db/index.js";
import { createUser, type Actor } from "@core/modules/identity/passwords.js";
import { aiDefaults, saveAIConfig } from "@core/modules/ai/config.js";
import { systemErrorReason } from "@core/shared/errors.js";
import { decodeSystemError } from "@doca/i18n";
import { createApp } from "../apps/server/src/app/create-app.js";
import { createAIRunner } from "../apps/server/src/services/ai/runner.js";
import { generateImageAsset } from "../apps/server/src/services/ai/images.js";

let db: DB, owner: Actor, other: Actor;
const password = "synthetic-image-retry-guard-2026";
const input = { text: "生成测试图片", scope: "all", attachments: [], references: [], files: [], skillIds: [], webSearch: false };

beforeEach(async () => {
  db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
  owner = { ...await createUser(db, { login: "retry-owner", displayName: "Owner", password }, { bootstrap: true }), admin: 1 };
  other = { ...await createUser(db, { login: "retry-other", displayName: "Other", password }, { actor: owner }), admin: 0 };
  await saveAIConfig(db, {
    ...aiDefaults, defaultModel: "chat", imageModel: "image",
    vendors: [
      { id: "chat-vendor", name: "Mock chat", provider: "compatible", baseUrl: "https://chat.example.test/v1", apiKey: "synthetic", enabled: true },
      { id: "image-vendor", name: "Mock image", provider: "openai", baseUrl: "https://image.example.test/v1", apiKey: "synthetic", enabled: true },
    ],
    models: [
      { id: "chat", vendorId: "chat-vendor", model: "mock-chat", alias: "Chat", enabled: true, tools: true, maxInput: 128000, maxOutput: 1000 },
      { id: "image", vendorId: "image-vendor", model: "gpt-image-test", alias: "Image", enabled: true, tools: false, imageGeneration: true, imageProfile: "gpt-image-2", maxInput: 32000, maxOutput: 1000 },
    ],
  }, 0);
});

afterEach(async () => { await db.destroy(); });

async function session(actor = owner) {
  const now = new Date().toISOString();
  const row: Schema["ai_sessions"] = { id: randomUUID(), user_id: actor.id, title: "Synthetic retry guard", model_id: "chat", resource_ids: "[]", mentioned_resource_ids: "[]", approved_resource_ids: "[]", archived: 0, revision: 1, created_at: now, updated_at: now };
  await db.insertInto("ai_sessions").values(row).execute();
  return row;
}

async function job(s: Schema["ai_sessions"], retryOf?: string, running = false) {
  const now = new Date().toISOString();
  const row: Schema["ai_jobs"] = { id: randomUUID(), session_id: s.id, user_id: s.user_id, model_id: "chat", status: running ? "running" : "failed", input: JSON.stringify({ ...input, ...(retryOf ? { retryOf } : {}) }), digest: randomUUID(), result: "", error: "", lease: running ? randomUUID() : null, lease_until: running ? new Date(Date.now() + 60000).toISOString() : null, attempts: 1, cancelled: 0, created_at: now, updated_at: now };
  await db.insertInto("ai_jobs").values(row).execute();
  return row;
}

async function unresolved(j: Schema["ai_jobs"], kind: "image_generation" | "image_revision", state: "generating" | "save_failed") {
  const id = randomUUID();
  await db.insertInto("ai_operations").values({ id, user_id: j.user_id, job_id: j.id, digest: randomUUID(), result: JSON.stringify({ kind, state, generationOperationId: id }), created_at: new Date().toISOString() }).execute();
}

it.each([
  ["image_generation", "generating", "image_result_uncertain"],
  ["image_revision", "generating", "image_result_uncertain"],
  ["image_generation", "save_failed", "image_save_failed_retry_blocked"],
  ["image_revision", "save_failed", "image_save_failed_retry_blocked"],
] as const)("rejects concurrent API retries with ancestor %s/%s before creating a job or calling any provider", async (kind, state, code) => {
  const s = await session(), root = await job(s), leaf = await job(s, root.id);
  await unresolved(root, kind, state);
  const beforeJobs = await db.selectFrom("ai_jobs").selectAll().orderBy("id").execute();
  const beforeOperations = await db.selectFrom("ai_operations").selectAll().execute();
  let providerCalls = 0;
  const noProvider: typeof fetch = async () => { providerCalls++; throw Error("No provider is allowed"); };
  const origin = "http://localhost:39497";
  const app = await createApp(db, { origin, ai: { memory: { driver: "sqlite", url: ":memory:" }, fetch: noProvider, imageFetch: noProvider } });
  try {
    const headers = { origin, host: "localhost:39497", cookie: "" };
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers, payload: { login: "retry-owner", password } });
    headers.cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    const replies = await Promise.all([0, 1].map(() => app.inject({ method: "POST", url: `/api/v1/ai/sessions/${s.id}/messages`, headers, payload: { id: randomUUID(), retryOf: leaf.id, text: "不能更改原要求", scope: "all", modelId: "chat" } })));
    for (const reply of replies) {
      expect(reply.statusCode, reply.body).toBe(409);
      expect(decodeSystemError(reply.json().message)?.code).toBe(code);
    }
    expect(providerCalls).toBe(0);
    expect(await db.selectFrom("ai_jobs").selectAll().orderBy("id").execute()).toEqual(beforeJobs);
    expect(await db.selectFrom("ai_operations").selectAll().execute()).toEqual(beforeOperations);
  } finally { await app.close(); }
});

it.each(["foreign-user", "foreign-session", "cycle"] as const)("rejects a %s retry ancestor in both the API and paid entry without provider calls", async mode => {
  const s = await session();
  const foreign = mode === "foreign-user" ? await session(other) : await session();
  const ancestor = await job(foreign), leaf = await job(s, ancestor.id);
  if (mode === "cycle")
    await db.updateTable("ai_jobs").set({ input: JSON.stringify({ ...input, retryOf: leaf.id }) }).where("id", "=", leaf.id).execute();
  let providerCalls = 0;
  const noProvider: typeof fetch = async () => { providerCalls++; throw Error("No provider is allowed"); };
  const origin = "http://localhost:39497";
  const app = await createApp(db, { origin, ai: { memory: { driver: "sqlite", url: ":memory:" }, fetch: noProvider, imageFetch: noProvider } });
  try {
    const headers = { origin, host: "localhost:39497", cookie: "" };
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers, payload: { login: "retry-owner", password } });
    headers.cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    const reply = await app.inject({ method: "POST", url: `/api/v1/ai/sessions/${s.id}/messages`, headers, payload: { id: randomUUID(), retryOf: leaf.id, modelId: "chat", text: "retry", scope: "all" } });
    expect(reply.statusCode, reply.body).toBe(409);
    const active = await job(s, leaf.id, true);
    await expect(generateImageAsset(db, { actor: owner, jobId: active.id, lease: active.lease! }, { prompt: "Different prompt" }, randomUUID(), { fetch: noProvider })).rejects.toThrow(/重试来源|重试任务记录/);
    expect(providerCalls).toBe(0);
    expect(await db.selectFrom("ai_operations").select("id").execute()).toHaveLength(0);
  } finally { await app.close(); }
});

it.each(["same-job-restart", "retry"] as const)("restores the %s paid guard in the real runner while keeping readonly tools available", async mode => {
  const s = await session(), root = await job(s, undefined, mode === "same-job-restart");
  await unresolved(root, "image_generation", "generating");
  const current = mode === "retry" ? await job(s, root.id, true) : root;
  let providerCalls = 0;
  const noProvider: typeof fetch = async () => { providerCalls++; throw Error("No provider is allowed"); };
  const runner = createAIRunner(db, { fetch: noProvider, imageFetch: noProvider, memory: { driver: "sqlite", url: ":memory:" } });
  try {
    const tools = await runner.externalTools(current, new AbortController().signal, { actor: owner, allowsTool: id => ["image_generate", "session_attachments"].includes(id), allowsSkill: () => true, authorize: async () => {} });
    expect((await tools.call("session_attachments", {}, randomUUID())).output).toBeDefined();
    const error = await tools.call("image_generate", { prompt: "A changed prompt", size: "1536x1024" }, randomUUID()).catch(error => error);
    expect(systemErrorReason(error)?.code, error instanceof Error ? error.message : JSON.stringify(error)).toBe("image_result_uncertain");
    expect(providerCalls).toBe(0);
    expect(await db.selectFrom("ai_operations").select("id").execute()).toHaveLength(1);
  } finally { await runner.close(); }
});
