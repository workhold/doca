import { afterEach, beforeEach, expect, it } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openTestDatabase } from "./database.js";
import { createUser, type Actor } from "@core/modules/identity/passwords.js";
import { createContent } from "@core/workflows/resources.js";
import { readAIDocument } from "@core/workflows/ai-documents.js";
import { storageRuntime } from "@server/adapters/storage.js";
import { createApp } from "@server/app/create-app.js";
import type { DB } from "@db/index.js";
import { aiDefaults, saveAIConfig } from "@core/modules/ai/config.js";
import sharp from "sharp";

let db: DB,
  app: Awaited<ReturnType<typeof createApp>>,
  root: string,
  owner: Actor,
  other: Actor,
  cookie: string;
let imageFetch: typeof fetch;
const origin = "http://localhost:39471",
  password = "isolated-mcp-password";
const all = {
  name: "Codex reports",
  enabled: true,
  grantMode: "all",
  toolIds: [],
  skillIds: [],
  expiresAt: null,
};
const request = (method: any, path: string, payload?: any, session = cookie) =>
  app.inject({
    method,
    url: "/api/v1" + path,
    headers: { host: "localhost:39471", origin, cookie: session },
    payload,
  });
async function service(
  kind: "personal" | "admin" = "personal",
  settings: Record<string, unknown> = {},
) {
  const response = await request(
    "POST",
    kind === "personal" ? "/me/mcp-services" : "/admin/mcp-services",
    { ...all, ...settings },
  );
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
}
async function rpc(
  token: string,
  name: string,
  args: Record<string, unknown> = {},
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/mcp",
    headers: {
      host: "localhost:39471",
      authorization: `Bearer ${token}`,
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
    },
    payload: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    },
  });
  expect(response.statusCode, response.body).toBe(200);
  const result = response.json().result;
  return result.isError
    ? { error: JSON.parse(result.content[0].text) }
    : result.structuredContent.result;
}
const call = (
  token: string,
  contextId: string,
  tool: string,
  input: Record<string, unknown>,
  userId?: string,
  requestId = randomUUID(),
) =>
  rpc(token, "doca_call", {
    contextId,
    requestId,
    tool,
    input,
    ...(userId ? { userId } : {}),
  });
beforeEach(async () => {
  imageFetch = async () => {
    throw new Error("Unexpected image provider request");
  };
  root = await mkdtemp(join(tmpdir(), "doca-mcp-test-"));
  db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
  owner = {
    ...(await createUser(
      db,
      { login: "owner", displayName: "Owner", password },
      { bootstrap: true },
    )),
    admin: 1,
  };
  other = {
    ...(await createUser(
      db,
      { login: "other", displayName: "Other", password },
      { actor: owner },
    )),
    admin: 0,
  };
  app = await createApp(db, {
    origin,
    storage: { ...storageRuntime(), root: join(root, "objects") },
    ai: {
      memory: { driver: "sqlite", url: ":memory:" },
      imageFetch: (...args) => imageFetch(...args),
    },
  });
  const login = await request(
    "POST",
    "/auth/login",
    { login: "owner", password },
    "",
  );
  cookie = String(login.headers["set-cookie"]).split(";")[0]!;
  expect(
    (await request("PUT", "/me/mcp", { enabled: true, revision: 0 }))
      .statusCode,
  ).toBe(200);
});
afterEach(async () => {
  await app?.close();
  await db?.destroy();
  if (root) await rm(root, { recursive: true, force: true });
});

