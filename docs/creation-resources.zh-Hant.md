<a id="插件模板与素材资源"></a>

# 外掛模板與素材資源

[English](creation-resources.md)

契約基線：SDK `0.1.9`、契約包 `0.1.7`。線上文件建立、外掛公共客戶端、宿主選擇器和 AI 使用同一套資源服務。接入前核對實際包匯出與部署版本；外部服務和移動真機需要單獨驗收。

<a id="本轮已确认的数据处理"></a>

## 本輪已確認的資料處理

移除管理員模板管理入口、舊 `/api/v1/templates` / `/api/v1/admin/templates` API、舊 `templateId` 建立欄位和舊錶 CRUD。`document_templates` 表、索引、定義和已有記錄保持原狀；沒有遷移、刪除、轉換、雙讀雙寫，也沒有將舊錶註冊為預設來源。未知舊欄位明確拒絕。已建立文件保持自己的持久內容與素材。回退可使用上一版構建讀取原表；新資源生成的文件仍是當前原生模型。

新宿主沒有預設模板或素材提供者。只有線上文件消費者 `doca.documents.create`，沒有郵箱/公眾號等業務消費者。官方商城、企業庫、網路服務或資料夾包裝需要另裝資源外掛。本輪未實現商城遠端協議、商城資源後臺或官方內容。

<a id="服务与公共边界"></a>

## 服務與公共邊界

从 `@smartdoca/plugin-sdk/creation-resources` 匯入 `templatesServiceToken` (`templates.v1`)、`materialsServiceToken` (`materials.v2`) 及提供者/消費者型別。在 manifest 宣告包含當前修訂的最低 SDK 版本 `^0.1.9`，透過 `injections.required` 注入。輕量資料契約在 plugin-contracts；宿主業務服務在 core 的 creation-resources 模組。

- 模板：register / providers / tags / search / retrieve / describe / read / registerConsumer / consumers / consume。
- 素材：register / providers / tags / search / retrieve / describe / collectionDescribe / collectionItems / import。
- 服務端註冊在 mount 中執行，返回 disposer，由 scoped lifecycle 自動持有；貢獻 id 為 `${pluginId}.…`。零來源是正常情況。
- 服務按資料庫 runtime scope 隔離，事務繼承同一 scope。來源解除安裝/停止時釋放貢獻，不清理已消費文件和檔案。
- 消費者宣告消費契約和內容型別的精確版本組合、inputSchema 和 execute。模板消費者負責實際業務許可權和副作用；宿主校驗匹配、引數與賬戶狀態。郵件傳送/釋出等動作由業務外掛自己的授權流程處理。

消費者與內容分別描述版本：例如 `{contract:{id:'doca.document.rich_text',version:1}, contentType:{id:'doca.native.rich_text',version:1}}`。線上文件支援 rich_text、markdown、spreadsheet、canvas、presentation。契約均為 v1；presentation 原生內容型別為 v2，其餘為 v1。自定義契約和內容型別使用外掛名稱空間，雙方顯式約定。相同副檔名不構成可消費保證。

<a id="提供者契约"></a>

## 提供者契約

模板提供者宣告 version:1，素材提供者宣告 version:2 及 collections 能力，其餘為 id/pluginId/title/可支援 contracts/contentTypes/sorts；實現 tags、search、describe，以及模板的 read 或素材的 import。每次呼叫獲得宿主身份 principal、requestId 和取消 signal。

`search` 入參是 contract/contentType/query/tags/providerIds/sort/cursor/limit。query 最多 1000 字元。提供者負責關鍵詞匹配與所有標籤的 AND 過濾、當前可發現許可權及按指定排序返回輕量後設資料；不得返回正文。`describe` 再次檢查資源訪問和 revision，隱藏/刪除返回 null。標籤也只能包含呼叫者可發現資源的標籤。

卡片必須包含 ref `{providerId,id,revision}`、title、summary、tags、updatedAt、contract、contentType、parameters、license，模板必須提供 preview，素材的 preview 可選；usage、popularity 可選。preview 必須是模板實際樣式的縮圖，不能使用通用圖示代替，基礎選擇 UI 直接展示在卡片上，點選卡片立即放大檢視，再按需載入原生內容預覽。preview 只接受 PNG/JPEG/WebP data URL，編碼後最多 180000 字元；遠端服務由外掛獲取/校驗預覽後提供，不直接向瀏覽器暴露任意遠端影象。parameters 使用 SDK 已有的 ObjectConfigSchema 子集，並非任意 JSON Schema；宿主拒絕未知 schema 欄位，校驗必填、型別、列舉與邊界。基礎 UI 支援簡單輸入，複合引數使用 JSON 輸入；業務外掛可以自建 UI。

