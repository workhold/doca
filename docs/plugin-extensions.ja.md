<a id="public-reads-and-ui-extensions"></a>

# 公開読み取りとUI拡張機能

[中文](plugin-extensions.zh-CN.md)

このリファレンスでは、公共の読み取りサービスや再利用可能なWebコマンド、ビュー、配置方法について説明しています。元の読み取り/UIの追加機能はSDKのソースコードに含まれています。 `0.1.4`; 入力された文書要素 `0.1.6`現在のホストでは、SDKを使用してください。 `0.1.9` そして、一致することを宣言する `sdkRange` 例えば `^0.1.9`APIを利用する前に、インストールされたホストとビルドされたSDKアーティファクトを確認してください。ソース実装だけでは、npmアーティファクトやデプロイが更新されたことを証明できません。

<a id="public-services"></a>

## 公共サービス

| サービス／輸出 | 方法 | 目的と境界 |
| --- | --- | --- |
| `users.v1` / `@smartdoca/plugin-sdk/platform` | `me`, `searchPage`, `resolveDirectory`, `validateSelection` | オーナー管理者は、すべてのディレクトリポリシーを無効にすることができる；検索機能では公開表示の予定が表示される；自己プロフィールの読み取りは別途行う |
| `permissions.v1` | `registerDirectory` | 内部モジュールとプラグインは共有される `DirectorySource`関連モードのみがソースを呼び出し、候補者を検証し、ユーザーIDをマージする |
| `documents.read.v1` / `@smartdoca/plugin-sdk/documents` | `get`, `readSnapshot`, `capabilities`, `references` | 文書のメタデータ、完全に保存されたネイティブコンテンツ、現在の機能、および参照情報。内部の共同編集サービスとは別です。 `documents.v1` |
| `libraries.v1` / `@smartdoca/plugin-sdk/documents` | `list`, `children`, `path` | 検索可能なライブラリ、ページングされた直接子オブジェクト、承認された祖先パス；コンテンツには独自の承認が必要 |
| `files.v1` / `@smartdoca/plugin-sdk/files` | folders/files/uploads/bindings/content/receipts | フォルダ構造、ファイル情報、認可されたストリーム、添付ファイルの結合、アップロード、および受領書 |
| `content.v1` / `@smartdoca/plugin-sdk/content` | `list`, `read`, `resolve`, `search` | コンテンツの検索、分析、知識の取得；ネイティブの文書構造には代わりにはならない |

トークンは `usersServiceToken`, `permissionsServiceToken`, `documentReadServiceToken`, `librariesServiceToken`, `filesServiceToken`、そして `contentServiceToken`サーバーの要件を宣言する `injections.required` そして、それを通じて実装を得る `context.inject(token)`関係源を提供する場合にのみディレクトリソースを登録する。ソースIDはプラグイン名前空間に属していなければならない。登録はライフサイクルが担当し、そのディスポーズヤーは実行時の貢献のみを解放する。

`DirectorySource` schemaVersion 1と関連する/検証用プロトコルを保持している。内蔵ドキュメントや共有フォルダもソースを登録する。none検索では候補が表示されない；使用する `me` 自己で読み取る。すべてのクエリは、ソースを呼び出すことなく、直接アクティブサイトアカウントから実行される。関連する集計は、アクティブソースを並行して処理し、候補者を検証し、アカウントの状態をフィルタリングする。ソースからの候補者は、エラー、繰り返しのカーソル、予算超過、または実行中の未登録の場合に却下される。ページングされた結果は、部分的なソースの失敗を報告する。 `complete: false`各ソースには2秒の予算があり、最大40ページ、そしてページあたり最大250人の候補者が含まれます。

`searchPage({query,cursor?,limit?})` 返却 `{items,nextCursor,complete}`制限値は1～100で、デフォルトは20です。カーソルは呼び出し元、クエリ、および有効なディレクトリモードを結びつけます。各ページで再認証が行われます。ページング中にポリシーが変更されると409が返され、1ページから再起動が必要になります。 `resolveDirectory({ids})` そして `validateSelection({ids})` 最大100件のIDを受け入れ、現在のディレクトリを再確認します。アカウントを発見しても共有、割り当て、またはビジネスリソースの権限は付与されません。既存の `search` 依然として最大20件の要素からなる配列を返す；信頼できるサーバー専用 `list` ブラウザに露出されていない。

