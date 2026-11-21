import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Sqlite from "better-sqlite3";
import { Client } from "pg";
import { openDatabase as openCurrent } from "../../packages/db/src/connection.ts";

const root = resolve(import.meta.dirname, "../..");
const artifacts = join(root, "artifacts/verification/desktop-client");
await mkdir(artifacts, { recursive: true });
const temp = await mkdtemp(join(artifacts, "released-0.2.36-"));
const archive = spawnSync("git", ["archive", "v0.2.36", "packages/db", "tsconfig.json", "package.json"], { cwd: root, maxBuffer: 40 * 1024 * 1024 });
if (archive.status !== 0) throw new Error("Could not extract v0.2.36 database source");
const extracted = spawnSync("tar", ["-x", "-C", temp], { input: archive.stdout });
if (extracted.status !== 0) throw new Error("Could not unpack v0.2.36 database source");
const { openDatabase: openReleased } = await import(pathToFileURL(join(temp, "packages/db/src/connection.ts")).href);
process.env.DOCA_FILE_STORE_ID = "local";
const names = ["desktop_auth_flows", "desktop_sessions"];
const containerNames = [];

async function releasedFixture(config) {
  const db = await openReleased(config);
  const userId = randomUUID();
  const sessionId = randomBytes(32).toString("hex");
  try {
    await db.insertInto("users").values({
      id: userId, public_id: "released-desktop-fixture", login: "released-desktop-fixture",
      display_name: "Retained release user", password_hash: "test-only", admin: 1,
      status: "active", created_at: new Date().toISOString(),
    }).execute();
    await db.insertInto("sessions").values({
      id: sessionId, user_id: userId, expires_at: "2099-01-01T00:00:00.000Z",
    }).execute();
  } finally { await db.destroy(); }
  return { userId, sessionId };
}

async function verifyUpgrade(config, retained) {
  for (let pass = 0; pass < 2; pass++) {
    const db = await openCurrent(config);
    try {
      const user = await db.selectFrom("users").selectAll().where("id", "=", retained.userId).executeTakeFirstOrThrow();
      const session = await db.selectFrom("sessions").selectAll().where("id", "=", retained.sessionId).executeTakeFirstOrThrow();
      if (user.display_name !== "Retained release user" || session.user_id !== retained.userId)
        throw new Error("Released rows changed during upgrade");
      for (const name of names) {
        const rows = await db.selectFrom(name).selectAll().execute();
        if (rows.length) throw new Error(`${name} was not added empty`);
      }
    } finally { await db.destroy(); }
  }
}

function docker(args) {
  const run = spawnSync("docker", args, { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`docker ${args[0]} failed: ${run.stderr}`);
  return run.stdout.trim();
}

try {
  const sqlitePath = join(temp, "released.sqlite");
  const oldSqlite = await releasedFixture({ driver: "sqlite", path: sqlitePath });
  await verifyUpgrade({ driver: "sqlite", path: sqlitePath }, oldSqlite);
  const rejectedPath = join(temp, "rejected.sqlite");
  await releasedFixture({ driver: "sqlite", path: rejectedPath });
  const raw = new Sqlite(rejectedPath);
  raw.exec("create table retained_unknown_desktop (id text primary key); insert into retained_unknown_desktop values ('keep')");
  raw.close();
  await openCurrent({ driver: "sqlite", path: rejectedPath }).then(async (db) => {
    await db.destroy(); throw new Error("Unknown structure was accepted");
  }, () => {});
  const check = new Sqlite(rejectedPath, { readonly: true });
  try {
    for (const name of names) if (check.prepare("select name from sqlite_master where name = ?").get(name)) throw new Error("Rejected upgrade wrote a desktop table");
    if (!check.prepare("select id from retained_unknown_desktop where id = 'keep'").get()) throw new Error("Rejected upgrade lost a row");
  } finally { check.close(); }
  console.log("Released v0.2.36 SQLite upgrade, repeat startup and rejection passed");

  for (const version of [17, 18]) {
    const name = `doca-desktop-upgrade-${version}-${randomBytes(4).toString("hex")}`;
    docker(["run", "-d", "--rm", "--name", name, "-e", "POSTGRES_PASSWORD=desktop-test", "-e", "POSTGRES_DB=doca", "-p", "127.0.0.1::5432", `postgres:${version}`]);
    containerNames.push(name);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const check = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres", "-d", "doca"], { encoding: "utf8" });
      if (check.status === 0) { ready = true; break; }
      await new Promise((done) => setTimeout(done, 250));
    }
    if (!ready) throw new Error(`PostgreSQL ${version} did not become ready`);
    const address = docker(["port", name, "5432/tcp"]);
    const port = Number(address.match(/:(\d+)$/)?.[1]);
    if (!port) throw new Error("Could not determine PostgreSQL test port");
    const url = `postgres://postgres:desktop-test@127.0.0.1:${port}/doca`;
    let tcpReady = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const probe = new Client({ connectionString: url, connectionTimeoutMillis: 1000 });
      try { await probe.connect(); await probe.query("select 1"); tcpReady = true; break; }
      catch { await new Promise((done) => setTimeout(done, 250)); }
      finally { await probe.end().catch(() => {}); }
    }
    if (!tcpReady) throw new Error(`PostgreSQL ${version} TCP endpoint did not become ready`);
    const retained = await releasedFixture({ driver: "postgres", url });
    await verifyUpgrade({ driver: "postgres", url }, retained);
    const client = new Client({ connectionString: url });
    await client.connect();
    try { await client.query("create database doca_reject"); } finally { await client.end(); }
    const rejectedUrl = url.replace(/\/doca$/, "/doca_reject");
    await releasedFixture({ driver: "postgres", url: rejectedUrl });
    const rejected = new Client({ connectionString: rejectedUrl });
    await rejected.connect();
    try {
      await rejected.query("create table retained_unknown_desktop (id text primary key)");
      await rejected.query("insert into retained_unknown_desktop values ('keep')");
    } finally { await rejected.end(); }
    await openCurrent({ driver: "postgres", url: rejectedUrl }).then(async (db) => {
      await db.destroy(); throw new Error("Unknown PostgreSQL structure was accepted");
    }, () => {});
    const verifyRejected = new Client({ connectionString: rejectedUrl });
    await verifyRejected.connect();
    try {
      const tables = await verifyRejected.query("select tablename from pg_tables where schemaname = 'public' and tablename = any($1)", [names]);
      const rows = await verifyRejected.query("select id from retained_unknown_desktop");
      if (tables.rows.length || rows.rows[0]?.id !== "keep") throw new Error("Rejected PostgreSQL upgrade made partial changes");
    } finally { await verifyRejected.end(); }
    console.log(`Released v0.2.36 PostgreSQL ${version} upgrade, repeat startup and rejection passed`);
  }
} finally {
  for (const name of containerNames) spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
  await rm(temp, { recursive: true, force: true });
}