標籤包含穩定 id 和 `{zh,en}` 標題。公共標籤用 `doca.tag.…`（如 `doca.tag.report` / `doca.tag.proposal`）；私有標籤用外掛名稱空間。宿主按 id 去重，不按顯示名稱誤合併。提供者應使用一致的公共標籤文案，不能洩漏不可見標籤。

<a id="排序与分页"></a>

## 排序與分頁

每個來源必須支援 updated/name；可另宣告 usage/popular。跨來源 updated 按時間降序，name 按名稱排序，以 providerId/id 穩定打破平局，宿主歸併有序流。usage/popular 只允許選擇一個來源，數值由該來源定義，不宣稱跨來源統一熱度或宿主全域性使用量。

UI 查詢預設 24、最多 48 項；每次從來源讀最多 24 項，正文按選中後讀取。關鍵詞/標籤/型別/排序/來源變化重新開始。宿主不要求下載全目錄再篩選。

宿主遊標為例項內、不透明且繫結使用者/規範化查詢/來源集合的短期查詢狀態，15 分鐘有效；過期、重啟、來源變化後返回 410，需要重查，不承諾跨例項續頁。最多 500 個未過期遊標、100 個來源、每來源遍歷 10000 項、單次聚合最多 100 次取頁。每次來源呼叫 15 秒，搜尋整體 30 秒預算。快取候選在返回前呼叫 describe 複核訪問和 revision；重複遊標、重複資源、錯序、異常來源報告 failures/complete:false，不用空結果掩蓋失敗。

這是一套 UI 瀏覽分頁，不是凍結庫存、同步刪除清單或持久 change log。需要這些能力的提供者另行定義契約。本輪沒有持久化資源目錄映象、統計表或資源升級遷移。

<a id="读取、素材导入与模板应用"></a>
<a id="读取素材导入与模板应用"></a>

## 讀取、素材匯入與模板應用

模板 read 接收 `{ref,parameters}`，提供者返回 `{contract,contentType,content,assets}`，最多 768 KiB；宿主結果附加 source。資源 revision 變化是衝突；不在舊 revision 下返回新內容。

素材 import 接收 `{ref,operationKey}`。提供者重新檢查許可權，透過 files.v1 匯入或選取已授權檔案，返回 `{fileId}`；遠端匯入必須把 operationKey 用作檔案建立 idempotencyKey，上傳使用 contentIdentity 和回執協議。同一次重試保持相同 key，不能拿臨時 URL 作為長期引用。宿主再次檢查 fileId 當前 ACL，向客戶端返回 fileId/name/mime/size/source。

模板 assets 是最多 100 項 `{key,ref}`，ref 指向素材提供者。內容使用精確 `material:<key>` 字串；Markdown 圖片用 `](material:<key>)`。線上文件建立在寫事務外獲取並複核資源（外掛可能呼叫其他資料庫服務，不能在宿主寫事務內呼叫），在事務內校驗註冊例項仍有效，再在新文件事務中建立宿主附件/檔案引用，替換為本地 asset ID，校驗許可權、提及、大小和當前格式，初始化持久內容。任一初始化失敗回滾新文件和其引用；提供者已經匯入的使用者檔案保留，不作隱式刪除。已有素材檔案仍遵循其正常檔案生命週期。

模板應用只初始化新資源，不覆蓋已有文件、不修改協作協議。移除提供者後已繫結素材及已生成文件繼續由宿主儲存管理。原生預覽支援無素材依賴模板；帶素材依賴時使用提供者的預覽圖，預覽不會隱式匯入素材。

線上文件建立 HTTP：`POST /api/v1/resources` 可帶 `template:{ref,parameters}`，與 markdown/initialContent 互斥。選空白時省略 template。`templates.consume` 的線上文件消費者輸入為 title、可選 parentId/libraryId（根級省略），輸出 id/title/format；普通建立仍用原資源建立入口。業務消費者可複用資源讀服務或消費協議，自行保證業務操作冪等。

<a id="浏览器、插件与-ai"></a>
<a id="浏览器插件与-ai"></a>

## 瀏覽器、外掛與 AI

