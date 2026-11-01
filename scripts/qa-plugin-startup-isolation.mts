import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { openTestDatabase } from "../tests/database.js";
import { createUser } from "@core/modules/identity/passwords.js";
import { createApp } from "@server/app/create-app.js";

if (process.env.DOCA_QA_ISOLATED !== "1") throw Error("Isolated fixtures only");
const output = resolve("artifacts/verification/plugin-startup-isolation");
await mkdir(output, { recursive: true });
const root = await mkdtemp(join(output, "ui-"));
const origin = "http://127.0.0.1:39486",
  pluginId = "doca.resources.manage";
const pluginRoot = join(root, "plugins", pluginId);
await mkdir(pluginRoot, { recursive: true });
process.env.DOCA_CREDENTIAL_MASTER_KEY = randomBytes(32).toString("hex");
process.env.DOCA_FILE_STORE_ID = "isolated-plugin-qa";
process.env.DOCA_FILE_STORES_JSON = JSON.stringify({
  version: 1,
  stores: {
    "isolated-plugin-qa": { provider: "local", root: join(root, "objects") },
  },
});
const manifest = {
  schemaVersion: 1,
  id: pluginId,
  version: "0.1.5",
  sdkRange: "^0.1.9",
  displayName: "Resources fixture",
};
const pkg = {
  name: "@smartdoca/doca-resources-manage",
  version: manifest.version,
  type: "module",
  doca: {
    dataVersion: "resources-v2",
    storage: "host",
    manifest: "./manifest.json",
    server: "./server.js",
  },
};
for (const [name, value] of Object.entries({
  "package.json": JSON.stringify(pkg),
  "manifest.json": JSON.stringify(manifest),
  "server.js": "throw Error('Incompatible plugin code must never run');",
}))
  await writeFile(join(pluginRoot, name), value);
const db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
await createUser(
  db,
  {
    login: "plugin-qa",
    displayName: "Plugin QA",
    password: "isolated-plugin-qa-password",
  },
  { bootstrap: true },
);
const app = await createApp(db, {
  origin,
  pluginDirectory: join(root, "plugins"),
});
const web = await createServer({
  configFile: resolve("apps/web/vite.config.ts"),
  server: {
    host: "127.0.0.1",
    port: 39486,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:39487", changeOrigin: false },
    },
  },
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await app.listen({ host: "127.0.0.1", port: 39487 });
  await web.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const login = await context.request.post(`${origin}/api/v1/auth/login`, {
    headers: { origin },
    data: { login: "plugin-qa", password: "isolated-plugin-qa-password" },
  });
  assert.equal(login.status(), 200, await login.text());
  const page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Only the remote marketplace is replaced. Inventory, login and ZIP upload use the real host.
  await page.route(
    /\/api\/v1\/admin\/plugins\/(catalog|categories|updates|detail|releases)(?:[/?]|$)/,
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes("/detail/"))
        return route.fulfill({
          status: 404,
          json: { message: "Isolated marketplace fixture" },
        });
      await route.fulfill({
        json: {
          protocolVersion: 1,
          items: [],
          page: {
            total: 0,
            nextCursor: null,
            snapshotAt: new Date().toISOString(),
          },
        },
      });
    },
  );
  await page.goto(`${origin}/#/admin?tab=plugins`);
  await page
    .getByText("部分插件因版本不兼容未加载", { exact: false })
    .waitFor();
  await page
    .locator(".plugin-restart")
    .getByRole("button", { name: "已安装", exact: true })
    .click();
  await page.getByText("此插件需要 SDK ^0.1.9", { exact: false }).waitFor();
  assert.equal(
    await page.getByText("本实例有插件变更待重启生效", { exact: true }).count(),
    0,
  );
  await page.screenshot({
    path: join(root, "installed-zh.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(root, "installed-mobile-zh.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const locale = await context.request.get(
    `${origin}/api/v1/me/page-state?key=ui.locale`,
  );
  const currentLocale = (await locale.json()).item;
  const updated = await context.request.put(`${origin}/api/v1/me/page-state`, {
    headers: { origin },
    data: {
      key: "ui.locale",
      value: "en",
      version: currentLocale?.version ?? 0,
    },
  });
  assert.equal(updated.status(), 200, await updated.text());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page
    .getByText("Some plugins were not loaded", { exact: false })
    .waitFor();
  await page
    .locator(".plugin-restart")
    .getByRole("button", { name: "Installed", exact: true })
    .click();
  await page
    .getByText("This plugin requires SDK ^0.1.9", { exact: false })
    .waitFor();
  await page.screenshot({
    path: join(root, "installed-en.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const upgraded = { ...manifest, version: "0.1.6", sdkRange: "^0.2.0" };
  const bytes = zipSync({
    "package.json": strToU8(
      JSON.stringify({ ...pkg, version: upgraded.version }),
    ),
    "manifest.json": strToU8(JSON.stringify(upgraded)),
    "server.js": strToU8(
      `export default () => ({manifest:${JSON.stringify(upgraded)},async uninstall(){}});`,
    ),
  });
  await page.locator('input[type="file"][accept=".zip"]').setInputFiles({
    name: "resources-compatible.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(bytes),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "OK", exact: true })
    .click();
  await page
    .getByText("This instance requires a restart", { exact: true })
    .waitFor();
  const inventory = await (
    await context.request.get(`${origin}/api/v1/admin/plugins`)
  ).json();
  assert.equal(inventory.plugins[0].version, "0.1.6");
  assert.equal(inventory.restartRequired, true);
  assert.equal(inventory.plugins[0].canCancel, false);
  await page
    .locator(".plugin-restart")
    .getByRole("button", { name: "Installed", exact: true })
    .click();
  await page
    .getByText("Changes are ready; restart this instance", { exact: false })
    .waitFor();
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        realInventory: true,
        oldPluginNeverImported: true,
        preservedInstallation: true,
        zh: true,
        en: true,
        mobileOverflow: false,
        realZipUpgrade: true,
        stagedUpgradeGuidance: true,
        incompatibleCancelUnavailable: true,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, artifacts: root }));
} finally {
  await browser?.close();
  await Promise.all([web.close(), app.close()]);
  await db.destroy();
}
