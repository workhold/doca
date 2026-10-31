import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { openDatabase } from "@db/connection.js";
import { createUser } from "@core/modules/identity/passwords.js";
import { createApp } from "@server/app/create-app.js";
import { storageRuntime } from "@server/adapters/storage.js";

if (process.env.DOCA_QA_ISOLATED !== "1") throw Error("Isolated UI fixture only");
const root = resolve("artifacts/verification/mcp-decoupling/ui"), origin = "http://127.0.0.1:39478";
await mkdir(join(root, "plugins"), { recursive: true });
process.env.DOCA_CREDENTIAL_MASTER_KEY = randomBytes(32).toString("hex");
process.env.DOCA_FILE_STORE_ID = "mcp-ui";
process.env.DOCA_FILE_STORES_JSON = JSON.stringify({ version: 1, stores: { "mcp-ui": { provider: "local", root: join(root, "objects") } } });
const db = await openDatabase({ driver: "sqlite", path: ":memory:" });
await createUser(db, { login: "mcp-ui-owner", displayName: "MCP UI owner", password: "isolated-mcp-ui-password" }, { bootstrap: true });
const app = await createApp(db, { origin, pluginDirectory: join(root, "plugins"), storage: storageRuntime(), ai: { memory: { driver: "sqlite", url: ":memory:" } } });
const web = await createServer({ configFile: resolve("apps/web/vite.config.ts"), server: { host: "127.0.0.1", port: 39478, strictPort: true, proxy: { "/api": { ws: true, target: "http://127.0.0.1:39479", changeOrigin: false } } } });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await app.listen({ host: "127.0.0.1", port: 39479 }); await web.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const login = await context.request.post(`${origin}/api/v1/auth/login`, { headers: { origin }, data: { login: "mcp-ui-owner", password: "isolated-mcp-ui-password" } });
  assert.equal(login.status(), 200);
  const request = async (path: string, data?: unknown) => {
    const response = data === undefined ? await context.request.get(`${origin}/api/v1${path}`)
      : await context.request.post(`${origin}/api/v1${path}`, { headers: { origin }, data });
    assert.equal(response.status(), 200, await response.text()); return response.json();
  };
  assert.equal((await context.request.put(`${origin}/api/v1/me/mcp`, { headers: { origin }, data: { enabled: true, revision: 0 } })).status(), 200);
  const key = await request("/me/mcp-services", { name: "Isolated MCP client", enabled: true, grantMode: "all", toolIds: [], skillIds: [], expiresAt: null });
  const rpc = async (name: string, args: unknown) => {
    const response = await context.request.post(`${origin}/api/v1/mcp`, { headers: { authorization: `Bearer ${key.token}`, accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-11-25" }, data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } });
    const result = (await response.json()).result;
    assert.equal(result.isError, undefined, JSON.stringify(result)); return result.structuredContent.result;
  };
  const ordinary = await request("/ai/sessions", { title: "Ordinary user conversation" });
  const task = await rpc("doca_tools", { purpose: "MCP 工具执行验证：独立任务、权限校验与文档产物" });
  const created = await rpc("doca_call", { contextId: task.contextId, requestId: randomUUID(), tool: "document_create", input: { title: "MCP 独立执行生成的文档", format: "markdown", markdown: "# MCP 独立执行生成的文档\n\nIsolated retained output" } });
  const page = await context.newPage(), errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/#/mcp`);
  await page.getByRole("heading", { name: "MCP 服务", exact: true }).waitFor();
  await page.getByRole("button", { name: "执行记录", exact: true }).click();
  await page.getByRole("button", { name: "查看详情", exact: true }).waitFor();
  await page.screenshot({ path: join(root, "execution-list-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "查看详情", exact: true }).click();
  await page.getByRole("heading", { name: "工具调用", exact: true }).waitFor();
  await page.getByRole("link", { name: "MCP 独立执行生成的文档", exact: true }).waitFor();
  await page.screenshot({ path: join(root, "execution-detail-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "返回执行列表", exact: true }).click();
  await page.getByRole("button", { name: "停止执行", exact: true }).click();
  await page.getByRole("button", { name: "清理记录", exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(root, "execution-list-mobile.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole("button", { name: "清理记录", exact: true }).click();
  await page.getByText("暂无执行记录", { exact: true }).waitFor();
  assert.deepEqual((await request("/ai/sessions")).map((row: any) => row.id), [ordinary.id]);
  assert.equal((await context.request.get(`${origin}/api/v1/resources/${created.id}`)).status(), 200);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await writeFile(join(root, "report.json"), JSON.stringify({ passed: true, desktop: true, mobile: true, details: true, stop: true, remove: true, retainedArtifact: true, ordinaryConversationUnchanged: true, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: true, artifacts: root }));
} finally { await browser?.close(); await Promise.all([web.close(), app.close()]); await db.destroy(); }
