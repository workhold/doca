import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const editorEntries = [
  "src/features/documents/document-editor.tsx",
  "src/features/documents/markdown-editor.tsx",
  "src/features/documents/spreadsheet-editor.tsx",
  "src/features/documents/canvas-editor.tsx",
  "src/features/documents/presentation-editor.tsx",
];
const entryFiles = ["index.html", "src/app/app.tsx", ...editorEntries];
const publicFiles = ["favicon.svg", "doca.webmanifest"];

export function offlineShellBuild(): Plugin {
  return {
    name: "doca-offline-shell",
    apply: "build",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const html = bundle["index.html"];
        if (html?.type !== "asset")
          throw Error("Offline shell requires index.html");
        const entries = new Map<string, string>();
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === "chunk" && chunk.facadeModuleId)
            entries.set(
              relative(webRoot, chunk.facadeModuleId).replaceAll("\\", "/"),
              chunk.fileName,
            );
        }
        const required = new Set<string>(publicFiles);
        const include = (file: string) => {
          if (required.has(file)) return;
          const item = bundle[file];
          if (!item) return;
          required.add(file);
          for (const asset of item.viteMetadata?.importedAssets ?? [])
            include(asset);
          for (const css of item.viteMetadata?.importedCss ?? []) include(css);
          if (item.type === "chunk")
            for (const dependency of item.imports) include(dependency);
        };
        for (const entry of entryFiles) {
          const file = entries.get(entry);
          if (!file) throw Error(`Offline shell is missing ${entry}`);
          include(file);
        }
        const staticPaths = Object.keys(bundle)
          .filter((file) => file.startsWith("assets/"))
          .sort();
        const worker = readFileSync(
          new URL("./offline-worker.js", import.meta.url),
          "utf8",
        );
        const shell = Buffer.from(html.source).toString("utf8");
        const build = JSON.stringify({
          shell,
          required: [...required].sort().map((file) => `/${file}`),
          staticPaths: [...publicFiles, ...staticPaths].map(
            (file) => `/${file}`,
          ),
        });
        const id = createHash("sha256")
          .update(build)
          .update(worker)
          .digest("hex")
          .slice(0, 24);
        this.emitFile({
          type: "asset",
          fileName: "doca-offline-worker.js",
          source: `const shellBuild = ${build};\nconst shellVersion = ${JSON.stringify(id)};\n${worker}`,
        });
      },
    },
  };
}
