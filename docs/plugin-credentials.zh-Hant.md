<a id="插件托管凭证"></a>

# 外掛託管憑證

[English](plugin-credentials.md)

發行版本：宿主 0.1.10、SDK 0.1.9（包含此前原始碼 0.1.8 的憑證介面）。SDK 0.1.7 沒有此介面。郵箱外掛應宣告 SDK 範圍 `^0.1.9`，透過服務端公開 token 使用憑證，不匯入宿主原始碼或自行持久化密碼。

```ts
import { pluginCredentialToken } from '@smartdoca/plugin-sdk/storage';

// 插件 injections.required 声明 pluginCredentialToken。
const credentials = ctx.inject(pluginCredentialToken);
const created = await credentials.create({value: JSON.stringify({password: 'example'})});
// 将 created.id 存到插件关系库中，与业务账户及其授权关系关联。
const metadata = await credentials.inspect(created.id); // 无明文
const stored = await credentials.get(created.id); // 服务端明文或 null
if (stored) {
  const refreshed = await credentials.update({
    id: stored.credential.id,
    expectedRevision: stored.credential.revision,
    value: JSON.stringify({accessToken: 'new', refreshToken: 'new-refresh'}),
  });
  await credentials.remove({id: refreshed.id, expectedRevision: refreshed.revision});
}
```

後設資料為 `{id, revision, createdAt, updatedAt}`。ID 由宿主生成，不接受外掛指定 ID、外掛作用域、庫名或後端配置。`get` 为 `{credential: 元数据, value: string} | null`，`inspect` 為後設資料或 null。值必須是有效 Unicode 的非空字串，UTF-8 最大 64 KiB；OAuth 物件由外掛顯式序列化，不進行隱式格式轉換。

更新和刪除必須攜帶正整數 `expectedRevision`。併發更新只有一個成功；過期修訂號返回 `conflict`，外掛重新讀取後按業務規則處理，不能盲目覆蓋新 refresh token。刪除不存在記錄冪等成功。非法輸入返回 `invalid-input`；安裝失效、損壞記錄、服務或資料庫故障返回 `unavailable`。錯誤不含輸入、SQL、連線配置或底層加密異常。更新不存在記錄返回 `unavailable`。

宿主按 `plugin:<pluginId>`、安裝代次、UUID 和修訂號繫結 AES-256-GCM 認證加密。資料庫只儲存加密記錄，每次寫入採用新隨機 nonce。其他外掛無法讀取、更新或刪除此外掛記錄。停用和關閉保留資料；顯式解除安裝在清單事務中清理對應代次的憑證，舊控制代碼失效；重灌使用新代次。外掛應先執行需要明文的外部撤銷，再完成 uninstall。SDK 不提供業務賬戶許可權判斷；外掛必須在讀取前驗證使用者與賬戶的許可權，不能把明文返回瀏覽器、AI 上下文、日誌或普通配置介面。

憑證操作與外掛業務庫事務分別提交。建立憑證後寫業務引用失敗，需要補償刪除；外部 OAuth 重新整理、資料庫提交或響應丟失由外掛按業務規則恢復。沒有跨服務事務、憑證建立冪等鍵、通用任務協調或自動金鑰輪換承諾。示例在 [plugin-storage](../examples/plugin-storage/README.md)。外掛仍在受信任 Node.js 程序中執行，作用域 API 不構成作業系統沙箱。

<a id="部署环境"></a>

## 部署環境

`DOCA_CREDENTIAL_MASTER_KEY` 必須為隨機 32 位元組編碼成 64 個十六進位制字元，可用 `openssl rand -hex 32` 生成。首次部署設定一次，重啟保留，並單獨備份。該配置對每次宿主啟動必填，即使沒有安裝外掛；缺失、空值或格式錯誤均拒絕啟動。example 中的公開示例值僅供演示，首次部署必須替換，已有部署繼續使用原金鑰。資料庫持久記錄金鑰指紋，不匹配的金鑰拒絕啟動且不重新加密資料。刪除最後一個外掛也不刪除金鑰身份記錄。所有使用同一資料庫的部署程序應使用相同金鑰。

資料庫、檔案儲存的選擇由部署方負責：本地檔案與 SQLite 用於單例項；需要共享部署時設定資料庫及雲端儲存。外掛 API 不判斷部署方式。Compose 轉發 `DOCA_DATABASE`、`DOCA_DATABASE_URL`、連線池、Webhook 資料庫、Redis 與例項配置；詳見 [docker.env.example](../docker.env.example)。

檔案儲存只透過 `DOCA_FILE_STORE_ID` 和嚴格 version 1 的 `DOCA_FILE_STORES_JSON` 配置，包括 S3/CDN 金鑰。管理員頁面只讀展示儲存狀態，不能建立或修改後端/憑據；舊 storage 配置提交拒絕。S3/CDN 配置示例見 [統一儲存實現](unified-storage-implementation.md)。宿主外掛憑證主金鑰與雲端儲存連線憑據相互獨立；本次不轉換或重新加密身份/訊息/搜尋等既有平臺配置。

本次使用資料庫基線 `doca-2026-10-03-credentials-v2`。按已確認的不相容規則，0.1.9 和更早的宿主庫拒絕啟動；原庫、物件和部署保留，不自動補表、遷移、匯入或清空。新版本使用新空資料庫。回退使用原部署和原資料，新部署資料單獨保留。SDK 0.1.7 的憑證缺口不能用自管本地檔案繞過。
