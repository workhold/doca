<a id="quick-start"></a>

# すぐに始める

[中文](quickstart.zh-CN.md)

このガイドでは、compose.yamlで指定されたイメージをメインサーバー、SQLite、ローカルファイルストレージにインストールします。Git、Docker Engine、Docker Composeプラグイン、そしてサーバーを指すドメインが必要です。そのサーバー上のリバースプロキシを使ってHTTPSまたは信頼できる内部HTTPを提供できます。イメージを実行する際にはNode.jsやpnpmは必要ありません。

これは新しいインストールです。既存のデプロイは読み取る必要があります。 [リリース要件](releases/0.2.38.md) 第一に、サポートされている互換性世代内で追加変更やアップグレードが自動的に行われるが、互換性のないベースラインやセマンティック変更は別途処理が必要である。既存のデータベース、ファイル、設定を保持する。

サーバーがGitHubに接続できない場合は、ソースをクローンせずにComposeや環境例、セキュリティポリシー、管理者スクリプトを転送してください。 [GitHubアクセス権なしでデプロイする](deployment-without-github.ja.md) コピー可能なComposeのために `.env` ファイル、オフライン画像配信、および初期化。

<a id="_1-clone-the-repository"></a>
<a id="1-clone-the-repository"></a>

## 1. リポジトリをクローンする

メインをクローンして、現在のComposeファイルと管理者スクリプトを一緒に取得する：

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
```

<a id="_2-configure-env"></a>
<a id="2-configure-env"></a>

## 2. .envファイルの設定を行う

```sh
cp docker.env.example .env
```

新しいインストールの場合は、まず認証マスターキーを生成してください。

```sh
openssl rand -hex 32
```

出力は、64個の16進数文字でエンコードされた32バイトのランダムデータです。編集 `.env`例のドメインを自分のHTTP(S)オリジンに置き換えて `DOCA_CREDENTIAL_MASTER_KEY` 生成された値で：

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_CREDENTIAL_MASTER_KEY=7a52d29ab6db9a08292b9585d0dc5551f4156c2d02953b4262611bc1ad82f9ab
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

`DOCA_CREDENTIAL_MASTER_KEY` プラグインがなくても起動時に必要です。欠落した、空の、または構造が正しくない値は起動を拒否します。例ファイルには公開された、正しくフォーマットされたサンプルが含まれています。新しいインストールのために自分のキーに置き換えてください。安全かつ別途バックアップし、複製や再起動で同じ値を使用してください。既存のデプロイメントは元のキーを保持する必要があります。アップグレードのために再生成しないでください。代替キーはデータベースフィンガープリントチェックによって拒否されます。既存の暗号化データは自動的に変換されません。詳細は [管理された認証情報](plugin-credentials.ja.md).

サブパスやクエリ、断片を含まず、オリジンのみを使用する。ルートのトレーリングスラッシュは正規化される。保持する `/data/storage` コンテナの永続ボリューム内に。 `docker.env.example` Docker用です。 `.env.example` は、～のためです [ソース開発](development.ja.md).

同じサーバー上でリバースプロキシを設定します。例えば、Caddyを使う場合は：

```caddyfile
doca.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

CaddyはTLSを終了し、HTTPやWebSocketのトラフィックを転送します。DNSはこのサーバーを指す必要があり、プロキシはその証明書を取得できる必要があります。他のプロキシは保持しなければなりません。 `Host` そしてWebSocketアップグレードを転送する `/api/v1/ws`。参照 [デプロイ](deployment.ja.md).

<a id="_3-pull-the-image"></a>
<a id="3-pull-the-image"></a>

## 3. 画像を引き出す

```sh
docker compose pull
```

Composeは指定された画像を使用します。 `compose.yaml` メインで。このステップでは事前に作られたイメージをダウンロードするだけで、ソースコマンドのチェックアウトは行いません。

<a id="_4-start-doca"></a>
<a id="4-start-doca"></a>

## 4. Docaを起動する

```sh
docker compose up -d
docker compose ps
```

コンテナが正常になるのを待ちます。正常化反応は：

```json
{"status":"ok","version":"<image version>"}
```

スタートアップが失敗した場合、点検する。 `docker compose logs --tail=100 doca`Composeポートがバインドされています `127.0.0.1`ブラウザのアクセスは、プロキシを通じて設定されたHTTP(S)オリジンを使用します。

<a id="_5-initialize-the-administrator-password"></a>
<a id="5-initialize-the-administrator-password"></a>

## 5. 管理者パスワードを初期化する

同じディレクトリに `compose.yaml`、実行：

```sh
bash scripts/bootstrap-admin.sh
```

管理者のログイン情報、少なくとも12文字のパスワード、そして再びパスワードを入力します。現在のスクリプトは中国語でプロンプトを表示しており、パスワードの入力は隠されています。Docaにはデフォルトのアカウントやパスワードはありません。スクリプトは同じデータベースに対して一時的なコンテナを実行し、パスワードのハッシュを保存します。もし管理者が既に存在している場合、そのアカウントを変更せずに初期化が停止します。

開く `https://doca.example.com` ログインしてください。管理者のログイン情報やパスワードを入力しないでください。 `.env`既存のアドミニストレーターアカウントを復元するには、以下を使用します。 [パスワードリセット](deployment.ja.md#change-a-password).

<a id="next-steps"></a>

## 次のステップ

- 読んでください [ユーザーガイド](user-guide.ja.md) 文書やライブラリを作成する。
- レビュー [認証](authentication.ja.md) SSOの登録や設定を開始する前に。
- 読む [設定](configuration.ja.md), [ファイルストレージ](storage.ja.md)、そして [操作](deployment.ja.md) ストレージを変更したりバックアップを作ったりする前に。
- 使用する [水平スケーリング](horizontal-scaling.ja.md) 複数のレプリカを展開する場合のみ。

SQLite、アップロード、プラグイン、そしてAIデータベースが使用されている `doca_data` ボリューム。再起動を繰り返しても保持し、すべてのデータベース、参照されるストレージ、保護された設定もバックアップに含める。 `docker compose down -v` そのボリュームを削除し、通常の再起動やアップグレードには使用してはならない。
