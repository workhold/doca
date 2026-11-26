<a id="监控与遥测"></a>

# 監控與遙測

[English](plugin-monitoring.md)

SDK 原始碼 **0.1.11** 已實現。透過 `@smartdoca/plugin-sdk/monitoring` 匯入 `monitoringServiceToken`（`monitoring.v1`）、`telemetryServiceToken`（`telemetry.v1`）及型別。SDK 0.1.11 的 npm 驗證記錄見下方釋出章節，生產部署另行驗收。

<a id="声明与访问权限"></a>

## 宣告與訪問許可權

把所用服務寫入 `injections.required`，宣告從 0.1.11 開始的範圍，例如 `sdkRange: "^0.1.11"`。缺少服務或使用更早的 SDK 範圍會明確失敗。新服務不適配舊宿主；原有 SDK 方法、`events.v1`、資料庫結構和持久化格式保持原行為。

服務端外掛是管理員安裝的可信程式碼。宣告並注入監控服務意味著該服務端外掛可以在後臺採集全站執行事實，不意味著普通使用者可以讀取這些記錄。外掛自己的路由、後臺任務和 AI 工具仍須授權，不得自動把全站日誌或審計資料提供給普通使用者或模型。

在 mount 注入 monitoring 才會啟用外掛的 Web 讀取許可權。`host.platform.monitoring` 经 `/api/v1/plugin-platform/<pluginId>/monitoring.<method>` 呼叫同一組固定方法；宿主每次複核外掛監控作用域和資料庫中當前賬號的 active、admin 狀態。未安裝或未執行的外掛由原平臺入口拒絕。沒有通用服務分發或瀏覽器遙測寫入口。外掛 dispose 撤銷作用域以及保留的服務控制代碼；遙測寫入繫結安裝身份。

```ts
import { definePlugin } from "@smartdoca/plugin-sdk";
import { monitoringServiceToken, telemetryServiceToken } from "@smartdoca/plugin-sdk/monitoring";
import { httpServiceToken } from "@smartdoca/plugin-sdk/platform";
import manifest from "../manifest.json" with { type: "json" };

export default () => definePlugin({
  manifest, // sdkRange: "^0.1.11"；package.json 同时声明 doca.storage: "host"
  injections: { required: [monitoringServiceToken, telemetryServiceToken, httpServiceToken] },
  async uninstall() {},
  async mount(context) {
    const monitoring = context.inject(monitoringServiceToken);
    const telemetry = context.inject(telemetryServiceToken);
    telemetry.log(manifest.id, { level: "info", module: manifest.id, message: "Collector started" });
    await context.inject(httpServiceToken).register(manifest.id, [{
      method: "GET", path: "/metrics", admin: true,
      handle: request => monitoring.metrics({ scope: "cluster", windowSeconds: 60 }, { signal: request.signal }),
    }]);
  },
});
```

Web 外掛可呼叫 `await host.platform.monitoring.stats({})`、`await host.platform.monitoring.logs({cursor})`，返回型別化 DTO、採集覆蓋和缺口資訊。呼叫選項接受 AbortSignal，在 I/O 前後檢查取消，不承諾終止已經提交的資料庫語句。

<a id="读取接口"></a>

## 讀取介面

