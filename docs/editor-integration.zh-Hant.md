<a id="编辑器集成与文件交换"></a>

# 編輯器整合與檔案交換

[English](editor-integration.md)

本文是五種編輯器的整合源文件，子包透過可在倉庫外使用的 [skill 引用](../skills/doca-editor-integration/references/integration.md)讀取。按安裝包真實匯出使用介面，目標能力與未實現項不能作為已有 API；實時協同要求遵守[協同契約](collaboration-sdk-contract.zh-Hant.md)。

<a id="已安装包与宿主适配"></a>

## 已安裝包與宿主適配

| 格式 | 當前安裝包 | 宿主入口 |
| --- | --- | --- |
| 富文字 | @smartdoca/slate 0.4.27 | document-editor.tsx |
| Markdown | @smartdoca/markdown 0.4.6 | markdown-editor.tsx |
| 表格 | @smartdoca/sheet 0.2.21 | spreadsheet-editor.tsx |
| 畫布 | @smartdoca/canvas 0.5.17 | canvas-editor.tsx |
| 幻燈片 | @smartdoca/slides 0.3.0-alpha.6 | presentation-editor.tsx |

入口位於 [文件 feature](../apps/web/src/features/documents)。包負責模型、編輯命令、撤銷、格式渲染、選擇與轉換；宿主負責身份、ACL、上傳下載、引用、使用者卡片、導航、評論和協同連線。語言隻影響介面，不翻譯使用者正文，不重建編輯器。

宿主和五種編輯器支援相同的八種[介面語言](i18n.zh-Hant.md)。原生表格選單和對話方塊使用對應的 Univer 語言。

<a id="引用、资源与查找"></a>
<a id="引用资源与查找"></a>

## 引用、資源與查詢

五種編輯器均使用精確正式 npm 版本。已安裝 Canvas 0.5.14、Sheet 0.2.11、Slate 0.4.25 與公開歸檔逐檔案一致；Canvas 與此前透過驗收的 C1 位元組相同。Slate 0.4.25 已包含原 DOCX 修復，Markdown 0.4.4 已包含原 KaTeX/延遲 PDF 修復。過時編輯器補丁已移除，可透過 Git 歷史及保留的本地產物恢復；部署打包與釋出檢查拒絕編輯器本地歸檔和活動補丁。逐包審計及版本限定的網站結果見[正式 npm 接入驗收](verification/issue-tracker-2026-10-21/npm-direct.md)。Sheet 0.2.11 已提供實際受控縮放介面及獲批尺寸；73 個安裝檔案與正式歸檔一致，最終宿主網站驗收與此前 0.2.10 收據分開記錄。

Canvas 的 `viewPreferences` / `onViewPreferencesChange`、`creationPreferences` / `onCreationPreferencesChange` 為真實公開介面，純校驗器來自 `@smartdoca/canvas/preferences`。按使用者批准，Doca 使用按網站、賬號和文件隔離的獨立瀏覽器 v1 記錄，僅儲存顯式原生偏好變化。無記錄保持當前行為，未知版本或壞 JSON 保留原文，不讀取、不覆蓋；儲存失敗時當前檢視保留本次選擇並提示無法儲存。檢視及預設樣式不改已有元素、API/AI 插入、匯入內容、協同資料或歷史，預設樣式隻影響以後互動建立的元素。已有模組級會話樣式快取並非瀏覽器儲存，不會自動轉入新記錄。回退僅停用新偏好，保留記錄及後續正文。

Canvas 0.5.14 保留選單、投影、佈局、標題及原生鍵盤歸屬修復，在真實物件移動柄和明確工具選擇時歸還本 Canvas 焦點；自動工具完成仍與使用者選擇分開，公開元件與 handle 形狀不變。Sheet 0.2.10 保留剪貼簿和下拉刪除修復，並修復超連結輸入焦點及相簿銷燬時的延遲驗證任務；Sheet 0.2.11 的 model/Yjs 相比 0.2.10 僅改變獲批預設尺寸，兩個 XLSX 入口逐位元組相同，schema 6 不變。普通單元格、文字草稿、公式欄、對話方塊及只讀保持原生規則。PNG 不顯示 SVG 專用字型提示；Doca 翻譯保留的 SVG 提示。已批准的舊圖形顯示規則、歷史讀取、規範化及精確 schema 校驗保留原路徑，不擴充套件。無格式轉換、DDL、baseline、epoch 或待確認 update 改寫；回退保留上一版部署、依賴、鎖檔案、製品及後續文件/會話/檔案寫入。

