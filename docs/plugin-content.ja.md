<a id="content-providers-contentv1"></a>

# コンテンツプロバイダー：content.v1

[中文](plugin-content.zh-CN.md)

公開入場は `@smartdoca/plugin-sdk/content`ホストが契約と呼び出し境界を定義し、プラグインがビジネス行動を実装する。内蔵ドキュメントやファイルは同じインターフェースを通じて登録される。ソースを登録しても、すべてのソースが自動的にAIに公開されるわけではない。

<a id="contract"></a>

## 契約

- `sources(context, purpose)` ソース宣言を発見する。
- 情報源が必要 `list`, `read`、そして `resolve`. オプション `search` 能力宣言と完全に一致しなければならない。
- `list(context, {config, cursor, limit})` 軽量なものを返す `{items,nextCursor,snapshot}`各項目には含まれています `ref:{sourceId,resourceId,blockId}`, `fingerprint`、そして `title`、任意で `order`, `anchor`、そして短い `excerpt`. 体 `text` 禁止されている。
- `read(context, {config,ref,fingerprint})` リストのフィールドと、選択されたブロックを返します `text`または、現在読み取り不可能な場合はnullです。変更された指紋は衝突を引き起こし、再番号付けが必要になります。
- `resolve(context,ref)` 再承認し、返還する `{path,fingerprint}` またはnull。パスはアプリケーション内に必ず存在しなければならない。
- `search(context, {config,cursor,limit,query})` 同じ軽量リストを返します。ソースは検索機能を実装しており、ホストは全身スキャンを行いません。

サービスリスト/読み取り/検索の呼び出しも含まれる `sourceId` そして `purpose`コールバックは実際の値を受け取る `principalId`, `purpose`、そして `signal`各呼び出しではアカウント、設定された範囲、現在の権限がチェックされます。ボディから提供されるユーザーIDは信頼できません。ホストは呼び出し前後でユーザー/ソースのライフサイクルをチェックし、20秒のタイムアウトを適用します。

```ts
const content = context.inject(contentServiceToken);
content.register({
  id: "example.tasks.content", pluginId: "example.tasks", version: 1,
  title: { zh: "待办", en: "Tasks" }, contentTypes: ["task"],
  purposes: ["analysis", "knowledge"], capabilities: { search: false },
  configSchema: { type: "object", additionalProperties: false, properties: {} },
  list: listAuthorizedTaskBlocks,
  read: readAuthorizedTaskBlock,
  resolve: resolveAuthorizedTaskBlock,
});
```

このプラグインは3つのコールバックをすべて実装しています。プライベートホストテーブルやソース、または他のプラグインのデータベースを読み取ってはなりません。

<a id="reconciliation"></a>

## 和解

消費者は、現在のIDとサブスクリプション設定の下に参照情報や指紋を保存しています。完全な探索が終了した後、変更されていないブロックは読み取りやAI分析の必要はありませんが、変更されたブロックは直接読み取られます。成功した完全なトラバースのみが消失を確定させます。タイムアウト、失敗したページ、変更されたスナップショット、不確かな権限は、空の集合や消費された指紋として扱われることはありません。

`cursor=null` 始まる； `nextCursor=null` 終了。トラバースのスナップショットは一貫性を保つ必要がある。カーソルはページを一覧表示するものであり、永続的なインクリメントログの位置ではない。内容、範囲、または権限が完全性を失った場合、古いカーソルは拒否される。別途 `listChanges`/`readChanges` 必要ではありません。

制限：ページごとに100件、ブロックごとに200万文字、完全な在庫では100,000ブロック。ホストは参照、重複、カーソル、キャンセルを検証します。分析ヘルパーは変更されたテキストの総量を制限し、オーバーフローが発生した場合は切り捨てることなく、完全性を主張する代わりに明確に失敗します。

内蔵ソースは段落アドレス機能を使用します。変更されない段落の前に段落を挿入しても、そのアイデンティティは変わりません。本文の編集では、古いブロックが削除され、新しいブロックが作成されます。これらはネイティブエディターの安定したノードIDではありません。重複ブロック、見出しコンテキスト、長い段落のスライシングルールは含まれています。 [指紋記録](content-fingerprint-reconciliation.md).

<a id="host-apis-and-consumers"></a>

## ホストAPIと消費者

HTTP： `GET /api/v1/content/sources?purpose=analysis`; POST `/api/v1/content/list`, `/read`, `/resolve`, `/search`IDはホストセッションから来ており、レスポンスにはstoreは使用されない。

グローバル検索は、検索を宣言するソースのみを呼び出します。プラグインのビジネス範囲には適用できない文書/ライブラリフィルターは、そのプラグイン結果を除外します。クリックすると、アクセスが再び有効になります。

ネイティブライブラリはソース登録を保持する `knowledge_subscriptions` そして `knowledge_source_groups.config`彼らはキュレーションの仕事や派生エントリ、消費型指紋ミラーを生み出しません。POST `/api/v1/knowledge/libraries/:id/content-subscriptions` 取る `{sourceId,config,title}` そして、知識的な目的が必要です。プロバイダーの範囲を変更できるのは貢献者のみです。

ナレッジブックは実行時に完全な承認済み在庫を独立して記録し、出版前に再検証されます。証拠は保持されます。 `contentRef`ソースバージョン、コンテンツハッシュ、正確な引用スニペット。プロバイダー、バインディング、貢献者、または元のソースの許可が利用できなくなると、アクセスは停止します。保持されているデータはアクセスを許可しません。追加の完全なプロバイダー本体ストアはありません。

ソースピッカーは基本的なスキーマフォームを提供します。複雑なネストされた設定には、プラグイン独自のページが必要です。 `PUT /api/v1/knowledge/libraries/:id/content-source-groups/:groupId` 作成パラメータを受け取ります。スコピングプリンシパルのみがスコープを変更できます。変更は後続のソース読み取りに影響します。

`knowledge.sources.v1` 自動的に適応されない `content.v1`ビジネスプラグインは公開標準を実装しています。ナレッジブックは新しいベースラインを使用しており、歴史的な変換や古いプロトコルアダプタは提供されません。