it("shares native assistant tools and edits all five formats without a Doca language model", async () => {
  const key = await service();
  const opened = await rpc(key.token, "doca_tools", {
    purpose: "MCP report demo",
  });
  expect(opened.error).toBeUndefined();
  expect(opened.sessionId).toBeUndefined();
  expect(opened.taskId).toBeTruthy();
  expect(await db.selectFrom("ai_sessions").selectAll().execute()).toEqual([]);
  expect(await db.selectFrom("ai_session_events").selectAll().execute()).toEqual([]);
  const task = await db.selectFrom("ai_jobs").selectAll().where("id", "=", opened.taskId).executeTakeFirstOrThrow();
  expect(task.session_id).toBeNull();
  expect(task.model_id).toBeNull();

  expect(opened.tools.map((tool: any) => tool.id)).toEqual(
    expect.arrayContaining([
      "document_create",
      "document_read",
      "rich_text_edit",
      "markdown_edit",
      "canvas_edit",
      "presentation_edit",
      "spreadsheet_edit",
      "file_upload_begin",
      "file_content",
    ]),
  );
  expect(
    (await rpc(key.token, "doca_load_skill", { id: "canvas" })).content,
  ).toContain("画板");
  for (const format of [
    "markdown",
    "rich_text",
    "canvas",
    "presentation",
    "spreadsheet",
  ] as const) {
    const created = await call(key.token, opened.contextId, "document_create", {
      title: `MCP ${format}`,
      format,
      ...(format === "markdown" ? { markdown: "# 测试报告\n全部通过" } : {}),
    });
    expect(created.error, JSON.stringify(created)).toBeUndefined();
    expect(created.id).toBeTruthy();
    const before = await readAIDocument(db, { actor: owner }, created.id);
    const native = before.value as any;
    const operations =
      format === "markdown" || format === "rich_text"
        ? [{ type: "append", text: "MCP 已写入报告" }]
        : format === "canvas"
          ? [
              {
                type: "add",
                element: {
                  id: "mcp-title",
                  tag: "Text",
                  text: "测试报告画板",
                  x: 40,
                  y: 40,
                  width: 500,
                  height: 80,
                  fontSize: 32,
                },
              },
            ]
          : format === "presentation"
            ? [
                {
                  type: "insert",
                  slideId: native.slideOrder[0],
                  element: {
                    id: "mcp-title",
                    type: "text",
                    paragraphs: [
                      {
                        type: "paragraph",
                        children: [{ text: "测试报告演示" }],
                      },
                    ],
                    transform: {
                      x: 762000,
                      y: 571500,
                      width: 6096000,
                      height: 762000,
                      rotation: 0,
                    },
                  },
                },
              ]
            : [
                {
                  type: "setCells",
                  sheetId: native.sheetOrder[0],
                  cells: {
                    0: { 0: { v: "通过" }, 1: { v: 12 }, 2: { f: "=B1*2" } },
                  },
                },
              ];
    const result = await call(key.token, opened.contextId, `${format}_edit`, {
      resourceId: created.id,
      seq: before.seq,
      epochId: before.epochId,
      operations,
    });
    expect(result.error, JSON.stringify(result)).toBeUndefined();
    expect(result.saved, JSON.stringify(result)).toBe(true);
    const read = await call(key.token, opened.contextId, "document_read", {
      resourceId: created.id,
      view: "content",
    });
    expect(read.error).toBeUndefined();
    expect(JSON.stringify(read)).toContain(
      format === "canvas"
        ? "测试报告画板"
        : format === "presentation"
          ? "测试报告演示"
          : format === "spreadsheet"
            ? "=B1*2"
            : "MCP 已写入报告",
    );
  }
  expect(
    await rpc(key.token, "doca_context_close", { contextId: opened.contextId }),
  ).toEqual({ closed: true });
}, 60000);

