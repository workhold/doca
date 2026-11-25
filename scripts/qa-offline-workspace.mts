// Uses a fresh browser profile, an in-memory host and synthetic documents.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Frame, type Page } from "playwright-core";
import { readDocument } from "@smartdoca/slides/core";
import * as Y from "yjs";
import { createUser } from "../packages/core/src/modules/identity/passwords.js";
import { openDatabase } from "../packages/db/src/index.js";

const output = resolve(process.env.DOCA_QA_OUTPUT ?? "artifacts/verification/offline-workspace");
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
const startHost = async (directory = staticDirectory) => {
  const app = await createApp(db, {
    origin,
    staticDirectory: directory,
    storage: { ...storageRuntime(), root },
    ai: { memory: { driver: "sqlite", url: ":memory:" } },
  });
  await app.listen({ host: "127.0.0.1", port: address.port });
  return app;
};
let app: Awaited<ReturnType<typeof startHost>> | undefined;
async function stopHost() {
  if (!app) return;
  for (const socket of app.websocketServer.clients) socket.terminate();
  app.server.closeAllConnections();
  await app.close();
  app = undefined;
}
let page: Page | undefined;
const checks: string[] = [];
const pass = (text: string) => {
  checks.push(text);
  console.log(`PASS ${text}`);
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const mode = (page: Page) => page.getByRole("combobox", { name: "文档模式", exact: true });
async function chooseMode(page: Page, name: "编辑" | "纯净编辑") {
  await mode(page).click();
  await page.getByRole("option", { name, exact: true }).click();
}
const editor = (page: Page | Frame) =>
  page
    .locator(
      '.document-editor-shell [data-slate-editor][contenteditable="true"]',
    )
    .first();
async function scrollToLastItem(page: Page, container: string, items: string) {
  await page.locator(items).last().waitFor();
  const bounds = await page.locator(container).boundingBox();
  assert(bounds);
  const last = await page.locator(items).last().boundingBox();
  assert(last && last.y + last.height > bounds.y + bounds.height);
  await page.mouse.move(bounds.x + 12, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, 5000);
  await page.waitForFunction(({ container, items }) => {
    const pane = document.querySelector(container)!;
    const last = document.querySelectorAll(items);
    return pane.scrollTop > 0 &&
      last[last.length - 1]!.getBoundingClientRect().bottom <= pane.getBoundingClientRect().bottom + 1;
  }, { container, items }, { timeout: 5000 });
}
const replica = (
  page: Page | Frame,
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

async function verifyShellUpgrade(previousDirectory: string) {
  const build = async (directory: string) => {
    const html = await readFile(join(directory, "index.html"), "utf8");
    const entry = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
    const worker = await readFile(join(directory, "doca-offline-worker.js"), "utf8");
    const version = worker.match(/const shellVersion = "([a-f0-9]+)";/)?.[1];
    assert(entry && version);
    return { entry, version };
  };
  const previous = await build(previousDirectory);
  const candidate = await build(staticDirectory);
  assert.notEqual(previous.entry, candidate.entry);
  assert.notEqual(previous.version, candidate.version);
  const upgrade = await browser.newContext({ locale: "zh-CN" });
  app = await startHost(previousDirectory);
  const login = await upgrade.request.post(`${origin}/api/v1/auth/login`, {
    headers: { origin },
    data: credentials,
  });
  assert.equal(login.status(), 200);
  const previousPage = page = await upgrade.newPage();
  await previousPage.goto(`${origin}/#/offline`);
  await previousPage.getByRole("button", { name: "下载前端以离线使用" }).click();
  await previousPage.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await stopHost();
  app = await startHost();
  const candidatePage = page = await upgrade.newPage();
  const [entry, navigation] = await Promise.all([
    candidatePage.waitForResponse((response) => new URL(response.url()).pathname === candidate.entry),
    candidatePage.goto(`${origin}/#/home`),
  ]);
  assert(navigation?.fromServiceWorker());
  assert(entry.ok());
  const cache = `doca-web-shell-v1-${candidate.version}`;
  await candidatePage.waitForFunction(async ({ cache, entry }) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting?.state !== "installed") return false;
    const shell = await (await caches.open(cache)).match("/");
    return (await shell?.text())?.includes(entry);
  }, { cache, entry: candidate.entry });
  pass("With the old worker controlling navigation, the online page loaded the new hashed entry and staged its complete shell");
  const observer = await upgrade.newPage();
  const protocol = await upgrade.newCDPSession(observer);
  let waitingVersion: string | undefined;
  let activated = false;
  protocol.on("ServiceWorker.workerVersionUpdated", ({ versions }) => {
    for (const version of versions) {
      if (version.scriptURL !== `${origin}/doca-offline-worker.js`) continue;
      if (version.status === "installed") waitingVersion = version.versionId;
      if (version.versionId === waitingVersion && version.status === "activated") activated = true;
    }
  });
  await protocol.send("ServiceWorker.enable");
  await previousPage.close();
  await candidatePage.close();
  for (let attempt = 0; attempt < 60 && !activated; attempt++) await delay(250);
  assert(activated, "Chrome did not report natural activation with both application tabs closed");
  await stopHost();
  await assert.rejects(fetch(origin, { signal: AbortSignal.timeout(2500) }));
  const offlinePage = page = await upgrade.newPage();
  const offlineNavigation = await offlinePage.goto(`${origin}/#/home`);
  assert(offlineNavigation?.fromServiceWorker());
  assert.equal(await offlinePage.locator('script[type="module"][src]').getAttribute("src"), candidate.entry);
  await offlinePage.getByRole("heading", { name: "最近编辑" }).waitFor();
  const activeCaches = await offlinePage.evaluate(async () =>
    (await caches.keys()).filter((key) => key.startsWith("doca-web-shell-v1-")),
  );
  assert.deepEqual(activeCaches, [cache]);
  await upgrade.close();
  pass("After normal worker activation, the stopped host's origin started from the new build offline");
}