內部文件引用儲存穩定 UUID 和 `#/r/{id}` 相對位置；提及保留使用者 UUID，候選使用當前使用者目錄策略。引用及反向引用按當前閱讀權過濾，引用本身不授予訪問權。

圖片、附件和素材使用宿主資源回撥。上傳進度、取消、錯誤和遲到回撥需繫結原目標；下載透過 `assets/:id/content?download=1` 鑑權，不把物理儲存地址當永久引用。

富文字與表格向實際安裝包傳入穩定的 `onAttachmentPreview` 回撥。富文字提供 `AttachmentElement.path/name/mimeType`；表格原生行內附件提供 `event.node.refId/label`。宿主將資產 UUID 解析為鑑權內容端點，開啟共用的 `DocumentFilePreview`，只讀、歷史及回收站檢視也接入並保留各自訪問引數。富文字編輯模式先點選選中，再點選或使用預覽按鈕開啟；只讀模式單擊預覽。表格點選原生附件標籤觸發預覽，現有整單元格物件渲染仍可用。預覽不修改模型、協同會話或持久化格式。

實際安裝的富文字、Markdown、表格和幻燈片包提供當前圖片預覽回撥，宿主結合 Canvas 資源接入同一鑑權圖集。每次圖片引用保留獨立穩定 ID，同一資產重複使用仍是不同條目；幻燈片按頁面與元素順序排列，表格使用公開 `getImageGallery()` 快照，包含原生單元格草稿及其他工作表。流程圖、思維導圖和 Mermaid 的 SVG 與普通圖片一起按需解析。大圖支援拖動、前後按鈕、方向鍵、橫向滾輪與觸控切圖，切換圖片重置平移。編輯、閱讀、歷史及回收站入口保留各自鑑權引數，開啟、切換或關閉預覽不提交草稿或寫入協作內容。

查詢替換透過各編輯器的模型或原生能力完成。富文字使用宿主 Slate 模型適配；其他格式使用實際安裝包提供的 find/replace 或原生面板。只讀、斷線及演示狀態不提供正文替換。沒有通用公開編輯器任意修改控制代碼，不承諾所有格式具有相同文字範圍或正則能力。

<a id="表格默认尺寸与个人缩放--2026-10-23"></a>

## 表格預設尺寸與個人縮放 — 2026-10-23

Sheet 0.2.11 實際匯出 `SpreadsheetViewPreferences`、`isSpreadsheetViewPreferences` 及可選 `viewPreferences` / `onViewPreferencesChange` props；純校驗器也可從 `@smartdoca/sheet/preferences` 獲取。宿主在當前網站按 `doca.sheet.zoom.v1:<账号>:<文档>` 儲存 `{version:1,zoomRatio}`。預設仍為 100%，只有使用者明確調整原生縮放才寫記錄。缺記錄使用 100%，匿名檢視僅臨時生效；未知版本、壞 JSON 和額外欄位均保留且拒用，不覆蓋。儲存失敗時當前檢視保留明確選擇並提示。縮放不進入快照、XLSX 正文、協作、撤銷或歷史。

使用者明確批准新工作表以及未記錄預設尺寸的歷史附加/恢復表採用 21.78 行高、87.12 列寬。已有 baseline 預設尺寸、手動行高列寬、原 baseline/seed/checkpoint/update 位元組保留；開啟不補欄位或遷移資料。回退包版本恢復原缺欄位顯示預設，回退宿主停用獨立縮放記錄，保留記錄和後續正文編輯。

