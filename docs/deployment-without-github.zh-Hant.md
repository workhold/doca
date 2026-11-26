<a id="无需访问-github-的部署"></a>

# 無需訪問 GitHub 的部署

[English](deployment-without-github.md)

業務伺服器無需拉取原始碼，也無需安裝 Git、Node.js 或 pnpm。準備好 Docker Engine、Docker Compose 外掛、Bash 和 OpenSSL 後，複製部署檔案、準備映象、啟動並初始化管理員即可。本指南用於全新單機安裝 Doca 0.3.0，採用 SQLite 和本地檔案儲存；已有部署先閱讀[發行要求](releases/0.3.0.zh-Hant.md)，保留原資料庫、檔案、配置和憑證主金鑰。

<a id="单-yaml-全新安装"></a>

## 單 YAML 全新安裝

`node scripts/pack-deployment.mjs` 另輸出 `doca-compose-v版本.yaml` 和校驗檔案。交付此 YAML，儲存為固定部署目錄下的 `compose.yaml`，在檔案中填寫 `DOCA_ORIGIN` 與自行生成的 `DOCA_CREDENTIAL_MASTER_KEY`，執行 `chmod 600 compose.yaml` 後執行 `docker compose up -d`。無需 `.env`、seccomp JSON 或外部初始化指令碼。使用匹配的 0.3.0 映象；GitHub Release 也提供該獨立 YAML 與校驗檔案。

服務健康後執行 `docker compose exec doca bash docker/admin.sh bootstrap`；重置密碼用 `docker compose exec doca bash docker/admin.sh reset-password`。密碼在終端隱藏輸入，不寫進 YAML。該示例僅用於全新 SQLite/本地儲存安裝，已有站點繼續使用原專案名、持久卷和金鑰；備份須包含受保護的 YAML。反向代理要求與下文一致。

<a id="_1-转交部署文件"></a>
<a id="1-转交部署文件"></a>

## 1. 轉交部署檔案

由能訪問倉庫的一方拉取 main 分支，再生成部署包：

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
node scripts/pack-deployment.mjs
```

下文用 0.3.0 的檔名和映象標籤舉例。實際以打包命令輸出的檔名和生成的 Compose 映象為準。

把生成的 `doca-deploy-v0.3.0.tar.gz` 和同名 `.sha256` 校驗檔案，透過企業檔案服務、內網下載地址或移動儲存轉交給業務方。打包只讀取公開部署檔案。對應標籤的 GitHub Release 附帶部署包和校驗檔案。

在業務伺服器上將兩個檔案放到同一目錄，校驗並解壓：

```sh
sha256sum -c doca-deploy-v0.3.0.tar.gz.sha256
tar -xzf doca-deploy-v0.3.0.tar.gz
cd doca-deploy-v0.3.0
```

macOS 校驗可用 `shasum -a 256 -c doca-deploy-v0.3.0.tar.gz.sha256`。部署目錄如下，後續命令均在此目錄執行：

```text
doca-deploy-v0.3.0/
  compose.yaml
  docker.env.example
  README.zh-CN.md
  README.md
  LICENSE
  scripts/
    bootstrap-admin.sh
    reset-admin-password.sh
