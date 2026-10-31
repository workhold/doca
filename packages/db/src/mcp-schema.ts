import { sql, type Kysely } from "kysely";

export const mcpTables = [
  "mcp_user_settings",
  "mcp_services",
  "mcp_contexts",
  "mcp_tool_calls",
] as const;

export async function createMcpStructure(db: Kysely<any>) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "mcp_user_settings" ("user_id" text primary key references "users" ("id"), "enabled" integer not null, "revision" integer not null, "updated_at" text not null, constraint "mcp_user_enabled" check (enabled in (0,1)));`,
    `CREATE TABLE IF NOT EXISTS "mcp_services" ("id" text primary key, "kind" text not null, "owner_id" text not null references "users" ("id"), "name" text not null, "token_hash" text not null unique, "token_hint" text not null, "enabled" integer not null, "grant_mode" text not null, "tool_ids" text not null, "skill_ids" text not null, "expires_at" text, "revoked_at" text, "revision" integer not null, "created_at" text not null, "updated_at" text not null, constraint "mcp_service_kind" check (kind in ('personal','admin')), constraint "mcp_service_enabled" check (enabled in (0,1)), constraint "mcp_service_grant" check (grant_mode in ('all','selected')));`,
    `CREATE INDEX "mcp_services_owner" on "mcp_services" ("owner_id", "kind");`,
    `CREATE TABLE IF NOT EXISTS "mcp_contexts" ("id" text primary key, "service_id" text not null references "mcp_services" ("id"), "user_id" text not null references "users" ("id"), "session_id" text references "ai_sessions" ("id"), "job_id" text not null references "ai_jobs" ("id"), "instance_id" text not null, "expires_at" text not null, "closed_at" text, "created_at" text not null);`,
    `CREATE INDEX "mcp_contexts_service" on "mcp_contexts" ("service_id", "user_id");`,
    `CREATE TABLE IF NOT EXISTS "mcp_tool_calls" ("context_id" text not null references "mcp_contexts" ("id"), "request_id" text not null, "tool_id" text not null, "input_hash" text not null, "status" text not null, "created_at" text not null, "updated_at" text not null, constraint "mcp_tool_calls_pk" primary key ("context_id", "request_id"), constraint "mcp_call_status" check (status in ('running','completed','failed','interrupted')));`,
  ];
  for (const statement of statements) await sql.raw(statement).execute(db);
}