<a id="原生事件归属、评论与速记--2026-10-22"></a>
<a id="原生事件归属评论与速记--2026-10-22"></a>

## 原生事件歸屬、評論與速記 — 2026-10-22

元件必須在執行原生命令前拒絕屬於宿主輸入框或外部可編輯目標的鍵盤/剪貼簿事件，不能只依賴宿主 React 阻止冒泡來保護元件級鍵盤分發。Canvas 0.5.12 校驗此歸屬，不改公開 props、場景欄位或命令 schema。Doca 負責評論輸入、傳送/上傳狀態、草稿保留、佈局及授權標記分頁。在正文元素保持選中時，評論輸入、刪除、貼上、撤銷不應改變文件 checkpoint 和 seq。永久錨點、presence 和正文 outbox 格式不變。

按使用者批准，擴充套件速記僅明確選擇啟用且已授權 append 方案中的既有富文字或 Markdown 目標，追加純文字且不呼叫 AI。目標、文字和 ticket 僅儲存在本次擴充套件檢視記憶體。宿主使用既有原生正文命令、回執和協同投遞，不提供任意文件許可權或第二套自動儲存。富文字追加字面文欄位落，Markdown 追加普通原文並沿用當前渲染。響應不確定時重試同一 ticket/request ID，不自動重選目標。ticket 在當前程序內有效五分鐘；重啟、過期或撤權可以終止本次操作並保留輸入。見[速記契約](browser-quick-note.md)。

正式包及逐項證據見[問題清單驗收](verification/issue-tracker-2026-10-21/README.md)。此前 Canvas 0.5.12/0.5.13 的失敗保留原範圍；正式 0.5.14 與透過原生 17 階段及偏好 7 組的 C1 歸檔一致。Sheet 0.2.10 在編譯 Doca 上透過兩獨立輪原生及四序列輪相簿驗收。後續包和宿主變更仍需自己的最終編譯 Web 驗證。未宣稱生產部署。

<a id="文件导入导出"></a>

## 檔案匯入匯出

| 格式 | 匯入 | 匯出與限制 |
| --- | --- | --- |
| 富文字 | DOCX、Markdown、PDF | DOCX、Markdown、PDF；複雜佈局可能簡化，不支援舊 DOC |
| Markdown | Markdown、PDF（轉換） | Markdown、PDF；不打包完整離線素材 |
| 表格 | XLSX | XLSX；不支援物件可降級並告警，不承諾完整 Office 保真 |
| 畫布 | PNG/JPEG/WebP/SVG 圖片素材 | PNG/SVG；匯入不恢復原生圖層 |
| 幻燈片 | PPTX（最大 30 MB） | PPTX；基礎文字、圖形、表格和圖片，複雜母版/動畫可簡化，不支援舊 PPT |

匯入建立新文件和新譜系，資產重新授權繫結；不覆蓋正在編輯的文件。轉換警告向使用者展示。PDF 匯出走瀏覽器/元件生成鏈路，不代表完整 Office 排版還原。實現見 [file-transfer.tsx](../apps/web/src/features/documents/file-transfer.tsx)，職責和驗收見[檔案交換契約](editor-file-exchange-contract.zh-Hant.md)。

<a id="评论与业务扩展"></a>

## 評論與業務擴充套件

永久錨點與線上游標不同。五種格式按各自協議提供內容評論；表格使用穩定行列 ID 與原生 capture/resolve/reveal 方法，校驗結構變化與已刪除目標。未知外掛元素保留原有不透明資料並展示錯誤佔位，不自動轉換或刪除。

模板、素材和文件元素由已安裝提供者貢獻，預設沒有提供者。富文字原子行內和表格整單元格外掛元素已實現，不提供通用塊或表格浮動物件。見[元素契約](plugin-editor-elements.zh-Hant.md)和[模板素材](creation-resources.zh-Hant.md)。

<a id="验证范围"></a>

## 驗證範圍

