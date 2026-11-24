// Isolated accounts, in-memory database and temporary storage; never user documents.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { openDatabase } from "../packages/db/src/index.js";
import { createUser } from "../packages/core/src/modules/identity/passwords.js";

const root = await mkdtemp(join(tmpdir(), "doca-startup-qa-"));
process.env.DOCA_CREDENTIAL_MASTER_KEY = randomBytes(32).toString("hex");
process.env.DOCA_FILE_STORE_ID = "local";
process.env.DOCA_FILE_STORES_JSON = JSON.stringify({
  version: 1,
  stores: { local: { provider: "local", root } },
});
const { createApp } = await import("../apps/server/src/app/create-app.js");
const { storageRuntime } =
  await import("../apps/server/src/adapters/storage.js");
const db = await openDatabase({ driver: "sqlite", path: ":memory:" });
const user = await createUser(
  db,
  {
    login: "startupqa",
    displayName: "Startup QA",
    password: "isolated-startup-2026",
  },
  { bootstrap: true },
);
const origin = "http://127.0.0.1:39379";
const app = await createApp(db, {
  origin,
  storage: { ...storageRuntime(), root },
  ai: { memory: { driver: "sqlite", url: ":memory:" } },
});
await app.listen({ host: "127.0.0.1", port: 0 });
const apiAddress = app.server.address();
assert(apiAddress && typeof apiAddress !== "string");
const web = await createServer({
  configFile: resolve("apps/web/vite.config.ts"),
  server: {
    host: "127.0.0.1",
    port: 39379,
    strictPort: true,
    proxy: {
      "/api": { target: `http://127.0.0.1:${apiAddress.port}`, ws: true },
    },
  },
});
await web.listen();
const address = web.httpServer!.address();
assert(address && typeof address !== "string");
const output = resolve("artifacts/verification/document-startup");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const catalogContains = async ({
  id,
  expected,
}: {
  id: string;
  expected: boolean;
}) => {
  const session = JSON.parse(
    localStorage.getItem("doca.offline-session.v1") ?? "null",
  );
  if (!session) return !expected;
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = indexedDB.open("doca-offline-catalog-v1", 1);
    request.onsuccess = () => resolve(request.result);
  });
  try {
    if (!db.objectStoreNames.contains("documents")) return !expected;
    return await new Promise<boolean>((resolve) => {
      const request = db
        .transaction("documents")
        .objectStore("documents")
        .get([session.bootstrap.user.id, id]);
      request.onsuccess = () =>
        resolve(
          !!request.result?.document && request.result.scope === session.scope
            ? expected
            : !expected,
        );
    });
  } finally {
    db.close();
  }
};
let diagnosticPage: Awaited<ReturnType<typeof browser.newPage>> | undefined;
const checks: string[] = [];
const pass = (value: string) => {
  checks.push(value);
  console.log("PASS " + value);
};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const request = async (path: string, data?: unknown, method = "GET") => {
    const response = await context.request.fetch(origin + "/api/v1" + path, {
      method,
      headers: { origin },
      data,
    });
    assert.equal(response.status(), 200, await response.text());
    return response.json();
  };
  await request(
    "/auth/login",
    { login: "startupqa", password: "isolated-startup-2026" },
    "POST",
  );
  const resource = await request(
    "/resources",
    {
      title: "Cached startup regression",
      kind: "document",
      format: "rich_text",
    },
    "POST",
  );
  const page = await context.newPage();
  diagnosticPage = page;
  const duplicateKeyWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Encountered two children with the same key"))
      duplicateKeyWarnings.push(message.text());
  });
  const errors: string[] = [];
  const updates: any[] = [];
  let online = true,
    denied = false,
    bootstrapRequests = 0;
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.stack);
  });
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/v1/bootstrap") bootstrapRequests++;
  });
  page.on("websocket", (ws) =>
    ws.on("framesent", ({ payload }) => {
      try {
        const message = JSON.parse(String(payload));
        if (message.type === "update") updates.push(message);
      } catch {}
    }),
  );
  await page.route("**/api/v1/**", (route) => {
    if (!online) return route.abort();
    if (
      denied &&
      new URL(route.request().url()).pathname ===
        `/api/v1/resources/${resource.id}`
    )
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ message: "Forbidden" }),
      });
    return route.continue();
  });
  await page.routeWebSocket("**/api/v1/ws", (ws) => {
    if (online) ws.connectToServer();
    else ws.close();
  });
  await page.goto(`${origin}/#/r/${resource.id}`);
  const editor = () =>
    page.locator('.document-editor-shell [contenteditable="true"]').first();
  await editor().waitFor({ timeout: 60000 });
  await editor().click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Original cached text.");
  await page
    .getByText("已保存到云端", { exact: true })
    .waitFor({ state: "attached" });
  await page.waitForFunction(catalogContains, {
    id: resource.id,
    expected: true,
  });
  assert.equal(
    bootstrapRequests,
    1,
    "Plugin discovery and shell made duplicate bootstrap requests",
  );
  pass(
    "Cold startup shares one bootstrap request and caches document metadata",
  );

  const replica = () =>
    page.evaluate(
      async ({ userId, resourceId }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("doca-offline-v1", 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction("replicas", "readonly");
        const value = await new Promise<any>((resolve, reject) => {
          const request = tx
            .objectStore("replicas")
            .get(`${userId}:${resourceId}:slate-kit:3`);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        return {
          pending: value.pending.map((p: any) => ({
            id: p.id,
            update: Array.from(p.update),
          })),
          checkpoint: Array.from(value.checkpoint),
        };
      },
      { userId: user.id, resourceId: resource.id },
    );

  // Keep HTTP requests pending, proving the cached editor appears before any response/timeout.
  let release!: () => void;
  const stalled = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/bootstrap", async (route) => {
    await stalled;
    await route.abort().catch(() => {});
  });
  await page.route(`**/api/v1/resources/${resource.id}`, async (route) => {
    await stalled;
    await route.abort().catch(() => {});
  });
  online = false;
  const started = Date.now();
  await page.reload();
  await editor().waitFor({ timeout: 8000 });
  assert((await editor().textContent())?.includes("Original cached text."));
  const restoreMs = Date.now() - started;
  await editor().click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" Offline addition.");
  await page.waitForFunction(() =>
    document.body.textContent?.includes("已保存到本地"),
  );
  const pending = await replica();
  assert(pending.pending.length > 0);
  release();
  await page.unroute("**/api/v1/bootstrap");
  await page.unroute(`**/api/v1/resources/${resource.id}`);
  pass(
    `Cached content rendered while bootstrap/metadata hung (${restoreMs}ms), and offline edits persisted`,
  );
  await page.screenshot({ path: join(output, "cached-offline.png") });
  await page.reload();
  await editor().waitFor();
  assert((await editor().textContent())?.includes("Offline addition."));
  assert.deepEqual((await replica()).pending, pending.pending);
  pass(
    "Offline refresh retained text, original pending operation IDs and bytes",
  );

  const peer = await context.newPage();
  await peer.goto(`${origin}/#/r/${resource.id}`);
  const peerEditor = peer
    .locator('.document-editor-shell [contenteditable="true"]')
    .first();
  await peerEditor.waitFor();
  await peerEditor.click();
  await peer.keyboard.press("ControlOrMeta+End");
  await peer.keyboard.type(" Remote addition.");
  await peer
    .getByText("已保存到云端", { exact: true })
    .waitFor({ state: "attached" });
  await editor().click();
  await page.evaluate(() => {
    (window as any).startupEditor = document.querySelector(
      '.document-editor-shell [contenteditable="true"]',
    );
  });
  online = true;
  await page
    .getByText("已保存到云端", { exact: true })
    .waitFor({ state: "attached" });
  await page.waitForFunction(() =>
    document
      .querySelector('.document-editor-shell [contenteditable="true"]')
      ?.textContent?.includes("Remote addition."),
  );
  assert((await editor().textContent())?.includes("Offline addition."));
  assert.equal((await replica()).pending.length, 0);
  assert(
    await page.evaluate(
      () =>
        (window as any).startupEditor ===
        document.querySelector(
          '.document-editor-shell [contenteditable="true"]',
        ),
    ),
  );
  assert(
    await page.evaluate(() =>
      document
        .querySelector('.document-editor-shell [contenteditable="true"]')
        ?.contains(document.activeElement),
    ),
  );
  await peer.waitForFunction(() =>
    document
      .querySelector('.document-editor-shell [contenteditable="true"]')
      ?.textContent?.includes("Offline addition."),
  );
  pass(
    "Reconnect merged local and remote edits, emptied only ACKed outbox and kept the same editor instance",
  );
  await page.screenshot({ path: join(output, "reconnected.png") });
  const beforeIdle = updates.length;
  const idleMs = process.env.DOCA_QA_STARTUP_QUICK === "1" ? 1000 : 60000;
  await page.waitForTimeout(idleMs);
  assert.equal(updates.length, beforeIdle);
  pass(
    `${idleMs / 1000} seconds of idle after reconnect produced zero content updates`,
  );

  const preserved = await replica();
  denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(catalogContains, {
    id: resource.id,
    expected: false,
  });
  await page.locator(".document-editor-shell").waitFor({ state: "detached" });
  assert.deepEqual(await replica(), preserved);
  pass(
    "Explicit permission denial hid cached content and preserved the original durable replica",
  );

  for (const [format, selector] of [
    ["markdown", ".doca-markdown .exmd-editor"],
    ["spreadsheet", ".sheet-document .uos-office-toolbar"],
    ["canvas", ".doca-canvas canvas"],
    ["presentation", ".presentation-document .eppt-canvas-area"],
  ]) {
    online = true;
    const document = await request(
      "/resources",
      {
        title: `Startup ${format}`,
        kind: "document",
        format,
        ...(format === "markdown"
          ? { markdown: "# Startup Markdown\n\nCached Markdown body." }
          : {}),
      },
      "POST",
    );
    await page.goto(`${origin}/#/r/${document.id}`);
    await page.locator(selector!).first().waitFor({ timeout: 60000 });
    await page
      .getByText(/已保存到云端/)
      .first()
      .waitFor({ state: "attached" });
    await page.waitForFunction(catalogContains, {
      id: document.id,
      expected: true,
    });
    const hasReplica = await page.evaluate(
      async ({ id, userId }) => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open("doca-offline-v1", 1);
          request.onsuccess = () => resolve(request.result);
        });
        const values = await new Promise<any[]>((resolve) => {
          const tx = db.transaction("replicas", "readonly"),
            store = tx.objectStore("replicas");
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const key = keys.result.find((key) =>
              String(key).startsWith(`${userId}:${id}:`),
            );
            if (!key) {
              resolve([]);
              return;
            }
            const item = store.get(key);
            item.onsuccess = () => resolve([item.result]);
          };
        });
        db.close();
        return !!values[0]?.epochId;
      },
      { id: document.id, userId: user.id },
    );
    assert(hasReplica, `${format} did not persist its authoritative replica`);
    const cachedTitle = await page
      .locator(".document-name-value")
      .textContent();
    online = false;
    await page.reload();
    await page.locator(selector!).first().waitFor({ timeout: 8000 });
    assert.equal(
      await page.locator(".document-name-value").textContent(),
      cachedTitle,
    );
    if (format === "markdown")
      assert(
        (
          await page
            .locator(".doca-markdown.markdown-sdk-container")
            .textContent()
        )?.includes("Cached Markdown body."),
      );
    await page.screenshot({ path: join(output, `offline-${format}.png`) });
    pass(
      `${format} restored its existing replica/baseline with the backend unavailable`,
    );
  }
  online = true;
  await request("/auth/logout", {}, "POST");
  await peer.reload();
  await page.waitForFunction(
    () => !localStorage.getItem("doca.offline-session.v1"),
  );
  await page.locator(".eppt-canvas-area").waitFor({ state: "detached" });
  assert.deepEqual(await replica(), preserved);
  pass(
    "Logout in another tab invalidated the cached identity without deleting document checkpoints",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(duplicateKeyWarnings, []);
  await writeFile(
    join(output, "report.json"),
    JSON.stringify({ checks, restoreMs, errors }, null, 2),
  );
} catch (error) {
  if (diagnosticPage) {
    await diagnosticPage.screenshot({ path: join(output, "failure.png") });
    await writeFile(
      join(output, "failure.txt"),
      await diagnosticPage.locator("body").innerText(),
    );
    await writeFile(
      join(output, "failure-cache.json"),
      await diagnosticPage.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open("doca-offline-v1", 1);
          request.onsuccess = () => resolve(request.result);
        });
        const values = await new Promise<any[]>((resolve) => {
          const request = db
            .transaction("replicas", "readonly")
            .objectStore("replicas")
            .getAll();
          request.onsuccess = () => resolve(request.result);
        });
        db.close();
        return JSON.stringify(
          {
            startup: JSON.parse(
              localStorage.getItem("doca.offline-session.v1") ?? "null",
            ),
            replicas: values.map((value) => ({
              epochId: value.epochId,
              baseline: value.baseline,
              checkpointBytes: value.checkpoint.length,
              pending: value.pending.length,
            })),
          },
          null,
          2,
        );
      }),
    );
  }
  throw error;
} finally {
  await browser.close();
  await web.close();
  await app.close();
  await db.destroy();
  await rm(root, { recursive: true, force: true });
}
