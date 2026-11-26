<a id="deploy-doca"></a>

# Docaを展開する

TauriデスクトップパッケージにはWebフロントエンドが含まれており、デスクトップ認可ルートを利用して別途配備されたホストに接続します。Nodeホストは含まれていません。各OS/アーキテクチャパッケージは独立してビルドし、検証します。詳細は [デスクトップクライアント](desktop-client.ja.md).

[中文](deployment.zh-CN.md)

1台のサーバーで、指定されたイメージを実行できます。 `compose.yaml` メインでは、1つのコンテナでSQLiteを使用し、PostgreSQLやRedisは不要です。複数のアプリケーションレプリカを実行する場合にのみ、これらを使用してください。 [単一インスタンスと水平スケーリング](horizontal-scaling.ja.md).

<a id="requirements"></a>

## 要件

- Docker EngineとDocker Composeプラグイン。
- ユーザーがアクセスできるHTTP(S)オリジン。公開されたHTTPSにはDNSとTLS証明書が必要ですが、信頼された内部HTTPもサポートされています。
- コンテナと同じマシン上にリバースプロキシを設置する。ComposeはDocaのみを公開する。 `127.0.0.1:39120`.

プロキシはHTTPとWebSocketパスを転送しなければならない `/api/v1/ws`元のままにしておく。 `Host` ヘッダー。

<a id="files"></a>

## ファイル