`readSnapshot({documentId,expectedRevision?})` 返却 `{documentId,format,codec,schemaVersion,revision,epochId,seq,content,assets}`サポートされるフォーマットは、リッチテキスト、マーデミクス、スプレッドシート、キャンバス、プレゼンテーションです。コンテンツは、要約やYjs更新ではなく、エディターのネイティブモデル（マーデミクスでは文字列）です。レビジョンは、実際のコンテンツ、コーデック/スキーマ、エポック/シークの情報を含む不透明なコンテンツ識別子であり、メタデータバージョンとは別物です。期待されるレビジョンが一致しない場合は409を返します。共同編集のエポックがない状態で保存されたリッチテキストは返されません。 `epochId: null` エポックを生み出さない状態で。保持されている状態が欠けている場合、初期化せずに409を返す。上記の16MiBを超えるJSONボディは413を返す。

一貫性のあるトランザクションにより、保存されたコンテンツを復元する際、保存されていないエディターの変更や、コンテンツ、履歴、ACKの記述は含まれません。アセットは、ストレージキー、物理的なパス、保存された一時的なURLを除き、現在許可されている安定したfileId/name/mimeのみを表示します。capabilitiesは現在のリソース権限とスナップショットサポートを記述していますが、公開ドキュメントの書き込みサービスを意味するものではありません。

図書館のリスト／子供の返却物 `{items,nextCursor}`ホストの現在の100項目のページを使用して、子供たちが受け入れる `{libraryId,parentId,cursor?}` rootでparentIdがnullの場合；pathは受け入れられる `{resourceId}`発見と読み取りは異なる：目に見えるタイトルにはrole=noneの設定があるかもしれますが、本文へのアクセスは拒否されている。各ページがアクセスを再確認するため、凍結されたインベントリを表すわけではない。不完全なトラバースでは、コンテンツが削除されたと判断することはできない。

<a id="browser-and-app-webview"></a>

## ブラウザとアプリのWebView

`PluginWebHost.platform` これらのアプリケーションサービス用のタイプ化されたクライアントを提供します。

```js
const page = await host.platform.users.searchPage({ query: "张", limit: 20 });
const self = await host.platform.users.me();
const snapshot = await host.platform.documents.readSnapshot(
  { documentId }, { signal: context.signal },
);
const children = await host.platform.libraries.children({ libraryId, parentId: null });
const folders = await host.platform.files.folders.list({ parentId: null });
```

ユーザーのクライアントにはme/searchPage/resolveDirectory/validateSelectionが含まれます。ドキュメントやライブラリは上記のすべての読み取り機能を提供し、ファイルはfolders.get/listやfiles.get.listを提供します。ファイルの書き込み、コンテンツストリーム、添付ファイルのダウンロードにはサーバーが使用されます。 `files.v1` または既存のアタッチメント機能もあります。ストリームはJSONではありません。

認証済み通話が使用される `POST /api/v1/plugin-platform/{pluginId}/{operation}`インストールされたプラグインの名前空間と明示的にリストされた操作のみが受け入れられます。入力ではプリンシパル、モード、または任意のサービス名を指定することはできません。応答はキャッシュされません。既存のもの `host.request` プラグインに限られる `/api/v1/plugins/{pluginId}/` API.

モバイルプラグインは、単一のプラグインに限定されたホストが発行するWebViewセッションを使用する。公開された呼び出しはその名前空間内に留まる必要があり、サーバーは依然として現在のユーザーとリソースの権限をチェックする。プラグインはネイティブのベイヤートークンを受け取らない。孤立テストではHTTPセッションの境界がカバーされる。これらのカードや文書の配置はWeb UIの実装であり、ネイティブのモバイル配置はデバイス上で実装も承認もされていない。

<a id="commands-views-and-placements"></a>

## コマンド、ビュー、配置

ウェブページルートレンダーはホストが所有するものを受け取る `PageHeader` 彼らの中のコンポーネント
ルートコンテキスト。レンダリング `<context.PageHeader title={title} actions={actions} />`
グローバルコントロールと共に、Reactコンテンツをワークスペースのトップバーに配置する。
ホストがマウント対象を所有しており、ページが表示されるとポートレットのコンテンツを削除する
アンマウント。プラグインはホストのDOMセレクターを問い合わせたり、ホストのソースをインポートしたりしてはならない。使用する
ワークスペースのトップバーがないモバイルプラグインシェル内のインラインヘッダー。
このエントリには現在のソースホストが必要です。古いホストアダプターはありません。

`WebPluginBundle` 3つのオプションのコレクションが含まれています。

- コマンド：id/プラグインID/タイトル/supportedContexts/executeを持つ再利用可能なアクション。
- ビュー：id/pluginId/title/supportedContexts/renderを持つ再利用可能なビュー
- 配置：id/pluginId/slot/order?/conditions?を参照するレコードをマウントする。これは1つのcommandIdまたはviewIdを正確に参照する。viewはダイアログ/ドレワー/サイドバー表示を指定することができる。そうでない場合は、その場所で表示される。

