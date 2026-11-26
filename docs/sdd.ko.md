<a id="specification-driven-development"></a>

# 사양 기반 개발

[中文](sdd.zh-CN.md)

이 워크플로우는 Doca 전체의 새로운 작업에 적용됩니다. GitHub Spec Kit 1.0.4는 체크인된 Codex 기술, 스크립트 및 템플릿을 제공합니다; 설치 및 업그레이드에 대한 세부 정보는 여기에 있습니다. [.specify/README.md](../.specify/README.md). [AGENTS.md](../AGENTS.md), 그 [헌법](../.specify/memory/constitution.md) 기존의 기술 계약이 그 사용에 관한 규정을 담고 있습니다. 먼저... [모듈 인덱스](sdd-module-index.ko.md) 현재 소스, 계약 및 재사용 가능한 검사를 찾기.

<a id="choose-the-level"></a>

## 레벨을 선택하세요

| 레벨 | 의미적 영향 | 구현 전 최소 기록 |
| --- | --- | --- |
| `full` | 데이터베이스 또는 저장된 형식; 인증/권한 부여; 공동 작업; 공개 SDK/API 계약; 아키텍처, 자격 증명 또는 배포 경계 | `spec.md`, `plan.md`, `tasks.md`, `validation.md` 하나의 기능 디렉터리에 |
| `standard` | 설정된 범위 내에서 나타나는 다른 기능과 관찰 가능한 행동 변화 | 하나 `spec.md` 범위, 수용성, 설계, 작업 및 검증 |
| `light` | 제한된 수정 사항, 복사본, 스타일, 테스트 또는 문서로, 위에 언급된 것 중 어느 것도 영향을 미치지 않음 | PR 문제, 최종 행동, 검증 및 영향 설명 |

행동을 판단하세요, 줄 수는 없습니다. 한 줄의 승인 변경이 전체적인 변경입니다. 지정된 동작을 복구하는 수정은 계약이나 높은 위험도의 경계를 변경하지 않는다면 간단할 수 있습니다. 프로세스에만 관련된 변경은 도입을 문서화하기 위해 전체로 표기될 수 있습니다. [이 설치물](../specs/001-sdd-adoption/spec.md) 그렇습니다. 작업을 확장하기 전에 레벨을 높이고 범위를 업데이트해야 합니다. PR에 분류 이유를 명시하세요; 자동화된 검사로는 올바른 의미적 레벨을 설정할 수 없습니다.

<a id="work-on-a-change"></a>

## 변경 작업을 진행합니다.