it("requires explicit admin targets and enforces their ACL rather than the creator's", async () => {
  const key = await service("admin");
  expect(
    (await rpc(key.token, "doca_tools", { purpose: "missing target" })).error
      .status,
  ).toBe(400);
  const context = await rpc(key.token, "doca_tools", {
    purpose: "company report",
    userId: other.id,
  });
  expect(context.error).toBeUndefined();
  const created = await call(
    key.token,
    context.contextId,
    "document_create",
    { title: "用户报告", format: "markdown", markdown: "自动报告" },
    other.id,
  );
  expect(created.error).toBeUndefined();
  expect(
    (
      await db
        .selectFrom("resources")
        .select("owner_id")
        .where("id", "=", created.id)
        .executeTakeFirstOrThrow()
    ).owner_id,
  ).toBe(other.id);
  const privateDoc = await createContent(db).create(owner, {
    kind: "document",
    format: "markdown",
    title: "Owner private",
    markdown: "PRIVATE_ADMIN_DATA",
  });
  const denied = await call(
    key.token,
    context.contextId,
    "document_read",
    { resourceId: privateDoc.id },
    other.id,
  );
  expect(JSON.stringify(denied)).not.toContain("PRIVATE_ADMIN_DATA");
  expect(denied.exists === false || !!denied.error).toBe(true);
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "document_read",
        { resourceId: created.id },
        owner.id,
      )
    ).error.status,
  ).toBe(404);
  expect(
    (
      await db
        .selectFrom("security_audit")
        .selectAll()
        .where("action", "=", "mcp.tool.completed")
        .execute()
    ).some((row) => row.actor_id === owner.id && row.user_id === other.id),
  ).toBe(true);
});

it("filters grants and skills, rejects identity spoofing and repeated request IDs, and revokes immediately", async () => {
  const key = await service("personal", {
    grantMode: "selected",
    toolIds: ["document_read", "load_skill"],
    skillIds: ["writing"],
  });
  const context = await rpc(key.token, "doca_tools", {
    purpose: "limited read",
  });
  expect(context.tools.map((tool: any) => tool.id).sort()).toEqual([
    "document_read",
    "load_skill",
  ]);
  expect(
    (await rpc(key.token, "doca_tools", { purpose: "spoof", userId: other.id }))
      .error.status,
  ).toBe(400);
  expect(
    (
      await call(key.token, context.contextId, "document_create", {
        title: "denied",
      })
    ).error.status,
  ).toBe(403);
  expect(
    (await rpc(key.token, "doca_load_skill", { id: "canvas" })).error.status,
  ).toBe(403);
  expect(
    (await call(key.token, context.contextId, "load_skill", { id: "canvas" }))
      .error,
  ).toBeTruthy();
  const requestId = randomUUID();
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "load_skill",
        { id: "writing" },
        undefined,
        requestId,
      )
    ).id,
  ).toBe("writing");
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "load_skill",
        { id: "writing" },
        undefined,
        requestId,
      )
    ).error.status,
  ).toBe(409);
  const revoked = await request(
    "POST",
    `/me/mcp-services/${key.service.id}/revoke`,
    { revision: 1 },
  );
  expect(revoked.statusCode, revoked.body).toBe(200);
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/mcp",
    headers: {
      host: "localhost:39471",
      authorization: `Bearer ${key.token}`,
      accept: "application/json, text/event-stream",
    },
    payload: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
  expect(response.statusCode).toBe(401);
});

it("uploads and downloads real binary file chunks without cookies and verifies byte identity", async () => {
  const key = await service(),
    context = await rpc(key.token, "doca_tools", { purpose: "file transfer" });
  const bytes = Buffer.from("MCP 报告附件\n".repeat(12000));
  const uploaded = await call(
    key.token,
    context.contextId,
    "file_upload_begin",
    {
      filename: "report.txt",
      mime: "text/plain",
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  );
  expect(uploaded.error).toBeUndefined();
  for (
    let offset = 0;
    offset < bytes.length;
    offset += uploaded.maxChunkBytes
  ) {
    const result = await call(
      key.token,
      context.contextId,
      "file_upload_chunk",
      {
        uploadId: uploaded.uploadId,
        offset,
        base64: bytes
          .subarray(offset, offset + uploaded.maxChunkBytes)
          .toString("base64"),
      },
    );
    expect(result.error, JSON.stringify(result)).toBeUndefined();
  }
  const file = await call(
    key.token,
    context.contextId,
    "file_upload_complete",
    { uploadId: uploaded.uploadId, folderId: null, name: "report.txt" },
  );
  expect(file.error, JSON.stringify(file)).toBeUndefined();
  const taskHistory = (await request("GET", `/me/mcp-executions/${context.taskId}`)).json();
  expect(taskHistory.resources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "file", resource_id: file.id })]));
  const chunks: Buffer[] = [];
  let offset: number | null = 0,
    version: number | undefined;
  while (offset !== null) {
    const content = await call(key.token, context.contextId, "file_content", {
      fileId: file.id,
      offset,
      ...(version ? { version } : {}),
    });
    expect(content.error, JSON.stringify(content)).toBeUndefined();
    const chunk = Buffer.from(content.base64, "base64");
    expect(createHash("sha256").update(chunk).digest("hex")).toBe(
      content.chunkSha256,
    );
    chunks.push(chunk);
    offset = content.nextOffset;
    version = content.version;
  }
  expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
});

