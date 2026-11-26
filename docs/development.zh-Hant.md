<a id="开发、部署与验收"></a>
<a id="开发部署与验收"></a>

# 開發、部署與驗收

[English](development.md)

<a id="准备变更"></a>

## 準備變更

新工作採用[分級 SDD 流程](sdd.zh-Hant.md)，透過[模組索引](sdd-module-index.zh-Hant.md)定位原始碼、現行契約和檢查。full 使用 Spec Kit 記錄，standard 可用一份 spec，light 在 PR 中記錄。相容決定仍須按照 AGENTS.md 單獨取得事先同意。除變更相關檢查外，執行 `pnpm sdd:check`。

<a id="开发启动"></a>

## 開發啟動

Node.js 22.12+或24 LTS、pnpm 11.25.0。版本鎖定pnpm-lock.yaml；better-sqlite3原生構建已在pnpm-workspace.yaml允許。

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# 将 .env 中的存储 root 改为本机可写的绝对路径。
pnpm dev
```

入口 http://127.0.0.1:39130，API監聽39120，透過前端同源代理訪問。直接訪問39120或用localhost替換127.0.0.1會與配置不符。

啟動前複製 `.env.example`，檔案儲存變數為必填；示例的儲存 root 為 Docker 使用的 `/data/storage`，原始碼執行前須改為本機可寫的絕對路徑。本地 origin 和 SQLite 路徑按示例使用，不提交憑證。

`DOCA_CREDENTIAL_MASTER_KEY` 同樣必填，即使開發時沒有安裝外掛。首次使用空資料庫時，用 `openssl rand -hex 32` 的輸出替換公開示例值。重啟保留同一個金鑰，並單獨備份；已有資料庫必須繼續使用原金鑰。

<a id="源码环境的-pdf-渲染"></a>

## 原始碼環境的 PDF 渲染

富文字和 Markdown 的 PDF 匯出使用獨立 Python 程序中的 WeasyPrint 70.0。安裝 Python 3.10+、Pango 和固定依賴：

```sh
python3 -m venv .local/pdf-renderer
.local/pdf-renderer/bin/pip install -r docker/pdf-requirements.txt
export DOCA_PDF_PYTHON="$PWD/.local/pdf-renderer/bin/python"
```

macOS 用 `brew install pango` 安裝系統庫；若無法找到動態庫，可將 `DYLD_FALLBACK_LIBRARY_PATH` 設為 `$(brew --prefix)/lib`。Debian/Ubuntu 需要 `python3-venv`、`libpango-1.0-0`、`libpangoft2-1.0-0`、`libharfbuzz-subset0`；Dockerfile 已安裝這些依賴。舊 `DOCA_PDF_CHROMIUM` 會被明確拒絕，啟動前刪除該配置，不回退瀏覽器。

AI 畫板圖片複用已安裝 Canvas SDK 的 SVG 匯出，在隔離 Node DOM 中用原生 Canvas 測量文字，再用 resvg 與隨包中文字型生成 PNG。依賴變化後執行 `pnpm build:canvas-render`。PDF 讀取/匯入繼續使用 PDF.js，Office 轉換繼續使用 LibreOffice。

`playwright-core` 僅用於開發驗收。執行 `pnpm exec playwright-core install chromium`，或為 `scripts/qa-document-pdf.mts` 設定 `DOCA_QA_BROWSER`。該指令碼執行隔離匯出、重匯入與視覺迴歸，產物預設寫入 `artifacts/verification/document-pdf/`，可用 `DOCA_QA_OUTPUT` 指定 `artifacts/` 下的其他目錄，不開啟使用者文件。見[檔案交換約定](editor-file-exchange-contract.zh-Hant.md#按在线样式导出-pdf-与可编辑导入)。

<a id="初始化管理员"></a>

## 初始化管理員

沒有預設賬號密碼。本地開發環境首次初始化時，在專案目錄執行：

```sh
bash scripts/bootstrap-admin-local.sh
```

指令碼只在當前終端臨時傳遞管理員賬號和密碼給初始化命令，資料庫中只儲存密碼雜湊。

容器部署見 [部署 Doca](deployment.zh-Hant.md)。其中包含反向代理、`DOCA_ORIGIN`、管理員初始化和重置密碼。

<a id="忘记管理员密码"></a>

## 忘記管理員密碼

如果管理員仍繫結了已驗證的手機或郵箱，可在登入頁使用驗證碼找回。若這些方式均不可用，使用部署機器上的本地運維恢復命令；它只接受已有管理員賬號，不會建立新管理員，也不會透過 HTTP 暴露：

```zsh
read "DOCA_RESET_ADMIN_LOGIN?管理员账号: "
read -s "DOCA_RESET_ADMIN_PASSWORD?新密码（至少12位）: "
export DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
pnpm admin:reset-password
unset DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
```

命令會校驗賬號確實是啟用中的管理員，更新密碼並撤銷該賬號的全部會話；密碼只以雜湊形式寫入資料庫。PostgreSQL 部署需要在同一環境中提供已有的 `DOCA_DATABASE_URL`，SQLite 則使用當前 `DOCA_SQLITE_PATH`。不要把恢復憑證寫入 `.env`、shell 歷史或容器映象。

<a id="配置"></a>

## 配置

| 變數              | 預設                   | 用途                                |
| ----------------- | ---------------------- | ----------------------------------- |
| DOCA_ORIGIN       | http://127.0.0.1:39130 | 唯一瀏覽器源；生產支援 HTTP(S)       |
| DOCA_HOST         | 127.0.0.1              | 監聽地址                            |
| DOCA_PORT         | 39120                  | API/釋出服務埠                    |
| DOCA_WEB_PORT     | 39130                  | 開發前端埠                        |
| DOCA_DATABASE     | sqlite                 | sqlite/postgres                     |
| DOCA_SQLITE_PATH  | ./data/v1/doca.db      | 配置的 SQLite 資料庫路徑            |
| DOCA_DATABASE_URL | 无                     | 配置的 PostgreSQL 資料庫連線串      |
| DOCA_BOOK_BATCH_CHECKPOINTS | on | 僅 on/off；off 停用批次恢復並保留檢查點記錄及物件 |
| NODE_ENV          | 未設定                 | production 提供構建產物並禁止 dev |
| DOCA_ASSET_BASE   | 空                     | 構建資源的 HTTP(S) 字首；空則從本機 `/assets` 提供 |

<a id="静态资源地址"></a>

## 靜態資源地址

生產頁面的 HTML 始終由 Doca 返回，介面也使用頁面所在的源。`DOCA_ASSET_BASE` 只改寫 HTML 裡的 `/assets/...` 地址。

不設定時，JS、CSS 和其他構建檔案由容器從 `/assets` 讀取。設定時，HTML 中的這些地址改為該字首，例如 `https://cdn.example.com/doca/0.1.10/assets/index-abc.js`。字首必須是沒有賬號、查詢引數或雜湊的 HTTP(S) URL；公網部署使用 HTTPS，可信內網可使用 HTTP。容器裡的 `/assets` 仍然保留，樣式表內部以根路徑引用的字型和圖片會繼續回到 Doca。

