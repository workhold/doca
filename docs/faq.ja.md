<a id="faq-and-troubleshooting"></a>

# よくある質問とトラブル解決

[中文](faq.zh-CN.md)

<a id="is-there-a-default-administrator-password"></a>

## デフォルトの管理者パスワードはありますか？

いいえ。走ってください。 `bash scripts/bootstrap-admin.sh` コンテナが正常になった後。パスワードは少なくとも12文字以上でなければなりません。既存のアカウントの場合は、使用してください。 `bash scripts/reset-admin-password.sh`初期化はパスワードリセットではありません。

<a id="why-does-the-browser-not-connect-to-port-39120"></a>

## なぜブラウザが39120ポートに接続できないのでしょうか？

Composeはポートをサーバーのループバックに結びつけます。設定されているHTTP(S)オリジンを使用してください。 `DOCA_ORIGIN`設定されたリバースプロキシを通じて到達されます。サーバーIP URLは、オリジンとポートマッピングが明確に一致している場合にのみ機能します。マッピング、ホスト、使用時のTLS、WebSocket転送を確認してください。 [デプロイ](deployment.ja.md).

<a id="which-environment-example-should-i-use"></a>

## どの環境例を使うべきか？

公開されたDockerイメージの場合は、コピーしてください。 `docker.env.example`ソース開発のため、コピーしてください。 `.env.example`設定する `DOCA_ORIGIN`, `DOCA_FILE_STORE_ID`, `DOCA_FILE_STORES_JSON`、そして必要な持続性 `DOCA_CREDENTIAL_MASTER_KEY` Composeを開始する前に。新しいインストールでは公開のサンプルキーを置き換え、既存のデータベースでは元のキーを保持します。詳細は [設定](configuration.ja.md).

<a id="why-do-i-get-421-403-or-a-disconnected-editor"></a>

## なぜ421、403、または接続が切れたエディターが表示されるのか？

421は通常、ホストが設定されたオリジンと一致しないことを意味します。ミューテーションリクエストでは同じオリジンが必要であり、一致しない場合は403が返されます。編集も承認と機能するWebSocketアップグレードが必要です。 `/api/v1/ws`ブラウザのアドレス、プロキシ設定、アカウントの状態、現在のリソース権限を確認してください。

<a id="what-should-i-do-if-startup-rejects-the-database-baseline"></a>

## スタートアップがデータベースのベースラインを拒否したら、どうすればいいですか？

止まって読んでみて [データベースアップグレード契約](database-schema-evolution.ja.md) そしてマッチング [リリース要件](releases/0.2.38.md)サポートされている世代は承認された構造的調整を受けます。サポートされていない世代では、意味論的な変更やレビューが必要な差異が永続的な変更前に起動を停止します。ロールバックのために、古いデプロイ、データベース、ファイル、シークレットを保持してください。起動を強制するためにテーブルを削除したり、ボリュームをリセットしたり、ベースラインマーカーを変更したりしないでください。

<a id="how-do-i-inspect-startup-problems"></a>

## 起動時の問題を調べるにはどうすればいいですか？

```sh
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 doca
curl -fsS -H 'Host: doca.example.com' http://127.0.0.1:39120/health
```

これらを、チェックアウト内のサーバー上で実行してください。 `compose.yaml`秘密情報を含むログは公開しないでください。ソース開発には使用してください。 `http://127.0.0.1:39130` および開発設定。

<a id="are-github-pages-and-the-doca-application-the-same-deployment"></a>

## GitHub PagesとDocaアプリケーションは同じデプロイか？

GitHub Pagesがこの静的ドキュメントサイトをホストしています。Docaアプリケーションには、コンテナ/サーバー、データベース、永続ファイル、そしてHTTP(S)オリジンが必要です。ドキュメントサイトの更新は、Docaアプリケーションを起動したりアップグレードしたりするものではありません。

<a id="can-i-update-or-restart-without-deleting-my-files"></a>

## ファイルを削除せずに更新したり再起動したりできますか？

普通の `docker compose restart` 永続ボリュームを保持する。設定変更は使用する `docker compose up -d`画像バージョンを変更する前に、リリースノートを読んで、すべてのデータベース、参照されるファイルストレージ、保護された設定をバックアップしてください。避けてください。 `docker compose down -v`ボリュームを削除するものです。

<a id="why-is-a-plugin-or-an-external-service-unavailable"></a>

## プラグインや外部サービスが利用できないのはなぜですか？

プラグインパッケージは現在のSDKおよびストレージ契約を満たす必要があります。インストール後に各インスタンスを手動で再起動する必要があります。暗号化された認証情報を使用するプラグインは、すべてのレプリカに同じ永続的なマスターキーが必要です。AI、SSO、検索、クラウドストレージの可用性も実際の認証情報とネットワーク接続に依存します。ソーステストではライブサービスの受け入れ性は確認されていません。詳細はこちらをご覧ください。 [プラグインデプロイ](plugin-deployment.ja.md).

上記のhealthコマンドでは、実際に設定されたホストを使用してください。421という値はホスト不一致を意味し、ループバックテスト時も含まれます。デフォルトではプロキシは信頼されません。共有プロキシのIP制限がある場合は、厳格に設定する必要があります。 `DOCA_TRUST_PROXY`.

<a id="where-do-i-get-the-desktop-client"></a>

## デスクトップクライアントはどこで入手できますか？

WindowsとmacOSのインストーラーをダウンロードするには [GitHubリリース](https://github.com/workhold/doca/releases)このビルドは署名されておらず、公証もされていません。macOSでは、アプリを右クリックして選択します。 **開く** 初回の場合、WindowsでSmartScreenのプロンプトが表示されることがあります。サーバーは0.2.37以降のバージョンでなければなりません。詳細は… [デスクトップクライアントガイド](desktop-client.ja.md).