it("rotates credentials, preserves stored hashes, rejects expired tokens and disables all personal services", async () => {
  const key = await service(),
    second = await service();
  const stored = await db
    .selectFrom("mcp_services")
    .selectAll()
    .where("id", "=", key.service.id)
    .executeTakeFirstOrThrow();
  expect(stored.token_hash).toBe(
    createHash("sha256").update(key.token).digest("hex"),
  );
  expect(
    JSON.stringify((await request("GET", "/me/mcp-services")).json()),
  ).not.toContain(key.token);
  expect(
    JSON.stringify((await request("GET", "/me/mcp-services")).json()),
  ).not.toContain(stored.token_hash);
  const rotation = await request(
    "POST",
    `/me/mcp-services/${key.service.id}/rotate`,
    { revision: 1 },
  );
  expect(rotation.statusCode, rotation.body).toBe(200);
  const token = rotation.json().token;
  const authorized = (value: string) =>
    app.inject({
      method: "GET",
      url: "/api/v1/mcp",
      headers: { host: "localhost:39471", authorization: `Bearer ${value}` },
    });
  expect((await authorized(key.token)).statusCode).toBe(401);
  expect((await authorized(token)).statusCode).toBe(405);
  expect(
    (
      await request("POST", `/me/mcp-services/${key.service.id}/rotate`, {
        revision: 1,
      })
    ).statusCode,
  ).toBe(409);
  await db
    .updateTable("mcp_services")
    .set({ expires_at: "2000-01-01T00:00:00.000Z" })
    .where("id", "=", key.service.id)
    .execute();
  expect((await authorized(token)).statusCode).toBe(401);
  expect(
    (await request("PUT", "/me/mcp", { enabled: false, revision: 1 }))
      .statusCode,
  ).toBe(200);
  expect((await authorized(second.token)).statusCode).toBe(401);
});

it("validates Origin, protocol negotiation and management ownership and rejects all retired credentials", async () => {
  const key = await service();
  const headers = {
    host: "localhost:39471",
    authorization: `Bearer ${key.token}`,
    accept: "application/json, text/event-stream",
  };
  const initialize = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    },
  };
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/mcp",
        headers,
        payload: initialize,
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/mcp",
        headers: { ...headers, origin: "https://foreign.invalid" },
        payload: initialize,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/mcp",
        headers,
        payload: {
          ...initialize,
          params: { ...initialize.params, protocolVersion: "1900-01-01" },
        },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/mcp",
        headers,
        payload: { jsonrpc: "2.0", id: 1, method: "tools/list" },
      })
    ).statusCode,
  ).toBe(400);
  expect((await request("GET", "/ai/mcp-keys")).statusCode).toBe(404);
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/mcp",
        headers: {
          ...headers,
          origin,
          authorization: "Bearer doca_mcp_" + "a".repeat(64),
        },
        payload: initialize,
      })
    ).statusCode,
  ).toBe(401);
  const login = await request(
    "POST",
    "/auth/login",
    { login: "other", password },
    "",
  );
  const otherCookie = String(login.headers["set-cookie"]).split(";")[0]!;
  expect(
    (await request("GET", "/admin/mcp-services", undefined, otherCookie))
      .statusCode,
  ).toBe(403);
  expect(
    (
      await request(
        "POST",
        `/me/mcp-services/${key.service.id}/revoke`,
        { revision: 1 },
        otherCookie,
      )
    ).statusCode,
  ).toBe(404);
});

