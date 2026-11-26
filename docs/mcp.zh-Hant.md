<a id="mcp-服务"></a>

# MCP 服務

[English](mcp.md)

Doca 透過 `POST /api/v1/mcp` 向外部客戶端提供助手工具和 SKILL 手冊。個人設定 → MCP 管理以本人許可權執行的服務；管理後臺 → 公司 MCP 服務用於系統整合，每次操作必須明確傳入目標 `userId`。公司服務的建立者須仍是有效管理員；代其他使用者操作時，資源許可權來自目標使用者。

每個服務有獨立 token、開關、可選到期時間，以及「全部能力 / 部分能力」。全部能力跟隨當前可用工具與技能目錄，包含後續新增能力；部分能力只開放儲存的工具、SKILL ID。授權工具表示允許服務直接執行該操作，資源 ACL、賬號狀態、下載限制、儲存限額和宿主/外掛准入策略仍然生效。SKILL 不授予工具許可權。官方、已安裝外掛和已啟用的個人手冊按實際使用者篩選。

<a id="接入客户端"></a>

## 接入客戶端

每個服務都展示 Codex 命令、`config.toml`、HTTP 握手和發現示例，以及可複製給 AI 的安裝指令。token 只在建立或重置時顯示，列表只展示末八位；資料庫儲存 SHA-256 摘要。不要把 token 放進 URL 或提交到配置倉庫。

```toml
[mcp_servers.doca]
url = "https://docs.example.com/api/v1/mcp"
bearer_token_env_var = "DOCA_MCP_TOKEN"
```

在啟動客戶端的環境中配置 `DOCA_MCP_TOKEN`，CLI 安裝命令為：

```sh
codex mcp add doca --url 'https://docs.example.com/api/v1/mcp' --bearer-token-env-var DOCA_MCP_TOKEN
```

給 AI 的一句話：「請為我安裝名為 doca 的 Streamable HTTP MCP，地址是 `https://docs.example.com/api/v1/mcp`，Bearer token 從環境變數 `DOCA_MCP_TOKEN` 讀取，然後驗證握手並列出工具和 SKILL。」公司服務再補充：「每次 `doca_*` 操作都顯式傳入目標使用者的 `userId`。」介面會替換為當前服務的真實地址、名稱和獨立環境變數名。

