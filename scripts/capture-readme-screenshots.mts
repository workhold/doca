// Real editor screenshots from synthetic documents in a disposable local app.
// No production database, user documents, external AI, or credentials are used.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Page } from "playwright-core";
import sharp from "sharp";
import { createServer } from "vite";
import { createPresentation, type SlideElement } from "@smartdoca/slides/core";
import { htmlLang, isLocale, localeNames, locales, translate, type Locale } from "@doca/i18n";
import { openDatabase } from "../packages/db/src/index.js";
import { transact } from "../packages/db/src/transactions.js";
import { createUser } from "../packages/core/src/modules/identity/passwords.js";
import { provisionSurface } from "../packages/core/src/modules/documents/codecs/surfaces.js";
import { createContent } from "../packages/core/src/workflows/resources.js";
import {
  editAIDocument,
  readAIDocument,
} from "../packages/core/src/workflows/ai-documents.js";

const locale = process.env.DOCA_SCREENSHOT_LOCALE ?? "zh";
assert(isLocale(locale), `Unsupported screenshot locale: ${locale}`);
const lang = htmlLang(locale);
const samples: Partial<Record<Locale, Record<string, string>>> = JSON.parse(
  await readFile(new URL("../tests/fixtures/readme-screenshots/samples.json", import.meta.url), "utf8"),
);
function sample(text: string) {
  if (locale === "zh") return text;
  const value = samples[locale]?.[text];
  assert(value, `Missing ${locale} screenshot fixture: ${text}`);
  return value;
}
const built = process.env.DOCA_SCREENSHOT_BUILT === "1";
const output = resolve(
  process.env.DOCA_SCREENSHOT_OUTPUT ?? "artifacts/readme-screenshots",
);
const port = Number(process.env.DOCA_SCREENSHOT_PORT ?? 39481);
const origin = `http://127.0.0.1:${port}`;
const root = await mkdtemp(join(tmpdir(), "doca-readme-"));
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
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let web: Awaited<ReturnType<typeof createServer>> | undefined;
let app: Awaited<ReturnType<typeof createApp>> | undefined;
try {
  const password = randomBytes(24).toString("hex");
  const owner = {
    ...(await createUser(
      db,
      { login: "readmedemo", displayName: "Doca", password },
      { bootstrap: true },
    )),
    admin: 1,
  };
  const content = createContent(db);
  const library = await content.create(owner, {
    kind: "library",
    format: "rich_text",
    title: sample("团队知识库"),
  });
  const docs: Record<string, { id: string; title: string }> = {};
  const create = async (
    format:
      "rich_text" | "markdown" | "spreadsheet" | "presentation" | "canvas",
    title: string,
    extra = {},
  ) => {
    const doc = await content.create(owner, {
      kind: "document",
      format,
      title,
      libraryId: library.id,
      ...extra,
    });
    docs[format] = doc;
    return doc;
  };
  const edit = async (id: string, operations: unknown[]) => {
    const state = await readAIDocument(db, { actor: owner }, id);
    return editAIDocument(
      db,
      { actor: owner },
      id,
      { seq: state.seq, epochId: state.epochId! },
      operations,
      randomUUID(),
    );
  };

  const guide = await create("rich_text", sample("团队协作指南"));
  await edit(guide.id, [
    {
      type: "append",
      text: sample(`**DOCA / 把知识留在触手可及的地方**

从灵感到文档，从文档到团队知识。把方案、会议纪要、数据与演示放在同一个工作台，让每一次讨论都有上下文。

## 01 写下来，一起完善

用富文本梳理方案，用 Markdown 记录研发笔记，用在线表格管理项目预算。邀请伙伴协同编辑，通过评论讨论细节，随时查看文档历史。

## 02 让知识有自己的位置

按主题建立知识库，用目录连接项目背景、工作记录与交付资料。为不同成员设置阅读、评论、编辑和管理权限，让分享更清晰。

## 03 把想法变成下一步

在画布上展开流程与思路，在幻灯片中讲清方案。连接你配置的 AI 模型，围绕有权限访问的文档和文件开展工作。

---

**从这里开始**　团队周会 · 研发笔记 · 项目预算 · 产品介绍 · 项目画板
`),
    },
  ]);

  await create("markdown", sample("研发笔记"), {
    markdown: sample(`# 研发笔记

> 用清晰的记录，让下一次协作更轻松。

## 本周交付

- [x] 整理项目背景与设计方案
- [x] 完成五种文档的协同编辑验收
- [ ] 汇总试用反馈，安排下周迭代

## 启动本地工作台

\`\`\`bash
git clone https://github.com/workhold/doca.git
cd doca
pnpm install
pnpm dev
\`\`\`

## 文档约定

| 内容 | 放在哪里 | 更新时机 |
| --- | --- | --- |
| 项目目标与决策 | 团队协作指南 | 方案评审后 |
| 实现细节与问题 | 研发笔记 | 每次迭代 |
| 预算与进度 | 在线表格 | 每周复盘 |
`),
  });

  const budget = await create("spreadsheet", sample("项目预算"));
  const cells: Record<number, Record<number, any>> = {};
  const cell = (
    r: number,
    c: number,
    v: string | number,
    s: Record<string, unknown> = {},
    f?: string,
  ) => {
    (cells[r] ??= {})[c] = {
      v,
      ...(f ? { f } : {}),
      s: { ff: "Arial", fs: 12, vt: 2, cl: { rgb: "#26324b" }, ...s },
    };
  };
  const blue = "#315de9",
    pale = "#edf2ff",
    green = "#18805b";
  cell(0, 0, sample("团队项目 · 预算与进度"), { fs: 22, bl: 1, cl: { rgb: blue } });
  cell(1, 0, sample("2026 年第四季度　/　单位：元"), {
    cl: { rgb: "#7b8498" },
    fs: 11,
  });
  [sample("工作项"), sample("负责人"), sample("计划预算"), sample("实际支出"), sample("结余"), sample("进度"), sample("状态")].forEach(
    (v, c) =>
      cell(3, c, v, { bl: 1, bg: { rgb: blue }, cl: { rgb: "#ffffff" } }),
  );
  const rows = [
    [sample("需求调研"), sample("小林"), 12000, 10800, "100%", sample("已完成")],
    [sample("交互设计"), sample("小周"), 18000, 16500, "100%", sample("已完成")],
    [sample("前端研发"), sample("小陈"), 36000, 28400, "80%", sample("进行中")],
    [sample("后端研发"), sample("小张"), 32000, 25600, "80%", sample("进行中")],
    [sample("测试验收"), sample("小许"), 15000, 7200, "45%", sample("进行中")],
    [sample("上线准备"), sample("小林"), 7000, 1500, "20%", sample("待交付")],
  ] as const;
  for (const [i, row] of rows.entries()) {
    const r = i + 4,
      s = { bg: { rgb: i % 2 === 0 ? "#f2f5ff" : "#ffffff" } };
    row
      .slice(0, 4)
      .forEach((v, c) =>
        cell(r, c, v, { ...s, ...(c >= 2 ? { n: { pattern: "#,##0" } } : {}) }),
      );
    cell(
      r,
      4,
      row[2] - row[3],
      { ...s, cl: { rgb: green }, n: { pattern: "#,##0" } },
      `=C${r + 1}-D${r + 1}`,
    );
    cell(r, 5, row[4], { ...s, cl: { rgb: blue } });
    cell(r, 6, row[5], {
      ...s,
      cl: { rgb: row[5] === sample("已完成") ? green : blue },
    });
  }
  for (let c = 0; c < 7; c++)
    cell(10, c, c === 0 ? sample("合计") : "", { bl: 1, bg: { rgb: pale } });
  for (const [c, v, f] of [
    [2, 120000, "=SUM(C5:C10)"],
    [3, 90000, "=SUM(D5:D10)"],
    [4, 30000, "=SUM(E5:E10)"],
  ] as const)
    cell(10, c, v, { bl: 1, bg: { rgb: pale }, n: { pattern: "#,##0" } }, f);
  cell(13, 0, sample("本周关注"), { fs: 16, bl: 1, cl: { rgb: blue } });
  cell(15, 0, sample("预算执行率"), { bl: 1 });
  cell(
    15,
    2,
    0.75,
    { fs: 20, bl: 1, cl: { rgb: blue }, n: { pattern: "0%" } },
    "=D11/C11",
  );
  cell(17, 0, sample("整体支出保持在预算内，研发与测试按计划推进。"), {
    cl: { rgb: "#667085" },
  });
  cell(19, 0, sample("下一步：完成测试验收，整理上线清单与项目复盘。"), {
    cl: { rgb: "#667085" },
  });
  const sheet = {
    id: "budget",
    name: sample("季度预算"),
    rowCount: 100,
    columnCount: 26,
    defaultRowHeight: 36,
    defaultColumnWidth: 100,
    cellData: cells,
    columnData: {
      0: { w: 210 },
      1: { w: 110 },
      2: { w: 150 },
      3: { w: 150 },
      4: { w: 130 },
      5: { w: 100 },
      6: { w: 130 },
    },
    rowData: {
      0: { h: 54 },
      1: { h: 32 },
      2: { h: 20 },
      3: { h: 42 },
      10: { h: 44 },
    },
    mergeData: [
      { startRow: 0, endRow: 0, startColumn: 0, endColumn: 6 },
      { startRow: 1, endRow: 1, startColumn: 0, endColumn: 6 },
      { startRow: 17, endRow: 17, startColumn: 0, endColumn: 6 },
      { startRow: 19, endRow: 19, startColumn: 0, endColumn: 6 },
    ],
  };
  // Seed only this new, unopened synthetic resource with the current native model.
  await transact(db, (tx) =>
    provisionSurface(tx, budget, {
      id: budget.id,
      name: budget.title,
      appVersion: "0.25.1",
      locale: "zhCN",
      styles: {},
      sheetOrder: [sheet.id],
      sheets: { [sheet.id]: sheet },
    }),
  );

  const deck = await create("presentation", sample("产品介绍"));
  const ppt = createPresentation();
  const transform = (x: number, y: number, w: number, h: number) => ({
    x: x * 9525,
    y: y * 9525,
    width: w * 9525,
    height: h * 9525,
    rotation: 0,
  });
  const text = (
    id: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fontSize: number,
    color = "#18315b",
    bold = false,
  ): SlideElement => ({
    id,
    type: "text",
    transform: transform(x, y, w, h),
    padding: 0,
    verticalAlign: "middle",
    paragraphs: [
      {
        type: "paragraph",
        lineHeight: 1.3,
        children: [{ text: value, fontSize, color, bold, fontFamily: "Arial" }],
      },
    ],
  });
  const rect = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
  ): SlideElement => ({
    id,
    type: "shape",
    shape: "roundRect",
    transform: transform(x, y, w, h),
    fill,
    stroke: fill,
    strokeWidth: 0,
  });
  const slides: Array<{
    title: string;
    elements: SlideElement[];
    background?: string;
  }> = [
    {
      title: sample("从文档到团队知识"),
      background: "#edf2ff",
      elements: [
        text(
          "brand",
          sample("DOCA  /  团队协作工作台"),
          72,
          58,
          1000,
          40,
          18,
          blue,
          true,
        ),
        text(
          "cover-title",
          sample("从文档，到团队知识"),
          72,
          170,
          1100,
          110,
          48,
          "#18315b",
          true,
        ),
        text(
          "cover-subtitle",
          sample("记录想法 · 连接知识 · 一起完成"),
          76,
          300,
          1100,
          60,
          26,
          "#617396",
        ),
        rect("cover-line", 76, 412, 108, 8, blue),
        text(
          "cover-foot",
          sample("产品介绍  /  2026.10"),
          76,
          585,
          1000,
          40,
          16,
          "#617396",
        ),
      ],
    },
    {
      title: sample("五种文档，一个工作台"),
      elements: [
        text(
          "feature-kicker",
          sample("01  /  内容创作与协作"),
          72,
          44,
          1100,
          36,
          16,
          blue,
          true,
        ),
        text(
          "feature-title",
          sample("五种文档，一个工作台"),
          72,
          108,
          1120,
          96,
          40,
          "#18315b",
          true,
        ),
        text(
          "feature-subtitle",
          sample("让文字、数据与想法，在同一个项目里连接。"),
          76,
          210,
          1120,
          44,
          20,
          "#617396",
        ),
        ...[
          [sample("文档与 Markdown"), sample("梳理方案，记录研发笔记"), "#edf2ff"],
          [sample("在线表格"), sample("跟踪预算，整理项目数据"), "#eaf6f1"],
          [sample("幻灯片与画布"), sample("展示成果，展开流程与思路"), "#fff3e6"],
        ].flatMap(([title, body, color], i) => [
          rect(`card-${i}`, 76 + i * 388, 298, 360, 268, color),
          text(
            `num-${i}`,
            `0${i + 1}`,
            100 + i * 388,
            322,
            300,
            42,
            18,
            blue,
            true,
          ),
          text(
            `card-title-${i}`,
            title,
            100 + i * 388,
            368,
            314,
            80,
            23,
            "#18315b",
            true,
          ),
          text(
            `card-body-${i}`,
            body,
            100 + i * 388,
            457,
            314,
            84,
            16,
            "#617396",
          ),
        ]),
        text(
          "feature-foot",
          sample("实时协同  /  评论讨论  /  权限分享  /  版本历史"),
          76,
          615,
          1120,
          36,
          16,
          "#617396",
        ),
      ],
    },
    {
      title: sample("让知识有自己的位置"),
      elements: [
        text(
          "knowledge-kicker",
          sample("02  /  团队知识库"),
          72,
          56,
          1100,
          36,
          16,
          blue,
          true,
        ),
        text(
          "knowledge-title",
          sample("让知识有自己的位置"),
          72,
          134,
          1100,
          80,
          40,
          "#18315b",
          true,
        ),
        ...[
          sample("项目目录：背景、过程与交付资料"),
          sample("清晰权限：阅读、评论、编辑与管理"),
          sample("持续积累：把每次协作变成可复用的知识"),
        ].map((v, i) =>
          text(`knowledge-${i}`, v, 82, 286 + i * 88, 1100, 58, 25, "#617396"),
        ),
      ],
    },
    {
      title: sample("从今天开始，一起完成"),
      background: "#edf2ff",
      elements: [
        text(
          "closing-title",
          sample("从今天开始，一起完成"),
          82,
          180,
          1120,
          100,
          46,
          "#18315b",
          true,
        ),
        text(
          "closing-body",
          sample("建立团队知识库，写下第一份项目文档。"),
          86,
          310,
          1080,
          60,
          26,
          "#617396",
        ),
        text(
          "closing-url",
          "github.com/workhold/doca",
          86,
          506,
          1080,
          44,
          22,
          blue,
        ),
      ],
    },
  ];
  ppt.slideOrder = slides.map((_, i) => `demo-slide-${i + 1}`);
  ppt.slides = Object.fromEntries(
    slides.map((s, i) => [
      ppt.slideOrder[i]!,
      {
        id: ppt.slideOrder[i]!,
        name: s.title,
        background: s.background ?? "#ffffff",
        notes: sample("团队知识库演示文稿"),
        elementOrder: s.elements.map((e) => e.id),
        elements: Object.fromEntries(s.elements.map((e) => [e.id, e])),
      },
    ]),
  );
  await transact(db, (tx) => provisionSurface(tx, deck, ppt));

  const board = await create("canvas", sample("项目画板"));
  const label = (
    id: string,
    value: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    fill = "#18315b",
    fontWeight = "normal",
  ) => ({
    type: "add",
    element: {
      id,
      tag: "Text",
      text: value,
      x,
      y,
      width,
      height,
      fontSize,
      fontFamily: "Arial",
      fill,
      fontWeight,
      verticalAlign: "middle",
    },
  });
  await edit(board.id, [
    label(
      "board-title",
      sample("从想法到交付"),
      60,
      24,
      1100,
      60,
      36,
      "#18315b",
      "bold",
    ),
    label(
      "board-subtitle",
      sample("把流程、思路与行动放在同一张画板上"),
      60,
      96,
      1100,
      36,
      18,
      "#617396",
    ),
    label("flow-heading", sample("01  项目流程"), 60, 168, 1100, 36, 20, blue, "bold"),
    {
      type: "createFlowchart",
      id: "project-flow",
      x: 60,
      y: 232,
      nodes: [
        {
          id: "discover",
          text: sample("发现问题"),
          x: 0,
          y: 0,
          width: 210,
          height: 76,
          shape: "rounded",
          fill: "#edf2ff",
          stroke: "#829cf7",
        },
        {
          id: "design",
          text: sample("形成方案"),
          x: 296,
          y: 0,
          width: 210,
          height: 76,
          shape: "rounded",
          fill: "#eaf6f1",
          stroke: "#75bca2",
        },
        {
          id: "build",
          text: sample("协作执行"),
          x: 592,
          y: 0,
          width: 210,
          height: 76,
          shape: "rounded",
          fill: "#fff3e6",
          stroke: "#efbf80",
        },
        {
          id: "review",
          text: sample("交付复盘"),
          x: 888,
          y: 0,
          width: 210,
          height: 76,
          shape: "rounded",
          fill: "#f4edff",
          stroke: "#b69ada",
        },
      ],
      edges: [
        {
          id: "flow-1",
          sourceId: "discover",
          targetId: "design",
          mode: "straight",
        },
        {
          id: "flow-2",
          sourceId: "design",
          targetId: "build",
          mode: "straight",
        },
        {
          id: "flow-3",
          sourceId: "build",
          targetId: "review",
          mode: "straight",
        },
      ],
    },
    label("mind-heading", sample("02  拆解思路"), 60, 380, 560, 36, 20, blue, "bold"),
    {
      type: "createMindmap",
      id: "project-mind",
      x: 60,
      y: 526,
      layout: "right",
      topic: {
        id: "mind-root",
        text: sample("团队资料"),
        children: [
          {
            id: "mind-doc",
            text: sample("内容沉淀"),
          },
          {
            id: "mind-team",
            text: sample("协同推进"),
          },
          {
            id: "mind-result",
            text: sample("持续复用"),
          },
        ],
      },
    },
    label("table-heading", sample("03  行动清单"), 760, 380, 400, 36, 20, blue, "bold"),
    {
      type: "createTable",
      id: "actions",
      x: 760,
      y: 448,
      cells: [
        [sample("下一步"), sample("负责人"), sample("时间")],
        [sample("梳理项目背景"), sample("小林"), sample("周一")],
        [sample("完善协作方案"), sample("小周"), sample("周三")],
        [sample("评审与复盘"), sample("团队"), sample("周五")],
      ],
      columnWidths: [190, 95, 95],
      rowHeights: [48, 52, 52, 52],
    },
    {
      type: "table",
      id: "actions",
      command: {
        kind: "style",
        range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 2 },
        style: { bold: true, color: "#ffffff", backgroundColor: blue },
      },
    },
  ]);

  app = await createApp(db, {
    origin,
    storage: { ...storageRuntime(), root },
    ai: { memory: { driver: "sqlite", url: ":memory:" } },
    ...(built ? { staticDirectory: resolve("apps/web/dist") } : {}),
  });
  await mkdir(output, { recursive: true });
  await db.updateTable("settings").set({ default_locale: locale }).where("id", "=", "system").execute();
  await app.listen({ host: "127.0.0.1", port: built ? port : 0 });
  if (!built) {
    const address = app.server.address();
    assert(address && typeof address !== "string");
    web = await createServer({
      configFile: resolve("apps/web/vite.config.ts"),
      server: {
        host: "127.0.0.1",
        port,
        strictPort: true,
        proxy: {
          "/api": { target: `http://127.0.0.1:${address.port}`, ws: true },
        },
      },
    });
    await web.listen();
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    locale: lang,
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const errors: string[] = [];
  const observe = (page: Page, name: string) => {
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
  };
  const waitForLanguage = (page: Page, code: Locale) =>
    page.waitForFunction(tag => document.documentElement.lang === tag, htmlLang(code));
  const alternate = locale === "en" ? "zh" : "en";
  const loginPage = await context.newPage();
  observe(loginPage, "login");
  await loginPage.goto(origin);
  const languageTrigger = loginPage.locator(".auth-login-language .select-trigger");
  await languageTrigger.waitFor();
  await waitForLanguage(loginPage, locale);
  const username = loginPage.locator('input[autocomplete="username"]').first();
  await username.fill("readmedemo");
  async function chooseLogin(code: Locale) {
    await languageTrigger.click();
    assert.equal(await loginPage.getByRole("option").count(), locales.length);
    await loginPage.getByRole("option", { name: localeNames[code], exact: true }).click();
    await waitForLanguage(loginPage, code);
  }
  await chooseLogin(alternate);
  await chooseLogin(locale);
  assert.equal(await username.inputValue(), "readmedemo");
  await loginPage.screenshot({ path: join(output, "login.png") });
  await loginPage.setViewportSize({ width: 375, height: 800 });
  assert.equal(await loginPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await loginPage.screenshot({ path: join(output, "login-narrow.png") });
  await loginPage.close();
  const login = await context.request.post(origin + "/api/v1/auth/login", {
    headers: { origin },
    data: { login: "readmedemo", password },
  });
  assert(login.ok());
  for (const doc of Object.values(docs)) {
    const visit = await context.request.post(`${origin}/api/v1/resources/${doc.id}/visit`, { headers: { origin } });
    assert(visit.ok());
  }
  async function chooseWorkspaceLanguage(page: Page, code: Locale) {
    const picker = page.locator(".locale-switch").first();
    await picker.locator("summary").click();
    assert.equal(await picker.getByRole("option").count(), locales.length);
    const saved = page.waitForResponse(async response => {
      if (response.request().method() !== "PUT" || !response.url().endsWith("/api/v1/me/page-state") || !response.ok()) return false;
      const result = await response.json();
      return !result.conflict && result.item?.value === code;
    });
    await Promise.all([
      saved,
      picker.getByRole("option", { name: localeNames[code], exact: true }).click({ timeout: 10000 }),
    ]);
    await waitForLanguage(page, code);
    const result = await context.request.get(origin + "/api/v1/me/page-state?key=ui.locale");
    assert.equal((await result.json()).item?.value, code);
  }
  const workspace = await context.newPage();
  observe(workspace, "workspace");
  await workspace.goto(origin + "/#/home");
  await waitForLanguage(workspace, locale);
  await chooseWorkspaceLanguage(workspace, alternate);
  await chooseWorkspaceLanguage(workspace, locale);
  await workspace.reload();
  await waitForLanguage(workspace, locale);
  await workspace.getByRole("heading", { name: translate(locale, "workspace.greeting", { name: "Doca" }), exact: true }).waitFor();
  const captures = [];
  async function screenshot(page: Page, name: string) {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(1500, 960);
    const png = join(output, `${name}.png`);
    const jpg = join(output, `${name}.jpg`);
    await page.screenshot({ path: png });
    await sharp(png)
      .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(jpg);
    return { png, jpg };
  }
  await workspace.getByText(docs.rich_text!.title, { exact: true }).first().waitFor();
  captures.push({ name: "workspace", ...await screenshot(workspace, "workspace") });
  await workspace.close();
  for (const [format, name, selector] of [
    ["rich_text", "rich-text", ".sk-editable"],
    ["markdown", "markdown", ".cm-content"],
    ["spreadsheet", "spreadsheet", ".sheet-document .uos-office-toolbar"],
    ["presentation", "slides", ".eppt-workspace"],
    ["canvas", "canvas", ".canvas-app"],
  ] as const) {
    const page = await context.newPage();
    observe(page, format);
    const fixture = docs[format]!;
    await page.goto(origin + "/#/r/" + fixture.id);
    const editor = page.locator(selector).first();
    await editor.waitFor({ timeout: 60000 });
    const waitForEditorLanguage = (lang: string) => page.waitForFunction(({selector, lang}) => {
      const root = document.querySelector(selector)?.closest("[lang]");
      return root !== document.documentElement && root?.getAttribute("lang") === lang;
    }, { selector, lang });
    await waitForEditorLanguage(lang);
    const editorLabels = () => editor.evaluate(element => {
      const root = element.closest("[lang]")!;
      const labels = [root, ...root.querySelectorAll("[aria-label], [title]")].flatMap(node =>
        [node.getAttribute("aria-label"), node.getAttribute("title")].filter(Boolean));
      return [...new Set(labels)].sort();
    });
    const localizedLabels = await editorLabels();
    const node = await editor.elementHandle();
    const before = await readAIDocument(db, { actor: owner }, fixture.id);
    await chooseWorkspaceLanguage(page, alternate);
    await waitForEditorLanguage(htmlLang(alternate));
    assert.notDeepEqual(await editorLabels(), localizedLabels, `No controls changed language in ${format}`);
    await chooseWorkspaceLanguage(page, locale);
    await waitForEditorLanguage(lang);
    assert(node && await node.evaluate(element => element.isConnected), `Locale change rebuilt ${format}`);
    await node.dispose();
    const after = await readAIDocument(db, { actor: owner }, fixture.id);
    assert.equal(after.epochId, before.epochId);
    assert.equal(after.seq, before.seq);
    if (format === "presentation") {
      // Choose the actual second slide in the native slide navigator.
      await page.locator(".eppt-thumbnail").nth(1).click();
    }
    if (format === "canvas") {
      await page.locator(".canvas-app").focus();
      await page.keyboard.press("Shift+Digit1");
    }
    await delay(1500);
    captures.push({ format, name, title: fixture.title, epoch: after.epochId,
      sequence: after.seq, labels: localizedLabels, ...await screenshot(page, name) });
    console.log(`CAPTURED ${name}`);
    await page.close();
  }
  if (process.env.DOCA_SCREENSHOT_DESKTOP === "1") {
    const { captureDesktopScreenshots } = await import("./lib/desktop-screenshots.mjs");
    captures.push(...await captureDesktopScreenshots({
      context, origin, locale, documentId: guide.id, documentTitle: guide.title, screenshot,
    }));
  }
  assert.deepEqual(errors, []);
  const pkg = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(
      {
        version: pkg.version,
        locale,
        languageTag: lang,
        built,
        generatedAt: new Date().toISOString(),
        viewport: { width: 1600, height: 1000 },
        editorVersions: Object.fromEntries(
          Object.entries(pkg.dependencies).filter(([key]) =>
            /^@smartdoca\/(canvas|slate|slides|sheet|markdown)$/.test(key),
          ),
        ),
        browserErrors: errors,
        captures,
      },
      null,
      2,
    ) + "\n",
  );
} catch (error) {
  const page = browser?.contexts().at(-1)?.pages().at(-1);
  if (page) await page.screenshot({ path: join(output, "failure.png"), timeout: 5000 }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await web?.close();
  await app?.close();
  await db.destroy();
  await rm(root, { recursive: true, force: true });
}