內部介面使用認證 `POST /api/v1/creation-resources/{templates|materials}/{operation}`；外掛使用 `host.platform.templates` / `host.platform.materials`，後端沿用 `/api/v1/plugin-platform/{pluginId}/{operation}` allowlist 和 scoped WebView 身份通道。不存在任意 service dispatch；舊 host.request 仍只呼叫本外掛 API。

宿主新增 `host.TemplatePicker` / `host.MaterialPicker`（與 FilePicker 同樣注入宿主 React 元件）。TemplatePicker 接受 close/contract/contentType?/select(selection,resource)/blank?，第二個回撥引數是帶 source 的完整卡片；MaterialPicker 接受 close/contentType?/select(file)/accept?，選擇結果包含 source。選擇器只負責選擇和引數收集，實際消費由回撥或業務 UI 完成。外掛選擇器例項使用本外掛公共通道，不跨外掛呼叫 ui.openView。

線上文件建立選擇器固定提供空白建立，之後展示符合格式的全部外掛模板、來源/關鍵詞/標籤/排序、載入更多、預覽和引數。關閉選擇介面不建立文件。沒有來源或來源失敗時仍可空白建立。上傳/資料夾來源對話方塊增加素材庫，選擇後沿用業務現有上傳/插入流程。

AI 使用 creation_resource_providers / creation_resource_retrieve / creation_resource_search / creation_resource_tags / template_describe / template_read / material_import；document_create 接受 template。模板建立保留原 AI 建立審批、資源範圍與回執。素材 import 保留檔案建立審批，返回穩定 fileId；它不是圖片生成回執或 image_insert 的 assetId。業務模板透過對應外掛工具消費。宿主不實現搜尋引擎或語義模型；檢索交給來源的 retrieve。

<a id="验证"></a>

## 驗證

使用隔離資料庫覆蓋：零來源及舊錶保留、舊路徑拒絕、五格式初始化、素材許可權和繫結、標籤去重、排序歸併與分頁、來源異常、賬戶停用、revision 衝突、引數/消費者校驗、外掛歸屬/disposer、例項隔離及 HTTP 身份。SDK 構建與獨立製品驗證包括新子入口、公共客戶端和 UI 型別。外部商城、企業服務和移動真機尚未聯調。

<a id="多来源与-ai-检索修订（2026-10-02）"></a>
<a id="多来源与-ai-检索修订2026-10-02"></a>

## 多來源與 AI 檢索修訂（2026-10-02）

使用者已明確同意將查詢舊單值 `providerId` 改為 `providerIds`。舊欄位在服務、HTTP、公共外掛客戶端和 AI 工具中明確拒絕，不做適配或隱式轉換。資源引用 `{providerId,id,revision}` 不變，模板引數、檔案、文件、外掛業務資料及舊 `document_templates` 表均不遷移或刪除。沒有來源偏好的持久化改造。回退構建須一併回退查詢客戶端；遊標是例項內狀態，重啟或來源變化需重新查詢。

一個提供者對應一個來源，`id` 是穩定身份，`title` 是外掛宣告的名稱，可附帶中英文 `description`（各最多 1000 字元）。同一外掛可註冊多個來源，Doca 不按網路、商城或生成分類或推斷實現。省略 providerIds 查詢全部符合型別的來源，&#91;&#93; 查詢零來源；多個 ID 按 OR，與型別/標籤按 AND。未知或解除安裝 ID 返回 404，絕不擴大範圍。來源發現、列表、標籤和檢索共用這個選擇；遊標繫結去重排序後的來源集合。熱度/使用量要求明確指定唯一來源。

宿主列表與 describe 返回 `CreationResourceResult`：原卡片加上宿主生成的 `source:{id,pluginId,title,description?}`。外掛不能偽造來源。模板 read 與素材 import 的宿主結果也帶 source，提供者自身的 read/import 返回協議不變。來源後設資料是當前註冊資訊，不寫入資源或文件內容。介面展示來源名稱、說明及卡片來源標識。

`templates.retrieve` / `materials.retrieve` 接受：

```ts
{
  query: "找一份适合向管理层汇报季度经营情况的模板", // 非空，最多 1000 字符
  providerIds: ["example.templates.web", "example.templates.company"], // 可省略
  contract: {id: "doca.document.rich_text", version: 1}, // 可选
  contentType: {id: "doca.native.rich_text", version: 1}, // 可选
  tags: ["doca.tag.report"], // 可选，AND
  mode: "auto", // auto | keyword | semantic | hybrid，默认 auto
  topK: 8, // 默认 8，最多 20
}
```

