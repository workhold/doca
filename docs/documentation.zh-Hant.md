<a id="文档维护"></a>

# 文件維護

[English](documentation.md)

文件站使用 Docsify 5.0.0。Markdown 原始檔放在 `docs/`，`docs/site/navigation.json` 定義公開頁面及閱讀順序。技術契約原始檔保留原路徑，供倉庫和編輯器技能引用。

<a id="结构"></a>

## 結構

| 分組 | 內容 |
| --- | --- |
| 入門 | 快速開始、配置、使用指南、排障 |
| 使用指南 | 文件、分享、許可權、評論、知識整理 |
| 部署運維 | Docker、儲存、擴充套件、認證、服務憑據、Webhook |
| 開發 | 原始碼環境、架構、編輯器、協同、介面語言 |
| 外掛 | 開發、安裝、公共服務、擴充套件貢獻 |
| 技術參考 | API、資料庫、SDK 與編輯器契約 |
| 發行記錄 | 各版本變更、要求和驗證 |
| 專案 | 文件維護及原始研發、驗收資料 |

每篇公開頁面都有範圍一致的英文 `name.md` 和中文 `name.zh-CN.md`。研發與驗收資料保留原始語言、日期和驗收範圍，單獨索引。已退出的實現和被替代的提案在原始檔頂部註明狀態。實現清單區分已匯出介面、提案，以及尚未驗證的外部服務或裝置行為。

新變更採用[分級 SDD 流程](sdd.zh-Hant.md)，[模組索引](sdd-module-index.zh-Hant.md)關聯原始碼、權威契約和可複用檢查。規格記錄某次變更；現行技術契約保留原路徑，並在行為變化時於同一個 PR 中更新。

<a id="检查与预览"></a>

## 檢查與預覽

```sh
pnpm install --frozen-lockfile
pnpm docs:check
pnpm docs:dev
```

開啟 `http://127.0.0.1:39140/#/en/` 或 `http://127.0.0.1:39140/#/zh-cn/`。預覽只讀取文件，不啟動 Doca，也不連線其資料庫。原始檔變更後，重新執行命令生成釋出目錄。

`pnpm docs:build` 生成 `.cache/docs-site/`，其中包含 `en/getting-started/`、`zh-cn/operations/` 等分組目錄。它複製 Markdown 並改寫連結，由 Docsify 在瀏覽器中渲染；不構建應用程式碼，也不將 Markdown 預渲染成 HTML。生成目錄由 Git 忽略。

普通公開頁面連結留在當前語言，明確的 English/中文連結切換語言。原始碼、示例和研發資料連結開啟對應 GitHub 檔案。每頁附帶編輯原始檔和檢視譯文的連結。缺少譯文時檢查失敗，不替換成其他語言。

`docs:check` 透過 Git 收集全倉庫 Markdown，包括未被忽略的新檔案，排除 `tests/fixtures/`。檢查 Markdown/HTML 連結及標題目標，也檢查指向本倉庫 main 分支的連結；不讀取被忽略的產物，不聯網抓取外站或歷史標籤 URL。公開頁面另按 Docsify 規則校驗錨點。檢查還比對當前發行入口、雙語編輯器版本矩陣、全部資料庫表/欄位（含 Schema 繼承介面）及五份 skill 引用與源文件的一致性。讀取 TypeScript 型別時不開啟應用資料庫。外站可用性和每條語義說明仍須審閱。

執行 `pnpm test:docs` 驗證檢查器迴歸用例。修改契約後執行 `node scripts/sync-docs-skills.mjs`，保留原文並將相對連結改為可在倉庫外使用的地址；可額外傳入已安裝 skills 目錄，同步安裝副本，例如 `node scripts/sync-docs-skills.mjs /absolute/path/to/installed/skills`。按對應 skill 的維護規則保持各安裝副本同步。

<a id="github-pages"></a>

## GitHub Pages

`.github/workflows/docs.yml` 在拉取請求中檢查文件，併發布 `main` 的變更。在倉庫 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。工作流使用 `github-pages` 部署環境及其審批規則，也可在 Actions 中手動執行。

預定入口為：

- [English](https://workhold.github.io/doca/#/en/)
- [简体中文](https://workhold.github.io/doca/#/zh-cn/)
- [繁體中文](https://workhold.github.io/doca/#/zh-hant/)
- [日本語](https://workhold.github.io/doca/#/ja/)
- [Français](https://workhold.github.io/doca/#/fr/)
- [한국어](https://workhold.github.io/doca/#/ko/)
- [Español](https://workhold.github.io/doca/#/es/)
- [Русский](https://workhold.github.io/doca/#/ru/)

工作流成功部署後，這些地址才可訪問。README 指向對應語言入口。文件站使用 GitHub Pages 預設域名，無需配置自定義域名 DNS 或倉庫 CNAME 檔案。

部署到其他靜態服務時，提供 `.cache/docs-site/` 的內容。hash 路由支援倉庫子路徑和直接重新整理，無需服務端路由重寫。生成的 `.nojekyll` 用於 Pages 託管時保留以下劃線開頭的導航檔案。

<a id="资源与更新"></a>

## 資源與更新

需要保留的驗收摘要與文件附件放在 [`docs/verification/`](verification/README.md)，按驗收主題或發行版本分目錄；可複用的指令碼輸入放在 `tests/fixtures/`。自動生成的日誌、截圖、報告與快取統一寫入 `artifacts/`，該目錄由 Git 整體忽略。新增保留資料無需調整忽略規則。

Docsify 執行庫、搜尋外掛、亮色/暗色樣式及 MIT 許可證隨站點儲存於 `docs/site/assets/vendor/docsify/`。`README.txt` 記錄版本及校驗過的上游 npm 包完整性，這些資源從文件站自身載入。Mermaid 圖按需載入 `site.js` 固定的 ESM 版本，需要能夠訪問該 CDN。

新增公開頁面時，建立雙語檔案，登記到 `navigation.json`，執行 `pnpm docs:check` 和 `pnpm docs:build`。非公開技術或設計記錄進入[研發索引](research.zh-Hant.md)，審閱後的驗收摘要進入[驗收索引](verification/README.md)。程式碼示例和版本要求保持一致。修改契約時遵循倉庫相應技能，並按要求同步打包引用。執行庫和額外外掛需明確選擇版本並完成瀏覽器驗證。

<a id="语言版本"></a>

## 語言版本

文件站當前內容、倉庫入口和 0.3.0 及後續多語言發行記錄使用簡體中文、英語、繁體中文、日語、法語、韓語、西班牙語和俄語。各語言的字尾、站點路徑和導航文字在 `docs/site/languages.json`。更早的發行記錄與獨立驗收資料保留髮布時的版本。新增公開頁面時提交各語言稿；新增多語言發行記錄在導航條目最後標記 `true`。文件截圖放在對應語言的 `docs/images/` 子目錄。
