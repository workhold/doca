<a id="插件接入首页最近访问"></a>

# 外掛接入首頁最近訪問

[English](plugin-activity.md)

2026-09-30。本介面已在倉庫實現，公開匯出位於 `@smartdoca/plugin-sdk/platform`。使用包含本介面的 SDK 構建產物和對應宿主；這裡不代表已經發布了新的 npm 版本。

<a id="存储与职责"></a>

## 儲存與職責

外掛透過 `activityServiceToken`（服務 ID `activity.v1`）註冊資料來源。外掛定義訪問記錄、歷史查詢、當前業務許可權與刪除清理邏輯；持久化依賴宿主託管能力，不能自建資料庫或持久目錄。activity.v1 只聚合來源，不另建業務記錄映象，也不提供專用的代寫訪問介面。持久化使用當前公開的託管 SQL/物件服務，見[儲存規範](plugin-horizontal-scaling.zh-Hant.md)。

宿主已有記錄繼續儲存在 `resource_visits`、`workspace_activity`，由內建來源加入彙總。沒有表結構變更、歷史搬遷或雙寫。公共資源發現頁繼續使用 `/workspace/recent?publicOnly=true`，其收錄邏輯僅適用於內建資源；外掛註冊最近訪問不意味著接入公共發現、收藏、搜尋或 AI。

外掛停用後註冊隨生命週期釋放，列表及開啟入口立即不再提供該來源；持久記錄不被宿主刪除。重新啟用後重新查詢外掛當前資料。實際安裝、停用仍遵循各宿主例項重啟生效的外掛生命週期。

<a id="注册接口"></a>

## 註冊介面

```ts
import {
  activityServiceToken,
  permissionsServiceToken,
  type ActivitySource,
} from "@smartdoca/plugin-sdk/platform";
```

在外掛 `injections.required` 中宣告 `activityServiceToken` 和 `permissionsServiceToken`。不具備 `activity.v1` 的宿主應明確拒絕載入此外掛，不使用宿主私有表或舊介面降級。已有不使用此能力的外掛無須修改。`register(source)` 返回登出函式；透過安裝外掛注入的服務註冊時，宿主自動繫結 effect，停止或初始化失敗時釋放。

每種內容型別註冊一個來源，例如 `example.mail.messages` 和 `example.mail.threads`：

| 欄位 | 約定 |
| --- | --- |
| `id` | 外掛 ID 加點號開頭的唯一來源 ID，最長 150 字元 |
| `pluginId` | 必須等於被注入服務的外掛身份 |
| `schemaVersion` | 固定為 `1`，不支援的版本拒絕註冊 |
| `resourceType` | 已註冊至 `permissions.v1` 的資源型別，條目 ID 即該型別的資源 ID |
| `title` | 必須包含 `en`、`zh`，每種最長 100 字元；用於首頁型別篩選及來源文字 |
| `icon` | `file`、`mail`、`calendar`、`message`、`task`、`book`、`folder` 之一 |
| `list(context, input)` | 返回當前使用者可讀的訪問記錄分頁 |
| `get(context, id)` | 開啟前查詢當前記錄、標題、路徑並複查許可權；不存在或不可讀時返回 `null` |

ID 與資源型別採用小寫字母開頭、字母數字及點號/連字元分段的標識。宿主每例項最多註冊 64 個外掛來源，重複 ID 拒絕註冊。每個來源可返回任意數量的業務資源，但必須分頁。

`context` 是宿主構造的 `{ principalId, signal }`。使用者 ID 來源於認證會話，不能從瀏覽器引數中選取其他使用者。響應條目為：

```ts
{
  id: "message-123",                  // 唯一资源 ID，1–500 个可见 ASCII 字符
  title: "季度预算讨论",              // 原始内容标题，非空，最长 500 字符
  visitedAt: "2026-09-30T09:20:00.000Z",
  path: "/mail/inbox?message=message-123"
}
```

`path` 必須是站內路徑，以 `/` 加字母或數字開頭，不含 origin、hash、反斜槓或控制字元；禁止外部地址及協議相對地址。查詢值自行 URL 編碼。業務標題保持原文，型別名稱透過 `title.en/zh` 本地化。

<a id="分页协议"></a>

## 分頁協議

`list` 收到 `{ until, after, limit }`，返回 `{ items, hasMore }`：

1. 每個使用者、來源、資源只返回一次最後訪問記錄。按 `visitedAt DESC, id ASC` 排序；ID 比較必須採用 ASCII 二進位制順序，不能按本地化排序。
2. 時間統一為帶毫秒的 UTC ISO 字串，例如 `2026-09-30T09:20:00.000Z`。只返回 `visitedAt <= until`。
3. `after` 为 `null` 時從頭開始，否則應用嚴格邊界：`visitedAt < after.visitedAt`，或時間相等且 `id > after.id`。記錄被刪除後仍可使用這個數值邊界，不能要求邊界記錄仍然存在。
4. `items.length <= limit`，宿主目前最多請求 51 條。允許短頁；如果還有記錄，`hasMore` 必須為 `true`。`hasMore=true` 時必須至少返回一條記錄，不能用空頁表示“稍後重試”。
5. 外掛查詢先按當前使用者訪問記錄及許可權過濾。宿主仍呼叫 `permissions.v1` 對每項檢查 `activity.read`，許可權過濾後會按需續取；一次請求最多續取 20 批，包含許可權檢查在內的來源總耗時限制為 1.5 秒。實現應使用索引，響應取消訊號，不在查詢中做遠端全量同步。
6. 列表查詢不得更新訪問時間；只有業務內容成功開啟才記錄訪問。同一請求可能被重複呼叫，未被宿主當前頁消費的候選也可能再次查詢。

