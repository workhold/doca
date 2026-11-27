<a id="部署-doca"></a>

# 部署 Doca

[English](deployment.md)

一臺伺服器可以執行 main 分支 `compose.yaml` 指定的映象。單個容器使用 SQLite，不需要 PostgreSQL 或 Redis。只有執行多個應用副本時才需要它們。見 [單例項與水平擴充套件部署](horizontal-scaling.zh-Hant.md)。

<a id="条件"></a>

## 條件

- Docker Engine 和 Docker Compose 外掛。
- 可訪問的域名或內網地址；可信內網 HTTP 部署不強制 TLS 證書。
- 與容器在同一臺機器上的反向代理。Compose 只把 Doca 釋出在 `127.0.0.1:39120`。

代理需要轉發 HTTP，以及 WebSocket 路徑 `/api/v1/ws`。保留原始 `Host` 頭。

<a id="文件"></a>

## 檔案

可以拉取 main 分支的部署檔案，也可以轉交[無需訪問 GitHub 的部署包](deployment-without-github.zh-Hant.md)。業務伺服器無需拉取原始碼。新映象內建 `docker/admin.sh`，可在啟動後執行 `docker compose exec doca bash docker/admin.sh bootstrap` 初始化管理員，或傳入 `reset-password` 重置密碼；宿主指令碼方式仍按原路徑工作。新渲染器不需要宿主 seccomp JSON。打包命令另生成一個用於全新安裝的獨立 YAML，可直接在檔案中填寫來源與主金鑰。此改造必須配合重新構建的新映象，不能直接用於未改造的已釋出舊映象。

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
cp docker.env.example .env
```

第一次啟動前先修改 `.env`。

<a id="必填配置"></a>

## 必填配置

檔案儲存還需要 `DOCA_FILE_STORE_ID` 和 `DOCA_FILE_STORES_JSON`，示例見 `docker.env.example`。後端路徑和金鑰透過環境變數提供，管理頁只讀展示。見[檔案儲存](storage.zh-Hant.md)。

當前宿主使用資料庫代際 `doca-2026-10-12-book-payload-storage-v1`。對已釋出 0.1.22 的 `doca-2026-10-09-history-storage-v1`，啟動時以最新 DDL 檢查並對齊結構、記錄新代際；舊 SQL 知識冊成果等全部業務行原樣保留，不增加正文轉換、單獨清理或舊正文適配。殘留舊知識冊記錄可能需人工處理，已有 0.1.23 物件儲存資料保留。見[資料庫結構演進](database-schema-evolution.zh-Hant.md)及[當前發行要求](releases/0.3.1.zh-Hant.md)。0.1.13 的準確基線 `doca-2026-10-08-knowledge-books-v2` 仍需按下方步驟顯式升級歷史儲存。保留原資料庫、私有物件、配置和憑證主金鑰。

`DOCA_ORIGIN` 是使用者在瀏覽器裡開啟的地址。包括生產環境在內，均支援 HTTP 和 HTTPS。不要加子路徑、查詢引數或片段；根路徑末尾斜槓會被規範化。

```text
DOCA_ORIGIN=https://docs.example.com
```

Docker 示例已經提供必填儲存值；首次單機部署修改來源，並用 `openssl rand -hex 32` 生成的值替換公開示例 `DOCA_CREDENTIAL_MASTER_KEY`。主金鑰對無外掛部署也必填，已有部署保留原金鑰；必填儲存值保持不變，PostgreSQL 和 Redis 按需配置。預設值、S3 必填欄位及獨立 Webhook/AI 儲存見[配置說明](configuration.zh-Hant.md)。

<a id="启动"></a>

## 啟動

0.1.26 將外掛改為與核心庫分開的[共享業務資料庫](plugin-database-isolation.zh-Hant.md)。在 0.1.25 正常解除安裝全部外部業務外掛，再停止全部例項。外掛私有業務記錄、憑證和物件按確認方案丟棄，不遷移；核心資料和普通檔案保留。移除舊的每外掛配置，只需配置一次 PostgreSQL 業務庫／賬號（SQLite 自動建立），再重灌並重新配置外掛。詳見 [0.1.26 升級要求](releases/0.1.26.zh-CN.md)。

更新前停止全部舊宿主並備份資料庫。當前宿主首次啟動自動對齊 0.1.22 結構並保留全部業務記錄，無需手工知識冊命令。舊 SQL 成果不適配新版物件格式，殘留記錄按需人工處理。若需把它們保留為可用成果，可在首次啟動前執行既有可選[無損離線轉換](knowledge-book-storage-verification.zh-Hant.md)。更早支援代際先完成下方歷史升級。所有宿主和 Web 構建一起更新。

<a id="从-0113-升级"></a>

### 從 0.1.13 升級

先停止全部 Doca 例項，完整備份資料庫（SQLite 包括 WAL）、檔案儲存和配置，保留原 `DOCA_CREDENTIAL_MASTER_KEY`。使用 main 當前部署檔案及其匹配映象，拉取後在原部署環境中執行一次離線維護容器：

```sh
docker compose stop
docker compose pull
docker compose run --rm --no-deps doca node --import tsx apps/server/src/bootstrap/history-storage.ts upgrade --apply
```

命令只接受 `doca-2026-10-08-knowledge-books-v2`，不建立或重置資料庫。升級事務增加歷史歸檔表與任務，保留全部快照原位元組。啟動新版後，最近 20 個完整快照保留在資料庫，更舊的每 10 個只保留最新 1 個到檔案儲存；其餘 9 個在寫入讀回驗證後淘汰，不再支援恢復。儲存失敗時整組原件保留。歷史列表統一展示，未滿一組暫留資料庫。詳見[歷史儲存及回退](storage.zh-Hant.md#历史快照存储与显式升级)。

該命令先記錄 `doca-2026-10-09-history-storage-v1`，當前宿主啟動後再按已批准規則對齊為 `doca-2026-10-12-book-payload-storage-v1`。直接歷史回退命令只接受歷史代際及其回退中斷標記，不能撤銷已經被當前宿主對齊的資料庫。回退前先閱讀[歷史維護限制](storage.zh-Hant.md#历史快照存储与显式升级)和[知識冊儲存恢復](knowledge-book-storage-verification.zh-Hant.md)。保留後續寫入和檔案位元組；已抽稀的 9 個只能從升級前備份恢復。不要把舊映象直接指向新版資料庫。

```sh
docker compose pull
docker compose up -d
```

`docker compose up -d` 會拉取 `compose.yaml` 指定的映象。只有要從當前檢出構建映象時才加 `--build`。

檢查容器：

```sh
docker compose ps
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