推送正式版本標籤 `v1.2.3` 時，GitHub Actions 會構建網頁並建立 Release，附件是 `doca-web-assets-v1.2.3.tar.gz`。解壓後保留其中的 `assets` 目錄，再把包含該目錄的 HTTP(S) 字首寫入 `DOCA_ASSET_BASE`。`v1.2.3-rc.1` 這類預釋出標籤不會建立 Release。推送到 `main` 也不會。瀏覽器不要直接使用 `github.com/.../releases/download` 作為 `DOCA_ASSET_BASE`：下載地址會跳轉，也不為 ES module 提供跨源響應頭。把解壓出的 `assets` 目錄放到允許跨源讀取指令碼的 CDN 或物件儲存上。

<a id="发布模式"></a>

## 釋出模式

```sh
pnpm check
NODE_ENV=production DOCA_ORIGIN=https://docs.example.com pnpm start
```

check執行型別檢查、測試和前端構建；start服務構建產物與API，不啟動Vite。示例域名需替換並配置TLS反代，保留原Host/Origin，轉發DOCA_PORT。

後端預設不信任任何 X-Forwarded-*，迴環地址也不例外；`DOCA_TRUST_PROXY` 僅填寫實際代理 IP/CIDR。當前認證按連線IP限流，反代使用者可能共享配額；正式上線須結合受信代理配置完善限流，不能隨意開啟trustProxy。

<a id="ai-任务日志"></a>

## AI 任務日誌

生產容器把 Fastify 訪問日誌和後臺 AI 任務錯誤寫到標準輸出。Docker Compose 部署時，在部署機執行：

```sh
docker compose ps
docker compose logs -f --tail=200 doca
```

只篩選 AI 失敗記錄時，可以執行：

```sh
docker compose logs --since=30m doca | grep -E "AI job failed|AI 工作流|模型|图片"
```

單獨使用 Docker 時，把 `doca` 換成實際容器名：

```sh
docker ps
docker logs --since=30m -f <container-name>
```

