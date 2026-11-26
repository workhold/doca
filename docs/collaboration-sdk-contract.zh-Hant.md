<a id="doca-编辑器协同接入契约"></a>

# Doca 編輯器協同接入契約

[English](collaboration-sdk-contract.md)

適用：富文字、Markdown、線上表格、畫布、幻燈片及未來文件型別。初始約定日期為 2026-09-11，下方實現增量保留各自日期與版本；已安裝包見[當前編輯器矩陣](editor-integration.zh-Hant.md)。

目標：平臺維護一套連線、許可權、增量儲存、落庫確認、重連和線上會話邏輯；元件負責各自的資料模型和渲染。統一行為不意味著把 Excel 強制轉換成富文字資料結構。

<a id="_1-分层与版本"></a>
<a id="1-分层与版本"></a>

## 1. 分層與版本

| 層/欄位                        | 統一職責                               | 元件差異                                        |
| ------------------------------ | -------------------------------------- | ----------------------------------------------- |
| 傳輸                           | 同源 WebSocket、統一信封、服務端認證   | 无                                              |
| 儲存                           | 本地增量 → outbox → 資料庫提交 → ACK   | 无                                              |
| format / codec / schemaVersion | 標識型別和資料結構相容性               | 富文字節點 CRDT；表格穩定行列/單元格命令        |
| epochId                        | 同一 CRDT 資料譜系，不相容重建時才改變 | 表格另需與 epoch 繫結的不可變 workbook baseline |
| seq                            | 當前 epoch 中有效提交的單調序號        | 无                                              |
| checkpointSeq                  | 完整 Yjs checkpoint 已覆蓋的提交序號   | 不得刪除元件仍需回放的邏輯命令                  |
| resource.version               | 業務後設資料樂觀鎖                       | 不用於 Yjs 合併                                 |
| 歷史版本 ID                    | 使用者檢視/回滾的業務快照                | 不等於每個網路更新                              |
| state vector                   | 同步差異摘要                           | 不是完整儲存確認，尤其不覆蓋刪除集合的確認語義  |

當前各格式協同使用 epochId 表示譜系；定期儲存 Yjs checkpoint 不改變 epoch。表格只使用當前 Yjs session 與 checkpoint sequence。

<a id="_2-平台与组件边界"></a>
<a id="2-平台与组件边界"></a>

## 2. 平臺與元件邊界

平臺：一個頁面一個實時會話，socket、ACL、增量佇列、ACK、重連、業務快照、評論、通知、資產許可權。元件不再自行開啟另一套 HTTP autosave 或 socket。

元件：一個文件會話只建立一次 Y.Doc 和編輯器；本地內容操作對映到 Yjs，遠端事務投影到檢視；提供 readiness、錯誤、格式狀態、選區和錨點介面。修改 props、只讀狀態、游標、尺寸、儲存提示都不能重建共享文件。

後端可將格式差異收斂在 codec 外掛：
初始化、驗證合併結果、生成業務投影、匯入匯出、歷史回滾。通用房間/許可權/儲存流程不理解工具欄或單元格 DOM。

<a id="_3-统一消息与生命周期"></a>
<a id="3-统一消息与生命周期"></a>

## 3. 統一訊息與生命週期

建議公共信封：

- protocolVersion: 1。
- type、id（訊息 ID）、room（資源 UUID）、epochId。
- 初次 join 可不帶 epochId，服務端返回後，後續寫入必須攜帶。
- 身份、sessionId、使用者名稱和顏色由服務端決定，不能信任客戶端自報值。

1. join：提供支援的 codec/schemaVersion、已知 epoch 和 vector。
2. sync-response：返回 epochId、codec、schemaVersion、seq、checkpointSeq、rank、update、vector；Excel 額外返回原子繫結的不可變 baseline。
3. 校驗基線、補齊 Yjs、完成檢視投影后才進入 ready，不先展示可編輯空文件再覆蓋。
4. update：id、room、epochId、Yjs bytes（現有 JSON 通道用 base64）。只傳實際本地內容增量。
5. ack：相同 id、epochId、提交後的 seq，可附 changed 和業務後設資料。事務提交之後才發，不是“已收到資料”。
6. 有效更新廣播給其他仍有許可權的會話；遠端應用不能回聲生成本地寫入。
7. sync-request / sync-response：只補拉差異，不是 ACK。不能清空未確認佇列，也不能每次補拉後無條件上傳。
8. leave / 斷線清除本會話選區；鑑權、epoch、schema 錯誤明確區分，不一律當普通網路重試。

同一次未確認寫入，重試保持原始 bytes 和訊息 ID。Yjs 合併必須冪等，重複投遞不增加 seq、審計、通知或歷史。當前 Doca 使用 editor_receipts、markdown_receipts 持久去重，鍵包含 (resourceId, epochId, messageId)，同 ID 不同 payload 必須拒絕。

<a id="_4-保存状态机"></a>
<a id="4-保存状态机"></a>

## 4. 儲存狀態機

連線狀態：loading → syncing → ready；異常進入 disconnected / error。
儲存狀態獨立：clean / dirty / saving / error。

- 只有本地內容事務進入 outbox。初始化、選區、滾動、焦點、尺寸、線上人數、心跳、遠端重放、只讀開關不得生成內容更新。
- outbox 空且完成同步才能顯示“已儲存到雲端”；有待確認寫入才顯示“正在儲存”。
- 佇列序列傳送；只有精確匹配隊首 ID 的 ACK 才能出隊。未知/遲到/重複 ACK 不能誤清後續輸入。
- 斷線保留 bytes 與 ID。重連先補拉遠端，再重試未確認增量。
- 客戶端收到離線事件後立即關閉當前實時連線並暫停重試。收到上線事件後重新連線並執行正常的文件加入流程。
- 線上開啟文件時，首次連線和同步期間隱藏離線提示。有可編輯本地副本時，客戶端檢測到網路離線或協作連線失敗後顯示提示，等當前文件重新同步完成後收起。
- 不依據 encodeStateAsUpdate(doc, vector).length 判斷 dirty：相同狀態也可能返回歷史 delete set，長度大於 2 不代表有新寫入。
- epoch 不一致暫停舊佇列，允許匯出/生成獨立恢復副本，不把舊增量強行套到新文件。
- 當前宿主介面卡透過 `offline-replica.ts` 持久化原 checkpoint 和待提交訊息 ID。離線編輯需要已授權的副本和可用的本地儲存。桌面內建前端和已下載的 Web 前端可從本地文件目錄啟動。

