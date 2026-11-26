<a id="sdd-模块索引"></a>

# SDD 模組索引

[桌面版](desktop-client.zh-Hant.md)涉及 Tauri 外殼、遠端登入、內建 Web 傳輸和視窗會話；對應的功能記錄為 [`specs/006-desktop-client`](../specs/006-desktop-client/spec.md) 与 [`specs/007-desktop-workspace-tabs`](../specs/007-desktop-workspace-tabs/spec.md)。

[English](sdd-module-index.md) · [執行流程](sdd.zh-Hant.md)

本索引關聯已有模組的原始碼、現行契約和可複用檢查，不證明存量功能已經驗收，也不重跑歷史驗收。開發前核對實際匯出與鎖檔案版本，當前限制參照[架構](architecture.zh-Hant.md)及適用發行說明。修改模組時建立新的 SDD，並在同一個 PR 中更新權威契約。

| 模組 | 原始碼入口 | 現行契約與指引 | 可複用檢查 |
| --- | --- | --- | --- |
| 宿主組裝與生命週期 | [服務端](../apps/server/src)、[核心](../packages/core/src) | [架構](architecture.zh-Hant.md)、[開發](development.zh-Hant.md) | [宿主隔離/整合](../tests/cloud.test.ts) |
| 認證、授權與使用者組 | [核心規則](../packages/core/src)、[HTTP 路由](../apps/server/src/routes) | [認證](authentication.zh-Hant.md)、[許可權](permission-inheritance.zh-Hant.md)、[使用者組](user-groups.zh-Hant.md) | [許可權](../tests/permissions-v2.test.ts)、[繼承](../tests/permission-inheritance.test.ts)、[使用者組](../tests/user-groups.test.ts) |
| 文件編輯器與檔案交換 | [文件 UI](../apps/web/src/features/documents)、[文件核心](../packages/core/src/modules/documents) | [編輯器整合](editor-integration.zh-Hant.md)、[檔案交換](editor-file-exchange-contract.zh-Hant.md)；倉庫編輯器 skill | [包升級](../tests/editor-package-upgrade.test.ts)、[整合](../tests/document-integration.test.ts)、[PDF](../tests/document-pdf.test.ts) |
| 協同、線上狀態與評論 | [文件 codec](../packages/core/src/modules/documents/codecs)、[服務端服務](../apps/server/src/services) | [協同契約](collaboration-sdk-contract.zh-Hant.md)、[評論](comments-and-community.zh-Hant.md)；倉庫協同 skill | [協同](../tests/collaboration.test.ts)、[選區](../tests/rich-text-collaboration-selection.test.ts) |
| 資料庫結構與持久化格式 | [資料庫包](../packages/db/src)、[最新 DDL](../packages/db/src/create-schema.ts) | [升級規範](database-schema-evolution.zh-Hant.md)、[結構清單](database.zh-Hant.md) | [結構對賬](../tests/schema-reconciliation.test.ts)、[欄位屬性](../tests/schema-column-alignment.test.ts)、[PostgreSQL CI](../.github/workflows/database-upgrade.yml) |
| 檔案、儲存與歷史 | [檔案路由](../apps/server/src/routes/files.ts)、[文件核心](../packages/core/src/modules/documents) | [儲存](storage.zh-Hant.md)、[文件行為](document-experience.zh-Hant.md) | [檔案](../tests/files.test.ts)、[儲存](../tests/storage.test.ts)、[歷史](../tests/history-storage.test.ts) |
| 外掛安裝與公開 SDK | [SDK](../packages/plugin-sdk)、[外掛宿主](../packages/plugin-host)、[Web 註冊](../packages/web-plugin-registry) | [SDK 契約](plugin-sdk-contract.zh-Hant.md)、[開發](plugin-development.zh-Hant.md)、[儲存](plugin-horizontal-scaling.zh-Hant.md) | [SDK](../tests/plugin-sdk.test.ts)、[管理](../tests/plugin-manager.test.ts)、[託管儲存](../tests/plugin-managed-storage.test.ts) |
| AI 執行、工具與用量 | [AI 核心](../packages/core/src/modules/ai)、[服務端 AI](../apps/server/src/services/ai)、[宿主包](../packages/ai-host) | [AI 邊界](ai-efficiency.md)、[附件](ai-attachments.md)、[續接](plugin-ai-continuations.zh-Hant.md)、[SDK 契約](plugin-sdk-contract.zh-Hant.md) | [能力](../tests/plugin-ai-capability.test.ts)、[續接](../tests/ai-continuations.test.ts)、[文件讀取](../tests/ai-document-read.test.ts) |
| 搜尋與知識冊 | [搜尋宿主](../packages/search-host)、[知識](../packages/core/src/modules/knowledge)、[知識冊](../packages/core/src/modules/knowledge-books) | [內容來源](plugin-content.zh-Hant.md)、[知識冊](knowledge-books.zh-Hant.md)、[檢查點](knowledge-book-generation-performance.zh-Hant.md) | [搜尋](../tests/search-host-query.test.ts)、[知識冊](../tests/knowledge-books.test.ts)、[正文儲存](../tests/knowledge-book-payload-storage.test.ts) |
| MCP 與瀏覽器助手 | [MCP 路由](../apps/server/src/routes/mcp-management.ts)、[瀏覽器擴充套件](../apps/browser-extension) | [MCP](mcp.zh-Hant.md)、[瀏覽器助手](browser-assistant.zh-Hant.md) | [MCP](../tests/mcp.test.ts)、[收錄](../tests/browser-clipper.test.ts)、[助手](../tests/browser-assistant.test.ts) |
| Web 外殼、原生客戶端與語言 | [Web](../apps/web/src)、[移動端](../apps/mobile)、[i18n](../packages/i18n) | [原生整合](plugin-native.zh-Hant.md)、[國際化](i18n.zh-Hant.md)；倉庫 i18n skill | [語言](../tests/i18n.test.ts)、[原生會話](../tests/plugin-mobile-session.test.ts)、[原生能力](../tests/plugin-native.test.ts) |
| 任務、Webhook 與多例項 | [任務宿主](../packages/job-host)、[Webhook](../apps/server/src/services/webhooks) | [Webhook](webhooks.zh-Hant.md)、[水平擴充套件](horizontal-scaling.zh-Hant.md)、[外掛儲存](plugin-horizontal-scaling.zh-Hant.md) | [Webhook](../tests/webhooks.test.ts)、[叢集監控](../tests/plugin-monitoring-cluster.test.ts) |
| 打包、釋出與文件 | [指令碼](../scripts)、[Docker](../docker)、[工作流](../.github/workflows) | [部署](deployment.zh-Hant.md)、[文件維護](documentation.zh-Hant.md)、[驗收索引](verification/README.md) | [文件檢查器](../scripts/tests/documentation.test.mjs)、[SDD 檢查器](../scripts/tests/sdd.test.mjs)、模組/釋出專項指令碼 |

測試連結僅提供入口，不構成每次變更的完整驗證方案。按驗收條件與真實邊界選擇檢查：SQLite 結果不能證明 PostgreSQL 升級，模擬對端不能證明外部服務，本地測試不能證明原生裝置或生產部署。修改對應領域前閱讀適用 skill。獨立版本的編輯器包和業務外掛還需各自倉庫的檢查及明確的整合版本記錄。