```

部署包中的 Compose 保留環境變數和持久卷，去除原始碼構建項，並使用 `pull_policy: missing`。新映象內建 PDF/畫板渲染依賴，不再交付 seccomp JSON。已有部署保留原 Compose 專案、卷、配置和主金鑰；不要用全新安裝配置覆蓋它們。此改造需要重新構建的新映象，已釋出舊映象仍按原發行要求部署。

<a id="手动复制-compose-和-env"></a>

### 手動複製 Compose 和 .env

如果透過文字交付，可將以下單機配置儲存為 `compose.yaml`，需要宿主初始化指令碼時另提供同版本 `scripts/`，也可使用映象內建命令。部署包提供更完整的可選配置；下面的配置只使用 SQLite 和本地儲存。

```yaml
services:
  doca:
    image: docker.io/smartdoca/doca:0.3.0
    pull_policy: missing
    restart: unless-stopped
    init: true
    stop_grace_period: 30s
    environment:
      NODE_ENV: production
      DOCA_ORIGIN: "${DOCA_ORIGIN:?Set DOCA_ORIGIN in .env}"
      DOCA_HOST: 0.0.0.0
      DOCA_PORT: "39120"
      DOCA_DATABASE: sqlite
      DOCA_SQLITE_PATH: /data/doca.db
      DOCA_BOOK_BATCH_CHECKPOINTS: "${DOCA_BOOK_BATCH_CHECKPOINTS-on}"
      DOCA_AI_SQLITE_PATH: /data/ai.db
      DOCA_DATA_DIR: /data
      DOCA_FILE_STORE_ID: "${DOCA_FILE_STORE_ID:?Set DOCA_FILE_STORE_ID in .env}"
      DOCA_FILE_STORES_JSON: "${DOCA_FILE_STORES_JSON:?Set DOCA_FILE_STORES_JSON in .env}"
      DOCA_CREDENTIAL_MASTER_KEY: "${DOCA_CREDENTIAL_MASTER_KEY:?Generate and set the key in .env}"
    ports:
      - "127.0.0.1:39120:39120"
    volumes:
      - doca_data:/data

volumes:
  doca_data:
```

儲存以下內容為 `.env`，將來源改成實際瀏覽器地址，並填入下一步生成的主金鑰：

```dotenv
DOCA_ORIGIN=https://docs.example.com
DOCA_CREDENTIAL_MASTER_KEY=
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

<a id="_2-配置与代理"></a>
<a id="2-配置与代理"></a>

## 2. 配置與代理

使用部署包時先執行；已經手動建立 `.env` 的跳過複製：

```sh
cp docker.env.example .env
openssl rand -hex 32
chmod 600 .env
```

把生成的 64 位十六進位制值寫入 `.env` 的 `DOCA_CREDENTIAL_MASTER_KEY`，替換公開示例值；把 `DOCA_ORIGIN` 改成業務方實際訪問的 HTTP(S) 來源。主金鑰生成一次並單獨安全備份，重啟時保留同一個值。保留本地儲存根目錄 `/data/storage`。不要把管理員賬號或密碼寫進 `.env`。

Compose 預設僅繫結 `127.0.0.1:39120`，需要同機反向代理。公網 HTTPS 可配置 Caddy：

```caddyfile
docs.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

域名解析指向伺服器，代理需能獲取證書，也可使用業務方已有證書。無外網的可信內網可設 `DOCA_ORIGIN=http://doca.internal`，配置內網 DNS 或客戶端 hosts，並使用以下 HTTP 代理，不需要申請公網證書：

```caddyfile
http://doca.internal {
    reverse_proxy 127.0.0.1:39120
}
```

使用其他代理時保留 `Host`，轉發 HTTP 和 `/api/v1/ws` 的 WebSocket 升級請求。Docker、反向代理及其安裝包由業務環境提前提供，部署包不包含它們。

<a id="_3-准备镜像"></a>
<a id="3-准备镜像"></a>

## 3. 準備映象

<a id="能访问-docker-hub"></a>

### 能訪問 Docker Hub

伺服器不能訪問 GitHub，但能訪問 Docker Hub 時直接拉取已構建映象：

```sh
docker compose pull doca
```

<a id="镜像仓库也无法访问"></a>

### 映象倉庫也無法訪問

由交付方在可拉取映象的機器上準備映象檔案。先確認業務伺服器的 CPU 架構；以下以 Linux x86-64（`linux/amd64`）為例，ARM64 伺服器把平臺改為 `linux/arm64`，並在交付檔名中相應標明：