将 `docs.example.com` 替換為配置來源的主機名，非標準埠也需帶上。映象內建探針已經攜帶正確 Host，等待 `docker compose ps` 顯示 `healthy`。直接以迴環地址 curl 會返回 421。

健康的程序返回 `status: "ok"`，`version` 為實際映象版本。

文件渲染還需實際部署檢查：當前檢出新增 LibreOffice 和啟用沙箱的 Chromium，可選 SAM 另需可信 Linux 執行環境。元件邊界、內建 Chromium seccomp 策略和顯式 SAM 掛載見 [Docker 文件渲染器](docker-rendering.zh-Hant.md)，服務健康不代表這些工具已經可用。

SQLite、上傳檔案和 AI 資料庫儲存在 `doca_data` 卷。首次啟動時資料庫必須是空的。非空資料庫必須屬於支援的相容代際；已審定的新增結構會自動補齊，破壞性或語義差異會報告待確認。不要刪除已經有使用者的資料庫。

<a id="反向代理"></a>

## 反向代理

在同一臺機器上用 Caddy 或 Nginx 終止 TLS，並轉發到 `127.0.0.1:39120`。

```caddyfile
docs.example.com {
	reverse_proxy 127.0.0.1:39120
}
```

Caddy 預設代理 WebSocket 升級。Nginx 需要在 `/api/v1/ws` 上設定 `Upgrade` 和 `Connection` 頭。

