<a id="development-deployment-and-checks"></a>

# 開発、デプロイ、チェック

[中文](development.zh-CN.md)

<a id="plan-a-change"></a>

## 変更を計画する

使ってください [階層式SDDワークフロー](sdd.ja.md) 新しい仕事のため、そして [モジュールインデックス](sdd-module-index.ja.md) 出所、現在の契約、チェックを確認する。完全な変更にはSpec Kitレコードを使用し、標準作業では1つのSpecを使用でき、軽微な変更ではPRレコードを使用する。互換性に関する決定には、依然としてAGENTS.md内の別途の事前合意が必要である。実行する。 `pnpm sdd:check` 変更に関連するチェックと共に。

<a id="start-locally"></a>

## ローカルで開始する

Node.js 22.12以降、またはNode.js 24 LTS、そしてpnpm 11.25.0が必要です。バージョンは固定されています。 `pnpm-lock.yaml`。 それ `better-sqlite3` ネイティブビルドは許可されています `pnpm-workspace.yaml`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set the storage root in .env to an absolute writable local directory.
pnpm dev
```

Open http://127.0.0.1:39130. APIは39120でリスニングしており、開発サーバーが同じオリジンでプロキシを行います。39120を直接開くか、使用する `localhost` 代わりに `127.0.0.1`、設定と一致しません。

コピー `.env.example` 開始前：file-store変数が必要です。そのストレージルートは `/data/storage` Dockerの場合、ソースから実行する前に、ルートを自分のマシン上の絶対に書き込み可能なディレクトリに設定してください。ローカルなオリジンとSQLiteのパスはそのままにし、秘密情報は決してコミットしないでください。

`DOCA_CREDENTIAL_MASTER_KEY` プラグインなしの開発も含め、必要です。新しいデータベースの場合は、public example値を置き換えてください。 `openssl rand -hex 32` 出力。再起動時も同じキーを保持し、別途バックアップする。既存のデータベースは元のキーを保持しなければならない。

<a id="pdf-rendering-for-source-development"></a>

## ソース開発のためのPDFレンダリング

リッチテキストとMarkdownのPDFエクスポートには、一時的なPythonプロセスでWeasyPrint 70.0が使用されます。Python 3.10+とPangoをインストールし、その後、固定された依存関係をインストールしてください。

```sh
python3 -m venv .local/pdf-renderer
.local/pdf-renderer/bin/pip install -r docker/pdf-requirements.txt
export DOCA_PDF_PYTHON="$PWD/.local/pdf-renderer/bin/python"
```

macOSでは、Pangoを以下のようにインストールします。 `brew install pango`ライブラリの検出が必要なら、設定する `DYLD_FALLBACK_LIBRARY_PATH` 〜に `$(brew --prefix)/lib`Debian/Ubuntuでは必要です。 `python3-venv`, `libpango-1.0-0`, `libpangoft2-1.0-0` そして `libharfbuzz-subset0`Dockerfileではこれらの依存関係がインストールされます。 `DOCA_PDF_CHROMIUM` 既に時代遅れであり、明確に拒否されている。起動前に削除してください。ブラウザでの代替手段はありません。

AIキャンバス画像は、インストールされたCanvas SDKのSVGエクスポーターを、ネイティブのテキスト測定機能を持つ孤立したNode DOMで使用し、その後resvgラスタリゼーションとバンドルされたCJKフォントを使用します。実行する `pnpm build:canvas-render` 依存関係が変更された後でも、PDFの読み込み/インポートにはPDF.jsが使用され続け、Officeへの変換には依然としてLibreOfficeが使用されます。

`playwright-core` これはブラウザの対応に関する開発依存項目に過ぎません。そのブラウザをインストールしてください。 `pnpm exec playwright-core install chromium`、または設定する `DOCA_QA_BROWSER` ためには `scripts/qa-document-pdf.mts`孤立したエクスポート/再インポートと視覚的回帰のためにそのスクリプトを実行し、アーティファクトはそこに含まれる `artifacts/verification/document-pdf/` （オーバーライドする） `DOCA_QA_OUTPUT` 下に、/ の下で `artifacts/`). ユーザーデータは開かれていません。ご確認ください [ファイル交換](editor-file-exchange-contract.ja.md#rendered-pdf-and-editable-import).

<a id="create-the-administrator"></a>

## 管理者を作成する

デフォルトのアカウントはありません。プロジェクトディレクトリ内で：

```sh
bash scripts/bootstrap-admin-local.sh
```

このスクリプトは、ログイン情報とパスワードをそのコマンドにのみ渡します。データベースにはハッシュが保存されます。

コンテナデプロイが進行中です [Docaを展開する](deployment.ja.md)リバースプロキシを含む `DOCA_ORIGIN`最初の管理者、およびパスワードのリセット。

<a id="reset-an-administrator-password"></a>

## アドミニストレーターのパスワードをリセットする

管理者がまだ認証された電話番号やメールアドレスを持っている場合は、ログインページのコードを使用してください。そうでない場合は、デプロイ機械上のローカルリカバリコマンドを使用してください。このコマンドは既存の管理者のみを認め、新しい管理者を作成することはできず、HTTP経由でも公開されません。

```zsh
read "DOCA_RESET_ADMIN_LOGIN?Administrator login: "
read -s "DOCA_RESET_ADMIN_PASSWORD?New password (at least 12 characters): "
export DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
pnpm admin:reset-password
unset DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
```

このコマンドは、アカウントが有効な管理者であることを確認し、パスワードを更新し、すべてのセッションを無効にします。PostgreSQLには必要です。 `DOCA_DATABASE_URL` 同じ環境で。SQLiteは使用する。 `DOCA_SQLITE_PATH`回復の秘密を書き込まないでください。 `.env`シェル履歴、またはイメージ。

<a id="configuration"></a>

## 設定

| 変数 | デフォルト | 目的 |
| --- | --- | --- |
| DOCA_ORIGIN | http://127.0.0.1:39130 | プロダクションでは、HTTP(S)のみがサポートされています。 |
| DOCA_HOST | 127.0.0.1 | バインドアドレス |
| DOCA_PORT | 39120 | APIと公開されたサーバーポート |
| DOCA_WEB_PORT | 39130 | デヴウェブポート |
| DOCA_DATABASE | sqlite | sqlite または postgres |
| DOCA_SQLITE_PATH | ./data/v1/doca.db | 現在のデータベースファイル |
| DOCA_DATABASE_URL | なし | 設定されたデータベースのPostgreSQL URL |
| DOCA_BOOK_BATCH_CHECKPOINTS | 〜の上で | オン/オフのみ；オフではバッチリカバリが無効になり、保存されたチェックポイントとオブジェクトが保持される |
| NODE_ENV | 解除 | プロダクションではビルド済みアセットを使用し、開発を無効化する |
| DOCA_ASSET_BASE | 空の | ビルド済みアセットのHTTP(S)プレフィックス。空の場合は何も表示しない。 `/assets` 局所的に |

<a id="static-asset-urls"></a>

## 静的アセットのURL

生産されるHTMLは常にDocaから来ており、APIも同じオリジンを使用しています。 `DOCA_ASSET_BASE` 単に書き直すだけ `/assets/...` HTML内のURL。

設定されていない場合、コンテナはJS、CSS、その他のビルドファイルを提供します。 `/assets`設定されると、そのHTML URLはプレフィックスを使用します。例えば `https://cdn.example.com/doca/0.1.10/assets/index-abc.js`プレフィックスは、userinfo、query、hashのないHTTP(S) URLです。公開サイトの場合はHTTPSを、信頼できる内部ネットワークの場合はHTTPを使用します。 `/assets` コンテナ内に残ります。ルートパスを持つCSSで参照されるフォントや画像は、依然としてDocaに戻ります。

