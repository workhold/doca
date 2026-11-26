<a id="配置说明"></a>

# 配置說明

[English](configuration.md)

Compose 使用 `docker.env.example`，原始碼開發使用 `.env.example`，複製到倉庫根目錄 `.env`。兩份示例的來源地址和資料庫路徑不同；檔案儲存均示例為容器持久資料卷中的 `/data/storage`。原始碼開發時把儲存 root 改為本機可寫的絕對路徑，不要混用來源地址，也不要提交金鑰。

<a id="compose-必填配置"></a>

## Compose 必填配置

| 變數 | 要求 | 單機示例 |
| --- | --- | --- |
| `DOCA_ORIGIN` | 必須顯式填寫 HTTP(S) 來源 | `https://doca.example.com` |
| `DOCA_FILE_STORE_ID` | 非空，且必須對應 JSON 中的儲存項 | `local` |
| `DOCA_FILE_STORES_JSON` | 非空，合法的 version 1 物理儲存配置 | 見下方 |
| `DOCA_CREDENTIAL_MASTER_KEY` | 每次啟動必填；嚴格 64 個十六進位制字元（32 位元組） | 用 `openssl rand -hex 32` 生成 |

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

首次單機安裝時，**修改公網來源地址，並用 `openssl rand -hex 32` 的輸出替換公開的示例憑證金鑰**；必填儲存值已經提供。PostgreSQL、Redis、模型金鑰和 SSO 憑據按需配置。已有部署必須保留原憑證主金鑰。

