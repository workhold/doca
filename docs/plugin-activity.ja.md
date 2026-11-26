<a id="plugin-recent-activity"></a>

# プラグインの最近の活動

[中文](plugin-activity.zh-CN.md)

2026-09-30に実装され、公開的にエクスポートされました `@smartdoca/plugin-sdk/platform`このインターフェースを含むSDKアーティファクトとホストを使用してください。ソースの利用可能性だけでは、新しいnpmパブリックを確立することはできません。

<a id="storage-and-ownership"></a>

## 保管と所有権

プラグインは登録される `activityServiceToken` (`activity.v1`). 彼らはホストが管理する永続性機能を利用して、訪問記録、歴史データの検索、現在のビジネス承認、および削除・クリーンアップ機能を所有している。このサービスは単にソースデータを集約するだけであり、ビジネスミラーや特別な訪問記録記述エンドポイントを作成しない。使用する [現在の管理型ストレージ契約](plugin-horizontal-scaling.ja.md).

内蔵レコードは残ります `resource_visits` そして `workspace_activity`この増分はテーブルを変更せず、履歴を移動させず、二重書き込みも生じさせなかった。公開ディスカバリーページでは `/workspace/recent?publicOnly=true` コレクションロジックは内蔵リソースに適用されます。アクティビティの登録は、発見、お気に入り、検索、またはAIの登録には適用されません。

削除では実行時登録が削除され、そのソースの開放/掲載が停止されます。保存された記録は残ります。クエリを再有効化することで現在のプラグインデータが利用可能になります。実際のインストール/無効化はホストの再起動に基づくライフサイクルに従います。

<a id="registration"></a>

## 登録

```ts
import {
  activityServiceToken,
  permissionsServiceToken,
  type ActivitySource,
} from "@smartdoca/plugin-sdk/platform";
```

両方のトークンを宣言する `injections.required`ホストがいない `activity.v1` それを必要とするプラグインを拒否する。プライベートテーブルや古いエンドポイントは代替手段ではない。アクティビティを使用しない既存のプラグインは、新たな登録を必要としない。 `register(source)` ディスポーズャを返す。スコープ付きインジェクションにより、それがプラグインの効果に結びつけられ、シャットダウンや初期化失敗時に解放される。

各コンテンツタイプごとに1つのソースを登録してください。例えば `example.mail.messages` そして `example.mail.threads`:

| フィールド | 要件 |
| --- | --- |
| `id` | ユニークなプラグイン接頭辞付きのソースID、最大150文字 |
| `pluginId` | 注入されたプラグインのIDと一致する必要があります |
| `schemaVersion` | 正確に `1`; サポートされていないバージョンは登録に失敗する |
| `resourceType` | 登録済み `permissions.v1`; アイテムIDはその種のリソースを識別する |
| `title` | `en` そして `zh`フィルターやソースラベルについては、各100文字まで |
| `icon` | `file`, `mail`, `calendar`, `message`, `task`, `book`、または `folder` |
| `list(context, input)` | 現在のユーザーの読める訪問ページ |
| `get(context, id)` | 再承認が必要な現在の記録/タイトル/パス、またはnull |

IDとリソースタイプは小文字で始まり、点やハイフンで区切られたアルファベット文字と数字のセグメントを使用します。各インスタンスは最大64個のプラグインソースを許容し、重複するIDは拒否されます。ビジネスリソースは無制限ですが、ページングが必要です。

ホストが作成するコンテキストは `{principalId, signal}`主キーは、ブラウザで選択されたユーザーではなく、認証されたセッションから来ます。ある項目はこの形状をしています。

```ts
{
  id: "message-123",                  // 唯一资源 ID，1–500 个可见 ASCII 字符
  title: "季度预算讨论",              // 原始内容标题，非空，最长 500 字符
  visitedAt: "2026-09-30T09:20:00.000Z",
  path: "/mail/inbox?message=message-123"
}
```

`id` 1～500文字の可視化可能なASCII文字を含む。タイトルは空でなく、最大500文字までである。 `path` スラッシュと文字/数字で始まり、オリジン、ハッシュ、バックスラッシュ、制御文字が含まれていない。外部/プロトコル相対アドレスは禁止される。クエリ値をエンコードする。ビジネスタイトルは元の内容を保持する。タイプ名は使用する `title.en/zh`.

<a id="pagination"></a>

## ページ番号表示

`list` 取る `{until, after, limit}` そして戻る `{items, hasMore}`:

