import type { DB, Schema } from "@db/index.js";
import { createHash } from "node:crypto";
import { fail } from "../../shared/errors.js";
import { browserAssistantBoundary, resourceScope } from "../browser-clipper/access.js";
import { recordSessionResource } from "./session-resources.js";
import type { Actor } from "../identity/passwords.js";

export type ExecutionJob = Schema["ai_jobs"];
export type ConversationJob = ExecutionJob & { session_id: string; model_id: string };
export type ExecutionContext = { actor: Actor; jobId?: string; lease?: string };
export const digest = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex");

export function requireConversationJob(job: ExecutionJob): asserts job is ConversationJob {
  if (!job.session_id || !job.model_id) fail(409, "Conversation execution requires a conversation and model");
}

/** The authenticated task is the ownership boundary. Conversation membership is optional. */
export async function ownedExecution(db: DB, userId: string, jobId: string) {
  const job = await db.selectFrom("ai_jobs as j")
    .innerJoin("users as u", "u.id", "j.user_id")
    .selectAll("j")
    .where("j.id", "=", jobId).where("j.user_id", "=", userId)
    .where("u.status", "=", "active").executeTakeFirst();
  if (!job) fail(404, "Execution is unavailable");
  if (job.session_id) {
    const conversation = await db.selectFrom("ai_sessions").select("id")
      .where("id", "=", job.session_id).where("user_id", "=", userId).executeTakeFirst();
    if (!conversation) fail(404, "Execution conversation is unavailable");
    await browserAssistantBoundary(db, job.session_id, job.id);
  }
  return job;
}

/** Shared lease/cancellation fence for chat, MCP and the document/file workflows they invoke. */
export async function checkJob(db: DB, ctx: ExecutionContext) {
  if (!ctx.jobId) return;
  const job = await db.selectFrom("ai_jobs as j").innerJoin("users as u", "u.id", "j.user_id")
    .selectAll("j").where("j.id", "=", ctx.jobId).where("j.user_id", "=", ctx.actor.id)
    .where("u.status", "=", "active").executeTakeFirst();
  if (!job || job.cancelled || job.status !== "running" || job.lease !== ctx.lease ||
      !job.lease_until || job.lease_until < new Date().toISOString())
    fail(409, "任务执行权已失效");
  if (job.session_id) await browserAssistantBoundary(db, job.session_id, job.id);
}

/** Standalone executions can only observe their own receipts, never every NULL-session task. */
export async function executionJobIds(db: DB, userId: string, jobId: string) {
  const job = await ownedExecution(db, userId, jobId);
  if (!job.session_id) return [job.id];
  const browser = await browserAssistantBoundary(db, job.session_id, job.id);
  const allowed = browser ? resourceScope.parse(JSON.parse(browser.binding.job_ids)).ids : undefined;
  return (await db.selectFrom("ai_jobs").select("id")
    .where("user_id", "=", userId).where("session_id", "=", job.session_id)
    .where("created_at", "<=", job.created_at)
    .$if(allowed !== undefined, query => query.where("id", "in", allowed!))
    .execute()).map(row => row.id);
}

export async function recordExecutionResource(
  db: DB, userId: string, jobId: string,
  resource: { id: string; kind: string; title: string; href: string },
) {
  const job = await ownedExecution(db, userId, jobId);
  const row = {
    job_id: job.id, kind: resource.kind, resource_id: resource.id,
    title: resource.title, href: resource.href, touched_at: new Date().toISOString(),
  };
  await db.insertInto("ai_task_resources").values(row)
    .onConflict(oc => oc.columns(["job_id", "kind", "resource_id"])
      .doUpdateSet({ title: row.title, href: row.href, touched_at: row.touched_at })).execute();
  // Conversation history is a projection owned by the chat entry point.
  if (job.session_id) await recordSessionResource(db, userId, job.session_id, resource);
}
