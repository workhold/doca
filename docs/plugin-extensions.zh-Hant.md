<a id="插件公共读取与多位置展示"></a>

# 外掛公共讀取與多位置展示

[English](plugin-extensions.md)

本文描述公共讀取服務及可複用的 Web 操作、檢視和掛載位置。讀取與介面擴充套件最初進入 SDK `0.1.4` 原始碼，文件元素進入 `0.1.6`。當前宿主使用 SDK `0.1.9`，外掛應宣告匹配的 `sdkRange`，例如 `^0.1.9`。使用前檢查實際宿主和 SDK 製品；原始碼實現不等於 npm 製品或部署例項已更新。

<a id="公共服务"></a>

## 公共服務

| 服務 / 匯出 | 當前方法 | 用途與邊界 |
| --- | --- | --- |
| `users.v1` / `@smartdoca/plugin-sdk/platform` | 新增 `me`、`searchPage`、`resolveDirectory`、`validateSelection` | 跟隨管理員使用者覆蓋和系統 none/all/related；搜尋輸出公開展示投影；自身資料獨立讀取 |
| `permissions.v1` | `registerDirectory` | 內部模組與外掛註冊同一 `DirectorySource` 契約；只有 related 呼叫來源，並複核、按使用者 ID 合併 |
| `documents.read.v1` / `@smartdoca/plugin-sdk/documents` | `get`、`readSnapshot`、`capabilities`、`references` | 文件資訊、原生完整內容、當前許可權能力、引用關係；與內部協作服務 `documents.v1` 分開 |
| `libraries.v1` / `@smartdoca/plugin-sdk/documents` | `list`、`children`、`path` | 可發現知識庫、直接子節點分頁、授權祖先路徑；正文另查許可權 |
| `files.v1` / `@smartdoca/plugin-sdk/files` | 已有 folders/files/uploads/bindings/content/receipts | 資料夾結構、檔案資訊、授權內容流、附件繫結、上傳與操作回執 |
| `content.v1` / `@smartdoca/plugin-sdk/content` | 保持 list/read/resolve/search | 純內容檢索、分析和知識訂閱；不替代原生文件結構 |

服務 token 為 `usersServiceToken`、`permissionsServiceToken`、`documentReadServiceToken`、`librariesServiceToken`、`filesServiceToken` 和 `contentServiceToken`。服務端外掛在 `injections.required` 宣告需求，透過 `context.inject(token)` 獲取實現。無新增關係來源時無需註冊。外掛來源 ID 必須屬於自身名稱空間；註冊由外掛 lifecycle 持有，disposer 只釋放執行時貢獻。

`DirectorySource` 保留 schemaVersion 1、related/verify 協議。內建文件和共享資料夾也進入來源登錄檔。none 搜尋返回空，讀取自己用 me；all 直接查詢有效站內賬戶，不呼叫來源。related 並行聚合有效來源，候選經來源複核和賬戶狀態過濾。來源異常、重複遊標、超預算或執行期間登出時不接受該來源的候選。新增分頁結果以 `complete: false` 標識部分來源失敗。預算為每來源 2 秒、40 頁、每頁 250 項。

`searchPage({query,cursor?,limit?})` 返回 `{items,nextCursor,complete}`，limit 為 1–100，預設 20。遊標繫結呼叫者、查詢和有效目錄模式；每頁重新授權。查詢期間目錄策略變化返回 409，重新從第一頁開始。`resolveDirectory({ids})` 与 `validateSelection({ids})` 最多 100 個 ID，按當前目錄重新檢查；發現使用者仍不等於具備共享、指派或業務資源許可權。舊 search 仍返回最多 20 項陣列；可信服務端的舊 list 不進入瀏覽器客戶端。

`readSnapshot({documentId,expectedRevision?})` 返回 `{documentId,format,codec,schemaVersion,revision,epochId,seq,content,assets}`。當前支援 rich_text、markdown、spreadsheet、canvas、presentation；content 是各編輯器當前原生模型（Markdown 是字串），不是摘要，也不是 Yjs 更新位元組。revision 是不透明內容標識，包含實際內容、codec/schema 和 epoch/seq 事實；不是資源標題等後設資料的 version。expectedRevision 不匹配返回 409。富文字已經持久化但尚未建立協作 epoch 時返回 `epochId: null`，不生成 epoch。沒有持久化狀態返回 409，不在讀取中初始化。正文 JSON 超過 16 MiB 明確返回 413。

讀取在一致的事務中恢復持久內容，不混入當前編輯器未儲存修改，不提交正文、歷史或 ACK。assets 僅返回當前授權檔案的穩定 fileId/name/mime，不返回儲存金鑰、物理路徑或持久化臨時 URL。capabilities 表示當前資源的許可權和快照支援情況，不承諾外掛已經具有文件寫入服務。

知識庫 list/children 返回 `{items,nextCursor}`，當前每頁沿用宿主 100 項查詢。children 接受 `{libraryId,parentId,cursor?}`，根層 parentId=null；path 接受 `{resourceId}`。發現與讀取分開：可見節點標題可能 role=none，正文介面仍拒絕訪問。分頁每頁複核，不是凍結庫存；批處理不得據一次不完整遍歷判斷內容已刪除。

