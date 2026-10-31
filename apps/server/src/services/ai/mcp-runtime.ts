import { captureAIInputFileSnapshot } from "./ai-input-file-snapshot.js";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { DB, Schema } from "@db/index.js";
import { transact } from "@db/transactions.js";
import { mcpFail as fail } from "./mcp-errors.js";
import { securityAudit } from "@core/modules/identity/accounts.js";
import type { Actor } from "@core/modules/identity/passwords.js";
import { lockAIUser } from "@core/modules/ai/config.js";
import { userUploadLimits } from "@core/modules/ai/upload-policy.js";
import { requireCapability } from "@core/modules/access/operation-policy.js";
import { checkJob, digest, recordExecutionResource } from "@core/modules/ai/execution.js";
import { stableId, type FilesServiceV1 } from "@smartdoca/files-capability";
import type { AIRunner, AIInput } from "./runner.js";
import type { AssistantToolRuntime } from "./external-tools.js";
import {
  activeMcpService,
  allowsMcpSkill,
  allowsMcpTool,
  mcpActor,
  type McpService,
} from "./mcp-access.js";

const uuid = z.string().uuid();
const chunkBytes = 128 * 1024;
const transferSchemas = {
  file_upload_begin: z
    .object({
      filename: z.string().min(1).max(255),
      mime: z.string().max(160).optional(),
      size: z
        .number()
        .int()
        .min(0)
        .max(20 * 1024 * 1024),
      sha256: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .strict(),
  file_upload_chunk: z
    .object({
      uploadId: uuid,
      offset: z.number().int().min(0),
      base64: z.string().max(Math.ceil(chunkBytes / 3) * 4),
    })
    .strict(),
  file_upload_complete: z
    .object({
      uploadId: uuid,
      folderId: uuid.nullable(),
      name: z.string().min(1).max(255),
    })
    .strict(),
  file_upload_abort: z.object({ uploadId: uuid }).strict(),
  file_content: z
    .object({
      fileId: uuid,
      version: z.number().int().positive().optional(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(chunkBytes).default(chunkBytes),
    })
    .strict(),
};
export const mcpTransferTools = Object.entries(transferSchemas).map(
  ([id, schema]) => ({
    id,
    description: (
      {
        file_upload_begin:
          "开始从客户端上传文件（最多20MiB）；返回uploadId，分块传输后complete保存到文件夹。",
        file_upload_chunk:
          "上传连续的base64文件块；每块最多128KiB，offset必须匹配已接收字节。",
        file_upload_complete:
          "完成上传并保存到目标文件夹；folderId:null表示本人的文件根目录。",
        file_upload_abort: "释放尚未保存的上传。",
        file_content:
          "按字节分页下载有权访问的文件，返回base64、完整SHA256、版本和nextOffset；后续块须传相同version，客户端按顺序拼接并核对完整文件哈希。",
      } as Record<string, string>
    )[id]!,
    inputSchema: z.toJSONSchema(schema) as Record<string, unknown>,
  }),
);

function executionJob(actor: Actor, text: string, contextInput: Partial<AIInput> = {}) {
  const now = new Date().toISOString();
  const input: AIInput = {
    text, references: [], scope: "all", skillIds: [], webSearch: true, ...contextInput,
  };
  const job: Schema["ai_jobs"] = {
    id: randomUUID(), session_id: null, user_id: actor.id, model_id: null,
    status: "running", input: JSON.stringify(input), digest: digest(input),
    result: "{}", error: "", lease: randomUUID(),
    lease_until: new Date(Date.now() + 120000).toISOString(),
    attempts: 1, cancelled: 0, created_at: now, updated_at: now,
  };
  return job;
}
type Context = {
  id: string;
  service: McpService;
  actor: Actor;
  job: Schema["ai_jobs"];
  runtime: AssistantToolRuntime;
  controller: AbortController;
  expires: number;
  busy: boolean;
  uploads: Set<string>;
  heartbeat: ReturnType<typeof setInterval>;
};

export function createMcpRuntime(
  db: DB,
  runner: AIRunner,
  files?: FilesServiceV1,
) {
  const contexts = new Map<string, Context>(),
    instanceId = randomUUID();
  const ttl = 15 * 60 * 1000;
  let pendingOpens = 0;
  const pendingByService = new Map<string, number>();
  async function catalog(actor: Actor, service?: McpService) {
    const job = executionJob(actor, "MCP catalog");
    const runtime = await runner.externalTools(
      job,
      new AbortController().signal,
      {
        actor,
        catalogOnly: true,
        allowsTool: (id) => !service || allowsMcpTool(service, id),
        allowsSkill: (id) => !service || allowsMcpSkill(service, id),
        authorize: async () => fail(403, "Catalogs cannot execute tools"),
      },
    );
    return {
      tools: [
        ...runtime.tools,
        ...(files
          ? mcpTransferTools.filter(
              (tool) => !service || allowsMcpTool(service, tool.id),
            )
          : []),
      ],
      skills: runtime.skills,
    };
  }
  async function close(
    context: Context,
    status: "completed" | "interrupted" = "completed",
  ) {
    if (!contexts.has(context.id)) return;
    contexts.delete(context.id);
    context.controller.abort();
    clearInterval(context.heartbeat);
    for (const uploadId of context.uploads)
      await files?.uploads
        .abort(
          { principalId: context.actor.id },
          { uploadId: stableId(uploadId, "file-upload") },
        )
        .catch(() => {});
    await transact(db, async (tx) => {
      await tx
        .updateTable("mcp_contexts")
        .set({ closed_at: new Date().toISOString() })
        .where("id", "=", context.id)
        .execute();
      await tx
        .updateTable("ai_jobs")
        .set({
          status,
          cancelled: status === "interrupted" ? 1 : 0,
          lease: null,
          lease_until: null,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", context.job.id)
        .where("lease", "=", context.job.lease)
        .execute();
      await tx
        .updateTable("mcp_tool_calls")
        .set({ status: "interrupted", updated_at: new Date().toISOString() })
        .where("context_id", "=", context.id)
        .where("status", "=", "running")
        .execute();
    });
  }
  async function open(
    service: McpService,
    actor: Actor,
    purpose: string,
    contextInput: {
      resources?: string[];
      files?: NonNullable<AIInput["files"]>;
      currentResourceId?: string;
      currentFolder?: AIInput["currentFolder"];
    } = {},
  ) {
    for (const context of contexts.values())
      if (context.expires < Date.now()) await close(context, "interrupted");
    if (
      contexts.size >= 128 ||
      [...contexts.values()].filter(
        (context) => context.service.id === service.id,
      ).length >= 16
    )
      fail(429, "Too many active MCP contexts; close an existing context");
    const input: Partial<AIInput> = {
      references: (contextInput.resources ?? []).map((resourceId) => ({
        resourceId,
      })),
      ...(contextInput.files?.length
        ? {
            files: contextInput.files,
            fileInputSnapshot: await captureAIInputFileSnapshot(
              db,
              actor,
              contextInput.files,
            ),
          }
        : {}),
      ...(contextInput.currentResourceId
        ? { currentResourceId: contextInput.currentResourceId }
        : {}),
      ...(contextInput.currentFolder
        ? { currentFolder: contextInput.currentFolder }
        : {}),
    };
    const job = executionJob(actor, purpose, input);
    const id = randomUUID(),
      controller = new AbortController();
    await transact(db, async (tx) => {
      await lockAIUser(tx, actor.id);
      await tx.insertInto("ai_jobs").values(job).execute();
      await tx
        .insertInto("mcp_contexts")
        .values({
          id,
          service_id: service.id,
          user_id: actor.id,
          session_id: null,
          job_id: job.id,
          instance_id: instanceId,
          expires_at: new Date(Date.now() + ttl).toISOString(),
          closed_at: null,
          created_at: job.created_at,
        })
        .execute();
    });
    const context = {
      id,
      service,
      actor,
      job,
      controller,
      expires: Date.now() + ttl,
      busy: false,
      uploads: new Set<string>(),
    } as Context;
    contexts.set(id, context);
    context.heartbeat = setInterval(() => {
      void (async () => {
        if (!context.busy && context.expires < Date.now())
          return close(context, "interrupted");
        const current = await activeMcpService(db, context.service.id);
        if (current.token_hash !== service.token_hash)
          return close(context, "interrupted");
        await mcpActor(
          db,
          current,
          current.kind === "admin" ? actor.id : undefined,
        );
        await db
          .updateTable("ai_jobs")
          .set({ lease_until: new Date(Date.now() + 120000).toISOString() })
          .where("id", "=", job.id)
          .where("lease", "=", job.lease)
          .where("status", "=", "running")
          .execute();
      })().catch(() => void close(context, "interrupted"));
    }, 15000);
    context.heartbeat.unref();
    try {
      context.runtime = await runner.externalTools(job, controller.signal, {
        actor,
        allowsTool: (tool) => allowsMcpTool(context.service, tool),
        allowsSkill: (skill) => allowsMcpSkill(context.service, skill),
        authorize: async (tool) => {
          context.service = await activeMcpService(db, service.id);
          if (context.service.token_hash !== service.token_hash)
            fail(401, "MCP token was rotated");
          Object.assign(
            actor,
            await mcpActor(
              db,
              context.service,
              service.kind === "admin" ? actor.id : undefined,
            ),
          );
          if (!allowsMcpTool(context.service, tool))
            fail(403, "MCP tool is not granted");
        },
      });
      await securityAudit(db, service.owner_id, actor.id, "mcp.context.open", {
        serviceId: service.id,
        contextId: id,
      });
      return {
        contextId: id,
        taskId: job.id,
        expiresAt: new Date(context.expires).toISOString(),
        tools: [
          ...context.runtime.tools,
          ...(files
            ? mcpTransferTools.filter((tool) => allowsMcpTool(service, tool.id))
            : []),
        ].map(({ id, description }) => ({
          id,
          description: description.slice(0, 240),
        })),
        skills: context.runtime.skills.map(
          ({ content: _content, ...skill }) => skill,
        ),
      };
    } catch (error) {
      await close(context, "interrupted");
      throw error;
    }
  }
  function get(service: McpService, actor: Actor, id: string) {
    const context = contexts.get(id);
    if (
      !context ||
      context.expires < Date.now() ||
      context.service.id !== service.id ||
      context.actor.id !== actor.id ||
      context.service.token_hash !== service.token_hash
    )
      fail(
        404,
        "MCP context is unavailable; open a new context on this server",
      );
    return context;
  }
  async function transfer(
    context: Context,
    tool: keyof typeof transferSchemas,
    raw: Record<string, unknown>,
    requestId: string,
  ) {
    if (!files) fail(503, "File storage is unavailable");
    const actor = context.actor,
      request = { principalId: actor.id, signal: context.controller.signal };
    const value = transferSchemas[tool].safeParse(raw);
    if (!value.success) fail(400, value.error.message);
    const input = value.data as any;
    if (tool.startsWith("file_upload"))
      await requireCapability(db, actor.id, "assets.upload");
    if (tool === "file_upload_begin") {
      const max = (await userUploadLimits(db, actor.id)).maxFileBytes;
      if (max && input.size > max)
        fail(413, "File exceeds the configured upload limit");
      if (context.uploads.size >= 4) fail(429, "Too many open uploads");
      const upload = await files.uploads.begin(request, {
        filename: input.filename,
        mime: input.mime,
        size: input.size,
        checksum: input.sha256,
      });
      context.uploads.add(upload.id);
      return { uploadId: upload.id, offset: 0, maxChunkBytes: chunkBytes };
    }
    if (tool === "file_content") {
      const file = await files.files.get(request, {
        fileId: stableId(input.fileId, "file"),
      });
      if (!file) fail(404, "File is unavailable");
      if (
        (input.offset > 0 && input.version === undefined) ||
        (input.version !== undefined && input.version !== file.version)
      )
        fail(409, "Supply the same file version on every subsequent chunk");
      const object = await db
        .selectFrom("file_items as f")
        .innerJoin("file_storage_objects as o", "o.id", "f.storage_object_id")
        .select("o.sha256")
        .where("f.id", "=", file.id)
        .where("f.version", "=", file.version)
        .executeTakeFirst();
      if (!object) fail(409, "File changed during download");
      // resolveDownload enforces the download policy independently of read access.
      await files.content.resolveDownload(request, { fileId: file.id });
      if (input.offset > file.size) fail(416, "Offset exceeds file size");
      const bytes: Buffer[] = [];
      if (input.offset < file.size) {
        const content = await files.content.read!(request, {
          fileId: file.id,
          range: {
            start: input.offset,
            end: Math.min(file.size - 1, input.offset + input.limit - 1),
          },
        });
        if (content.file.version !== file.version)
          fail(409, "File changed during download");
        for await (const part of content.body) bytes.push(Buffer.from(part));
      }
      const body = Buffer.concat(bytes);
      if (body.length > input.limit)
        fail(502, "File provider ignored the byte range");
      return {
        fileId: file.id,
        name: file.name,
        mime: file.mime,
        size: file.size,
        version: file.version,
        sha256: object.sha256,
        offset: input.offset,
        base64: body.toString("base64"),
        chunkSha256: createHash("sha256").update(body).digest("hex"),
        nextOffset:
          input.offset + body.length < file.size
            ? input.offset + body.length
            : null,
      };
    }
    if (!context.uploads.has(input.uploadId))
      fail(404, "Upload does not belong to this MCP context");
    const uploadId = stableId(input.uploadId, "file-upload");
    if (tool === "file_upload_chunk") {
      const body = Buffer.from(input.base64, "base64");
      if (body.length > chunkBytes || body.toString("base64") !== input.base64)
        fail(400, "Invalid canonical base64 chunk");
      const upload = await files.uploads.write(request, {
        uploadId,
        offset: input.offset,
        bytes: body,
      });
      return { uploadId, offset: upload.receivedBytes };
    }
    if (tool === "file_upload_abort") {
      await files.uploads.abort(request, { uploadId });
      context.uploads.delete(uploadId);
      return { aborted: true };
    }
    const upload = await files.uploads.complete(request, { uploadId });
    const file = await files.files.create(request, {
      uploadId,
      contentIdentity: upload.contentIdentity,
      folderId: input.folderId ? stableId(input.folderId, "folder") : null,
      name: input.name,
    });
    await files.uploads.abort(request, { uploadId });
    context.uploads.delete(uploadId);
    await recordExecutionResource(db, actor.id, context.job.id, {
      id: file.id, kind: "file", title: file.name, href: `#/files?focus=${file.id}`,
    });
    return file;
  }
  async function call(
    service: McpService,
    actor: Actor,
    contextId: string,
    tool: string,
    input: Record<string, unknown>,
    requestId: string,
  ) {
    const context = get(service, actor, contextId);
    if (!allowsMcpTool(service, tool)) fail(403, "MCP tool is not granted");
    if (context.busy)
      fail(
        409,
        "This MCP context is busy; wait for its previous call to finish",
      );
    Object.assign(context.actor, actor);
    context.busy = true;
    context.service = service;
    context.expires = Date.now() + ttl;
    const inputHash = digest({ tool, input });
    let claimed = false;
    try {
      await checkJob(db, {
        actor: context.actor,
        jobId: context.job.id,
        lease: context.job.lease!,
      });
      await transact(db, async (tx) => {
        await lockAIUser(tx, actor.id);
        const previous = await tx
          .selectFrom("mcp_tool_calls")
          .selectAll()
          .where("context_id", "=", contextId)
          .where("request_id", "=", requestId)
          .executeTakeFirst();
        if (previous)
          fail(
            409,
            previous.input_hash !== inputHash
              ? "requestId was already used with different parameters"
              : `MCP request already ${previous.status}; inspect the saved document/file before issuing another write`,
          );
        const now = new Date().toISOString();
        await tx
          .insertInto("mcp_tool_calls")
          .values({
            context_id: contextId,
            request_id: requestId,
            tool_id: tool,
            input_hash: inputHash,
            status: "running",
            created_at: now,
            updated_at: now,
          })
          .execute();
        await securityAudit(tx, service.owner_id, actor.id, "mcp.tool.start", {
          serviceId: service.id,
          contextId,
          requestId,
          tool,
        });
      });
      claimed = true;
      const result = Object.hasOwn(transferSchemas, tool)
        ? {
            output: await transfer(
              context,
              tool as keyof typeof transferSchemas,
              input,
              requestId,
            ),
            modelOutput: undefined,
            delivered() {},
            aborted() {},
          }
        : await context.runtime.call(tool, input, requestId);
      try {
        context.controller.signal.throwIfAborted();
        await checkJob(db, { actor: context.actor, jobId: context.job.id, lease: context.job.lease! });
      } catch (error) { result.aborted(); throw error; }
      await db
        .updateTable("mcp_tool_calls")
        .set({ status: "completed", updated_at: new Date().toISOString() })
        .where("context_id", "=", contextId)
        .where("request_id", "=", requestId)
        .execute();
      await securityAudit(
        db,
        service.owner_id,
        actor.id,
        "mcp.tool.completed",
        { serviceId: service.id, contextId, requestId, tool },
      );
      await db
        .updateTable("mcp_contexts")
        .set({ expires_at: new Date(context.expires).toISOString() })
        .where("id", "=", contextId)
        .execute();
      return result;
    } catch (error) {
      if (claimed) {
        await db
          .updateTable("mcp_tool_calls")
          .set({ status: context.controller.signal.aborted ? "interrupted" : "failed", updated_at: new Date().toISOString() })
          .where("context_id", "=", contextId)
          .where("request_id", "=", requestId)
          .where("status", "=", "running")
          .execute();
        await securityAudit(db, service.owner_id, actor.id, context.controller.signal.aborted ? "mcp.tool.interrupted" : "mcp.tool.failed", {
          serviceId: service.id,
          contextId,
          requestId,
          tool,
        });
      }
      if (context.controller.signal.aborted) fail(409, "MCP execution was interrupted");
      throw error;
    } finally {
      context.busy = false;
    }
  }
  return {
    catalog,
    open: async (...args: Parameters<typeof open>) => {
      const serviceId = args[0].id,
        pending = pendingByService.get(serviceId) ?? 0;
      if (
        contexts.size + pendingOpens >= 128 ||
        [...contexts.values()].filter(
          (context) => context.service.id === serviceId,
        ).length +
          pending >=
          16
      )
        fail(429, "Too many active MCP contexts; close an existing context");
      pendingOpens++;
      pendingByService.set(serviceId, pending + 1);
      try {
        return await open(...args);
      } finally {
        pendingOpens--;
        const left = (pendingByService.get(serviceId) ?? 1) - 1;
        if (left) pendingByService.set(serviceId, left);
        else pendingByService.delete(serviceId);
      }
    },
    call,
    describe: (
      service: McpService,
      actor: Actor,
      contextId: string,
      ids: string[],
    ) => {
      const context = get(service, actor, contextId);
      const tools = [
        ...context.runtime.tools,
        ...(files ? mcpTransferTools : []),
      ];
      return ids.map((id) => {
        const tool = tools.find((tool) => tool.id === id);
        if (!tool || !allowsMcpTool(service, id))
          fail(403, "MCP tool is unavailable or not granted");
        return tool;
      });
    },
    closeContext: (service: McpService, actor: Actor, id: string) => {
      const context = get(service, actor, id);
      return close(context, context.busy ? "interrupted" : "completed");
    },
    interruptTask: async (userId: string, jobId: string) => {
      for (const context of contexts.values())
        if (context.actor.id === userId && context.job.id === jobId)
          await close(context, "interrupted");
    },
    invalidate: async (serviceId: string) => {
      for (const context of contexts.values())
        if (context.service.id === serviceId)
          await close(context, "interrupted");
    },
    close: async () => {
      for (const context of contexts.values())
        await close(context, "interrupted");
    },
  };
}
export type McpRuntime = ReturnType<typeof createMcpRuntime>;