本輪兩個宿主均使用 `apps/web/src/features/documents/update-outbox.ts`。該佇列不依賴文件型別，保留實際本地事務增量，sync-response 不觸發無條件回傳。

<a id="_5-建议组件-api"></a>
<a id="5-建议组件-api"></a>

## 5. 建議元件 API

所有元件共同提供：

- connect({ doc, epochId, baseline? })，完成初始化後返回 ready。
- setReadOnly(boolean)，不修改 CRDT。
- dispose()，完整清理監聽和臨時繪製。
- onSelectionChange(callback)，返回取消訂閱。
- renderRemoteSelections([{ sessionId, userId, name, color, selection }])。
- clearRemoteSelections()。
- onError(callback)，提供可區分的錯誤碼。

富文字再提供 onFormatStateChange / queryFormatState：
marks、blockType、alignment、canUndo、canRedo。固定和懸浮工具欄使用同一個狀態源，不用 DOM 猜格式。本輪透過現有 onChange 和 query 介面更新固定工具欄。

元件與平臺必須約定 transaction origin：local、remote、bootstrap。只有 local 被當作使用者寫入。禁止在 remote apply 的過程中重新包裝命令生成新的 operationId。

<a id="_6-在线选区"></a>
<a id="6-在线选区"></a>

## 6. 線上選區

統一 selection 判別聯合：

- text：anchor/focus 為相對文字位置。
- cells：sheetId、startRow/endRow/startColumn/endColumn（零基閉區間）、editing。
- null：不再展示。

規則：

- sessionId 按連線區分；線上人數按 userId 去重，繪製只排除當前 session，不排除同賬號其他頁面。
- editing=true 代表正在輸入；選中但未輸入為 false。切換工作表、編輯開始/結束均發事件。不傳單元格值、公式或鍵盤內容。
- 100～150ms 節流並去重，不寫資料庫、不增加版本、不影響撤銷。
- 「編輯」和「純淨編輯」均釋出本會話選區。「純淨編輯」在當前文件檢視隱藏其他會話的游標和選區。頁面內焦點離開編輯器、離開文件、斷線、撤權清除，服務端每條訊息檢查 ACL。切換瀏覽器標籤頁或視窗會保留仍線上會話的最後編輯位置（2026-09-12：Markdown 宿主已適配，其他格式需分別驗收）。
- 表格顯示顏色邊框、使用者名稱標籤，只畫當前 sheet，滾動/縮放由元件定位。
- 數值座標是臨時 presence，在併發插刪行列期間可短暫過時；長期評論錨點必須使用穩定行列 ID，不能直接複用 A1 座標。
- 後續可增加 TTL 防止連線存活但 UI 已失效時的陳舊選區。

當前實現位於 `apps/web/src/features/documents/spreadsheet-editor.tsx`，透過表格編輯器現有的選區狀態和實時同步介面釋出、接收並繪製 presence；不把單元格內容、公式或鍵盤輸入寫入 presence。
後續若將表格編輯能力繼續下沉到獨立 Excel 包，應保持上述 selection 聯合型別和生命週期約定，宿主不長期依賴底層 facade 的細節。

<a id="_7-快照、回滚、区域评论"></a>
<a id="7-快照回滚区域评论"></a>

## 7. 快照、回滾、區域評論

Yjs checkpoint 儲存原 CRDT 的完整編碼，不能用 JSON 投影重建並丟棄身份。Excel 必須儲存“不可變 baseline + 同 epoch 命令”；不得拿最新 workbook.save() 的結果作 baseline 後再次重放舊命令。

定期 checkpoint 保持 epoch；使用者歷史按關鍵節點建立。歷史記錄儲存自身 format、codec、epoch、baseline 和資產依賴，不能用當前 baseline 解釋舊版本。回滾優先產生當前 epoch 的新變更並保留回滾前歷史；元件若只能重建，必須顯式切換 epoch、處理未確認寫入，再載入新譜系。

