<a id="http-api"></a>

# HTTP API

[中文](api.zh-CN.md)

これは、主なホスト0.2.23のルートのインデックスです。実行中です。 `/api/openapi.json` 登録されたルートとスキーマが記述されている。サーバーコードでは認可、アノテーションされていないフィールド、および動作制限が定義されている。以前のインターフェースは保持されている。 [研究](research.ja.md) そして、今日利用可能であると仮定することはできない。

<a id="conventions"></a>

## 慣例

テーブルパスには `/api/v1` プレフィックス。ブラウザはHttpOnlyセッションクッキーを使用する。書き込みには設定されたホストと同じオリジンが必要。ネイティブクライアントはホスト認証されたBearerセッションを使用する。プラグインWebViewはスコープ付きプラグインセッションを使用する。公開リソースは、権限された読み取りパスのみを公開する。

メタデータ `version`、設定 `revision`、そしてコンテンツ `seq`/`epochId` それぞれ異なる役割を持つ。書き込む前に現在の値を確認する。409は衝突やサポートされていないプロトコル/状態を意味し、上書きする権限は一切ない。ページネーションはルートによって異なるので、その通りに行う。 `nextCursor` または `nextOffset`内容へのアクセスができない場合、通常は404が返されます。システム管理ではプライベートコンテンツへのアクセスは許可されません。

<a id="accounts-and-administration"></a>

## 会計と管理

| ルート | 目的と許可 |
| --- | --- |
| `GET /bootstrap` | 現在のユーザー、サイト、能力、ロードされたプラグイン；秘密はありません |
| `POST /auth/login`, `POST /auth/logout` | パスワードログイン / ログアウト |
| `POST /auth/register` | 入学政策に基づく登録；待機中の学生はセッションを受けられない |
| `GET /me` | 自分のプロフィールと好み |
| `GET /auth/providers` | 利用可能なアイデンティティプロバイダー |
| `GET /admin/users` | ステータス/q/カーソル付き管理者ユーザークエリ |
| `PATCH /admin/users/:id` | `{status:active\|disabled}`通常のユーザーは有効/無効にできます。保留中の場合は登録審査が必要です。 |
| `GET /admin/registration-reviews` | 管理者のレビューリスト |
| `POST /admin/registration-reviews/:id` | `{decision:approved\|rejected,message?}`、献身的レビュー |
| `GET /admin/stats` | 内容の許可なしでの集計統計 |
| `GET /admin/users/:id/resource-handover` | 無効なアカウントリソースインベントリ；管理者のみ |
| `POST /admin/users/:id/resource-handover/preview`, `POST /admin/users/:id/resource-handover/execute` | プレビュー／選択した所有権と権限を確認する；詳細は [リソースの引き渡し](admin-resource-handover.ja.md) |

連絡先の確認、復元、身元のリンク、セキュリティ確認、アカウントポリシー、およびコールバックが含まれている [認証](authentication.ja.md)プラットフォーム認証情報が使用される [サービス設定](service-credentials.ja.md); プラグインは別途使用される [暗号化された認証情報サービス](plugin-credentials.ja.md).

<a id="documents-permissions-and-history"></a>

## 文書、権限、履歴

| ルート | 目的 |
| --- | --- |
| `GET /resources`, `GET /resources/:id` | 承認リスト／詳細 |
| `POST /resources` | 文書/ライブラリを作成する。文書の形式はrich_text/markdown/スプレッドシート/プレゼンテーション/キャンバスです。 |
| `PATCH /resources/:id` | バージョンによるメタデータの更新 |
| `PUT /resources/:id/permissions` | バージョンによる許可設定 |
| `POST /resources/:id/transfer`, `POST /resources/:id/move` | 所有権の移転／移転 |
| `POST /resources/:id/copy` | 独立したコピー |
| `POST /resources/:id/trash`, `POST /resources/:id/restore` | ゴミ / 復元 |
| `GET /resources/:id/versions`, `POST /resources/:id/versions` | 歴史 / マニュアルスナップショット |
| `GET /resources/:id/versions/:versionId` | プレビュー：スプレッドシート/スライド/キャンバスのcanRestoreはfalseです |
| `POST /resources/:id/versions/:versionId/restore` | `{expectedSeq}`、リッチテキスト/Markdown用のマネージャー復元 |
| `POST /share/redeem` | ログイン済みプレビューまたは文書リンクの受け入れ |

コンテンツ編集には使用される `/api/v1/ws`；参照 [共同編集](collaboration.ja.md)フィールド、グレンソース、および継承はあります。 [権限](permission-inheritance.ja.md)共有と歴史はそこにある [文書ガイド](document-experience.ja.md).

