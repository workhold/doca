<a id="http-api"></a>

# HTTP API

[English](api.md)

本頁為宿主 0.2.23 的主要介面索引。執行中的 `/api/openapi.json` 提供已註冊路由及 schema，服務端程式碼是授權、未標註欄位和行為限制的最終依據。舊介面記錄見[研發資料](research.zh-Hant.md)，不能據此呼叫當前發行版。

<a id="通用约定"></a>

## 通用約定

下表路徑以 `/api/v1` 為字首。瀏覽器使用 HttpOnly 會話 Cookie；寫請求要求配置的 Host 和同源 Origin。原生客戶端使用宿主認證 Bearer 會話，外掛 WebView 使用受限的外掛會話。公開資源只開放其實際允許的讀入口。

後設資料 `version`、配置 `revision`、正文 `seq`/`epochId` 各有職責；讀取最新值後提交。409 表示衝突或協議/狀態不支援，不自動強制覆蓋。分頁引數因介面而異，按 `nextCursor` 或 `nextOffset` 繼續。無內容閱讀權通常返回 404，系統管理權不會授予私有正文訪問。

<a id="账号与管理"></a>

## 賬號與管理

| 介面 | 用途與許可權 |
| --- | --- |
| `GET /bootstrap` | 當前使用者、站點、能力和已載入外掛；不返回金鑰 |
| `POST /auth/login`、`POST /auth/logout` | 密碼登入 / 退出 |
| `POST /auth/register` | 按站點准入規則註冊；pending 不發會話 |
| `GET /me` | 本人資料和偏好 |
| `GET /auth/providers` | 可用身份源 |
| `GET /admin/users` | 管理員使用者查詢，支援 status/q/cursor |
| `PATCH /admin/users/:id` | `{status:active\|disabled}`，啟停普通使用者；pending 必須走註冊審批 |
| `GET /admin/registration-reviews` | 管理員審批列表 |
| `POST /admin/registration-reviews/:id` | `{decision:approved\|rejected,message?}`，獨立審批 |
| `GET /admin/stats` | 聚合統計，不授予內容許可權 |
| `GET /admin/users/:id/resource-handover` | 停用賬號的資源清單，僅管理員可用 |
| `POST /admin/users/:id/resource-handover/preview`、`POST /admin/users/:id/resource-handover/execute` | 預覽／確認所選所有權和授權變更，見[資源交接](admin-resource-handover.zh-Hant.md) |

聯絡方式驗證碼、恢復、身份繫結、安全驗證、賬號策略和外部身份回撥見[身份認證](authentication.zh-Hant.md)。服務憑據見[憑據說明](service-credentials.zh-Hant.md)，外掛憑證使用獨立[加密服務](plugin-credentials.zh-Hant.md)。

<a id="文档、权限与历史"></a>
<a id="文档权限与历史"></a>

## 文件、許可權與歷史

