<a id="deploy-without-github-access"></a>

# GitHubアクセスなしでデプロイする

[简体中文](deployment-without-github.zh-CN.md)

ビジネスサーバーにはソースチェックアウト、Git、Node.js、またはpnpmは不要です。先にDocker Engine、Docker Composeプラグイン、Bash、OpenSSLをインストールし、デプロイファイルを転送し、イメージを準備し、Docaを起動し、管理者を初期化します。このガイドでは、SQLiteとローカルファイルストレージを使用した新しい単一サーバー上でDoca 0.3.1をインストールします。既存のインストールについては、再度確認が必要です。 [リリース要件](releases/0.3.1.ja.md) そして、彼らのデータベース、ファイル、設定、および認証キーマスターキーを保護する。

<a id="fresh-installation-from-one-yaml"></a>

## YAMLからの新しいインストール

`node scripts/pack-deployment.mjs` また出力する `doca-compose-vVERSION.yaml` およびそのチェックサム。YAMLを転送し、保存してください。 `compose.yaml` 永続的なデプロイディレクトリ内で編集する `DOCA_ORIGIN` そして、あなたが生成したもの `DOCA_CREDENTIAL_MASTER_KEY`それを保護する `chmod 600 compose.yaml`それから実行する `docker compose up -d`。いいえ `.env`seccomp JSONや外部の管理者スクリプトが必要です。対応する0.3.1のイメージを使用してください。スタンドアロン版のYAMLとチェックサムもGitHub Releaseに添付されています。

サービスが正常になった後、実行する `docker compose exec doca bash docker/admin.sh bootstrap`；使用 `reset-password` パスワードリセットのためです。パスワードの入力は隠され、YAMLに記載されません。この例は新しいSQLite/local-storageインストールの場合のみです。既存のサイトは、プロジェクト名、ボリューム、キーが保持されます。バックアップには保護されたYAMLが含まれます。リバースプロキシの要件は、以下で説明されている通りです。

<a id="_1-transfer-deployment-files"></a>
<a id="1-transfer-deployment-files"></a>

## 1. デプロイファイルの転送

リポジトリアクセス権を持つ人がmainをクローンし、デプロイバンドルを生成する：

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
node scripts/pack-deployment.mjs
```

以下のアーカイブ名と画像タグは0.3.1を例として使用しています。パッカーが出力するファイル名と、生成されたComposeファイルで指定される画像を使用してください。

移転 `doca-deploy-v0.3.1.tar.gz` そして、それ `.sha256` エンタープライズファイルサービス、内部ダウンロードURL、またはリムーバブルストレージを通じてチェックサムを確認する。パッカーは公開されたデプロイファイルのみを読み取り、ローカルファイルは含まない。 `.env`ユーザーデータやコンテナイメージです。対応するタグのGitHub Releaseには、バンドルとチェックサムが含まれています。

ビジネスサーバーの同じディレクトリに両方のファイルを置き、確認し、抽出します。

```sh
sha256sum -c doca-deploy-v0.3.1.tar.gz.sha256
tar -xzf doca-deploy-v0.3.1.tar.gz
cd doca-deploy-v0.3.1
```

macOSでは、使用する `shasum -a 256 -c doca-deploy-v0.3.1.tar.gz.sha256`このディレクトリから続くデプロイコマンドを実行してください：

```text
doca-deploy-v0.3.1/
  compose.yaml
  docker.env.example
  README.zh-CN.md
  README.md
  LICENSE
  scripts/
    bootstrap-admin.sh
    reset-admin-password.sh