提供者顯式宣告 `retrieval:{modes:["keyword","hybrid"]}` 並同時實現 `retrieve(context,input)`。auto 由提供者選擇已宣告模式並返回實際 mode；明確請求一種模式不得偷偷降級。不宣告能力的來源返回 unsupported，不呼叫 search 遍歷代替檢索。提供者可使用資料庫索引、Meilisearch、向量檢索或遠端 API；Doca 不維護其索引、模型、金鑰或業務同步。

提供者 retrieve 返回 `{items,mode,hasMore}`。items 按本來源相關性排序，包含 ref/title/summary/tags/contract/contentType，可有 matchText（最多 500 字元），不得帶正文、縮圖或引數 schema。宿主核驗來源、型別、標籤、重複 ID、當前許可權及 revision，再附加 source 和來源內部 rank。摘要與匹配說明是資料，不是 AI 執行指令。

一次每個所選來源最多呼叫一次 retrieve，無遊標遍歷。單來源最多取 topK，多來源每個最多取 min(topK,5)。最多 4 個來源併發、整體 15 秒預算、每來源響應最多 100000 位元組。跨來源按本地 rank 與穩定 ID 均衡展示，不比較不同引擎分數，也不聲稱統一全域性相關性。最終不超過 topK 項；sources 記錄成功來源、實際模式、候選數和是否還有候選。failures 用穩定 unsupported/failed/timeout 程式碼報告失敗來源。complete 表示所選來源是否均成功，truncated 表示有未展示候選；空結果不擴大來源範圍。

基礎選擇器頂部平鋪來源、標籤兩行，預設選中“全部”；來源支援多選，標籤單選，選項過多時行內橫向滾動。標籤行末尾的篩選圖示展開關鍵詞/智慧搜尋與排序，搜尋提交後收起面板，結果標題旁展示可清除的搜尋詞。空查詢繼續分頁瀏覽。智慧搜尋展示有限候選並按需獲取卡片預覽，不自動匯入素材。失敗來源和結果上限明確提示。來源可多選或清空，標籤僅來自所選來源。兩類選擇器接受 providerIds 初始選擇及 onSourcesChange 回撥（undefined 表示全部，&#91;&#93; 表示無來源），外掛可把使用者選擇傳給自己的 AI/業務查詢。

AI 先用 creation_resource_providers 按名稱解析來源 ID，再用 creation_resource_retrieve 傳關鍵詞或完整需求句。兩類資源共用工具和當前身份。AI 的檢索結果沒有縮圖，瀏覽工具還移除引數 schema；選中後用 describe/read/import 取詳情。檢索測試覆蓋來源排除、空結果、不支援、失敗、取消、許可權複核、遊標繫結、HTTP、外掛公共通道與實際 AI 工具呼叫。


<a id="素材集修订（2026-10-03，sdk-019--契约-017-源码）"></a>
<a id="素材集修订2026-10-03sdk-019--契约-017-源码"></a>

## 素材集修訂（2026-10-03，SDK 0.1.9 / 契約 0.1.7 原始碼）

使用者確認功能尚未使用，不保留舊素材查詢協議。素材服務改為 `materials.v2` / `MaterialsServiceV2`，素材提供者必須宣告 `version:2` 和 `collections`。舊 `materials.v1` token、素材提供者 version:1、缺少 collections 宣告、舊素材查詢單值 cursor 均拒絕，沒有介面卡、補預設值、雙讀或轉換。模板仍是 templates.v1。檔案、文件內容和資源 ref 不變；不新增宿主素材業務表、不遷移或刪除原表和資料。回退時宿主、SDK、選擇器、AI 工具一起回退，例項內遊標重新查詢。

素材可以屬於零個或多個同來源素材集，用 ref 引用，不復制檔案。集和單項各自打標籤，不繼承；批次上傳、管理集合、維護成員關係、授權和業務資料由提供者實現，透過當前公共託管 SQL/物件/檔案服務持久化，不能自選資料庫或繞過安裝目錄載入。跨來源歸併集合不在本協議內。