來源必須為 HTTP(S) origin，不能帶賬號密碼、子路徑、查詢引數或片段；根路徑末尾斜槓會被規範化。生產環境同時支援 HTTP 和 HTTPS。代理須保留配置的 `Host`，只按 `127.0.0.1` 地址訪問會被 Host 校驗拒絕，見[健康檢查](deployment.zh-Hant.md#启动)。

<a id="不同启动方式的默认值"></a>

## 不同啟動方式的預設值

| 啟動方式 | 來源地址 | 資料庫與檔案 | 憑證主金鑰 |
| --- | --- | --- | --- |
| 倉庫 Compose | `.env` 必填 | SQLite `/data/doca.db`；檔案 ID/JSON 在 `.env` 必填；`doca_data` 掛載到 `/data` | 必填，使用持久部署金鑰 |
| 單獨執行釋出映象 | 須提供 HTTP(S) 來源 | 映象顯式提供 `/data` 下的 SQLite 與本地儲存預設值；自行掛載持久 `/data` | 必填，使用持久部署金鑰 |
| 原始碼開發 | `http://127.0.0.1:39130` | SQLite `./data/v1/doca.db`；檔案 ID/JSON 必填，`.env.example` 已提供 | 必填，替換公開示例值 |

原始碼儲存解析器沒有隱式預設值，映象的預設值來自 Dockerfile 的顯式環境配置。本地儲存根目錄必須可寫且持久化。S3 必填 `bucket`、`region`、布林值 `forcePathStyle` 和顯式 `credentials:{accessKeyId,secretAccessKey,sessionToken?}`；可選 endpoint 必須為 HTTP(S) 根來源，不帶賬號密碼、子路徑、查詢引數或片段。顯式 HTTP 端點支援 RustFS 等可信內網物件儲存，網路訪問由部署者控制，站點、靜態資源和 CDN 地址也支援 HTTP(S)。AWS shell 環境憑據不能代替這些 JSON 欄位，RustFS 配置示例見[檔案儲存](storage.zh-Hant.md)。

寫入物件後，儲存 ID 和物理位置必須持續可用。當前儲存 ID 必須與已記錄的啟用 ID 一致；修改 ID、路徑或桶不會搬運資料，不能用這些配置變更繞過遷移。

<a id="条件必填与可选后端"></a>

## 條件必填與可選後端

| 變數 | 使用條件與預設值 |
| --- | --- |
| `DOCA_DATABASE=postgres`、`DOCA_DATABASE_URL` | 選擇 PostgreSQL 時連線 URL 必填；預設 SQLite |
| `DOCA_DATABASE_POOL_MAX` | 每程序主資料庫連線數，預設 10 |
| `DOCA_WEBHOOK_DATABASE_URL` | 可選的獨立 PostgreSQL 投遞庫；未填寫時按下方規則生成 |
| `DOCA_REDIS_URL` | 跨例項事件、線上狀態、限流需要；空值使用程序內實現 |
| `DOCA_REDIS_PREFIX`、`DOCA_INSTANCE_ID` | 字首預設 `doca`；例項 ID 預設每程序隨機生成 |
| `DOCA_TRUST_PROXY` | 逗號分隔的可信代理 IP/CIDR；**預設不信任任何代理，迴環地址也不例外** |
| `DOCA_PLUGINS_DIR` | 可寫的安裝與快取目錄；Compose 預設 `/data/plugins` |
| `DOCA_PDF_PYTHON` | 安裝了固定 WeasyPrint 依賴的 Python 路徑；預設 `python3`，Docker 內為 `/opt/doca-pdf/bin/python`；舊 `DOCA_PDF_CHROMIUM` 會被拒絕 |
| `DOCA_PLUGIN_STORE_URL` | HTTP(S) 來源，預設 `https://store.smartdoca.cc` |
| `DOCA_PLUGIN_NPM_REGISTRY` | 預構建包的登錄檔，預設 `https://registry.npmjs.org` |
| `DOCA_ASSET_BASE` | 可選的構建資源字首；空值由 Doca 提供 `/assets` |
| `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE` | 每來源頁已提交的付費圖片請求上限；未設定時預設 5。只接受十進位制正安全整數，0、空字串或非法值會導致啟動失敗 |
| `DOCA_AI_IMAGE_SEGMENT_PROFILE` | 可選的可信本地 SAM2 嚴格 version 1 profile 絕對路徑；未設定時關閉分割。顯式配置無效會拒絕啟動，已校驗執行環境不可用時不開放工具；見[本地分割](ai-image-segmentation.md) |

圖片請求上限在服務啟動時固定。例如在原始碼或 Compose 的 `.env` 設定 `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE=10`，重啟服務或重建容器後生效；所有副本須使用相同上限。重試、續跑、修改提示詞或重新登記批次都不會清零累計次數，已提交但結果或費用待核對的請求也計數，原樣匯出和本地重合成不計數。原圖片、請求記錄與費用事實保持不變。降低上限後，後續付費請求以及序號超過新上限的付費回執複用會明確拒絕，不跳過、轉換或刪除原記錄。批次 version 3 和 paid-attempt version 1 保持不變；舊批次格式仍拒絕，不遷移。

缺失、空值或格式錯誤的主金鑰均拒絕啟動，即使沒有安裝外掛也一樣。執行時沒有預設金鑰；首次安裝必須替換 example 中公開的示例值。用 `openssl rand -hex 32` 生成一次並獨立備份，各例項和重啟必須使用同一金鑰，見[託管憑證](plugin-credentials.zh-Hant.md)。

Webhook 投遞始終使用獨立資料庫。SQLite 在主庫旁建立 `webhooks.db`。PostgreSQL 預設使用 `<主库名>_webhooks`，缺少該庫時嘗試建立；賬號沒有建庫許可權時，須預建獨立庫並授權，或設定 `DOCA_WEBHOOK_DATABASE_URL` 指向有許可權的獨立庫。AI 儲存在 Compose 中使用 `ai.db`，PostgreSQL 使用主庫的 `doca_ai` schema，賬號須有初始化許可權。即使未配置外部模型，這些儲存也需備份。

多副本需要共享 PostgreSQL、Redis 和檔案儲存；修改變數不搬運已有資料，見[水平擴充套件](horizontal-scaling.zh-Hant.md)与[發行要求](releases/0.2.24.zh-CN.md)。

<a id="compose-环境变量传递"></a>

## Compose 環境變數傳遞

`.env` 用於 Compose 插值，不會自動把每個變數傳入容器。只有 `compose.yaml` 中宣告的項生效；容器監聽地址、埠和 SQLite/AI/資料目錄在當前檔案中固定。需要改這些項時同時調整 Compose 的 environment、埠對映與持久掛載。

擴充套件環境變數需在 Compose 服務的 environment 中顯式傳遞，並在部署目錄的 `.env` 設定。

<a id="管理配置与生效"></a>

## 管理配置與生效

系統 Logo 位於 **站點與服務 → 站點資訊 → 系統 Logo**。管理員可預覽並儲存最大 5 MB 的 PNG/JPEG/WebP 圖片，或恢復預設圖示。它用於導航、登入頁與非文件頁面的瀏覽器圖示，文件標籤頁保留自己的圖示。規範化 PNG 儲存在 `settings.site_logo`，與其他站點設定共用版本號；歷史 NULL 沿用預設圖示。更新已有部署前請閱讀 [0.2.24 升級要求](releases/0.2.24.zh-CN.md)。

註冊、身份源、驗證閘道器、搜尋、AI 模型和 Webhook 訂閱透過對應管理頁配置。檔案後端憑據位於環境，儲存管理頁只讀；平臺服務憑據與外掛加密憑證是不同服務，見[服務憑據](service-credentials.zh-Hant.md)。

`docker compose config --quiet` 檢查變數插值且不列印已解析金鑰；不會校驗應用 JSON、連線資料庫或確認雲憑據有效。透過 `docker compose up -d` 應用後，檢查日誌和健康狀態，再實際驗證已配置服務，見[部署](deployment.zh-Hant.md)和[開發](development.zh-Hant.md)。

<a id="登录有效期"></a>

## 登入有效期

`DOCA_SESSION_TTL_SECONDS` 配置瀏覽器、掃碼登入和 WebView 會話，同時控制資料庫到期時間和登入 Cookie 的 `Max-Age`，預設 `86400` 秒（24 小時）。`DOCA_MOBILE_SESSION_TTL_SECONDS` 配置手機 Bearer 會話及既有續期流程，預設 `15552000` 秒（180 天）。兩項均接受 1 到 2147483647 的十進位制整數；空值、0、負數或非法值拒絕啟動。Compose 顯式傳入這兩個變數。

```dotenv
DOCA_SESSION_TTL_SECONDS=86400
DOCA_MOBILE_SESSION_TTL_SECONDS=15552000
```

修改後重啟服務。已簽發的瀏覽器會話保留資料庫中原有到期時間，新登入使用新期限，手機續期使用配置的手機期限；不轉換會話記錄或持久格式。登入和認證流程 Cookie 在 HTTPS 下加 `Secure`，HTTP 下保留 `HttpOnly` 和原有 SameSite 規則。HTTP 站點實時連線使用 `ws`。

經明確同意的 HTTP 瀏覽器適配在 `crypto.randomUUID` 缺失時透過 `crypto.getRandomValues` 提供 UUID v4；在 `crypto.subtle` 缺失時透過固定版本的 `@noble/hashes` 僅提供 SHA-256 `digest`。存在原生實現時繼續使用原生介面；摘要與原生位元組一致，不轉換已有 ID、表格校驗值或文件格式，也不提供其他 WebCrypto 加密操作。

文字複製按鈕使用同一個共享入口。原生 Clipboard 可用時直接呼叫；缺失時經已同意的 HTTP 適配，透過臨時文字框和 `document.execCommand("copy")` 複製，恢復焦點和選區，並明確報告失敗；不讀取系統剪貼簿，也不將失敗當作成功。
