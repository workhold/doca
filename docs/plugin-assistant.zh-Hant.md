<a id="插件启动-ai-助手"></a>

# 外掛啟動 AI 助手

[English](plugin-assistant.md)

當前 SDK 0.1.7 原始碼提供 `PluginWebHost.ai.open(input)`，Web 開啟完整個人助手，App 外掛 WebView 開啟原生會話頁。原始碼驗證不代表 npm 已釋出或 App 已更新。該介面不是服務端後臺執行 API。

```ts
import type { PluginAssistantOpenInput } from "@smartdoca/plugin-sdk/web";

const input: PluginAssistantOpenInput = {
  prompt: "总结这封邮件并列出待办事项",
  context: mail.plainText,
  documentIds: [document.id],
  attachmentFileIds: [attachment.fileId],
};
const { sessionId } = await host.ai.open(input);
```

| 引數 | 行為與限制 |
| --- | --- |
| `prompt` | 輸入框初始文字，可編輯 |
| `context` | 普通文字，追加到 `prompt` 後；兩者合計最多 20,000 字元，作為使用者訊息而非系統指令 |
| `documentIds` | 最多 20 個不同的宿主文件 UUID；宿主讀取當前可訪問的標題、格式並顯示引用標籤 |
| `attachmentFileIds` | 最多 8 個不同的宿主檔案 UUID；每個最多 20 MiB，總計最多 25 MiB，透過授權介面複製為 AI 附件 |
| `sessionId` | 指定當前使用者的已有會話 UUID；省略時建立新會話，歸檔會話須先恢復 |
| `modelId` | 指定可用模型；省略時依次使用會話模型、使用者預設模型、站點預設模型 |
| `autoSend` | 預設為預填。顯式 `true` 才提交訊息，且必須有非空 `prompt` 或 `context` |

`host.ai.open()` 可開啟一個新的空會話。返回 `Promise<{sessionId: string; jobId?: string}>`；只有立即傳送成功提交任務時才有 `jobId`，它不代表模型任務已完成。同一客戶端啟動期間的重複呼叫會拒絕；每次成功的新呼叫都是一次獨立啟動，不自動重試訊息。

```ts
const { sessionId, jobId } = await host.ai.open({
  prompt: "生成回复草稿",
  context: mail.plainText,
  autoSend: true,
});
```

引用、檔案、會話、模型和傳送都經過當前宿主授權。身份來自登入會話，不能傳入 `userId`、令牌或系統提示詞；未知欄位、重複 ID、無效 UUID、超限引數均拒絕。外掛負責確認其業務內容允許提供給該使用者和 AI。啟動不會擴大資源許可權，也不會跳過模型執行策略、工具審批或使用量記錄。

許可權拒絕、不可用模型、歸檔/他人會話、附件超限、網路錯誤和賬號切換會使 Promise 拒絕。尚在解析的附件可以預填；立即傳送會明確報錯，外掛可稍後重試或開啟預填會話。失敗不刪除使用者資料，已建立的普通附件或空會話按宿主現有規則保留。

預填內容僅儲存在當前介面程序記憶體中，重新整理或程序退出不保留；位址列只包含會話 ID，以及 App 內部一次性啟動標識，不包含正文或附件引數。App 原生 `assistant.open` 請求使用當前外掛名稱空間和固定賬號憑據，離開外掛頁或切換賬號會取消未完成請求；憑據不進入 WebView。Web 和 App 的引用/附件均可在傳送前移除。

沒有新增資料庫結構、舊格式讀取、資料遷移或舊宿主適配。已有會話仍使用宿主現有會話和訊息格式；回滾原始碼不需要轉換或刪除它們。缺少該方法的宿主或缺少 `assistant.open` 的原生容器不能提供該能力，必須部署相應的新產物；獨立 npm 釋出和真機驗收仍需另外完成。