it("rechecks live ACLs, SKILL enablement, service grants and target account status", async () => {
  const key = await service("admin"),
    context = await rpc(key.token, "doca_tools", {
      purpose: "revocation",
      userId: other.id,
    });
  const created = await call(
    key.token,
    context.contextId,
    "document_create",
    { format: "markdown", title: "Revoked", markdown: "NO_LONGER_VISIBLE" },
    other.id,
  );
  await db
    .updateTable("resources")
    .set({ deleted_at: new Date().toISOString() })
    .where("id", "=", created.id)
    .execute();
  const read = await call(
    key.token,
    context.contextId,
    "document_read",
    { resourceId: created.id },
    other.id,
  );
  expect(read.exists).toBe(false);
  const skillId = randomUUID(),
    now = new Date().toISOString();
  await db
    .insertInto("ai_skills")
    .values({
      id: skillId,
      user_id: other.id,
      name: "Private",
      description: "Private",
      content: "PRIVATE_SKILL",
      formats: "[]",
      enabled: 1,
      revision: 1,
      updated_at: now,
    })
    .execute();
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "load_skill",
        { id: skillId },
        other.id,
      )
    ).instructions,
  ).toBe("PRIVATE_SKILL");
  await db
    .updateTable("ai_skills")
    .set({ enabled: 0 })
    .where("id", "=", skillId)
    .execute();
  expect(
    JSON.stringify(
      await call(
        key.token,
        context.contextId,
        "load_skill",
        { id: skillId },
        other.id,
      ),
    ),
  ).not.toContain("PRIVATE_SKILL");
  await db
    .updateTable("mcp_services")
    .set({
      grant_mode: "selected",
      tool_ids: '["document_read"]',
      skill_ids: "[]",
    })
    .where("id", "=", key.service.id)
    .execute();
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "document_create",
        { title: "denied" },
        other.id,
      )
    ).error.status,
  ).toBe(403);
  await db
    .updateTable("users")
    .set({ status: "disabled" })
    .where("id", "=", other.id)
    .execute();
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "document_read",
        { resourceId: created.id },
        other.id,
      )
    ).error.status,
  ).toBe(403);
});

it("manages standalone MCP executions without creating conversations or deleting saved documents and audit facts", async () => {
  const key = await service(),
    context = await rpc(key.token, "doca_tools", {
      purpose: "Retain the report when deleting its closed execution session",
    });
  const created = await call(key.token, context.contextId, "document_create", {
    format: "markdown",
    title: "Retained after session deletion",
    markdown: "RETAIN_SAVED_REPORT",
  });
  expect(created.id).toBeTruthy();
  expect((await request("GET", "/ai/sessions")).json()).toEqual([]);
  const history = await request("GET", `/me/mcp-executions/${context.taskId}`);
  expect(history.statusCode, history.body).toBe(200);
  expect(history.json().calls).toHaveLength(1);
  expect(history.json().resources).toEqual(expect.arrayContaining([expect.objectContaining({ resource_id: created.id })]));
  expect(
    (await request("DELETE", `/me/mcp-executions/${context.taskId}`)).statusCode,
  ).toBe(409);
  await rpc(key.token, "doca_context_close", { contextId: context.contextId });
  const deleted = await request("DELETE", `/me/mcp-executions/${context.taskId}`);
  expect(deleted.statusCode, deleted.body).toBe(200);
  expect(
    await db
      .selectFrom("mcp_contexts")
      .selectAll()
      .where("id", "=", context.contextId)
      .execute(),
  ).toEqual([]);
  expect(
    await db
      .selectFrom("mcp_tool_calls")
      .selectAll()
      .where("context_id", "=", context.contextId)
      .execute(),
  ).toEqual([]);
  expect(
    await db
      .selectFrom("ai_sessions")
      .selectAll()
      .where("id", "=", context.taskId)
      .execute(),
  ).toEqual([]);
  const saved = await readAIDocument(db, { actor: owner }, created.id);
  expect(JSON.stringify(saved)).toContain("RETAIN_SAVED_REPORT");
  expect(
    (
      await db
        .selectFrom("security_audit")
        .selectAll()
        .where("action", "=", "mcp.tool.completed")
        .execute()
    ).length,
  ).toBeGreaterThan(0);
});