メインからデプロイファイルをクローンするか、転送する [GitHubアクセスがないサーバーのためのデプロイバンドル](deployment-without-github.ja.md)ビジネスサーバーにはソースチェックアウトは不要です。再構築されたイメージには含まれています。 `docker/admin.sh`起動後、実行する `docker compose exec doca bash docker/admin.sh bootstrap`、または使用する `reset-password` 既存のアドミニストレターをリセットする。ホストラッパースクリプトは既存のエントリポイントを保持する。新しいレンダラーはホストseccomp JSONを必要としない。パッカーは、編集可能なorigin/key値を持つスタンドアロンな新しいインストールYAMLも生成する。これらの変更には再構築されたイメージが必要であり、変更されていない既存の公開イメージと直接使用することはできない。

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
cp docker.env.example .env
```

編集 `.env` 最初の起動前に。

<a id="required-settings"></a>

## 必要な設定

ファイルストレージも必要です `DOCA_FILE_STORE_ID` そして `DOCA_FILE_STORES_JSON`、提供されている通り `docker.env.example`. サーバー内のパスと認証情報は環境から読み取られる。管理ページは読み取り専用である。詳細はこちらを参照。 [ファイルストレージ](storage.ja.md).

現在のホストは生成を使用している `doca-2026-10-12-book-payload-storage-v1`スタートアップは自動的に0.1.22版のデータベースを整列します。 `doca-2026-10-09-history-storage-v1` 現在のDDLレビュー/調整を通じて新しい世代が記録される。SQLブックの結果を含む、すべての古い行は保持される。何の変換、クリーンアップ、または古い体アダプターも追加されない。残存する古いブック記録は手動で処理が必要になる可能性がある。既存の0.1.23オブジェクトデータは保持される。詳細は [データベース構造の進化](database-schema-evolution.ja.md) そして [現在のリリース要件](releases/0.3.0.ja.md)正確な0.1.13のベースライン `doca-2026-10-08-knowledge-books-v2` 以下の明示的な歴史アップグレードがまだ必要です。データベース、プライベートオブジェクト、設定、および元の認証マスターキーを保持してください。

`DOCA_ORIGIN` ブラウザでオリジンを入力する。HTTPとHTTPSが受け入れられ、実際の運用でも同様です。サブパス、クエリ、フラグメントを含まないオリジンのみを使用し、ルートのトレーリングスラッシュは正規化されます。

```text
DOCA_ORIGIN=https://docs.example.com
```

Dockerの例にはすでに必要なファイルストレージの値が含まれています。新しい単一サーバーの場合は、originを変更し、キーを生成してください。 `openssl rand -hex 32`、そして公開サンプルを置き換える `DOCA_CREDENTIAL_MASTER_KEY`プラグインがなくてもキーが必要です。既存のデプロイは元のキーを保持する必要があります。ファイルストレージの値を保持してください。PostgreSQLとRedisは条件付きです。詳細は [設定](configuration.ja.md) デフォルト設定、S3フィールド、および別々のWebhook/AIストレージの場合です。

<a id="start"></a>

## 始める

0.1.26でプラグインストレージを1に変更 [共有ビジネスデータベース](plugin-database-isolation.ja.md)コアから分離されている。0.1.25では、すべてのインスタンスを停止する前に通常、すべての外部ビジネスプラグインをアンインストールする。プライベートビジネス記録、認証情報、オブジェクトは移行せずに破棄される。コアデータと通常のファイルは残る。不要なプラグインごとの設定を削除し、PostgreSQLデータベース/アカウントを一度だけ設定する（SQLiteは自動で処理される）。その後、プラグインを再インストールし、再設定する。参照 [0.1.26アップグレード要件](releases/0.1.26.md).

更新する前に、すべての古いホストを停止し、データベースをバックアップしてください。0.1.22スキーマは、現在の起動時に自動的に適合し、既存のビジネス行はすべて保持されます。手動でのブックコマンドは不要です。保持されたSQLブックの結果はネイティブオブジェクト形式には適合していません。残りの記録は必要に応じて手動で処理してください。利用可能な結果として保持するためには、既存のオプションを実行してください。 [無損失変換](knowledge-book-storage-verification.ja.md) 最初の起動前に。以前のバージョンでは、以下のような歴史アップグレードを先に完了させてください。すべてのホストとウェブインスタンスを一緒に更新します。

<a id="upgrade-from-0113"></a>

### 0.1.13からアップグレード

すべてのDocaインスタンスを停止し、データベース（SQLite WALを含む）、ファイルストレージ、設定をバックアップする。元の状態を保つ。 `DOCA_CREDENTIAL_MASTER_KEY`現在のメインデプロイファイルとそれに対応するイメージを使用します。それをダウンロードし、既存のデプロイ環境でオフラインメンテナンスコンテナを実行します。

```sh
docker compose stop
docker compose pull
docker compose run --rm --no-deps doca node --import tsx apps/server/src/bootstrap/history-storage.ts upgrade --apply
```

ただ、 `doca-2026-10-08-knowledge-books-v2` 受け入れられます。このコマンドはデータベースを作成したりリセットしたりしません。トランザクションでは、すべての元のスナップショットバイトを保持しながら、履歴アーカイブテーブルやタスクが追加されます。新しいホストが起動した後、最新の20個の完全なスナップショットがデータベースに残ります。古いスナップショット10個ごとに、最新のもののみがファイルストレージに保存され、残りの9個は書き込み/読み取りの検証後に削除され、アプリケーションから復元することはできません。ストレージ障害が発生しても、元のグループ全体が保持されます。履歴は一つのリストとして表示され、不完全なグループはデータベースに残ります。詳細は [歴史データの保存とロールバック](storage.ja.md#history-storage-and-offline-upgrade).

コマンドはまず記録します `doca-2026-10-09-history-storage-v1`現在の起動時に、承認された構造的アライメントを適用する `doca-2026-10-12-book-payload-storage-v1`直接の履歴ロールバックコマンドは、履歴保存の世代または中断されたロールバックマーカーのみを受け付けるため、現在のホストで既に整列されたデータベースを元に戻すことはできません。詳細は [歴史維持の制限](storage.ja.md#history-storage-and-offline-upgrade) そして [ブックストレージの復元](knowledge-book-storage-verification.ja.md) ロールバックが行われる前に。後からの書き込みや保持されたファイルのバイトを保持する必要がある。サンプリングによる履歴の削除には、アップグレード前のバックアップが必要だ。古いイメージを直接新しいデータベースに接続させてはならない。

```sh
docker compose pull
docker compose up -d
```

`docker compose up -d` 指定された画像を引き出す `compose.yaml`加える `--build` このチェックアウトから作られた画像が欲しいときだけです。

容器を確認してください。

```sh
docker compose ps
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

置き換える `docs.example.com` 設定されたオリジンにあるホストを使用し、非標準の場合はそのポートも含まれます。内蔵されたコンテナプローブはすでにこのホストを提供しています。待ちます。 `docker compose ps` 示すため `healthy`bare loopback curlは421で拒否される。

健全なプロセスが戻る `status: "ok"` そして実際の画像版は `version`.

ドキュメントレンダリングにもデプロイチェックが必要です：このチェックアウトではLibreOfficeとサンドボックス化されたChromiumが追加され、オプションのSAMでは別の信頼できるLinux実行環境が必要です。詳細は [Dockerドキュメントレンダラー](docker-rendering.ja.md) コンポーネントの利用可能性については、含まれているChromiumのseccompポリシーと明示的なSAMマウントが必要です。健全なサーバーだけでは、これらのツールを確認することはできません。

SQLite、アップロードされたファイル、そしてAIデータベースが保存されています。 `doca_data` ボリューム。最初の起動時にはデータベースは空である必要があります。空でないデータベースはサポートされている互換性生成方式を使用しなければなりません。レビューされた追加変更は自動的に調整されますが、破壊的または意味論的な違いは報告されてレビューされます。すでにユーザーが含まれているデータベースを削除しないでください。