`DOCA_TRUST_PROXY` 預設空值，不信任任何轉發頭，迴環連線也不例外。需要審計和限流識別真實客戶端 IP 時，只配置應用實際看到的代理 IP/CIDR。Docker 橋接可能讓宿主機代理表現為橋接閘道器，而非 `127.0.0.1`，應先核對網路。未配置時代理後的使用者可能共享代理 IP 的限流額度。

如果另一臺機器上的負載均衡器連到這臺主機，把容器埠釋出到內網介面，而不是隻繫結迴環地址，並把 `DOCA_TRUST_PROXY` 設為該負載均衡器的 IP 段。不要信任整個公網。

可信內網 HTTP 站點可設定 `DOCA_ORIGIN=http://doca.internal`，並透過 HTTP 反向代理提供該地址；也可將容器埠釋出到指定內網介面，並在來源中帶上埠。倉庫 Compose 預設只繫結迴環介面。無需改成開發模式，仍使用生產模式；HTTP 支援不改變 Host 或 Origin 校驗。

<a id="创建管理员"></a>

## 建立管理員

沒有預設賬號或密碼。容器健康之後，在存放 `compose.yaml` 的目錄執行：

```sh
bash scripts/bootstrap-admin.sh
```

指令碼會詢問賬號和密碼。密碼至少 12 位。它只傳給這一次容器命令。資料庫儲存雜湊。已經有管理員時，命令會停止，不會修改當前密碼。

<a id="修改密码"></a>

## 修改密碼

已登入使用者開啟 `#/account`，選擇「修改密碼」。新密碼至少 12 位。儲存後，該賬號的全部會話都會退出。

管理員無法登入時，在部署目錄重置已有賬號：

```sh
bash scripts/reset-admin-password.sh
```

這不會建立賬號，也不能透過 HTTP 呼叫。如果資料庫檔案被鎖住，先執行 `docker compose stop`，重置密碼，再執行 `docker compose up -d`。不要把賬號或密碼寫進 `.env`。

<a id="静态资源"></a>

## 靜態資源

HTML 頁面和介面留在 `DOCA_ORIGIN`。`DOCA_ASSET_BASE` 只改寫這份 HTML 裡的 `/assets/...` 地址。

服務端根據 `Accept-Encoding` 協商 Brotli（`br`）、gzip 或原始位元組，並返回 `Vary: Accept-Encoding`。資源 URL 和構建檔案不變，已有構建目錄也可使用；HTML 中的資源字首先改寫、再壓縮。每個程序最多快取 32 MiB 已編碼的公開靜態資源，不向映象新增額外壓縮副本，也不透過此路由壓縮私有 API 或檔案響應。反向代理/CDN 須保留編碼協商和 `Vary`，或自行處理壓縮。這項最佳化影響瀏覽器傳輸；Docker 使用自己的映象層壓縮和快取。

構建出的 `/cad/` worker 和 WASM 同樣支援編碼協商；由於檔名不帶雜湊，繼續使用 `no-cache`。宣告以外的 CAD 路徑不開放。

留空時，JavaScript、CSS 和其他構建檔案由容器從 `/assets` 提供。填寫時使用沒有賬號資訊、查詢引數、雜湊或末尾斜槓的 HTTP(S) 字首：

```text
DOCA_ASSET_BASE=https://cdn.example.com/doca/0.1.11
```

頁面裡原來的 `/assets/index-abc.js` 會變成：

```text
https://cdn.example.com/doca/0.1.11/assets/index-abc.js
```

把整個 `apps/web/dist/assets` 目錄釋出到這個字首下，並保留 `assets` 這一層。檔名包含內容雜湊，必須和同一個映象裡的 HTML 一致。介面請求仍發往 `DOCA_ORIGIN`。