「An official tag such as」といった公式タグ `v1.2.3` GitHub ActionsがWebアプリケーションをビルドし、リリースを作成する。添付ファイルは `doca-web-assets-v1.2.3.tar.gz`。保持しておく `assets` 解凍後のディレクトリを設定する `DOCA_ASSET_BASE` それを含むHTTP(S)プレフィックスに。例えば、プレリリースタグのようなものです。 `v1.2.3-rc.1` リリースを生成しない。Pushを… `main` どちらもダメです。使わないでください。 `github.com/.../releases/download` 〜のように `DOCA_ASSET_BASE`そのURLはリダイレクトするが、ESモジュールに対してクロスオリジンヘッダーを送信しない。解凍済みの状態にする。 `assets` クロスオリジンスクリプトの読み取りが可能なCDNやオブジェクトストレージ上のディレクトリ。

<a id="production-process"></a>

## 生産プロセス

```sh
pnpm check
NODE_ENV=production DOCA_ORIGIN=https://docs.example.com pnpm start
```

`check` 型チェック、テスト、およびウェブビルドを実行します。 `start` Viteなしで、ビルドされたWebアプリケーションとAPIにサービスを提供する。例の名前を変更し、リバースプロキシでTLSを終了し、HostとOriginを保持し、転送する。 `DOCA_PORT`.

サーバーは任意のものを信頼しない `X-Forwarded-*` ヘッダー。ループバックを含むプロキシは、デフォルトで信頼されません。設定してください。 `DOCA_TRUST_PROXY` 実際のプロキシIP/CIDRのみに適用されます。認証レート制限では接続IPが使用されるため、1つのプロキシの背後にあるユーザーが割当量を共有できます。実運用用プロキシは信頼できるものとして設定する必要があります。オンにしないでください。 `trustProxy` 公共インターネットのために。

<a id="ai-job-logs"></a>

## AIの作業ログ

プロダクションコンテナは、FastifyのアクセスログやバックグラウンドAIジョブのエラーをstdoutに書き出します。

```sh
docker compose ps
docker compose logs -f --tail=200 doca
```

AIの失敗を防ぐために：

```sh
docker compose logs --since=30m doca | grep -E "AI job failed|AI 工作流|模型|图片"
```

