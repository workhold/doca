<a id="doca-插件商城交互协议-v1"></a>

# Doca 外掛商城互動協議 v1

[English](plugin-store-protocol.md)

更新：2026-09-30。**遠端商城開發以本文為準。** 本文替換此前“全量目錄 + 商城託管 ZIP”的草案，不需要相容舊介面。

狀態：ZIP/npm 安裝、共享歸檔、多例項啟動補齊、遠端分頁、更新檢查、詳情和導航/App 宿主已接入原始碼。外部商城與獨立外掛仍需按本文的驗收清單聯調；原始碼實現不等於所有外部服務已經上線。當前 SDK 為 `0.1.9`；版本示例應與實際安裝宿主及包匯出核對。

<a id="_1-职责和部署"></a>
<a id="1-职责和部署"></a>

## 1. 職責和部署

- npm registry 分發完整、預編譯的外掛包。商城不提供 ZIP 下載介面，但稽核系統必須檢查具體 npm 包位元組。
- 遠端商城維護外掛資料、分類、版本目錄、稽核/撤回狀態、點贊與下載統計、富文字詳情。
- Doca 維護管理員許可權、安裝事務、完整性校驗、共享歸檔、執行版本、Web/App 入口和佈局配置。
- 點贊、GitHub 登入均在遠端網站完成。Doca 只展示點贊量，並在使用者點選後提示開啟新頁面；不收取遠端登入憑據，不實現點贊 API、OAuth 回撥或賬號繫結。
- Doca 仍支援手動 npm 安裝和本地 ZIP / 目錄安裝。目錄外安裝標為“未經官方稽核”；下載自 npm 本身不等於官方稽核透過。

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGIN_NPM_REGISTRY=https://registry.npmjs.org
DOCA_PLUGINS_DIR=/data/plugins
```

兩個地址都是 HTTP(S) origin，不允許憑據、路徑字首、query 或 fragment。空值使用預設值。首版不支援私有 registry 登入。Doca 服務端代理全部商城 API 請求，不向遠端轉發瀏覽器 Cookie、Authorization、使用者 ID 或業務資料；遠端無需開放瀏覽器 CORS。

API 字首 `/api/v1`。JSON UTF-8，響應帶 `protocolVersion: 1`。時間為 UTC ISO 8601，計數為非負安全整數，未知計數為 `null`，不能以 0 代替未知。所有介面公共只讀，無需商城登入。

<a id="_2-公共类型"></a>
<a id="2-公共类型"></a>

## 2. 公共型別

<a id="pluginsummary：卡片资料"></a>
<a id="pluginsummary卡片资料"></a>

### PluginSummary：卡片資料

```json
{
  "id": "example.mail",
  "name": "邮箱",
  "summary": "收发邮件与管理多个邮箱账号。",
  "author": { "name": "Example", "url": "https://github.com/example" },
  "categoryId": "productivity",
  "icon": null,
  "detailPath": "/plugins/example.mail",
  "targets": ["web", "mobile"],
  "review": "approved",
  "official": false,
  "latestVersion": "1.2.0",
  "downloads": { "count": 1234, "period": "last30Days", "source": "npm", "asOf": "2026-09-30T00:00:00Z" },
  "likes": { "count": 42, "asOf": "2026-09-30T00:00:00Z" },
  "updatedAt": "2026-09-29T12:00:00Z"
}
```

約束：

- `id`：與安裝包 manifest.id 相同，匹配 `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`，最多 100 字元。
- `name` / `author.name`：1–160 字元；`summary`：最多 300 字元，均為純文字。
- `author.url`：HTTP(S) URL 或 null，僅供使用者點選，不由宿主自動抓取。
- `categoryId`：1–60 字元，`[a-z0-9-]+`；分類列表單獨獲取，不從當前頁推導。
- `icon`：PNG data URL 或 null，編碼後總長不超過 24 KiB；不接受 SVG、指令碼或遠端圖片 URL。
- `detailPath`：商城同源絕對路徑 `/plugins/<id>`；由 Doca 拼接配置的商城 origin，禁止外部 origin、query、fragment、路徑穿越。開啟新頁使用 `noopener,noreferrer`。
- `targets`：非空且去重的 `web` / `mobile` 陣列。mobile 指 App 內受控 WebView 頁面，不是動態原生程式碼。
- `review`：`approved | suspended`。列表預設僅返回 approved；詳情允許 suspended。
- `latestVersion`：最新稽核透過的穩定版本或 null，**不代表對當前 Doca 可安裝或可升級**。
- npm 近 30 天下載數是包下載統計，不是 Doca 安裝人數，也不是具體版本下載數。
- 未提供統計時仍返回物件：count/asOf 為 null。列表不返回富文字正文、歷史版本陣列、npm tarball 或完整導航配置。

<a id="release：一个不可变版本"></a>
<a id="release一个不可变版本"></a>

### Release：一個不可變版本

```json
{
  "pluginId": "example.mail",
  "version": "1.2.0",
  "sdkRange": "^0.1.9",
  "dataVersion": "1",
  "targets": ["web", "mobile"],
  "mobileHostRange": "^1.0.0",
  "dependencies": [],
  "changelog": "Improve mail synchronization.",
  "review": "approved",
  "reviewedAt": "2026-09-29T12:00:00Z",
  "publishedAt": "2026-09-29T10:00:00Z",
  "npm": {
    "registry": "https://registry.npmjs.org",
    "name": "@example/doca-mail",
    "version": "1.2.0",
    "integrity": "sha512-BASE64_OF_SHA512_DIGEST",
    "size": 12345
  }
}
```

示例摘要是佔位值；實際必須為 SHA-512 的 64 位元組摘要，標準 base64，單個 SRI 值。`npm.size` 為準確 tgz 位元組數，1–33,554,432。`npm.version`、Release.version、package.json.version、manifest.version 必須一致。

`version` 採用三段 semver，可含 prerelease，不含 build metadata；最多 100 字元。`sdkRange` 與外掛 manifest 完全一致；當前 SDK 版本 0.1.9，支援 `*`、精確值、`^`、`~`。`mobileHostRange` 在 targets 含 mobile 時必填，表示移動外掛宿主協議版本（首版 1.0.0），不是 App 商店構建號。Doca SDK 與移動宿主協議分別判斷。

`dataVersion` 为 `[a-zA-Z0-9._-]{1,80}`，不比較大小；首版升級必須完全相同。dependencies 為最多 100 個 `{id,range,optional?}`，屬於 Doca 外掛依賴，不是 npm dependencies。首版不自動安裝依賴外掛。

版本 review 為 `approved | withdrawn`；撤回後禁止新安裝，不自動解除安裝已執行版本。即使 npm 釋出了更高版本，未經稽核的版本也不能出現在官方更新推薦中。

商城稽核繫結 `(pluginId, npm.registry, npm.name, version, integrity, size)`；不得同版本換包。作者、下載量、點贊量、稽核撤回狀態可以更新，包內容及其能力宣告不可變。

<a id="_3-分类"></a>
<a id="3-分类"></a>

## 3. 分類

`GET /api/v1/categories?locale=zh`

```json
{"protocolVersion":1,"items":[{"id":"productivity","name":"效率工具","count":12}]}
```

最多 100 個分類。locale 僅 `zh | en`，預設 zh；沒有譯文時返回預設文案。count 為當前已稽核可見外掛總量或 null，不受列表當前搜尋條件影響。

<a id="_4-插件列表：服务端分页、搜索、排序"></a>
<a id="4-插件列表服务端分页搜索排序"></a>

## 4. 外掛列表：服務端分頁、搜尋、排序

`GET /api/v1/plugins?q=mail&category=productivity&target=mobile&sort=downloads&limit=24&locale=zh`

| 引數 | 規則 |
| --- | --- |
| q | 可選，修剪後最多 100 字元；搜尋名稱、簡介、作者、plugin id、npm 包名；遠端實現匹配 |
| category | 可選分類 ID，省略為全部 |
| target | 可選 `web` / `mobile`，省略不限 |
| sort | `updated`（預設）、`downloads`、`likes`、`name` |
| limit | 1–48，預設 24 |
| cursor | 可選不透明遊標，最多 2048 字元 |
| locale | zh / en，預設 zh |

```json
{
  "protocolVersion": 1,
  "items": [],
  "page": { "nextCursor": null, "total": 0, "snapshotAt": "2026-09-30T00:00:00Z" }
}
```

items 為 PluginSummary&#91;&#93;，不超過 limit。total 為匹配總數或 null；nextCursor 為 null 表示末頁。客戶端“載入更多”只追加當前查詢的結果；更改搜尋、篩選、排序後清空遊標重新請求，取消舊請求或忽略舊響應，不能把不同查詢結果混合。

排序：updated 按 updatedAt 降序；downloads 按近 30 天下載量降序；likes 降序；name 按本地化名稱升序；均以 id 升序穩定打破平局。未知統計排在已知之後。

遊標必須繫結規範化查詢、排序及結果快照；後續分頁保持 snapshotAt。快照至少有效 15 分鐘，防止統計變化導致翻頁重複或漏項。過期返回 410 `cursor_expired`，客戶端重新開始；引數不匹配返回 400 `cursor_mismatch`。不得讓 Doca 下載整個目錄後自行搜尋、排序或分頁。

單頁響應上限 2 MiB，15 秒超時。可返回 ETag；Doca 只有快取匹配響應時才傳送 If-None-Match，304 使用快取。

<a id="_5-插件详情：资料与只读富文本"></a>
<a id="5-插件详情资料与只读富文本"></a>

## 5. 外掛詳情：資料與只讀富文字

`GET /api/v1/plugins/<id>?locale=zh`

```json
{
  "protocolVersion": 1,
  "plugin": { "id": "example.mail", "name": "见 PluginSummary，实际必须返回完整对象" },
  "description": {
    "format": "doca-slate",
    "version": 1,
    "nodes": [
      { "type": "heading", "level": 2, "children": [{"text":"邮箱插件"}] },
      { "type": "paragraph", "children": [{"text":"支持多个邮箱账号。","bold":true}] }
    ]
  }
}
```

這裡縮寫的 plugin 必須實際返回完整 PluginSummary。詳情不嵌入全部版本；版本另行分頁。正文由遠端使用 slatetsx 編輯、持久化並轉換到下述傳輸結構；Doca 只讀展示，無編輯、儲存或載入遠端編輯器外掛的行為。`doca-slate` 是明確的傳輸子集，不承諾任意 slatetsx 內部節點都可直接傳遞。

<a id="富文本-v1-节点"></a>

### 富文字 v1 節點

- 文字：`{text:string,bold?:boolean,italic?:boolean,underline?:boolean,strikethrough?:boolean,code?:boolean}`。
- paragraph：`{type:"paragraph",children:Inline[]}`。
- heading：同上，另含 level 整數 1–6。
- link：行內 `{type:"link",url:string,children:Text[]}`，僅允許 https/http/mailto，拒絕控制字元、javascript/data URL；外鏈新視窗使用 noopener,noreferrer。
- blockquote：`{type:"blockquote",children:Block[]}`。
- bulleted-list / numbered-list：`{type:...,children:ListItem[]}`；list-item：`{type:"list-item",children:Block[]}`。
- code-block：`{type:"code-block",language?:string,children:Text[]}`，純文字呈現，不執行程式碼。
- image：`{type:"image",src:string,alt:string,children:[{text:""}]}`。src 是 PNG/JPEG/WebP data URL，單張解碼後最多 1 MiB（1,048,576 位元組）；拒絕 SVG、遠端 URL，避免私有地址請求與追蹤。Doca 0.1.5 及更早版本仍受原 256 KiB 上限限制，較大圖片需要更新客戶端後顯示；此調整不遷移或轉換已有資料，回滾客戶端會恢復原顯示限制。詳情響應總計仍不得超過 2 MiB。
- divider：`{type:"divider",children:[{text:""}]}`。

不支援的節點保留安全的文字子節點並提示部分內容無法顯示；未知 format/version 給出明確提示和遠端詳情頁連結，不執行 HTML/JSX。不接受原始 HTML、自定義指令碼、iframe、可執行元件、事件處理欄位。正文最多 5000 節點、16 層、200000 文字字元，詳情響應總計最多 2 MiB。遠端負責轉換表格等尚未支援的型別為段落或圖片。新增節點需協調協議與渲染器。

<a id="_6-版本列表和安装前核验"></a>
<a id="6-版本列表和安装前核验"></a>

## 6. 版本列表和安裝前核驗

`GET /api/v1/plugins/<id>/releases?limit=20&cursor=...`

返回 `{protocolVersion:1,items:Release[],page:{nextCursor,total,snapshotAt}}`，規則同列表，limit 1–48。按 semver 降序，預設含稽核透過的穩定版本；可選 `includePrerelease=true`。明確撤回版本僅透過下面的精確查詢返回。

`GET /api/v1/plugins/<id>/releases/<version>`

返回 `{protocolVersion:1,release:Release}`。安裝操作必須重新獲取精確版本稽核狀態與摘要，不能直接使用過期列表。404 表示未知版本；withdrawn 在 200 響應中明確給出並拒絕安裝。

<a id="npm-下载流程"></a>

### npm 下載流程

1. 驗證 Release.npm.registry 等於宿主配置的 registry（首版預設 npmjs），禁止商城任意指定下載源。
2. 從 registry 獲取精確包版本後設資料：`GET /<encodeURIComponent(packageName)>/<encodeURIComponent(version)>`，不解析 latest/tag/range。
3. 驗證 registry 後設資料 name/version、dist.integrity 與商城稽核的 SRI 一致；下載 dist.tarball。
4. tarball 必須 HTTP(S) 且同 registry origin，無憑據、fragment；不跟隨重定向。後設資料不超過 2 MiB，15 秒；下載不超過 32 MiB，120 秒，校驗大小和 SHA-512。
5. 安全解包 npm tgz，要求根目錄 `package/`，剝離一次；只接受普通檔案/目錄，拒絕符號連結、硬連結、裝置、絕對路徑、穿越、重複路徑。POSIX pax 擴充套件頭（typeflag `x`/`g`，macOS libarchive 與 npm 用來寫 mtime、xattr）跳過，不作為檔案解出，也不採用其中的 path 覆蓋，下一則 ustar 頭的路徑才參與校驗。最大 10000 項、128 MiB 展開量；流式限制解壓大小。
6. 核對 package / manifest / 稽核後設資料，釋出完整歸檔和目標狀態。npm 生命週期指令碼一律不執行，不執行 npm install，也不下載缺失執行依賴。

手動 npm 安裝使用相同校驗流程，摘要取配置 registry 的精確版本後設資料，但沒有官方稽核背書。商城首頁故障不影響手動安裝；已安裝包的啟動不依賴 npm 或商城線上。

<a id="_7-批量检查已安装插件更新"></a>
<a id="7-批量检查已安装插件更新"></a>

## 7. 批次檢查已安裝外掛更新

`POST /api/v1/updates/check`

```json
{
  "protocolVersion": 1,
  "host": { "sdkVersion": "0.1.9", "mobileHostVersion": "1.0.0" },
  "plugins": [
    { "id": "example.mail", "version": "1.0.0", "dataVersion": "1", "npm": {"registry":"https://registry.npmjs.org","name":"@example/doca-mail"} }
  ]
}
```

每批 1–100 個不同外掛 ID，最多 128 KiB。僅提交安裝後設資料，不提交站點標識、使用者、配置、資料內容或業務憑據。超過 100 個由 Doca 分批請求。無 npm 來源的本地包可省略 npm，仍可檢查同 ID 官方版本，但不能默默把其安裝來源切換到官方。

```json
{
  "protocolVersion": 1,
  "checkedAt": "2026-09-30T00:00:00Z",
  "items": [
    {
      "id": "example.mail",
      "installedVersion": "1.0.0",
      "status": "update_available",
      "currentReview": "approved",
      "latestVersion": "1.2.0",
      "release": { "pluginId": "example.mail", "version": "实际为完整 Release 对象" },
      "reason": null
    }
  ]
}
```

每個請求項必須恰好返回一個結果，installedVersion 回顯輸入，避免客戶端把舊響應套用到安裝後的新版本。status：

| status | 意義 |
| --- | --- |
| update_available | 存在更高、已稽核且 SDK/dataVersion/移動宿主協議相容的穩定版本，release 必須為完整 Release |
| up_to_date | 沒有更高的已稽核穩定版本，release=null |
| incompatible | 有更高版本，但無相容候選，release=null；reason 為 sdk / data_version / mobile_host |
| unknown | 商城無此外掛或來源包不匹配，release=null；reason 為 not_found / source_mismatch |

currentReview 為 approved / withdrawn / unknown。當前版本被撤回時單獨提醒，不自動刪除或停用。外掛其他依賴是否已安裝由 Doca 在安裝時再次檢查，遠端更新建議不保證本地依賴圖可滿足。

選擇最高相容版本，而不是隻檢查最新版本。latestVersion 是最高稽核穩定版本，可高於 release.version。Doca 必須自行再次驗證版本、SDK、資料結構及依賴，不能把遠端結論當授權。

Doca 開啟“已安裝 / 可升級”時檢查，提供手動重新整理，可快取 15 分鐘；安裝操作後使該外掛檢查結果失效。失敗顯示“更新檢查失敗/未知”，不能顯示“全部最新”。正在解除安裝的外掛不提示升級。比較的是全域性目標安裝版本，執行版本與待重啟狀態另行顯示。目錄外 npm 包可從 registry 檢查版本，但必須維持“未經稽核”標識且不得自動安裝。

批次響應上限 2 MiB、15 秒。區域性未知以 items 狀態表達；整體網路/限流/格式錯誤使用 HTTP 錯誤，不虛構正常結果。

<a id="_8-安装包及导航声明"></a>
<a id="8-安装包及导航声明"></a>

## 8. 安裝包及導航宣告

npm tgz 內 `package/package.json`；本地 ZIP 內直接為 `package.json`，沒有 wrapper。

```json
{
  "name": "@example/doca-mail",
  "version": "1.2.0",
  "type": "module",
  "files": ["manifest.json", "dist", "web"],
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": {"directory":"./web","entry":"./index.js"},
    "mobileHostRange": "^1.0.0",
    "navigation": [{
      "id": "example.mail.inbox",
      "title": {"zh":"邮箱","en":"Mail"},
      "icon": "mail",
      "webPath": "/plugins/example.mail/inbox",
      "mobile": true,
      "allowedSlots": ["web.left","web.top","web.topRight","web.right","web.user","web.home","web.more","mobile.drawer","mobile.bottom","mobile.topRight","mobile.account","mobile.home","mobile.more"],
      "defaults": ["web.left","mobile.drawer"],
      "order": 60,
      "adminOnly": false
    }]
  }
}
```

外掛必須預編譯並打包完整執行依賴，不允許宿主原始碼別名、全域性橋接或 pnpm 符號連結樹。package.json 必須宣告 `doca.storage: "host"`，缺失/其他值在 ZIP/npm/商店、目錄匯入和啟動恢復時於匯入程式碼前拒絕，不補預設值或適配。服務端預設匯出工廠；Web 預設匯出 `host => bundle`，React 由宿主注入。持久化全部依賴宿主，外掛不選擇本地/遠端、不自建庫或持久目錄。已安裝外掛必須實現業務清理 uninstall，不能自行刪除宿主磁碟路徑；失敗保持安裝。託管儲存能力及清理協調見[儲存規範](plugin-horizontal-scaling.zh-Hant.md)。

導航由靜態 package.json 宣告，id 必須在外掛名稱空間內，webPath 必須位於 `/plugins/<plugin-id>/`；對應頁面仍須在 Web bundle 註冊。navigation 最多 30 項，allowedSlots/defaults 去重，defaults 是 allowedSlots 子集。無 mobile 宣告不得出現 mobile 槽；宣告 mobile 必須提供 Web 頁面及 mobileHostRange。

當前位置還包括 `web.admin` 和 `web.leftMore`。`web.leftMore` 為可顯式宣告的左側更多，原 `web.more` 保持右上角，詳見[讀取與介面擴充套件](plugin-extensions.zh-Hant.md)。web.right 表示右側**入口工具欄**；它不會自動把任意頁面嵌成側邊面板。第一版入口開啟頁面，任意麵板/抽屜元件協議另行定義，不得聲稱已經支援。

管理員在 Doca 內按 Web/App 調整顯示、位置、排序和分組，佈局不是遠端商城配置。外掛只能提供預設值和支援範圍。底部等區域有容量限制，溢位入口進入“更多”；外掛停用後不出現在執行目錄。導航隱藏不撤銷路由/API 許可權，後者仍由宿主與外掛逐請求校驗。

商城稽核需核對 targets 與實際 web/mobile 宣告、sdkRange、dataVersion、dependencies、npm 包身份和版本一致；商城不替代宿主再次校驗。Release 不復制完整導航配置，安裝包是能力宣告的來源。

App 需要先發布包含移動外掛宿主的版本。此後符合協議的頁面透過受控 WebView 載入，不下載執行 React Native 模組。登入使用宿主一次性票據，不把長期 App bearer token 傳給外掛指令碼。App 外掛頁面跳轉與宿主呼叫範圍由開發手冊定義。

<a id="_9-错误、缓存、审核撤回"></a>
<a id="9-错误缓存审核撤回"></a>

## 9. 錯誤、快取、稽核撤回

```json
{"protocolVersion":1,"error":{"code":"not_found","message":"Plugin not found"}}
```

HTTP：400 invalid_request/cursor_mismatch，404 not_found，410 cursor_expired，429 rate_limited（Retry-After 秒數），503 unavailable。message 為純文字，客戶端不依賴它做邏輯判斷。遠端不返回登入 HTML、重定向或堆疊資訊。查詢失敗保留本地管理，顯示可重試錯誤；無法校驗時不得繼續安裝。

詳情及單版本稽核狀態建議快取最長 60 秒；安裝前精確版本請求要求重新驗證，不使用離線快取。稽核不是絕對安全保證，Doca 服務端外掛仍在受信程序執行，不能以“已稽核”宣傳沙箱隔離。

商城內部稽核、作者釋出、GitHub 登入和點贊寫介面由商城自定，不屬於 Doca 對接範圍。釋出順序：先發布 npm 包 → 獲取真實不可變位元組 → 稽核掃描與能力核對 → 釋出 approved Release → 更新摘要和檢索索引。

<a id="_10-多实例与生效时机"></a>
<a id="10-多实例与生效时机"></a>

## 10. 多例項與生效時機

安裝事務將完整包歸檔及全域性目標狀態寫入共享宿主資料庫，各例項使用私有可寫外掛目錄。啟動時逐檔案核驗和補齊，禁止執行半包；啟動不訪問 npm/商城。缺失或損壞的共享歸檔應明確報錯。

安裝、升級、啟用、禁用、解除安裝需逐個重啟例項。管理頁展示響應例項的執行版本，不宣稱叢集全部生效。建議 Docker Compose：`docker compose restart doca`；Kubernetes 等由運維逐例項滾動重啟，API 不相容時需排空舊例項流量。

歷史版本 Web 靜態資源可從共享歸檔補齊，不等於不同版本業務 API 相容。導航佈局釋出後客戶端重新整理生效，無需重啟；外掛能力宣告變更屬於包升級，仍需重啟。當前解除安裝呼叫業務清理 uninstall，成功後清資料版本標記，保留不可變歸檔；宿主託管庫/私有物件清理與代次隔離已實現，叢集業務任務排空仍待實現，不由外掛刪除目錄。

<a id="_11-联调交付清单"></a>
<a id="11-联调交付清单"></a>

## 11. 聯調交付清單

遠端至少提供以下 fixture / 用例：

1. 空列表，超過兩頁的列表，搜尋/分類/平臺篩選，四種排序；遊標過期和引數不匹配。
2. 完整摘要，未知統計，已暫停外掛詳情，合法富文字與未知節點降級。
3. 版本分頁；最新版不相容但存在較低相容更新；所有新版不相容；當前版本撤回；未知外掛/包名不匹配。
4. 已稽核 npm 包及真實 SRI/長度，包被替換、摘要錯誤、宣告不一致、下載重定向、解壓穿越等拒絕場景。
5. 429/503/超時；遠端故障不影響已安裝外掛列表與 App 當前業務使用。
6. Doca 安裝到一個例項，第二例項空目錄且 npm/商城離線時重啟自動補齊；損壞本地快取後修復。
7. Web/App 宣告與導航位置核對；無移動宣告的外掛不出現在 App；資料結構不相容升級拒絕。
8. 點贊按鈕僅開啟配置商城同源詳情頁，不呼叫點贊介面，不啟動 Doca OAuth 流程。

郵箱可直接按 [郵箱外掛對接手冊 v1](plugin-mail-integration-v1.md) 開始。

開發手冊入口：[外掛開發](plugin-development.zh-Hant.md)、[中文外掛開發](plugin-development.zh-Hant.md)、[SDK 能力邊界](plugin-sdk-contract.zh-Hant.md)。這些文件正在隨實現更新；遇到衝突以已匯出的 SDK 型別與本頁遠端協議分別為準，不猜測尚未實現的宿主 API。

<a id="跨仓库验收"></a>

## 跨倉庫驗收

執行 `pnpm exec tsx scripts/verify-plugin-store-contract.ts ../doca-plugin-store`，使用商城實際路由和記憶體資料庫驗證 Doca 客戶端對分類（含零數量）、搜尋、平臺過濾、遊標分頁、詳情、版本、更新及遊標過期的相容性；不會讀寫商城業務資料庫或釋出 npm 包。

當前輔助列表為 `/categories`，不是自由多標籤系統；外掛使用單一 `categoryId`。分類數量為全商城已上架外掛數量，不隨當前搜尋條件變化；列表 `page.total` 為當前查詢快照數量。未知下載/點贊數量顯示破折號，零顯示 0。

商城稽核需檢查與宿主一致的靜態導航欄位：雙語 title（各 1–80 字元）、icon、order、非空 allowedSlots 及合法 defaults，拒絕未知欄位；server 必須為已構建 JS/mjs/cjs 檔案，Web 入口為 JS，manifest 為靜態 JSON。稽核與安裝均不得執行包內安裝指令碼。

<a id="官方身份和版本说明显示"></a>

### 官方身份和版本說明顯示

`PluginSummary.official`（列表和詳情的 `plugin`）為必填布林值，表示商城標註的官方外掛身份，與版本稽核狀態分開。客戶端僅在值為 `true` 時展示“官方外掛”，不能根據安裝來源推斷；缺失欄位的響應視為協議錯誤。

`Release.changelog` 為必填字串，表示該版本的純文字更新說明，版本列表及單版本介面均須返回。空字串表示未提供，客戶端按純文字保留換行展示，不執行 HTML。Doca 接收長度上限為 100000 字元。
