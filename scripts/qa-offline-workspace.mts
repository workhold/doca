// Uses a fresh browser profile, an in-memory host and synthetic documents.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright-core";
import { createUser } from "../packages/core/src/modules/identity/passwords.js";
import { openDatabase } from "../packages/db/src/index.js";

const output = resolve("artifacts/verification/offline-workspace");
await mkdir(output, { recursive: true });
const root = await mkdtemp(join(output, "storage-"));
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
const credentials = { login: "offlineqa", password: "isolated-offline-2026" };
const user = await createUser(
  db,
  { ...credentials, displayName: "Offline QA" },
  { bootstrap: true },
);
const readerCredentials = {
  login: "offlineqa-reader",
  password: "isolated-offline-reader-2026",
};
const reader = await createUser(
  db,
  { ...readerCredentials, displayName: "Offline QA reader" },
  {
    actor: { id: user.id, admin: true },
  },
);
const socket = createServer();
await new Promise<void>((ok, fail) =>
  socket.once("error", fail).listen(0, "127.0.0.1", ok),
);
const address = socket.address();
assert(address && typeof address === "object");
await new Promise<void>((ok, fail) =>
  socket.close((error) => (error ? fail(error) : ok())),
);
const origin = `http://127.0.0.1:${address.port}`;
const staticDirectory = resolve(process.argv[2] ?? "apps/web/dist");
const startHost = async () => {
  const app = await createApp(db, {
    origin,
    staticDirectory,
    storage: { ...storageRuntime(), root },
    ai: { memory: { driver: "sqlite", url: ":memory:" } },
  });
  await app.listen({ host: "127.0.0.1", port: address.port });
  return app;
};
let app: Awaited<ReturnType<typeof startHost>> | undefined;
let page: Page | undefined;
const checks: string[] = [];
const pass = (text: string) => {
  checks.push(text);
  console.log(`PASS ${text}`);
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const editor = (page: Page) =>
  page
    .locator(
      '.document-editor-shell [data-slate-editor][contenteditable="true"]',
    )
    .first();
const replica = (
  page: Page,
  documentId: string,
  codec: string,
  accountId = user.id,
) =>
  page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("doca-offline-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!db.objectStoreNames.contains("replicas")) return null;
      return await new Promise<{
        pending: { id: string; bytes: number[] }[];
      } | null>((resolve, reject) => {
        const request = db
          .transaction("replicas")
          .objectStore("replicas")
          .get(key);
        request.onsuccess = () =>
          resolve(
            request.result
              ? {
                  pending: request.result.pending.map(
                    (entry: { id: string; update: Uint8Array }) => ({
                      id: entry.id,
                      bytes: Array.from(entry.update),
                    }),
                  ),
                }
              : null,
          );
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, `${accountId}:${documentId}:${codec}`);

try {
  app = await startHost();
  const context = await browser.newContext({
    viewport: { width: 1260, height: 850 },
    locale: "zh-CN",
  });
  const request = async (path: string, data?: unknown) => {
    const response = await context.request.fetch(`${origin}/api/v1${path}`, {
      method: data === undefined ? "GET" : "POST",
      headers: { origin },
      data,
    });
    assert.equal(response.status(), 200, await response.text());
    return response.json();
  };
  await request("/auth/login", credentials);
  const library = await request("/resources", {
    kind: "library",
    format: "rich_text",
    title: "Offline QA Library",
  });
  const formats = [
    ["rich_text", "slate-kit:3", ".sk-editable"],
    ["markdown", "markdown-ytext:schema-1", ".doca-markdown .cm-editor"],
    ["spreadsheet", "exlsx-cell-registers", ".uos-editor"],
    ["canvas", "aidcanvas-yjs", ".doca-canvas"],
    ["presentation", "eppt-yjs-v6", ".eppt-workspace"],
  ] as const;
  const documents = [];
  page = await context.newPage();
  const legacy = await request("/resources", {
    title: "Legacy sample",
    kind: "document",
    format: "rich_text",
    libraryId: library.id,
  });
  await page.goto(`${origin}/#/r/${legacy.id}`);
  await editor(page).waitFor();
  await page
    .getByText("已保存到云端", { exact: true })
    .waitFor({ state: "attached" });
  assert(await replica(page, legacy.id, "slate-kit:3"));
  const legacySnapshot = JSON.stringify({
    version: 1,
    bootstrap: await request("/bootstrap"),
    documents: [
      {
        detail: {
          ...(await request(`/resources/${legacy.id}`)),
          comments: [],
          grants: [],
        },
        library,
      },
    ],
  });
  await page.evaluate((snapshot) => {
    localStorage.setItem("doca.document-startup.v1", snapshot);
    localStorage.removeItem("doca.offline-session.v1");
  }, legacySnapshot);
  await page.close();
  page = await context.newPage();

  for (const [format, codec, selector] of formats) {
    const title = `Offline QA ${format}`;
    const { id } = await request("/resources", {
      title,
      kind: "document",
      format,
      libraryId: library.id,
    });
    documents.push({ id, title, codec, selector });
    await page.goto(`${origin}/#/r/${id}`);
    await page.locator(selector).first().waitFor();
    if (format === "rich_text") {
      await editor(page).locator(".sk-block-paragraph").last().click();
      await page.keyboard.type("Online sample from the isolated server.");
      await page
        .getByText("已保存到云端", { exact: true })
        .waitFor({ state: "attached" });
    }
    await page
      .getByText(/已保存到云端/)
      .last()
      .waitFor({ state: "attached" });
  }
  for (let index = 0; index < 9; index++) {
    const title = `Offline QA extra ${index + 1}`;
    const { id } = await request("/resources", {
      title,
      kind: "document",
      format: "rich_text",
      libraryId: library.id,
    });
    await page.goto(`${origin}/#/r/${id}`);
    await editor(page).waitFor();
    await page
      .getByText("已保存到云端", { exact: true })
      .waitFor({ state: "attached" });
    documents.push({
      id,
      title,
      codec: "slate-kit:3",
      selector: ".sk-editable",
    });
  }
  const [rich] = documents;
  assert(rich);
  const { id: unavailable } = await request("/resources", {
    title: "Never opened",
    kind: "document",
    format: "rich_text",
  });
  await page.goto(`${origin}/#/offline`);
  await page.getByRole("heading", { name: "离线文档" }).waitFor();
  for (const { title } of documents)
    await page.getByRole("link", { name: new RegExp(title) }).waitFor();
  assert.equal(await page.locator(".offline-workspace-list a").count(), 14);
  assert.equal(
    await page.getByText("Legacy sample", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("doca.document-startup.v1")),
    legacySnapshot,
  );
  pass(
    "Fourteen new document opens were indexed while the previous directory entry and its replica were left in place",
  );
  await page.getByRole("button", { name: "下载前端以离线使用" }).click();
  await page
    .getByText("此浏览器现在可以离线打开 Doca。")
    .waitFor({ timeout: 90000 });
  const cachedPaths = await page.evaluate(async () => {
    const key = (await caches.keys()).find((key) =>
      key.startsWith("doca-web-shell-v1-"),
    );
    return key
      ? (await (await caches.open(key)).keys()).map(
          (item) => new URL(item.url).pathname,
        )
      : [];
  });
  assert(cachedPaths.includes("/"));
  assert(
    cachedPaths.every((path) =>
      /^\/(?:$|favicon\.svg$|doca\.webmanifest$|assets\/)/.test(path),
    ),
  );
  pass(
    `Production frontend ready with ${cachedPaths.length} static URLs and no API responses`,
  );

  await page.close();
  await app.close();
  app = undefined;
  await assert.rejects(fetch(origin));
  page = await context.newPage();
  const offlineHome = await page.goto(`${origin}/#/home`);
  assert(offlineHome?.fromServiceWorker());
  await page.getByRole("heading", { name: "最近编辑" }).waitFor();
  await page.getByRole("searchbox").fill("offline qa library");
  for (const { title } of documents)
    await page.getByRole("link", { name: new RegExp(title) }).waitFor();
  assert.equal(
    await page.getByText("Never opened", { exact: true }).count(),
    0,
  );
  await page.screenshot({ path: join(output, "offline-directory.png") });
  pass(
    "New browser tab opened the cached home and searched the local library while the host was stopped",
  );

  await page.goto(`${origin}/#/r/${unavailable}`);
  await page
    .getByText("此设备没有可用的文档副本，请从下方选择已缓存的文档。")
    .waitFor();
  for (const { title, selector } of documents.slice(0, formats.length)) {
    if (!page.url().endsWith("#/offline"))
      await page.goto(`${origin}/#/offline`);
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await page.locator(selector).first().waitFor();
    await page.getByText("正在离线编辑，连接恢复后会自动同步修改。").waitFor();
  }
  pass(
    "The offline home opened five cached editor formats through their original links",
  );

  await page.goto(`${origin}/#/r/${rich.id}`);
  await editor(page).waitFor();
  assert((await editor(page).textContent())?.includes("Online sample"));
  await editor(page).locator(".sk-block-paragraph").last().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Persisted offline addition.");
  await page
    .getByText("已保存到本地 · 等待同步", { exact: true })
    .waitFor({ state: "attached" });
  const pending = await replica(page, rich.id, rich.codec);
  assert(pending?.pending.length);
  await page.screenshot({ path: join(output, "offline-editor.png") });
  await page.reload();
  await editor(page).waitFor();
  assert(
    (await editor(page).textContent())?.includes("Persisted offline addition"),
  );
  assert.deepEqual(await replica(page, rich.id, rich.codec), pending);
  pass(
    "Offline refresh restored the edited body and identical pending update IDs and bytes",
  );

  await editor(page).click();
  const editorBefore = await editor(page).elementHandle();
  app = await startHost();
  await page
    .getByText("已保存到云端", { exact: true })
    .waitFor({ state: "attached", timeout: 30000 });
  assert.deepEqual((await replica(page, rich.id, rich.codec))?.pending, []);
  assert(
    await editorBefore?.evaluate(
      (element) => element.isConnected && document.activeElement === element,
    ),
  );
  const peer = await browser.newContext();
  const login = await peer.request.post(`${origin}/api/v1/auth/login`, {
    headers: { origin },
    data: credentials,
  });
  assert.equal(login.status(), 200);
  const remote = await peer.newPage();
  await remote.goto(`${origin}/#/r/${rich.id}`);
  await editor(remote).waitFor();
  assert(
    (await editor(remote).textContent())?.includes(
      "Persisted offline addition",
    ),
  );
  pass(
    "Restarted host acknowledged the original edits and served them to a fresh browser, preserving the original editor and focus",
  );

  await page.goto(`${origin}/#/r/${legacy.id}`);
  await editor(page).waitFor();
  await page.goto(`${origin}/#/offline`);
  await page.getByRole("link", { name: /Legacy sample/ }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("doca.document-startup.v1")),
    legacySnapshot,
  );
  pass(
    "An earlier document entered the new directory only after an online open in this build",
  );
  await page.goto(`${origin}/#/r/${rich.id}`);

  const permission = async (visibility: "authenticated" | "invited") => {
    const current = await peer.request.get(
      `${origin}/api/v1/resources/${rich.id}`,
    );
    const { resource } = await current.json();
    const response = await peer.request.put(
      `${origin}/api/v1/resources/${rich.id}/permissions`,
      {
        headers: { origin },
        data: {
          version: resource.version,
          accessMode: "custom",
          visibility,
          publicRole: "reader",
        },
      },
    );
    assert.equal(response.status(), 200, await response.text());
  };
  await permission("authenticated");
  const directory = await context.newPage();
  await directory.goto(`${origin}/#/offline`);
  await directory.getByRole("link", { name: new RegExp(rich.title) }).waitFor();
  await page.locator(".account-menu > summary").click();
  const logout = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/logout"),
  );
  await page.locator(".account-menu nav button").last().click();
  assert.equal((await logout).status(), 200);
  await directory
    .getByRole("heading", { name: "离线文档" })
    .waitFor({ state: "hidden" });
  assert(await replica(directory, rich.id, rich.codec));
  pass(
    "Signing out hid the directory across tabs while preserving the local document bytes",
  );
  await directory.close();
  await page.close();

  const readLogin = await context.request.post(`${origin}/api/v1/auth/login`, {
    headers: { origin },
    data: readerCredentials,
  });
  assert.equal(readLogin.status(), 200);
  page = await context.newPage();
  await page.goto(`${origin}/#/r/${rich.id}`);
  await page.locator(".sk-editable").waitFor();
  await page.goto(`${origin}/#/offline`);
  await page.getByRole("link", { name: new RegExp(rich.title) }).waitFor();
  assert.equal(await page.locator(".offline-workspace-list a").count(), 1);
  await page.close();
  await context.setOffline(true);
  page = await context.newPage();
  await page.goto(`${origin}/#/r/${rich.id}`);
  await page.locator(".sk-editable").waitFor();
  assert.equal(await editor(page).count(), 0);
  assert.equal(
    await page.getByText("正在离线编辑，连接恢复后会自动同步修改。").count(),
    0,
  );
  await permission("invited");
  const rejection = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/resources/${rich.id}`) &&
      [403, 404].includes(response.status()),
  );
  await context.setOffline(false);
  await rejection;
  await page.locator(".sk-editable").waitFor({ state: "hidden" });
  await page.goto(`${origin}/#/offline`);
  await page.getByText("联网打开文档后，已缓存的文档会显示在这里。").waitFor();
  assert(await replica(page, rich.id, rich.codec, reader.id));
  pass(
    "A second account saw only its own cached documents, opened a readonly copy and lost access on explicit revocation",
  );

  assert(await replica(remote, rich.id, rich.codec));
  assert.equal(
    await remote.evaluate(() =>
      navigator.serviceWorker.getRegistration().then(Boolean),
    ),
    false,
  );
  await remote.close();
  // The desktop proxy serves the built index locally in its own frame.
  await peer.route(`${origin}/`, (route) =>
    route.fulfill({
      contentType: "text/html",
      path: join(staticDirectory, "index.html"),
    }),
  );
  await peer.route(`${origin}/__desktop-test`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<iframe data-doca-workspace-tab src="/#/home" style="width:98vw;height:94vh"></iframe>',
    }),
  );
  await peer.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 502, body: "Bad Gateway" }),
  );
  await peer.routeWebSocket("**/api/v1/ws", (socket) => socket.close());
  const desktopPage = await peer.newPage();
  page = desktopPage;
  await desktopPage.goto(`${origin}/__desktop-test`);
  const frame = desktopPage.frameLocator("iframe");
  await frame.getByRole("link", { name: new RegExp(rich.title) }).click();
  await frame.getByText("正在离线编辑，连接恢复后会自动同步修改。").waitFor();
  await peer.close();
  pass(
    "A desktop-style workspace frame opened a cached document through a gateway outage without a Web service worker",
  );
} catch (error) {
  await page
    ?.screenshot({ path: join(output, "failure.png"), timeout: 5000 })
    .catch(() => {});
  throw error;
} finally {
  await writeFile(
    join(output, "browser-checks.json"),
    JSON.stringify(checks, null, 2),
  );
  await browser.close();
  await app?.close();
  await db.destroy();
  await rm(root, { recursive: true, force: true });
}
