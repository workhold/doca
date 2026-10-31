# MCP services

[简体中文](mcp.zh-CN.md)

Doca exposes its assistant tools and SKILL manuals to external clients through `POST /api/v1/mcp`. Personal settings → MCP manages services that act as the signed-in user. Admin → Company MCP services manages integrations that explicitly name the effective `userId` on every operation. Company tokens require an active administrator creator; they do not inherit that creator's resource permissions when operating as another user.

Each service has an independent bearer token, enable switch, optional expiration, and an `all` or `selected` grant. `all` follows the available tool/skill catalog, including later additions. `selected` exposes only the recorded tool and SKILL IDs. A tool grant is standing consent to execute that action; it does not widen resource ACLs, storage limits, download restrictions, account status or host/plugin admission policies. A SKILL never grants tool permissions. Official, installed-plugin and enabled personal manuals are filtered for the effective user.

## Connect a client

Every service displays a Codex command, `config.toml`, HTTP initialization/discovery examples and a copyable instruction for an AI to install it. Tokens appear only after creation/reset; lists contain only their final eight characters. The database stores SHA-256 token hashes. Do not put a token in a URL or commit it into a config file.

```toml
[mcp_servers.doca]
url = "https://docs.example.com/api/v1/mcp"
bearer_token_env_var = "DOCA_MCP_TOKEN"
```

Set `DOCA_MCP_TOKEN` in the environment that launches the client. For the CLI:

```sh
codex mcp add doca --url 'https://docs.example.com/api/v1/mcp' --bearer-token-env-var DOCA_MCP_TOKEN
```

One sentence for an AI: “Install a Streamable HTTP MCP named doca at `https://docs.example.com/api/v1/mcp`, read its Bearer token from `DOCA_MCP_TOKEN`, then verify initialization and list the available tools and SKILLs.” For a company service add: “Pass the target user's `userId` on every `doca_*` operation.”

