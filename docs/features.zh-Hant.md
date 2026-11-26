<a id="功能与边界"></a>

# 功能與邊界

[English](features.md)

本頁按宿主 **0.2.25**、外掛 SDK **0.1.11** 的當前原始碼核對，核對日期為 2026-10-29。安裝業務外掛前，宿主提供下表中的核心能力。某個外掛的功能、版本和驗收結果以該外掛自己的文件為準。

<a id="核心能力"></a>

## 核心能力

| 能力 | 當前狀態與條件 | 使用說明 |
| --- | --- | --- |
| 富文字、Markdown、表格、幻燈片、畫布 | 五種編輯器均已接入；編輯需要資源許可權 | [文件與分享](document-experience.zh-Hant.md) |
| 實時協同與儲存確認 | 五種格式使用宿主 WebSocket 和持久化回執；多例項需要共享 PostgreSQL、Redis 和檔案儲存 | [實時協同](collaboration.zh-Hant.md) |
| 歷史、手動快照與恢復 | 五種格式可讀歷史；僅富文字/Markdown 可恢復，需管理許可權、當前正文序號及可恢復快照 | [文件歷史](document-experience.zh-Hant.md#历史与恢复) |
| 知識庫與許可權 | 目錄、邀請、繼承、分享連結、轉移、移動、獨立複製和回收站 | [許可權](permission-inheritance.zh-Hant.md) |
| 發現、收錄與最近訪問 | 已實現；展示與訪問許可權分別校驗 | [發現與收錄](public-resource-discovery.zh-Hant.md) |
| 檔案與附件 | 個人檔案、共享資料夾、授權上傳下載；部署必須配置本地或 S3 儲存 | [檔案儲存](storage.zh-Hant.md) |
| 評論與站內通知 | 五種格式已實現，包括表格穩定行列錨點 | [評論與通知](comments-and-community.zh-Hant.md) |
| 文件搜尋 | 資料庫基礎檢索可用；全文與向量索引需要配置 Meilisearch 和相應模型 | [HTTP API](api.zh-Hant.md#搜索) |
| 個人 AI 助手 | 已實現會話、工具、審批和用量事實記錄；需要配置可用模型及憑據 | [使用指南](user-guide.zh-Hant.md) |
| 瀏覽器外掛 | Chrome / Edge 下載包安裝，網頁與選區收錄、儲存方案及共享 AI 側欄；AI 需要站點模型配置 | [瀏覽器助手](browser-assistant.zh-Hant.md) |
| MCP 服務 | 外部客戶端可使用授權工具與 SKILL；支援本人服務與顯式目標使用者的公司整合，繼續檢查資源許可權 | [MCP 服務](mcp.zh-Hant.md) |
| 桌面客戶端 | Windows 與 macOS 應用透過系統瀏覽器授權連線自己的服務端；多標籤工作空間視窗、多後端同時連線、按後端恢復頁面；服務端需為 0.2.37 或更高 | [桌面客戶端](desktop-client.zh-Hant.md) |
| 知識冊與來源訂閱 | 屬於核心；保留文件與來源訂閱，新增知識冊、可編輯編排、溯源及人工反饋；舊整理與問答機器人已移除 | [知識冊](knowledge-books.zh-Hant.md) |
| 本地賬號與外部登入 | 密碼、聯絡方式驗證碼、恢復、註冊審批、OIDC/OAuth 及社交適配已實現；外部服務需要實際憑據 | [身份認證](authentication.zh-Hant.md) |
| Webhook | 非同步投遞、重試和記錄已實現；需要配置接收端 | [Webhook](webhooks.zh-Hant.md) |
| 外掛安裝和公開 SDK | 可信預構建包、安裝目錄發現、重啟應用；託管 SQL、物件和加密憑證已實現 | [外掛部署](plugin-deployment.zh-Hant.md) |

<a id="独立插件与已移出功能"></a>

## 獨立外掛與已移出功能

- **隨手記**已移出宿主。當前宿主沒有 `#/notes` 頁面、`/api/v1/quick-notes` API、`quick_notes` 或 `quick_note_compilations` 表。歷史說明僅保留在[研發資料](research.zh-Hant.md)，不能按其中介面呼叫當前宿主。本倉庫不提供隨手記外掛的安裝包或當前使用承諾。
- 郵箱、日曆、會員、積分、計費、業務額度和內容稽核由獨立業務外掛提供，預設映象不安裝這些業務。註冊審批與安全審計仍屬於核心，和業務內容稽核不同。
- 模板、素材、素材集和外掛文件元素有宿主介面及選擇器，但**預設沒有提供者**。需要另外安裝匹配 SDK 的提供者；宿主沒有原來的模板管理 CRUD 頁面。沒有提供者時仍可建立空白文件。
- 示例包位於 [examples](../examples)，用於開發與隔離驗收，預設映象不安裝，也不代表獨立業務外掛已驗收。

<a id="尚未提供或需单独验证"></a>

## 尚未提供或需單獨驗證

- 編輯器已有持久本地副本和未確認更新佇列，需要可用的已授權副本及成功的瀏覽器儲存；不等於完整離線應用或無網路冷啟動。Doca 作為 OIDC 提供方、SAML 尚未提供。見[實時協同](collaboration.zh-Hant.md)。
- 外掛臨時工作區、叢集業務任務排空、任意 SQL 與跨服務分散式事務尚未提供。SDK 的目標契約不等於現有匯出，見[實現狀態](plugin-sdk-contract.zh-Hant.md)。
- 原生外掛 WebView 容器已有原始碼協議；iOS/Android 構建、裝置行為和獨立外掛適配需要各自驗收。服務端安裝不會下載執行原生 JavaScript。
- 真實 AI、SSO、驗證碼閘道器、Webhook、S3/CDN 等服務的可用性取決於部署環境。發行記錄中的歷史測試結果有各自範圍，不能代表所有外部服務或裝置已驗證。

<a id="核对依据"></a>

## 核對依據

核對包括 [服務組裝](../apps/server/src/plugins/composition.ts)、[頁面路由](../apps/web/src/app/app.tsx)、[五種編輯器分派](../apps/web/src/features/documents/document-editor.tsx)、[歷史介面](../apps/server/src/routes/experience.ts)、[賬號介面](../apps/server/src/routes/accounts.ts)、[當前建表定義](../packages/db/src/create-schema.ts) 和 [SDK 匯出](../packages/plugin-sdk/package.json)。`bootstrap.capabilities` 和 `bootstrap.plugins` 可用於確認某次部署的宿主能力與已載入外掛；前者不是完整業務功能清單。
