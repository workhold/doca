# MCP 服务

[English](mcp.md)

Doca 通过 `POST /api/v1/mcp` 向外部客户端提供助手工具和 SKILL 手册。个人设置 → MCP 管理以本人权限执行的服务；管理后台 → 公司 MCP 服务用于系统集成，每次操作必须明确传入目标 `userId`。公司服务的创建者须仍是有效管理员；代其他用户操作时，资源权限来自目标用户。

每个服务有独立 token、开关、可选到期时间，以及「全部能力 / 部分能力」。全部能力跟随当前可用工具与技能目录，包含后续新增能力；部分能力只开放保存的工具、SKILL ID。授权工具表示允许服务直接执行该操作，资源 ACL、账号状态、下载限制、存储限额和宿主/插件准入策略仍然生效。SKILL 不授予工具权限。官方、已安装插件和已启用的个人手册按实际用户筛选。

## 接入客户端

每个服务都展示 Codex 命令、`config.toml`、HTTP 握手和发现示例，以及可复制给 AI 的安装指令。token 只在创建或重置时显示，列表只展示末八位；数据库保存 SHA-256 摘要。不要把 token 放进 URL 或提交到配置仓库。

```toml
[mcp_servers.doca]
url = "https://docs.example.com/api/v1/mcp"
bearer_token_env_var = "DOCA_MCP_TOKEN"
```

在启动客户端的环境中配置 `DOCA_MCP_TOKEN`，CLI 安装命令为：

```sh
codex mcp add doca --url 'https://docs.example.com/api/v1/mcp' --bearer-token-env-var DOCA_MCP_TOKEN
```

给 AI 的一句话：「请为我安装名为 doca 的 Streamable HTTP MCP，地址是 `https://docs.example.com/api/v1/mcp`，Bearer token 从环境变量 `DOCA_MCP_TOKEN` 读取，然后验证握手并列出工具和 SKILL。」公司服务再补充：「每次 `doca_*` 操作都显式传入目标用户的 `userId`。」界面会替换为当前服务的真实地址、名称和独立环境变量名。

