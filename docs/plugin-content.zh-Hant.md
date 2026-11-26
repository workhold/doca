<a id="通用内容来源-contentv1"></a>

# 通用內容來源 content.v1

[English](plugin-content.md)

公開入口：`@smartdoca/plugin-sdk/content`。宿主定義契約和呼叫入口，外掛負責業務實現；內建文件和檔案也註冊相同來源。此介面不會自動把全部來源交給 AI。

<a id="契约"></a>

## 契約

- `sources(context, purpose)`：發現來源宣告。
- 來源必需實現 `list`、`read`、`resolve`；可選 `search`，宣告與實現嚴格一致。
- `list(context, {config, cursor, limit})`：返回輕量塊清單 `{items,nextCursor,snapshot}`，每項包含 `ref:{sourceId,resourceId,blockId}`、`fingerprint`、`title`，可帶 `order`、`anchor`、短 `excerpt`，禁止包含 `text` 正文。
- `read(context, {config,ref,fingerprint})`：只讀取指定塊正文，返回清單欄位及 `text`，當前不可讀返回 null；指紋變化返回衝突，消費端重新列舉。
- `resolve(context,ref)`：重新授權並返回 `{path,fingerprint}` 或 null，path 只能是站內路徑。
- `search(context, {config,cursor,limit,query})`：返回相同輕量清單，由來源實現搜尋，不自動用全文掃描替代。

服務呼叫 list/read/search 時另傳 `sourceId` 与 `purpose`；來源回撥得到真實 `principalId`、`purpose` 和 `signal`。來源必須在每次呼叫校驗當前賬號、配置範圍和許可權；不得信任請求體中的使用者 ID。宿主呼叫前後檢查使用者狀態與來源生命週期，並設定 20 秒呼叫超時。

```ts
const content = context.inject(contentServiceToken);
content.register({
  id: "example.tasks.content", pluginId: "example.tasks", version: 1,
  title: { zh: "待办", en: "Tasks" }, contentTypes: ["task"],
  purposes: ["analysis", "knowledge"], capabilities: { search: false },
  configSchema: { type: "object", additionalProperties: false, properties: {} },
  list: listAuthorizedTaskBlocks,
  read: readAuthorizedTaskBlock,
  resolve: resolveAuthorizedTaskBlock,
});
```

三個回撥由外掛實現。不得讀取宿主私有表、原始碼路徑或其他外掛資料庫。

<a id="对账规则"></a>

## 對賬規則

消費端儲存當前身份、訂閱配置對應的引用與指紋，完整列舉後比較：不變塊無需讀取或 AI 分析，變化塊定點讀取。只有完整遍歷成功才可以認定舊引用消失。超時、分頁失敗、快照變化和許可權不確定均不能當作空集合；不更新已消費指紋，後續重試。

`cursor=null` 開始，`nextCursor=null` 結束；一次遍歷的 snapshot 必須一致。分頁遊標只用於遍歷，不是持久增量日誌遊標。來源應在內容、範圍或許可權變化使遍歷失去完整性時拒絕舊遊標。無需實現獨立 listChanges/readChanges。

宿主限制每頁 100 項、單塊正文 200 萬字元，並驗證引用、重複項、遊標與取消。完整清單上限 10 萬塊；分析輔助器限制本次變化正文總量，超限明確失敗，不截斷後宣稱完整。

內建來源透過段落內容定址。未改段落不會因前方插入段落而改變身份；修改正文表現為舊塊消失、新塊出現。它不是原生編輯器穩定節點 ID。重複塊、標題上下文和長段落切片的邊界見 [內容指紋與搜尋對賬](content-fingerprint-reconciliation.md)。

<a id="宿主入口与消费端"></a>

## 宿主入口與消費端

HTTP：GET `/api/v1/content/sources?purpose=analysis`；POST `/api/v1/content/list`、`read`、`resolve`、`search`。身份來自宿主會話，響應 no-store。

全域性搜尋只呼叫宣告 search 的來源。知識庫/文件篩選不能套到外掛業務範圍時，不混入外掛結果。點選再次 resolve。

原知識庫保留 `knowledge_subscriptions` 和 `knowledge_source_groups.config` 的來源登記，不再建立整理任務、派生條目或消費指紋副本。POST `/api/v1/knowledge/libraries/:id/content-subscriptions` 接收 `{sourceId,config,title}`，要求來源支援 knowledge。僅貢獻者可以修改提供方來源範圍。

知識冊獨立在執行時讀取完整授權清單，釋出前複驗。證據保留 `contentRef`、來源版本、內容雜湊與精確引用片段。提供方、繫結、貢獻者或原來源許可權不可用時，衍生成果停止展示；保留資料不授予訪問權，不建立額外完整正文儲存。

來源選擇器提供基礎 schema 表單；複雜巢狀配置需要外掛自己的配置頁。編輯介面為 PUT `/api/v1/knowledge/libraries/:id/content-source-groups/:groupId`，引數同新增介面；僅訂閱發起者可修改來源範圍。配置變化影響後續來源讀取。

現有 knowledge.sources.v1 沒有自動適配為 content.v1；業務外掛需實現公開標準。知識冊使用新資料庫基線，不提供歷史轉換或舊協議適配。