核心按成功寫入記錄歷史，策略與會員等級無關。自動、手動、AI 和回滾前快照共用持久化與事務邊界，失敗必須回滾。經使用者明確同意的宿主保留策略為：最近 20 個完整快照留在資料庫；更早快照每湊滿 10 個，只把其中最新 1 個保留為私有檔案恢復點。不可變檔案上傳、讀回校驗成功後，才在同一事務中登記索引並移除這一組資料庫記錄，另外 9 個按規則抽稀。未滿一組或儲存失敗時保留資料庫原件。使用者只看到統一分頁的普通快照列表，版本 ID 不變，不返回儲存位置欄位。快照原位元組、獨立恢復資訊與附件不改寫；線上協同檢查點和未覆蓋增量不參與抽稀。業務策略不能在已同意規則之外隱式刪除資料。各格式現有回滾能力保持獨立，見[儲存運維](storage.zh-Hant.md#历史快照存储与显式升级)。

評論作者/正文/回覆/解決狀態屬於平臺資料庫。元件需提供 captureAnchor、resolveAnchor、renderAnchors、onAnchorClick。富文字是相對文字位置，Excel 應為穩定行列範圍，隨插刪變換；完全刪除或解決後不高亮。

當前表格包和宿主已實現區域評論，使用穩定行列身份、capture/resolve/reveal API、標記渲染、epoch 校驗與刪除目標處理。已支援的行列插入、排序和工作表變化由 `tests/editor-sessions.test.ts`、`tests/sheet-axis-sizes.test.ts`、`tests/sheet-collection.test.ts` 隔離測試覆蓋。永久協議與臨時單元格 presence 分開。

<a id="_8-两个组件必须共用的验收清单"></a>
<a id="8-两个组件必须共用的验收清单"></a>

## 8. 兩個元件必須共用的驗收清單

1. 開啟已有資料靜置 60 秒、選擇、滾動、調整視窗，零新增內容提交/歷史。
2. A 編輯 B 接收，B 不回聲提交，最終投影一致。
3. 同賬號兩頁有不同顏色和使用者名稱；文字選區與單元格輸入狀態準確；只讀不釋出/顯示。
4. ACK 丟失、重複、延遲，重連及收包同時輸入：無資料丟失、不提前顯示已儲存。
5. 純刪除後反覆同步不重複上傳 delete set。
6. baseline/epoch/schema 不匹配明確拒絕，重複初始化不生成新內容。
7. Excel 併發行列增刪、單元格編輯、公式、合併、排序/篩選、撤銷逐項驗收；不支援的操作要宣告或禁用，不能籠統聲稱全部收斂。
8. 重啟後由 checkpoint+增量恢復，與線上投影一致；日誌壓縮後仍一致。
9. 編輯中撤權、禁用、匿名、越權 room、偽造身份和越界選區均被隔離。
10. 固定/懸浮工具欄格式一致，儲存狀態更新不重建編輯器、不丟焦點。

<a id="_9-当前实现与提案的边界"></a>
<a id="9-当前实现与提案的边界"></a>

## 9. 當前實現與提案的邊界

當前宿主已接入富文字、Markdown、表格、畫板和簡報，共用可靠提交佇列及持久 ACK；空閒同步不回傳正文，選區與使用者名稱由各格式介面卡處理。五種格式支援歷史讀取；僅富文字和 Markdown 支援管理者恢復，表格、畫板、簡報返回 `canRestore:false`。這不是所有格式已具備統一元件回滾 API 的承諾。

平臺當前已實現 epoch、協議校驗、提交回執與歷史恢復後設資料，具體支援範圍見上文及各元件整合文件。無 Redis 時使用單程序廣播和 presence；配置 Redis 後，文件更新、服務端重新整理、許可權失效、通知和 presence 跨例項傳播。資料庫提交仍是 ACK 邊界和正文事實來源，Redis 重連後由服務端向本例項活動房間重新下發權威狀態，不把 Pub/Sub 當持久日誌，也不在 Redis 故障時靜默退回本機匯流排。

正式元件選區 API 和跨格式統一回滾能力仍需元件與平臺共同落地。文件離線啟動和持久佇列由宿主負責。元件能力以安裝包的實際匯出驗證為準，Excel 基線驗證繼續保留。

離線首頁從**最近編輯**列出已授權的文件。用新版聯網開啟且本地正文副本可用的文件會加入目錄。桌面端使用內建前端，Web 工作臺在登入後自動準備同源離線構建資源。檢測到連線中斷時，可編輯的本地副本顯示離線編輯提示。重連確認授權和譜系後，待提交修改透過原有持久 ACK 路徑同步。已關閉的文件在重開時繼續同步。見[離線文件與恢復](access-offline-events.md#离线文档入口)。

現有服務協議仍見 [collaboration.md](collaboration.zh-Hant.md)。本契約包含目標 API 與已實現清單；不能將全部目標欄位和能力視為當前包已匯出。

<a id="插件元素增量（2026-10-02）"></a>
<a id="插件元素增量2026-10-02"></a>

## 外掛元素增量（2026-10-02）

宿主已實現 SDK 0.1.6 可選 Web 元素登錄檔。富文字透過永久 `custom:plugin-element` 原子行內 codec 儲存不透明 JSON envelope。表格在原生 `ICellData` 的 `custom.docaElement` 儲存配置，以 `v` 儲存靜態文字投影；整單元格畫布渲染器只讀取配置，不改持久值。兩種格式繼續使用原生模型、檢查點、撤銷和同一個可靠 outbox。

未知型別和不匹配的精確 envelope/data 版本顯示不支援佔位，保留原始有界 JSON。不提供適配、遷移、轉換或自動重置。現有內部引用讀取規則保持。原生插入、配置、刪除參與剪貼簿、撤銷和協同。配置表單重新檢查實時富文字範圍或穩定單單元格錨點，目標已刪除或併發變化時拒絕。畫布計時器只重新整理檢視，最多每秒一次，只有繪製了可見計時單元格後才安排下一次重新整理；隱藏頁面暫停。渲染、選區和空閒變化不得增加正文 seq 或歷史。

隔離自動驗收覆蓋原生持久化與過載、未知 payload 原樣儲存、富文字原子刪除/撤銷/剪貼簿、表格行插入/錨點/複製/刪除/撤銷、重複 ACK 重放、兩副本收斂且不回聲、只讀拒絕和超限 payload 回滾。不編輯使用者文件。本增量不保證通用塊支援、全部表格操作、跨格式無損匯出、永久離線佇列或原生裝置驗收。精確欄位與限制見倉庫 `docs/plugin-editor-elements.md`。

<a id="markdown-初始化修复（2026-10-03）"></a>
<a id="markdown-初始化修复2026-10-03"></a>

## Markdown 初始化修復（2026-10-03）

宿主先將服務端權威 checkpoint 恢復到空副本，再呼叫當前 Markdown 包的會話工廠。載入期間不再寫入客戶端後設資料，以免首次正文更新依賴從未提交到服務端的 CRDT 項。狀態快照保留同一 doc/text/awareness/undo 物件。不改變 schema、epoch 或儲存格式，不轉換或清空已有待提交編輯。隔離驗收覆蓋首次編輯持久恢復、遠端/初始化無回聲、穩定狀態控制代碼，以及瀏覽器連續輸入、跨例項更新、過載和空閒檢查。

<a id="富文本图块锚点--2026-10-10"></a>

## 富文字圖塊錨點 — 2026-10-10

宿主在當前 `@smartdoca/slate` 0.4.13 上使用既有整塊錨點（`kind:"block"`、穩定 `blockId`、當前 `epochId`）支援流程圖和思維導圖評論及 AI 引用。服務端從已授權圖塊的節點標籤或根主題生成引用文字。樣式修改和檢查點恢復保留錨點，刪除圖塊後錨點不再解析。當前定位整幅圖，不把圖內節點或連線 ID 當作永久評論錨點。捕獲選區、展示評論和引用給 AI 不產生內容寫入；協議、文件格式、譜系和歷史評論不做轉換或遷移。

<a id="已发布表格包对接--2026-10-10"></a>

## 已釋出表格包對接 — 2026-10-10

宿主 0.1.18 鎖定 npm 製品 `@smartdoca/sheet` 0.2.0-rc.19。工具欄「資料驗證」與「插入 → 下拉選單」分別使用各自入口。公開宣告及 Yjs/model/XLSX 入口與 rc.18 位元組一致；宿主繼續使用已匯出的選單擴充套件、資源、穩定錨點和協作 API。宿主同步已匯出的 `session.setReadOnly` API，模式切換後繪製前重新整理能力快照，不重建工作簿或 Y.Doc。外掛元素插入透過原生選單擴充套件接入 `SPREADSHEET_MENU_PATHS.toolbarEnd`。這次僅對接介面與製品，不改變 codec、schema、epoch、outbox，不轉換持久化資料或新增相容行為。已有歷史讀取與顯式宿主基線維護命令保持原規則。包與宿主迴歸使用隔離工作簿和文件，構建成功不代表全部表格操作已完成協作驗收。

<a id="文档缓存先展示--2026-10-12"></a>

## 文件快取先展示 — 2026-10-12

按使用者確認的方案，宿主新增精確格式版本 1 的 `doca.document-startup.v1` 展示後設資料，儲存當前登入賬號及最近 12 個已快取文件。只包含公開啟動欄位、文件和所屬文庫後設資料，不包含憑證、評論、授權名單或第二份正文投影。不修改或轉換既有 Yjs checkpoint、不可變 baseline、epoch、schema/codec 協議、訊息 ID 和持久 ACK。舊宿主沒有頁面後設資料，需先聯網開啟一次建立快取；未知或損壞格式不使用、不轉換、不覆蓋，回退程式碼保留正文及未同步修改。

快取文件重新整理時，應用殼和原副本在外掛發現、啟動資訊及文件詳情返回前掛載。使用者明確選擇按上次許可權允許離線編輯。實時校驗和重試在後臺執行，臨時網路故障保留同一編輯器。重連合並遠端變化並按原位元組/ID 重放，只有精確伺服器 ACK 才清理對應更新。退出/切換賬號及明確會話/資源拒絕會停止展示對應後設資料，不刪除持久正文或待同步修改；譜系不匹配繼續按原精確協議暫停。

這要求已有後設資料、成功的瀏覽器儲存和可用的應用靜態資源，不是完整離線 PWA。評論、上傳和許可權修改仍需聯網。宿主既有副本預設引數和歷史讀取規則未調整，也未新增舊格式介面卡。隔離驗收由 `tests/document-startup-cache.test.ts`、`scripts/qa-document-startup.mts` 記錄；基礎快取恢復不代表各格式全部操作均已完成收斂驗證。詳見[儲存與恢復邊界](access-offline-events.md#页面缓存先展示--2026-10-12)。

<a id="slate-与-canvas-发布包接入--2026-10-13"></a>

## Slate 與 Canvas 釋出包接入 — 2026-10-13

宿主 0.1.23 鎖定 npm 實際產物 `@smartdoca/slate` 0.4.14 與 `@smartdoca/canvas` 0.4.3。Slate codec/Yjs/headless/conversion 位元組及公開入口對映不變，Canvas model/IO 位元組及公開入口對映不變。DOCX 補丁繫結新版 Slate 產物。宿主保持穩定會話與資源回撥，許可權、presence、錨點、原始 checkpoint、epoch 和待確認訊息 ID 的歸屬不變。包在檢視中重繪過期圖形預覽，不產生內容寫入。

使用者明確選擇不保證舊流程圖相容；不增加宿主舊節點適配、自動轉換、歷史欄位回填或資料刪除。新版圖形、實心箭頭幾何、手動 routeMode/vertices 和端點錨點使用已釋出的原生模型，AI 校驗與手冊接收並保留這些欄位。舊編輯器不保證顯示新欄位，應保留舊部署及升級前備份；宿主資料庫回退另按已審定的知識冊儲存流程執行。原有歷史讀取與規範化輔助程式碼仍在原路徑，本次不重新設計它們。

隔離宿主迴歸覆蓋原生欄位校驗、持久與重複 ACK、遠端無回聲、撤銷重做、checkpoint 恢復、畫板引擎單例註冊及 DOCX 往返。瀏覽器及最終發行檢查寫入 0.1.23 驗證附件；模型測試不代表已驗收每個新版圖形手勢或全部畫板操作。

Canvas 0.4.3 還包含使用者已明確同意的檢視規則：0.8 到 3 的數值文字行高按字號倍數顯示，其他數值仍是畫素。載入、選區、尺寸和空閒不回寫模型，普通文字編輯保留原數值，僅使用者顯式修改行高時儲存原生百分比值。不增加宿主遷移、回填或存量資料刪除。瀏覽器驗收驗證 32 px 字號的 1.5 行高顯示為 48 px、文字編輯後原數值保留、空閒零寫入、雙副本同步與過載；回退時不保證舊介面呈現。

<a id="slate-与表格包升级--2026-10-14"></a>

## Slate 與表格包升級 — 2026-10-14

當前工作區鎖定 npm 實際產物 `@smartdoca/slate` 0.4.15 與 `@smartdoca/sheet` 0.2.1。公開入口對映和依賴不變；Slate codec/Yjs/headless/conversion 位元組不變，現有 DOCX 樣式補丁繫結 0.4.15。AI 節點校驗接收有限數值的 `angle`（度），編輯手冊保留該欄位。原生圖片首次點選選中、再次點選預覽，點選其他位置後重新從選中開始。

使用者明確同意：CRDT 追加工作表（包括升級前追加的）及虛擬空恢復工作表採用預設行高 18 px、列寬 72 px。不可變 baseline 中已有工作表保留原尺寸欄位，預設欄位也不回填；顯式行列尺寸繼續覆蓋預設值。宿主新建工作表同樣採用 18/72。此決定只改變投影及預設顯示，不回寫、轉換或刪除已有 seed、baseline、checkpoint、epoch、評論和待確認訊息 ID。schema 6 與精確協議拒絕規則不變。既有最後工作表的虛擬恢復、歷史讀取和規範化輔助程式碼留在原路徑，不重新設計。

延續此前已確認的不保證舊流程圖相容，不增加舊節點適配或欄位回填。旋轉使用已釋出原生模型；舊編輯器可能忽略角度，舊錶格包可能顯示不同預設尺寸。保留上一版 registry 製品、依賴版本、補丁和鎖檔案用於包回退，服務端和 Web 一起更新；宿主資料庫回退另遵循已審定的儲存流程。

驗收使用真實 rc.19 包生成的不可變樣本、隔離宿主資料庫和瀏覽器文件，覆蓋原位元組保留、已批准尺寸、旋轉欄位校驗/ACK/無回聲/撤銷/恢復、穩定錨點、只讀、檔案往返及空閒選區零寫入。製品審計及檢查結果記錄在 `docs/verification/editor-package-upgrade-2026-10-14/report.json`，原始碼升級記錄見[待發布說明](releases/pending-editor-package-upgrade.zh-CN.md)。不據此聲稱全部圖形手勢、所有表格操作或原生裝置已驗收。

<a id="表格超链接补丁--2026-10-15"></a>

## 表格超連結補丁 — 2026-10-15

宿主 0.1.25 鎖定實際 npm 製品 `@smartdoca/sheet` 0.2.2。與 0.2.1 相比，公開入口、依賴契約和型別宣告不變，Yjs／model／XLSX 執行 JavaScript 位元組相同（部分 source map 有差異）。超連結彈窗取消後正確恢復原生草稿，原生移除連結命令沿用 inlineLink 能力及只讀檢查。宿主繼續使用穩定編輯器／會話、資源回撥、原生操作和持久 ACK 佇列。本補丁不改變 schema 6、不可變 baseline、epoch、checkpoint 或待確認更新身份，不增加資料轉換或相容適配；回退保留原依賴鎖定及 lockfile。製品審計和隔離驗證記錄見 `docs/verification/sheet-package-upgrade-2026-10-15/`。

<a id="思维导图工作区升级--2026-10-16"></a>

## 思維導圖工作區升級 — 2026-10-16

宿主 0.1.29 鎖定實際 npm 製品 `@smartdoca/slate` 0.4.20，包含 0.4.19 的圖形／媒體互動修復。公開入口、依賴和宿主元件／handle 宣告不變；codec、Yjs、headless、conversion 執行時程式碼與 0.4.18 位元組相同，原 DOCX 補丁內容不變並繫結到 0.4.20。AI 指導保留完整原生思維導圖，包括 `structure`、`theme`、`background`、節點 `fontSize`／`bold` 和 `style:"underline"`。

使用者已明確同意新版原生思維導圖預設顯示作用於已有文件。開啟舊圖或重新生成版本 6 預覽只改變檢視，不回寫原節點、checkpoint、epoch 或待確認更新身份。工作區開啟後不儲存關閉不產生內容提交；明確儲存才透過現有 Slate/Yjs outbox 與落庫 ACK 提交原生草稿和預覽。不遷移、不補寫歷史欄位、不新增舊樣式適配；現有歷史讀取及規範化輔助邏輯保留原路徑，不重新設計。schema 3 與精確協議檢查不變，沒有 SQL 變更。

保留 0.1.28 部署、原包製品、版本鎖定、補丁和 lockfile 供回退。舊編輯器可能忽略新樣式／設定或顯示不同預設值。恢復時保留後續寫入；恢復升級前備份會丟失其後的編輯。測試只使用隔離的合成文件／資料庫；範圍及限制見 `docs/verification/slate-workspace-upgrade-2026-10-16/`。

<a id="三编辑器升级--2026-10-17"></a>

## 三編輯器升級 — 2026-10-17

Doca 固定安裝實際 npm 包 `@smartdoca/slate` 0.4.22、`@smartdoca/slides` 0.3.0-alpha.3。Canvas 使用不可變的 `vendor/smartdoca-canvas-0.5.0-75e637df1a75.tgz`：npm 0.5.0 的庫構建誤刪了 Slate 與純文字內部編輯器註冊模組，AidCanvas 原始碼已透過 sideEffects 宣告修復，宿主使用重建產物。這個修復包和原始碼改動尚未釋出 npm。

Slate 新增五頁元素配色，進入圖形標籤編輯時全選文字。codec/Yjs/headless 位元組與 0.4.20 一致，原有 DOCX 補丁原樣繫結到 0.4.22。Canvas 保持 `aidcanvas-yjs` schema 1；圖片和附件回撥儲存穩定資產 ID，傳遞真實進度和取消訊號，並接入宿主鑑權預覽，包括歷史、回收站、審計只讀檢視。服務端校驗新增富文字媒體引用屬於當前文件。臨時畫布 presence 完整轉發經過校驗的相對文字位置和場景滑鼠座標，身份及顏色仍由服務端決定；支援僅滑鼠訊息，不復用永久評論錨點。

Slides 要求 codec revision 6。客戶端與服務端統一嚴格協商 `eppt-yjs-v6`，文件 schema 2 / protocol 1 不變。使用者明確選擇**只支援新文稿**：舊 `eppt-yjs-v5` 文稿和舊客戶端拒絕開啟或接入，原 checkpoint、增量、epoch、歷史和待提交訊息標識原樣保留。不增加舊 codec 讀取、編碼標識改寫、自動轉換、遷移或 SQL 結構變更。宿主接受原生文字邊距與表格欄位；AI 表格命令透過原生 controller 支援合併/拆分、樣式、尺寸、清空、貼上與批次刪行列。單元格仍是純文字加整格樣式。

部署時服務端與 Web 必須同步更新。保留舊部署、版本鎖定、補丁、鎖檔案與安裝產物；舊程式不承諾讀取新功能寫入，恢復前須保留後續資料。本次沒有修改使用者資料庫或部署。隔離驗收、雜湊、截圖和邊界見 `docs/verification/three-editor-upgrade-2026-10-17/`。

<a id="canvas-052-正式包对接--2026-10-17"></a>

## Canvas 0.5.2 正式包對接 — 2026-10-17

Doca 0.1.31 鎖定正式 npm 包 `@smartdoca/canvas` 0.5.2，替代上文臨時 0.5.0 tarball；臨時包退出執行依賴和構建路徑，上一原始碼快照保留恢復依據。公開匯出、依賴和宣告簽名相同，宣告差異只有一處表格佈局註釋；模型執行程式碼逐位元組一致。不增加歷史讀取器、原場景轉換、欄位補寫、codec/schema 變更或 checkpoint/outbox 替換。

新包修復連續中文輸入、平移縮放時工具條跟隨，並按內容撐高表格行。文字與行幾何透過同一原生協同撤銷事務儲存。宿主繼續使用穩定模型、已認證資源與 presence 回撥、持久化 ACK 佇列。原始碼、瀏覽器、映象及釋出證據位於 `docs/verification/release-0.1.31/`；此前 0.5.0 記錄保留為當時的驗收依據，不代表 0.5.2 全部操作均已驗證。

<a id="canvas-inline-integration-and-slate-upgrade--2026-10-18"></a>

## Canvas inline integration and Slate upgrade — 2026-10-18

Doca 0.1.32 pins the published Slate 0.4.23 and the published registry artifact `@smartdoca/canvas` 0.5.4, which includes Canvas 0.5.3. Slate public declarations, codec/Yjs/headless/conversion bytes match 0.4.22; the identical DOCX patch is rebound. The owner approved current Leafer mind-map display defaults for existing maps. Open/close and preview regeneration remain view-only; explicit save uses the native tree.

Canvas `richTextExtensions` now supports `inline:true`, optional `suggestions:{trigger,search(query,{signal})}` and `matchPaste`/`paste(text,{signal})`. Inline nodes store `{type:'inline',inline:{id,type,label,data},children:[{text:''}]}` in schema-1 rich paragraphs and one U+FFFC marker in native text. The package owns selection, live insertion ranges, debouncing, menu keys, atomic clipboard/deletion/undo, label rendering/export and unknown opaque JSON. Doca supplies directory/ACL checks, user cards, stable reference UUIDs, same-origin document title lookup, notifications and reference indexing. Pending lookup/paste, UI and resolved URLs remain view state. Closed/deleted/readonly targets cannot accept late insertion. Formatting and inline metadata retain existing whole-field LWW semantics.

Active and readonly/history/trash/audit surfaces supply stable `onAttachmentPreview` callbacks to the shared authorized viewer; images retain `onResourcePreview`, and download URLs remain host-authorized. No new transport, autosave, schema/codec, DDL, migration, backfill, historical adapter or epoch/checkpoint/outbox rewrite is introduced. The owner approved no older-client rendering guarantee for new inline metadata. Preserve existing and later data and retain the 0.1.31 deployment, pins, patch and lockfile for recovery. Verification is recorded in `docs/verification/release-0.1.32/` and the native Canvas browser tests; no user documents or databases are used.

<a id="canvas-056-与-sheet-024-对接--2026-10-20"></a>

## Canvas 0.5.6 與 Sheet 0.2.4 對接 — 2026-10-20

當前程式碼鎖定正式 npm 包 `@smartdoca/canvas` 0.5.6、`@smartdoca/sheet` 0.2.4。公開入口及宿主使用的宣告不變；Canvas model 和 Sheet model/Yjs/XLSX 與上一版逐位元組一致。Canvas 私有渲染宣告和 IO 分包引用有變化；Sheet 將已有 0.25.1 執行時的 `@univerjs/drawing-ui`、`@univerjs/sheets-filter` 宣告為直接依賴。

使用者明確同意上游對舊圖形的檢視規則：包含 diagram-body、僅有 frame/diagram-node 名稱且沒有衝突 kind/顯式容器角色的包裝識別為圖形，隱藏重複外框填充/描邊和生成的 Frame 標題，並令圖形、文字尺寸跟隨包裝；顯式容器和無形狀名的自定義路徑保留其角色與輪廓。已有橢圓/菱形端點按新輪廓顯示，原四個中點埠索引不變並新增八個埠。開啟、選中、視口變化和關閉不得回寫原模型/checkpoint；顯式縮放或編輯透過原生協同事務與撤銷棧儲存。不批次轉換、不補欄位、不變更 DDL、schema/codec、epoch、checkpoint 或待確認訊息身份。Canvas 保持 aidcanvas-yjs/schema 1，Sheet 保持 exlsx-cell-registers/schema 6，未知版本繼續精確拒絕。

Canvas 圖片先選中再預覽；複製 PNG 畫素透過宿主 resolveDownloadUrl 鑑權，閱讀模式也可用。歷史/回收站預覽保留原有訪問引數，服務端仍拒絕不支援的審計資源訪問。Sheet 使用包內原生篩選渲染及當前內聯圖片幾何/預覽，不修復傳入的文件資料。資產 UUID、ACL、臨時 presence、永久錨點、持久 ACK 和原 update 保持原歸屬。已有歷史讀取器、虛擬工作表恢復、規範化程式碼和已批准顯示預設值僅審計，不擴充套件其相容行為。

回退依據為原 Canvas 0.5.5 / Sheet 0.2.3 製品、依賴和鎖檔案（原始碼提交 589a3589820770d218bea418fe7c93cd10583f95）；製品身份見 docs/verification/editor-packages-2026-10-20/package-audit.json。服務端與 Web 一起更新，回退前保留後續寫入，不承諾舊介面與新圖形行為一致。驗證只使用隔離資料庫/文件，未部署；透過專案及未覆蓋範圍見[接入驗證](verification/editor-packages-2026-10-20/README.md)。

<a id="canvas-058-与-sheet-025-对接--2026-10-21"></a>

## Canvas 0.5.8 與 Sheet 0.2.5 對接 — 2026-10-21

Doca 鎖定 npm 正式釋出的 `@smartdoca/canvas` 0.5.8 和 `@smartdoca/sheet` 0.2.5。相對 Canvas 0.5.6 / Sheet 0.2.4，公共型別、入口和依賴不變，Canvas model 與 Sheet model/XLSX 執行時程式碼逐位元組一致。Sheet 的 Yjs 會話先恢復原生篩選器，再計算同批單元格/篩選更新；恢復或排序後重新整理未改變的條件。該修復只調整投影，不改變 schema 6 編碼或不可變 baseline。

Canvas 包含 0.5.7 的樣式、平移、提及、重做及嵌入式檢視選單修復，以及 0.5.8 的無繫結連線線整體拖動。網格和背景色僅為檢視狀態；顯式編輯仍經現有模型、撤銷棧、宿主 outbox 和持久 ACK。Canvas 保持 `aidcanvas-yjs` schema 1，Sheet 保持 `exlsx-cell-registers` schema 6。本次沒有新增宿主介面卡、相容行為、資料轉換、歷史欄位預設值、DDL 或 epoch/checkpoint/待確認訊息改寫。已有歷史讀取、虛擬工作表恢復、規範化函式及此前獲批的顯示規則保留原有路徑，未重新設計。

使用隔離的合成文件和資料庫驗證。釋出包身份、執行時程式碼比對、透過專案和限制見[對接驗證](verification/editor-packages-2026-10-21/README.md)。回退保留源提交 `31fca12f48a54f1c2ce3caeec6a0d976e164ac4e` 的依賴、鎖檔案、工作區配置和製品；服務端和 Web 一起重建，保留後續寫入。未使用使用者文件/資料庫，未部署。

<a id="问题清单修复与-canvas-个人偏好--2026-10-22"></a>

## 問題清單修復與 Canvas 個人偏好 — 2026-10-22

已核實正式基線為Slate0.4.24、Markdown0.4.4、Sheet0.2.9、Canvas0.5.13及Slides0.3.0-alpha.4，按真實製品及安裝檔案審計；當前臨時測試下述0.5.14C1file候選。已有 codec/schema、不可變 baseline、epoch、checkpoint、原始待確認正文 update 和持久 ACK 歸屬不變。Canvas0.5.13的model/IO/preferences/全部宣告/exports與0.5.12相同，內部鍵盤 helper 宣告不是新增公開 SDK API；Sheet 0.2.9 包含複製及下拉驗證刪除修復，model/Yjs/XLSX 執行時程式碼與 0.2.7 相同。相簿回撥只解析授權檢視，不提交編輯草稿。已批准的歷史讀取、規範化和顯示規則保留原路徑；無舊資料轉換、schema 適配、遷移或 DDL。

使用者明確批准 Canvas 個人瀏覽器偏好按網站、賬號和文件隔離。獨立 v1 記錄經已釋出的純校驗器驗證後傳給受控 view/creation props。無記錄保持當前行為；未知版本或壞 JSON 保留原文，不讀取、不覆蓋。儲存失敗僅在當前檢視保留使用者顯式選擇。偏好變化、選單及小地圖導航不進入正文撤銷或協同；新建預設樣式僅影響以後的互動建立，不改已有正文、API/AI 插入、匯入或遠端投影。已有記憶體會話樣式快取不轉換為瀏覽器記錄。回退停用讀取，保留記錄和後續正文。

宿主繼續持有唯一模型會話和傳輸。當前臨時0.5.14C1file候選在精確155檔案上原生17/偏好7組透過，正式包和最後編譯Web仍須獨立驗收。焦點修復區分真實物件/顯式工具操作與自動完成，不放寬外部輸入和控制元件歸屬。無新增自動儲存、baseline重建或epoch/訊息ID替換。隔離網站證據和剩餘範圍見[問題清單驗收](verification/issue-tracker-2026-10-21/README.md)。保留上一版製品、依賴、鎖檔案，回退時服務端和 Web 一起重建，不能用舊資料庫覆蓋後續編輯。

<a id="原生输入与授权追加边界--2026-10-22"></a>

## 原生輸入與授權追加邊界 — 2026-10-22

原生編輯器分發必須先檢查事件歸屬，再操作保留的選區。宿主評論/AI 輸入框保留鍵盤、剪貼簿和輸入法行為，不產生正文寫入。Canvas 0.5.12 修復原生路徑；宿主在相鄰 AI/佈局變化期間保留評論草稿，並獨立於側欄載入已授權永久標記。不新增錨點、codec、模型、命令或 presence 格式。正式歸檔與已測 C3 鍵盤/評論候選一致；舊 0.5.11 完整互動收據仍保留原範圍。

獲批的富文字/Markdown 瀏覽器速記嚮明確選中的授權既有 append 目標追加使用者純文字，使用現有原生 epoch、正文事務和回執/投遞路徑。響應丟失重試原 ticket/request ID 與原 payload；已接受重放不重複追加或增加 seq。目標、輸入和當前程序內五分鐘 ticket 為臨時狀態，不承諾持久擴充套件草稿或跨程序恢復。原正文和後續編輯保留，不支援目標明確拒絕且不轉換。見[速記契約](browser-quick-note.md)及隔離雙頁/實際 MV3 收據。

<a id="获批的-ai-待发送存储--2026-10-22"></a>

## 獲批的 AI 待傳送儲存 — 2026-10-22

這是宿主 AI sender 佇列，與文件協同 outbox 分開。使用者兩次明確同意具體保留/回退方案。新就緒訊息使用獨立 IndexedDB `doca-ai-pending` version 1、`entries` store，以 `[docaOrigin,userId,connectionId,messageId]` 為鍵並保留擴充套件明確 profile 身份/修訂。條件轉換在短 readwrite 事務提交後才成功；Web Locks 只序列網路投遞，不負責儲存原子性。accepted/withdrawn 原項墓碑保留。未知版本/記錄及儲存拒絕或失敗均保留並拒用，不回退 localStorage 或僅記憶體傳送。

原 0.2.7 localStorage 佇列只讀且不自動重放。每條已識別舊項需明確繼續或撤回並選擇當前設定；完整 payload 保留原 ID 和來源雜湊，已接受任務只核對而不重發。升級/回退前停止傳送並關閉全部舊網站頁和擴充套件：舊 sender 看不到新墓碑，因此不支援新舊同時執行。回退停止新 sender 並保留新舊儲存、墓碑和後續資料，不回寫舊佇列或自動恢復舊 sender。不轉換伺服器表、會話/文件歷史、許可權或編輯器 checkpoint。精確規則及雙頁/重新整理/失敗/舊項證據見[獲批佇列記錄](verification/issue-tracker-2026-10-21/ai-pending-idb.md)。

<a id="获批的表格默认尺寸与个人缩放--2026-10-23"></a>

## 獲批的表格預設尺寸與個人縮放 — 2026-10-23

使用者明確同意預設行高 21.78 CSS px、列寬 87.12 CSS px，較原預設增大 10%。新建宿主工作表使用新值；未儲存預設尺寸的歷史附加工作表和虛擬恢復表，也採用新的顯示預設值。baseline 中已儲存的預設尺寸、手動行列尺寸、原 baseline 位元組、worksheet seed、checkpoint、epoch 和 pending update 保留；不回填歷史欄位、不轉換已存資料、不改變 schema。回退到舊包只恢復其預設欄位的顯示預設值，保留後續編輯。原生手動行高列寬仍參與協作和撤銷。

右下角仍預設 100%。宿主只把使用者明確調整的原生縮放儲存為獨立 version-1 瀏覽器記錄，按網站、賬號和文件隔離。這是整個表格文件的顯示比例，切換工作表也沿用，不是行列尺寸覆蓋。缺記錄時開啟不建立記錄；未知版本、壞記錄或未識別欄位保留原文，不覆蓋；快取失敗僅在當前掛載檢視保留顯式選擇。匿名檢視不持久化。回退停用新偏好的讀取和寫入，保留記錄與全部後續內容。

包負責原生縮放渲染和回撥，宿主負責瀏覽器儲存與身份。應用偏好、拖動右下角滑塊、加減按鈕、切表、只讀切換、resize 和遠端投影不得進入文件撤銷、outbox、正文更新或歷史。個人縮放不能洩露到匯出的快照或 XLSX。這是已同意的邊界，不證明當前安裝包已匯出所需 props；接入仍須核驗正式製品和隔離雙頁/瀏覽器收據。

<a id="获批的表格筛选范围扩展--2026-10-23"></a>

## 獲批的表格篩選範圍擴充套件 — 2026-10-23

使用者明確同意：開啟時保留原已存範圍；確認有效篩選條件時，在原列範圍內向下擴至最後一條有內容的記錄；緊接末尾追加內容時納入連續記錄。保留表頭、列邊界和所選條件。樣式、其他列的內容和清除條件不擴充套件範圍。追加內容與範圍擴充套件必須在同一協作事務和同一次撤銷中儲存；遠端投影與恢復先應用已儲存範圍，再計算隱藏行，不產生本地回聲。

正式 Sheet 0.2.12 使用現有 schema-6 單元格和穩定 feature 暫存器實現此規則。不新增編輯器 schema、公共 API、歷史介面卡、儲存轉換、DDL、baseline/epoch 替換或 pending update 重寫；已批准的歷史讀取與預設值規則保持原狀。已有短範圍只有在明確確認時修復，開啟文件不會修復。回退保留已存的原生範圍與全部後續內容；先前包可讀這些範圍，但不會持久儲存之後的隱式擴充套件。

Doca 0.2.11 鎖定正式 npm Sheet 0.2.12。包及隔離宿主驗收與生產部署分別記錄。見[篩選驗證](verification/sheet-filter-range-2026-10-23.md)。

<a id="评论背景运行时边界--2026-10-28"></a>

## 評論背景執行時邊界 — 2026-10-28

Sheet 0.2.14 的 `commentHighlightAnchor` 和 Slides 0.3.0-alpha.5 的 `activeCommentId` 是宿主控制的檢視屬性。宿主僅傳入明確點選且已授權的當前評論。開啟側欄、連結定位或點選正文原生標記均不啟用評論背景；點選其他位置、解決評論或關閉側欄時清除，切換評論時替換，重新開啟不恢復。SDK 使用既有錨點解析和當前幾何繪製無互動背景，不寫模型、永久錨點、事務、undo、presence、outbox 或持久儲存。Canvas 0.5.16 的表格連線點可見性同屬檢視狀態。此邊界不改變原錨點格式或刪除目標的既有解析規則；未知 schema 繼續精確拒絕，不新增舊格式讀取或轉換。