タイトルは使用される `{zh,en}`IDはプラグイン名前空間に属します。supportedContextsはglobal/home/document/library/folder/resourcesです。conditionsはフィルター、targets、resourceKinds、format、capabilitiesを定義します。サポートと可視性は表示ルールであり、サーバー認可とは別物です。重複したID、有効でないスロット、参照が欠けているもの、クロスプラグイン参照は、バンドル全体を拒否し、登録された貢献を取り消します。

アイコンのみのコマンド/表示項目は、設定されたプラグインストアと同じPNGブランドを使用します。ホストは認証された状態でそれを提供します。 `GET /api/v1/plugin-icons/<id>` Webアセットを使用したストア/NPMインストールを実行するため；ローカルインストールでは一般的なアイコンが保持される。ストアの詳細は既存のストアプロトコルで検証され、同じプラグインのリクエストは保留中の読み取り状態となり、成功・失敗・失敗は60秒間のみホストメモリにキャッシュされる。読み込み中、ストアアイコンが存在しない場合、または画像が読み込めない場合でも、エントリーは一般的なアイコンを保持し、使用可能な状態が保たれる。既存のプラグインバンドル、SDKバージョン、保持データは変更されず、アイコンの宣言、変換、または移行は必要ない。このホスト変更を元に戻すことで、以前の表示状態が復元される。

| Webスロットを実装した | 文脈 |
| --- | --- |
| global.more | グローバルアクションは、web.moreナビゲーションと同じ右上のアプリアイコンを使用します。アクション/ビュー項目は、ホバリング時にラベルが表示されるアイコンを使用します。両方のフィルタリングセットが空の場合は非表示になります。 |
| global.leftMore | グローバルアクションは、web.leftMoreナビゲーションと同じ左側のMoreドロップダウンを共有します。両方のフィルタリングセットが空の場合は隠れます。 |
| home.cards / home.actions | ホームカードとショートカット |
| document.toolbar / document.menu | 文書ID、形式、および現在の権限；同じ操作が両方を占めることがあります |
| document.sidebar / document.status | サイドバーとステータスコンテンツ；狭い画面ではサイドバーが文書の本文に沿って表示される |
| library.toolbar / library.nodeMenu | ライブラリエントリーとディレクトリノード |
| フォルダー・ツールバー / フォルダー・行メニュー | 現在のフォルダまたは行リソース |
| resource.bulkActions / resource.details | 非空の選択肢と文書詳細の拡張機能 |

コンテキストには、実体や完全なユーザーディレクトリを自動的に提供せず、スコープ/ターゲット/ロケール/リソース?/リソース?/能力/シグナルが含まれます。ホストはresource.read/comment/edit/manage displayの機能を提供します。ファイルの配置にはまだ統一された能力プロジェクションが存在しないため、欠如がアクセス権限を確定するものではありません。

ナビゲーション管理ラベル `web.more` 右上に「More and」 `web.leftMore` 左側に。管理者は、サーバーのナビゲーションでAllowSlotsが明示的に含まれている後にのみ、左側にプラグインページを配置できる。 `web.leftMore`; 内蔵のユーザーエントリは両方をサポートしています。 `global.leftMore` グローバルコンテキストをサポートする、別個のオプションのクライアントコマンド/ビュースロットです。プレゼンテーションのないビューはメニュー内で展開されます。

2026-10-02に確定された既存の規則は有効です `web.more` そして `global.more` 右上にあります。既存の設定は移行されず、既存のプラグインは自動的に左スロットを取得しません。Left Moreは明示的な宣言/設定が必要であり、自動的なオーバーフローは受け付けません。1つのエントリーが両方のMoreスロットを明示的に占めることができます。その他の重複削除/オーバーフロールールは変わりません。ナビゲーションストレージではschemaVersion=1を使用します。左スロットサポートのないホストにリロールバックする前に、web.leftMoreのすべての設定を削除して公開してください。古い厳格なバリデーターではそれを変換できません。また、新しいクライアント/サーバースロットの宣言を取り消すか、プラグインをリロールバックしてください。

このブラウザESM例は、ホストのソースパスを一切使用しない。

