<a id="文档插件元素（sdk-016-源码增量）"></a>
<a id="文档插件元素sdk-016-源码增量"></a>

# 文件外掛元素（SDK 0.1.6 原始碼增量）

[English](plugin-editor-elements.md)

2026-10-02 在宿主原始碼 0.1.8、SDK 0.1.6、契約包 0.1.6 和 Web registry 0.1.3 中實現。本文記錄原始碼匯出與隔離驗收，不代表 npm 釋出、生產安裝或原生裝置驗收。既定儲存策略是精確版本支援：未知型別或版本顯示錯誤佔位，保留原始 JSON。不提供介面卡、自動轉換、遷移或資料重置，現有內部文件引用讀取規則保持原狀。

<a id="公开注册"></a>

## 公開註冊

从 `@smartdoca/plugin-sdk/editor-elements` 匯入 `PluginElementContribution`、`PluginElementPayload`、`createPluginElementPayload`、`pluginElementState`、`isPluginElementPayload`、`validatePluginElementPayload`。普通已安裝 Web 外掛 bundle 返回可選 `elements`。宿主將貢獻註冊到 `WebPluginRegistry.elements` 的所屬外掛名稱空間，並隨 bundle 釋放。重複 ID 或非法宣告導致註冊失敗，回撤該 bundle 的註冊。

```ts
import type { PluginElementContribution } from "@smartdoca/plugin-sdk/editor-elements";

const element: PluginElementContribution = {
  id: "example.elements.countdown", pluginId: "example.elements",
  title: { zh: "倒计时", en: "Countdown" }, dataVersion: 1,
  formats: ["rich_text", "spreadsheet"],
  validate: data => typeof data.targetAt === "string" &&
    Number.isFinite(Date.parse(data.targetAt)),
  text: data => `Countdown: ${data.targetAt}`,
  renderEditor: context => /* 注入的 React 配置表单 */ null,
  render: (payload, context) => /* 注入的 React 行内视图 */ null,
  renderCell: context => { /* 在 context.rect 内通过 context.canvas 绘制 */ },
  refreshIntervalMs: 1000,
};
```

示例展示實際匯出簽名；[獨立示例](../examples/plugin-elements/README.md)包含可工作的表單、渲染器和安裝檔案。外掛使用注入的宿主 React，自行打包依賴，不匯入宿主原始碼路徑或使用全域性編輯器橋接。

貢獻必須提供雙語 `title`、正整數 `dataVersion`、至少一種支援格式，以及 `validate`、`text`、`renderEditor`。`rich_text` 需要 `render`，`spreadsheet` 需要 `renderCell`。可選 `onCellClick` 接收 payload 和公開上下文；可選 `refreshIntervalMs` 為 1000–60000 的整數，只重新整理畫布檢視。

上下文包含 `documentId`、`format`、`locale`（`zh`/`en`）、`readOnly`、`AbortSignal`。表單另有克隆的 `initialData` 或 null、`submit(data)`、`cancel()`；畫布上下文另有克隆的 `payload`、畫布和裁剪後的單元格矩形。配置經宿主提交，外掛沒有可變編輯器控制代碼、私有執行時或獨立持久化通道。渲染異常顯示本地化佔位；外掛自行處理事件和非同步失敗，並響應取消。

<a id="持久内容"></a>

## 持久內容

```json
{
  "version": 1,
  "pluginId": "example.elements",
  "type": "example.elements.countdown",
  "dataVersion": 1,
  "data": { "label": "Launch", "targetAt": "2026-10-04T00:00:00.000Z" },
  "text": "Launch · 2026-10-04T00:00:00.000Z"
}
```

`version` 是 envelope 版本，`dataVersion` 是貢獻的精確資料版本。`data` 是普通 JSON 配置，`text` 是供文字消費者使用的有界靜態投影。不要持久化渲染函式、憑據、臨時 URL、跳動數值或計時器。payload 必須是普通 JSON 物件，UTF-8 最多 32 KiB、深度 20、節點數 4096；持久化前拒絕危險原型鍵、非有限數值和非 JSON 資料。

當前 envelope 只接受六個宣告欄位。結構有效但型別未知、提供者未安裝或停用、格式不支援、版本不匹配時顯示不支援佔位；當前提供者拒絕配置時顯示無效佔位。都不會改寫或丟棄資料。宿主不呼叫版本不匹配的渲染器或配置編輯器。使用者可透過原生編輯顯式刪除不支援元素並撤銷；重新啟用精確匹配提供者可恢復展示。

<a id="原生编辑器集成"></a>

## 原生編輯器整合