it("executes an image request from its formal MCP task and exposes schemas without provider credentials", async () => {
  await saveAIConfig(
    db,
    {
      ...aiDefaults,
      imageModel: "image",
      webSearch: {
        provider: "searxng",
        baseUrl: "https://search.example.test",
        apiKey: null,
      },
      vendors: [
        {
          id: "image-vendor",
          name: "Image fixture",
          provider: "openai",
          baseUrl: "https://images.example.test/v1",
          apiKey: "NO_PROVIDER_SECRET_IN_MCP",
          enabled: true,
        },
      ],
      models: [
        {
          id: "image",
          vendorId: "image-vendor",
          model: "gpt-image-test",
          alias: "Image",
          enabled: true,
          tools: false,
          maxInput: 32000,
          maxOutput: 1000,
          imageGeneration: true,
          imageProfile: "gpt-image-2",
          imageRate: 250,
        },
      ],
    },
    0,
  );
  const key = await service(),
    context = await rpc(key.token, "doca_tools", {
      purpose: "生成一张测试图片，并检查工具目录",
    });
  expect(context.error, JSON.stringify(context)).toBeUndefined();
  expect(context.tools.map((tool: any) => tool.id)).toEqual(
    expect.arrayContaining([
      "image_generate",
      "image_reference_generate",
      "image_edit",
      "image_view",
      "http_request",
      "web_fetch",
      "web_search",
      "knowledge_book",
      "secret_write",
      "note_write",
    ]),
  );
  const described = await rpc(key.token, "doca_describe_tools", {
    contextId: context.contextId,
    tools: ["image_generate", "image_edit"],
  });
  expect(described[0].inputSchema).toBeTruthy();
  expect(JSON.stringify(described)).not.toContain("NO_PROVIDER_SECRET_IN_MCP");
  let calls = 0;
  imageFetch = async () => {
    calls++;
    return Response.json({
      data: [
        {
          b64_json: (
            await sharp({
              create: {
                width: 1024,
                height: 1024,
                channels: 3,
                background: "#248a66",
              },
            })
              .png()
              .toBuffer()
          ).toString("base64"),
        },
      ],
      usage: { input_tokens: 12, output_tokens: 30 },
    });
  };
  const requestId = randomUUID();
  const image = await call(
    key.token,
    context.contextId,
    "image_generate",
    { prompt: "生成一张测试图片", size: "1024x1024" },
    undefined,
    requestId,
  );
  expect(image.error, JSON.stringify(image)).toBeUndefined();
  expect(image.state).toBe("saved");
  expect(image.assetId).toBeTruthy();
  expect(image.rawCandidate).toBeTruthy();
  expect(
    (
      await call(
        key.token,
        context.contextId,
        "image_generate",
        { prompt: "生成一张测试图片", size: "1024x1024" },
        undefined,
        requestId,
      )
    ).error,
  ).toBeDefined();
  expect(calls).toBe(1);
  const file = await db.selectFrom("file_items").selectAll()
    .where("storage_object_id", "=", image.assetId).executeTakeFirstOrThrow();
  expect(JSON.parse(file.metadata)).toMatchObject({ aiTaskId: context.taskId });
  expect(JSON.parse(file.metadata)).not.toHaveProperty("aiSessionFolder");
  const separate = await rpc(key.token, "doca_tools", { purpose: "Independent tool execution" });
  const denied = await call(key.token, separate.contextId, "image_view", { referenceImageIds: [image.assetId] });
  expect(denied.error).toBeDefined();
  expect(calls).toBe(1);
  expect(await db.selectFrom("ai_calls").select("id").execute()).toHaveLength(
    1,
  );
  const canceledContext = await rpc(key.token, "doca_tools", { purpose: "Cancel an in-flight standalone image task" });
  const provider = imageFetch;
  let started!: () => void, release!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  imageFetch = async (...args) => { started(); await gate; return provider(...args); };
  const canceledRequestId = randomUUID();
  const pending = call(key.token, canceledContext.contextId, "image_generate", { prompt: "Generate a cancellable fixture", size: "1024x1024" }, undefined, canceledRequestId);
  await began;
  expect((await request("POST", `/me/mcp-executions/${canceledContext.taskId}/cancel`, {})).statusCode).toBe(200);
  release();
  expect((await pending).error.status).toBe(409);
  const canceledCall = await db.selectFrom("mcp_tool_calls").select("status").where("request_id", "=", canceledRequestId).executeTakeFirstOrThrow();
  expect(canceledCall.status).toBe("interrupted");
  const usage = await db.selectFrom("ai_calls").selectAll().where("job_id", "=", canceledContext.taskId).executeTakeFirstOrThrow();
  expect(usage.state).toBe("confirmed");
  expect(await db.selectFrom("file_items").select("id").execute()).toHaveLength(1);
});

