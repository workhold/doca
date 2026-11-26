<a id="doca-plugin-store-protocol-v1"></a>

# Docaプラグインストアプロトコルv1

[中文](plugin-store-protocol.zh-CN.md)

2026年9月30日に更新され、以下に現在の必須項目とナビゲーションの注意事項が記載されています。 **リモートストアの実装ではこのプロトコルが使用されます。** これは、以前のフルカタログ/ストアホスト型ZIP版の草案を上回るものです。その草案は承認されたエンドポイント契約ではありません。

ZIP/npmインストール、共有アーカイブ、マルチインスタンスの起動復元、リモートページネーション、更新チェック、詳細情報、およびWeb/Appナビゲーションはソースコードで実装されています。外部ストレージや独立したプラグインは、以下の受け入れチェックを必要とします。ソースコードの実装により、すべての外部サービスが正常であるとは限りません。現在のSDKは `0.1.9`インストールされたホストのバージョンやパッケージのエクスポート内容と、例を照合して確認する。

<a id="_1-responsibilities-and-deployment"></a>
<a id="1-responsibilities-and-deployment"></a>

## 1. 責任とデプロイ

- npmレジストリでは、完全なプレコンパイルされたパッケージが配布されています。ストアにはZIPファイルのダウンロードエンドポイントはありません。レビューには、実際のnpmパッケージのバイトデータを確認する必要があります。
- リモートストアにはメタデータ、カテゴリ、リリース情報、承認/撤回情報、いいね/ダウンロード統計、およびリッチテキストの詳細が含まれています。
- Docaは管理者権限、インストールトランザクション、整合性検証、共有アーカイブ、実行バージョン、Web/Appエントリ、およびレイアウトを所有しています。
- 「いいね」やGitHubログインはリモートサイトで行われます。Docaはいいね数を表示し、クリック時に新しいページを表示します。リモートログインの認証情報は収集せず、いいねAPI、OAuthコールバック、アカウント結合も実装していません。
- 手動でのnpmインストールや、ローカルのZIP/ディレクトリ形式でのインストールは引き続きサポートされています。レビューされたカタログ外のパッケージは「未レビュー」と表示されます。npmディストリビューションだけでは正式な承認ではありません。

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGIN_NPM_REGISTRY=https://registry.npmjs.org
DOCA_PLUGINS_DIR=/data/plugins
```

ストア/レジストリアドレスは、認証情報、パスプレフィックス、クエリ、またはフラグメントが含まれないHTTP(S)オリジンです。空値はデフォルト値が使用されます。v1ではプライベートレジストリログインはサポートされていません。Docaサーバーのプロキシは、ブラウザのCookie、認可情報、ユーザーID、またはビジネスデータなしでリクエストを保存します。リモートサービスにはブラウザのCORSは不要です。

APIプレフィスは `/api/v1`JSONはUTF-8形式であり、レスポンスにはprotocolVersion:1が含まれます。時刻はUTC ISO 8601形式です。数値は非負の安全整数であり、不明な場合はnullです。不明な数値は0になってはなりません。すべてのエンドポイントは公開の読み取り専用であり、ストレージログインは不要です。

<a id="_2-public-types"></a>
<a id="2-public-types"></a>

## 2. 公開型型

<a id="pluginsummary"></a>

### プラグイン概要

```json
{
  "id": "example.mail",
  "name": "Mail",
  "summary": "Send and receive mail across multiple accounts.",
  "author": { "name": "Example", "url": "https://github.com/example" },
  "categoryId": "productivity",
  "icon": null,
  "detailPath": "/plugins/example.mail",
  "targets": ["web", "mobile"],
  "review": "approved",
  "official": false,
  "latestVersion": "1.2.0",
  "downloads": { "count": 1234, "period": "last30Days", "source": "npm", "asOf": "2026-09-30T00:00:00Z" },
  "likes": { "count": 42, "asOf": "2026-09-30T00:00:00Z" },
  "updatedAt": "2026-09-29T12:00:00Z"
}
```

制約条件：

- idはmanifest.idと一致します。 `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`最大100文字。
- name/author.name：1～160文字；summary：最大300文字；すべて平文。
- author.url：HTTP(S) URL。ユーザーのクリックの場合はnullであり、自動的なホストの取得は行われない。
- カテゴリID：1～60文字に合致 `[a-z0-9-]+`ページから推測するのではなく、カテゴリを別々に取得する。
- アイコン：PNGデータURLまたはnull、最大24KiBのエンコードされたデータ；SVG、スクリプト、またはリモート画像URLは含まれない。
- detailPath: 同じオリジン絶対パス `/plugins/<id>`設定されたオリジンと組み合わせる。外部オリジン、クエリ/フラグメント、トラバースを拒否する。新しいウィンドウではnoopener、noreferrerを使用する。
- ターゲット：非空で重複が除去されたウェブ/モバイルアレイ。モバイルとは、動的なネイティブコードではなく、制御されたApp WebViewを意味する。
- レビュー：承認/停止。デフォルトでは承認になりますが、詳細は停止になっている場合もあります。
- 公式情報：必須のブール値であり、リリースレビューとは別です。trueの場合のみ、インストールソースから推測せずに公式の身元を表示します。公式情報が欠けている場合はプロトコルエラーとなります。
- latestVersion：最新の承認された安定版リリース、またはnull。特定のホストでのインストール性やアップグレード性は確定されません。
- 過去30日間のnpmダウンロード数は、Docaのユーザー数やインストール数、バージョン別のダウンロード数ではなく、パッケージのダウンロード数を表しています。
- 欠落している統計情報では、nullの数やasOfに関する情報が表示されない。リストにはリッチテキストの内容、歴史的リリース情報の配列、tarball、および完全なナビゲーション機能が含まれていない。

<a id="release"></a>

### リリース

```json
{
  "pluginId": "example.mail",
  "version": "1.2.0",
  "sdkRange": "^0.1.9",
  "dataVersion": "1",
  "targets": ["web", "mobile"],
  "mobileHostRange": "^1.0.0",
  "dependencies": [],
  "changelog": "Improve mail synchronization.",
  "review": "approved",
  "reviewedAt": "2026-09-29T12:00:00Z",
  "publishedAt": "2026-09-29T10:00:00Z",
  "npm": {
    "registry": "https://registry.npmjs.org",
    "name": "@example/doca-mail",
    "version": "1.2.0",
    "integrity": "sha512-BASE64_OF_SHA512_DIGEST",
    "size": 12345
  }
}
```

上記のダイジェストはプレースホルダです。実際の整合性は、64バイトの標準-base64 SHA-512ダイジェストを含む1つのSRI値でなければなりません。npm.sizeはtgzファイルの正確な長さで、1～33,554,432バイトです。npm.version、Release.version、package.json.version、manifest.versionは一致していなければなりません。

バージョンは3部構成のsemverを使用し、プレリリースを含む可能性があり、ビルドメタデータは除外され、文字数は最大100文字です。sdkRangeはマニフェストと完全に一致します。現在のSDKは0.1.9であり、サポートされる範囲は `*`、正確に `^`、そして `~`モバイルターゲットにはmobileHostRangeが必要であり、これはモバイルプラグインホストプロトコル（v1:1.0.0）を指します。これはApp Storeのビルド番号やSDK互換性とは別物です。

dataVersionが一致する `[a-zA-Z0-9._-]{1,80}` 注文不要；v1アップグレードでは完全な一致が必要。依存関係は最大100個まで。 `{id,range,optional?}` Docaプラグインの依存関係は、npmの依存関係とは別です。依存関係のプラグインがない場合、自動的にインストールされません。

リリースレビューが承認/取り下げられました。取り下げにより、実行中のバージョンを自動的に削除せずに新規インストールができなくなります。承認なしでは、より新しいnpmリリースは公式推奨リストに掲載できません。レビューが必要です。 `(pluginId,npm.registry,npm.name,version,integrity,size)`同じバージョンはそのパッケージの代わりにはなりません。著者、統計情報、レビュー内容は変わる可能性がありますが、パッケージのバイト数/機能に関する宣言は不変です。

changelogは、リリースリストおよび正確なリリースエンドポイントにおいて必須のプレーンテキスト文字列であり、最大100000文字です。空の場合はメモがないことを意味します。HTMLを実行せずに行の区切りを保持してください。

<a id="_3-categories"></a>
<a id="3-categories"></a>

## 3. カテゴリー

`GET /api/v1/categories?locale=zh`

```json
{"protocolVersion":1,"items":[{"id":"productivity","name":"Productivity","count":12}]}
```

最大100カテゴリ。localeはzh/en、デフォルトはzhです。翻訳がない場合はデフォルトのラベルが使用されます。countは承認された可視カタログの総数、またはnullで、現在のリストフィルターとは無関係です。

<a id="_4-paginated-search-and-ordering"></a>
<a id="4-paginated-search-and-ordering"></a>

## 4. ページングされた検索と順序付け

`GET /api/v1/plugins?q=mail&category=productivity&target=mobile&sort=downloads&limit=24&locale=zh`

| パラメータ | 規則 |
| --- | --- |
| q | オプション；最大100文字まで短縮可能；リモートマッチング検索では、名前、概要、著者、プラグインID、npm名が表示されます |
| カテゴリー | オプションのカテゴリID；省略された場合は全てを意味する |
| ターゲット | オプションでウェブ/モバイル対応；省略された場合は制限なし |
| ソート | 更新済み（デフォルト）、ダウンロード、いいね、名前 |
| 制限 | 1–48、デフォルトは24 |
| カーソル | オプションで不透明のカーソル、最大2048文字 |
| ロケーション | zh/en、デフォルトはzh |

```json
{
  "protocolVersion": 1,
  "items": [],
  "page": { "nextCursor": null, "total": 0, "snapshotAt": "2026-09-30T00:00:00Z" }
}
```

アイテムはLimit内のPluginSummary&#91;&#93;です。totalは一致する数またはnullです。null nextCursorは最後のページを意味します。Load Moreは同じクエリからの結果のみを追加します。検索/フィルター/順序の変更ではカーソルがクリアされます。クエリを混ぜるのではなく、古いリクエストをキャンセルしたり、遅れた応答を無視したりしてください。

更新された項目は降順で、updatedAtが表示されます。ダウンロード数は過去30日間の数で降順で表示されます。いいね数は降順で、名前は昇順で表示され、ローカライズされた名前が表示されます。すべての場合、安定した順位決定因子として昇順のIDが使用されます。不明な統計値は既知の値に従います。

カーソルは正規化されたクエリ、順序、および結果のスナップショットを結びつける。継続処理はスナップショットを保持する。統計情報が変更されることによる重複や欠落のエントリーを防ぐため、スナップショットは少なくとも15分間保持される。有効期限が切れると410 cursor_expiredとして返され、再起動が行われる。パラメータが一致しない場合は400 cursor_mismatchとして返される。ローカル検索/ソート/ページネーションを行うため、Docaはカタログ全体をダウンロードしてはならない。

ページサイズは最大2MiBで、タイムアウトは15秒です。ETagはオプションです。Docaは、一致するキャッシュされた応答がある場合にのみIf-None-Matchを送信し、304の場合にはそのキャッシュを使用します。

<a id="_5-details-and-read-only-rich-text"></a>
<a id="5-details-and-read-only-rich-text"></a>

## 5. 詳細と読み取り不可のリッチテキスト

`GET /api/v1/plugins/<id>?locale=zh`

```json
{
  "protocolVersion": 1,
  "plugin": { "id": "example.mail", "name": "See PluginSummary; return the complete object" },
  "description": {
    "format": "doca-slate",
    "version": 1,
    "nodes": [
      { "type": "heading", "level": 2, "children": [{"text":"Mail plugin"}] },
      { "type": "paragraph", "children": [{"text":"Supports multiple mail accounts.","bold":true}] }
    ]
  }
}
```

短縮されたプラグインオブジェクトは、実際には完全なPluginSummaryでなければなりません。リリースは別々にページングされています。リモートサービスはslatetsxを使用して編集/保存し、下記のトランスポートサブセットに変換します。Docaは、リモートエディタープラグインを保存、編集、または読み込むことなく、読み取り専用で表示します。doca-slateは任意の内部slatetsxノードを受け付けません。

<a id="rich-text-v1-nodes"></a>

### リッチテキストv1ノード

- テキスト： `{text:string,bold?:boolean,italic?:boolean,underline?:boolean,strikethrough?:boolean,code?:boolean}`.
- 段落： `{type:"paragraph",children:Inline[]}`.
- 見出し：整数レベル1～6による段落構造
- リンク：インライン `{type:"link",url:string,children:Text[]}`; https/http/mailtoのみ; 制御文字、JavaScript/データURLは拒否; 外部ウィンドウではnoopener、noreferrerを使用。
- blockquote: `{type:"blockquote",children:Block[]}`.
- 項目リスト/番号付きリスト： `{type:...,children:ListItem[]}`; リスト項目: `{type:"list-item",children:Block[]}`.
- コードブロック： `{type:"code-block",language?:string,children:Text[]}`; 実行せずに平文テキストを表示する。
- 画像： `{type:"image",src:string,alt:string,children:[{text:""}]}`PNG/JPEG/WebPのデータURLでは、1枚あたり最大1MiB（1,048,576バイト）のデコードが可能です。プライベートアドレス要求や追跡を避けるため、SVGやリモートURLは拒否されます。Doca 0.1.5及びそれ以前のバージョンは、元の256KiBの表示制限を保持しています。より大きな画像の場合は、更新されたクライアントが必要です。この制限の変更は、データの移行や変換には影響しません。クライアントのロールバックにより、以前の表示制限に戻ります。総量は2MiB以内です。
- ディバイダー： `{type:"divider",children:[{text:""}]}`.

サポートされていないノードは、部分的な表示フィードバックを持つ安全なテキスト子要素を保持します。不明なフォーマット/バージョンには、HTML/JSXを実行せずに明確なメッセージとリモート詳細リンクが表示されます。生のHTML、スクリプト、iframes、実行可能なコンポーネント、イベントハンドラーフィールドは拒否されます。制限：5000ノード、深さ16、200,000文字のテキスト、および合計2MiBの応答サイズ。リモートサービスは、サポートされていないテーブル/タイプを段落/画像に変換します。新しいタイプには、協調的なプロトコル/レンダラーの変更が必要です。

<a id="_6-releases-and-installation-checks"></a>
<a id="6-releases-and-installation-checks"></a>

## 6. リリースとインストールの確認

`GET /api/v1/plugins/<id>/releases?limit=20&cursor=...`

返却 `{protocolVersion:1,items:Release[],page:{nextCursor,total,snapshotAt}}` リスト規則と制限は1～48です。semverの降順で並べ、承認された安定版をデフォルトとして表示します。オプションでincludePrerelease=trueを指定可能です。撤回されたバージョンは、正確な検索によってのみ利用可能です。

`GET /api/v1/plugins/<id>/releases/<version>`

返却 `{protocolVersion:1,release:Release}`インストール時は、古いリストを信頼するのではなく、正確なレビュー状態/ダイジェストを再取得する。不明なバージョンは404を返す。撤回されたものは200応答で明確に示されており、インストールできない。

<a id="npm-download"></a>

### npm download

1. Release.npm.registryが設定されたレジストリ（デフォルトはnpmjs）と一致しているかを確認してください。ストアは任意のオリジンを選択することはできません。
2. 正確なバージョンメタデータを取得する `GET /<encodeURIComponent(packageName)>/<encodeURIComponent(version)>`最新/タグ/範囲の解像度なし。
3. 承認されたSRIと照合して名前/バージョン、およびdist.integrityを確認した後、dist.tarballをダウンロードします。
4. ターバルボールは、認証情報や断片なしでレジストリのオリジンからHTTP(S)で送信され、リダイレクトもありません。メタデータ：2MiB/15秒。ダウンロード：32MiB/120秒、正確なサイズとSHA-512検証が行われています。
5. npmtgzファイルを、正確に1つのパッケージ/ラッパー内で安全に抽出する。通常のファイル/ディレクトリのみを許可し、シンボリック/ハードリンク、デバイス、絶対パス/トラバーサル/重複パスは拒否する。POSIX pax x/g拡張ヘッダーは省略する（npm/macOS libarchiveでmtime/xattrに使用されるもの）。これらのヘッダーを抽出したり、そのパスを使用したりすることはしない。以下のustarパスを検証する。最大10000件のエントリと128MiBの拡張データを、ストリーミング制限の下で許可する。
6. パッケージ/マニフェスト/レビューに関するメタデータを確認し、完全なアーカイブ/ターゲット状態を公開する。不足している実行時依存関係については、npmライフサイクルスクリプトやnpm install、またはダウンロードを実行してはならない。

manual npmは、公式のレビューなしで、設定されたレジストリの正確なメタデータと同じチェックを使用します。Storeの停止はmanualインストールを防ぎません。インストールされたプラグインの起動にはnpm/storeの利用が必要ありません。

<a id="_7-batch-update-checks"></a>
<a id="7-batch-update-checks"></a>

## 7. バッチ更新チェック

`POST /api/v1/updates/check`

```json
{
  "protocolVersion": 1,
  "host": { "sdkVersion": "0.1.9", "mobileHostVersion": "1.0.0" },
  "plugins": [
    { "id": "example.mail", "version": "1.0.0", "dataVersion": "1", "npm": {"registry":"https://registry.npmjs.org","name":"@example/doca-mail"} }
  ]
}
```

1回の送信で1～100の異なるプラグインIDを、最大128 KiBまで送信してください。サイト識別子、ユーザー、設定、コンテンツ、認証情報を除いた、インストールメタデータのみを送信します。Docaはより大きなセットをバッチ化します。npmオリジンがないローカルパッケージの場合は、npmを省略し、公式の同じIDのリリースを確認でき、インストールソースを無意識に切り替えることはありません。

```json
{
  "protocolVersion": 1,
  "checkedAt": "2026-09-30T00:00:00Z",
  "items": [
    {
      "id": "example.mail",
      "installedVersion": "1.0.0",
      "status": "update_available",
      "currentReview": "approved",
      "latestVersion": "1.2.0",
      "release": { "pluginId": "example.mail", "version": "Return the complete Release object" },
      "reason": null
    }
  ]
}
```

各リクエストに対して正確に1件の項目を返し、installedVersionを反映させることで、古い応答が新しくインストールされたバージョンに結びつかないようにします。

| 状態 | 意味 |
| --- | --- |
| update_available | SDK/dataVersion/mobileホストと互換性のある、より高いレベルの承認済み安定版リリース。リリースは完了している。 |
| up_to_date | より高い承認済みの安定版リリースはありません。リリース＝null |
| 互換性がない | 互換性のある候補がない場合、より高いバージョンが存在する；release=null；理由＝sdk/data_version/mobile_host |
| 不明 | 不明なプラグインまたは一致しないnpmソース；リリース＝null；理由＝not_found/ソース不一致 |

currentReviewは承認/撤回/不明です。自動削除/無効化がない撤回されたインストール版については、別途通知してください。Docaはインストール時にローカルの依存プラグインを再確認します。リモートの推奨事項ではローカルの依存グラフを保証することはできません。

最新版のみをテストするのではなく、最も互換性の高いリリースを選ぶこと。latestVersionは最も承認された安定版であり、release.versionを超える場合もある。Docaはバージョン、SDK、データ構造、依存関係を独立して検証する。リモートでの推奨事項は承認ではない。

インストール済み/アップグレード可能なビューを開くことを確認し、手動更新を許可し、キャッシュは最大15分間とする。インストールによりそのプラグインの結果が無効になる。失敗時は「全てが最新」と表示されるのではなく「失敗/不明」と表示される。アンインストール中はアップグレードを提案しない。グローバルターゲットバージョンを比較し、バージョン/再起動状態を別途表示する。カタログ外のnpmパッケージはレジストリバージョンを確認できるが、自動インストールなしでは未レビューのままである。

バッチ応答：2 MiB/15秒。部分的に不明な要素は項目の状態を使用する。ネットワーク/レート制限/フォーマットのエラーは、偽の正常な結果を含まないHTTPエラーを使用する。

<a id="_8-packages-and-navigation"></a>
<a id="8-packages-and-navigation"></a>

## 8. パッケージとナビゲーション

npm tgzにはpackage/package.jsonが含まれています。ローカルのZIPファイルには、ラッパーなしで直接package.jsonが含まれています。

```json
{
  "name": "@example/doca-mail",
  "version": "1.2.0",
  "type": "module",
  "files": ["manifest.json", "dist", "web"],
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": {"directory":"./web","entry":"./index.js"},
    "mobileHostRange": "^1.0.0",
    "navigation": [{
      "id": "example.mail.inbox",
      "title": {"zh":"邮箱","en":"Mail"},
      "icon": "mail",
      "webPath": "/plugins/example.mail/inbox",
      "mobile": true,
      "allowedSlots": ["web.left","web.top","web.topRight","web.right","web.user","web.home","web.more","mobile.drawer","mobile.bottom","mobile.topRight","mobile.account","mobile.home","mobile.more"],
      "defaults": ["web.left","mobile.drawer"],
      "order": 60,
      "adminOnly": false
    }]
  }
}
```

すべての実行時依存関係を事前コンパイルし、バンドルする。ホストソースのエイリアス、グローバルブリッジ、またはpnpmシンボルリンクツリーは使用しない。 `doca.storage: "host"` 必須です。ZIP/npm/storeのインストール、ディレクトリのインポート、または起動復元時にコードをインポートする際、デフォルトやアダプターなしで、欠落した値や他の値は拒否されます。サーバーのデフォルトはファクトリを出力します。Webでは、注入されたReactを使用してhost=>bundleがデフォルトになります。すべての永続化はhostサービスを使用します。プラグインはローカル/リモートの永続化、データベースの作成、または永続的なディレクトリの管理を選択できません。インストールされたプラグインは、hostパスを削除せずにビジネスクリーンアップアンインストールを実施します。失敗した場合でもインストールは保持されます。詳細は参照してください。 [貯蔵契約](plugin-horizontal-scaling.ja.md) 管理された機能やクリーンアップの調整のため。

静的package.jsonのナビゲーションIDでは名前空間が使用され、webPathはその下に残ります。 `/plugins/<plugin-id>/`Webバンドル内の対応するページも登録する。最大30件まで可能。allowedSlots/defaultsは重複が排除され、defaultsはサブセットである。モバイル宣言がない場合はモバイルスロットは存在しない。モバイルにはWebページとmobileHostRangeが必要である。

現在のスロットにはweb.adminとweb.leftMoreも含まれています。Left Moreは明示的な宣言が必要です。web.moreは依然として右上に位置します。詳細は [UI拡張機能](plugin-extensions.ja.md)web.rightは、任意のページをサイドパネルとして自動的に埋め込むのではなく、エントリーツールバーとして機能する。エントリーはページを開くが、コマンドやビュー、パネル表示には別の公開コントラクトがある。

管理者はDocaでWeb/Appの可視性、位置、順序、グループ化を設定します。レイアウトはリモートストアの設定ではありません。プラグインはデフォルトを宣言し、サポートのみを行います。容量オーバーロードの場合は「More」を使用します。無効化されたプラグインは実行中のナビゲーションから消えます。隠されたナビゲーションはルート/APIアクセスを取り消しません。ホスト/プラグインがすべてのリクエストを認可します。

レビューは、実際のウェブ/モバイル宣言、sdkRange、dataVersion、依存関係、パッケージのID/バージョンを基準にチェックします。Docaが再確認を行います。リリースでは完全なナビゲーションは除外され、パッケージが機能の源となります。

アプリはまず、モバイルプラグインホストを含むビルドを配布する必要があります。その後の準拠ページは、React Nativeモジュールをダウンロード・実行することなく、制御されたWebViewを通じて読み込まれます。ログインにはホストの一度限りのチケットが使用され、プラグインスクリプトには長期有効なアプリベアラートークンは使用されません。ナビゲーション/ホストコールの範囲は開発ガイドに従います。

<a id="_9-errors-cache-and-withdrawal"></a>
<a id="9-errors-cache-and-withdrawal"></a>

## 9. エラー、キャッシュ、および引き出し

```json
{"protocolVersion":1,"error":{"code":"not_found","message":"Plugin not found"}}
```

HTTPエラー：400 invalid_request/cursor_mismatch；404 not_found；410 cursor_expired；429 rate_limited（Retry-After秒後）、503 unavailable。メッセージは平文テキストであり、ロジックキーではない。ログイン用のHTML、リダイレクト、またはスタックトレースを返さないこと。失敗時はローカル管理を維持し、再試行が可能である。検証なしではインストールは進行できない。

詳細/正確なレビューキャッシュは最大60秒間保持されるべきです。インストール時にはオフラインキャッシュなしで正確なバージョンを再確認する必要があります。承認は絶対的な安全保証ではありません：サーバープラグインはサンドボックスではなく、信頼できるプロセスで実行されます。

内部レビュー、著者による公開、GitHubログイン、およびその他の投稿はストアが所有します。公開の順序は以下の通りです：npmパッケージの公開 → 不変の実際のバイトデータの取得 → レビュー/スキャン機能の確認 → 承認されたリリースの公開 → 概要や検索インデックスの更新。

<a id="_10-multiple-instances-and-activation"></a>
<a id="10-multiple-instances-and-activation"></a>

## 10. 複数のインスタンスとアクティベーション

インストール時、完全なアーカイブとグローバルターゲット状態が共有ホストデータベースに保存される。インスタンスはプライベートな書き込み可能なプラグインディレクトリを使用する。起動時、npm/storeにアクセスせずにファイルを検証/復元し、部分的なパッケージは拒否される。共有アーカイブが欠落または破損している場合、明確に失敗する。

インストール/アップグレード/有効化/無効化/アンインストールには、各インスタンスを再起動する必要があります。管理機能では、クラスター全体での有効化を主張せず、応答したインスタンスの実行バージョンを報告します。Composeは使用されます。 `docker compose restart doca`Kubernetes/オペレーターはインスタンスを段階的に再起動し、互換性のないAPIの古いトラフィックを排出します。

歴史的なWebアセットは、バージョン間のビジネスAPIの互換性を必要とせず、共有アーカイブから復元可能です。公開されたナビゲーションレイアウトは、クライアントを再起動せずに効果が発揮されますが、パッケージ機能の変更にはアップグレードや再起動が必要です。現在のアンインストールではビジネスクリーンアップが実行され、成功時にはデータバージョンマーカーが削除され、不変のアーカイブが保持されます。管理型データベース/プライベートオブジェクトのクリーンアップおよび生成フェンシングが実装されています。クラスター全体でのビジネスタスクの消費は未完了のままです。プラグインは自身でディレクトリを削除することはできません。

<a id="_11-integration-fixtures"></a>
<a id="11-integration-fixtures"></a>

## 11. 統合フレームワーク

少なくとも以下を提供してください：

1. 空のリストや2ページを超える長さのリスト、検索/カテゴリ/プラットフォームフィルター、4種類の並べ替え方法、期限切れ/一致しないカーソル。
2. 完全な要約、不明な統計、一時停止中の詳細、有効なリッチテキスト、および未知ノードテキストの劣化。
3. ページネーションの解除；最新の非互換だが低レベルの互換なアップグレード；すべてのアップグレードが非互換；インストール済みリリースの撤回；不明/一致しないパッケージ。
4. npmバイト数と実際のSRI/サイズを確認した。置換されたパッケージ、ダイジェスト/宣言の不一致、リダイレクト、およびエクストラクショントラバースを拒否した。
5. 429/503のタイムアウト；ストレージエラーは、ローカルにインストールされたリストや現在のアプリの使用を破壊してはならない。
6. 1台のインスタンスにインストールする。別のインスタンスは空のディレクトリとnpm/storeがオフライン状態で再起動する。共有アーカイブから復元し、破損したローカルキャッシュを修復する。
7. ウェブ/アプリの宣言/ナビゲーション；モバイル宣言なしではアプリのエントリーは不可；非互換なデータアップグレードは拒否される。
8. 「いいね」操作では、いいねAPIを呼び出したりDoca OAuthを開始したりすることなく、設定された同じオリジン詳細ページが開かれます。

メール連携は元の状態から始めることができます。 [メールプラグイン統合ガイド v1](plugin-mail-integration-v1.md)研究資料として保持されている。

見てください [プラグイン開発](plugin-development.ja.md) そして [SDKの境界](plugin-sdk-contract.ja.md)ホストAPIの場合は実際にエクスポートされた型を使用し、リモートストアの場合はこのワイヤプロトコルを使用します。提案されているホスト方法を推測しないでください。

<a id="cross-repository-acceptance"></a>

## クロスリポジトリ受容

実行する `pnpm exec tsx scripts/verify-plugin-store-contract.ts ../doca-plugin-store`カテゴリ（ゼロカウントも含む）、検索、ターゲット、ページネーション、詳細、リリース、更新、カーソルの有効期限などに関する店舗の実際のルートを、ビジネスデータベースやnpmの公開を触れずに、メモリ内のデータベースを利用して実行します。

/categoriesはカテゴリリストであり、任意のマルチタグ付けではありません。各プラグインには1つのcategoryIdがあります。カテゴリの数は検索に関係なく、公開されたすべてのプラグインをカバーします。page.totalはクエリのスナップショットを表します。不明なダウンロード/いいね数はダッシュを表示し、0は0を表示します。

レビューでは、ホストと同じ静的ナビゲーションが確認されている：バイリンガルタイトル（各1～80文字）、アイコン、順序、非空のallowedSlots、有効なデフォルト値、不明なフィールドがない。サーバーはJS/mjs/cjsで構築され、WebエントリーはJS、マニフェストは静的JSONである。レビューもインストールも、パッケージのインストールスクリプトを実行しない。

<a id="official-identity-and-release-notes"></a>

### 公式アイデンティティとリリースノート

上記の通り、PluginSummary.officialとRelease.changelogは必須です。公式アイデンティティはリリースレビューとは独立しています。Release notesは改行付きの平文形式で表示され、欠けている項目は暗黙のデフォルトではなくプロトコルエラーです。