1. ユーザー/ソース/リソースごとに最新の訪問を1つ返す、順序付きで `visitedAt DESC, id ASC` ASCIIバイナリID順序で。
2. ミリ秒を含むUTC ISO文字列を使用し、それだけに限る `visitedAt <= until`.
3. `after=null` 始める。そうでなければ要求する `visitedAt < after.visitedAt`、または同等の時間で `id > after.id`記録が削除された後も、境界線は使用可能です。
4. `items.length <= limit`; ホストは現在最大51件のリクエストを行います。短いページも許可されます。残りの記録は `hasMore=true` そして、少なくとも1つ返されるアイテムがあること。空のページは再試行の意味ではない。
5. ユーザーの訪問者と現在の権限を先にフィルタリングする。ホストも確認する。 `activity.read` すべての項目について、必要に応じてさらに取得します。最大20バッチ、各ソースあたり1.5秒で、権限チェックも含まれます。インデックスを使用し、キャンセルを尊重し、クエリ内でのリモート完全同期を避けましょう。
6. リストは訪問数を更新しません。訪問数は、ビジネスコンテンツを正常に開いた後にのみ記録されます。通話や未消費の候補は再発する可能性があります。

ホストは、訪問時間が短い順、ソースIDが小さい順、次にリソースIDが小さい順にページをマージします。内蔵ソースは `doca`、と共に `kind:id` リソースキー。不透明な次のカーソルはユーザー/フィルターを結合し、最初のものを保持する。 `until`選択されたソースと消費された位置。

このリストは、固定されたデータベースのスナップショットではなく、現在の権限を反映しています。再読み込み時に新しい訪問が表示されます。削除、無効化、または更新された訪問時間により、ページングチェーンから記録が削除されることがあります。一貫性のある個々のページの読み取りには、マネージドトランザクションを使用してください。

失敗、タイムアウト、有効でないページング/パス、または権限不足の場合、サービスはそのソースの全ページを破棄し、他のソースは保持します。失敗したソースは、そのトラバースの後のページではスキップされ、表示されません。 `unavailableSources`; 更新の再試行。新しく登録されたソースも更新が必要です。

<a id="example"></a>

## 例

これ `mount(context)` 例ではプラグインによる実装が必要です `mailStore`現在のホスト管理サービスを継続して利用する。 `mailStore` SDKのエクスポートではありません。

```ts
const pluginId = "example.mail";

context.inject(permissionsServiceToken).register({
  pluginId,
  resourceType: "message",
  async authorize(principalId, messageId, action) {
    if (action !== "activity.read") return false;
    return mailStore.canRead(principalId, messageId);
  },
});

const source: ActivitySource = {
  id: `${pluginId}.messages`,
  pluginId,
  schemaVersion: 1,
  resourceType: "message",
  title: { en: "Mail", zh: "邮件" },
  icon: "mail",
  async list({ principalId, signal }, { until, after, limit }) {
    // 业务实现：按用户、当前权限、until、after 过滤，再依协议排序。
    // 可读取 limit + 1 条以判断 hasMore；只返回前 limit 条。
    return mailStore.listRecent(principalId, { until, after, limit, signal });
  },
  async get({ principalId, signal }, id) {
    // 必须确认这个用户有该访问记录，资源仍存在且当前仍可读。
    return mailStore.getRecent(principalId, id, { signal });
  },
};
context.inject(activityServiceToken).register(source);
```

追加 `activity.read` 同じプラグイン/リソースタイプを二度登録するのではなく、既存の権限登録に使用する。プラグインの認証済みopen-mail APIがコンテンツを正常に読み取った後、セッションのユーザーIDをその訪問表に更新する。削除時には、その表をクリーンアップするか、結合を通じて削除された項目をフィルタリングする。ホストは自分が所有していない記録をクリーンアップすることはできない。

<a id="host-entry-points-and-authorization"></a>

## ホストのエントリポイントと認証

- `GET /api/v1/workspace/activity`認証済みの混合リスト；内蔵機能を利用可能 `kind`, プラグイン `source`、そして `cursor`. `kind` そして `source` 互いに排他的です。返す `items`, `nextCursor`, `sources`, `unavailableSources`.
- プラグインアイテムがあります `kind=plugin`, `sourceId`, `sourceTitle`、そして `icon`UIキーにはソースIDが含まれています。
- `href` 指摘する `/api/v1/workspace/activity/open?source=...&id=...`司会者がアカウント/ソースを再確認する`activity.read`呼び出す `get` 現在のパスに対して、再認可し、その後リダイレクトします。失敗時は404です；歴史的スナップショットを使ってリダイレクトすることはありません。
- ターゲットページとビジネスAPIは独立して認可されます。アクティビティでは、添付ファイルや関連文書へのアクセスは許可されません。

<a id="acceptance-and-rollback"></a>

## 受け入れとロールバック

`tests/plugin-activity.test.ts` そして `tests/workspace-home.test.ts` 隔離されたデータベースやインストールディレクトリを使用する。これらは、等時順序、トラバース、短いページの継続、削除、クロスユーザーアクセス、撤回、登録解除、失敗/タイムアウト、安全でないリダイレクト、無効なカーソル、実際のパッケージの注入、およびHTTPの開放といった機能をカバーする。

この機能により、永続的なテーブル変更は生じませんでした。ホストを復元する際もプラグインの履歴が保持されます。必要なプラグインは… `activity.v1` それがないホストを拒否する。ロールバックのためにビジネスデータを削除しないでください。