素材卡片 / 檢索候選增加必填 `collections: CreationResourceRef[]`（空陣列表示沒有集合）。提供者僅返回當前呼叫者可見的集合引用。集合 metadata 為 ref/title/summary/tags/updatedAt/contracts/contentTypes，可有 preview、count、usage、popularity；count 若提供，必須是當前呼叫者可見成員數，不是總庫存。集合不含正文、parameters、license 或內嵌 items。集合檢索候選去掉 preview/updatedAt/usage/popularity，可有 matchText。宿主統一附加 source；檢索結果再附加來源內 rank。

提供者 `collections: null` 明確表示只提供單項素材；支援集合時提供 `{tags, search, describe, retrieval?, retrieve?}`。這些方法接受當前身份及 signal；列表和集合檢索能力獨立宣告，不能以素材檢索代替集合檢索。集合的 contracts/contentTypes 宣告所含成員可消費型別；型別篩選按任一匹配，其他標籤 AND，成員 collectionRefs 按 OR。同一集合成員變化必須更新集合 revision，並同步素材卡片的集合引用。集合 describe 負責當前許可權/版本；宿主在成員查詢前後及續頁時複核集合，也複核返回的成員歸屬、當前許可權和 revision。

公共查詢示例：

```ts
const page = await host.platform.materials.search({
  query: "夏日配色", providerIds: ["example.palette.library"],
  tags: ["doca.tag.color"],           // 只筛素材
  collectionTags: ["doca.tag.theme"], // 只筛素材集
  target: "all",                    // all（默认）| materials | collections
  limit: 24,                        // 各组独立上限，最多 48
  cursors: { materials: null, collections: null },
});
// { materials: {items,nextCursor,complete,failures}, collections: {...} }
const members = await host.platform.materials.collectionItems({
  ref: page.collections.items[0].ref, limit: 24, cursor: null,
  query: "红色", tags: ["doca.tag.color"],
}); // 单一素材分页，不内嵌后续成员
const related = await host.platform.materials.retrieve({
  query: "适合夏日海报的暖色背景", target: "materials",
  collectionRefs: [page.collections.items[0].ref], topK: 8,
});
```

`search` / `retrieve` 返回固定 materials、collections 兩組，各自完成狀態、失敗和遊標/截斷標識，不混排也不重複內嵌成員。target 指定一組時另一組為空且完整；不會呼叫另一組搜尋。兩組遊標互不可用，可用 target 只續一組；limit/topK 分別作用於每組，不是二者合併上限。省略 collectionRefs 查所有素材，&#91;&#93; 查零素材；使用 collectionRefs 時必須顯式 target:materials。明確的 providerIds 不能排除集合所屬來源，否則 400；未知來源 404。`tags` 返回 `{materials,collections}` 兩組獨立標籤頁。`collectionDescribe(ref)` 只取後設資料，`collectionItems({ref,...})` 返回單組素材頁；query/tags/contract/contentType/providerIds/sort/cursor/limit 同基礎瀏覽契約。

`retrieve` 支援相同來源、型別、素材/集合標籤篩選，以及 query/mode/topK/target/collectionRefs。每個結果組仍只呼叫各來源一次、最多 4 併發，雙組最多 8 併發，各組最終最多 20；當前 describe 重新整理後的單來源候選也校驗 100000 位元組上限，防止後設資料膨脹；整體 15 秒（含集合前後複核）。集合不支援檢索時該組報告 unsupported，不呼叫列表遍歷。搜尋及成員分頁整體 30 秒。兩個組各自持有查詢會話及預算，不聲稱跨資源型別的統一相關性。

基礎素材選擇器提供素材 / 素材集兩頁籤；開啟集合後顯示來源與集合名，分頁載入成員，可繼續關鍵詞/智慧查詢並返回集合。瀏覽、預覽不匯入檔案，實際選擇單個素材才呼叫 import。素材詳情顯示集合歸屬數量。AI 統一檢索返回兩組；成套主題優先看集合，精確單項直接看素材，由任務決定，不強制兩次查詢。新增 `material_collection_describe` / `material_collection_items`，集合內找相關素材仍用檢索工具傳 collectionRefs，不翻遍成員列表。


本輪隔離驗證包括多集/零集歸屬、雙組遊標、獨立標籤、來源排除、成員篩選、集合許可權及版本變化、錯誤提供者宣告、成員歸屬複核、有界檢索及無遍歷降級、雙目錄解除安裝、AI 工具、兩個 HTTP 通道和獨立 SDK 製品。素材選擇器在隔離測試頁面確認集合卡片、成員瀏覽、集合內智慧查詢與返回行為；無使用者文件編輯。
