<a id="规格驱动开发"></a>

# 規格驅動開發

[English](sdd.md)

本流程覆蓋 Doca 全專案的新工作。倉庫固定使用 GitHub Spec Kit 1.0.4 的 Codex skills、指令碼和模板；安裝與升級方式見 [.specify/README.md](../.specify/README.md)。使用時遵守 [AGENTS.md](../AGENTS.md)、[constitution](../.specify/memory/constitution.md) 和現有技術契約。先透過[模組索引](sdd-module-index.zh-Hant.md)定位當前原始碼、契約與可複用檢查。

<a id="选择级别"></a>

## 選擇級別

| 級別 | 行為影響 | 實現前的最小記錄 |
| --- | --- | --- |
| `full` | 資料庫或持久化格式；認證/授權；協同；公共 SDK/API 契約；架構、憑據或部署邊界 | 同一個規格目錄中的 `spec.md`、`plan.md`、`tasks.md`、`validation.md` |
| `standard` | 在既有邊界內的其他功能與可觀察行為變化 | 一份 `spec.md`，包含範圍、驗收、設計、任務和驗證 |
| `light` | 不涉及上述影響的小範圍修復、文案、樣式、測試或文件 | PR 中的問題、最終行為、驗證和影響說明 |

按行為判斷，不按程式碼行數判斷。一行授權變更也屬於 full。恢復已規定行為、且不改變契約或高風險邊界的區域性修復可以使用 light。純流程改動也可以主動採用 full 來記錄接入，例如[本次安裝](../specs/001-sdd-adoption/spec.md)。擴大任務範圍前先提升級別並更新規格。PR 說明分類理由；自動檢查不能替代語義風險判斷。

<a id="执行一次变更"></a>

## 執行一次變更

1. 查模組索引、實際原始碼/包匯出及適用 skill，記錄當前版本，區分實現和提案。普通評審節點繼續沿用使用者已經給出的授權。
2. full/standard 在實現前建立 `specs/<number>-<short-name>/spec.md`。編號採用下一個未使用的三位數字並保持唯一；Git 分支獨立命名，通常使用 `codex/`。記錄 `Level`、`Status`、`Created`、`Decision`、`Scope` 和穩定的 `AC-001` 驗收編號。[專案模板](../.specify/templates/overrides/spec-template.md)提供章節。
3. full 補充計劃、引用驗收編號的勾選任務和初始 pending 的驗證記錄。可使用[計劃](../.specify/templates/overrides/plan-template.md)、[任務](../.specify/templates/overrides/tasks-template.md)及[驗證](../.specify/templates/overrides/validation-template.md)模板。standard 在 spec 內保留 `Design`、`Tasks`、`Validation`。僅在實際需要時增加獨立研究、資料模型或契約資料。
4. 相容行為實現前，單獨取得 AGENTS.md 要求的具體同意：實際版本/格式，拒絕、保留、轉換或遷移行為，以及資料保留、校驗和恢復方案。規格狀態為 accepted 不等於已獲此批准。資料庫變更遵守[升級規範](database-schema-evolution.zh-Hant.md)。
5. 按範圍實現任務，並在同一個 PR 中更新受影響的現行契約。用驗收編號關聯檢查與觀察；記錄實際結果、跳過項、版本和限制。產物遵守既有[存放規則](documentation.zh-Hant.md#资源与更新)。
6. 執行 `pnpm sdd:check` 和模組相關檢查，使用 [PR 模板](../.github/PULL_REQUEST_TEMPLATE.md)，宣告級別與一個主規格路徑。其他工作項可從主規格關聯。審閱時明確檢查高風險邊界、契約更新及單獨的相容決定。

<a id="codex-skills"></a>

## Codex skills

倉庫中的 `.agents/skills/speckit-*` 會在 Codex 會話發現專案 skills 時載入；若當前會話早於安裝，重新開啟專案聊天。以下命令在助手聊天中呼叫，不在終端執行。full 工作可採用：

```text
$speckit-specify 描述需要实现的行为和用户
$speckit-plan 说明真实的 Doca 模块、依赖包和限制
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

專案 constitution 已建立。按需要使用 clarify、checklist。standard/light 可以直接維護分級記錄，無需執行完整流程的每個命令。上游通用 workflow 保留其評審門，以上預設方式遵循 Doca 的分級流程和已有使用者授權；通用提示不會授予相容決定、發訊息、釋出或部署許可權。

需要時顯式選擇已有規格：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-sdd-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
bash .specify/scripts/bash/resolve-template.sh spec-template
```

`.specify/feature.json` 是已忽略的當前檢出目錄本地指標，不作為共享分支或專案基線。上游指令碼/模板保持原樣，定製放在 `templates/overrides/`，檢查器校驗上游檔案雜湊。專案模板按 `specs/<number>-<name>/` 編寫；主動選擇其他目錄時相應調整相對連結。

<a id="状态与证据"></a>

## 狀態與證據

| 狀態 | 含義 |
| --- | --- |
| `draft` | 範圍或決定仍在準備 |
| `accepted` | 範圍已同意；具體相容批准另行記錄 |
| `implemented` | 範圍內實現和任務完成，驗證仍可待執行或部分完成 |
| `verified` | 在已宣告的驗證範圍內，每個驗收編號都有實際結果 |
| `superseded` | 歷史記錄，註明替代資料 |

存在未完成任務、未解決驗收或 pending/failed 結果時不得標為 verified。歷史 verified 規格不重新證明當前程式碼；當前行為仍查現行契約，過期設計標明替代關係。已有規格、契約及驗收記錄保留路徑與日期。模組索引僅提供入口，不追認存量實現已完成驗收。

<a id="检查与-pr"></a>

## 檢查與 PR

`pnpm sdd:check` 檢查規格編號、級別/狀態、必要資料、驗收與任務追溯、完成驗證記錄及已安裝上游雜湊。`pnpm test:sdd` 覆蓋正反例和上游指令碼/模板的隔離使用。`pnpm docs:check` 校驗實際文件與模組連結，包括已安裝 skills 和專案模板。

PR 正文使用以下獨立行，並填寫實際值：

```text
SDD-Level: full
SDD-Spec: specs/001-sdd-adoption/spec.md
```

輕量變更填寫 `SDD-Level: light`、`SDD-Spec: none`。所有 PR 填寫 `Problem`、`Behavior`、`Impacts` 和 `Verification` 章節。SDD GitHub workflow 在 PR 建立、正文編輯和程式碼更新時檢查後設資料，在 main 檢查倉庫記錄；使用 `pull_request`、只讀許可權且不使用金鑰。檢查只能校驗結構和引用，宣告的級別、使用者同意與測試結果是否屬實仍需維護者審閱。workflow 不配置分支保護，是否設為合併必需檢查屬於倉庫設定。

<a id="观察初期效果"></a>

## 觀察初期效果

接下來 3–5 次真實變更，在驗證記錄或輕量 PR 中簡要記錄：調查投入、評審發現的遺漏、實現後的返工，以及維護記錄的成本。已測量時填寫耗時，否則註明未測量。儘量對比相近型別的變更，再按實際負擔調整模板深度。安裝 Spec Kit 本身不證明缺陷率或交付速度已經改善。
