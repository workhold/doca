<a id="实时协同与保存"></a>

# 實時協同與儲存

[English](collaboration.md)

本頁描述宿主 0.2.23 實現。元件目標 API 與待實現事項見[協同契約](collaboration-sdk-contract.zh-Hant.md)，早期單程序和臨時包記錄見[研發資料](research.zh-Hant.md)。

<a id="已接入格式"></a>

## 已接入格式

富文字、Markdown、表格、畫布和幻燈片均已接入。宿主安裝公開的 `@smartdoca/slate`、`@smartdoca/markdown`、`@smartdoca/sheet`、`@smartdoca/canvas`、`@smartdoca/slides`，版本由 package.json 和鎖檔案確定，不要求開發者私有原始碼目錄或舊 vendor tarball。

五種格式共享連線、授權和本地待確認佇列，各自維護資料模型、codec、schema、epoch 及檢視。元件從服務端權威 checkpoint/基線恢復後掛載；切換語言、只讀、選區或儲存狀態不重建文件。表格保留自身不可變基線與當前協議資料，不能當作富文字處理。

<a id="连接与消息"></a>

## 連線與訊息

WebSocket 入口為 `/api/v1/ws`。瀏覽器同源升級並使用會話 Cookie；代理需轉發 Upgrade/Connection。公開資源只允許其閱讀範圍內的只讀連線。一個標籤頁複用宿主連線處理文件、通知和線上狀態。

JSON 信封中的 Yjs 位元組用 base64。實際訊息和格式校驗以[閘道器](../apps/server/src/services/realtime/gateway.ts)及[協議校驗](../packages/core/src/modules/collaboration/protocol.ts)為準：

| 訊息 | 當前用途 |
| --- | --- |
| ready / join | 連線就緒，加入文件並協商 codec/schema/protocolVersion |
| sync-request / sync-response | 同步權威差異、epochId、seq、格式基線及許可權；同步響應不是儲存 ACK |
| update / ack | 提交本地更新；ACK 按訊息 ID 在資料庫提交後確認 |
| presence / cursor / cursors | 使用者線上狀態及按會話區分的臨時選區 |
| document.changed / notifications.changed | 重新讀取正文/詳情或持久通知的失效訊號 |
| leave / error | 離開房間或明確報告許可權、協議、連線錯誤 |

已知 epoch 後的編輯必須攜帶匹配的協議、codec/schema 和 epoch。身份、連線 ID、名字及顏色由服務端確定；寫入和廣播重新檢查資源許可權，不接受客戶端自報身份。

<a id="保存、重连与历史"></a>
<a id="保存重连与历史"></a>

## 儲存、重連與歷史

只有真實本地內容事務進入 `update-outbox.ts`。初始化、遠端應用、presence、滾動和尺寸變化不提交正文。未確認更新保留原始位元組及訊息 ID；精確匹配的 ACK 才移除對應更新，同步響應和未知 ACK 不清空佇列。

服務端在同一事務內驗證、持久化正文及派生投影，提交後發回執和廣播。當前回執以資源、epoch 和訊息 ID 去重；同 ID 不同內容拒絕。定期 checkpoint 保留 CRDT 身份；歷史版本獨立保留自己的格式、譜系及資產依賴，見[歷史與恢復](document-experience.zh-Hant.md#历史与恢复)。

當前宿主介面卡在傳送前將原始 Yjs checkpoint、baseline 和未確認更新儲存到 IndexedDB。重連補拉權威狀態後以原 ID 和位元組重試，只有精確的持久 ACK 才清理對應更新。已快取的登入文件可在後端發現和校驗前恢復頁面後設資料及原副本，按上次許可權離線編輯。臨時網路故障時編輯器繼續可用，明確會話或資源拒絕會隱藏快取後設資料並保留待同步修改。使用桌面內建前端或事先下載的 Web 前端，可在服務中斷時進入本地文件目錄。詳見[離線文件與恢復](access-offline-events.md#离线文档入口)。

<a id="在线选区与评论"></a>

## 線上選區與評論

線上人數按使用者去重，編輯選區按連線區分，同賬號雙頁也有不同選區。presence 是臨時狀態，不寫正文和歷史。富文字、Markdown、表格、畫布及幻燈片使用各自實際介面卡；只讀時不釋出編輯選區。

永久評論錨點獨立於 presence：富文字文字錨點、Markdown 範圍、表格穩定行列身份和畫布/幻燈片元素區域按各自協議校驗。表格評論隨已支援的結構操作追蹤穩定記錄，持久錨點不是臨時 A1 選區。評論顯示和解決行為見[評論與通知](comments-and-community.zh-Hant.md)。

<a id="单实例与多实例"></a>

## 單例項與多例項

無 Redis 時使用程序內廣播、線上狀態和限流。配置 Redis 後，正文變更、許可權失效、通知和 presence 跨例項傳播；正文仍在共享資料庫中，Redis Pub/Sub 不是持久日誌。Redis 已配置但不可用時不靜默退回單機匯流排。

多副本還需要共享 PostgreSQL、檔案儲存及一致的外掛目標版本，各例項保留獨立安裝快取，詳見[水平擴充套件](horizontal-scaling.zh-Hant.md)。完整負載、斷網故障矩陣及真實裝置仍需目標環境驗收；自動測試使用隔離資料。