宿主每頁展示 50 條，以訪問時間倒序、來源 ID 正序、資源 ID 正序合併；內建來源 ID 為 `doca`，其資源排序鍵為 `kind:id`。下一頁遊標儲存首次查詢的 `until`、已選擇來源和各來源已消費的位置，繫結使用者及篩選條件。前端將遊標視作不透明值，不自行拼裝。

這是當前許可權下的實時列表，不是凍結資料庫快照。翻頁期間的新訪問在重新整理後出現；刪除、撤權或更新了訪問時間的記錄可能從當前翻頁鏈消失。外掛業務查詢透過託管事務保證單次分頁讀取一致。

來源異常、超時、非法分頁/跳轉或許可權服務缺失時，該來源本頁結果全部丟棄，其他來源繼續返回。失敗來源在本輪後續分頁中保持跳過，並透過 `unavailableSources` 提示重新整理重試，避免恢復時向後續頁插入更早應顯示的內容。新註冊來源也要重新整理後進入本輪分頁。

<a id="接入示例"></a>

## 接入示例

以下為外掛 `mount(context)` 內的來源註冊示例。`mailStore` 是外掛需要實現的業務服務，不是 SDK 匯出；其持久化必須使用宿主託管能力。該示例只展示來源註冊，不代表可獨立安裝的完整郵件外掛；mailStore 應按當前託管儲存契約實現。

```ts
const pluginId = "example.mail";

context.inject(permissionsServiceToken).register({
  pluginId,
  resourceType: "message",
  async authorize(principalId, messageId, action) {
    if (action !== "activity.read") return false;
    return mailStore.canRead(principalId, messageId);
  },
});

const source: ActivitySource = {
  id: `${pluginId}.messages`,
  pluginId,
  schemaVersion: 1,
  resourceType: "message",
  title: { en: "Mail", zh: "邮件" },
  icon: "mail",
  async list({ principalId, signal }, { until, after, limit }) {
    // 业务实现：按用户、当前权限、until、after 过滤，再依协议排序。
    // 可读取 limit + 1 条以判断 hasMore；只返回前 limit 条。
    return mailStore.listRecent(principalId, { until, after, limit, signal });
  },
  async get({ principalId, signal }, id) {
    // 必须确认这个用户有该访问记录，资源仍存在且当前仍可读。
    return mailStore.getRecent(principalId, id, { signal });
  },
};
context.inject(activityServiceToken).register(source);
```

已有許可權註冊器若還支援郵件讀取等業務 action，應在同一個註冊器內加入 `activity.read` 分支，不要為相同外掛/資源型別重複註冊。

在外掛自己的“開啟郵件”認證介面成功讀到內容之後，以宿主會話中的使用者 ID 更新外掛訪問表。刪除郵件時清理外掛訪問表，或者查詢時透過關聯過濾已刪除郵件；不要請求宿主清理它沒有持有的記錄。

<a id="宿主入口与权限"></a>

## 宿主入口與許可權

- `GET /api/v1/workspace/activity`：認證使用者的混合列表。支援 `kind`（五種內建型別之一）、`source`（外掛來源 ID）、`cursor`；`kind` 与 `source` 不能同時提供。返回 `items`、`nextCursor`、`sources`、`unavailableSources`。
- 外掛條目的 `kind` 为 `plugin`，帶 `sourceId`、`sourceTitle`、`icon`。渲染 key 必須包含來源 ID，不能只用資源 ID。
- 外掛條目的 `href` 指向宿主 `/api/v1/workspace/activity/open?source=...&id=...`。宿主複查賬號、來源及 `activity.read`，呼叫 `get` 獲取最新路徑，再複查授權並跳轉；失敗返回 404，不使用歷史快照跳轉。
- 外掛目標頁面和業務 API 仍須獨立鑑權。最近訪問不是授權入口，也不會授予附件或關聯文件許可權。

<a id="验收与回退"></a>

## 驗收與回退

使用隔離資料庫和臨時安裝目錄，覆蓋跨來源同時間排序、多頁遍歷、短頁補取、資源刪除、跨使用者訪問、撤權、登出、故障/超時、危險跳轉、錯誤遊標，以及真實安裝包服務注入和 HTTP 開啟流程。倉庫測試為 `tests/plugin-activity.test.ts`，內建訪問記錄測試為 `tests/workspace-home.test.ts`。

回退宿主時無需回退資料庫：本能力未新增或改變任何持久表。外掛自己的歷史記錄繼續保留；依賴 `activity.v1` 的外掛在不提供該服務的宿主上拒絕載入。不要刪除業務資料來實現回退。