升級前核對安裝產物的 README、匯出型別和 schema；使用隔離文件驗證真實檔案往返、只讀、素材授權、雙頁同步、回執和過載。不能從單個單元格測試推斷全部表格操作收斂，也不能從構建透過推斷裝置驗收完成。早期接入與驗收記錄保留在[研發資料](research.zh-Hant.md)。

<a id="富文本图块与上传--2026-10-10"></a>

## 富文字圖塊與上傳 — 2026-10-10

工具欄透過已安裝 0.4.13 的 `commands.insertBlock` 插入完整流程圖和思維導圖元素，不用 `toggleBlock` 把段落變成缺少圖資料的塊。圖塊評論和 AI 引用使用現有整塊錨點，不在圖內標籤裡增加使用者提及。上傳介面卡將實際已傳輸位元組轉成 `UploadContext.onProgress` 的 0–1 比例；服務端成功前不顯示完成，保留原生佔位、取消、重試和撤銷流程。

AI 修改先讀完整圖塊，不能從大綱標籤重建。節點填充、邊框、文字顏色分別用 `fillColor`、`color`、`textColor`；連線顏色、粗細用 `color`、`thickness`。自由端點按當前 SDK 使用空 source/target ID 與 `sourcePoint`/`targetPoint` 數值座標，非空未知 ID 仍拒絕。修改 nodes、edges 或 mindData 時，在同一原生事務中使生成的 SVG 及派生邊界失效；僅改顯示寬度保留預覽。不增加舊格式適配、自動轉換或遷移，既有歷史讀取程式碼保持原樣。

<a id="已发布表格包对接--2026-10-10"></a>

## 已釋出表格包對接 — 2026-10-10

宿主 0.1.18 鎖定 npm 製品 `@smartdoca/sheet` 0.2.0-rc.19。工具欄「資料驗證」與「插入 → 下拉選單」分別使用各自入口。公開宣告及 Yjs/model/XLSX 入口與 rc.18 位元組一致；宿主繼續使用已匯出的選單擴充套件、資源、穩定錨點和協作 API。宿主同步已匯出的 `session.setReadOnly` API，模式切換後繪製前重新整理能力快照，不重建工作簿或 Y.Doc。外掛元素插入透過原生選單擴充套件接入 `SPREADSHEET_MENU_PATHS.toolbarEnd`。這次僅對接介面與製品，不改變 codec、schema、epoch、outbox，不轉換持久化資料或新增相容行為。已有歷史讀取與顯式宿主基線維護命令保持原規則。包與宿主迴歸使用隔離工作簿和文件，構建成功不代表全部表格操作已完成協作驗收。

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

<a id="原生编辑器升级--2026-10-16"></a>

## 原生編輯器升級 — 2026-10-16

宿主 0.1.27 鎖定實際 npm 製品 `@smartdoca/slate` 0.4.18 和 `@smartdoca/sheet` 0.2.3。入口及依賴契約不變，Slate codec/Yjs/headless/conversion 位元組與 0.4.15 相同；原 DOCX 補丁內容不變，繫結到 0.4.18。宿主接收新增原生圖形、節點／連線樣式及可選 `canvasSettings`，AI 命令校驗並保留這些欄位。原生圖示編輯採用新版工作區、紙張自動擴充套件、焦點草稿 Ctrl/Cmd+S 儲存及浮動工具欄選擇修復。

使用者已明確同意新版 19.8／79.2 預設尺寸和圖形行為。新建宿主文件、CRDT 追加工作表（含歷史追加表）及虛擬恢復表採用行高 19.8／列寬 79.2 畫素。不可變 baseline 原欄位及其預設狀態保留，顯式行列尺寸保留；不轉換 baseline、seed、checkpoint、epoch、序號、待確認訊息身份及單元格資料。開啟舊圖不改寫原欄位，預設畫布設定僅影響原生檢視，明確儲存圖示才寫入新版圖形欄位／設定。預覽重繪僅更新檢視。富文字 schema 3、表格 schema 6 和持久 ACK／outbox 語義不變；已有歷史讀取器及規範化器保留，不重新設計。

