<a id="background-task-continuation"></a>

# バックグラウンドタスクの継続

現在のSDKソース **0.2.0**、サーバー機能 `ai.continuations.v2`、輸出された `@smartdoca/plugin-sdk/ai`npmの公開とデプロイは含まれていない。これはインストールされたすべてのサーバープラグインに共通している。ナレッジブックも同じホストメカニズムを使用する。

宣言する `aiContinuationsServiceToken` 必要な注射として `sdkRange: "^0.2.0"`この機能がないホストでは初期化が行われない。退廃したAIサービスバージョンを通じたアダプターや、歴史的な業務タスクの自動登録機能は存在しない。

MCPツールのコンテキストにはない `sessionId`；使用 `jobId` タスク相関のため。彼らは `wait` 呼び出しは承認されたスナップショットを返すことができますが、内部チャットやモデルの続行は開始しません。後続の呼び出しは外部クライアントが責任を持ちます。

プラグインにはビジネスジョブ、現在の承認、持続的な成果、安定した運用ID、通知/アウトボックス配信があります。これらは公共ホストが管理するストレージを通じて保存されます。ホストはアシスタントアイデンティティ、保持された待機チケット、キャンセル、モデルの継続、技術的制限を所有します。ウエイクはビジネスアクションを承認したり、人間のタスクを承認したりしません。

1. マウント時にソースを登録する。その。 `id` 始めるには `<pluginId>.` そして、それ `pluginId` インストール時のIDと一致する必要があります。登録は処分時に自動的に削除されます。
2. `read(context, {operationId})` 現在のビジネス許可を再確認し、バージョン1のスナップショットを返す。拒否または利用不可能な作業の場合はnullを返す。新たに読み取られたホストのIDと中止信号を受け取り、秘密情報は返さない。操作IDは一つの持続可能なジョブを識別し、ユーザーが提供するプリンシパルではない。
3. 現在実行中の登録済みAIツールを呼び出す `wait(pluginId, context, {sourceId, operationId})` ホストが提供する正確なコンテキストを使用する。コピーされた、偽造された、または保持されたコンテキストは拒否される。待つ前に、ビジネスジョブを無効化して開始する。このツールは受領書を返す。
4. 呼び出す前に結果をコミットする `wake(pluginId, {sourceId, operationId})`繰り返し通知は、1回だけ保存されたアシスタントチェックポイントを利用できる。駐車前の通知は安全だ：定期的な調整と起動復元により、耐久性のあるソースを再読み込みする。

スナップショットがあります `version: 1`, `state`, `revision`, `summary` およびオプションのJSON `result`国々は `running`, `waiting_input`, `completed`, `failed`, `cancelled`. 変更 `revision` 実行可能な結果や人間の決定が変わったとき。心拍数を監視してもモデルは起動しない。人間の入力への移行によって一度起動する。アシスタントは保留中のタスクを説明し、別の決定を待ち続ける。終端スナップショットは元のタスクを結果の事実と共に再開する。終端ジョブの結果は安定していなければならない。新しいビジネス実行には新しい操作IDが必要だ。

ホストは完全なツール交換のみを保存します。待機中は実行スロットを解放し、元のタスク/チェックポイントを保持し、異常な復元試行を行いません。読み取りは登録、通知、実行時に再許可されます。権限が剥奪されたユーザー、無効化されたユーザー、削除されたソース、無効な記録は、明確なエラーで続行を停止し、チェックポイントを保持します。アシスタントのキャンセルは再開能力を失わせます。ビジネスタスクのキャンセルは別のプラグイン操作です。

制限：アシスタントのターンあたり20の依存関係、ソースIDは120文字、操作ID/レビューは200文字、要約は2,000文字、シリアル化されたスナップショットは24,000文字、20秒のソース読み込み締め切り。調整にはキーセットページと制限付き並列読み込みが使用され、遅いソースは通常のモデル実行スロットを占有しない。起動時の調整では、プラグインの構成が完了するのを待つ。

<a id="integration-example"></a>

## 統合例

それ `jobs` 以下のオブジェクトは、プラグイン自身のリポジトリであり、それがサポートされている。 `storage.sql.v1`, **SDKエクスポートではない**. `startOnce` 耐久性のあるビジネスインメポトニクキーを使用する必要があります。 `readAuthorized` ライブリソースの権限をチェックし、現在のスナップショットを返します。ワーカーの通知は、コミットされたビジネストランザクションに従って行われます。

```ts
import { aiServiceToken, aiContinuationsServiceToken } from "@smartdoca/plugin-sdk/ai";

// Inside mount(context):
const pluginId = "example.reports";
const sourceId = `${pluginId}.jobs`;
const ai = context.inject(aiServiceToken);
const continuations = context.inject(aiContinuationsServiceToken);
continuations.registerSource({
  id: sourceId, pluginId,
  read: (request, { operationId }) => jobs.readAuthorized(request, operationId),
});
ai.registerTool({
  id: `${pluginId}.generate`, description: "Generate a report",
  inputSchema: { type: "object", properties: { reportId: { type: "string" } }, required: ["reportId"], additionalProperties: false },
  async execute(input, request) {
    const operationId = await jobs.startOnce(request, input.reportId);
    return continuations.wait(pluginId, request, { sourceId, operationId });
  },
});

// In the plugin worker, after its durable result commit:
await continuations.wake(pluginId, { sourceId, operationId });
```

<a id="persistence-and-rollback"></a>

## 持続性とロールバック

新たに明示的なwaitが厳格なバージョン1のチェックポイントを作成するのみ。既存のものは… `ai_jobs` 状態制約は変わらない：依存関係はパーキング状態を利用し、それを公開する `awaiting_dependency` API/UIにおいて、スキーマのマイグレーション、デュアルライト、推測された古いチケット、欠落しているフィールドの変換、歴史的タスクのウォークアップは存在しない。構造化が正しくない新しいチケットは拒否され、診断のために保持される。

ロールバックは新しい登録や書き込みを停止し、チェックポイント、業務結果、監査記録を保持します。古いホストはこの新しいプロトコルを再開しません。アシスタントウェイターやワーカーを停止し、対応するホストを復元しない限り、アクティブなバージョン1のウェイター上で実行しないでください。データのリセットはロールバックの一部ではありません。

知識ブックの進捗は、既存の監査ストレージを使用し、コンパクトなバージョン化されたノード/バッチ/モデル/再試行カウンターを使用します。モデル本体はこれらのログにコピーされません。実行ダッシュボードは、状態、ハートビート、現在のエラー、最新の200件の記録されたイベントを更新します。歴史的なイベントは捏造されることはなく、以前のイベントはストレージに保持されます。
