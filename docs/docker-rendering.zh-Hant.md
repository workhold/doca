<a id="docker-文档渲染器"></a>

# Docker 文件渲染器

[English](docker-rendering.md)

本次改造後的映象使用 WeasyPrint 70.0 匯出富文字/Markdown PDF，使用 Node、原生 Canvas 和 resvg 生成 AI 畫板圖片；不安裝 Chromium 或 Playwright 執行時，不需要宿主 seccomp JSON、額外共享記憶體或瀏覽器使用者名稱空間設定。必須重新構建映象後使用新 Compose；已釋出舊映象不會自動獲得新渲染器。

PDF 讀取、逐頁文字與影象提取及可編輯匯入繼續使用 PDF.js。LibreOffice Writer、Calc、Impress、Math 繼續負責 `.docx`、`.xlsx`、`.pptx` 的視覺轉換，中文及 Liberation 字型繼續保留。公式、流程圖、嵌入圖片、長表格和中文分頁需要實際匯出檢查，健康檢查不能代替視覺驗收。

PDF 任務使用 `DOCA_PDF_PYTHON=/opt/doca-pdf/bin/python` 啟動固定 Python 環境，只允許內嵌 data 資源，拒絕網路/宿主檔案讀取；損壞或無法讀取的圖片/字型不能靜默交付不完整 PDF。每個任務保留 32 MiB 輸入、兩個併發、60 秒期限以及許可權二次校驗。Node 畫板任務繼續透過宿主授權素材回撥讀取圖片，保留場景/選區/裁剪、告警、排隊和取消行為。兩種任務在超時/取消時終止獨立程序。

旧 `DOCA_PDF_CHROMIUM` 配置會明確報錯，不自動啟用舊渲染器。現有文件、資料庫、附件、金鑰與持久卷保持原狀；已有 SDK 歷史讀取規則沿用原路徑，不轉換存量資料。回滾恢復原始碼、依賴鎖和映象，並保留之後寫入的資料及原部署配置。舊版 `docker/chromium-seccomp.*` 僅保留來源記錄和舊版對照驗收用途，不再隨新部署包交付。

<a id="镜像体积与更新下载量"></a>

## 映象體積與更新下載量

移除瀏覽器會減少映象內容，但 Python/Pango/resvg 會佔用空間，LibreOffice、字型、應用依賴和 Web 資源仍然保留。實際下載量以相同版本/架構構建的壓縮層對比為準，不以 Docker Desktop 多架構本地佔用推算。

Web、通用依賴及各編輯器繼續獨立分層，部署路徑和許可權不變。見[分層核驗記錄](verification/image-web-layers-2026-10-23.md)。

<a id="容器验收"></a>

## 容器驗收

```sh
DOCA_RELEASE_QA_IMAGE=your-rebuilt-image node scripts/qa-release-render-image.mjs arm64
```

x86-64 使用 `amd64`。驗收在非 root、無網路、只讀根檔案系統的一次性容器中檢查真實 PDF、畫板畫素和 Office 轉換，不掛載使用者文件；預設 Docker 安全策略即可。生產部署另須驗證實際宿主，單個架構的成功不代表另一架構已驗證。

<a id="可选-sam-运行环境"></a>

## 可選 SAM 執行環境

預設映象不包含可用的 SAM2/PyTorch 執行環境、分割工作器或模型權重。PDF/Office 讀取不需要 SAM；分割是管理員獨立安裝的可選能力，AI 任務不會下載安裝。

使用精確的已批准 Doca 映象構建管理員自己的 Linux 執行映象。以 Bookworm Python 3.11 CPU 環境為例，獨立部署 Dockerfile 可寫為：

```dockerfile
ARG DOCA_IMAGE
FROM ${DOCA_IMAGE}
USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*
USER node
```

構建引數使用真實已批准的映象摘要，例如 `docker build --build-arg DOCA_IMAGE=docker.io/smartdoca/doca@sha256:YOUR_APPROVED_DIGEST -t doca-sam-runtime:local .`；示例不虛構具體摘要。必須在此 Linux 映象內、按其 CPU 架構和執行時相同的 `/opt/doca-segment` 路徑準備 Python 環境，不能複製 macOS venv。Linux/amd64 可按 [PyTorch 2.5.1 官方 CPU wheel 安裝說明](https://pytorch.org/get-started/previous-versions/#v251)安裝 torch 2.5.1、torchvision 0.20.1；其他架構須單獨核實可用 wheel 與 profile 版本事實。

管理員可信目錄包含對應發行版本的工作器、固定依賴、固定官方 SAM2 的無符號連結執行副本、預先提供的權重和嚴格 profile。所有路徑、版本及檔案/樹摘要都來自真實 Linux 環境，見 [Linux profile 生成步驟](ai-image-segmentation.md#linux-docker-profile)。目錄由管理員擁有，並允許容器 UID 1000 讀取；檔案及目錄不得由組或其他賬號寫入，模型無權選擇這些路徑。

使用 Docker Compose 2.24.4 或更新版本建立 `compose.segmentation.yaml`；`!reset` 移除基礎檔案的應用構建配置，避免覆蓋獨立構建的可信執行映象：

```yaml
services:
  doca:
    build: !reset null
    image: doca-sam-runtime:local
    pull_policy: never
    environment:
      DOCA_AI_IMAGE_SEGMENT_PROFILE: /opt/doca-segment/profile.json
    volumes:
      - type: bind
        source: /srv/doca-segment-linux
        target: /opt/doca-segment
        read_only: true
        bind:
          create_host_path: false
```

此掛載獨立於 `/data`、使用者上傳檔案和憑據，不能加入模型金鑰、QA 登入態或家人照片。只在 `.env` 填寫變數不會透過基礎 Compose 傳入，也不會替代掛載。先在不掛載應用資料庫的一次性容器中驗證 profile；非法配置拒絕啟動，執行檔案不可用或摘要不符時不開放工具。重建正式容器時須保留所有需要的 override：

```sh
docker compose -f compose.yaml -f compose.segmentation.yaml config --quiet
docker compose -f compose.yaml -f compose.segmentation.yaml up -d
```

安裝和摘要校驗不證明蒙版或圖片質量；每個候選、蒙版和交付仍須實際看圖及許可權/來源驗證。升級權重需要新的完整執行環境和 profile，並協調重啟，不轉換舊 profile 或持久蒙版。

<a id="构建隐私"></a>

## 構建隱私

`.dockerignore` 排除 `.cache`、`.local`、資料庫、環境檔案、測試及指令碼；排除不刪除本地檔案。執行環境包、權重、私有驗收產物和憑據應儲存在應用構建目錄之外。SAM 自定義映象使用獨立的最小構建目錄，僅放入批准的部署檔案。


Web 輸出還獨立拆為 CAD、字型、入口、8 個大檔案組（至少 512 KiB）和 16 個按穩定檔名分配的其餘程式碼組。Vite 內容雜湊導致的改名仍留在原組，部署路徑、位元組和許可權保持相同。真實編譯 Web 的 OCI 實驗在一次入口程式碼更新/改名後複用 27 層中的 25 層，新下載壓縮層共 334,554 位元組；真實 Vite CSS 重建還可複用 27 層中的 13 層，新層共 4,489,097 壓縮位元組（比舊整塊 Web 層少約 77.2%）；這些都是實測案例，每次實際更新量取決於改動，完整 Web 層有少量額外頭部開銷。詳見[分層核驗記錄](verification/image-web-layers-2026-10-23.md)。