<a id="reverse-proxy"></a>

## リバースプロキシ

同じホスト上のCaddyやNginxでTLSを終了し、転送する `127.0.0.1:39120`.

```caddyfile
docs.example.com {
	reverse_proxy 127.0.0.1:39120
}
```

CaddyプロキシはデフォルトでWebSocketアップグレードをサポートします。Nginxサーバーが必要です。 `Upgrade` そして `Connection` ヘッダーを表示する `/api/v1/ws`.

`DOCA_TRUST_PROXY` デフォルトでは空です：ループバックからの接続を含む、転送されたヘッダーはすべて信頼されません。監査や制限を保つためにクライアントのIPを保持するには、アプリケーションが実際に見るプロキシのIP/CIDRのみを設定します。Dockerブリッジを使用すると、ホストのプロキシがブリッジゲートウェイとして表示されることがあります。 `127.0.0.1`この値を選択する前に、デプロイネットワークを確認してください。そうしないと、プロキシされたユーザーがプロキシIP割り当てを共有する可能性があります。

他のマシン上のロードバランサーがこのホストに接続する場合、プライベートインターフェース上でコンテナポートを公開し、ループバックのみではなく、設定をする。 `DOCA_TRUST_PROXY` そのロードバランサーのIP範囲に。公共インターネットを信頼してはいけない。

信頼できる内部HTTPサイトの場合は、設定する `DOCA_ORIGIN=http://doca.internal` そのアドレスをHTTPリバースプロキシを通じてサービスします。また、コンテナポートを選択したプライベートインターフェース上で公開し、そのポートをOriginに含めることもできます。提供されるComposeマッピングはloopbackのみに適用されます。開発モードでのオーバーライドは不要です。プロダクションモードを維持してください。HTTPサポートはHostやOriginの検証を変更しません。

<a id="create-the-administrator"></a>

## 管理者を作成する

デフォルトのアカウントやパスワードはありません。コンテナが正常になった後、以下のディレクトリでこのコマンドを実行してください。 `compose.yaml`:

```sh
bash scripts/bootstrap-admin.sh
```

スクリプトはログイン情報とパスワードを要求します。パスワードは少なくとも12文字でなければなりません。このパスワードは、そのコンテナコマンドにのみ渡されます。データベースにはハッシュが保存されます。管理者が既に存在する場合、コマンドは停止し、現在のパスワードを変更しません。

<a id="change-a-password"></a>

## パスワードを変更する

ログインしたユーザーが開く `#/account` そして選ぶ **パスワードを変更する**新しいパスワードは少なくとも12文字以上でなければなりません。保存された後、そのアカウントのすべてのセッションがログアウトされます。

管理者がログインできない場合は、デプロイディレクトリから既存のアカウントをリセットしてください。

```sh
bash scripts/reset-admin-password.sh
```

これはアカウントを作成するものではなく、HTTP経由では利用できません。データベースファイルがロックされている場合は、実行してください。 `docker compose stop`パスワードをリセットし、その後 `docker compose up -d`ログイン情報やパスワードを書き込まないでください。 `.env`.

<a id="static-assets"></a>

## 静的アセット

HTMLページとAPIはそのまま残ります `DOCA_ORIGIN`. `DOCA_ASSET_BASE` 変更のみ `/assets/...` そのHTML内のURLs。

サーバーがBrotliを交渉する`br`）、gzip、または元のバイト数を使用して `Accept-Encoding` そして送信する `Vary: Accept-Encoding`URLやビルドファイルは、既存のビルドディレクトリを含めて変更されません。HTMLアセットのURLは圧縮前に再生成されます。サーバーは、プロセスごとに32MiBの制限されたキャッシュを使用してエンコードされた公開の静的リソースを保存します。画像に圧縮コピーを追加したり、この方法でプライベートなAPI/ファイルのレスポンスを圧縮したりすることはありません。プロキシ/CDNはエンコーディングの交渉を保持する必要があります。 `Vary`または、圧縮処理を自分で行うこともできます。これはブラウザの転送に影響します。Dockerは独自のイメージ層圧縮とキャッシュを使用します。

建設されたもの `/cad/` ワーカーファイルとWASMは同じエンコーディング交渉を使用し、保持される `no-cache` なぜなら、その名前がハッシュ化されていないからです。宣言されたCADアセット外のパスは利用できません。

JavaScript、CSS、およびコンテナ内の他のビルド済みファイルを使用するには、無設定のままにしておきます。 `/assets`設定する際は、userinfo、query、hash、またはトレイリングスラッシュのないHTTP(S)プレフィックスを使用してください。

```text
DOCA_ASSET_BASE=https://cdn.example.com/doca/0.1.11
```

参照されたページ `/assets/index-abc.js` そして読み込みます：

