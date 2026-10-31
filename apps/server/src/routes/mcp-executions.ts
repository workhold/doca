import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { DB } from "@db/index.js";
import { transact } from "@db/transactions.js";
import type { Actor } from "@core/modules/identity/passwords.js";
import { lockAIUser } from "@core/modules/ai/config.js";
import { securityAudit } from "@core/modules/identity/accounts.js";
import { authorize } from "@core/modules/access/queries.js";
import { authorizeFileFolder, authorizeFileItem } from "@core/modules/access/file-access.js";
import { mcpFail as fail } from "../services/ai/mcp-errors.js";
import { AppError } from "@core/shared/errors.js";
import type { McpRuntime } from "../services/ai/mcp-runtime.js";

/** Execution history belongs to the effective user, including company-service executions. */
export function registerMcpExecutions(
  api: FastifyInstance, db: DB, auth: (req: FastifyRequest) => Actor, runtime: McpRuntime,
) {
  const base = "/api/v1/me/mcp-executions";
  const query = (tx: DB, userId: string) => tx.selectFrom("mcp_contexts as c")
    .innerJoin("ai_jobs as j", "j.id", "c.job_id")
    .innerJoin("mcp_services as s", "s.id", "c.service_id")
    .select(["j.id", "j.status", "j.input", "j.created_at", "j.updated_at", "c.id as context_id", "c.closed_at", "s.name as service_name"])
    .where("c.user_id", "=", userId).where("j.user_id", "=", userId)
    .where("c.session_id", "is", null).where("j.session_id", "is", null);
  async function owned(tx: DB, userId: string, input: unknown) {
    const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
    if (!parsed.success) fail(400, "Invalid execution ID");
    const task = await query(tx, userId).where("j.id", "=", parsed.data.id).executeTakeFirst();
    if (!task) fail(404, "MCP execution is unavailable");
    return task;
  }
  const summary = ({ input, ...task }: Awaited<ReturnType<typeof owned>>) => {
    const { text } = z.object({ text: z.string() }).parse(JSON.parse(input));
    return { ...task, purpose: text.slice(0, 160) };
  };
  api.get(base, async req => (await query(db, auth(req).id)
    .orderBy("j.created_at", "desc").limit(200).execute()).map(summary));
  api.get(`${base}/:id`, async req => {
    const actor = auth(req), task = await owned(db, actor.id, req.params);
    const resources = [];
    for (const resource of await db.selectFrom("ai_task_resources").selectAll().where("job_id", "=", task.id).execute()) {
      try {
        if (resource.kind === "file") await authorizeFileItem(db, actor, resource.resource_id);
        else if (resource.kind === "folder") await authorizeFileFolder(db, actor, resource.resource_id, 1);
        else await authorize(db, actor, resource.resource_id, 1);
        resources.push(resource);
      } catch (error) {
        // A history record never grants access after revocation; operational failures remain visible.
        if (!(error instanceof AppError) || ![403, 404].includes(error.status)) throw error;
      }
    }
    const calls = await db.selectFrom("mcp_tool_calls")
      .select(["request_id", "tool_id", "status", "created_at", "updated_at"])
      .where("context_id", "=", task.context_id).orderBy("created_at").execute();
    return { ...summary(task), resources, calls };
  });
  api.post(`${base}/:id/cancel`, async req => {
    const actor = auth(req), task = await owned(db, actor.id, req.params);
    await runtime.interruptTask(actor.id, task.id);
    await transact(db, async tx => {
      await lockAIUser(tx, actor.id);
      await owned(tx, actor.id, req.params);
      const now = new Date().toISOString();
      await tx.updateTable("ai_jobs").set({ status: "interrupted", cancelled: 1, lease: null, lease_until: null, updated_at: now })
        .where("id", "=", task.id).where("status", "in", ["queued", "running", "awaiting_approval"]).execute();
      await tx.updateTable("mcp_contexts").set({ closed_at: now }).where("id", "=", task.context_id).execute();
      await tx.updateTable("mcp_tool_calls").set({ status: "interrupted", updated_at: now })
        .where("context_id", "=", task.context_id).where("status", "=", "running").execute();
      await securityAudit(tx, actor.id, actor.id, "mcp.execution.cancel", { taskId: task.id, contextId: task.context_id });
    });
    return { ok: true };
  });
  api.delete(`${base}/:id`, async req => {
    const actor = auth(req);
    await transact(db, async tx => {
      await lockAIUser(tx, actor.id);
      const task = await owned(tx, actor.id, req.params);
      if (!task.closed_at || ["queued", "running", "awaiting_approval"].includes(task.status))
        fail(409, "Stop the MCP execution before removing its history");
      await tx.deleteFrom("mcp_tool_calls").where("context_id", "=", task.context_id).execute();
      await tx.deleteFrom("mcp_contexts").where("id", "=", task.context_id).execute();
      await tx.deleteFrom("ai_jobs").where("id", "=", task.id).execute();
      await securityAudit(tx, actor.id, actor.id, "mcp.execution.delete", { taskId: task.id });
    });
    return { ok: true };
  });
}