Codex 客户端另有工具审批策略。页面还提供**可选**无人值守配置：在 `[mcp_servers.doca.tools.doca_call]` 下设置 `approval_mode = "approve"`。仅在你允许该客户端无需逐次确认、直接使用服务已授权操作时采用；默认样例不打开它。参见 [Codex 官方 MCP 配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)和[工具审批设置](https://learn.chatgpt.com/docs/config-file/config-reference)。

## 发现和执行能力

1. 调用 `doca_tools`，在 `purpose` 中传完整任务。可选 `resources`、`files`、`currentResourceId`、`currentFolder` 使用现有文档/文件 UUID 提供明确上下文；文件引用复用助手的权限校验和正式输入快照。返回 `contextId`、独立执行任务 `taskId` 与简短目录，不创建聊天对话。
2. 调用 `doca_describe_tools`，传该 `contextId` 和最多四个工具 ID，按需取得完整参数 schema。
3. 用 `doca_skills` / `doca_load_skill` 或标准 `doca_skill` MCP prompt 读取对应完整手册。读取当前目录，关闭个人 SKILL 后即不可继续使用。
4. 顺序调用 `doca_call`，传 `contextId`、新的 UUID `requestId`、`tool`、`input`。原生编辑沿用文档工具返回的当前 `seq`、`epochId`、真实 ID 和命令。MCP 与助手复用实现、原生编解码、事务、通知及实际调用 Doca 模型时的原始用量记录；不会伪造外部客户端模型的用量。
5. 完成后调用 `doca_context_close`，释放未保存的上传缓冲和临时看图证明，已保存文档、文件保留。

个人服务不传 `userId`，传入即拒绝；公司服务每次都要传有效用户 UUID。同一上下文不能换服务或换用户。搜索、读取、写入、下载都按该用户校验。审计记录服务创建者、实际用户、上下文、请求 ID、工具与执行结果，不记录输入中的秘密值。

`requestId` 保证同一上下文内至多执行一次。重复 ID 返回已记录状态的冲突，参数不同也不能复用；不会重放私有正文缓存或盲目重试可能已完成的写入。结果不确定时先检查成果，再决定是否提交新写入。原生文档和文件工作流保留既有持久回执。

## 文件上传下载

现有 `file_browse`、`file_manage`、`file_folder_manage`、`file_read`、`file_create` 继续可用；`file_download` 仍表示把公开网页文件下载**到 Doca**。

客户端真实传输使用以下工具：

- `file_upload_begin`：文件名、MIME、声明大小及可选 SHA-256；最多 20 MiB，并遵守更严格的用户上传限制。
- `file_upload_chunk`：规范 base64、连续字节偏移；每块解码后最多 128 KiB。
- `file_upload_complete`：保存到目标文件夹 UUID，`folderId:null` 表示本人的文件根目录。上传绑定服务上下文和实际用户。
- `file_upload_abort`：释放尚未保存的上传。
- `file_content`：权限校验后的分块下载，返回 base64、整文件/分块 SHA-256、文件版本和 `nextOffset`；后续块必须带相同版本，文件变化时拒绝混合版本。

这些工具复用宿主文件服务，不需要浏览器 cookie 或服务端磁盘路径，也不使用正文读取地址绕过下载权限。

## 协议和生命周期

使用 SDK 1.30.0 的无状态 Streamable HTTP，明确接受 `2025-11-25`、`2025-06-18`、`2025-03-26`。初始化必须声明支持的版本，后续请求必须携带 `MCP-Protocol-Version`。GET/DELETE 鉴权后返回 405。既有 Host 校验保留，出现非法 Origin 时拒绝；不增加旧 HTTP+SSE 或旧 token 适配。

执行上下文空闲 15 分钟到期；每服务最多 16 个活动/创建中上下文，每实例最多 128 个，同一上下文内顺序执行。每次重新校验 token、授权与用户状态；重置、撤销、关闭服务或关闭个人总开关会使对应活动上下文失效。请求体最多 1 MiB，通过宿主限流器限制每服务每分钟 600 次 HTTP 请求。

执行上下文和看图证明属于当前实例。活动上下文须路由到同一实例；重启、到期或请求落到其他实例后，创建新上下文并检查已有成果，不承诺自动续跑或恢复看图证明。原生文档数据仍由既有持久存储保存。模型密钥、秘密值、浏览器会话和任意历史聊天不会作为 MCP 配置导出。

## 执行记录与升级

MCP 与聊天共用任务租约、取消、资源权限、工具实现、操作回执、模型原始用量和安全审计。MCP 只创建 `ai_jobs` 执行任务，`session_id`、`model_id` 为 NULL；不创建 `ai_sessions`、聊天消息或记忆线程。工具实际调用模型时，仍在 `ai_calls` 记录真实模型和用量。

个人设置 → MCP → 执行记录列出以本人身份执行的任务，包括公司服务代本人执行的任务。可查看工具调用状态、当前仍有权访问的关联资源、停止执行和清理已关闭的执行记录。清理保留已保存文档、生成文件、操作回执、模型原始用量和安全审计事实。生成图片保留 AI 输出目录的限制，通过明确的 `aiTaskId` 关联任务，不创建会话文件夹。独立任务只读取自己的回执，不把所有 NULL 对话关联的任务归成一组。

所有者于 2026-11-01 同意直接解耦。最新 DDL 将 `ai_jobs.session_id`、`ai_jobs.model_id` 和保留的 `mcp_contexts.session_id` 改为可空，通过既有原生列协调器执行；新 `ai_task_resources` 表在 `schemaEvolution` 中声明并以空表加入，不回填、不改变兼容代际。历史 MCP 对话、上下文、文件、权限和审计原样保留，从聊天入口排除，不转换、不续跑。已安装结构仍受 footprint 保护。

插件 SDK 源码 0.2.0 使用 `ai.v2` / `ai.continuations.v2`：`jobId` 始终存在，只有真实聊天执行才提供 `sessionId`。插件须按 `sdkRange: "^0.2.0"` 重新构建。宿主、Web 和插件一起更新；旧服务契约及 SDK 范围直接拒绝，不提供接口适配或自动降级。升级前备份数据库和文件；若需回退应用，应先保全升级后的任务和文件，再单独审查恢复方案。参见[验证记录](verification/mcp-execution-decoupling-2026-11-01.md)。

## 存储与旧 MCP 退役

项目所有者已于 2026-10-20 同意删除未使用的旧实现。`/ai/mcp-keys` 和旧四工具适配已移除，`doca_mcp_…` 凭据拒绝使用，新 token 为 `doca_mcp_v1_…`。旧 `ai_mcp_keys` 表及记录仅为保存历史数据而保留，无运行时读取，不转换凭据或扩大授权。

当前 DDL 和 `schemaEvolution` 新增空表 `mcp_user_settings`、`mcp_services`、`mcp_contexts`、`mcp_tool_calls`。既有用户没有新设置记录，个人 MCP 默认关闭；公司服务不依赖个人总开关。既有文档、文件、ACL、AI 会话、配置和兼容代际保留。结构需要审查或协调失败时，不产生部分持久修改；此前已安装的 MCP 表丢失会作为可能的数据损失拒绝启动，不静默重建。

保留升级前备份，服务端和 Web 一起更新。旧程序不能执行新 token、授权、上下文契约，不提供自动应用降级或删数据恢复；回退前先保全新增记录并审查恢复方案。参见[数据库升级约定](database-schema-evolution.zh-CN.md)和[验收记录](verification/mcp-2026-10-20/README.md)。
