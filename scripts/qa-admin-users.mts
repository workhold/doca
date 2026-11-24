// Browser regression for pagination against an isolated SQLite database.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { createUser } from "../packages/core/src/modules/identity/passwords.js";
import { openDatabase } from "../packages/db/src/index.js";

const output = resolve("artifacts/verification/admin-users");
await mkdir(output, { recursive: true });
const root = await mkdtemp(join(output, "storage-"));
process.env.DOCA_CREDENTIAL_MASTER_KEY = randomBytes(32).toString("hex");
process.env.DOCA_FILE_STORE_ID = "local";
process.env.DOCA_FILE_STORES_JSON = JSON.stringify({
  version: 1,
  stores: { local: { provider: "local", root } },
});
const { createApp } = await import("../apps/server/src/app/create-app.js");
const { storageRuntime } = await import("../apps/server/src/adapters/storage.js");
const db = await openDatabase({ driver: "sqlite", path: ":memory:" });
const credentials = { login: "paginationqa", password: "isolated-pagination-qa-2026" };
await createUser(db, { ...credentials, displayName: "QA Admin" }, { bootstrap: true });
await db.insertInto("users").values(Array.from({ length: 204 }, (_, index) => {
  const login = `qa-user-${String(index).padStart(3, "0")}`;
  return {
    id: randomUUID(),
    public_id: login,
    login,
    display_name: login,
    password_hash: "",
    admin: 0,
    status: "active",
    created_at: new Date().toISOString(),
  };
})).execute();

const server = createServer();
await new Promise<void>((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
const address = server.address();
assert(address && typeof address !== "string");
await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
const origin = `http://127.0.0.1:${address.port}`;
const app = await createApp(db, {
  origin,
  staticDirectory: resolve(process.argv[2] ?? "apps/web/dist"),
  storage: { ...storageRuntime(), root },
  ai: { memory: { driver: "sqlite", url: ":memory:" } },
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  await app.listen({ host: "127.0.0.1", port: address.port });
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1440, height: 850 } });
  const login = await context.request.post(`${origin}/api/v1/auth/login`, { headers: { origin }, data: credentials });
  assert.equal(login.status(), 200);
  const page = await context.newPage();
  const rows = ".admin-users-table .admin-user-row:not(.table-head)";
  const scroller = page.locator(".admin-content");
  const scrollTop = () => scroller.evaluate((element) => element.scrollTop);
  const more = page.getByRole("button", { name: "加载更多用户" });
  const waitRows = (count: number) => page.waitForFunction(
    ({ rows, count }) => document.querySelectorAll(rows).length === count,
    { rows, count },
  );

  let gate = nextPageGate();
  await page.route(/\/api\/v1\/admin\/users\?/, async (route) => {
    if (!new URL(route.request().url()).searchParams.has("cursor")) {
      await route.continue();
      return;
    }
    const request = gate;
    const response = await route.fetch();
    request.started.resolve();
    await request.release.promise;
    try {
      await route.fulfill({ response });
    } catch {
      // The second request may already have been aborted by the new query.
    } finally {
      request.finished.resolve();
    }
  });

  await page.goto(`${origin}/#/admin?tab=users`);
  await waitRows(100);
  await more.scrollIntoViewIfNeeded();
  const before = await scrollTop();
  assert(before > 1000);
  const names = await page.locator(rows).allTextContents();
  await more.click();
  await gate.started.promise;
  await page.locator(".users-card .load-more[aria-busy=true]").waitFor();
  assert.deepEqual(await page.locator(rows).allTextContents(), names);
  assert(Math.abs((await scrollTop()) - before) <= 1);
  gate.release.resolve();
  await waitRows(200);
  assert.deepEqual((await page.locator(rows).allTextContents()).slice(0, 100), names);
  assert(Math.abs((await scrollTop()) - before) <= 1);
  console.log("PASS Loading and appending 100 users preserved existing rows and the scroll offset");

  gate = nextPageGate();
  await more.click();
  await gate.started.promise;
  await page.getByRole("textbox", { name: "搜索用户" }).fill("qa-user-005");
  await waitRows(1);
  gate.release.resolve();
  await gate.finished.promise;
  assert.equal(await page.locator(rows).count(), 1);
  assert((await page.locator(rows).innerText()).includes("qa-user-005"));
  console.log("PASS The previous query's delayed next page could not append after search changed");
} finally {
  await browser.close();
  await app.close();
  await db.destroy();
  await rm(root, { recursive: true, force: true });
}

function nextPageGate() {
  return {
    started: Promise.withResolvers<void>(),
    release: Promise.withResolvers<void>(),
    finished: Promise.withResolvers<void>(),
  };
}
