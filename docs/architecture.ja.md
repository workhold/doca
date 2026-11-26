<a id="architecture-and-implementation-boundaries"></a>

# アーキテクチャと実装の境界

[中文](architecture.zh-CN.md)

ベースライン：ホスト0.2.23 / SDK 0.1.11、ドキュメントは2026-10-28にソースと照合して確認済み。これは実装されたアセンブリと境界を説明しています。デプロイに特化したサービスやデバイスの動作は別途承認が必要です。始めるには [能力と限界](features.ja.md).

<a id="application-and-modules"></a>

## アプリケーションとモジュール

DocaはTypeScriptによるモジュール型のモノリシックアプリケーションです。開発では、1つのブラウザオリジンを背に、別々のポートでReact/ViteとFastifyを実行します。本番環境では、ビルドされたWebアプリケーションとAPIをFastifyを通じて提供します。Cordisはインプローチサービスとライフサイクルを管理し、公開SDKがプラグインの境界を定義します。

```text
Browser: React + five document editors
  │ same-origin HTTP / WebSocket; host-authenticated sessions
Fastify: Host/Origin validation, routes, security, static files
  │
Host composition: accounts, documents, files, search, AI, knowledge
  │ trusted business plugins discovered in the installation directory
Core domain rules / Kysely database access
  │
SQLite single instance, or shared PostgreSQL + Redis + file backend
```

デフォルトのホストには、リッチテキスト、Markdown、スプレッドシート、キャンバス、文書の権限設定、ディスカバリー、ファイル、ソースサブスクリプション、ナレッジブック、認証、登録審査、セキュリティ監査、および生のAI利用情報が含まれます。クイックノート、メール、カレンダー、会員制、請求、ビジネスクォータ、モデレーションは独立したビジネス上の問題であり、デフォルトでそのようなプロバイダーはインストールされていません。テンプレート/資料/要素は、デフォルトのプロバイダーが一切ないインターフェースを提供します。

<a id="directories"></a>

## ディレクトリ

| パス | 責任 |
| --- | --- |
| `apps/server/src/main.ts` | スタートアップ、リスニング、シャットダウン |
| `apps/server/src/bootstrap/config.ts` | 起源、データベース、プロキシ、Redis設定 |
| `apps/server/src/app/create-app.ts` | HTTPルート、セッション、セキュリティ境界 |
| `apps/server/src/plugins/composition.ts` | 内蔵サービスとインストールされたプラグインアセンブリ |
| `apps/server/src/routes` | HTTPエンドポイントをホストする |
| `apps/server/src/services` | リアルタイム、検索、AIなどのアプリケーションサービス |
| `apps/web/src/app/app.tsx` | ワークスペースルーティングとフィーチャー組み立て |
| `apps/web/src/features/documents/document-editor.tsx` | 5つのインストールされたエディターパッケージに配布する |
| `packages/core/src` | ドメイン規則、認可、取引 |
| `packages/db/src/create-schema.ts` | 新規作成および起動の調整のための現在の目標DDL |
| `packages/plugin-sdk` | 公共サーバー/ウェブ/プラグインインターフェース |
| `tests` | 孤立単位と統合チェック |

Webコードはデータベースやパスワードの内部構造をインポートするのではなく、HTTP DTOを使用する。ビジネスプラグインは公開されたSDKサービスを利用し、ホストソースをインポートしたり、グローバルランタイムブリッジを作成したりすることはない。詳細はこちら [プラグインアーキテクチャ](plugin-architecture.ja.md) そして [実施インベントリ](plugin-sdk-contract.ja.md).

<a id="identity-and-security"></a>

## アイデンティティとセキュリティ