<a id="浏览器与-app-webview"></a>

## 瀏覽器與 App WebView

`PluginWebHost.platform` 提供同一應用服務的型別化客戶端：

```js
const page = await host.platform.users.searchPage({ query: "张", limit: 20 });
const self = await host.platform.users.me();
const snapshot = await host.platform.documents.readSnapshot(
  { documentId }, { signal: context.signal },
);
const children = await host.platform.libraries.children({ libraryId, parentId: null });
const folders = await host.platform.files.folders.list({ parentId: null });
```

客戶端 users 包含 me/searchPage/resolveDirectory/validateSelection；documents 和 libraries 包含上述全部只讀方法；files 包含 folders.get/list、files.get/list。其餘檔案寫入、內容流和附件下載仍使用服務端 `files.v1` 或既有附件能力，不把流當作 JSON。

公共呼叫使用認證後的 `POST /api/v1/plugin-platform/{pluginId}/{operation}`，只允許執行中的安裝外掛名稱空間和明確列出的操作。輸入不接受 principal、mode 或任意服務名。響應不快取。舊 `host.request` 仍限定外掛自己的 `/api/v1/plugins/{pluginId}/`，路徑語義沒有擴大。

移動外掛仍使用宿主簽發、限定到單個外掛的 WebView 會話。公共呼叫僅允許該外掛自己的 namespace，後端繼續校驗當前使用者和資源許可權。沒有向外掛交付原生 bearer token。HTTP 會話邊界已在隔離測試驗證；新增卡片和文件掛載位置本輪是 Web 介面，移動原生位置未實現、未做真機驗收。

<a id="操作、视图与位置"></a>
<a id="操作视图与位置"></a>

## 操作、檢視與位置

`WebPluginBundle` 新增三個可選集合：

- commands：可複用操作，包含 id/pluginId/title/supportedContexts/execute。
- views：可複用檢視，包含 id/pluginId/title/supportedContexts/render。
- placements：掛載項，包含 id/pluginId/slot/order?/conditions?，引用一個 commandId 或 viewId。檢視可指定 presentation 為 dialog/drawer/sidebar；不指定則原位渲染。

title 為 `{zh,en}`；ID 必須屬於外掛名稱空間。supportedContexts 為 global/home/document/library/folder/resources。conditions 可按 targets、resourceKinds、formats、capabilities 過濾。平臺支援和可見條件只是展示規則，不能代替服務端授權。重複 ID、非法位置、缺失或跨外掛引用會使整個 bundle 註冊失敗並撤回已註冊貢獻。

僅顯示圖示的操作/檢視入口使用配置的外掛商店中的同一張 PNG 圖示。宿主透過需要登入的 `GET /api/v1/plugin-icons/<id>` 為執行中、具有 Web 資源的商店/npm 安裝提供圖示；本地安裝保留通用圖示。商店詳情沿用現有協議校驗，同一外掛的併發請求共用一次讀取，成功、缺失和失敗結果僅在宿主記憶體快取 60 秒。載入中、商店沒有圖示或圖片載入失敗時保留通用圖示，入口仍可使用。現有外掛 bundle、SDK 版本和持久化資料均不變，無需宣告圖示、轉換或遷移資料；回退宿主程式碼即可恢復原顯示。

| 已接入 Web 位置 | 上下文 |
| --- | --- |
| global.more | 全域性操作；與 web.more 導航共用右上角應用圖示；操作和檢視入口顯示為圖示，懸浮在下方顯示名稱；二者過濾後均為空則隱藏 |
| global.leftMore | 全域性操作；與 web.leftMore 導航共用左側“更多”下拉選單；二者過濾後均為空則隱藏 |
| home.cards / home.actions | 主頁卡片、快捷操作 |
| document.toolbar / document.menu | 文件 ID/格式/當前許可權；一個操作可同時放兩處 |
| document.sidebar / document.status | 文件側欄、狀態內容；窄屏側欄排列到正文下方 |
| library.toolbar / library.nodeMenu | 知識庫入口、目錄節點 |
| folder.toolbar / folder.rowMenu | 當前資料夾或行資源 |
| resource.bulkActions / resource.details | 選中集合（非空時掛載）、文件詳情擴充套件 |

上下文包含 scope/target/locale/resource?/resources?/capabilities/signal，不預設包含正文或整個使用者目錄。宿主提供 resource.read/comment/edit/manage 展示能力；檔案位置暫未提供統一操作能力投影，不要由 capability 缺失推斷訪問授權。

導航管理將 `web.more` 標為“右上角更多”，`web.leftMore` 標為“左側更多”。外掛在服務端導航宣告的 allowedSlots 中明確加入 `web.leftMore` 後，管理員才可將該頁面放入左側下拉選單；內建使用者入口支援兩個位置。`global.leftMore` 是獨立的可選客戶端操作/檢視註冊位置，支援 global 上下文。未指定 presentation 的檢視仍在當前選單內展開，未轉換為彈窗。