```

このバンドルは環境変数と永続的なマウントを保持し、ソースビルド設定を削除し、使用する `pull_policy: missing`再構築されたイメージにはPDF/キャンバスランタイムが含まれており、セッコンポジションデータは転送されません。既存のインストールは、Composeプロジェクト、ボリューム、設定、マスターキーを保持します。これらの変更には再構築されたイメージが必要です。公開された旧イメージは、元のデプロイ要件に従います。

<a id="copy-compose-and-env-manually"></a>

### コピー、Compose、そして.envファイルを手動で作成する

テキストの転送のために、この単一サーバー構成を保存してください。 `compose.yaml` そして、マッチングするホストを使用する `scripts/` 必要に応じて、または内蔵のイメージ管理コマンドを使用できます。このバンドルには追加のオプション設定も含まれています。この例ではSQLiteとローカルストレージのみを使用しています。

```yaml
services:
  doca:
    image: docker.io/smartdoca/doca:0.3.1
    pull_policy: missing
    restart: unless-stopped
    init: true
    stop_grace_period: 30s
    environment:
      NODE_ENV: production
      DOCA_ORIGIN: "${DOCA_ORIGIN:?Set DOCA_ORIGIN in .env}"
      DOCA_HOST: 0.0.0.0
      DOCA_PORT: "39120"
      DOCA_DATABASE: sqlite
      DOCA_SQLITE_PATH: /data/doca.db
      DOCA_BOOK_BATCH_CHECKPOINTS: "${DOCA_BOOK_BATCH_CHECKPOINTS-on}"
      DOCA_AI_SQLITE_PATH: /data/ai.db
      DOCA_DATA_DIR: /data
      DOCA_FILE_STORE_ID: "${DOCA_FILE_STORE_ID:?Set DOCA_FILE_STORE_ID in .env}"
      DOCA_FILE_STORES_JSON: "${DOCA_FILE_STORES_JSON:?Set DOCA_FILE_STORES_JSON in .env}"
      DOCA_CREDENTIAL_MASTER_KEY: "${DOCA_CREDENTIAL_MASTER_KEY:?Generate and set the key in .env}"
    ports:
      - "127.0.0.1:39120:39120"
    volumes:
      - doca_data:/data

volumes:
  doca_data:
```

以下を保存してください `.env`実際のブラウザのオリジンを設定し、次のステップで生成されるマスターキーを入力します。

```dotenv
DOCA_ORIGIN=https://docs.example.com
DOCA_CREDENTIAL_MASTER_KEY=
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

<a id="_2-configure-the-environment-and-proxy"></a>
<a id="2-configure-the-environment-and-proxy"></a>

## 2. 環境とプロキシを設定する

バンドルの場合、以下のコマンドを実行してください。作成した場合はコピーを省略できます。 `.env` 手動で：

```sh
cp docker.env.example .env
openssl rand -hex 32
chmod 600 .env
```

生成された64文字の16進数値を書き込む `DOCA_CREDENTIAL_MASTER_KEY`公開例を置き換える。設定する `DOCA_ORIGIN` HTTP(S)オリジンユーザーに開放されます。キーを一度生成し、安全かつ別途保存し、再起動時も保持します。ローカルストレージルートを…に保ちます。 `/data/storage`管理者の認証情報を入れないでください。 `.env`.

Composeは単に結合するだけです。 `127.0.0.1:39120`ですから、同じサーバー上にリバースプロキシを設定してください。公開用HTTPSの場合、Caddyを使用できます。

```caddyfile
docs.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

サーバーにDNSを指定し、証明書の発行を許可するか、既存のエンタープライズ証明書を使用する。インターネットアクセスがない信頼できる内部ネットワークの場合は、設定を… `DOCA_ORIGIN=http://doca.internal`内部DNSやクライアントホストのエントリを設定し、公開証明書の発行なしでこのHTTPプロキシを使用する。

```caddyfile
http://doca.internal {
    reverse_proxy 127.0.0.1:39120
}
```

他のプロキシは保持しなければならない `Host` そしてHTTPおよびWebSocketのアップグレードを転送する `/api/v1/ws`ビジネス環境は、プロキシであるDockerとそのインストールパッケージを事前に提供しなければならない。これらはデプロイバンドルには含まれていない。

<a id="_3-prepare-the-image"></a>
<a id="3-prepare-the-image"></a>

## 3. 画像を準備する

<a id="docker-hub-is-reachable"></a>

### Docker Hubにアクセス可能です。

GitHubがブロックされているがDocker Hubがアクセス可能なら、事前構築されたイメージをダウンロードする：

```sh
docker compose pull doca
```

<a id="registries-are-also-unreachable"></a>

### 登録簿もアクセスできない

サプライヤーはレジストリにアクセスできるマシン上で画像アーカイブを作成する。まず、対象のCPUアーキテクチャを確認する。この例ではLinux x86-64を使用している。`linux/amd64`); ARM64の場合は、使用する `linux/arm64` 送信されたファイルに適切にラベルを付けましょう：