```js
export default host => {
  const pluginId = "example.tools";
  const viewId = "example.tools.preview";
  return {
    manifest: { pluginId, version: "1.0.0", targets: ["web"] },
    views: [{
      id: viewId, pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      render(context) {
        return host.React.createElement("p", null, context.resource.title);
      },
    }],
    commands: [{
      id: "example.tools.open", pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      execute(context) {
        host.ui.openView({ viewId, presentation: "dialog", context });
      },
    }],
    placements: ["document.toolbar", "document.menu"].map((slot, index) => ({
      id: `example.tools.placement${index}`, pluginId, slot,
      commandId: "example.tools.open",
    })),
  };
};
```

ビューはホストのReactインスタンスを使用し、依存関係をバンドルする。ホストはプラグインのESMにおける裸のnpmインポートを解決しない。レンダリング/子コンポーネントのエラーは孤立し、拒否されたコマンドプロミスにはフィードバックが表示され、実行ボタンは無効になる。プラグインで作成されたイベントハンドラーや非同期処理は、エラーやキャンセルを自分自身で処理しなければならない。

コンテキストが変わったり、コンポーネントがマウント解除されると、インストール中のコマンド/ビューシグナルがキャンセルされます。ダイアログやドロワーを開くと、コンテキストがパネルの自身のセッションに移動するため、トリガーされたメニューを閉じてもそのセッションは破壊されません。パネルを閉じたり、ルートを変更したり、別のパネルを開いたりすると、そのセッションがキャンセルされます。古い閉じるハンドルでは、新しいパネルを閉じることはできません。これらのリソース操作では、選択ハンドルや未保存モデルの書き込み契約は利用できません。

<a id="capability-boundaries"></a>

## 能力の限界

選択/ブロック/挿入位置、文書の変更コマンド、公開コメント/履歴、共有招待、公開AIの実行、イベントフィールドの範囲、およびテーマの貢献には、それぞれ独自の契約と実装が必要です。この読み取り/UI拡張機能は、任意のグローバルCSS/DOMの変更を行ったり、レイアウトの永続性、データベースのマイグレーション、または保存形式の変換を導入したりすることはありません。

テンプレートと資料には、もう別のものがある [創造リソース契約](creation-resources.ja.md)公開パッケージ、文字列トークン、プラグイン名空間、ライフサイクル/ディスパーサー、認証済みコンテキスト、型付きクライアントを再利用します。既存のdocument_templatesテーブルをプロバイダーに変換することはありません。files.v1とcontent.v1は既存のセマンティクスを保持します。

<a id="verification-record"></a>

## 検証記録

元の孤立チェックには、ディレクトリの集約/非登録/ポリシー変更、5種類のフォーマットに対するネイティブモデルと改訂、拒否された候補者後の承認ページング、トラバース、登録ロールバック、パネルキャンセルと古いハンドル、HTTP許可リスト、およびクロスプラグインモバイルセッションの拒否が含まれます。

`pnpm build:plugin-sdk` リリースアーティファクトを作成する。 `node scripts/verify-plugin-sdk.mjs` アーティファクトを一時的な独立したnode_modulesにコピーし、JavaScriptを実行し、ホストパスマッピングなしでNodeNextプロジェクトの.d.tsをチェックする。npmパッケージを公開したり、ユーザーのプラグインディレクトリにインストールしたりすることはない。

ホームカード、右上の「More」、ドキュメントメニュー/ツールバー、デスクトップサイドバー、スナップショットダイアログなどのブラウザ内で孤立した例が確認されました。2つの個人用プラグインと物理的なモバイルデバイスは、それぞれ独自の承認が必要です。2026-10-02に記録された実行は、型チェック、162ファイルのテスト（1021ファイルが通過、3ファイルがスキップ）、SDKビルド/独立利用、Webビルド、空白チェックを通過しました。これらは歴史的な結果であり、このページを読むことで再実行されるチェックではありません。

<a id="document-plugin-elements"></a>

## 文書のプラグイン要素

SDKソース `0.1.6` オプションのWebバンドルを導入した `elements` そして `@smartdoca/plugin-sdk/editor-elements`. 原子化リッチテキストのインライン要素、全セルスプレッドシートキャンバスレンダリング、および設定フォームをサポートします。ホストはネイティブコマンドとアンドゥを通じて設定をコミットし、プラグインは無制限のエディターハンドルを受け取りません。不明なタイプ/バージョンはエラーパラメータを表示し、変換、移行、またはクリーンアップを行わずに元のJSONを保持します。デフォルトではいかなるプロバイダもインストールされていません。詳細は…を参照してください。 [エレメント契約](plugin-editor-elements.ja.md) そして [スタンドアロン型カウントダウン/ニュースリンクの例](../examples/plugin-elements/README.md)ソースの受け入れは、npmの公開、実装のインストール、またはデバイスの受け入れを意味するものではない。