2026-10-02 已確認的增量規則：`web.more` 和 `global.more` 保持原註冊名稱與右上角歸屬；舊配置不遷移，舊外掛不自動獲得左側位置。左側更多僅由明確宣告/配置產生，不參與自動溢位。兩個更多可顯式同時配置同一入口，其餘既有去重/溢位規則保持。導航持久化仍使用 schemaVersion=1；回退至不支援新位置的宿主前，須先取消併發布所有 web.leftMore 配置，舊版嚴格校驗不會自動轉換它。外掛使用新客戶端位置或服務端導航位置時也須撤回新位置宣告，或回退到未使用它的外掛版本。

下面是瀏覽器 ESM 註冊示例，不依賴宿主原始碼路徑：

```js
export default host => {
  const pluginId = "example.tools";
  const viewId = "example.tools.preview";
  return {
    manifest: { pluginId, version: "1.0.0", targets: ["web"] },
    views: [{
      id: viewId, pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      render(context) {
        return host.React.createElement("p", null, context.resource.title);
      },
    }],
    commands: [{
      id: "example.tools.open", pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      execute(context) {
        host.ui.openView({ viewId, presentation: "dialog", context });
      },
    }],
    placements: ["document.toolbar", "document.menu"].map((slot, index) => ({
      id: `example.tools.placement${index}`, pluginId, slot,
      commandId: "example.tools.open",
    })),
  };
};
```

檢視使用宿主 React，依賴隨外掛打包；不解析外掛 ESM 的裸 npm 匯入。宿主隔離 render 和子元件錯誤，操作 Promise 的失敗顯示反饋，執行中按鈕禁用。外掛自己建立的事件處理和非同步任務仍應處理錯誤並監聽取消訊號。

原位檢視/操作的 signal 在資源上下文變化或解除安裝時取消。開啟彈窗或抽屜時，宿主將上下文轉交到面板自己的會話，因此觸發選單關閉不會銷燬面板；關閉面板、切換路由或開啟另一面板時取消。舊關閉控制代碼不會關閉後開的面板。這裡只讀資源操作，沒有選區控制代碼或未儲存模型的寫入承諾。

<a id="未实现的后续能力"></a>

## 未實現的後續能力

選區/塊/插入位置、文件修改命令、評論/歷史的公共服務、共享邀請、AI 公共執行、事件欄位範圍和主題貢獻仍需逐項契約與實際實現。讀取與介面擴充套件沒有開放任意全域性 CSS/DOM 改寫，沒有新增佈局持久化、資料庫遷移或舊格式轉換。

模板與素材已透過獨立的[創作資源契約](creation-resources.zh-Hant.md)提供服務，複用公共包、字串 service token、外掛名稱空間、lifecycle/disposer、認證上下文和型別化客戶端，不把原 document_templates 錶轉換為提供方。files.v1 和 content.v1 保持原語義。

<a id="验证"></a>

## 驗證

新增測試涵蓋目錄聚合/撤銷/策略變化、五種原生模型及修訂、無許可權候選後可見記錄分頁、目錄遍歷、註冊撤回、面板取消與舊控制代碼、HTTP allowlist、移動跨外掛會話拒絕。

`pnpm build:plugin-sdk` 生成釋出製品；`node scripts/verify-plugin-sdk.mjs` 將製品複製到臨時獨立 node_modules，執行 JavaScript 並在沒有宿主 paths 的 NodeNext 專案中檢查 .d.ts。驗證沒有 npm 釋出、不會安裝到使用者現有外掛目錄。

隔離示例外掛已在瀏覽器檢查主頁卡片、右上角更多、文件選單/工具欄、桌面側欄與快照彈窗。實際兩個個人外掛和移動真機仍需各自整合驗收。

2026-10-02 的歷史檢查記錄（並非閱讀本文時重新執行）：型別檢查透過；162 個測試檔案全部透過（1021 項透過、3 項跳過）；SDK 構建、獨立消費驗證、Web 構建及 diff 空白檢查透過。

<a id="文档插件元素（2026-10-02，sdk-016-源码）"></a>
<a id="文档插件元素2026-10-02sdk-016-源码"></a>

## 文件外掛元素（2026-10-02，SDK 0.1.6 原始碼）

已實現 Web bundle 可選的 `elements` 註冊以及 `@smartdoca/plugin-sdk/editor-elements` 匯出，支援富文字原子行內元素、表格整單元格畫布展示及配置表單。宿主透過原生命令與撤銷提交配置，不向外掛開放任意編輯器控制代碼。未知型別或版本顯示異常佔位，保留原始 JSON；不轉換、不遷移、不清理資料。預設不安裝提供方。詳見[精確元素契約](plugin-editor-elements.zh-Hant.md)和[獨立倒計時/新聞連結示例](../examples/plugin-elements/README.md)。原始碼驗收不表示 npm 釋出、生產安裝或移動真機驗收。