Codex has its own tool approval policy. The UI also supplies an **optional** unattended configuration: `[mcp_servers.doca.tools.doca_call]` with `approval_mode = "approve"`. Use this only when you intend to preauthorize that client's use of the service's granted actions. The default connection examples do not enable it. See [official MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) and [tool approval settings](https://learn.chatgpt.com/docs/config-file/config-reference).

## Discover and execute

1. Call `doca_tools` with the complete task in `purpose`. Optional `resources`, `files`, `currentResourceId` and `currentFolder` supply explicit context using existing document/file UUIDs. File references receive the same authorized input snapshot used by the assistant. The result contains `contextId`, the independent `taskId`, and a concise catalog. No conversation is created.
2. Call `doca_describe_tools` with that `contextId` and up to four tool IDs to obtain their complete input schemas. Only retrieve schemas needed for the next operation.
3. Read the matching manual through `doca_skills`/`doca_load_skill`, or the standard `doca_skill` MCP prompt. These read the current catalog; a disabled private SKILL stops being available.
4. Call `doca_call` sequentially with `contextId`, a new UUID `requestId`, `tool` and `input`. Native edits use the current `seq`, `epochId`, IDs and commands returned by the normal document tools. This is the same assistant implementation, with the same native codecs, transactions, notifications and original AI usage ledger when a Doca provider is actually called. External-client model usage is not invented in Doca's ledger.
5. Call `doca_context_close` when finished. Saved documents/files remain. The pending upload buffers and local visual inspection state are released.

Personal operations omit `userId`; supplying it is rejected. Company operations must supply an active target user's UUID every time. A context cannot change service or effective user. Search, reads, writes and downloads check that user's permissions. The audit records the service creator, effective user, context, request ID, tool and outcome without recording input secrets.

`requestId` provides at-most-once execution within its context. A repeated ID returns HTTP/tool conflict with its recorded status, and different parameters cannot reuse it. It does not replay cached private content or blindly retry a possibly completed write. Inspect the saved resource before issuing a new write after an uncertain result. Normal native and file workflows retain their existing durable receipts.

## Files

The native `file_browse`, `file_manage`, `file_folder_manage`, `file_read` and `file_create` tools remain available. `file_download` keeps its assistant meaning: fetch a public web file **into** Doca.

For actual client transfers:

- `file_upload_begin`: filename, MIME, declared size and optional SHA-256; maximum 20 MiB and any stricter configured user limit.
- `file_upload_chunk`: canonical base64, continuous byte offset; maximum decoded chunk 128 KiB.
- `file_upload_complete`: save the completed upload to a user folder UUID, or `folderId:null` for the user's root. Uploads are bound to the service context and effective user.
- `file_upload_abort`: release a pending upload.
- `file_content`: authorized byte-range download with base64, complete-file/chunk SHA-256, file version and `nextOffset`. Pass that same version on subsequent chunks; reject changed files rather than combining versions.

These methods reuse the host file service. They need neither browser cookies nor a server filesystem path, and never turn a content-read URL into a download authorization bypass.

## Transport and lifetime

The endpoint uses stateless Streamable HTTP from SDK 1.30.0, with explicitly accepted protocol versions `2025-11-25`, `2025-06-18` and `2025-03-26`. Initialization must name a supported version; subsequent requests must carry `MCP-Protocol-Version`. GET/DELETE return authenticated 405 responses. Existing Host checks apply and an invalid present Origin is rejected. Deprecated HTTP+SSE and old token adapters are not provided.

Execution contexts have a 15-minute idle lifetime, at most 16 active/pending contexts per service and 128 per instance. Calls within one context are sequential. Tool/skill grants, tokens and active users are checked again; resetting/revoking a token, disabling a service or switching off personal MCP invalidates its live contexts. The HTTP request limit is 600/minute per service using the host rate limiter. Request bodies are bounded to 1 MiB.

Context execution and visual-view proofs are instance-local. Route an active context to the same instance. After restart, expiration or routing to a different instance, open a new context and inspect existing artifacts; no automatic continuation or visual-proof recovery is claimed. Native document data remains in the normal durable store. Provider credentials, secret values, browser sessions and arbitrary prior chat histories are not exported as MCP configuration.

## Execution history and upgrade

MCP and chat share task leases, cancellation, resource authorization, tool implementations, operation receipts, provider usage facts and security audit. MCP creates an `ai_jobs` execution with NULL `session_id` and `model_id`; it does not create an `ai_sessions` row, chat messages or memory thread. Real provider calls still record their actual model and usage in `ai_calls`.

Personal settings → MCP → Execution history lists the effective user's tasks, including company-service tasks executed as that user. It supports authorized resource links, call status, stopping and removal of closed execution history. Removing history preserves saved documents, generated files, operation receipts, original provider usage and security audit facts. Generated images retain the AI output directory's restrictions and carry an explicit `aiTaskId` binding, without a conversation folder. A task only reads its own receipts; NULL conversation associations never group unrelated executions.

The owner approved direct separation on 2026-11-01. Current DDL makes `ai_jobs.session_id`, `ai_jobs.model_id` and the retained `mcp_contexts.session_id` nullable through the existing native column reconciler. The new `ai_task_resources` ledger starts empty and is declared in `schemaEvolution`; there is no backfill or compatibility-generation change. Historical MCP conversations, contexts, files, grants and audit rows remain byte-for-byte unchanged, are excluded from chat entry points, and are neither converted nor resumed. Previously installed fields/tables remain protected by the installed footprint.

Plugin SDK source 0.2.0 exposes `ai.v2` / `ai.continuations.v2`: `jobId` is required and `sessionId` exists only for conversation-backed execution. Rebuild plugin packages for `sdkRange: "^0.2.0"`. Host, Web and plugins must update together. Old service contracts and SDK ranges are rejected; there is no old-interface adapter or automatic downgrade. Keep database/file backups before upgrade and preserve subsequent task/file writes for a separately reviewed recovery before reverting application binaries. See [verification](verification/mcp-execution-decoupling-2026-11-01.md).

## Storage and retired MCP

The owner approved retiring the unused old implementation on 2026-10-20. `/ai/mcp-keys` and the old four-tool adapter are removed. `doca_mcp_…` credentials are rejected; new tokens use `doca_mcp_v1_…`. The inert `ai_mcp_keys` table/rows remain solely to preserve stored data; no runtime reads them and no credentials or grants are converted.

`mcp_user_settings`, `mcp_services`, `mcp_contexts` and `mcp_tool_calls` are empty additive tables declared in the current DDL and `schemaEvolution`. Existing users start with personal MCP disabled because no new settings row exists; company service use is independent of that switch. Existing documents, files, ACLs, AI sessions, configured values and compatibility generation are retained. Structural review rejection and failed reconciliation make no partial persistent changes. A removed previously installed MCP table is possible data loss and is not recreated silently.

Keep pre-upgrade backups and upgrade server/Web together. Old binaries do not enforce the new token/grant/context contract. There is no automatic application downgrade or data removal; preserve new records and review recovery before returning to an older deployment. See the [database upgrade contract](database-schema-evolution.md) and [acceptance evidence](verification/mcp-2026-10-20/README.md).
