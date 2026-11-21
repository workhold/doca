import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { sql } from "kysely";
import { createSchema, CURRENT_SCHEMA_BASELINE } from "@db/create-schema.js";
import { createUser } from "@core/modules/identity/passwords.js";
import { openTestDatabase, testTableColumns } from "./database.js";

const additions = ["desktop_auth_flows", "desktop_sessions"] as const;
let db: Awaited<ReturnType<typeof openTestDatabase>>;
beforeEach(async () => {
  db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
  const user = await createUser(db, {
    login: "desktop-schema-owner", displayName: "Retained owner", password: "isolated-desktop-schema-password",
  }, { bootstrap: true });
  await db.insertInto("sessions").values({
    id: createHash("sha256").update("retained-browser-session").digest("hex"),
    user_id: user.id, expires_at: "2099-01-01T00:00:00.000Z",
  }).execute();
});
afterEach(async () => db.destroy());

async function priorFootprint() {
  const baseline = await db.selectFrom("schema_baseline").selectAll().executeTakeFirstOrThrow();
  const footprint = JSON.parse(baseline.structure_json!);
  for (const table of [...additions].reverse()) {
    await sql.raw(`drop table "${table}"`).execute(db);
    delete footprint[table];
  }
  await db.updateTable("schema_baseline").set({ structure_json: JSON.stringify(footprint) }).execute();
}

it("adds empty desktop tables without altering browser rows or generation", async () => {
  await priorFootprint();
  const users = await db.selectFrom("users").selectAll().execute();
  const sessions = await db.selectFrom("sessions").selectAll().execute();
  await createSchema(db);
  await Promise.all([createSchema(db), createSchema(db)]);
  expect(await db.selectFrom("users").selectAll().execute()).toEqual(users);
  expect(await db.selectFrom("sessions").selectAll().execute()).toEqual(sessions);
  for (const table of additions) expect(await db.selectFrom(table).selectAll().execute()).toEqual([]);
  expect((await db.selectFrom("schema_baseline").select("id").executeTakeFirstOrThrow()).id).toBe(CURRENT_SCHEMA_BASELINE);
});

it("rejects unknown structure before adding desktop tables", async () => {
  await priorFootprint();
  await sql`create table retained_unknown_desktop (id text primary key)`.execute(db);
  const baseline = await db.selectFrom("schema_baseline").selectAll().execute();
  await expect(createSchema(db)).rejects.toThrow("retained_unknown_desktop");
  const names = (await testTableColumns(db)).map((table) => table.name);
  for (const table of additions) expect(names).not.toContain(table);
  expect(await db.selectFrom("schema_baseline").selectAll().execute()).toEqual(baseline);
});