| 方法 | 資料與限制 |
| --- | --- |
| `stats({})` | 共享資料庫中的未刪除文件、知識庫和檔案數量，全部/活躍賬號數量，邏輯檔案位元組、登記檔案物件數量與位元組。同一物件的多份引用可能重複計入邏輯檔案位元組。物件位元組是 `file_storage_objects` 清單，不是磁碟或桶容量，不含外掛私有物件、發行包歸檔和未登記物件。 |
| `online({offset?,limit?})` | 實時查詢連線，按 userId 去重人數、連線數、活躍文件數，以及使用者/文件 ID 分頁。預設 100、最多 200。local 模式是單例項，Redis 模式是叢集。新介面不用舊心跳備用路徑；實時來源不可用就失敗。 |
| `metrics({scope?,windowSeconds?})` | HTTP 完成請求數、4xx、5xx、中斷、進行中、QPS、5xx 錯誤率和耗時直方圖，路由模板分組及外掛指標。視窗預設 60 秒、支援 1–300 秒。scope 預設 cluster，未配置 Redis 時返回的真實 scope 為 instance。 |
| `logs({scope?,cursor?,limit?,level?,pluginId?,module?,requestId?,since?})` | 有界結構化日誌，保留每個 epoch 的順序，以各例項隊首時間合併；時鐘回撥也不會越過未處理的序號。預設 100、最多 200。篩選是精確匹配，level 不是最低階別。遊標最多 64 KiB；空頁也應儲存返回遊標。 |
| `audit({source,...})` | 宿主已有的持久安全/資源審計。source 必填 security 或 resource，可按 action、actorId 及對應來源的 userId/resourceId、ISO since/until、cursor、limit 查詢；不適用的篩選明確失敗。安全詳情脫敏，無法解析或不是物件時返回 details=null、detailsValid=false，不改寫原記錄。 |
| `jobs({})` | 共享資料庫的 AI、projection、file-extract 狀態分組，過期 AI/projection 租約與待刪除私有物件數。projection 包括已有佇列中的不同 kind，不聲稱所有業務外掛都使用宿主佇列。 |
| `jobErrors({source,limit?})` | 最近的 AI/projection/file-extract 錯誤樣本，不含提示詞、任務 payload 或結果。這是有上限的診斷樣本，不是完整錯誤歷史分頁；nextCursor 恆為 null。projection 沒有可靠的錯誤更新時間，因此 updatedAt=null，按 available_at 排序。 |
| `aiUsage({...})` | 共享 AI 原始賬本快照分頁，按 userId/modelId/state、ISO since/until 篩選，返回撥用/任務/模型 ID、狀態、折算 Token 與供應商原始數值指標。未知用量返回 null，不從舊 SQL 數字列推測。已確認但不符合當前表示的記錄標記 usageStatus=invalid，原記錄保留。省略憑據、供應商原始響應和模型配置快照。 |
| `health({scope?})` | 宿主版本、例項、程序 RSS/堆記憶體/累計 CPU/事件迴圈 P95，資料庫讀取探測，以及實時叢集和監控快取就緒狀態。儲存、搜尋、AI 網路探測明確標記 not-probed，不呼叫收費模型或寫入探測物件。 |

審計與 AI 用量分頁預設 100、最多 200。遊標固定上界時間，繫結篩選條件，按 created_at、ID 排序；錯誤或跨查詢遊標拒絕。它們是快照讀取，不是增量變更流：之前 pending 的 AI 呼叫可能在建立時間分頁之後才結算。持久消費結算仍用原有 `events.v1` / `ai.usage.recorded`。原審計與用量介面保留原來的行為。

<a id="请求与插件指标"></a>

## 請求與外掛指標

HTTP 指標包括管理、平臺和健康請求等正常 HTTP 路由，不包括 WebSocket 握手與訊息；連線使用線上來源。中斷單獨統計。錯誤率為 5xx/完成請求，空視窗為 null。QPS 為各例項實際覆蓋視窗請求速率之和，視窗裁剪到啟動時間。取樣時間與啟動時間隨結果返回，可判斷取樣延遲。

耗時使用互斥的毫秒桶：1、5、10、25、50、100、250、500、1000、2500、5000、10000 和無上限。P50/P95/P99 取桶上界估計，並裁剪到觀測最大值；叢集合併桶計數，不平均例項分位數。空分佈的最小值、最大值和分位數為 null。路由標籤來自注冊模板，不使用動態資源 URL 或查詢字串；每個程序 epoch 保留前 64 個路由/方法分組，超出的彙總至 `[other-routes]`。

```ts
telemetry.record(manifest.id, {
  name: manifest.id + ".sync.completed", kind: "counter", value: 1,
  labels: { source: "mail" },
});
telemetry.record(manifest.id, {
  name: manifest.id + ".sync.duration_ms", kind: "histogram", value: 120,
});
```