- 富文字使用永久宿主原子行內擴充套件 `custom:plugin-element` 和共用 codec。沒有業務外掛時也儲存完整不透明 payload。插入捕獲實時 Slate 範圍，編輯按節點 ID 定位；插入、配置和刪除使用原生操作及撤銷。當前支援行內原子，不匯出任意塊佈局。
- 表格使用公開 `cellRenderers` 畫布擴充套件和原生 `ICellData.custom.docaElement`，`v` 為靜態文字投影。提交保留當前樣式並設定原生 CLIP 換行，避免文字溢到相鄰格。插入會替換所選整單元格的值、公式、富文字和 custom 資料，彈框明確說明；沒有浮動物件或格內文字插入位置。表單開啟時，穩定單格錨點跟隨行列變化；目標被刪除或併發改變時拒絕提交。複製、刪除、撤銷、協同由原生範圍命令完成。
- 關閉彈框、改變編輯上下文或離開編輯狀態會取消會話。提交重新檢查提供者、控制代碼、只讀狀態和目標。渲染及註冊變化不重建文件編輯器，檢視重新整理不提交正文寫入。

富文字 schema 3 與表格 schema 6 繼續使用原生檢查點和可靠協同 outbox，沒有第二條 JSON 自動儲存、傳輸、Yjs 重放或業務外掛資料庫。原生檢查點和同模型剪貼簿保留 payload；文字、Markdown、Office 轉換沿用現有限制。富文字原子匯出按已有轉換警告降為標籤，表格消費者可讀靜態值。純文字匯出不構成外掛元素無損備份。

<a id="生命周期、安装与回退"></a>
<a id="生命周期安装与回退"></a>

## 生命週期、安裝與回退

預設不安裝元素提供者。只透過現有安裝目錄/ZIP 機制發現外掛。當前示例 manifest 要求 SDK `^0.1.7`；獨立生產使用前釋出並安裝包含該增量的 SDK 與宿主。示例服務端工廠沒有業務資料，解除安裝不刪除文件內容。

停用/解除安裝登出渲染器，保留持久元素。重灌精確匹配提供者無需轉換。回退到缺少永久原生 codec 的舊宿主不支援編輯這些文件；保留資料庫/檢查點備份，並使用已實現該能力的宿主訪問。不提供降級改寫或破壞性清理。

<a id="验收"></a>

## 驗收

`tests/plugin-editor-elements.test.ts` 使用隔離資料庫和文件，覆蓋註冊歸屬/釋放/回撤、嚴格版本和 JSON 限制、富文字原子剪貼簿/刪除/撤銷及不透明 CRDT 往返、原生持久化/ACK 重放/雙副本不回聲、表格穩定錨點/行插入/複製/刪除/撤銷/過載/收斂、只讀授權與超限 payload 原子拒絕。SDK 驗證還包括不依賴宿主路徑的獨立 JavaScript 與 NodeNext 宣告消費者。

瀏覽器驗收使用隔離資料庫和臨時安裝的獨立倒計時/新聞示例。原生容器及第三方外掛需單獨驗收。通用塊、跨格式無損匯出和任意公開編輯器修改命令仍是後續能力。

瀏覽器已驗證富文字插入/配置/撤銷/重做/過載/只讀，表格配置/插入/撤銷/重做/過載，以及未知型別佔位和僅允許移除的配置。表格投影裁剪在儲存過載後確認。當時組合檢查：TypeScript 透過，171 個測試檔案透過（1066 項透過、3 項跳過），SDK 構建與獨立消費、Web 構建、空白檢查透過。

<a id="性能验收（2026-10-02）"></a>
<a id="性能验收2026-10-02"></a>

## 效能驗收（2026-10-02）

執行 `node --import tsx scripts/benchmark-plugin-elements.mts`。在該 macOS arm64 / Node 24.15.0 環境中，1000 個普通段落的原生投影中位數從兩個舊行內 codec 的 0.513 ms 變為增加元素 codec 後的 0.515 ms，差異處於測量噪聲。10000 個普通佔用單元格的稀疏元素檢查增加 0.039 ms；含 100 個元素時為 0.111 ms。首次驗證 100 個倒計時 payload 為 0.188 ms，克隆並呼叫 100 個示例畫布回撥為 0.101 ms；回撥基準使用模擬畫布，不測量原生繪製。

普通單元格在 custom 屬性檢查後快速返回。富文字驗證有快取，畫布按 payload/提供者快取並在註冊變更時失效。合併後的單一檢視計時器只有繪製可見計時單元格後才重新安排，最短一秒；隱藏頁面取消，沒有可見計時單元格時不執行週期重新整理。排程測試覆蓋零空閒計時器、100 元素合併、離開視口、隱藏和釋放。瀏覽器觀察計時文件空閒超過 60 秒，沒有新增正文 seq/歷史；計時器不進入持久化 outbox。

這些結果只說明已測場景的宿主額外 CPU 開銷很小，不保證任意第三方渲染、外部讀取、大量可見元素或每種裝置都零開銷。生產提供者需驗證自身渲染和非同步工作。