回退保留原依賴、lockfile、補丁和部署。舊編輯器可能顯示不同預設尺寸／樣式或忽略新增欄位，不新增歷史流程圖相容承諾。恢復時保留後續寫入；恢復舊備份會丟失升級後編輯。包含真實已釋出 0.1.26 資料庫的隔離驗證見 `docs/verification/editor-package-upgrade-2026-10-16/`。

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


<a id="ai-原生画布和演示工作流--2026-10-17"></a>

## AI 原生畫布和演示工作流 — 2026-10-17

宿主 AI 畫布工具透過已安裝 Canvas 0.5.0 的公開 `CanvasModel` 命令組合實現 `createFlowchart`、`createMindmap`、`createTable`、`createContainer`，生成原生 schema-1 場景；`table` 透過 `applyScene` 執行有界的零基單元格、區域、行列和尺寸操作。這是宿主 AI 工作流，不是新增的元件 SDK 匯出。基礎原生繪圖仍可使用；禁止透過直接增刪/放置表格子節點、解組或覆蓋後設資料繞過表格結構命令。刪除邏輯思維主題時遞迴刪除後代與思維連線，保留普通聯結器並斷開已刪除引用。

演示工具沿用 Slides 0.3.0-alpha.3 原生 controller 及 revision-6 表格操作。元素 transform 和文稿 size 使用 EMU，pageSize、文字 padding/paddingInsets、表格 resize 使用 CSS 畫素，字號和字間距使用 pt。演示區域性讀取支援 slideId+elementId；outline 返回表格穩定行列 ID、預覽與幾何，畫布返回語義型別、關係、格座標與文字長度。

使用者明確同意刪除畫布/PPT 工具的舊引數別名、自動元素猜測、扁平文字重建與畫素/EMU 自動判斷；舊呼叫形狀明確拒絕，失敗不寫入。不轉換現有場景、不增加歷史讀取器、不改畫布 schema 或已有 Slides codec 拒絕規則，不重寫 checkpoint、epoch、歷史及待提交訊息身份。無關的富文字/電子表格輸入規範化保持原路徑。回退保留舊部署和依賴產物，恢復前保留後續寫入，舊元件不保證理解新寫入。工具契約與隔離驗收入口見 `docs/ai-native-editors.md`。


AI 讀取/編輯回執補充有界的當前原生表格事實，包括最終行列數、末行索引及合併矩形；結構修改後的區域驗收按最終座標核對。Polygon/Line 的點使用當前元件宣告的扁平數字陣列或點物件陣列，巢狀點對明確拒絕；Path 使用 path，不接受 SVG 的 d。錯誤回執指出實際欄位，不增加別名或隱式轉換。根節點 add 接受當前模型原生的 parentId:null。

<a id="canvas-052-正式包对接--2026-10-17"></a>

## Canvas 0.5.2 正式包對接 — 2026-10-17

Doca 0.1.31 鎖定正式 npm 包 `@smartdoca/canvas` 0.5.2，替代上文臨時 0.5.0 tarball；臨時包退出執行依賴和構建路徑，上一原始碼快照保留恢復依據。公開匯出、依賴和宣告簽名相同，宣告差異只有一處表格佈局註釋；模型執行程式碼逐位元組一致。不增加歷史讀取器、原場景轉換、欄位補寫、codec/schema 變更或 checkpoint/outbox 替換。

新包修復連續中文輸入、平移縮放時工具條跟隨，並按內容撐高表格行。文字與行幾何透過同一原生協同撤銷事務儲存。宿主繼續使用穩定模型、已認證資源與 presence 回撥、持久化 ACK 佇列。原始碼、瀏覽器、映象及釋出證據位於 `docs/verification/release-0.1.31/`；此前 0.5.0 記錄保留為當時的驗收依據，不代表 0.5.2 全部操作均已驗證。

<a id="canvas-附件预览回调--2026-10-18--canvas-053"></a>

## Canvas 附件預覽回撥 — 2026-10-18 / Canvas 0.5.3