指標名稱必須以外掛 ID 加點開頭。counter 為非負增量，gauge 為最近的有限數值，histogram 為非負觀察值並使用同一組數值桶。同名指標更改 kind 或標籤鍵返回 409。最多 6 個標籤、每值 100 字元，每外掛 200 條、每例項 1000 條自定義序列；超額新序列返回 429，並增加 rejectedMetricSeries。憑據標籤和數值溢位拒絕。標籤應使用有界分類，不使用使用者、文件和 requestId。自定義指標按例項/epoch 返回，計數器重置與 gauge 彙總由消費者明確處理；數值是啟動以來的累計值或最近值，不隨 HTTP 視窗裁剪。外掛可用這些指標報告自己的任務與依賴狀態。

<a id="日志保留与集群覆盖"></a>

## 日誌保留與叢集覆蓋

宿主日誌包括啟用宿主 logging 時的結構化 Fastify 應用日誌，以及不受 stdout 開關影響的 HTTP 錯誤、中斷和耗時至少兩秒的請求；普通成功請求行用指標表示。外掛日誌帶宿主繫結的 pluginId、epoch、例項、序號、建立時間和可選 requestId。敏感鍵、請求正文、提示詞、payload、模型配置和錯誤棧刪除或脫敏；URL 賬號/密碼、查詢、hash 及常見憑據串過濾。模式匹配無法識別任意裸文字秘密，作者不得把憑據或文件正文放入 message、module、requestId、fields。

每例項最多保留 2000 條、序列化日誌最多 2 MiB。數量/位元組淘汰會提高最早序號和 dropped；遊標落後時返回明確的 evicted 缺口與丟失數量。程序重啟生成新的 epoch，即使 instanceId 相同。之前的 epoch 不可讀取時返回 instance-unavailable 缺口；不符合新快取協議的記錄標記不可用，保留至過期，不適配、不返回其內容。

配置 Redis 時，在獨立的 `monitoring:v1` 名稱空間每五秒釋出 version 1 快照。已關閉例項或超過 15 秒的快照標記 stale，排除出當前指標總量，保留日誌仍可補拉。快照及已知例項記錄一小時過期；過期、缺失、格式錯誤使 complete=false。叢集讀取重新整理應答例項，再讀取其他例項的快照。最多 128 個保留 epoch、每份快照 16 MiB，超過明確失敗。Redis 失敗不把叢集查詢降級成單例項；顯式 instance 查詢仍可診斷本例項。這是臨時快取，不保證持久投遞或發現混合版本叢集：舊宿主沒有新發布器，不會出現在監控清單。

監控外掛透過宿主管理的儲存儲存歷史聚合、日誌、遊標、缺口和告警狀態。按日誌 id 去重，把記錄與遊標放入同一外掛事務提交，缺口按缺口處理。取樣不會重建已丟失的請求視窗。安全審計和原始 AI 用量由宿主保管，外掛不能透過本 SDK 刪除。

<a id="升级、回滚与验证"></a>
<a id="升级回滚与验证"></a>

## 升級、回滾與驗證

不修改宿主資料庫表、基線、審計格式、AI 賬本格式或現有外掛資料結構；舊線上心跳和 AI 歷史讀取回退留在原路徑。新的執行事實從升級後的程序啟動開始，不匯入歷史 stdout。新外掛必須使用 SDK 0.1.11，舊宿主明確拒絕。恢復舊程式保留原持久資料和外掛歷史記錄；啟動舊宿主前停用依賴新服務的外掛。臨時監控快取可過期，不影響原始資料。

使用隔離資料庫/文件和獨立 Redis 名稱空間，驗證請求與直方圖合併、線上去重、篩選分頁和遊標淘汰、脫敏、普通使用者/撤銷管理員許可權拒絕、名稱空間/版本/生命週期，以及失效/缺失/錯誤快取和重啟 epoch。另驗證 SDK 構建與獨立 JavaScript/宣告消費。npm 釋出、實際生產監控外掛和生產部署屬於另外的交付。

<a id="sdk-发布--2026-10-13"></a>

## SDK 釋出 — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` 已釋出至 npm。公共登錄檔依賴消費者檢查全部 16 個入口、監控與遙測 token 以及準確 SDK 版本；這不代表生產監控外掛或移動裝置驗收完成。
