<a id="文件存储与上传"></a>

# 檔案儲存與上傳

[English](storage.md)

本模組用於頭像、知識庫封面、文件圖片和附件。正文編輯器與管理頁共用上傳介面，正文僅儲存穩定資產ID，由資源介面卡解析鑑權URL，不儲存短時CDN簽名連結。

<a id="环境变量配置"></a>

## 環境變數配置

檔案儲存由必填的 `DOCA_FILE_STORE_ID` 和 `DOCA_FILE_STORES_JSON` 指定。兩份環境示例均使用 `/data/storage`，與正式映象的持久資料卷一致。原始碼開發時複製 `.env.example`，把本地 root 改為本機可寫的絕對路徑。Compose 使用 `docker.env.example`。資料庫只記錄穩定儲存 ID 和物件引用，不儲存後端憑據；管理頁只讀展示。

```dotenv
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

使用服務專用持久化目錄，僅服務使用者可寫，位於靜態目錄之外。多例項必須共享同一物理後端。備份覆蓋資料庫、全部被引用的檔案儲存和受保護的部署配置。被引用的儲存 ID 必須持續配置；修改路徑或桶不會移動已有位元組。

當前啟動按最新 DDL 對賬受支援的資料庫代際。不支援的代際和已退出的資料庫管理後端格式仍受門禁限制，不自動轉換。已有部署按[資料庫升級規範](database-schema-evolution.zh-Hant.md)及[發行要求](releases/0.2.23.zh-CN.md)處理，保留儲存、業務行和原憑證主金鑰。

<a id="docker-上传报-eacces"></a>

## Docker 上傳報 EACCES

如果 `/api/v1/assets` 返回 HTTP 500，容器日誌顯示 `EACCES: permission denied, mkdir '/app/data'`，檢查 `DOCA_FILE_STORES_JSON` 中當前本地儲存的 `root`。映象以 `node` 使用者執行，工作目錄為 `/app`；Compose 把持久資料卷掛載在 `/data`。開發配置的 `./data/v1/storage` 會解析成 `/app/data/v1/storage`，位於可寫資料卷之外。

如果這個儲存從未儲存過成功上傳的檔案，把它的 root 設定為 `/data/storage`，保留原儲存 ID 和其他儲存條目。只重建應用容器，使環境變數修改生效：

```sh
docker compose up -d --no-deps --force-recreate --pull never --no-build doca
```

如果儲存已有檔案，修改 root 前先檢查並備份實際目錄和資料庫，約定保留物件位元組及其原有 key 的路徑方案，再驗證舊檔案下載和新檔案上傳。修改配置不會移動檔案。不要透過刪除資料卷或重置資料庫修復路徑、許可權問題。

<a id="命名空间与访问"></a>

## 名稱空間與訪問

宿主生成物件路徑使用 `host/` 字首，外掛建立的常規檔案使用 `plugins/<pluginId>/`。外掛私有物件使用獨立代次和物件路徑，不可變安裝 ZIP 使用 `host/plugin-releases/<sha256>.zip`。使用者檔名不參與物理路徑生成。檔案和資料夾保持穩定 ID，並遵循宿主授權；GET `/api/v1/assets/:id/content` 檢查許可權，靜態服務不能繞過。見[準確儲存實現](unified-storage-implementation.md)。

<a id="s3-与-cdn"></a>

## S3 與 CDN

`provider:"s3"` 的環境 JSON 配置需要 `bucket`、`region`、`forcePathStyle` 和 `credentials:{accessKeyId,secretAccessKey,sessionToken?}`，可選 `endpoint` 為 HTTP(S) 根 origin，不帶賬號密碼、子路徑、查詢引數或片段。HTTP 用於部署者顯式配置的可信內網端點；應用不會解析 DNS 來自動判定目標是否為內網。部署者控制目標和網路出口，管理介面不配置金鑰或端點。桶保持私有，憑據只授予宿主和外掛對應字首所需的讀寫刪除許可權。配置校驗不代表真實連線成功。

RustFS 與 Doca 位於共享容器網路時，先建立私有桶，再配置 S3 API 監聽器（預設埠 `9000`，控制檯為 `9001`），啟用路徑式定址。`region` 与 `RUSTFS_REGION` 一致，預設 `us-east-1`：

```dotenv
DOCA_FILE_STORE_ID=cloud
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"cloud":{"provider":"s3","bucket":"doca-files","region":"us-east-1","endpoint":"http://rustfs:9000","forcePathStyle":true,"credentials":{"accessKeyId":"replace-me","secretAccessKey":"replace-me"}}}}'
```

使用 Doca 容器可訪問的主機名或內網地址。站點、靜態資源和 CDN 來源也支援 HTTP(S)。見 [RustFS S3 文件](https://docs.rustfs.com/zh/administration/protocols/s3)。示例用於新安裝，修改已有儲存的端點不會搬運物件。

可選 `cdn:{domain,keyPairId,privateKey}` 使用 CloudFront 簽名 URL 協議。部署私有 S3 源站、OAC 和要求籤名的可信金鑰組；CDN 保留完整物件 key、Content-Type 和 Content-Disposition。環境變數提供 HTTP(S) 分配 origin 和 PEM 簽名私鑰。宿主先檢查最新 ACL，再發放 60 秒有效連結。撤權後不再發新連結，已發連結在到期前可能有效；已下載位元組無法撤回。

未使用 CDN 時，宿主代理私有云檔案，不向瀏覽器返回儲存秘密。其他 CDN 簽名協議需要新增介面卡，不提供永久公開 URL 降級。金鑰輪換需保留被引用的儲存 ID 及其位元組訪問能力；輪換不是資料遷移。

<a id="图片的浏览器缓存与文件-cdn"></a>

## 圖片的瀏覽器快取與檔案 CDN

文件正文、評論中的普通圖片、助手圖片，以及由宿主代理的頭像、封面，透過穩定的 `/api/v1/assets/:id/content` 地址快取。成功的內聯圖片響應（包括縮圖）返回：

```http
Cache-Control: private, max-age=3600, must-revalidate
Vary: Cookie, Authorization
ETag: W/"对象及变体的标识摘要"
```

瀏覽器可以在一小時內複用本機快取；過期後傳送 `If-None-Match`，宿主先核對當前許可權，再對相同物件返回 `304`，不再傳圖片位元組。原圖和縮圖具有不同 ETag。物件 key 不可變，替換圖片需要上傳新資產。賬號切換後 Cookie/Authorization 變化會選擇另一份快取；快取有效期內不會再次核對撤權，已下載位元組無法撤回。瀏覽器可能因空間不足、使用者清理、強制重新整理或“Disable cache”提前丟棄快取。這裡使用 HTTP 快取，不額外建立 IndexedDB 或 Service Worker 副本。`no-cache` 表示重新驗證，`no-store` 表示不儲存，區別見 [MDN 快取指南](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)。

非圖片的 AI 對話附件、`download=1`、回收站預覽及錯誤響應仍使用 `no-store`，不應用上述快取策略。即使帶有效 ETag，未獲授權的請求也不能獲得 `304`。文件正文圖片具有 resourceId，當前始終由宿主代理；開啟 S3 檔案 CDN 不會把這些圖片自動改成公開地址。助手圖片同樣由宿主代理。生成圖片卡片與助手正文中的圖片使用現有的 480 畫素 WebP 縮圖，點選開啟原圖，下載保留原始檔案位元組；非同步縮圖任務尚未完成或不可用時，行內圖片可先顯示原圖。

檔案 CDN 的簽名跳轉保持 `no-store`，避免瀏覽器重複使用過期的 60 秒簽名。CDN 最終檔案響應的 header 必須配置在檔案 CDN 或 S3 源站；Doca 跳轉響應上的 header 不會傳給最終響應。新上傳的 S3 物件後設資料當前為 `Cache-Control: private, max-age=60`；已有物件的後設資料不會由本次修復批次改寫。

CloudFront 中，對受保護檔案的 behavior 使用私有 S3 origin/OAC 和可信金鑰組。沿用 60 秒簽名限制，在 **Response headers policy → Custom headers** 中設定 `Cache-Control: private, max-age=60, must-revalidate` 並啟用 **Override**，為新舊物件統一最終瀏覽器響應。不要給整站或 `/api/*` 套用公開長期快取。未單獨規劃邊緣快取時，使用 **CachingDisabled**；定製策略的 Minimum TTL 必須是 0。AWS 指出，正數 Minimum TTL 可以覆蓋源站的 `private/no-store`。Response headers policy 控制瀏覽器響應，不控制邊緣 TTL；兩者要分別設定。見 [響應頭策略](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)、[快取策略 TTL](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html)和[簽名 URL](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html)。

簽名 URL 的查詢引數變化後，瀏覽器會將其作為不同地址，設定 header 不能保證跨簽名複用本機快取。穩定的文件圖片介面沒有這個問題。檔案 CDN 的邊緣命中率與瀏覽器快取命中率也不是同一個指標。

驗收時關閉 DevTools 的 **Disable cache**，連續開啟同一文件：一小時內圖片應顯示 memory/disk cache；手動請求條件讀取應為 `304`，沒有圖片響應體。再測試退出賬號、撤權、縮圖、下載和回收站預覽。CDN 跳轉需同時檢查跳轉響應與最終響應：

```sh
# 只检查响应头。使用有权限的会话；不要把 Cookie 或签名贴到公共日志。
curl -I -H 'Cookie: doca_session=<会话>' https://doca.example.com/api/v1/assets/<资产ID>/content
curl -I -H 'Cookie: doca_session=<会话>' -H 'If-None-Match: W/"<首次响应的摘要>"' https://doca.example.com/api/v1/assets/<资产ID>/content
curl -I 'https://files.example.com/<对象key>?<有效签名参数>'
```

JS/CSS 靜態 CDN 的一年快取配置見[部署：靜態資源](deployment.zh-Hant.md#静态资源)，不要將檔案 CDN 的私有短期策略套給帶內容雜湊的公開構建檔案。

<a id="历史快照存储与显式升级"></a>

## 歷史快照儲存與顯式升級

最近 20 個完整業務快照儲存在資料庫，舊快照每湊滿 10 個只保留其中最新 1 個到配置的檔案儲存，S3 模式下為雲端儲存。每個長期保留點是獨立 gzip JSON 檔案，原樣儲存 checkpoint 和獨立恢復資訊，並在資料庫記錄一個小索引。只在上傳與讀回 SHA-256 校驗成功後，事務性地登記索引、清理這一組完整資料庫記錄；另外九個快照按已確認規則抽稀，不再提供回滾。未滿十個或儲存故障時保留資料庫原件。列表統一合併兩個來源，不顯示儲存型別、物件 key 或簽名地址。

協作 checkpoint、未覆蓋增量與附件不參與抽稀。回收站保留歷史，顯式永久刪除文件後才排隊清理歸檔檔案；檔案清理延遲一小時並複核無有效引用。歸檔不重新解碼、補全或轉換舊 recovery_json。缺少恢復資訊或不支援的恢復版本繼續拒絕預覽。檔案只接受 envelope v1，並驗證檔案雜湊、解壓上限及索引一致性。正文提交不等待轉存，後臺持久任務失敗後會重試。

當前代際為 `doca-2026-10-12-book-payload-storage-v1`。下列歷史維護步驟只接受準確的 `doca-2026-10-08-knowledge-books-v2` 資料庫（已釋出 0.1.13）：先記錄 `doca-2026-10-09-history-storage-v1`，當前宿主啟動後再按已批准規則對齊結構。先停止全部宿主例項，備份資料庫、檔案儲存和配置，保留原主金鑰，再執行：

```sh
pnpm history:upgrade                 # 显示要求，不修改数据
pnpm history:upgrade --apply         # 显式增加结构、更新基线、排队转存；不立即抽稀
```

不要用重建資料庫代替升級。升級事務失敗時原資料庫保持不變。直接歷史回退只接受 `doca-2026-10-09-history-storage-v1` 或專用回退中斷標記，不接受當前知識冊正文代際。當前代際須先閱讀[知識冊儲存恢復](knowledge-book-storage-verification.zh-Hant.md)，已有批次檢查點引用可能阻止早期回退；不能修改基線標記繞過驗證。對於符合條件的歷史代際庫，停止全部例項後再導回保留點：

```sh
pnpm history:rollback --apply --manifest /backup/history-cloud-references.json
```

清單路徑必須是新檔案，許可權為 0600。回退先儲存雲檔案引用清單，再逐條驗證導回保留點，最後恢復上一基線；雲檔案繼續保留。中斷狀態使用專門基線標記，宿主拒絕啟動，避免部分導回的保留點被再次抽稀；修復儲存問題後，用新的清單路徑重跑回退命令。不能恢復已抽稀的九個版本；需要這些版本時還原抽稀前的完整資料庫備份。使用者在快照列表中的回滾仍沿用當前 epoch 與許可權/expectedSeq 校驗，富文字和 Markdown 支援恢復，其餘格式仍僅預覽。

<a id="校验与权限"></a>

## 校驗與許可權

- 頭像/封面最大5MB，識別PNG、JPEG、WebP、GIF真實檔案頭並解碼；限制2500萬畫素，移除後設資料，轉WebP。頭像裁為方形(最大512)，封面最大1600寬；GIF僅取首幀。
- 文件/AI 附件上傳最大 20 MiB，保留原位元組；可識別的柵格圖片需透過 2500 萬畫素限制校驗。頭像、封面、評論圖片按各自用途歸一化為 WebP。普通使用者檔案使用獨立流式上傳 API，最大 2 GiB。SVG/HTML不作為可執行圖片內聯展示；普通檔案強制 attachment、nosniff、sandbox。未接入病毒掃描。
- 最多4個併發上傳、單使用者每10分鐘最多60次嘗試；API也檢查最近上傳記錄。反向代理需額外設定請求體大小、連線數和總儲存配額，當前未提供每使用者磁碟配額。
- 頭像草稿僅上傳者可讀，繫結後本站登入使用者可檢視；匿名不可檢視。封面遵循知識庫ACL，未繫結草稿僅上傳者可讀；附件遵循文件ACL，系統管理員無閱讀特權。封面需要管理者許可權、附件需要編輯者許可權。
- 上傳先落物件，再在事務中複核使用者狀態/資源許可權並登記；登記失敗盡力刪除未提交物件。編輯封面使用資源version，修改頭像使用個人設定version。
- 已完成上傳但未繫結的頭像/封面草稿暫保留；資產草稿定時回收、每使用者儲存配額和病毒掃描待補充。普通使用者檔案已支援 S3 分片上傳，32 MiB 起採用 8 MiB 分片；與限大小的資產介面分開。異常宕機可能遺留未登記物件，運維清理必須校驗所有資產引用，不能按單篇文件刪除共享物件。

<a id="验证边界"></a>

## 驗證邊界

自動化覆蓋本地上傳、私有許可權、圖片校驗、繫結、衝突、穩定儲存 ID、外掛名稱空間和不可變歸檔完整性。隔離 PostgreSQL 整合及本地雙例項瀏覽器驗收已透過。S3 SDK 和 CDN 簽名採用模擬，未使用真實雲憑據；真實桶上傳下載、私有源站封鎖、簽名過期、撤權、網路失敗及備份恢復仍需專項驗收。見[瀏覽器驗收報告](storage-browser-acceptance.md)。