<a id="comments-notifications-and-discovery"></a>

## コメント、通知、発見

コメントを作成してください。 `POST /resources/:id/comments` そして `{richBody,parentId,anchor?}`. `richBody` バージョン1の構造化コメントです。以前の通常テキスト版です。 `body` リクエストが拒否されました。更新してください。 `PATCH /resources/:id/comments/:commentId`コメントバージョンやrichBody/deleted/resolvedを提供。単一レベルの回答、画像、引用、アンカーについて説明されている。 [コメントと通知](comments-and-community.ja.md).

通知が使用される `GET /notifications`, `POST /notifications/read`、そして `POST /notifications/read-all`WebSocketの無効化により、新たな承認された読み取りが実行される。ディスカバリー、コレクション、最近の活動、および招待状に関する情報も含まれる。 [発見](public-resource-discovery.ja.md); 参照情報とアセットのダウンロードはここにあります [エディター統合](editor-integration.ja.md).

<a id="search"></a>

## 検索

`GET /search/documents` 現在読み取り可能な文書の検索。キーワードモードは通知とともにデータベースに切り替わる場合があります。ベクトルモードではMeilisearchとモデルが利用可能である必要があります。結果は現在のアクセス状況を再確認します。インデックスの含め方には許可はありません。

行政機関が使用する `GET/PUT /admin/search`, `POST /admin/search/reindex`, `POST /admin/search/reconcile`, `/admin/search/embeddings`, `/admin/search/embeddings/status`、そして `/admin/search/relevance`202番の設定結果は、キューに入っていることを意味し、クエリタスクが完了したことを示します。モデルや認証情報の変更には、設定を再適用する必要があります。画像認識ポリシーは現在、設定のみを保存するものであり、有効にすると検索用のOCRパイプラインが動作しなくなります。

<a id="files-and-storage"></a>

## ファイルとストレージ

アセットのアップロードが使用される `POST /assets?purpose=&filename=&resourceId=` アバター/カバー/アタッチメント/コメント画像と目的に応じた承認が必要です。ダウンロードには `GET /assets/:id/content`、と共に `?download=1` 添付ファイルの処理について。アバター/カバー/コメント画像は5MiBまで、文書の添付ファイルは20MiBまでです。通常のプラットフォームファイルは使用可能です。 `/files` 別々の制限があるルートとマルチパートワークフロー。

`GET /admin/storage` デプロイのサーバーを報告する `PUT /admin/storage` 405エラーが返されます。環境変数はサーバーと認証情報を設定します。詳細は参照してください。 [ファイルストレージ](storage.ja.md).

<a id="ai-knowledge-and-plugins"></a>

## AI、知識、そしてプラグイン

AIセッションや仕事で使用される `/ai`ツールは、セッションの範囲、実際のリソース権限、および承認を考慮します。 `POST /ai/jobs/:id/approval` 取る `{approvalId,approved}` ジョブの所有者からのものです。承認によってリソースのACLは変更されません。

`POST /mcp` 専用のBearerトークンを使用してStreamable HTTPを利用可能にする。個人設定は使用される。 `GET/PUT /me/mcp` そして `/me/mcp-services`; 企業統合に使用される `/admin/mcp-services` そして目標を達成しなければならない `userId` すべてのMCP操作において。サービスの更新/リセット/撤回には現在のバージョンが必要です。トークンは作成/リセット時のみ表示されます。詳細は [MCP設定、ツールの検出、ファイルの転送](mcp.ja.md).

知識ブックのコマンド、ワークフローの実行、人間のタスク、およびソースのサブスクリプションについて説明されている [ナレッジブック](knowledge-books.ja.md)統一された情報源を使用する `/content`；参照してください [コンテンツプロトコル](plugin-content.ja.md). プラグインをインストールしたビジネスルートを使用する `/plugins/:pluginId/...` そして、ロードされたリリースに依存する。ホストにはQuick-notesやメールビジネスAPIはない。詳細は [能力と限界](features.ja.md).

<a id="health-and-source"></a>

## 健康と出所

`GET /health`, `GET /live`、そして `GET /ready` 省略する `/api/v1` プレフィックスとホストのバージョンを報告する。Readinessはデータベースと設定されたRedisをチェックするが、すべての外部サービスを確認するわけではない。

出典： [アプリケーション](../apps/server/src/app/create-app.ts), [ルートディレクトリ](../apps/server/src/routes), [歴史](../apps/server/src/routes/experience.ts), [リアルタイムゲートウェイ](../apps/server/src/services/realtime/gateway.ts).