```text
https://cdn.example.com/doca/0.1.11/assets/index-abc.js
```

全体を公開する `apps/web/dist/assets` そのプレフィックスのディレクトリを保持し、 `assets` パスセグメント。ファイル名にはコンテンツハッシュが含まれており、同じ画像内のHTMLと一致する必要があります。APIリクエストはそのまま保持されます。 `DOCA_ORIGIN`.

「An official tag such as」といった公式タグ `v1.2.3` ウェブアプリを構築し、接続する `doca-web-assets-v1.2.3.tar.gz` GitHubリリースに。それを抽出し、保持しておく。 `assets` ディレクトリを設置し、そのディレクトリをESモジュール用のクロスオリジンヘッダーを送信するCDNに配置してください。使用しないでください。 `github.com/.../releases/download` URLとして `DOCA_ASSET_BASE`推進のため `main`、またはプレリリースタグなど `v1.2.3-rc.1`、そのリリースを生み出しません。

容器は自分自身を保つ `/assets` ファイル。スタイルシートから参照されるフォントや画像は、ルートパスを持つものでも依然としてDocaから読み込まれます。

`index.html` 送られてきます `Cache-Control: no-cache`ですから、リリース後に新たな訪問を行うと新しいページが表示されます。ハッシュ化されたファイルは… `/assets/` 送られてきます `Cache-Control: public, max-age=31536000, immutable`内容が変わると名前も変わるため、1年間のキャッシュでは新しいHTMLが読み込まれた後、古いスクリプトは保持されない。CDNが前にある場合 `DOCA_ASSET_BASE` ハッシュ化されたファイルには同じ長さのキャッシュが必要です。

<a id="configure-static-cdn-response-headers"></a>

### 静的CDN応答ヘッダーを設定する

`DOCA_ASSET_BASE` URLを変更するだけで、CDNの設定は行いません。アップロードされたS3ビルドオブジェクトを…に設定してください。 `Cache-Control: public, max-age=31536000, immutable` そしてContent-Typeを保持する（`text/javascript` JSのためには、 `text/css` CSS用です。メタデータを変更せずに既存のオブジェクトをカバーするため、CloudFrontを接続します。 **レスポンスヘッダーポリシー** 静的にのみ `*/assets/*` 動作：Cache-Controlを追加する **カスタムヘッダー** と共に **オーバーライド**クロスオリジンESモジュールも必要です `Access-Control-Allow-Origin: https://doca.example.com`; これらの公開のビルドファイルを使用できます `*` 認証情報なしで。このポリシーをHTML、API、またはプライベートファイルに添付しないでください。

静的ハッシュファイルを設定する **キャッシュポリシー** 別途：最小TTLは0、デフォルト/最大TTLは31536000秒。応答ヘッダーのポリシーはエッジTTLではなくブラウザヘッダーを変更する。詳細は [AWSレスポンスヘッダーポリシー](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)新しいファイル名を公開し、既に開いているページでの後続のデータ読み込みのために、古いリリースを保持する。

静的Nginx CDNは、標準的な方法でリリースディレクトリを以下のように提供できます。 `mime.types` サーバーによってロードされました：

```nginx
location /doca/0.2.12/assets/ {
    alias /srv/doca/0.2.12/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "https://doca.example.com";
}
```

Docaをプロキシする時 `/assets/`既存のoriginヘッダーを隠す `proxy_hide_header Cache-Control;` 代替品を追加する前に。例では省略されている。 `always` そのため、欠落したファイルは1年間の404キャッシュを受け取れません。最終的なCDNの応答を確認してください。

```sh
curl -I https://cdn.example.com/doca/0.2.12/assets/<actual-hashed-JS-filename>.js
```

Cache-Control、Content-Type、CORSを確認してください。HTMLは再検証のためにDocaに保持されます。ドキュメント画像や保護されたファイルについては、使用してください。 [ストレージ：ブラウザの画像キャッシュとファイルCDN](storage.ja.md#browser-image-caching-and-the-file-cdn).

<a id="knowledge-book-payload-conversion"></a>

## 知識ブックペイロードの変換

0.1.25は、通常のスキーマ比較を通じてサポートされている旧世代を整列させ、自動的なブックのクリーンアップや実行時ボディアダプターなしですべてのビジネスデータを保持します。既存のターゲット世代オブジェクトは変更されません。既存の [オプションの無損失処理](knowledge-book-storage-verification.ja.md) 古いSQL結果が引き続き使用可能であるため、最初の起動前に実行する必要があります。中断された変換作業では、元のマニフェストが必要です。バックアップを復元する際には、すべてのデータと後続の書き込みを保持し、すべてのホストとウェブ構築を一緒に更新します。
