<a id="docker-document-renderers"></a>

# Dockerドキュメントレンダラー

[简体中文](docker-rendering.zh-CN.md)

再構築されたイメージは、WeasyPrint 70.0を使用してリッチテキスト/Markdown PDFをエクスポートし、Node、ネイティブCanvas、resvgを使用してAIキャンバスPNGを生成します。ChromiumやPlaywrightのランタイムは含まれておらず、ホストseccomp JSON、追加のブラウザ共有メモリ、またはブラウザユーザーネームスペースの設定も必要ありません。変更されたComposeファイルを使用する前に新しいイメージをビルドしてください。以前に公開されたイメージは自動的にこのレンダラーを利用できません。

PDFの閲覧、ページごとのテキスト/画像、編集可能なインポートには依然としてPDF.jsが使用されている。LibreOffice Writer、Calc、Impress、Mathでは視覚的変換が保持されている。 `.docx`, `.xlsx` そして `.pptx`CJKと解放フォントは残っています。公式数式、図表、埋め込み画像、長い表、CJKのページングを実際のエクスポートを通じて確認してください。健康チェックでは視覚的な忠実度を確認することはできません。

PDF作業では、固定されたPython環境が使用されます。 `DOCA_PDF_PYTHON=/opt/doca-pdf/bin/python`埋め込みデータリソースのみが許可され、ネットワークやホストファイルの読み込みは拒否されます。読み取れない/破損した画像やフォントは、不完全なPDFを返す代わりに失敗します。32 MiBの入力制限、2つのジョブの同時実行、60秒の締め切り、レンダリング後の許可再確認は引き続き有効です。キャンバスジョブでは、SDKエクスポーター、承認されたアセット、選択/クロップ、警告、キュー、キャンセル機能が保持されます。両方のレンダラーは、キャンセルや締め切りで終了する使い捨てプロセスで実行されます。

`DOCA_PDF_CHROMIUM` 明示的に拒否され、ブラウザのフォールバックはありません。既存の文書、データベース、添付ファイル、キー、ボリュームはそのまま保持されます。SDKの歴史的リーダーは、保存データの変換なしで既存のパスを維持します。ロールバックでは、前のコード、依存関係のロック、イメージ、デプロイ設定が復元され、その後の書き込みは保持されます。古いもの `docker/chromium-seccomp.*` ファイルは出所や旧レンダーダイナミクスの比較のためにのみ保持され、新しいデプロイでは省略されます。

<a id="image-size-and-update-downloads"></a>

## 画像のサイズと更新ダウンロード

ブラウザを削除するとスペースが節約されますが、Python/Pango/resvgは依存関係を追加します。LibreOffice、フォント、アプリケーションの依存関係、そしてWebアセットは残ります。同等のバージョン/アーキテクチャの圧縮層を比較してください。Docker Desktopのマルチアーキテクチャのローカル使用はダウンロード量の推定ではありません。

Webアセット、共通の依存関係、およびエディターは、別々のレイヤー、パス、権限を保持します。詳細は [レイヤー検証](verification/image-web-layers-2026-10-23.md).

<a id="container-verification"></a>

## コンテナ検証

```sh
DOCA_RELEASE_QA_IMAGE=your-rebuilt-image node scripts/qa-release-render-image.mjs arm64
```

使用する `amd64` x86-64向けです。これは、ネットワークを持たない、読み取り専用のルートを持つ、ユーザーディスクットがない、非ルートの一時使用可能コンテナ内で、実際のPDF出力、キャンバスピクセル、Office変換を実施するものです。Dockerのデフォルトセキュリティポリシーで十分です。実際のプロダクションホストを別途確認してください。1つのアーキテクチャが別のアーキテクチャの結果を保証するわけではありません。

<a id="optional-sam-runtime"></a>

## オプションのSAM実行環境

デフォルトのDocaイメージには、利用可能なSAM2/PyTorchランタイム、セグメンテーションワーカー、またはモデルウェイトが含まれていません。Core PDF/Office読み取りにはSAMは必要ありません。セグメンテーションの有効化は、AIタスクによって実行されるダウンロードではなく、管理者が操作する別のインストールプロセスです。

承認されたDocaリリースに基づく信頼できるカスタムイメージを使用し、事前構築されたランタイムに必要なインタプリタやシステムライブラリを追加します。Bookworm Python 3.11 CPUランタイムの場合、デプロイメントが所有するDockerfileには以下が含まれることがあります：

