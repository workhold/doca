import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { build, preview } from "vite";

const root = resolve(import.meta.dirname, "..");
const fixtures = resolve(root, "tests/fixtures");
const outDir = resolve(root, "artifacts/verification/desktop-pdf-preview-regression");

await build({
  root: fixtures,
  configFile: resolve(root, "apps/web/vite.config.ts"),
  logLevel: "warn",
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: resolve(fixtures, "file-pdf-preview.html") },
  },
});

const server = await preview({
  configFile: false,
  root: fixtures,
  build: { outDir },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
});
const address = server.httpServer.address();
assert(address && typeof address === "object");

try {
  const browser = await chromium.launch({ executablePath: process.env.DOCA_QA_BROWSER });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      // The macOS WKWebView can expose getReader without async iteration.
      Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, { value: undefined });
    });
    let bytes: Buffer;
    await page.route("**/api/v1/files/items/preview/content", (route) =>
      route.fulfill({ contentType: "application/pdf", body: bytes }),
    );
    for (const [file, expectedText] of [
      ["ai-recognition/scan.pdf", ""],
      ["file-pdf-preview-text.pdf", "Doca PDF text fixture"],
    ] as const) {
      bytes = await readFile(resolve(fixtures, file));
      await page.goto(`http://127.0.0.1:${address.port}/file-pdf-preview.html`);
      assert.equal(await page.evaluate(() => typeof ReadableStream.prototype[Symbol.asyncIterator]), "undefined");
      await page.locator(".ofv-pdf-error,.ofv-pdf-text-layer").first().waitFor();
      assert.equal(await page.locator(".ofv-pdf-error").count(), 0, file);
      const layer = await page.locator(".ofv-pdf-text-layer").textContent();
      if (expectedText) assert.equal(layer?.trim(), expectedText);
      const painted = await page.locator("canvas.ofv-pdf-page").evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] === 255 && Math.min(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) < 200) return true;
        }
        return false;
      });
      assert(painted, `No non-white pixels in ${file}`);
      console.log(`PASS ${file}: page painted${expectedText ? " and text selectable" : ""}`);
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
