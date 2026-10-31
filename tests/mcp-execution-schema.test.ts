import { afterEach, beforeEach, expect, it } from "vitest";
import { sql } from "kysely";
import { randomUUID } from "node:crypto";
import { openTestDatabase, testTableColumns } from "./database.js";
import { createSchema } from "@db/create-schema.js";
import { createUser } from "@core/modules/identity/passwords.js";
import type { DB } from "@db/index.js";

let db: DB;
beforeEach(async () => { db = await openTestDatabase({ driver: "sqlite", path: ":memory:" }); });
afterEach(async () => { await db.destroy(); });

async function prior() {
  const actor = await createUser(db, { login: "schema-owner", displayName: "Retained owner", password: "isolated-schema-password" }, { bootstrap: true });
  const now = new Date().toISOString(), sessionId = randomUUID(), jobId = randomUUID(), serviceId = randomUUID();
  await db.insertInto("ai_sessions").values({ id: sessionId, user_id: actor.id, title: "Retained historical MCP", model_id: null, resource_ids: "[]", mentioned_resource_ids: "[]", approved_resource_ids: "[]", archived: 0, revision: 1, created_at: now, updated_at: now }).execute();
  await db.insertInto("ai_jobs").values({ id: jobId, session_id: sessionId, user_id: actor.id, model_id: "mcp-client", status: "completed", input: "{}", digest: "retained", result: "{}", error: "", lease: null, lease_until: null, attempts: 1, cancelled: 0, created_at: now, updated_at: now }).execute();
  await db.insertInto("mcp_services").values({ id: serviceId, owner_id: actor.id, kind: "personal", name: "Retained service", token_hash: "retained-token-hash", token_hint: "hash", enabled: 1, grant_mode: "all", tool_ids: "[]", skill_ids: "[]", expires_at: null, revoked_at: null, revision: 1, created_at: now, updated_at: now }).execute();
  await db.insertInto("mcp_contexts").values({ id: randomUUID(), service_id: serviceId, user_id: actor.id, session_id: sessionId, job_id: jobId, instance_id: randomUUID(), expires_at: now, closed_at: now, created_at: now }).execute();
  await sql`drop table ai_task_resources`.execute(db);
  const baseline = await db.selectFrom("schema_baseline").selectAll().executeTakeFirstOrThrow();
  const footprint = JSON.parse(baseline.structure_json!); delete footprint.ai_task_resources;
  await db.updateTable("schema_baseline").set({ structure_json: JSON.stringify(footprint) }).execute();
  for (const [table, column] of [["ai_jobs", "session_id"], ["ai_jobs", "model_id"], ["mcp_contexts", "session_id"]])
    await sql.raw(`alter table ${table} alter column ${column} set not null`).execute(db);
  return actor;
}
async function rows() {
  return {
    users: await db.selectFrom("users").selectAll().execute(),
    sessions: await db.selectFrom("ai_sessions").selectAll().execute(),
    jobs: await db.selectFrom("ai_jobs").selectAll().execute(),
    contexts: await db.selectFrom("mcp_contexts").selectAll().execute(),
    services: await db.selectFrom("mcp_services").selectAll().execute(),
  };
}
it("aligns optional task associations without converting retained rows and repeats transactionally", async () => {
  const actor = await prior(), before = await rows();
  await createSchema(db); await Promise.all([createSchema(db), createSchema(db)]);
  expect(await rows()).toEqual(before);
  expect(await db.selectFrom("ai_task_resources").selectAll().execute()).toEqual([]);
  const columns = await testTableColumns(db);
  expect(columns.some(table => table.name === "ai_task_resources")).toBe(true);
  const job = { ...before.jobs[0]!, id: randomUUID(), user_id: actor.id, session_id: null, model_id: null };
  await db.insertInto("ai_jobs").values(job).execute();
  await db.insertInto("mcp_contexts").values({ ...before.contexts[0]!, id: randomUUID(), session_id: null, job_id: job.id }).execute();
  expect(await db.selectFrom("ai_jobs").selectAll().where("id", "=", job.id).executeTakeFirst()).toEqual(job);
});
it("rejects review differences before nullable alignment or table creation and preserves the footprint", async () => {
  await prior(); const before = await rows();
  await sql`create table mcp_unknown_data (id text primary key, body text not null)`.execute(db);
  await sql`insert into mcp_unknown_data values ('keep','retain')`.execute(db);
  const baseline = await db.selectFrom("schema_baseline").selectAll().execute();
  await expect(createSchema(db)).rejects.toThrow("mcp_unknown_data");
  expect(await rows()).toEqual(before);
  expect(await db.selectFrom("schema_baseline").selectAll().execute()).toEqual(baseline);
  expect((await testTableColumns(db)).some(table => table.name === "ai_task_resources")).toBe(false);
  await expect(db.insertInto("ai_jobs").values({ ...before.jobs[0]!, id: randomUUID(), session_id: null, model_id: null }).execute()).rejects.toThrow();
});
it("refuses to recreate a previously installed execution resource ledger", async () => {
  await sql`drop table ai_task_resources`.execute(db);
  await expect(createSchema(db)).rejects.toThrow("possible data loss");
});
