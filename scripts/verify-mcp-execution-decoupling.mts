// Creates isolated fixtures from the released source, never a deployment database.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, readFile, symlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";
import { sql } from "kysely";
import { openDatabase, type DatabaseConfig } from "@db/connection.js";
import { createSchema } from "@db/create-schema.js";

if (process.env.DOCA_QA_ISOLATED !== "1") throw Error("Set DOCA_QA_ISOLATED=1; isolated fixtures only");
const driver = process.argv[2] ?? "sqlite";
assert(["sqlite", "postgres"].includes(driver));
const exec = promisify(execFile), source = process.cwd();
const root = resolve("artifacts/verification/mcp-decoupling", `${driver}-${randomUUID()}`);
await mkdir(root, { recursive: true });
process.env.DOCA_FILE_STORE_ID = "mcp-fixture";
process.env.DOCA_CREDENTIAL_MASTER_KEY = randomBytes(32).toString("hex");
process.env.DOCA_FILE_STORES_JSON = JSON.stringify({ version: 1, stores: { "mcp-fixture": { provider: "local", root: join(root, "objects") } } });
const released = join(root, "released");
await mkdir(released);
const archive = join(root, "released.tar");
await exec("git", ["archive", "--format=tar", `--output=${archive}`, "v0.2.29", "apps/server/src", "packages", "tsconfig.json"]);
await exec("tar", ["-xf", archive, "-C", released]);
await symlink(join(source, "node_modules"), join(released, "node_modules"));
const fixture = join(root, "seed.mts"), snapshot = join(root, "snapshot.json");
let admin: Pool | undefined, database: string | undefined;
let config: DatabaseConfig;
if (driver === "postgres") {
  assert(process.env.DOCA_TEST_POSTGRES, "DOCA_TEST_POSTGRES must point at a dedicated test server");
  admin = new Pool({ connectionString: process.env.DOCA_TEST_POSTGRES, max: 1 });
  database = `doca_mcp_decoupling_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`create database ${database}`);
  const url = new URL(process.env.DOCA_TEST_POSTGRES!);
  url.pathname = "/" + database;
  config = { driver: "postgres", url: url.href };
} else config = { driver: "sqlite", path: join(root, "released.db") };
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
const hash = (rows: unknown[]) => createHash("sha256").update(JSON.stringify(rows.map(canonical).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))).digest("hex");
await writeFile(fixture, `
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const load = relative => import(pathToFileURL(resolve(relative)).href);
const { openDatabase } = await load('packages/db/src/connection.ts');
const { createUser } = await load('packages/core/src/modules/identity/passwords.ts');
const { createContent } = await load('packages/core/src/workflows/resources.ts');
const { createMcpRuntime } = await load('apps/server/src/services/ai/mcp-runtime.ts');
const db = await openDatabase(JSON.parse(process.env.MCP_FIXTURE_CONFIG));
try {
 const actor = await createUser(db, { login:'released-mcp-owner',displayName:'Retained owner',password:'isolated-release-password' }, {bootstrap:true});
 await createContent(db).create(actor, {kind:'document',format:'markdown',title:'Released retained document'});
 const now = new Date().toISOString();
 const service = {id:randomUUID(),kind:'personal',owner_id:actor.id,name:'Released MCP',token_hash:'released-hash',token_hint:'released',enabled:1,grant_mode:'all',tool_ids:'[]',skill_ids:'[]',expires_at:null,revoked_at:null,revision:1,created_at:now,updated_at:now};
 await db.insertInto('mcp_services').values(service).execute();
 await db.insertInto('mcp_user_settings').values({user_id:actor.id,enabled:1,revision:1,updated_at:now}).execute();
 const runtime = createMcpRuntime(db, {externalTools:async()=>({tools:[],skills:[],call:async()=>({output:{}})})});
 const opened = await runtime.open(service,actor,'Retained released MCP conversation');
 await runtime.closeContext(service,actor,opened.contextId); await runtime.close();
 const tables = {};
 for (const table of await db.introspection.getTables()) {
  if(table.name==='schema_baseline') continue;
  tables[table.name] = await db.selectFrom(table.name).selectAll().execute();
 }
 await writeFile(process.env.MCP_FIXTURE_SNAPSHOT,JSON.stringify({actorId:actor.id,opened,tables}));
} finally {await db.destroy()}
`);
try {
  const seed = await exec(process.execPath, ["--import", "tsx", fixture], {
    cwd: released,
    env: { ...process.env, TSX_TSCONFIG_PATH: join(released, "tsconfig.json"), MCP_FIXTURE_CONFIG: JSON.stringify(config), MCP_FIXTURE_SNAPSHOT: snapshot },
    timeout: 60000, maxBuffer: 1024 * 1024,
  });
  await writeFile(join(root, "released-seed.log"), seed.stdout + seed.stderr);
  const expected = JSON.parse(await readFile(snapshot, "utf8"));
  const db = await openDatabase(config);
  try {
    const retained = async () => {
      for (const [table, rows] of Object.entries(expected.tables)) {
        const actual = await db.selectFrom(table as any).selectAll().execute();
        assert.equal(hash(actual), hash(rows as unknown[]), `Retained released rows: ${table}`);
      }
    };
    await retained();
    assert.equal((await db.selectFrom("ai_task_resources").selectAll().execute()).length, 0);
    await createSchema(db);
    await Promise.all([createSchema(db), createSchema(db)]);
    await retained();
    const now = new Date().toISOString(), taskId = randomUUID();
    await db.insertInto("ai_jobs").values({
      id: taskId, session_id: null, model_id: null, user_id: expected.actorId,
      status: "completed", input: "{}", digest: "standalone-fixture", result: "{}", error: "",
      lease: null, lease_until: null, cancelled: 0, attempts: 1, created_at: now, updated_at: now,
    }).execute();
    const current = await db.selectFrom("ai_jobs").selectAll().where("id", "=", taskId).executeTakeFirstOrThrow();
    assert.equal(current.session_id, null); assert.equal(current.model_id, null);
    await db.deleteFrom("ai_jobs").where("id", "=", taskId).execute();
    const footprint = await db.selectFrom("schema_baseline").selectAll().execute();
    await sql`create table mcp_review_required (id text primary key, body text not null)`.execute(db);
    await sql`insert into mcp_review_required values ('keep','retained review data')`.execute(db);
    await assert.rejects(createSchema(db), /mcp_review_required/);
    assert.deepEqual(await db.selectFrom("schema_baseline").selectAll().execute(), footprint);
    await retained();
    const report = { passed: true, driver, releasedVersion: "0.2.29", retainedTables: Object.keys(expected.tables).length, repeatedConcurrentStarts: 3, nullableTask: true, reviewRejection: true };
    await writeFile(join(root, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, artifacts: root }));
  } finally { await db.destroy(); }
} finally {
  if (admin && database) { await admin.query(`drop database ${database} with (force)`); await admin.end(); }
}
