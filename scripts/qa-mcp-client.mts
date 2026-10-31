import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
if (process.env.DOCA_QA_ISOLATED !== "1")
  throw Error("Disposable MCP site only");
const fixture = JSON.parse(
  await readFile(
    resolve(process.env.DOCA_MCP_QA_FIXTURE ?? ".cache/qa-mcp.json"),
    "utf8",
  ),
);
assert.match(fixture.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const host = process.env.DOCA_MCP_QA_HOST ?? new URL(fixture.origin).host;
const output = resolve(
  process.env.DOCA_MCP_QA_OUTPUT ?? "artifacts/verification/mcp-2026-10-20",
);
await mkdir(output, { recursive: true });
const client = new Client({
  name: "doca-real-http-acceptance",
  version: "1.0.0",
});
await client.connect(
  new StreamableHTTPClientTransport(new URL(fixture.origin + "/api/v1/mcp"), {
    requestInit: {
      headers: {
        Host: host,
        Authorization: `Bearer ${fixture.personal.token}`,
      },
    },
  }),
);
async function invoke(name: string, args: Record<string, unknown>) {
  const response: any = await client.callTool({ name, arguments: args });
  assert(!response.isError, JSON.stringify(response));
  return response.structuredContent.result;
}
const tools = await client.listTools();
assert(tools.tools.some((tool) => tool.name === "doca_describe_tools"));
const context = await invoke("doca_tools", {
  purpose:
    "通过真实 MCP HTTP 客户端生成测试报告、画板、PPT、Excel 和文件附件，并实际读回验收。",
});
const run = (tool: string, input: Record<string, unknown>) =>
  invoke("doca_call", {
    contextId: context.contextId,
    requestId: randomUUID(),
    tool,
    input,
  });
await invoke("doca_describe_tools", {
  contextId: context.contextId,
  tools: ["document_create", "document_read"],
});
const skills: any[] = await invoke("doca_skills", {});
assert(skills.some((skill) => skill.id === "canvas"));
const documents: any[] = [];
for (const [format, title] of [
  ["rich_text", "MCP 自动测试报告"],
  ["canvas", "MCP 验收流程画板"],
  ["presentation", "MCP 验收汇报"],
  ["spreadsheet", "MCP 测试指标表"],
]) {
  const skill = format === "rich_text" ? "writing" : format;
  await invoke("doca_load_skill", { id: skill });
  const created = await run("document_create", { format, title });
  const before = await run("document_read", { resourceId: created.id });
  const operations =
    format === "rich_text"
      ? [
          {
            type: "append",
            text: "自动化测试报告\n测试日期：2026-10-20\n总用例：12；通过：12；失败：0。\n结论：MCP 已完成真实 HTTP 写入并读回验证。",
          },
        ]
      : format === "canvas"
        ? [
            {
              type: "createFlowchart",
              id: "mcp-flow",
              x: 40,
              y: 100,
              nodes: [
                {
                  id: "source",
                  text: "测试平台",
                  x: 0,
                  y: 0,
                  width: 220,
                  height: 110,
                  shape: "rounded",
                },
                {
                  id: "doca",
                  text: "Doca MCP",
                  x: 360,
                  y: 0,
                  width: 220,
                  height: 110,
                  shape: "rounded",
                },
                {
                  id: "report",
                  text: "用户报告",
                  x: 720,
                  y: 0,
                  width: 220,
                  height: 110,
                  shape: "rounded",
                },
              ],
              edges: [
                {
                  id: "link1",
                  sourceId: "source",
                  targetId: "doca",
                  mode: "elbow",
                },
                {
                  id: "link2",
                  sourceId: "doca",
                  targetId: "report",
                  mode: "elbow",
                },
              ],
            },
          ]
        : format === "presentation"
          ? [
              {
                type: "remove",
                slideId: before.outline.slideOrder[0],
                ids: before.outline.slides[0].elementOrder,
              },
              {
                type: "insert",
                slideId: before.outline.slideOrder[0],
                element: {
                  id: "mcp-ppt-title",
                  type: "text",
                  transform: {
                    x: 914400,
                    y: 685800,
                    width: 8000000,
                    height: 900000,
                    rotation: 0,
                  },
                  paragraphs: [
                    {
                      type: "paragraph",
                      children: [
                        {
                          text: "MCP 自动化验收",
                          fontSize: 32,
                        },
                      ],
                    },
                  ],
                },
              },
              {
                type: "insert",
                slideId: before.outline.slideOrder[0],
                element: {
                  id: "mcp-ppt-result",
                  type: "text",
                  transform: {
                    x: 914400,
                    y: 2100000,
                    width: 8000000,
                    height: 900000,
                    rotation: 0,
                  },
                  paragraphs: [
                    {
                      type: "paragraph",
                      children: [{ text: "12 / 12 用例通过", fontSize: 24 }],
                    },
                  ],
                },
              },
            ]
          : [
              {
                type: "setCells",
                sheetId: before.outline.sheetOrder[0],
                cells: {
                  0: { 0: { v: "指标" }, 1: { v: "数量" } },
                  1: { 0: { v: "通过" }, 1: { v: 12 } },
                  2: { 0: { v: "失败" }, 1: { v: 0 } },
                  3: { 0: { v: "合计" }, 1: { f: "=SUM(B2:B3)" } },
                },
              },
            ];
  const saved = await run(`${format}_edit`, {
    resourceId: created.id,
    seq: before.seq,
    epochId: before.epochId,
    operations,
  });
  assert(saved.saved, JSON.stringify(saved));
  const after = await run("document_read", {
    resourceId: created.id,
    view: "content",
  });
  assert(after.seq > before.seq);
  assert(
    JSON.stringify(after).includes(
      format === "canvas"
        ? "测试平台"
        : format === "spreadsheet"
          ? "=SUM(B2:B3)"
          : "12",
    ),
  );
  if (format === "canvas") {
    const view = await client.callTool({
      name: "doca_call",
      arguments: {
        contextId: context.contextId,
        requestId: randomUUID(),
        tool: "canvas_view",
        input: { resourceId: created.id },
      },
    });
    assert(!view.isError, JSON.stringify(view));
    const frame = view.content.find((part) => part.type === "image");
    assert(
      frame && frame.type === "image" && frame.mimeType === "image/png",
      "canvas_view must deliver actual PNG pixels",
    );
    const png = Buffer.from(frame.data, "base64");
    assert(
      png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    );
    await writeFile(resolve(output, "mcp-canvas-view.png"), png);
  }
  documents.push({
    id: created.id,
    format,
    title,
    url: `${fixture.origin}/#/r/${created.id}`,
    seq: after.seq,
  });
}
const folder = await run("file_folder_manage", {
  action: "create",
  name: "MCP 验收附件",
  parentId: "root",
});
const folderId = folder.id ?? folder.folder?.id;
assert(folderId, JSON.stringify(folder));
const bytes = Buffer.from(
  "Doca MCP binary transfer — 报告附件\n".repeat(10000),
);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const upload = await run("file_upload_begin", {
  filename: "mcp-report.txt",
  mime: "text/plain",
  size: bytes.length,
  sha256,
});
for (let offset = 0; offset < bytes.length; offset += upload.maxChunkBytes)
  await run("file_upload_chunk", {
    uploadId: upload.uploadId,
    offset,
    base64: bytes
      .subarray(offset, offset + upload.maxChunkBytes)
      .toString("base64"),
  });
const file = await run("file_upload_complete", {
  uploadId: upload.uploadId,
  folderId,
  name: "mcp-report.txt",
});
const downloaded: Buffer[] = [];
let offset: number | null = 0,
  version: number | undefined;
while (offset !== null) {
  const chunk = await run("file_content", {
    fileId: file.id,
    offset,
    ...(version ? { version } : {}),
  });
  assert.equal(chunk.sha256, sha256);
  const content = Buffer.from(chunk.base64, "base64");
  assert.equal(
    createHash("sha256").update(content).digest("hex"),
    chunk.chunkSha256,
  );
  downloaded.push(content);
  offset = chunk.nextOffset;
  version = chunk.version;
}
assert(Buffer.concat(downloaded).equals(bytes));
await writeFile(
  resolve(".cache/mcp-downloaded-report.txt"),
  Buffer.concat(downloaded),
);
await invoke("doca_context_close", { contextId: context.contextId });
await client.close();
const admin = new Client({
  name: "company-platform-acceptance",
  version: "1.0.0",
});
await admin.connect(
  new StreamableHTTPClientTransport(new URL(fixture.origin + "/api/v1/mcp"), {
    requestInit: {
      headers: { Host: host, Authorization: `Bearer ${fixture.company.token}` },
    },
  }),
);
async function company(name: string, args: Record<string, unknown>) {
  const result: any = await admin.callTool({
    name,
    arguments: { ...args, userId: fixture.userId },
  });
  assert(!result.isError, JSON.stringify(result));
  return result.structuredContent.result;
}
const delegated = await company("doca_tools", {
  purpose: "公司测试平台定时为目标用户写入测试报告，无需用户单独绑定平台。",
});
const report = await company("doca_call", {
  contextId: delegated.contextId,
  requestId: randomUUID(),
  tool: "document_create",
  input: {
    title: "公司平台自动报告",
    format: "markdown",
    markdown:
      "# 自动化报告\n12 项通过，0 项失败。\n由管理员 MCP 服务以目标用户权限写入。",
  },
});
const readback = await company("doca_call", {
  contextId: delegated.contextId,
  requestId: randomUUID(),
  tool: "document_read",
  input: { resourceId: report.id, view: "content" },
});
assert(JSON.stringify(readback).includes("12 项通过"));
await company("doca_context_close", { contextId: delegated.contextId });
await admin.close();
const result = {
  passed: true,
  transport: "official TypeScript SDK over real HTTP",
  canvasViewed: true,
  execution: { contextId: context.contextId, taskId: context.taskId },
  documents,
  file: {
    id: file.id,
    folderId,
    size: bytes.length,
    sha256,
    uploadedAndDownloaded: true,
  },
  delegated: {
    id: report.id,
    targetUserId: fixture.userId,
    url: `${fixture.origin}/#/r/${report.id}`,
  },
  availableTools: context.tools.length,
  skills: skills.map((skill) => skill.id),
};
await writeFile(
  resolve(output, "http-client.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