try {
  if (process.argv[3]) await verifyShellUpgrade(resolve(process.argv[3]));
  app = await startHost();
  const context = await browser.newContext({
    viewport: { width: 1260, height: 850 },
    locale: "zh-CN",
  });
  await context.addInitScript(() => {
    const NativeSocket = window.WebSocket;
    let collaboration: WebSocket | undefined;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (new URL(url, location.href).pathname === "/api/v1/ws") collaboration = this;
      }
    };
    window.addEventListener("offline", () => {
      document.documentElement.dataset.qaSocketOpenAtOffline = String(
        collaboration?.readyState === WebSocket.OPEN,
      );
    });
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
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
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
    `Signed-in production workspace automatically cached ${cachedPaths.length} static URLs with no API responses`,
  );

  for (const { id, selector, title } of documents.slice(0, formats.length)) {
    const tab = await context.newPage();
    let resumeSync!: () => void;
    let waiting = new Promise<void>((resolve) => { resumeSync = resolve; });
    let interceptedSync = false;
    await tab.routeWebSocket("**/api/v1/ws", (socket) => {
      socket.connectToServer().onMessage(async (raw) => {
        const message = JSON.parse(String(raw));
        if (message.type === "sync-response" && message.room === id) {
          interceptedSync = true;
          await waiting;
        }
        socket.send(raw);
      });
    });
    await tab.addInitScript(() => {
      const selector = ".editor-offline-notice";
      new MutationObserver((records) => {
        if (records.some((record) => Array.from(record.addedNodes).some(
          (node) => node instanceof Element && (node.matches(selector) || node.querySelector(selector)),
        ))) document.documentElement.dataset.qaOfflineNoticeShown = "true";
      }).observe(document, { childList: true, subtree: true });
    });
    try {
      await tab.goto(`${origin}/#/r/${id}`);
      await tab.locator(selector).first().waitFor();
      await mode(tab).waitFor();
      assert.equal(await tab.locator(".editor-offline-notice").count(), 0, title);
      resumeSync();
      await tab.getByText(/已保存到云端/).last().waitFor({ state: "attached" });
      assert(interceptedSync, title);
      assert.equal(await tab.locator("html").getAttribute("data-qa-offline-notice-shown"), null, title);
      if (id === rich.id) {
        const notice = tab.locator(".editor-offline-notice");
        await context.setOffline(true);
        await notice.waitFor();
        waiting = new Promise<void>((resolve) => { resumeSync = resolve; });
        await context.setOffline(false);
        await tab.getByText("正在同步…", { exact: true }).waitFor({ state: "attached" });
        assert.equal(await notice.count(), 1);
        resumeSync();
        await notice.waitFor({ state: "hidden" });
      }
    } finally {
      resumeSync();
      await tab.close();
    }
  }
  pass("Five cached editors opened online without showing the offline notice while document sync was held");
  pass("A disconnected rich-text editor kept its offline notice until document sync resumed after reconnecting");

  for (let index = 1; index <= 14; index++) {
    await request("/resources", {
      kind: "library",
      format: "rich_text",
      title: `Scroll QA Library ${index}`,
    });
  }
  for (const [route, pane, items] of [
    ["documents", ".main-scroll", ".document-table-row"],
    ["libraries", ".main-scroll", ".library-card"],
    ["offline", ".offline-workspace", ".offline-workspace-list > li"],
  ] as const) {
    const tab = await context.newPage();
    await tab.setViewportSize({ width: 1000, height: 520 });
    await tab.goto(`${origin}/#/${route}`);
    await scrollToLastItem(tab, pane, items);
    if (route === "documents") {
      const viewport = await tab.locator(pane).boundingBox();
      const filters = await tab.locator(".dashboard-controls").boundingBox();
      assert(viewport && filters && Math.abs(filters.y - viewport.y) <= 1);
      await tab.locator('.sidebar a[href="#/libraries"]').first().click();
      await scrollToLastItem(tab, pane, ".library-card");
    }
    await tab.close();
  }
  pass("Recent documents, library cards, and the offline directory scrolled to their last item");

  const sender = page;
  const viewer = await context.newPage();
  // The sheet SDK draws collaborator labels on its canvas instead of using DOM overlays.
  await viewer.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      if (args[0] === "Offline QA") {
        const { dataset } = document.documentElement;
        dataset.qaPeerPaints = String(Number(dataset.qaPeerPaints ?? 0) + 1);
      }
      original.apply(this, args);
    };
  });
  let sheetSelections = 0;
  viewer.on("websocket", (socket) => socket.on("framereceived", ({ payload }) => {
    try {
      const message = JSON.parse(String(payload));
      if (message.type === "cursors" && message.sessions.some((session: any) => session.selection?.kind === "cells"))
        sheetSelections++;
    } catch { /* Other messages are irrelevant to the canvas probe. */ }
  }));
  const peerPaints = () => viewer.evaluate(() => Number(document.documentElement.dataset.qaPeerPaints ?? 0));
  const waitForPeerPaint = (previous: number) => viewer.waitForFunction(
    (count) => Number(document.documentElement.dataset.qaPeerPaints ?? 0) > count,
    previous,
  );
  const remoteSelectors: Partial<Record<(typeof formats)[number][0], string>> = {
    rich_text: ".remote-caret",
    markdown: ".exmd-remote-caret",
    canvas: '[data-remote-pointer="true"]',
    presentation: ".eppt-remote",
  };
  for (let index = 0; index < formats.length; index++) {
    const [format] = formats[index]!;
    const item = documents[index]!;
    const url = `${origin}/#/r/${item.id}`;
    await sender.goto(url);
    await viewer.goto(url);
    await viewer.locator(item.selector).first().waitFor();
    const saved = viewer.getByText(/已保存到云端/).last();
    await saved.waitFor({ state: "attached" });
    await sender.bringToFront();
    const remoteSelection = remoteSelectors[format];
    let sheetColumnOffset = 36;
    const select = async () => {
      switch (format) {
        case "rich_text":
          await editor(sender).locator("[data-slate-string]").first().click();
          await sender.keyboard.press("ArrowRight");
          break;
        case "markdown":
          await sender.locator(".doca-markdown .cm-content").click();
          await sender.keyboard.press("End");
          break;
        case "spreadsheet": {
          const corner = await sender.locator(".uos-editor__select-all").boundingBox();
          assert(corner);
          await sender.mouse.click(corner.x + corner.width + sheetColumnOffset, corner.y + corner.height + 9);
          sheetColumnOffset += 75;
          break;
        }
        case "canvas": {
          const stage = sender.locator(".canvas-stage");
          await stage.click({ position: { x: 250, y: 250 } });
          await stage.hover({ position: { x: 280, y: 280 } });
          break;
        }
        case "presentation": {
          const { surface } = await request(`/ai/resources/${item.id}/preview`);
          const doc = new Y.Doc();
          const value = (() => {
            try {
              Y.applyUpdate(doc, new Uint8Array(Buffer.from(surface.update, "base64")));
              return readDocument(doc);
            } finally {
              doc.destroy();
            }
          })();
          const elements = value.slides[value.slideOrder[0]!]!.elements;
          const element = Object.values(elements).find((entry) => entry.type === "text");
          assert(element);
          const { x, y, width, height } = element.transform;
          const slide = await sender.locator(".eppt-slide").first().boundingBox();
          assert(slide);
          const scale = slide.width / value.size.width;
          await sender.mouse.click(slide.x + (x + width / 2) * scale, slide.y + (y + height / 2) * scale);
          break;
        }
      }
    };
    if (format === "markdown") {
      await sender.locator(".doca-markdown .cm-content").click();
      await sender.keyboard.press("End");
      await sender.keyboard.press("Enter");
      await sender.keyboard.insertText("Remote selection fixture");
    }
    const selection = remoteSelection ? viewer.locator(remoteSelection).first() : undefined;
    await select();
    if (format === "spreadsheet") await waitForPeerPaint(0);
    else await selection?.waitFor();
    await chooseMode(viewer, "纯净编辑");
    assert.match((await mode(viewer).textContent())!, /纯净编辑/);
    await selection?.waitFor({ state: "hidden" });
    await saved.waitFor({ state: "attached" });
    let paints = 0;
    if (format === "spreadsheet") {
      paints = await peerPaints();
      const received = sheetSelections;
      await sender.bringToFront();
      await select();
      for (let attempt = 0; attempt < 30 && sheetSelections === received; attempt++) await delay(100);
      assert(sheetSelections > received);
      await viewer.bringToFront();
      await viewer.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await peerPaints(), paints);
    }
    if (format === "rich_text") {
      await viewer.bringToFront();
      await editor(viewer).locator(".sk-block-paragraph").last().click();
      await viewer.keyboard.press("End");
      await viewer.keyboard.insertText(" Clean mode sync fixture.");
      await editor(sender).getByText(/Clean mode sync fixture/).first().waitFor();
      await sender.locator(".remote-caret").first().waitFor();
      await saved.waitFor({ state: "attached" });
    }
    await chooseMode(viewer, "编辑");
    await sender.bringToFront();
    if (format === "canvas") await sender.mouse.move(12, 12);
    await select();
    if (format === "spreadsheet") await waitForPeerPaint(paints);
    else await selection?.waitFor();
    console.log(`Remote selection verified for ${item.title}`);
  }
  await viewer.close();
  pass("Clean edit hid and restored peer selections in five editors, and rich text kept publishing the local cursor and syncing edits");

  for (const item of documents.slice(0, formats.length)) {
    await page.goto(`${origin}/#/r/${item.id}`);
    await page.locator(item.selector).first().waitFor();
    const saved = page.getByText(/已保存到云端/).last();
    await saved.waitFor({ state: "attached" });
    const offlineNotice = page.getByText("正在离线编辑，连接恢复后会自动同步修改。");
    const richEditor = item.id === rich.id ? await editor(page).elementHandle() : null;
    if (richEditor) await editor(page).locator(".sk-block-paragraph").last().click();
    await context.setOffline(true);
    await offlineNotice.waitFor({ timeout: 2500 });
    if (richEditor) {
      assert.equal(await page.locator("html").getAttribute("data-qa-socket-open-at-offline"), "true");
      await page.keyboard.press("End");
      await page.keyboard.insertText(" Wi-Fi interruption edit.");
      await page.getByText("已保存到本地 · 等待同步", { exact: true }).waitFor({ state: "attached" });
      assert((await replica(page, rich.id, rich.codec))?.pending.length);
    }
    await context.setOffline(false);
    await saved.waitFor({ state: "attached" });
    await offlineNotice.waitFor({ state: "hidden" });
    if (richEditor) {
      assert.deepEqual((await replica(page, rich.id, rich.codec))?.pending, []);
      assert(await richEditor.evaluate((el) => el.isConnected && document.activeElement === el));
    }
    console.log(`Network events verified for ${item.title}`);
  }
  pass("Five open editors followed the browser network events. Rich text switched while its socket was still open, then synced an offline edit without losing focus");

  const personalFolder = await request("/files/folders", { name: "Scroll QA personal" });
  const sharedFolder = await request("/files/folders", { name: "Scroll QA shared", parentId: "shared" });
  for (let index = 1; index <= 16; index++) {
    const name = `Scroll QA ${index}`;
    await request("/knowledge-books", { title: name });
    for (const parentId of [null, personalFolder.id, "shared", sharedFolder.id])
      await request("/files/folders", { name, parentId });
  }
  const sharedPath = `shared-files/${sharedFolder.id}?name=${encodeURIComponent(sharedFolder.name)}`;
  const personalTrail = [
    { type: "system", id: "root", name: "我的文件夹" },
    { type: "folder", id: personalFolder.id, name: personalFolder.name },
  ];
  const personalPath = `files?path=${encodeURIComponent(JSON.stringify(personalTrail))}`;
  for (const [route, pane, items] of [
    ["knowledge-books", ".book-list-content", ".book-library-card"],
    [`r/${library.id}`, ".document-tree", ".document-tree .tree-row"],
    ["files", ".files-content", ".files-column .file-entry"],
    ["shared-files", ".shared-folders-page", ".shared-folder-row:not(.shared-folder-table-head)"],
  ] as const) {
    const tab = await context.newPage();
    await tab.setViewportSize({ width: 1260, height: 520 });
    await tab.goto(`${origin}/#/${route}`);
    await scrollToLastItem(tab, pane, items);
    await tab.close();
  }
  pass("Knowledge books, the library document tree, and the personal and shared folder roots scrolled to their last item");

  const folders = [
    [personalPath, personalFolder.name],
    [sharedPath, sharedFolder.name],
  ] as const;
  const columnEntries = (name: string) => `.files-column:has(> .files-column-title[title="${name}"]) .file-entry`;
  for (const [path, name] of folders) {
    for (const [label, items] of [
      ["图标视图", ".files-grid .file-entry"],
      ["列表视图", ".files-list .file-entry"],
      ["分栏视图", columnEntries(name)],
    ] as const) {
      const tab = await context.newPage();
      await tab.setViewportSize({ width: 1260, height: 520 });
      await tab.goto(`${origin}/#/${path}`);
      await tab.getByRole("button", { name: label, exact: true }).click();
      await scrollToLastItem(tab, ".files-content", items);
      await tab.close();
    }
  }
  pass("Personal and shared folders scrolled through their contents in grid, list, and column views");

  const fileResponse = await context.request.post(
    `${origin}/api/v1/files/items?parentType=folder&parentId=${sharedFolder.id}&filename=scroll-preview.txt`,
    {
      headers: { origin, "content-type": "application/octet-stream" },
      data: Buffer.from("Isolated folder preview"),
    },
  );
  assert.equal(fileResponse.status(), 200, await fileResponse.text());
  const previewFile = await fileResponse.json();
  for (const [path, name] of folders) {
    const tab = await context.newPage();
    await tab.setViewportSize({ width: 390, height: 620 });
    await tab.goto(`${origin}/#/${path}`);
    await tab.getByRole("button", { name: "分栏视图", exact: true }).click();
    const contents = tab.locator(".files-content");
    assert(await contents.isVisible(), "A narrow column view must show the folder contents");
    await scrollToLastItem(tab, ".files-content", columnEntries(name));
    if (path === sharedPath) {
      const scrollTop = await contents.evaluate((node) => node.scrollTop);
      await tab.locator(`.file-entry[data-id="${previewFile.id}"]`).click();
      await tab.locator(".file-preview-content").waitFor();
      await tab.locator(".file-preview-close").click();
      await contents.waitFor();
      assert.equal(await contents.evaluate((node) => node.scrollTop), scrollTop);
    }
    await tab.close();
  }
  pass("Narrow personal and shared folder columns scrolled, and closing a file preview kept the folder's scroll position");

  await page.close();
  await stopHost();
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
  await peer.grantPermissions(["local-network-access"], { origin });
  const login = await peer.request.post(`${origin}/api/v1/auth/login`, {
    headers: { origin },
    data: credentials,
  });
  assert.equal(login.status(), 200);
  // Reuse the desktop tab's own storage when it starts again during the outage.
  await peer.route(`${origin}/`, (route) =>
    route.fulfill({
      contentType: "text/html",
      path: join(staticDirectory, "index.html"),
    }),
  );
  await peer.route(/\/__desktop-test(?:\?|$)/, (route) => {
    const home = new URL(route.request().url()).searchParams.has("home");
    return route.fulfill({
      contentType: "text/html",
      body: `<iframe data-doca-workspace-tab src="/#/${home ? "home" : `r/${rich.id}`}" style="width:98vw;height:94vh"></iframe>`,
    });
  });
  const liveDesktop = await peer.newPage();
  const workspacePage = page;
  page = liveDesktop;
  await liveDesktop.goto(`${origin}/__desktop-test`);
  const remote = await (await liveDesktop.locator("iframe").elementHandle())?.contentFrame();
  assert(remote);
  await editor(remote).waitFor();
  assert(
    (await editor(remote).textContent())?.includes(
      "Persisted offline addition",
    ),
  );
  pass(
    "Restarted host acknowledged the original edits and served them to a fresh browser, preserving the original editor and focus",
  );
  page = workspacePage;

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
  await page.locator(".document-mode-readonly").waitFor();
  assert.equal(await page.getByRole("combobox", { name: "文档模式" }).count(), 0);
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
  await liveDesktop.close();
  await peer.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 502, body: "Bad Gateway" }),
  );
  await peer.routeWebSocket("**/api/v1/ws", (socket) => socket.close());
  const desktopPage = await peer.newPage();
  page = desktopPage;
  await desktopPage.goto(`${origin}/__desktop-test?home=1`);
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
  await stopHost();
  await db.destroy();
  await rm(root, { recursive: true, force: true });
}