```dockerfile
ARG DOCA_IMAGE
FROM ${DOCA_IMAGE}
USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*
USER node
```

承認されたイメージダイジェストを使用して構築する、例えば `docker build --build-arg DOCA_IMAGE=docker.io/smartdoca/doca@sha256:YOUR_APPROVED_DIGEST -t doca-sam-runtime:local .`このダイジェストは管理者が選択したリリース情報であり、例ではその情報は提供されていません。Python環境を準備してください。 **このLinuxイメージの内部およびそのアーキテクチャについて**、同じく `/opt/doca-segment` 実行時に使用されるパスです。macOSの仮想環境をこれにコピーしてはいけません。Linux/amd64では、 [公式のCPUホイール命令](https://pytorch.org/get-started/previous-versions/#v251) PyTorch 2.5.1とtorchvision 0.20.1を提供する。他のアーキテクチャでは、別途検証された利用可能なwheelsと対応するプロファイルファクトが必要である。

信頼できるバンドルには、正確なリリースワーカー、ピンイン依存関係がインストールされたもの、ピンインされた公式SAM2パッケージのシンロリーフレンドリーな実行時コピー、事前準備されたチェックポイント、そして厳格なプロファイルが含まれなければならない。 **実際のLinuxのパス、バージョン、バイト/ツリーハッシュ**。参照してください [Linuxプロファイルの準備手順](ai-image-segmentation.md#linux-docker-profile) また、厳格なインストール/作業者契約も存在する。バンドルの管理者が所有し、コンテナのUID 1000が読み取り可能な状態に保つこと。ファイルやディレクトリは、グループや他のユーザーが書き込み可能になってはならない。モデルの入力は、それらのパスを選択したり変更したりすることはできない。

作成する `compose.segmentation.yaml` Docker Compose 2.24.4以降が必要です。 `!reset` 基本ファイルのアプリケーションビルドが、あなたが個別に作成した信頼できるランタイムイメージを上書きするのを防ぎます。

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

このマウントは独立している。 `/data`アップロードされた文書や証明書類。モデルキー、QA認証状態、家族写真はランタイムバンドルに入れないでください。変数の設定 `.env` 単独で、Base Composeファイルを通じてそれを転送したり、このマウントを提供したりしない。アプリケーションデータベースのない一時的なコンテナでインストールされたプロファイルを検証した後でそれを有効にする。構成が正しくないと起動に失敗し、利用できない/一致しない実行ファイルが工具を利用できなくなる。アプリケーションを再作成する際は、すべての意図されたオーバーライドを使用する。

```sh
docker compose -f compose.yaml -f compose.segmentation.yaml config --quiet
docker compose -f compose.yaml -f compose.segmentation.yaml up -d
```

実行時/ハッシュチェックは、マスクや最終イメージの品質ではなく、インストールの正当性を証明するものです。各候補者、マスク、配布には、現在の視覚的チェックや許可/ソースのバインドが依然として必要です。重量アップグレードには、新しい検証済み実行環境/プロファイルと協調的な再起動が必要であり、古いプロファイルや保持されたマスクは自動的に変換されません。

<a id="build-privacy"></a>

## プライバシーを保護する

`.dockerignore` 除外する `.cache`, `.local`アプリケーションビルドコンテキストからのデータベース、環境ファイル、テスト、スクリプト。デプロイ時の実行時バンドル、チェックポイント、プライベート受け入れアーティファクト、認証情報はそのコンテキスト外に保持する。排除処理ではローカルファイルは削除されない。SAMカスタムイメージのビルドでは、承認されたデプロイメントファイルのみを含む別の最小限のコンテキストを使用するべきである。


Web出力には、独立したCAD、フォント、エントリー層があり、さらに8つの大ファイルグループ（少なくとも512 KiB）と、安定したファイル名から割り当てられる16の小さなコードグループも存在する。チャンクのViteコンテンツハッシュの改名は、その既存のグループに保持される。デプロイされたパス、バイト数、権限は変わらない。実際のコンパイルされたWeb OCI実験では、1回のエントリーチャンクの更新/改名後に27層のうち25層を再利用し、334,554バイトの圧縮バイトが追加された。実際のVite CSSの再構築では、27層のうち13層を再利用し、4,489,097バイトの圧縮バイトが追加された（前の全Web層より約77.2%少ない）。これらは測定されたケースであり、更新ごとに固定のサイズではない。全Web層にはわずかな追加ヘッダーコストがある。詳細は… [レビューされた層の証拠](verification/image-web-layers-2026-10-23.md).
