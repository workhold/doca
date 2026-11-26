<a id="快速开始"></a>

# 快速開始

[English](quickstart.md)

本指南使用 main 分支 compose.yaml 指定的 Docker 映象，在一臺伺服器上安裝 Doca，資料庫採用 SQLite，檔案儲存採用本地目錄。需要 Git、Docker Engine、Docker Compose 外掛，以及指向伺服器的域名。同機反向代理可以提供 HTTPS，可信內網也支援 HTTP。執行映象不需要安裝 Node.js 或 pnpm。

這是全新安裝流程。已有部署請先閱讀[發行要求](releases/0.2.38.zh-CN.md)：支援的相容代際內會自動補齊已審定的增量結構，不相容基線與語義變化仍需單獨處理。保留已有資料庫、檔案和配置。

伺服器無法訪問 GitHub 時，可直接轉交 Compose、環境變數示例、安全策略和管理員指令碼，無需拉取原始碼。見[無需訪問 GitHub 的部署](deployment-without-github.zh-Hant.md)，其中提供可複製的 Compose 和 `.env`，以及離線映象交付與初始化步驟。

<a id="_1-拉取代码"></a>
<a id="1-拉取代码"></a>

## 1. 拉取程式碼

拉取 main 分支，一起獲取當前 Compose 和管理員指令碼：

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
```

<a id="_2-配置-env"></a>
<a id="2-配置-env"></a>

## 2. 配置 .env

```sh
cp docker.env.example .env
```

首次安裝時，先生成憑證主金鑰：

```sh
openssl rand -hex 32
```

輸出是隨機 32 位元組編碼成的 64 個十六進位制字元。編輯 `.env`，把示例域名改成自己的 HTTP(S) 站點地址，並把 `DOCA_CREDENTIAL_MASTER_KEY` 替換為剛生成的值：

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_CREDENTIAL_MASTER_KEY=7a52d29ab6db9a08292b9585d0dc5551f4156c2d02953b4262611bc1ad82f9ab
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

`DOCA_CREDENTIAL_MASTER_KEY` 是啟動必填配置，即使沒有安裝外掛也必須填寫；缺失、空值或格式錯誤會拒絕啟動。example 中提供了符合格式的公開示例值，首次部署必須換成自己的金鑰。設定後單獨安全備份，所有副本和重啟使用同一個值。已有部署保留原金鑰；不要為了升級重新生成，替換金鑰會被資料庫指紋校驗拒絕，原有密文不會自動轉換。見[託管憑證](plugin-credentials.zh-Hant.md)。

站點地址不要帶子路徑、查詢引數或片段；根路徑末尾斜槓會被規範化。保留容器持久卷中的 `/data/storage` 路徑。`docker.env.example` 用於 Docker 部署；`.env.example` 用於[原始碼開發](development.zh-Hant.md)。

在同一臺伺服器配置反向代理。以 Caddy 為例：

```caddyfile
doca.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

Caddy 終止 TLS，並轉發 HTTP 和 WebSocket。域名解析需指向這臺伺服器，代理需能夠獲取證書。使用其他代理時，保留 `Host` 頭，並轉發 `/api/v1/ws` 的 WebSocket 升級請求。詳見[部署說明](deployment.zh-Hant.md)。

<a id="_3-拉取镜像"></a>
<a id="3-拉取镜像"></a>

## 3. 拉取映象

```sh
docker compose pull
```

Compose 使用 main 分支 `compose.yaml` 指定的映象。這一步下載已構建映象，不構建檢出的原始碼。

<a id="_4-启动"></a>
<a id="4-启动"></a>

## 4. 啟動

```sh
docker compose up -d
docker compose ps
```

等待容器健康，健康檢查應返回以下結構，version 為實際映象版本：

```json
{"status":"ok","version":"<image version>"}
```

啟動失敗時，用 `docker compose logs --tail=100 doca` 檢視日誌。Compose 埠繫結在 `127.0.0.1`，瀏覽器透過反向代理訪問配置的 HTTP(S) 地址。

<a id="_5-初始化管理员密码"></a>
<a id="5-初始化管理员密码"></a>

## 5. 初始化管理員密碼

在存放 `compose.yaml` 的同一目錄執行：

```sh
bash scripts/bootstrap-admin.sh
```

依次輸入管理員賬號、至少 12 位的密碼，並再次確認密碼。當前指令碼使用中文提示，密碼輸入不顯示。Doca 沒有預設賬號或密碼。指令碼啟動一次性容器，連線同一個資料庫，資料庫只儲存密碼雜湊。已有管理員時，初始化會停止，不修改該賬號。

開啟 `https://doca.example.com` 並登入。不要把管理員賬號或密碼寫入 `.env`。恢復已有管理員賬號請使用[密碼重置](deployment.zh-Hant.md#修改密码)。

<a id="后续配置"></a>

## 後續配置

- 按[使用指南](user-guide.zh-Hant.md)建立文件和知識庫。
- 開放註冊或接入 SSO 前，閱讀[身份認證](authentication.zh-Hant.md)。
- 修改儲存或準備備份前，閱讀[配置說明](configuration.zh-Hant.md)、[檔案儲存](storage.zh-Hant.md)和[部署運維](deployment.zh-Hant.md)。
- 只有部署多個副本時，才需要[水平擴充套件](horizontal-scaling.zh-Hant.md)。

SQLite、上傳檔案、外掛和 AI 資料庫使用 `doca_data` 卷。重啟時保留它，備份應覆蓋全部資料庫、被引用的檔案儲存和受保護的配置。`docker compose down -v` 會刪除該卷，不用於普通重啟或升級。