正式標籤 `v1.2.3` 會構建網頁，並把 `doca-web-assets-v1.2.3.tar.gz` 附到 GitHub Release。解壓後保留 `assets` 目錄，放到會為 ES module 傳送跨源響應頭的 CDN 上。不要把 `github.com/.../releases/download` 當作 `DOCA_ASSET_BASE`。推送到 `main`，或 `v1.2.3-rc.1` 這類預釋出標籤，不會建立這個 Release。

容器仍保留自己的 `/assets` 檔案。樣式表裡用根路徑引用的字型和圖片繼續從 Doca 載入。

`index.html` 使用 `Cache-Control: no-cache`，發版後重新開啟會拿到新頁面。`/assets/` 下帶雜湊的檔案使用 `Cache-Control: public, max-age=31536000, immutable`，快取一年。內容變化時檔名會變，所以拿到新 HTML 之後不會繼續用舊指令碼。`DOCA_ASSET_BASE` 前面的 CDN 也要對這些帶雜湊的檔案使用同樣的長期快取。

<a id="给静态-cdn-设置响应头"></a>

### 給靜態 CDN 設定響應頭

`DOCA_ASSET_BASE` 只改 URL，不會配置 CDN。上傳構建檔案到 S3 時，為 JS/CSS/字型等設定物件後設資料 `Cache-Control: public, max-age=31536000, immutable`，並保留正確的 Content-Type（例如 JS 為 `text/javascript`，CSS 為 `text/css`）。如果無法更新已有物件，可在 CloudFront 的靜態 `*/assets/*` behavior 上關聯 **Response headers policy**：在 **Custom headers** 新增同樣的 Cache-Control，啟用 **Override**。跨域 ES module 還需要 `Access-Control-Allow-Origin: https://doca.example.com`；這些公開構建檔案也可以用 `*`，無需傳送憑據。不要把策略關聯到 HTML、介面或私有檔案 behavior。

CloudFront 的 **Cache policy** 單獨控制邊緣快取，建議靜態雜湊檔案 Minimum TTL = 0，Default/Maximum TTL = 31536000 秒。修改 Response headers policy 只改變發給瀏覽器的頭，不改變邊緣 TTL，見 [AWS 響應頭策略](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)。發版上傳新檔名，不覆蓋舊雜湊地址；保留舊版本檔案供已開啟的頁面載入後續 chunk。

自建 Nginx 靜態 CDN 可按釋出目錄配置（伺服器載入標準 `mime.types`）：

```nginx
location /doca/0.2.12/assets/ {
    alias /srv/doca/0.2.12/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "https://doca.example.com";
}
```

如 CDN 反代 Doca 已帶 Cache-Control 的 `/assets/`，先用 `proxy_hide_header Cache-Control;` 隱藏源站該頭，再新增新的頭，避免重複。未找到檔案的 404 不應得到一年快取；示例故意沒有使用 `always`。上線檢查最終 CDN 響應：

```sh
curl -I https://cdn.example.com/doca/0.2.12/assets/<实际带哈希的JS文件名>.js
```

確認 Cache-Control、Content-Type 和跨域響應頭；HTML 仍從 Doca 獲取並重新驗證。文件圖片及受保護檔案的快取策略見[儲存：圖片的瀏覽器快取與檔案 CDN](storage.zh-Hant.md#图片的浏览器缓存与文件-cdn)。

<a id="知识册正文转换"></a>

## 知識冊正文轉換

0.1.25 對支援的舊代際沿用普通結構對比並保留全部業務記錄，不自動清理知識冊、不增加舊正文適配，已有目標代際物件原樣保留。若舊 SQL 成果需繼續可用，既有[可選無損轉換](knowledge-book-storage-verification.zh-Hant.md)須在首次啟動前執行；轉換中斷仍需帶原清單完成。恢復備份時保留全部資料和後續寫入，所有宿主及 Web 構建一起更新。