| 介面 | 用途 |
| --- | --- |
| `GET /resources`、`GET /resources/:id` | 經過許可權過濾的列表 / 詳情 |
| `POST /resources` | 建立文件或知識庫；文件格式為 rich_text/markdown/spreadsheet/presentation/canvas |
| `PATCH /resources/:id` | 帶 version 修改後設資料 |
| `PUT /resources/:id/permissions` | 帶 version 配置許可權 |
| `POST /resources/:id/transfer`、`POST /resources/:id/move` | 所有權轉移 / 移動 |
| `POST /resources/:id/copy` | 建立獨立副本 |
| `POST /resources/:id/trash`、`POST /resources/:id/restore` | 回收站刪除 / 恢復 |
| `GET /resources/:id/versions`、`POST /resources/:id/versions` | 歷史列表 / 手動快照 |
| `GET /resources/:id/versions/:versionId` | 預覽；表格、幻燈片、畫布的 canRestore 為 false |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`，管理者恢復富文字/Markdown |
| `POST /share/redeem` | 登入後預覽或接受文件連結 |

正文編輯使用 `/api/v1/ws`，見[協同](collaboration.zh-Hant.md)。許可權欄位、來源和繼承見[許可權](permission-inheritance.zh-Hant.md)；分享及歷史見[文件指南](document-experience.zh-Hant.md)。

<a id="评论、通知与发现"></a>
<a id="评论通知与发现"></a>

## 評論、通知與發現

評論建立使用 `POST /resources/:id/comments`，請求為 `{richBody,parentId,anchor?}`。`richBody` 是 version 1 的結構化評論，不接受舊純文字 `body` 請求。修改使用 `PATCH /resources/:id/comments/:commentId`，帶評論 version 及 richBody/deleted/resolved 操作。單層回覆、圖片、提及和錨點限制見[評論與通知](comments-and-community.zh-Hant.md)。

通知使用 `GET /notifications`、`POST /notifications/read`、`POST /notifications/read-all`。WebSocket 失效事件觸發重新讀取；列表重新鑑權。發現、收錄、最近訪問和邀請介面見[發現說明](public-resource-discovery.zh-Hant.md)；引用和附件下載見[編輯器整合](editor-integration.zh-Hant.md)。

<a id="搜索"></a>

## 搜尋

`GET /search/documents` 查詢當前有權訪問的文件。關鍵詞模式可降級到資料庫並返回 notice；向量模式需要可用的 Meilisearch 和模型。結果仍按當前許可權校驗，不從索引直接授予許可權。

管理介面為 `GET/PUT /admin/search`、`POST /admin/search/reindex`、`POST /admin/search/reconcile`，以及 `/admin/search/embeddings`、`/admin/search/embeddings/status` 和 `/admin/search/relevance`。索引配置任務返回 202 只表示排隊，需查詢結果；模型或金鑰變化後需重新應用。圖片識別策略目前只儲存配置，不能聲稱啟用後已接入搜尋 OCR 流水線。

<a id="文件与存储"></a>

## 檔案與儲存

資產上傳：`POST /assets?purpose=&filename=&resourceId=`，支援 avatar/cover/attachment/comment_image，按用途校驗許可權。下載：`GET /assets/:id/content`；強制下載加 `?download=1`。頭像/封面/評論圖片最大 5 MiB，正文附件最大 20 MiB。普通平臺檔案透過 `/files` 系列介面上傳，使用獨立限額及分片流程。

`GET /admin/storage` 只讀展示部署後端；`PUT /admin/storage` 返回 405。後端和憑據透過環境變數配置，詳見[檔案儲存](storage.zh-Hant.md)。

<a id="ai、知识与插件"></a>
<a id="ai知识与插件"></a>

## AI、知識與外掛

AI 會話和任務位於 `/ai`，模型工具受會話範圍、真實資源許可權和審批約束。`POST /ai/jobs/:id/approval` 接受 `{approvalId,approved}`，僅任務所屬使用者可決定；審批不改變使用者原有資源許可權。

`POST /mcp` 使用獨立服務 Bearer token 提供 Streamable HTTP。個人設定使用 `GET/PUT /me/mcp` 和 `/me/mcp-services`；公司整合使用 `/admin/mcp-services`，每次 MCP 操作須傳目標 `userId`。服務更新、重置 token 和撤銷均要求當前 revision；token 僅在建立/重置後顯示。詳見 [MCP 配置、工具發現和檔案傳輸](mcp.zh-Hant.md)。

知識冊命令、編排執行、人工待辦與來源訂閱見[知識冊](knowledge-books.zh-Hant.md)；統一來源在 `/content`，見[內容協議](plugin-content.zh-Hant.md)。已安裝外掛業務路由為 `/plugins/:pluginId/...`，實際可用性取決於當前載入的包。宿主沒有隨手記或郵箱專用業務 API，見[功能與邊界](features.zh-Hant.md)。

<a id="健康与源码"></a>

## 健康與原始碼

`GET /health`、`GET /live`、`GET /ready` 不帶 `/api/v1` 字首；響應報告宿主版本。ready 檢查資料庫及已配置的 Redis，不代替完整外部服務驗收。

路由來源：[應用](../apps/server/src/app/create-app.ts)、[路由目錄](../apps/server/src/routes)、[歷史介面](../apps/server/src/routes/experience.ts)、[實時閘道器](../apps/server/src/services/realtime/gateway.ts)。