Kubernetes 部署則檢視 Pod 的標準輸出：

```sh
kubectl logs -f deploy/doca --tail=200
```

瀏覽器中的 AI 會話介面會返回 `jobs[].id`、`jobs[].status` 和 `jobs[].error`。用這個 job ID 在日誌中定位對應的 `AI job failed` 記錄即可；日誌只記錄脫敏後的錯誤分類，不會輸出模型金鑰或完整提示詞。

這是可執行開發基線，尚非生產驗收發布：賬號找回已實現，聯絡方式找回需配置驗證閘道器；OIDC 提供方尚未實現；目標基礎設施監控和大規模查詢最佳化仍需單獨驗收，公共[監控服務](plugin-monitoring.zh-Hant.md)已實現。外部 OIDC 和社交登入適配已實現，憑據部署和真實平臺聯調見 [身份認證說明](authentication.zh-Hant.md)，能力邊界見 [架構](architecture.zh-Hant.md)。

<a id="数据保护"></a>

## 資料保護

- 空資料庫按最新目標結構建立；受支援的已有庫在啟動時補齊已審定的新增項。SQLite 預設路徑為 `data/v1/doca.db`。
- 靜態目錄僅apps/web/dist，不公開.archive、data、.env。
- 啟動對比已安裝結構與最新目標；需要確認或驗證失敗時不監聽，升級事務整體回滾。正式部署前先備份並驗證恢復。
- SQLite離線備份應停止全部寫入程序後複製完整目錄。線上需backup API，不能只複製執行中的主db而漏掉WAL。
- PostgreSQL用原生備份/恢復流程。資料庫災備由部署運維負責。
- SIGINT/SIGTERM關閉HTTP、Vite和資料庫。生產使用程序管理器重啟。

<a id="数据库改动"></a>

## 資料庫改動

修改核心結構或持久化格式前，先閱讀並遵守[資料庫升級規範](database-schema-evolution.zh-Hant.md)。這是後續統一執行的專案約定：新庫與升級共用最新 DDL，`schemaEvolution` 宣告已確認的新增項，普通增量變化不調整相容代際。歷史欄位值、語義及破壞性變化，按 [AGENTS.md](../AGENTS.md) 先確認具體資料保留、驗證和恢復方案。

資料庫改動須驗證隔離 SQLite 和 PostgreSQL 17、18 舊結構，覆蓋已有行保留、預設值、重複與併發啟動、待確認差異不發生部分寫入。釋出驗收還須升級受影響的實際已發行舊版本建立的資料庫。PostgreSQL CI 矩陣位於 `.github/workflows/database-upgrade.yml`，與預設測試互補；已確認的行為或支援範圍變化須同步規範和升級說明。

<a id="验证"></a>

## 驗證

協同相關開發先讀取 `skills/doca-collaboration/SKILL.md`，倉庫 `AGENTS.md` 已宣告觸發範圍。該 skill 也安裝在當前機器的 Codex 全域性 skills 目錄，供富文字、Excel 和宿主專案複用；其他機器需要安裝此目錄，不能假定倉庫外任務會自動讀取本倉庫約束。介面語言約定同樣安裝為 `$doca-i18n`，原始檔是 `docs/i18n.md`。

`docs/collaboration-sdk-contract.md` 是規範原始檔，釋出 skill 時同步 `references/contract.md`。規範中“建議 API”和待落地協議不等於當前包已支援；元件更新後宿主仍須安裝新產物、核對匯出和 schema，並驗證儲存確認、重連、已有資料恢復及線上選區，不能僅替換版本號。

```sh
pnpm typecheck
pnpm test
pnpm build
```

tests/cloud.test.ts使用臨時SQLite與臨時賬號，結束清理測試目錄，不訪問實際使用者庫。

覆蓋私有隔離（含管理員）、公開閱讀、許可權繼承/隱藏祖先、版本衝突、所有權轉移、樹環、移動重置授權、刪除批次恢復、獨立複製、評論許可權、反應冪等、通知隔離、Host/Origin、註冊停用、會話撤銷、重啟持久化與OpenAPI路由。

已用本地瀏覽器檢查登入、主頁、搜尋開啟文件、實際訪問記錄和管理員統計；新增客戶端無請求體迴歸測試。專項瀏覽器和隔離 PostgreSQL 17/18 檢查見[驗收記錄](verification/README.md)；完整瀏覽器端到端覆蓋、目標環境 PostgreSQL、全面鍵盤無障礙、反代限流、負載與長期執行仍需驗收，不能以 SQLite 透過代替。