it("isolates execution ownership, cancels its lease and preserves existing ordinary conversations", async () => {
  const chat = (await request("POST", "/ai/sessions", { title: "Ordinary conversation" })).json();
  const key = await service(), context = await rpc(key.token, "doca_tools", { purpose: "Cancelable task" });
  expect((await request("GET", "/ai/sessions")).json().map((row: any) => row.id)).toEqual([chat.id]);
  const otherLogin = await request("POST", "/auth/login", { login: "other", password }, "");
  const otherCookie = String(otherLogin.headers["set-cookie"]).split(";")[0]!;
  for (const method of ["GET", "DELETE"] as const)
    expect((await request(method, `/me/mcp-executions/${context.taskId}`, undefined, otherCookie)).statusCode).toBe(404);
  expect((await request("POST", `/me/mcp-executions/${context.taskId}/cancel`, {}, otherCookie)).statusCode).toBe(404);
  expect((await request("POST", `/me/mcp-executions/${context.taskId}/cancel`, {})).statusCode).toBe(200);
  const task = await db.selectFrom("ai_jobs").selectAll().where("id", "=", context.taskId).executeTakeFirstOrThrow();
  expect(task).toMatchObject({ status: "interrupted", cancelled: 1, lease: null, session_id: null, model_id: null });
  expect((await call(key.token, context.contextId, "document_exists", { resourceId: randomUUID() })).error).toBeDefined();
  expect((await request("DELETE", `/me/mcp-executions/${context.taskId}`)).statusCode).toBe(200);
  expect((await request("GET", `/ai/sessions/${chat.id}`)).statusCode).toBe(200);
});

it("excludes retained historical MCP conversations without converting or deleting their records", async () => {
  const key = await service(), context = await rpc(key.token, "doca_tools", { purpose: "Separate new task" });
  await rpc(key.token, "doca_context_close", { contextId: context.contextId });
  const chat = (await request("POST", "/ai/sessions", { title: "Historical MCP execution" })).json();
  await db.updateTable("mcp_contexts").set({ session_id: chat.id }).where("id", "=", context.contextId).execute();
  await db.updateTable("ai_jobs").set({ session_id: chat.id, model_id: "mcp-client" }).where("id", "=", context.taskId).execute();
  const before = await db.selectFrom("ai_sessions").selectAll().execute();
  expect((await request("GET", "/ai/sessions")).json()).toEqual([]);
  expect((await request("GET", `/ai/sessions/${chat.id}`)).statusCode).toBe(404);
  expect((await request("POST", `/ai/sessions/${chat.id}/messages`, {})).statusCode).toBe(404);
  expect((await request("GET", "/me/mcp-executions")).json()).toEqual([]);
  expect(await db.selectFrom("ai_sessions").selectAll().execute()).toEqual(before);
});
