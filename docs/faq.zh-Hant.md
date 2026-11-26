<a id="常见问题与排障"></a>

# 常見問題與排障

[English](faq.md)

<a id="有没有默认管理员密码？"></a>
<a id="有没有默认管理员密码"></a>

## 有沒有預設管理員密碼？

沒有。容器健康後執行 `bash scripts/bootstrap-admin.sh`，密碼至少 12 位。已有賬號需要使用 `bash scripts/reset-admin-password.sh`；初始化不用於重置密碼。

<a id="为什么浏览器不能直接访问-39120-端口？"></a>
<a id="为什么浏览器不能直接访问-39120-端口"></a>

## 為什麼瀏覽器不能直接訪問 39120 埠？

Compose 把埠繫結到伺服器迴環地址。透過已配置的反向代理訪問 `DOCA_ORIGIN` 對應的 HTTP(S) 來源；只有來源與埠對映明確匹配時，伺服器 IP 地址才可直接使用。檢查埠對映、Host、所用 TLS 和 WebSocket 轉發，詳見[部署說明](deployment.zh-Hant.md)。

<a id="应该复制哪个环境变量示例？"></a>
<a id="应该复制哪个环境变量示例"></a>

## 應該複製哪個環境變數示例？

已釋出 Docker 映象使用 `docker.env.example`，原始碼開發使用 `.env.example`。啟動 Compose 前配置 `DOCA_ORIGIN`、`DOCA_FILE_STORE_ID`、`DOCA_FILE_STORES_JSON` 和必填的持久 `DOCA_CREDENTIAL_MASTER_KEY`。首次安裝替換公開示例金鑰，已有資料庫保留原金鑰，詳見[配置說明](configuration.zh-Hant.md)。

<a id="为什么返回-421、403，或者编辑器断开？"></a>
<a id="为什么返回-421403或者编辑器断开"></a>

## 為什麼返回 421、403，或者編輯器斷開？

421 通常表示請求 Host 與配置來源不匹配。寫請求要求同源 Origin，不匹配會返回 403。編輯還需要授權，以及 `/api/v1/ws` 正常的 WebSocket 升級。檢查瀏覽器地址、代理配置、賬號狀態和當前資源許可權。

<a id="数据库基线被拒绝时怎么办？"></a>
<a id="数据库基线被拒绝时怎么办"></a>

## 資料庫基線被拒絕時怎麼辦？

停止操作並閱讀[資料庫升級規範](database-schema-evolution.zh-Hant.md)和對應[發行要求](releases/0.2.38.zh-CN.md)。支援的代際按已批准規則對賬結構；不支援的代際、語義變化及需複核差異在持久修改前停止啟動。保留舊部署、資料庫、檔案和金鑰用於回退，不刪除表、不重置資料卷、不修改基線標記來強行啟動。

<a id="怎样排查启动失败？"></a>
<a id="怎样排查启动失败"></a>

## 怎樣排查啟動失敗？

```sh
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 doca
curl -fsS -H 'Host: doca.example.com' http://127.0.0.1:39120/health
```

在伺服器上、包含 `compose.yaml` 的檢出目錄執行。不要公開含金鑰的日誌。原始碼開發使用 `http://127.0.0.1:39130` 和開發配置。

<a id="github-pages-和-doca-应用是同一种部署吗？"></a>
<a id="github-pages-和-doca-应用是同一种部署吗"></a>

## GitHub Pages 和 Doca 應用是同一種部署嗎？

GitHub Pages 託管這套靜態文件網站。Doca 應用需要容器或伺服器、資料庫、持久檔案和 HTTP(S) 來源。更新文件站不會啟動或升級 Doca 應用。

<a id="更新或重启会删除文件吗？"></a>
<a id="更新或重启会删除文件吗"></a>

## 更新或重啟會刪除檔案嗎？

普通 `docker compose restart` 保留持久卷，配置變更透過 `docker compose up -d` 應用。更換映象版本前閱讀發行說明，並備份全部資料庫、被引用的檔案儲存和受保護的配置。不要執行會刪除資料卷的 `docker compose down -v`。

<a id="插件或外部服务为什么不可用？"></a>
<a id="插件或外部服务为什么不可用"></a>

## 外掛或外部服務為什麼不可用？

外掛包需滿足當前 SDK 和儲存契約。安裝狀態變化後，逐個手動重啟全部例項。使用加密憑證的外掛要求所有副本持有同一個持久主金鑰。AI、SSO、搜尋及雲端儲存是否可用還取決於真實憑據和網路，原始碼測試不能代替真實服務驗收。詳見[外掛部署](plugin-deployment.zh-Hant.md)。

上面的健康檢查需替換為實際配置的主機名；421 表示 Host 不匹配，迴環探測也需正確 Host。預設不信任任何代理；代理 IP 共享限流時應準確配置 `DOCA_TRUST_PROXY`。

<a id="桌面客户端从哪里下载？"></a>
<a id="桌面客户端从哪里下载"></a>

## 桌面客戶端從哪裡下載？

Windows 與 macOS 安裝包可從 [GitHub Releases](https://github.com/workhold/doca/releases) 下載。當前安裝包未做簽名與公證：macOS 首次開啟需右鍵 →「開啟」，Windows 可能出現 SmartScreen 提示。服務端需為 0.2.37 或更高版本。詳見[桌面客戶端](desktop-client.zh-Hant.md)。
