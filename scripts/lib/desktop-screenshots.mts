import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import { createDesktopTranslator, htmlLang, locales, translate, type Locale } from "@doca/i18n";

const windowId = "00000000-0000-4000-8000-000000000001";
const managerOrigin = "http://desktop-screenshots.invalid";
const dist = new URL("../../apps/desktop/dist/", import.meta.url);

/** Capture the built manager and desktop tab shell with an isolated native bridge. */
export async function captureDesktopScreenshots(options: {
  context: BrowserContext;
  origin: string;
  locale: Locale;
  documentId: string;
  documentTitle: string;
  screenshot(page: Page, name: string): Promise<{ png: string; jpg: string }>;
}) {
  const { context, origin, locale, documentId, documentTitle, screenshot } = options;
  const language = htmlLang(locale);
  const t = createDesktopTranslator(locale);
  const images: { name: string; png: string; jpg: string }[] = [];
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => {
    if (request.isNavigationRequest()) errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  try {
    await page.setViewportSize({ width: 500, height: 750 });
    await page.route(managerOrigin + "/**", async route => {
      const path = new URL(route.request().url()).pathname;
      const file = path === "/" ? "index.html" : "assets/" + basename(path);
      const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[extname(file)];
      if (!type) return route.abort();
      await route.fulfill({ contentType: type, body: await readFile(new URL(file, dist)) });
    });
    await page.addInitScript(({ managerOrigin, origin }) => {
      if (location.origin !== managerOrigin) return;
      let connected = location.search.includes("connected");
      let callback = 0;
      const bridge = {
        transformCallback() { return ++callback; },
        async invoke(command: string) {
          if (command === "plugin:event|listen") return callback;
          if (command === "get_profiles") return {
            active: connected ? "fixture" : "local",
            workspaceOpen: connected,
            managerLocale: null,
            endpoints: connected ? [{
              id: "fixture",
              name: "Doca",
              origin,
              accountId: "fixture-user",
              connected: true,
              credentialError: null,
            }] : [],
          };
          if (command === "add_endpoint") {
            connected = true;
            return;
          }
          throw Error(`Unexpected desktop screenshot command: ${command}`);
        },
      };
      Object.defineProperty(window, "__TAURI_INTERNALS__", { value: bridge });
    }, { managerOrigin, origin });
    await page.goto(managerOrigin);
    const dropdown = page.locator(".locale-picker select");
    await page.getByRole("heading", { name: t("desktop.manager.heading"), exact: true }).waitFor();
    assert.equal(await dropdown.locator("option").count(), locales.length);
    assert.equal(await dropdown.inputValue(), locale);
    await dropdown.selectOption(locale === "en" ? "zh" : "en");
    await dropdown.selectOption(locale);
    assert.equal(await page.locator("html").getAttribute("lang"), language);
    const add = "desktop-manager-add";
    images.push({ name: add, ...await screenshot(page, add) });

    await page.goto(managerOrigin + "/?connected");
    await page.getByText(t("desktop.manager.connected"), { exact: true }).first().waitFor();
    assert.equal(await dropdown.inputValue(), locale);
    const manager = "desktop-manager";
    images.push({ name: manager, ...await screenshot(page, manager) });

    const messages = await readFile(new URL("../../packages/i18n/src/catalogs/desktop.json", import.meta.url), "utf8");
    const template = await readFile(new URL("../../apps/desktop/src-tauri/src/tab-shell.html", import.meta.url), "utf8");
    const shell = template.replace("__DOCA_DESKTOP_MESSAGES__", messages.replaceAll("<", "\\u003c"));
    const tabs = [
      { id: "home", hash: "#/home", title: "Doca" },
      { id: "doc", hash: "#/r/" + documentId, title: documentTitle },
    ];
    const windowState = { id: windowId, activeTab: "home", tabs };
    const managerRequests: string[] = [];
    // The native proxy serves this same bundled HTML directly to its workspace frame.
    await page.route(url => url.origin === origin && url.pathname === "/", async route => {
      await route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: await readFile(new URL("../../apps/web/dist/index.html", import.meta.url)),
      });
    });
    await page.route(origin + "/_doca/**", async route => {
      const command = new URL(route.request().url()).pathname;
      switch (command) {
        case "/_doca/window/" + windowId:
          return route.fulfill({ contentType: "text/html; charset=utf-8", body: shell });
        case "/_doca/manager":
          managerRequests.push(route.request().headers()["accept-language"] ?? "");
          return route.fulfill({ status: 204 });
        case "/_doca/events":
          return route.fulfill({ contentType: "text/event-stream", body: ": ready\n\n" });
        case "/_doca/action": {
          const action = route.request().postDataJSON();
          if (action?.type === "updateTab") {
            const tab = tabs.find(tab => tab.id === action.tabId);
            if (tab) Object.assign(tab, { title: action.title, hash: action.hash });
          }
          return route.fulfill({ json: { window: windowState } });
        }
        case "/_doca/session":
          return route.fulfill({ json: { window: windowState } });
        default:
          return route.fulfill({ status: 404 });
      }
    });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(origin + "/_doca/window/" + windowId);
    const workspaceFrame = page.frameLocator("iframe:not([hidden])");
    await workspaceFrame.getByRole("heading", {
      name: translate(locale, "workspace.greeting", { name: "Doca" }),
      exact: true,
    }).waitFor();
    await workspaceFrame.getByText(documentTitle, { exact: true }).first().waitFor();
    const switchBackend = page.getByRole("button", { name: t("desktop.switchBackend"), exact: true });
    await switchBackend.waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), language);
    await Promise.all([
      page.waitForResponse(response => response.url() === origin + "/_doca/manager"),
      switchBackend.click(),
    ]);
    assert.deepEqual(managerRequests, [locale]);
    const workspace = "desktop-workspace";
    images.push({ name: workspace, ...await screenshot(page, workspace) });
    assert.deepEqual(errors, []);
    return images;
  } catch (error) {
    await screenshot(page, "desktop-failure").catch(() => {});
    throw new Error(`Desktop screenshot capture failed (${locale}): ${errors.join(", ")}`, { cause: error });
  } finally {
    await page.close();
  }
}