AidCanvas 原始碼新增可選 `CanvasEditorProps.onAttachmentPreview(resource: CanvasResource): void | Promise<void>`，沿用 slatetsx 的宿主預覽命名。獨立附件、富文字內附件和檔案工具欄共用此回撥；每次點選讀取最新 props。附件優先呼叫它，未提供時呼叫現有 `onResourcePreview`；圖片繼續呼叫 `onResourcePreview`。同步異常和 Promise 失敗交給 `onError`。預覽只傳穩定資源後設資料，不解析地址、不寫內容或觸發協同事務；下載仍由宿主 `resources.resolveDownloadUrl` 鑑權。只讀允許這些宿主操作。

此可選 API 已隨 [`@smartdoca/canvas` 0.5.3](https://www.npmjs.com/package/@smartdoca/canvas/v/0.5.3) 釋出，之前的 0.5.2 型別宣告不包含它。公開 tarball 與已測試的 Node 22/npm 10 產物逐位元組一致；隔離 React 18 宿主的公共型別檢查和四項瀏覽器場景透過，覆蓋最新回撥、異常、只讀鑑權、對端內容不變及窄屏檔案工具欄跟隨。Canvas 演示和示例宿主接入；生產 Doca 保持已安裝的 0.5.2 包和既有介面卡。本輪未修改 Doca 執行時、依賴鎖、資產許可權、schema、codec、checkpoint 或傳輸；後續升級產物和適配需要單獨驗收。

<a id="canvas-inline-integration-and-slate-upgrade--2026-10-18"></a>

## Canvas inline integration and Slate upgrade — 2026-10-18

Doca 0.1.32 pins the published Slate 0.4.23 and the published registry artifact `@smartdoca/canvas` 0.5.4, which includes Canvas 0.5.3. Slate public declarations, codec/Yjs/headless/conversion bytes match 0.4.22; the identical DOCX patch is rebound. The owner approved current Leafer mind-map display defaults for existing maps. Open/close and preview regeneration remain view-only; explicit save uses the native tree.

Canvas `richTextExtensions` now supports `inline:true`, optional `suggestions:{trigger,search(query,{signal})}` and `matchPaste`/`paste(text,{signal})`. Inline nodes store `{type:'inline',inline:{id,type,label,data},children:[{text:''}]}` in schema-1 rich paragraphs and one U+FFFC marker in native text. The package owns selection, live insertion ranges, debouncing, menu keys, atomic clipboard/deletion/undo, label rendering/export and unknown opaque JSON. Doca supplies directory/ACL checks, user cards, stable reference UUIDs, same-origin document title lookup, notifications and reference indexing. Pending lookup/paste, UI and resolved URLs remain view state. Closed/deleted/readonly targets cannot accept late insertion. Formatting and inline metadata retain existing whole-field LWW semantics.

Active and readonly/history/trash/audit surfaces supply stable `onAttachmentPreview` callbacks to the shared authorized viewer; images retain `onResourcePreview`, and download URLs remain host-authorized. No new transport, autosave, schema/codec, DDL, migration, backfill, historical adapter or epoch/checkpoint/outbox rewrite is introduced. The owner approved no older-client rendering guarantee for new inline metadata. Preserve existing and later data and retain the 0.1.31 deployment, pins, patch and lockfile for recovery. Verification is recorded in `docs/verification/release-0.1.32/` and the native Canvas browser tests; no user documents or databases are used.


<a id="canvas-055-host-integration--2026-10-18"></a>

## Canvas 0.5.5 host integration — 2026-10-18

Doca 0.2.1 pins the official npm `@smartdoca/canvas` 0.5.5. This patch removes the rich paragraph menu's code-block action and scopes inline/suggestion CSS under the canvas root. Public exports, dependencies, declarations, model and codec remain unchanged from 0.5.4. The host continues the existing inline and resource callbacks; this integration adds no adapter, persisted-format conversion, history rewrite or new compatibility behavior. The title/emoji and access-tag changes are host presentation only. Published-package hashes and isolated browser/image checks are recorded in `docs/verification/release-0.2.1/`.

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

<a id="画布表格框选与宿主评论--2026-10-23"></a>

## 畫布表格框選與宿主評論 — 2026-10-23

Doca 鎖定正式 npm `@smartdoca/canvas` 0.5.15。新建原生表格無需重新載入即可透過完整包圍框選整體選中，單元格指標處理和部分包圍規則保持獨立。相較 0.5.14，公開入口、依賴、型別宣告、model/preferences 執行檔案及 CSS 不變。正式倉庫的 155 檔案歸檔與稽核後的釋出歸檔逐位元組一致，全部 dist 檔案與已驗收候選包一致。

Canvas、Sheet、Slides 的評論標註預設隱藏，隨宿主評論側欄開啟和關閉顯示或隱藏，移除獨立眼睛按鈕。Doca 為 SDK 獨立富文字 React 根中的使用者卡片轉發當前語言上下文，並在評論寫入成功至列表重新整理之間繼續顯示傳送反饋。這些宿主檢視變更不修改永久錨點格式、行內 JSON、協作傳輸、schema、epoch、checkpoint 或待確認更新。已有歷史讀取和顯示歸一化程式碼保留原路徑，不引入資料轉換、欄位回填或 DDL。

驗證使用隔離合成文件及資料庫，覆蓋原生表格框選、便籤 @ 再次編輯/使用者卡片/撤銷/雙端同步，以及五格式編譯 Web 評論檢查，具體收據與限制見[驗證記錄](verification/editor-comments-2026-10-23.md)。回退保留上一正式包、依賴及鎖檔案，並保留後續內容寫入。未部署生產環境。

<a id="正式筛选范围修复--2026-10-23"></a>

## 正式篩選範圍修復 — 2026-10-23

Doca 0.2.11 鎖定正式 Sheet 0.2.12，實現協同契約中使用者明確批准的篩選範圍規則。公開 exports、依賴和宣告與 0.2.11 相同；改變的 Yjs 執行時透過現有 schema 6 一起提交正文和範圍。原 baseline、epoch、checkpoint 與待確認更新保留。開啟不修復舊短範圍，顯式確認有效條件才擴充套件。既有歷史讀取和預設值保持原狀，無新增相容適配或資料轉換。回退保留前一 Sheet 0.2.11、宿主依賴/鎖檔案和後續內容及原生範圍；詳見[篩選驗證](verification/sheet-filter-range-2026-10-23.md)。

Slate 0.4.26 修復 Markdown 標點轉義、參考文獻方括號標籤，以及價格和網址的公式誤報。宿主使用正式 npm 包，175 個已安裝分發檔案與公開發布的原始碼構建一致。執行時改動限定在轉換入口，codec、headless、Yjs 入口保留 0.4.25 位元組，文件和協作結構均不變。瀏覽器收錄接受可讀降級，僅展示本次處理失敗資訊，不增加持久化報告。見 [Annual Reviews 驗收](verification/annualreviews-capture-2026-10-26.md)。

<a id="npm-评论背景与表格连接点--2026-10-28"></a>

## npm 評論背景與表格連線點 — 2026-10-28

Doca 0.2.23 使用正式 npm 精確版本：Sheet 0.2.14、Canvas 0.5.16、Slides 0.3.0-alpha.5；Slate 0.4.26 與 Markdown 0.4.4 保持不變。釋出構建不使用本地壓縮包、file: 依賴或編輯器補丁。

Sheet 新增 `commentHighlightAnchor`，宿主從當前可見、授權、未解決的評論標記中選擇明確點選的評論錨點；Slides 新增 `activeCommentId`，宿主傳入當前標記的 ID。五種格式開啟側欄、連結定位或點選正文原生標記時均不新增背景；點選評論卡片或評論導航後，只高亮該評論對應內容。切換評論時替換，點選其他位置（包括編輯器和側欄空白）、評論解決或側欄關閉時清除，重新開啟不恢復；定位仍顯式使用既有 reveal 介面。只讀模式也可高亮，進入放映時隱藏。重疊候選繼續由宿主選擇。表格支援當前穩定錨點解析出的多段區域；幻燈片遵循現有整元素/整表錨點範圍，不新增永久單元格或字形錨點。

Canvas 在非編輯懸停和小手選中整表時顯示連線點，編輯單元格時隱藏。宿主僅為明確點選的畫布評論對應內容增加半透明背景。所有變化僅為互動檢視，不改文件樣式、永久錨點、Yjs 事務、schema/codec、epoch、檢查點、ACK 或 outbox，也不新增歷史讀取、轉換或適配。回退保留正式舊包版本、鎖檔案及後續業務資料。

<a id="表格当前用户提及样式--2026-11-03"></a>

## 表格當前使用者提及樣式 — 2026-11-03

Sheet 0.2.17 提供 `SpreadsheetEditor.currentUserId?: string | null`。Doca 傳入當前登入使用者 UUID，原生 `type: 'user'` 原子節點按 `refId` 精確匹配：@ 自己使用膠囊圓角的藍底白字，其他使用者藍字，所有使用者提及去掉下劃線。網格、公式欄及單元格草稿採用同一 Canvas 繪製規則，只讀也支援；普通連結保留原生樣式。整格使用者物件繼續使用共享的 `UserMention` 渲染器。

切換或清空身份僅重繪現有執行時，身份和展示顏色不寫入單元格、撤銷、剪貼簿、XLSX、協同和歷史。自定義執行時可讀取可選 `RuntimeFactoryContext.userMentions.currentUserId()` 並實現 `SpreadsheetRuntime.refreshUserMentions()`；這是檢視能力，沒有新增儲存格式或舊 API 適配。使用者節點資料、schema 6 和歷史讀取及既有預設規則不變。model/Yjs/XLSX/preferences 八個 JS 入口與 0.2.15 位元組一致。本地驗證和釋出範圍見[變更驗證](../specs/004-sheet-self-mentions/validation.md)。

<a id="表格单元格草稿撤销与重做--2026-11-20"></a>

## 表格單元格草稿撤銷與重做 — 2026-11-20

Doca 固定正式 npm `@smartdoca/sheet` 0.2.19。原生單元格編輯器持有焦點時，Cmd/Ctrl+Z 撤銷草稿，Cmd/Ctrl+Y 或 Cmd/Ctrl+Shift+Z 重做草稿；提交後仍透過既有協同歷史撤銷、重做表格操作。宿主其他輸入框不會接管這些編輯器快捷鍵。

與 0.2.18 相比，公開宣告、CSS 及 model/Yjs/XLSX/preferences 的 ESM/CJS 執行檔案逐位元組相同，改動限定於表格 UI 執行時。工作簿持久化格式、schema 6、baseline、epoch、checkpoint、宿主儲存路徑與相容規則均不變。原始碼及打包入口 Chrome 迴歸使用隔離工作簿；回退恢復舊正式包版本和鎖檔案，並保留後續內容寫入。

<a id="表格自动行高测量防护--2026-11-23"></a>

## 表格自動行高測量防護 — 2026-11-23

Doca 固定正式 npm `@smartdoca/sheet` 0.2.20。單個退化富文字單元格（帶有序列表 bullet、文件骨架產出空 pages）會讓固定引擎的自動行高測量拋錯；列寬命令在寫入寬度之前先測量錨點列，一個壞單元格即靜默取消使用者的列寬調整（線上工作簿報告在第一列），同源崩潰還破壞首屏渲染和其他列調寬的自動行高記賬。包內現在在唯一測量入口（`SpreadsheetSkeleton.calculateAutoHeightForCell`）加防護：測量失敗回退到呼叫方各自的預設值，列寬照常生效、渲染繼續；與本地命令關聯的未處理拒絕按訊息去重上報一次警告 toast，完整堆疊輸出到控制檯。

僅失敗路徑行為變化：公開 API、宣告匯出集合、CSS、schema、baseline、epoch、checkpoint 與宿主儲存通道不變。model/Yjs/XLSX/preferences 執行檔案與 index.css 與 0.2.19 逐位元組一致。回退恢復舊包版本和鎖檔案。