Dockerだけで、置き換えます `doca` コンテナ名を使って。Kubernetesでは、podのstdoutを読みます。 `kubectl logs`ブラウザセッションAPIが返す `jobs[].id`, `jobs[].status`、そして `jobs[].error`そのジョブIDと一致させてください。 `AI job failed`ログには編集されたエラークラスが記録されています。モデルのキーや完全なプロンプトは表示されません。

これは実行可能な開発ベースラインであり、完成した生産環境の受け入れではありません。アカウントの復元機能が実装されており、連絡による復元のための設定された検証ゲートウェイが必要です。OIDCプロバイダとしての機能は利用できません。ターゲットインフラの監視や大規模クエリの調整には、別途受け入れが必要です。公開中です。 [モニタリングサービス](plugin-monitoring.ja.md) 実装されています。外部のOIDCやソーシャルサインインアダプターも存在します。ライブ認証情報もあります。 [認証](authentication.ja.md)境界線があります [建築](architecture.ja.md).

<a id="data-protection"></a>

## データ保護

- 空のデータベースは現在のターゲットから作成され、既存のデータベースは起動時にレビューされた追加内容を受け取る。デフォルトのSQLiteパスは `data/v1/doca.db`.
- 静的ファイルのみです `apps/web/dist`. `.archive`, `data`、そして `.env` 公開されていない。
- スタートアップは、既存の構造と現在の目標を調整します。レビューや検証に失敗した場合、サーバーはリスニングしないため、アップグレード処理は元に戻されます。本番運用前にバックアップと復元テストを行ってください。
- オフラインでのSQLiteバックアップは、すべてのライターを停止し、その後全ディレクトリをコピーします。オンラインバックアップではバックアップAPIを使用します。メインファイルをコピーし、WALをスキップするのはバックアップではありません。
- PostgreSQLは独自のバックアップと復元機能を利用する。災害復旧は運用者の役割である。
- SIGINTとSIGTERMによってHTTP、Vite、およびデータベースが終了します。プロダクション環境ではプロセスマネージャーを使って再起動します。

<a id="database-changes"></a>

## データベースの変更

読んで、フォローしてください [データベースアップグレード契約](database-schema-evolution.ja.md) コア構造や保持されているフォーマットを変更する前に。これが現在進行中のプロジェクトの標準です：新たな作成やアップグレードでは最新のDDLを使用します。 `schemaEvolution` 合意された追加内容を宣言し、通常の追加は互換性のある生成を維持する。歴史的なフィールド値や意味論的/破壊的な変更には、具体的な合意された保存、検証、復元計画が必要である。 [AGENTS.md](../AGENTS.md).

データベースの変更には、分離されたSQLiteとPostgreSQL 17/18の旧スキーマのレグレッションが必要であり、保持された行、デフォルト設定、部分的な書き込みなしの繰り返し/同時起動とレビューが含まれます。リリース承認では、影響を受けた実際にリリースされた旧バージョンで作成されたデータベースもアップグレードされます。PostgreSQL CIマトリックスは `.github/workflows/database-upgrade.yml`これはデフォルトのスイートを補完するものです。契約書やアップグレードの注意事項に、合意された動作やサポートに関する変更点を記載してください。

<a id="checks"></a>

## チェック

共同編集の作業が始まります `skills/doca-collaboration/SKILL.md`. `AGENTS.md` 適用される時期。インターフェース言語は `docs/i18n.md`.

`docs/collaboration-sdk-contract.md` 契約の源泉です。スキルを公開することで更新されます。 `references/contract.md`契約に提案されているAPIは、現在のパッケージに既に含まれているものではない。パッケージが更新された後、新しいアーティファクトをインストールし、エクスポートやスキーマを確認し、保存の確認、再接続、既存データの復元、ライブ選択機能を確認する必要がある。バージョン番号を変更するだけでは不十分である。

```sh
pnpm typecheck
pnpm test
pnpm build
```

`tests/cloud.test.ts` 一時的なSQLiteデータベースと一時的なアカウントを使用し、そのディレクトリを削除します。実際のユーザーデータベースには影響しません。

カバレッジには、管理者を含むプライベート隔離、公共読み取り、継承と隠された祖先、バージョン衝突、所有権の移転、ツリーサイクル、移動によるグローバリゼーションのリセット、バッチ復元、独立したコピー、コメント権限、イデメトン反応、通知隔離、ホストとオリジン、登録と無効化、セッションの取り消し、再起動時の永続性、およびOpenAPIルートが含まれます。

ログイン、ホーム、検索から文書を開く、記録の閲覧、管理統計がローカルブラウザで確認されました。ケース別のブラウザや孤立したPostgreSQL 17/18のチェックが記録されています。 [検証記録](verification/README.md)完全なブラウザ対応、ターゲットインフラとしてのPostgreSQL、キーボードアクセシビリティ、プロキシのレート制限、負荷、および長時間実行の受け入れ性は依然として必要です。SQLiteを使用してもこれらは代替されません。