1回のデプロイには1つのアカウントシステムがあり、組織/スペース/テナントテーブルは存在しない。登録と外部プロバイダーは無効になっている。デフォルトの管理者は存在しない。パスワードはscryptとランダムな塩を使用し、データベースにはセッションのダイジェストが保存される。ブラウザ、QRログイン、WebViewのセッションはデフォルトで24時間、モバイルベアラーセッションはデフォルトで180日である。両方の有効期間は設定可能である。 [セッション設定](configuration.ja.md#login-lifetime)パスワードの変更やアカウントの無効化はセッションを取り消します。

すべてのリクエストでは設定されたHostがチェックされます。変更操作では同じオリジンもチェックされます。サイトのクッキーはHttpOnly、SameSite=Strict、そしてHTTPSによるSecureになっています。認証アダプターは外部OIDCやソーシャルプロバイダをサポートし、認証ゲートウェイが必要な接触検証や復元機能も実装されています。登録承認には専用のレビューワークフローがあります。OIDCプロバイダとしてのDoca、SAML、およびIdP全体でのログアウト機能は利用できません。詳細は [認証](authentication.ja.md).

管理機関はプライベートコンテンツへのアクセスを許可しません。読み取りアクセスがない場合、通常404が返されます。アクションがない承認された読者には403が返されます。ACL、継承された許可、公開、コレクション、共有にはそれぞれ独自の規則があります。隠された祖先は公開されません。詳細は [権限](permission-inheritance.ja.md) そして [発見](public-resource-discovery.ja.md).

<a id="persistence-and-collaboration"></a>

## 持続性と共同編集

文書のメタデータはHTTPとバージョンチェックを使用します。5種類のエディター形式は、各形式固有のYjsコーデックを使用する1つのホストウェブソケットライフサイクルを採用しています。サーバーは内容を検証し、認可を再確認し、承認する前にコミットします。メタデータのバージョン、内容のシーケンス、エポック、スキーマ、履歴IDはそれぞれ異なります。履歴はすべての形式で利用可能ですが、復元機能は現在、リッチテキストとMarkdownのみをサポートしています。詳細は [共同編集](collaboration.ja.md) そして [文書の歴史](document-experience.ja.md).

SQLite、AI、Webhookストレージ、そしてローカルファイルを含むシングルインスタンスが可能です。PostgreSQLでは、別のWebhookデータベースとAIスキーマが使用されます。複数のレプリカには、共有データベース、ローカルファイルバックエンド、そしてイベント、存在状態、制限に関するRedisが必要です。Redisがない場合、これらの実装はプロセスローカルになります。設定されたRedisの障害は静かにフォールバックされません。データベースジョブはプロセスメモリだけでなく、リース/アウトボックスを使用します。詳細はこちら [設定](configuration.ja.md) そして [水平スケーリング](horizontal-scaling.ja.md).

オブジェクトは安定したストレージIDとオブジェクト参照を保持します。環境設定では物理的なストアが選択され、ストレージ管理ページは読み取り専用です。プライベートダウンロードではアクセスが再確認されます。CDNは有効期限が切れる承認済みURLを提供し、ストレージを代替することはありません。バックアップには、すべてのデータベース、参照されるサーバー、プラグインアーカイブ、保護された設定が含まれます。詳細はこちら [ファイルストレージ](storage.ja.md).

インストールされたプラグインは共有レジストリ記録と不変アーカイブを使用し、起動時に復元される個別インスタンス用のキャッシュもあります。手動再起動により希望するリリースが有効になります。管理されたプライベートSQL、オブジェクト、認証情報が実装されていますが、タスクの消費、一時的なワークスペース、より強力なプロセス分離は未解決の問題です。正確なバージョン検証ではサポートされていないベースラインや構造は拒否されます。ここでは移行や互換性アダプターは追加されません。既存のデータは保持されなければなりません。詳細は [リリース要件](releases/0.2.23.md) そして、 [データベースアップグレード契約](database-schema-evolution.ja.md).

<a id="current-limits-and-acceptance"></a>

## 現在の制限と受け入れ

コメントスレッドや通知には専用のページング機能付きエンドポイントがありますが、文書の詳細情報は完全なコメントエクスポートには含まれていません。永続的なローカルレプリカやアウトボックス機能も実装されていますが、完全なオフラインアプリケーションシェルは利用できません。ネイティブデバイス連携、リアルタイムID/AIプロバイダー、プロダクション用S3/CDN、ターゲットインフラのフェイルオーバー機能については、別途承認が必要です。自動化された孤立テストでは、その範囲が実証されていますが、ビルドだけではすべての外部サービスが正常に動作しているとは限りません。