1. 모듈 인덱스, 실제 소스/패키지 내보내기 및 적용 가능한 기술을 검토하세요. 현재 버전을 기록하고 구현된 동작과 제안된 동작을 구분하세요. 기존 사용자 권한은 리뷰 체크포인트를 넘어 계속 유지됩니다.
2. 완전한/표준 작업을 위해, 만들기 `specs/<number>-<short-name>/spec.md` 구현 전에 사용하세요. 다음에 사용되지 않는 세 자리 숫자를 사용하세요; 식별자들은 고유합니다. Git 브랜치는 독립적이며 일반적으로 사용됩니다. `codex/`. 기록 `Level`, `Status`, `Created`, `Decision`, `Scope` 그리고 안정적 `AC-001` 수락 ID. [프로젝트 템플릿](../.specify/templates/overrides/spec-template.md) 섹션을 제공합니다.
3. 전체 작업에는 계획, 수락 ID를 참조하는 체크박스 작업, 그리고 초기에는 대기 중인 유효성 검사 기록이 포함됩니다. [계획](../.specify/templates/overrides/plan-template.md), [작업](../.specify/templates/overrides/tasks-template.md) 그리고 [유효성 검사](../.specify/templates/overrides/validation-template.md) 템플릿이 제공됩니다. 표준 작업이 유지됩니다. `Design`, `Tasks` 그리고 `Validation` 사양서에 따르면, 범위가 요구하는 경우에만 별도의 연구, 데이터 모델, 계약을 추가해야 합니다.
4. 호환성 구현 전에 AGENTS.md에서 요구하는 구체적인 합의사항을 별도로 확보해야 합니다: 영향을 받는 버전/형식, 거부/보존/변환/마이그레이션 동작, 보존, 검증 및 복구. 스펙의 승인 상태는 그런 것이 아닙니다. 데이터베이스 변경은 다음에 따릅니다. [업그레이드 계약](database-schema-evolution.ko.md).
5. 제한된 작업을 구현하고 같은 PR에서 영향을 받는 현재 계약을 업데이트합니다. 수락 ID를 검사 및 관찰 사항으로 매핑합니다. 실제 결과, 건너뛴 경우, 버전 및 제한 사항을 기록합니다. 출력 결과는 기존 방식을 따릅니다. [유물 규칙](documentation.ko.md#assets-and-updates).
6. 실행하기 `pnpm sdd:check` 그리고 관련 모듈 검사. 사용하세요. [PR 템플릿](../.github/PULL_REQUEST_TEMPLATE.md)명시된 수준과 하나의 주요 스펙 경로를 기록합니다. 추가 작업 항목들은 주요 스펙에서 연결될 수 있습니다. 고위험 영역, 계약 및 별도의 호환성 결정 사항을 명확하게 검토합니다.

<a id="codex-skills"></a>

## 코덱스 스킬

체크인된 `.agents/skills/speckit-*` 코덱 세션이 프로젝트 관련 기술을 발견하면 그 기술들이 사용 가능해집니다. 현재 세션이 설치 이전이라면 새로운 프로젝트 채팅을 열어야 합니다. 기술을 사용하려면 터미널이 아닌 에이전트 채팅에서 실행해야 합니다. 완전한 작업을 수행하려면 다음 순서를 따르세요:

```text
$speckit-specify Describe the requested behavior and affected users
$speckit-plan State the actual Doca modules, packages and constraints
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

헌법은 이미 제정되었습니다. 명확화 및 체크리스트 기술은 유용할 때 선택 사항입니다. 표준/경량 작업은 모든 전체 워크플로우 명령을 실행하지 않고도 계층적 기록을 직접 사용할 수 있습니다. 업스트림 일반 워크플로우는 검토 게이트와 함께 계속 설치되어 있으며, 위 순서는 도카의 비례 워크플로우와 기존 사용자 권한을 따릅니다. 일반 프롬프트는 호환성 결정이나 메시지 전송, 게시, 배포 권한을 부여하지 않습니다.

필요할 때 기존 기능을 명시적으로 선택하세요:

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-sdd-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
bash .specify/scripts/bash/resolve-template.sh spec-template
```

기능 포인터가 `.specify/feature.json` checkout-local 상태는 무시됩니다. 이를 브랜치나 프로젝트 기준으로 공유하지 마세요. 업스트림 스크립트/템플릿은 변경되지 않으며, 사용자 정의할 수 있습니다. `templates/overrides/`체커는 패키지된 업스트림 해시를 확인합니다. 프로젝트 템플릿은 이를 위해 작성되었습니다. `specs/<number>-<name>/`다른 위치를 의도적으로 사용할 경우 상대적 링크를 조정해야 합니다.

<a id="status-and-evidence"></a>

## 상태와 증거

| 상태 | 의미 |
| --- | --- |
| `draft` | 범위나 결정 사항은 아직 준비 중입니다. |
| `accepted` | 범위에 합의되었으며, 구체적인 호환성 승인은 별도로 기록됩니다. |
| `implemented` | 범위가 지정된 코드/작업이 완료되었으나, 검증은 아직 진행 중이거나 부분적으로만 완료된 상태입니다. |
| `verified` | 모든 수락 ID는 명시된 검증 범위 내에서 결과를 기록하고 있습니다. |
| `superseded` | 역사적 기록; 해당 자료의 대체품을 알려줌 |

완료되지 않은 작업, 해결되지 않은 수락 또는 대기 중/실패한 결과로 표시된 것들은 표시하지 마세요. 역사적으로 확인된 사양은 현재 코드를 다시 유효화하지 않습니다. 현재 계약은 현재 동작의 원천으로 남습니다; 대체된 설계와 링크 교체를 표시하세요. 기존 사양, 계약 및 수락 기록은 그 경로와 날짜를 그대로 유지합니다. 모듈 인덱스는 역사적 수락이 아닌 엔트리 포인트입니다.

<a id="checks-and-prs"></a>

## 체크와 PRs

`pnpm sdd:check` 숫자로 표시된 스펙 디렉터리, 레벨/상태, 필수 레코드, 수락/작업 추적성, 완료된 검증 및 설치된 업스트림 해시를 검증합니다. `pnpm test:sdd` 긍정적 및 부정적 경우와 개별적인 업스트림 스크립트/템플릿 사용을 포함합니다. `pnpm docs:check` 설치된 기술과 프로젝트 템플릿을 포함한 실제 문서 및 모듈-인덱스 링크를 검증합니다.

PR 기관은 실제 값을 가진 이러한 독립적인 줄들을 선언합니다.

```text
SDD-Level: full
SDD-Spec: specs/001-sdd-adoption/spec.md
```

빛이 변하는 방식 `SDD-Level: light` 그리고 `SDD-Spec: none`모든 PR은 채워집니다. `Problem`, `Behavior`, `Impacts` 그리고 `Verification` 섹션들. SDD GitHub 워크플로우는 열린, 수정된, 동기화된 요청의 PR 메타데이터를 확인하고, main에 있는 저장소 기록도 확인합니다. 이는 실행됩니다. `pull_request`읽기 전용 권한과 비밀 정보가 없는 상태입니다. 이 시스템은 명시된 위험, 사람들의 동의 또는 테스트 결과가 진실한지 여부가 아니라 구조와 참조를 확인합니다. 관리자들이 그러한 주장들을 검토합니다. 워크플로우는 브랜치 보호 기능을 설정하지 않으며, 병합 시 이를 요구하는 것은 저장소 설정입니다.

<a id="evaluate-the-first-changes"></a>

## 첫 번째 변화를 평가하세요.

다음 3~5개의 실제 변경 사항에 대해, 검증 또는 가벼운 PR에 간단한 관찰 내용을 추가하세요: 조사 노력, 리뷰 과정에서 발견된 누락된 요구사항, 구현 후의 재작업, 그리고 기록 유지 비용입니다. 측정 가능한 경우에는 소요 시간을 기재하고, 그렇지 않은 경우에는 측정되지 않았다고 기재하세요. 가능한 경우 유사한 변경 사항들을 비교하고, 관찰된 부담에 따라 템플릿의 깊이를 조정하세요. Spec Kit를 설치하는 것 자체로 결함률이나 배포 속도의 개선이 나타나지 않습니다.
