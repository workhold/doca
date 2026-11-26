<a id="host-managed-plugin-credentials"></a>

# ホストが管理するプラグイン認証情報

[中文](plugin-credentials.zh-CN.md)

リリース：ホスト0.1.10およびSDK 0.1.9が発表され、これにはSDKソース0.1.8で以前追加された認可APIも含まれる。SDK 0.1.7ではこれはエクスポートされない。メールプラグインは宣言するべきである。 `^0.1.9` ホストソースをインポートしたり、パスワードを直接保存したりするのではなく、公共サーバーのトークンを使用する。

```ts
import { pluginCredentialToken } from '@smartdoca/plugin-sdk/storage';

// Declare pluginCredentialToken in injections.required.
const credentials = ctx.inject(pluginCredentialToken);
const created = await credentials.create({value: JSON.stringify({password: 'example'})});
// Store created.id in the plugin database with the business account and grants.
const metadata = await credentials.inspect(created.id); // No plaintext.
const stored = await credentials.get(created.id); // Server plaintext or null.
if (stored) {
  const refreshed = await credentials.update({
    id: stored.credential.id,
    expectedRevision: stored.credential.revision,
    value: JSON.stringify({accessToken: 'new', refreshToken: 'new-refresh'}),
  });
  await credentials.remove({id: refreshed.id, expectedRevision: refreshed.revision});
}
```

メタデータは `{id, revision, createdAt, updatedAt}`ホストがIDを生成します。プラグインはID、スコープ、データベース名、サーバー設定を提供することはできません。 `get` 返却 `{credential: metadata, value: string} | null`; `inspect` メタデータを返すか、nullを返す。値は空でない有効なUnicode文字列であり、最大64KiBのUTF-8形式である。プラグインはOAuthオブジェクトを明示的にシリアル化するため、暗黙のフォーマット変換は存在しない。

更新や削除には正の整数が必要です。 `expectedRevision`1件のみ同時更新が成功しました。古いリビジョンが返されます。 `conflict`新しいリフレッシュトークンを上書きするのではなく、ビジネスルールを再読み込みして適用する。欠落しているレコードを削除することはイデミポテントである。無効な入力は返される。 `invalid-input`; 有効でないインストール、破損した記録、サービス/データベースの障害、または欠如している記録の更新が失敗する `unavailable`エラーには、入力がないこと、SQL、接続設定、または基盤となる暗号化エラーが含まれます。

AES-256-GCM認証暗号化は、記録を特定する `plugin:<pluginId>`インストール生成、UUID、およびリビジョン。データベースには暗号化された記録が保存され、各書き込みには新しいランダムなノンスが使用される。他のプラグインはこれらの記録を読み取ったり、更新したり、削除したりすることはできない。無効化またはシャットダウンによってこれらの記録は保持される。明示的なアンインストールでは、レジストリトランザクション内のその生成の認証情報が削除され、古いハンドルが無効化される。再インストールでは新しい生成が使用される。アンインストールを完了する前に、プレスティンロード形式で必要な外部の無効化処理を行う。SDKはビジネスアカウントの認可を決定しない：プラグインは読み取る前にユーザー/アカウントの権限をチェックし、ブラウザ、AIコンテキスト、ログ、または通常の設定APIにプレスティンロード形式を返すことは決してない。

認証操作とプラグインのビジネストランザクションは別々に実行されます。認証の作成後にビジネス参照を保存する際に失敗した場合は、認証を削除することで補償します。プラグインは、外部OAuthの更新、データベースのコミット、失われた応答をそれぞれのルールに従って復元します。クロスサービストランザクション、イデミポテンシーキー、一般的なジョブコーディネーター、自動キーローテーションはありません。詳細は…を参照してください。 [ストレージの例](../examples/plugin-storage/README.md)プラグインは信頼できるNode.jsプロセス内で実行されます。スコープ付きAPIはオペレーティングシステムのサンドボックスではありません。

<a id="deployment-environment"></a>

## デプロイ環境

`DOCA_CREDENTIAL_MASTER_KEY` 32個のランダムなバイトが64個の16進数文字としてエンコードされる必要があります。それを生成してください。 `openssl rand -hex 32`一度設定して、再起動時も保持し、別途バックアップする。プラグインがなくても、すべてのホスト起動にはキーが必要です。キーが欠落している、空の、または構成が正しくない場合、起動が拒否されます。例ファイルには説明目的での公開サンプル値が含まれています。新しいインストールではそれを置き換え、既存のデプロイメントでは元のキーを保持します。データベースはキーフィンガープリントを保持します。一致しないキーは、データの再暗号化なしで起動を拒否します。最後のプラグインを削除しても、このキーアイデンティティは消えません。データベースを共有するすべてのプロセスは同じキーを使用します。

オペレーターはデータベースとファイルストレージを選択します：1つのインスタンスにはSQLite/ローカルファイルを、複数のインスタンスには共有データベースとクラウドストレージを設定します。プラグインAPIはデプロイトポリトロジーを選択しません。データベース、プール、Webhookデータベース、Redis、インスタンス設定を組み合わせて設定します。 [docker.env.example](../docker.env.example).

ファイルストレージは、単に設定されるだけです。 `DOCA_FILE_STORE_ID` そして厳格なバージョン1 `DOCA_FILE_STORES_JSON`S3/CDNの認証情報を含む。ストレージ管理ページは読み取り専用であり、古いストレージ設定の申請は拒否されます。詳細は [実施記録](unified-storage-implementation.md) 例として。プラグインのマスターキーとクラウドストレージ接続認証情報は独立しています。既存のアイデンティティ、メッセージング、検索プラットフォームの設定は、この更新によって変換されたり再暗号化されたりすることはありません。

データベースのベースラインは `doca-2026-10-03-credentials-v2`以前に合意されたバージョンポリシーに従い、0.1.9以前のホストデータベースは拒否されます。旧データベース、オブジェクト、デプロイを保持します。自動的なテーブル修復、マイグレーション、インポート、またはリセットは提供されません。新しい空のデータベースを使用してください。ロールバックでは、元のデプロイ/データを使用し、新しいデプロイデータは別途保持されます。SDK 0.1.7の欠如した認証サービスは、自己管理のローカルファイルで回避してはなりません。