Codex 客戶端另有工具審批策略。頁面還提供**可選**無人值守配置：在 `[mcp_servers.doca.tools.doca_call]` 下設定 `approval_mode = "approve"`。僅在你允許該客戶端無需逐次確認、直接使用服務已授權操作時採用；預設樣例不開啟它。參見 [Codex 官方 MCP 配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)和[工具審批設定](https://learn.chatgpt.com/docs/config-file/config-reference)。

<a id="发现和执行能力"></a>

## 發現和執行能力

1. 呼叫 `doca_tools`，在 `purpose` 中傳完整任務。可選 `resources`、`files`、`currentResourceId`、`currentFolder` 使用現有文件/檔案 UUID 提供明確上下文；檔案引用複用助手的許可權校驗和正式輸入快照。返回 `contextId`、獨立執行任務 `taskId` 與簡短目錄，不建立聊天對話。
2. 呼叫 `doca_describe_tools`，傳該 `contextId` 和最多四個工具 ID，按需取得完整引數 schema。
3. 用 `doca_skills` / `doca_load_skill` 或標準 `doca_skill` MCP prompt 讀取對應完整手冊。讀取當前目錄，關閉個人 SKILL 後即不可繼續使用。
4. 順序呼叫 `doca_call`，傳 `contextId`、新的 UUID `requestId`、`tool`、`input`。原生編輯沿用文件工具返回的當前 `seq`、`epochId`、真實 ID 和命令。MCP 與助手複用實現、原生編解碼、事務、通知及實際呼叫 Doca 模型時的原始用量記錄；不會偽造外部客戶端模型的用量。
5. 完成後呼叫 `doca_context_close`，釋放未儲存的上傳緩衝和臨時看圖證明，已儲存文件、檔案保留。

個人服務不傳 `userId`，傳入即拒絕；公司服務每次都要傳有效使用者 UUID。同一上下文不能換服務或換使用者。搜尋、讀取、寫入、下載都按該使用者校驗。審計記錄服務建立者、實際使用者、上下文、請求 ID、工具與執行結果，不記錄輸入中的秘密值。

`requestId` 保證同一上下文內至多執行一次。重複 ID 返回已記錄狀態的衝突，引數不同也不能複用；不會重放私有正文快取或盲目重試可能已完成的寫入。結果不確定時先檢查成果，再決定是否提交新寫入。原生文件和檔案工作流保留既有持久回執。

<a id="文件上传下载"></a>

## 檔案上傳下載

現有 `file_browse`、`file_manage`、`file_folder_manage`、`file_read`、`file_create` 繼續可用；`file_download` 仍表示把公開網頁檔案下載**到 Doca**。

客戶端真實傳輸使用以下工具：

- `file_upload_begin`：檔名、MIME、宣告大小及可選 SHA-256；最多 20 MiB，並遵守更嚴格的使用者上傳限制。
- `file_upload_chunk`：規範 base64、連續位元組偏移；每塊解碼後最多 128 KiB。
- `file_upload_complete`：儲存到目標資料夾 UUID，`folderId:null` 表示本人的檔案根目錄。上傳繫結服務上下文和實際使用者。
- `file_upload_abort`：釋放尚未儲存的上傳。
- `file_content`：許可權校驗後的分塊下載，返回 base64、整檔案/分塊 SHA-256、檔案版本和 `nextOffset`；後續塊必須帶相同版本，檔案變化時拒絕混合版本。

這些工具複用宿主檔案服務，不需要瀏覽器 cookie 或服務端磁碟路徑，也不使用正文讀取地址繞過下載許可權。

<a id="协议和生命周期"></a>

## 協議和生命週期

使用 SDK 1.30.0 的無狀態 Streamable HTTP，明確接受 `2025-11-25`、`2025-06-18`、`2025-03-26`。初始化必須宣告支援的版本，後續請求必須攜帶 `MCP-Protocol-Version`。GET/DELETE 鑑權後返回 405。既有 Host 校驗保留，出現非法 Origin 時拒絕；不增加舊 HTTP+SSE 或舊 token 適配。

執行上下文空閒 15 分鐘到期；每服務最多 16 個活動/建立中上下文，每例項最多 128 個，同一上下文內順序執行。每次重新校驗 token、授權與使用者狀態；重置、撤銷、關閉服務或關閉個人總開關會使對應活動上下文失效。請求體最多 1 MiB，透過宿主限流器限制每服務每分鐘 600 次 HTTP 請求。

執行上下文和看圖證明屬於當前例項。活動上下文須路由到同一例項；重啟、到期或請求落到其他例項後，建立新上下文並檢查已有成果，不承諾自動續跑或恢復看圖證明。原生文件資料仍由既有持久儲存儲存。模型金鑰、秘密值、瀏覽器會話和任意歷史聊天不會作為 MCP 配置匯出。

<a id="执行记录与升级"></a>

## 執行記錄與升級

MCP 與聊天共用任務租約、取消、資源許可權、工具實現、操作回執、模型原始用量和安全審計。MCP 只建立 `ai_jobs` 執行任務，`session_id`、`model_id` 為 NULL；不建立 `ai_sessions`、聊天訊息或記憶執行緒。工具實際呼叫模型時，仍在 `ai_calls` 記錄真實模型和用量。

個人設定 → MCP → 執行記錄列出以本人身份執行的任務，包括公司服務代本人執行的任務。可檢視工具呼叫狀態、當前仍有權訪問的關聯資源、停止執行和清理已關閉的執行記錄。清理保留已儲存文件、生成檔案、操作回執、模型原始用量和安全審計事實。生成圖片保留 AI 輸出目錄的限制，透過明確的 `aiTaskId` 關聯任務，不建立會話資料夾。獨立任務只讀取自己的回執，不把所有 NULL 對話關聯的任務歸成一組。

所有者於 2026-11-01 同意直接解耦。最新 DDL 將 `ai_jobs.session_id`、`ai_jobs.model_id` 和保留的 `mcp_contexts.session_id` 改為可空，透過既有原生列協調器執行；新 `ai_task_resources` 表在 `schemaEvolution` 中宣告並以空表加入，不回填、不改變相容代際。歷史 MCP 對話、上下文、檔案、許可權和審計原樣保留，從聊天入口排除，不轉換、不續跑。已安裝結構仍受 footprint 保護。

外掛 SDK 原始碼 0.2.0 使用 `ai.v2` / `ai.continuations.v2`：`jobId` 始終存在，只有真實聊天執行才提供 `sessionId`。外掛須按 `sdkRange: "^0.2.0"` 重新構建。宿主、Web 和外掛一起更新；舊服務契約及 SDK 範圍直接拒絕，不提供介面適配或自動降級。升級前備份資料庫和檔案；若需回退應用，應先保全升級後的任務和檔案，再單獨審查恢復方案。參見[驗證記錄](verification/mcp-execution-decoupling-2026-11-01.md)。

<a id="存储与旧-mcp-退役"></a>

## 儲存與舊 MCP 退役

專案所有者已於 2026-10-20 同意刪除未使用的舊實現。`/ai/mcp-keys` 和舊四工具適配已移除，`doca_mcp_…` 憑據拒絕使用，新 token 為 `doca_mcp_v1_…`。舊 `ai_mcp_keys` 表及記錄僅為儲存歷史資料而保留，無執行時讀取，不轉換憑據或擴大授權。

當前 DDL 和 `schemaEvolution` 新增空表 `mcp_user_settings`、`mcp_services`、`mcp_contexts`、`mcp_tool_calls`。既有使用者沒有新設定記錄，個人 MCP 預設關閉；公司服務不依賴個人總開關。既有文件、檔案、ACL、AI 會話、配置和相容代際保留。結構需要審查或協調失敗時，不產生部分持久修改；此前已安裝的 MCP 表丟失會作為可能的資料損失拒絕啟動，不靜默重建。

保留升級前備份，服務端和 Web 一起更新。舊程式不能執行新 token、授權、上下文契約，不提供自動應用降級或刪資料恢復；回退前先保全新增記錄並審查恢復方案。參見[資料庫升級約定](database-schema-evolution.zh-Hant.md)和[驗收記錄](verification/mcp-2026-10-20/README.md)。
