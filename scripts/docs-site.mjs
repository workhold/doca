import { readFile, writeFile, mkdir, rm, cp, access } from "node:fs/promises";
import { dirname, resolve, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { databaseInventory, documentLinks, expectedSkillReferences, headingIds, headingText, markdownFiles, repositoryTarget } from "./lib/documentation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = resolve(root, "docs");
const output = resolve(root, ".cache/docs-site");
const navigation = JSON.parse(await readFile(resolve(docs, "site/navigation.json"), "utf8"));
const editions = JSON.parse(await readFile(resolve(docs, "site/languages.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const languages = Object.keys(editions);
const currentRelease = `releases/${manifest.version}`;
const pages = [{ id: "README", group: "", labels: {} }];
for (const group of navigation) {
  for (const [id, en, zh, translatedRelease] of group.pages) {
    pages.push({ id, group: group.id, translatedRelease, labels: { en, "zh-cn": zh } });
  }
}
const hasEdition = (page, lang) =>
  page.group !== "releases" || page.translatedRelease || lang === "en" || lang === "zh-cn";
const source = (page, lang) => `${page.id}${editions[lang].suffix}.md`;
const route = (page, lang) => `/${lang}/${page.group ? `${page.group}/` : ""}${page.id === "README" ? "" : posix.basename(page.id)}`;
const sourcePages = new Map();
const problems = [];
for (const page of pages) {
  for (const lang of languages) {
    if (!hasEdition(page, lang)) continue;
    const path = resolve(docs, source(page, lang));
    if (sourcePages.has(path)) throw new Error(`Duplicate documentation source: ${path}`);
    sourcePages.set(path, { page, lang });
    try { await access(path); } catch { problems.push(`Missing ${lang} document: ${relative(root, path)}`); }
  }
}
if (problems.length) throw new Error(problems.join("\n"));

const repository = "https://github.com/workhold/doca/blob/main/";
const documents = new Map();
for (const path of await markdownFiles(root)) {
  const markdown = await readFile(path, "utf8");
  const tree = fromMarkdown(markdown);
  documents.set(path, { markdown, tree, headings: headingIds(tree), sourceHeadings: headingIds(tree, "github") });
}
let linkCount = 0;
for (const [path, { tree }] of documents) {
  for (const { href, node } of documentLinks(tree)) {
    let target;
    try { target = repositoryTarget(root, path, href); }
    catch { problems.push(`${relative(root, path)}:${node.position.start.line} has malformed link encoding: ${href}`); continue; }
    if (!target) continue;
    linkCount++;
    if (target.outside) problems.push(`${relative(root, path)} links outside the repository: ${href}`);
    else {
      try { await access(target.destination); } catch { problems.push(`${relative(root, path)}:${node.position.start.line} has a missing target: ${href}`); }
      const document = documents.get(target.destination);
      if (target.fragment && document && !document.headings.has(target.fragment) && !document.sourceHeadings.has(target.fragment)) {
        problems.push(`${relative(root, path)}:${node.position.start.line} has a missing heading: ${href}`);
      }
    }
  }
}
for (const [target, expected] of await expectedSkillReferences(root)) {
  if (documents.get(resolve(root, "skills", target))?.markdown !== expected) problems.push(`Stale skill reference: skills/${target}; run node scripts/sync-docs-skills.mjs`);
}
if (navigation.find(group => group.id === "releases")?.pages[0]?.[0] !== currentRelease) problems.push("The release navigation does not start with the current host version");
for (const lang of languages) {
  const suffix = editions[lang].suffix;
  const home = documents.get(resolve(docs, `README${suffix}.md`))?.markdown;
  const current = `${currentRelease}${suffix}.md`;
  if (!home?.includes(current)) problems.push(`The ${lang} documentation home does not link to ${current}`);
  const editor = documents.get(resolve(docs, `editor-integration${suffix}.md`))?.markdown;
  for (const name of ["slate", "markdown", "sheet", "canvas", "slides"]) {
    const pkg = `@smartdoca/${name}`;
    if (!editor?.includes(`| ${pkg} ${manifest.dependencies[pkg]} |`)) problems.push(`The ${lang} editor matrix disagrees with package.json: ${pkg}`);
  }
}
const inventory = databaseInventory(root);
const payloadSource = await readFile(resolve(root, "packages/db/src/book-payload-schema.ts"), "utf8");
const generation = payloadSource.match(/export const BOOK_PAYLOAD_BASELINE = "([^"]+)"/)?.[1];
if (!generation) throw new Error("Cannot determine the current database compatibility generation");
for (const name of ["database.md", "database.zh-CN.md"]) {
  const markdown = documents.get(resolve(docs, name))?.markdown ?? "";
  const baseline = markdown.split("\n").find(line => /^(The current compatibility generation|当前兼容代际)/.test(line));
  if (!baseline?.includes(`\`${generation}\``)) problems.push(`${name} has a stale database compatibility generation`);
  const rows = new Map([...markdown.matchAll(/^\| `([^`]+)` \| (.*?) \|$/gm)].map(match => [match[1], [...match[2].matchAll(/`([^`]+)`/g)].map(field => field[1])]));
  if (rows.size !== inventory.length) problems.push(`${name} table count disagrees with Schema (${inventory.length})`);
  for (const table of inventory) {
    if (rows.get(table.name)?.join(",") !== table.fields.join(",")) problems.push(`${name} has stale fields for ${table.name}`);
  }
}
const publishedRoutes = new Set(Array.from(sourcePages.values(), ({ page, lang }) => route(page, lang)));
for (const lang of languages) {
  const name = `README${editions[lang].suffix}.md`;
  const markdown = await readFile(resolve(root, name), "utf8");
  const entrance = `https://workhold.github.io/doca/#/${lang}/`;
  const links = documentLinks(fromMarkdown(markdown));
  if (!links.some(({ href }) => href === entrance)) problems.push(`${name} is missing its ${lang} documentation entrance`);
  const screenshots = ["workspace", "rich-text", "markdown", "spreadsheet", "slides", "canvas"];
  for (const image of screenshots) {
    const path = `docs/images/${lang}/${image}.jpg`;
    if (!links.some(({ href }) => href === path)) problems.push(`${name} is missing its screenshot ${path}`);
  }
  for (const { href } of links) {
    if (href.startsWith("https://workhold.github.io/doca/#/")) {
      const path = new URL(href).hash.slice(1).split("?")[0];
      if (!publishedRoutes.has(path) || !path.startsWith(`/${lang}/`)) {
        problems.push(`${name} has an invalid ${lang} documentation link: ${href}`);
      }
    }
  }
}
function checkFragment(path, destination, fragment) {
  if (fragment && !documents.get(destination)?.headings.has(decodeURIComponent(fragment))) {
    problems.push(`${relative(root, path)} has a missing heading: ${relative(root, destination)}#${fragment}`);
  }
}
const languageLabels = new Set(["中文", "简體中文", ...Object.values(editions).map(edition => edition.name)]);
const files = [];
for (const page of pages) {
  for (const lang of languages) {
    if (!hasEdition(page, lang)) continue;
    const path = resolve(docs, source(page, lang));
    const { markdown, tree } = documents.get(path);
    const replacements = [];
    async function visit(node) {
      if (["link", "image", "definition"].includes(node.type)) {
        const href = node.url;
        if (href?.startsWith("#") && !href.startsWith("#/")) checkFragment(path, path, href.slice(1));
        if (href && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) {
          const [local, ...fragmentParts] = href.split("#");
          const fragment = fragmentParts.length ? `#${fragmentParts.join("#")}` : "";
          const destination = resolve(dirname(path), decodeURI(local));
          const repoPath = relative(root, destination).split("\\").join("/");
          if (repoPath.startsWith("../") || repoPath === "..") {
            problems.push(`${relative(root, path)} links outside the repository: ${href}`);
          } else {
            try { await access(destination); } catch { problems.push(`${relative(root, path)} has a missing target: ${href}`); }
            const target = sourcePages.get(destination);
            let replacement;
            if (target && node.type !== "image") {
              // Language-switch links select a language; ordinary links stay in the current language.
              const label = (node.children ?? []).map(child => child.value ?? "").join("").trim();
              const targetLang = languageLabels.has(label) || !hasEdition(target.page, lang) ? target.lang : lang;
              checkFragment(path, resolve(docs, source(target.page, targetLang)), fragment.slice(1));
              replacement = `${route(target.page, targetLang)}${fragment}`;
            } else if (node.type === "image" && repoPath.startsWith("docs/images/")) {
              replacement = `assets/${repoPath.slice("docs/".length)}${fragment}`;
            } else {
              const base = node.type === "image" ? "https://raw.githubusercontent.com/workhold/doca/main/" : repository;
              replacement = `${base}${repoPath}${fragment}`;
            }
            const start = node.position.start.offset;
            const segment = markdown.slice(start, node.position.end.offset);
            const urlOffset = segment.indexOf(href, segment.indexOf("]") + 1);
            if (urlOffset < 0) problems.push(`${relative(root, path)} has an unsupported link spelling: ${href}`);
            else replacements.push({ start: start + urlOffset, end: start + urlOffset + href.length, value: replacement });
          }
        }
      }
      for (const child of node.children ?? []) await visit(child);
    }
    await visit(tree);
    let published = markdown;
    for (const edit of replacements.sort((a, b) => b.start - a.start)) published = published.slice(0, edit.start) + edit.value + published.slice(edit.end);
    files.push({ path: `${route(page, lang).slice(1)}${page.id === "README" ? "README" : ""}.md`, content: published });
  }
}
if (problems.length) throw new Error(problems.join("\n"));
if (process.argv[2] === "check") {
  console.log(`Documentation verified: ${documents.size} repository documents, ${linkCount} repository links, ${files.length} editions in ${languages.length} languages; headings, release/editor versions, ${inventory.length} schema tables and skill references agree.`);
} else if (process.argv[2] === "build") {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(resolve(docs, "site/assets"), resolve(output, "assets"), { recursive: true });
  await cp(resolve(docs, "images"), resolve(output, "assets/images"), { recursive: true, filter: path => !path.endsWith(".md") });
  await cp(resolve(docs, "site/index.html"), resolve(output, "index.html"));
  await writeFile(resolve(output, ".nojekyll"), "");
  for (const file of files) {
    await mkdir(dirname(resolve(output, file.path)), { recursive: true });
    await writeFile(resolve(output, file.path), file.content);
  }
  for (const lang of languages) {
    const edition = editions[lang];
    const sidebar = [`- [${edition.home}](/${lang}/)`];
    for (const group of navigation) {
      sidebar.push(`- ${edition.groups[group.id]}`);
      for (const page of pages.filter(page => page.group === group.id && hasEdition(page, lang))) {
        const heading = documents.get(resolve(docs, source(page, lang))).tree.children.find(node => node.type === "heading");
        const title = page.labels[lang] ?? (heading ? headingText(heading) : posix.basename(page.id));
        sidebar.push(`  - [${title.replaceAll("[", "\\[").replaceAll("]", "\\]")}](${route(page, lang)})`);
      }
      if (group.id === "releases" && lang !== "en" && lang !== "zh-cn") {
        const precedingRelease = pages.find(page => page.group === "releases" && page.id !== currentRelease);
        if (precedingRelease) sidebar.push(`  - [${edition.archive}](${route(precedingRelease, "en")})`);
      }
    }
    await writeFile(resolve(output, lang, "_sidebar.md"), `${sidebar.join("\n")}\n`);
    const navbar = [`- ${edition.switchLanguage}`, ...languages.map(code => `  - [${editions[code].name}](/${code}/)`), "- [GitHub](https://github.com/workhold/doca)"];
    await writeFile(resolve(output, lang, "_navbar.md"), `${navbar.join("\n")}\n`);
  }
  await writeFile(resolve(output, "README.md"), files.find(file => file.path === "en/README.md").content);
  await writeFile(resolve(output, "_404.md"), "# Page not found / 页面不存在\n\n[English](/en/) · [简体中文](/zh-cn/)\n");
  const pageIndex = pages.map(page => Object.fromEntries(languages
    .filter(lang => hasEdition(page, lang))
    .map(lang => [lang, { route: route(page, lang), source: source(page, lang) }])));
  const uiLanguages = Object.fromEntries(languages.map(lang => {
    const { suffix, groups, ...ui } = editions[lang];
    return [lang, ui];
  }));
  await writeFile(resolve(output, "assets/pages.json"), JSON.stringify(pageIndex));
  await writeFile(resolve(output, "assets/languages.js"), `window.docaDocsLanguages = ${JSON.stringify(uiLanguages).replaceAll("<", "\\u003c")};\n`);
  console.log(`Docsify site prepared: ${relative(root, output)} (${files.length} editions).`);
} else {
  throw new Error("Usage: node scripts/docs-site.mjs check|build");
}