```sh
docker pull --platform linux/amd64 docker.io/smartdoca/doca:0.3.0
docker image inspect docker.io/smartdoca/doca:0.3.0 --format '{{.Os}}/{{.Architecture}}'
docker save -o doca-image-v0.3.0-linux-amd64.tar docker.io/smartdoca/doca:0.3.0
sha256sum doca-image-v0.3.0-linux-amd64.tar > doca-image-v0.3.0-linux-amd64.tar.sha256
```

把映象 `.tar` 和校驗檔案一起轉交。業務方在這兩個檔案所在目錄執行：

```sh
sha256sum -c doca-image-v0.3.0-linux-amd64.tar.sha256
docker load -i doca-image-v0.3.0-linux-amd64.tar
docker image inspect docker.io/smartdoca/doca:0.3.0 --format '{{.Os}}/{{.Architecture}}'
```

確認匯入的標籤是 `smartdoca/doca:0.3.0`，架構與目標伺服器一致，再回到部署目錄。內網映象倉庫也是可選交付方式：交付方推送同版本映象，業務方將 Compose 的 `image` 改為內網映象完整地址並拉取；部署包、映象和初始化指令碼保持同一版本。

<a id="_4-启动与数据库初始化"></a>
<a id="4-启动与数据库初始化"></a>

## 4. 啟動與資料庫初始化

映象已拉取或載入後，在部署目錄執行：

```sh
docker compose config --quiet
docker compose up -d --pull never --no-build
docker compose ps
```

`--pull never --no-build` 明確使用本機映象；若映象缺失則報錯，不嘗試線上下載或原始碼構建。首次啟動會在空的 `doca_data` 持久卷內建立當前版本的資料庫表，以及檔案和 AI 資料目錄，無需手動執行 SQL 或安裝資料庫。非空舊資料庫不會自動升級。

等待 `docker compose ps` 顯示 `healthy`。手動健康檢查使用 `.env` 來源的 Host；非標準埠也需包含在 Host 中：

```sh
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

應返回 `{"status":"ok","version":"0.3.0"}`。內網站點改用 `Host: doca.internal`。裸迴環請求會被 Host 校驗拒絕。啟動失敗可執行 `docker compose logs --tail=100 doca` 檢視日誌。

<a id="_5-初始化管理员"></a>
<a id="5-初始化管理员"></a>

## 5. 初始化管理員

健康後在同一部署目錄執行：

```sh
bash scripts/bootstrap-admin.sh
```

依次輸入管理員賬號、至少 12 位的密碼，並確認密碼；密碼輸入隱藏。指令碼使用已準備的映象啟動一次性容器，連線同一持久卷，只在沒有管理員時建立賬號，資料庫只儲存密碼雜湊。沒有預設賬號或密碼。隨後開啟 `DOCA_ORIGIN` 所設地址登入。

以後需要重置已有管理員密碼時執行：

```sh
bash scripts/reset-admin-password.sh
```

這不會建立新賬號。若資料庫被鎖住，先 `docker compose stop`，重置後再 `docker compose up -d --pull never --no-build`。

<a id="数据保留与后续交付"></a>

## 資料保留與後續交付

日常重啟使用 `docker compose restart`，保留部署目錄和 Compose 專案名，以繼續使用同一個 `doca_data` 卷；不要透過改目錄或專案名意外啟動另一個空站點。備份覆蓋持久卷中的全部資料庫、檔案儲存以及受保護的 `.env` 和主金鑰。`docker compose down -v` 會刪除卷，不用於普通重啟或升級。

後續升級先確認[發行要求](releases/0.3.0.zh-Hant.md)，交付匹配版本的部署包和映象；本流程只初始化全新站點，不轉換已有資料。基礎密碼登入和本地文件服務無需 GitHub；AI、外部登入、外掛安裝及雲端儲存等配置的外部服務仍需業務網路可達。文件匯出還需在目標宿主機驗證渲染器，應用健康不等於 PDF、畫板和 Office 渲染效果已驗證，見 [Docker 文件渲染器](docker-rendering.zh-Hant.md)。
