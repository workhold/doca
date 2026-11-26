<a id="sdd-module-index"></a>

# SDDモジュールインデックス

それ [デスクトップクライアント](desktop-client.ja.md) タウリシェルを横切る、遠隔ホスト認証、バンドルされたWebトランスポート、ウィンドウセッション。機能の受け入れと検証はライブで行われる。 [`specs/006-desktop-client`](../specs/006-desktop-client/spec.md) そして [`specs/007-desktop-workspace-tabs`](../specs/007-desktop-workspace-tabs/spec.md).

[中文](sdd-module-index.zh-CN.md) · [ワークフロー](sdd.ja.md)

このインデックスは、既存のモジュールをソース、現在の契約、再利用可能なチェックと結びつけます。既存の機能性を認証したり、過去の受け入れを再実行したりすることはありません。作業前に実際のエクスポート内容とロックファイルのバージョンを確認し、相談してください。 [建築](architecture.ja.md) 現在の制限に関する適用可能なリリースノートも含まれます。モジュールを変更する際には新しいSDDを追加し、同じPRでその権威ある契約を更新します。

| モジュール | ソースエントリ | 現在の契約と指針 | 再利用可能な小切手 |
| --- | --- | --- | --- |
| ホスト構成とライフサイクル | [サーバー](../apps/server/src), [コア](../packages/core/src) | [建築](architecture.ja.md), [開発](development.ja.md) | [ホストの隔離/統合](../tests/cloud.test.ts) |
| 認証、権限とグループ | [基本ルール](../packages/core/src), [HTTPルート](../apps/server/src/routes) | [認証](authentication.ja.md), [権限](permission-inheritance.ja.md), [グループ](user-groups.ja.md) | [権限設定](../tests/permissions-v2.test.ts), [継承](../tests/permission-inheritance.test.ts), [グループ](../tests/user-groups.test.ts) |
| 文書エディターとファイル交換 | [ドキュメントUI](../apps/web/src/features/documents), [文書の核心](../packages/core/src/modules/documents) | [エディター統合](editor-integration.ja.md), [ファイル交換](editor-file-exchange-contract.ja.md); リポジトリエディタースキル | [パッケージアップグレード](../tests/editor-package-upgrade.test.ts), [統合](../tests/document-integration.test.ts), [PDF](../tests/document-pdf.test.ts) |
| 共同編集、存在感、コメント | [ドキュメントコーデック](../packages/core/src/modules/documents/codecs), [サーバーサービス](../apps/server/src/services) | [共同編集契約](collaboration-sdk-contract.ja.md), [コメント](comments-and-community.ja.md); リポジトリでの共同編集スキル | [共同編集](../tests/collaboration.test.ts), [選択](../tests/rich-text-collaboration-selection.test.ts) |
| データベース構造と保存形式 | [DBパッケージ](../packages/db/src), [現在のDDL](../packages/db/src/create-schema.ts) | [アップグレード契約](database-schema-evolution.ja.md), [スキーマインベントリ](database.ja.md) | [和解](../tests/schema-reconciliation.test.ts), [列の整列](../tests/schema-column-alignment.test.ts), [PostgreSQL CI](../.github/workflows/database-upgrade.yml) |
| ファイル、ストレージ、履歴 | [ファイルルート](../apps/server/src/routes/files.ts), [文書の核心](../packages/core/src/modules/documents) | [ストレージ](storage.ja.md), [文書の動作](document-experience.ja.md) | [ファイル](../tests/files.test.ts), [保管](../tests/storage.test.ts), [歴史](../tests/history-storage.test.ts) |
| プラグインのインストールと公開用SDK | [SDK](../packages/plugin-sdk), [プラグインホスト](../packages/plugin-host), [ウェブレジストリ](../packages/web-plugin-registry) | [SDK契約](plugin-sdk-contract.ja.md), [開発](plugin-development.ja.md), [保管](plugin-horizontal-scaling.ja.md) | [SDK](../tests/plugin-sdk.test.ts), [マネージャー](../tests/plugin-manager.test.ts), [管理型ストレージ](../tests/plugin-managed-storage.test.ts) |
| AI実行、ツールと使用法 | [AIコア](../packages/core/src/modules/ai), [サーバーAIサービス](../apps/server/src/services/ai), [ホストパッケージ](../packages/ai-host) | [AIの境界](ai-efficiency.md), [添付ファイル](ai-attachments.md), [継続](plugin-ai-continuations.ja.md), [SDK契約](plugin-sdk-contract.ja.md) | [能力](../tests/plugin-ai-capability.test.ts), [継続](../tests/ai-continuations.test.ts), [文書が読める](../tests/ai-document-read.test.ts) |
| 検索とナレッジブック | [ホストを検索する](../packages/search-host), [知識](../packages/core/src/modules/knowledge), [本](../packages/core/src/modules/knowledge-books) | [コンテンツプロバイダー](plugin-content.ja.md), [ナレッジブック](knowledge-books.ja.md), [チェックポイント](knowledge-book-generation-performance.ja.md) | [検索](../tests/search-host-query.test.ts), [本](../tests/knowledge-books.test.ts), [ペイロードストレージ](../tests/knowledge-book-payload-storage.test.ts) |
| MCPとブラウザアシスタント | [MCPルート](../apps/server/src/routes/mcp-management.ts), [拡張子](../apps/browser-extension) | [MCP](mcp.ja.md), [ブラウザアシスタント](browser-assistant.ja.md) | [MCP](../tests/mcp.test.ts), [クリッパー](../tests/browser-clipper.test.ts), [助手](../tests/browser-assistant.test.ts) |
| ウェブシェル、ネイティブクライアント、言語 | [ウェブ](../apps/web/src), [モバイル](../apps/mobile), [i18n](../packages/i18n) | [ネイティブ統合](plugin-native.ja.md), [i18n](i18n.ja.md); リポジトリi18nスキル | [言語](../tests/i18n.test.ts), [ネイティブセッション](../tests/plugin-mobile-session.test.ts), [ネイティブ機能](../tests/plugin-native.test.ts) |
| ジョブ、ウェブホック、マルチインスタンス運用 | [ジョブホスト](../packages/job-host), [ウェブホック](../apps/server/src/services/webhooks) | [ウェブホック](webhooks.ja.md), [水平スケーリング](horizontal-scaling.ja.md), [プラグインストレージ](plugin-horizontal-scaling.ja.md) | [ウェブホック](../tests/webhooks.test.ts), [クラスター監視](../tests/plugin-monitoring-cluster.test.ts) |
| パッケージング、リリース、文書化 | [スクリプト](../scripts), [Docker](../docker), [ワークフロー](../.github/workflows) | [デプロイ](deployment.ja.md), [ドキュメント](documentation.ja.md), [検証指数](verification/README.md) | [ドキュメントチェッカー](../scripts/tests/documentation.test.mjs), [SDDチェッカー](../scripts/tests/sdd.test.mjs)モジュール/リリース固有のスクリプト |

テストリンクは入り口に過ぎず、すべての変更に対して十分なテスト計画とはなりません。受け入れ基準や実際の境界条件に基づくチェックを選択してください。SQLiteの結果だけではPostgreSQLのアップグレードを証明することはできません。モックだけでは外部プロバイダーを証明することはできません。ローカルテストだけではネイティブデバイスや本番デプロイを証明することはできません。これらの領域を変更する前に、適用可能なスキルを確認してください。既存の独立してバージョン管理されているエディターパッケージやビジネスプラグインには、独自のリポジトリチェックと明確な統合バージョン記録が必要です。