```sh
docker pull --platform linux/amd64 docker.io/smartdoca/doca:0.3.1
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
docker save -o doca-image-v0.3.1-linux-amd64.tar docker.io/smartdoca/doca:0.3.1
sha256sum doca-image-v0.3.1-linux-amd64.tar > doca-image-v0.3.1-linux-amd64.tar.sha256
```

画像を転送する `.tar` チェックサムと一緒に。ビジネスサーバーのディレクトリから：

```sh
sha256sum -c doca-image-v0.3.1-linux-amd64.tar.sha256
docker load -i doca-image-v0.3.1-linux-amd64.tar
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
```

ロードされたタグが正しいか確認する `smartdoca/doca:0.3.1` アーキテクチャがターゲットに合致したら、デプロイディレクトリに戻ります。内部レジストリも別の配布方法です。サプライヤーが同じリリースイメージを配布し、ビジネスチームがComposeを変更します。 `image` プルインする前に、その内部レジストリアドレスに保存してください。バンドル、イメージ、初期化スクリプトを同じリリースに保持します。

<a id="_4-start-and-initialize-the-database"></a>
<a id="4-start-and-initialize-the-database"></a>

## 4. データベースを起動し、初期化する

画像をダウンロードまたは読み込んだ後、デプロイディレクトリから実行します：

```sh
docker compose config --quiet
docker compose up -d --pull never --no-build
docker compose ps
```

`--pull never --no-build` ローカル画像を使用し、それがない場合は動作しない。オンラインダウンロードやソースビルドを試みることはない。最初の起動時には、空の状態で現在のデータベーススキーマとファイル/AIデータディレクトリを作成する。 `doca_data` ボリューム。手動でのSQLやデータベースのインストールは不要です。既存の古いデータベースは自動的にアップグレードされません。

待つ `docker compose ps` 示すため `healthy`手動検査では、Hostを使用する必要があります。 `.env`非標準ポートを含む：

```sh
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

期待する `{"status":"ok","version":"0.3.1"}`内部の例については、使用してください。 `Host: doca.internal`バレルループバックリクエストはホスト検証に失敗する。起動失敗を調査する `docker compose logs --tail=100 doca`.

<a id="_5-initialize-the-administrator"></a>
<a id="5-initialize-the-administrator"></a>

## 5. 管理者を初期化する

サービスが正常になった後、同じデプロイディレクトリ内で実行します：

```sh
bash scripts/bootstrap-admin.sh
```

ログイン情報、少なくとも12文字のパスワードを入力し、確認する。パスワードの入力は隠される。スクリプトは準備されたイメージと同じ永続性ボリュームを使用して一時的なコンテナを起動する。管理者がいない場合にのみアカウントが作成され、データベースにはパスワードのハッシュが保存される。デフォルトのログイン情報やパスワードはない。設定を開く `DOCA_ORIGIN` そしてログインしてください。

既存のアドミニストレーターパスワードを後でリセットするには：

```sh
bash scripts/reset-admin-password.sh
```

これはアカウントを作成しません。データベースがロックされている場合は、実行してください。 `docker compose stop`パスワードをリセットし、その後 `docker compose up -d --pull never --no-build`.

<a id="preserve-data-and-deliver-later-releases"></a>

## データを保存し、後続のリリースを提供する

使用する `docker compose restart` 通常の再起動のため。デプロイディレクトリとComposeプロジェクト名を保持しておくことで、同じものが使えます `doca_data` ボリュームが使用されているため、どちらを変更しても誤って別の空のサイトが作成される可能性があります。永続ボリューム内のすべてのデータベースやファイルストレージ、および保護されたものをバックアップしてください。 `.env` そしてマスターキー。 `docker compose down -v` ボリュームを削除し、通常の再起動やアップグレードには使用できない。

レビューをする [リリース要件](releases/0.3.1.ja.md) アップグレードする前に、対応するバンドルと画像を提供してください。このガイドでは新しいサイトを初期化するだけで、既存のデータは変換されません。パスワードログインやローカル文書サービスにはGitHubアクセスは不要ですが、AI、外部ログイン、プラグインのインストール、クラウドストレージ用の外部サービスは依然としてアクセス可能でなければなりません。ターゲットホストでの文書レンダリングを別途確認してください。アプリケーションの健康状態だけではPDF、キャンバス、Officeのレンダリングの正確性は確立されません。詳細は [Dockerドキュメントのレンダリング](docker-rendering.ja.md).
