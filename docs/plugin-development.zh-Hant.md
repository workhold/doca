<a id="doca-插件开发规范"></a>

# Doca 外掛開發規範

當前原始碼使用 SDK **0.2.0**，AI 服務為 `ai.v2` / `ai.continuations.v2`。工具上下文始終提供 `jobId`，只有真實聊天執行才提供 `sessionId`。外掛須重新構建並宣告 `sdkRange: "^0.2.0"`；舊 SDK 範圍和舊 AI 服務契約直接拒絕，不提供適配。本次原始碼變更不代表 npm 釋出或部署。參見 [MCP 執行隔離](mcp.zh-Hant.md#执行记录与升级)。

SDK 不相容或必需依賴不可用只隔離受影響的業務外掛，宿主與其他外掛繼續啟動；管理頁顯示不可用原因和升級提示。原安裝意願、歸檔、業務資料和憑據保留，不轉換舊包或執行舊 SDK 程式碼。新線上安裝仍拒絕不相容包。停機放入的完整安裝目錄按原始身份儲存後做相同隔離。


外部 AI 客戶端透過 [MCP 服務](mcp.zh-Hant.md)接入。工具須顯式宣告 MCP exposure 並保留正常授權/准入校驗；SKILL 是操作手冊，不授予工具許可權。

0.1.26 使用與核心庫分開的[外掛共享業務資料庫](plugin-database-isolation.zh-Hant.md)，自動建立外掛名稱空間，取代 0.1.25 的每外掛獨立庫。升級須先在舊宿主正常解除安裝，再重灌，不遷移外掛資料。

文件基線：宿主 0.2.23 / SDK 0.1.11，2026-10-28 按原始碼核對。SDK 0.1.11 的 npm 釋出記錄見下文，生產部署和移動真機驗收另行確認。本文是外掛開發的主入口，包含當前內容、App 和安裝約定；連結文件補充完整型別、協議和歷史驗收記錄。任何新增或修改相容策略、舊格式轉換或資料庫遷移，必須先與專案負責人對齊方案。

[English](plugin-development.md)

完整目標及尚未實現部分見 [SDK 契約](plugin-sdk-contract.zh-Hant.md)。新增設計不得保留已退出的會員、稽核或原始碼載入路徑；現有相容行為的處理遵循倉庫事先確認規則。

水平擴充套件與儲存職責按已確認的[託管儲存規範](plugin-horizontal-scaling.zh-Hant.md)執行。所有持久化由宿主管理，安裝包必須宣告 `doca.storage: "host"`；缺失或其他值在安裝、目錄發現和啟動時於匯入程式碼前拒絕。託管 SQL 與內部物件已匯出；憑證已在 SDK 原始碼 0.1.8 實現，臨時工作區仍有缺口。

<a id="已实现的托管存储"></a>

## 已實現的託管儲存

`@smartdoca/plugin-sdk/storage` 已匯出安裝身份繫結的 `pluginDatabaseToken`（`storage.sql.v1`）和 `pluginObjectStorageToken`（`storage.objects.v1`）。關係庫支援顯式 version 1 結構宣告、text/int32/雙精度列、主鍵/唯一約束、結構化查詢/寫入/刪除，以及回撥只執行一次的事務。SDK 原始碼 0.1.8 另匯出 `pluginCredentialToken`（`storage.credentials.v1`），提供服務端加密憑證 CRUD、後設資料與修訂號檢查，見[憑證介面](plugin-credentials.zh-Hant.md)。聯表、外來鍵、通用 SQL、upsert 和臨時工作區尚未匯出。業務 SQL 使用與核心庫分開的宿主管理共享資料庫：SQLite 一個檔案、按外掛加表名字首；PostgreSQL 一個 URL／賬號、自動建立外掛 schema，共用連線池。程序隔離仍未實現，見[儲存配置與先解除安裝再升級約定](plugin-database-isolation.zh-Hant.md)。

邏輯庫為 `plugin:<pluginId>`，使用者檔案歸屬及私有物件使用 `plugins/<pluginId>`，發行包使用 `host/plugin-releases/<sha256>.zip`。ZIP 位元組進入環境變數配置的檔案儲存，共享資料庫只儲存 version 2 清單、歸檔引用和可信檔案雜湊索引。有效快取無需重新下載 ZIP。全部例項由運維逐個重啟。不支援的外掛包和儲存格式拒絕自動轉換，原資料保留。核心資料庫升級另遵守[資料庫升級規範](database-schema-evolution.zh-Hant.md)。詳見[準確實現與限制](unified-storage-implementation.md)。

<a id="许可证边界"></a>

## 許可證邊界

Doca 及公開外掛 SDK 採用 [MIT](../LICENSE)。外掛可以開源，也可以閉源。許可說明見
[中文說明](../LICENSING.zh-CN.md)。

外掛不得把許可證不明、禁止再分發或與其釋出方式不相容的依賴打入正式製品。所有
第三方 NOTICE、原始碼提供和署名義務由外掛釋出者繼續履行。Doca 的許可證不會覆蓋
外掛釋出者無權許可的第三方內容。

<a id="安装与启动"></a>

## 安裝與啟動

透過「管理 → 外掛商店」上傳完整的預構建 ZIP，或停機後放入 `DOCA_PLUGINS_DIR/<plugin-id>/`。每個例項重啟生效，共享資料庫儲存全站清單、歸檔引用和雜湊索引，完整 ZIP 位元組儲存在統一檔案儲存，各例項啟動自動校驗並補齊本地快取。不保留 npm 安裝目錄相容路徑。詳見 [商店協議](plugin-store-protocol.zh-Hant.md) 与 [部署說明](plugin-deployment.zh-Hant.md)。

外掛包的 package.json：

```json
{
  "name": "@example/attachments",
  "version": "1.0.0",
  "type": "module",
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": { "directory": "./web", "entry": "./index.js" }
  }
}
```

manifest.json 必須為靜態 JSON，版本與 package.json 一致：

```json
{
  "schemaVersion": 1,
  "id": "example.attachments",
  "version": "1.0.0",
  "displayName": "Attachments",
  "sdkRange": "^0.2.0",
  "dependencies": [{ "id": "doca.files", "range": "^0.1.0" }]
}
```

僅載入已編譯 JavaScript。依賴必須打包或隨包以真實檔案提供，不執行安裝指令碼、訪問依賴源或編譯外掛。入口必須在包內。`doca.dataVersion` 必填。結構號是否可以改變，見下文「資料結構」。

<a id="sdk-与宿主文件服务"></a>

## SDK 與宿主檔案服務

依賴公開契約，禁止匯入 `@server/*`、`@core/*`、`@web/*`、`@db/*`、同級 Doca 原始碼或全域性橋接。SDK 的服務 ID 在不同安裝副本之間保持一致；執行時由宿主注入實現。

```ts
import { definePlugin } from "@smartdoca/plugin-sdk";
import { filesServiceToken } from "@smartdoca/plugin-sdk/files";
import {
  httpServiceToken,
  usersServiceToken,
} from "@smartdoca/plugin-sdk/platform";
import manifest from "../manifest.json" with { type: "json" };

export default () =>
  definePlugin({
    manifest,
    async uninstall() {},
    injections: {
      required: [filesServiceToken, httpServiceToken, usersServiceToken],
    },
    async mount(context) {
      const files = context.inject(filesServiceToken);
      const users = context.inject(usersServiceToken);
      await context.inject(httpServiceToken).register(manifest.id, [
        {
          method: "GET",
          path: "/folders",
          async handle(request) {
            const user = await users.get(request, request.principal.id);
            const folders = await files.folders.list(
              { principalId: request.principal.id, signal: request.signal },
              { parentId: null },
            );
            return { user, folders };
          },
        },
      ]);
    },
  });
```

該介面實際地址為 `/api/v1/plugins/example.attachments/folders`，身份來自宿主會話。檔案操作重新檢查許可權。檔案業務儲存穩定 file ID 和 owner binding，不儲存本地磁碟路徑。完整資料可透過 users.get 獲取本人或管理員授權的目標使用者，包含聯絡資訊和自定義資料，不返回密碼雜湊及認證金鑰。瀏覽器響應應由外掛按用途裁剪。

<a id="当前公共服务"></a>

## 當前公共服務

| 匯入入口            | 服務                      | 用途                                             |
| ------------------- | ------------------------- | ------------------------------------------------ |
| plugin-sdk/files    | filesServiceToken         | 資料夾、檔案、上傳、內容、繫結及訪問授權         |
| plugin-sdk/platform | usersServiceToken         | 當前授權使用者資料、統一使用者搜尋                   |
| plugin-sdk/platform | permissionsServiceToken   | 註冊業務資源鑑權及使用者關係來源                   |
| plugin-sdk/platform | httpServiceToken          | 已認證、獨立名稱空間的後端路由                   |
| plugin-sdk/platform | policiesServiceToken      | 建立、儲存、分享、轉移及 AI 呼叫前的業務准入     |
| plugin-sdk/platform | eventsServiceToken        | 讀取持久事件流，包括 ai.usage.recorded           |
| plugin-sdk/platform | notificationsServiceToken | 冪等釋出、撤回通知及受權站內跳轉                 |
| plugin-sdk/ai       | aiServiceToken            | 註冊帶 JSON Schema 的 AI 工具和 skill 手冊       |
| plugin-sdk/content  | contentServiceToken       | 統一內容清單、讀取、定位、可選搜尋及知識訂閱來源 |
| plugin-sdk/platform | activityServiceToken      | 外掛自管最近訪問，宿主彙總與鑑權                 |
| plugin-sdk/search   | searchServiceToken        | 投影、重建與授權索引查詢                         |

註冊 ID 必須以外掛 ID 加點開頭。路由 namespace 必須等於外掛 ID。這些公共註冊自動歸屬外掛生命週期，關閉或啟動失敗時回收；自建定時器、連線仍用 context.effect/effectAsync 回收。關閉不刪除持久資料。

目錄來源返回當前有效使用者關係。宿主統一執行管理員 all/related/none 策略，並過濾有效使用者；來源錯誤不擴大可見範圍。可搜尋不等於可以讀取資源。來源使用 schemaVersion: 1、分頁 related 和當前事實 verify，外掛自行維護關係索引；分頁、超時和候選複核見交接文件。

AI 工具透過 `aiServiceToken.registerTool` 註冊，包含 id、description、inputSchema 和 execute。execute 獲得認證使用者、turnId、jobId、callId、signal；只有真實聊天執行才提供 sessionId，不能繞過檔案許可權。`registerSkill` 接收 id、name、description、content、formats；手冊進入宿主技能庫。業務工具必須自行校驗業務資源許可權，在外掛資料庫儲存跨重試穩定的操作 ID 做副作用冪等；callId 可用於關聯呼叫，但不能假定新呼叫會複用舊 callId。檔案/資料夾建立應傳穩定 idempotencyKey；上傳建立同時傳 uploads.complete 返回的 contentIdentity。使用 files.receipts.get 查詢持久回執；pending 可重試、異參為 409，已刪除結果不能借重放重建。完整協議見 SDK 契約第 7.1 節。

Doca 不內建會員、貨幣價格、積分或業務額度。模型管理中的輸入/輸出速率和每張圖片 Token 只負責把廠商原始用量統一折算為 Token，不是最終售價。用量記錄區分未確認呼叫與實際指標；`ai.usage.recorded` 在結算事務內寫入持久事件，頂層 `metrics` 是已折算用量，`provider.metrics` 保留廠商原始事實。外掛透過 events.read(cursor, limit) 拉取，持久儲存消費位置並按事件 ID 冪等處理。策略 check 可以拒絕呼叫；跨外掛預留、失敗補償和資金一致性尚未提供完整事務協議，不能將一次 check 當作完整計費實現。

外掛負責業務模型、授權、任務邏輯和 outbox 語義；持久狀態全部透過宿主公共服務儲存。外掛不選擇本地/遠端後端，不連線私有資料庫、不讀取儲存憑證、不向系統目錄持久化。目前提供 storage.sql.v1 與 storage.objects.v1；data.v1/data.v2 不可用。憑證已在 SDK 原始碼 0.1.8 實現，臨時工作區仍待實現，不能自帶儲存作為替代。

<a id="宿主托管持久化"></a>

## 宿主託管持久化

所有安裝包（包括無獨立狀態的外掛）必須宣告 `doca.storage: "host"`。這是遵守託管儲存契約的宣告，不是庫名或後端選擇。靜態檢查在解析/匯入服務端入口前執行，覆蓋 ZIP、npm/商店安裝、離線目錄匯入、共享歸檔恢復和打包工具；沒有缺欄位預設值或舊儲存適配。宣告是受信任外掛作者的承諾，不構成 Node.js 沙箱或完整程式碼稽核。

不再提供外掛業務資料目錄環境變數或外掛可選的資料路徑。`DOCA_PLUGINS_DIR` 仍是宿主管理的可重建安裝快取，不能存業務資料。本地/遠端後端完全由宿主配置，多例項由宿主保證使用共享資料庫和物件儲存；外掛使用相同的 SDK 方法，不判斷宿主後端。

使用者上傳、附件和匯出成品使用 `files.v1` 資料夾/檔案系統，儲存穩定 ID、繫結並遵循許可權。表記錄、配置、任務、遊標和 outbox 使用宿主託管關係能力，邏輯庫名為 `plugin:<pluginId>`，由可信注入繫結。內部持久二進位制使用宿主內部物件能力，憑證使用宿主憑證能力；其中託管憑證已在 SDK 原始碼 0.1.8 匯出。臨時處理使用流或將來的宿主管理任務工作目錄，具有限制和清理，不持久依賴前一例項的路徑。所需介面與狀態見儲存規範。

<a id="数据结构"></a>

## 資料結構

`doca.dataVersion` 是業務結構的精確標識，不比較大小，也不證明舊檔案可透過新儲存讀取。已安裝升級要求標識相同，實際結構仍須驗證；不匹配明確拒絕。不自動遷移、降級、補舊欄位、匯入舊目錄或雙讀雙寫。舊自管資料保持原樣，不能以託管空庫代替已有業務資料。將來的結構/後端轉換須另行確認方案、驗證和回退。

<a id="卸载"></a>

## 解除安裝

已安裝外掛必須實現 `uninstall(context)`，工廠缺失時拒絕安裝。該鉤子處理業務解綁/外部撤銷，只使用宿主公共服務，重複呼叫必須冪等，不能開啟或遞迴刪除宿主儲存路徑。沒有獨立狀態的外掛可使用空實現。

私有庫與物件由宿主管理：業務解除安裝鉤子成功後，清單事務使當前 generation 失效並持久化私有庫/物件清理意圖，業務表在提交後清理，失敗會重試。憑證託管已實現；叢集業務任務排空仍未實現；所有例項需人工重啟。鉤子失敗保留安裝狀態，外部副作用不能自動回滾。使用者檔案和其他業務引用保留，不以解除安裝替代資料遷移。

禁用、停機和 `dispose` 只回收註冊、計時器和連線，不刪除持久資料。外掛移除不自動刪除使用者檔案、文件載荷、其他業務仍使用的繫結或檔案持久回執。檔案清理必須走檔案服務，校驗歸屬、授權與其他引用。

<a id="web"></a>

## Web

`host.ai.open(input)` 可攜帶提示詞、普通文字上下文、授權文件引用和現有檔案附件啟動個人助手。`sessionId` 開啟當前使用者的已有會話，省略時新建。預設預填可編輯輸入框，僅顯式 `autoSend: true` 才透過正常宿主任務佇列提交訊息。Web 和 App 原生外掛容器共用型別化 SDK 方法。詳見[引數、限制和示例](plugin-assistant.zh-Hant.md)；原始碼支援不代表 npm 已釋出或真機已驗收。

可選 Web 產物預設匯出 `async host => bundle`，host 提供 React、apiBase、useEnvironment、navigate、toast、confirm、request 和 FilePicker。React 從 host 注入，避免重複 renderer；其他依賴須打入瀏覽器產物，不要求宿主解析 npm 裸路徑。bundle 遵循 `@smartdoca/plugin-sdk/web` 匯出的 WebPluginBundle，manifest.pluginId/version 與服務端一致，支援頁面、導航、管理和設定貢獻。

宿主從 `/api/v1/plugin-assets/{id}/{version}/` 提供宣告目錄。首次啟動在掛載前載入註冊；已有頁面快取的文件立即掛載，外掛發現在後臺複用同一次實時啟動請求。導航和路由訂閱在註冊到達後重新整理，不重建文件。只載入服務端當前宣告的版本化資源，頁面後設資料不是快取的外掛包或授權介面卡。外掛載入錯誤隔離並記錄，禁止暴露服務端包檔案。貢獻 render 已加入錯誤邊界；通用目錄樹插槽尚待補齊。

<a id="构建与验证"></a>

## 構建與驗證

宿主倉庫執行 `pnpm build:plugin-sdk` 生成 SDK、契約和檔案能力包的 JS 與 d.ts。釋出到 npm 的包名是 `@smartdoca/plugin-sdk`，以及它再匯出的契約包。`publishConfig` 指向 `dist`。安裝外掛時依賴這些釋出產物，不要依賴倉庫原始碼。

至少驗證獨立安裝、無外掛啟動、依賴衝突、跨使用者拒絕、版本衝突、呼叫冪等、撤銷關係、兩個宿主例項隔離和關閉回收。測試使用獨立資料庫、使用者和文件。介面文案遵循 [語言規範](i18n.zh-Hant.md)，編輯器遵循 [整合規範](editor-integration.zh-Hant.md) 和 [協同規範](collaboration-sdk-contract.zh-Hant.md)。

HTTP 回撥、附件繫結授權、使用者校準、搜尋與知識介面，以及 Mobile 接入邊界，見 [郵箱外掛交接](plugin-mail-handoff.zh-CN.md)。

<a id="接入范围与交付门槛"></a>

## 接入範圍與交付門檻

`search.v1` 保留投影與授權查詢能力。新的通用內容、全域性內容檢索和知識訂閱接入統一使用下文 content.v1；外掛負責業務資料與實時許可權，宿主負責明確訂閱後的排程、分塊指紋及派生內容訪問控制。

交付驗收需用實際宿主交付物、SDK 和業務外掛 tgz，在倉庫外的隔離環境安裝啟動。預備完整依賴閉包，禁止依賴原始碼連結、未宣告快取或安裝/啟動時訪問包倉庫；實際驗證 Web 資源載入、業務流程、撤權、失敗重試和重啟恢復。SDK 構建及匯入成功僅是基礎驗證，不可替代端到端驗收。

外掛資料庫只接受宣告的結構版本（包括已有相容資料），結構不匹配時拒絕啟動，不執行升級或降級指令碼。解除安裝要求見上文「解除安裝」。使用者刪除協議尚未提供。動態 WebView 的受限會話與實際可用介面見郵箱外掛對接手冊 v1。不提供外掛可選的資料目錄；持久化透過宿主作用域能力，未實現部分單獨列明。

<a id="后台身份复核与通知"></a>

## 後臺身份複核與通知

`users.status(userId)` 為可信服務端任務返回當前 `{id, status}` 或 null。非 active 時停止業務操作；賬號有效不代表擁有業務資源許可權。

`notificationsServiceToken` 匯出 `notifications.v1`：`publish(pluginId, {recipientId, key, title, body, path, resource: {type, id}})` 和 `withdraw(pluginId, {recipientId, key})`。宿主限制只能使用自己的 pluginId。key 非空且最多 200 字元，按外掛和收件人隔離；同引數重放返回同一 `{id}`，異參返回 409，已撤回返回 410。外掛在自己的 outbox 中保證先發布後撤回。

資源型別在 permissions.v1 註冊並實現 `notification.read`。釋出、列表、未讀數和點選均複核當前許可權；來源缺失、禁用、失敗或超時均拒絕。標題和正文為純文字，分別最多 200 和 2000 字元。path 使用 `/mail/<id>?message=...` 這樣的站內路徑，不含 origin 或 hash。連結先經過宿主鑑權端點再跳轉，外掛頁面及 API 仍須自行鑑權。

本例項釋出後實時重新整理 Web，Web 每 30 秒對賬其他例項的通知。這是站內通知，不包含 SMTP、移動推送或桌面通知。

HTTP 註冊預設限制請求體 1 MiB；需要附件等大請求的單條路由可指定 `bodyLimit`（位元組），最大 32 MiB。外掛仍需校驗附件數量、實際解碼大小及業務總量。

<a id="首页最近访问"></a>

## 首頁最近訪問

外掛透過 `@smartdoca/plugin-sdk/platform` 的 `activityServiceToken`（`activity.v1`）註冊最近訪問資料來源，自己管理記錄、刪除清理和業務許可權，宿主統一分頁、來源篩選與圖示展示。必須註冊 `activity.read` 許可權並宣告所需服務。完整介面、排序/遊標協議和接入示例見 [外掛接入首頁最近訪問](plugin-activity.zh-Hant.md)。

<a id="统一内容：读取、搜索与知识库订阅"></a>
<a id="统一内容读取搜索与知识库订阅"></a>

## 統一內容：讀取、搜尋與知識庫訂閱

使用 `@smartdoca/plugin-sdk@^0.1.9`。從 `@smartdoca/plugin-sdk/content` 匯入 `contentServiceToken` 与 `ContentSource` 型別，在 `injections.required` 宣告服務，並在 mount 中註冊來源。來源歸屬註冊它的外掛；內建文件和檔案也使用這套契約。

| 成員                                          | 契約                                                                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 來源宣告                                      | `id`、`pluginId`、`version: 1`、中英文 `title`、`contentTypes`、`purposes`、`capabilities: {search}`、`configSchema`                                                       |
| `list(ctx, {config, cursor, limit})`          | 必需。返回 `{items, nextCursor, snapshot}`。每項含 `ref: {sourceId, resourceId, blockId}`、`fingerprint`、`title`，可選 `order`、`anchor`、`excerpt`；此處不返回完整正文。 |
| `read(ctx, {config, ref, fingerprint})`       | 必需。重新鑑權後返回清單項及 `text`，不可用返回 null；指紋變化報衝突，不能在舊指紋下返回新正文。                                                                           |
| `resolve(ctx, ref)`                           | 必需。重新鑑權並返回 `{path, fingerprint}` 或 null；path 是當前可開啟的站內位置。                                                                                          |
| `search(ctx, {config, cursor, limit, query})` | 可選，宣告與實現必須一致。返回輕量分頁結果；不支援時宿主不會自動全量掃描代替。                                                                                             |

`ctx` 包含宿主認證的 `principalId`、`purpose`（knowledge、analysis、search）和取消訊號 `signal`。來源每次呼叫都檢查當前業務許可權。宣告 analysis 的來源可供未來待辦外掛分析，不需要郵箱專用查詢介面。消費方先呼叫 `sources(ctx, purpose)`，再呼叫服務的 list/read/search 並傳入 sourceId、purpose；服務 resolve 接受 `{ref, purpose}`。只能使用來源已宣告的用途。

分頁從 null 開始，以 nextCursor=null 結束；同一輪所有頁必須屬於一致的 snapshot，過期就失敗，不能靜默切換資料繼續。這是遍歷當前有權訪問的全量清單所用的分頁遊標，不是持久增量日誌。本契約不要求、也不匯出 listChanges/readChanges。外掛可自行同步業務系統，但宿主不規定它的內部同步實現。

知識庫複用現有訂閱與排程體系，由使用者明確選擇來源、知識庫和配置。宿主儲存引用與分塊指紋，完成清單核對後僅拉取和分析新增、變化的正文，不額外存一份完整來源正文映象；未變化的塊不重複讀取。只有完整、一致的清單才能認定刪除，失敗或不完整的遍歷不能確認刪除。塊身份不能依賴整篇文件的修訂號或段落位置序號。

原內容刪除、解綁、撤權或來源不可用時，派生知識暫停普通使用者的新讀取、列表展示、搜尋及回答檢索，保留內容供管理員處理，人工編輯過的結果也遵循此規則。已送達的內容不會被追回，已開啟的協同連線也不在即時斷開的承諾內。配置介面支援基礎欄位、列舉和字串陣列；複雜配置由外掛介面處理。本次沒有資料庫結構遷移、雙讀雙寫或舊來源適配。SDK 仍匯出 knowledge.sources.v1，但新接入使用 content.v1，舊註冊不會自動變成新訂閱。

限制：每頁 100 項、每輪清單 100,000 項、單塊正文 200 萬字元、每輪分析變化正文 120,000 字元、來源呼叫 20 秒超時。超限或不完整時明確失敗，不能截斷後宣稱完成。HTTP 入口為 `/api/v1/content/sources` 与 `/api/v1/content/{list,read,resolve,search}`；詳細請求及訂閱路由見[內容協議](plugin-content.zh-Hant.md)。

<a id="app-持久缓存与附件"></a>

## App 持久快取與附件

Web 與受限移動 WebView 複用外掛 Web 產物。`@smartdoca/plugin-sdk/web` 的 `PluginWebHost.native` 在 Web 中為 null，App 中提供原生能力；型別從 `@smartdoca/plugin-sdk/native` 匯出。

- `native.storage` 提供 get/set/remove/clear，字串快取按伺服器、登入使用者和外掛隔離；單值 200 萬字元、每外掛 2000 萬字元。退出或移除賬號會清理該賬號快取。外掛主動接入，不遷移 IndexedDB，不承諾離線冷啟動。
- `native.attachments.save/share` 接收 `{path, name, mime}`（path 為外掛 API 相對路徑），由原生側帶認證下載，不向 WebView 暴露原生憑證；禁止重定向，最大 32 MiB，並清理臨時檔案。
- Android 儲存可返回 completed/canceled；iOS 儲存和系統分享的 presented 僅表示展示系統面板，不代表操作完成。切換賬號或頁面銷燬會取消進行中的請求。
- 郵箱繫結作為 Web 能力，當前不實現原生 OAuth。

當前 SDK 版本是 0.1.11，npm 釋出記錄見下文。宿主測試和構建不能替代獨立郵箱包聯調、iOS/Android 真機驗收，這兩項仍待完成；詳細契約見[原生能力](plugin-native.zh-Hant.md)。

<a id="分发与导航"></a>

## 分發與導航

完整 npm tgz 用於商城釋出或「外掛商店 → 設定」中的指定包名/版本安裝；本地上傳使用根目錄含 package.json 的 ZIP，不能直接上傳 tgz。兩種產物都必須包含編譯產物和完整執行依賴，宿主不執行 npm install 或安裝指令碼。安裝、升級、禁用和解除安裝在各例項重啟後生效。解除安裝行為見上文「解除安裝」。

導航是全域性配置，分為 Web 使用者入口、App 使用者入口、Web 管理員入口。使用者頁面與管理頁面不得混用；外掛宣告頁面用途和支援平臺，管理員在對應範圍選擇入口。外掛頁面會標記來源；同一入口不應在側欄和更多里重複展示。詳情見[分發、WebView 與導航](plugin-mail-integration-v1.md)及[商城協議](plugin-store-protocol.zh-Hant.md)。

<a id="公共读取与多位置展示（sdk-014）"></a>
<a id="公共读取与多位置展示sdk-014"></a>

## 公共讀取與多位置展示（SDK 0.1.4）

新增使用者目錄、原生文件快照、知識庫目錄、`host.platform`、`host.ui` 及可選 commands/views/placements 的實際匯出和接入示例見[外掛公共讀取與多位置展示](plugin-extensions.zh-Hant.md)。使用新方法的外掛宣告最低 `sdkRange: "^0.2.0"`；當前只註冊常規頁面的外掛無需新增註冊。

<a id="模板与素材插件"></a>

## 模板與素材外掛

SDK 0.1.5 新增可選的創作資源提供者／消費者、公共客戶端和宿主注入選擇器；見[準確契約](creation-resources.zh-Hant.md)。宿主沒有預設來源，外掛按自身名稱空間與生命週期註冊，業務消費者自行校驗操作許可權。

多來源選擇和 AI 檢索使用 0.1.6 原始碼修訂：查詢傳 providerIds，宣告本地化來源說明；檢索 modes 宣告與 retrieve 方法成對提供。宿主提供來源發現、有限結果聚合和 AI 工具，搜尋引擎由提供者選擇。按已確認協議變更拒絕舊查詢單值欄位。結果和選擇回撥均可獲取來源後設資料，見[入參與邊界](creation-resources.zh-Hant.md)。

<a id="文档插件元素（2026-10-02，sdk-016-源码）"></a>
<a id="文档插件元素2026-10-02sdk-016-源码"></a>

## 文件外掛元素（2026-10-02，SDK 0.1.6 原始碼）

已實現 Web bundle 可選的 `elements` 註冊以及 `@smartdoca/plugin-sdk/editor-elements` 匯出，支援富文字原子行內元素、表格整單元格畫布展示及配置表單。宿主透過原生命令與撤銷提交配置，不向外掛開放任意編輯器控制代碼。未知型別或版本顯示異常佔位，保留原始 JSON；不轉換、不遷移、不清理資料。預設不安裝提供方。詳見[精確元素契約](plugin-editor-elements.zh-Hant.md)和[獨立倒計時/新聞連結示例](../examples/plugin-elements/README.md)。原始碼驗收不表示 npm 釋出、生產安裝或移動真機驗收。


素材集查詢已在 SDK 原始碼 0.1.9 實現：materials.v2 / version:2 提供者，素材和集合獨立結果組、分頁、標籤和檢索；集合後設資料不內嵌成員。按使用者確認不適配 materials.v1，不遷移既有檔案/文件。集合管理與業務儲存由外掛實現，所有持久化仍使用公共宿主託管能力。詳見[資源協議](creation-resources.zh-Hant.md)。


SDK 原始碼 0.1.10 已匯出通用 `ai.continuations.v2`，外掛透過公開入口登記等待並在提交後臺結果後喚醒助手；只處理顯式新等待，不遷移歷史任務。參見[接入協議](plugin-ai-continuations.zh-Hant.md)。原始碼實現不代表 npm 釋出或生產部署。

<a id="监控与遥测（sdk-0111）"></a>
<a id="监控与遥测sdk-0111"></a>

## 監控與遙測（SDK 0.1.11）

`@smartdoca/plugin-sdk/monitoring` 匯出 monitoringServiceToken、telemetryServiceToken，Web 透過管理員專用的 `host.platform.monitoring` 讀取。宣告 required 服務和 `sdkRange: "^0.2.0"`，使用公共服務採集全站/線上統計、HTTP 指標、日誌、審計、任務、AI 用量和健康。長期歷史透過託管儲存儲存。具體介面、限制和已確認的資料/版本處理見[監控契約](plugin-monitoring.zh-Hant.md)。不增加主資料庫遷移或舊宿主適配。

<a id="sdk-发布--2026-10-13"></a>

## SDK 釋出 — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` 已釋出至 npm。公共登錄檔依賴消費者檢查全部 16 個入口、監控與遙測 token 以及準確 SDK 版本；這不代表生產監控外掛或移動裝置驗收完成。
