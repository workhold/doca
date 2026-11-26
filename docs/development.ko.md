<a id="development-deployment-and-checks"></a>

# 개발, 배포, 검사

[中文](development.zh-CN.md)

<a id="plan-a-change"></a>

## 변화를 계획하세요.

사용하세요 [층별 SDD 워크플로우](sdd.ko.md) 새로운 작업과 관련하여 [모듈 인덱스](sdd-module-index.ko.md) 원본, 현재 계약 및 검증 정보를 찾기. 전체 변경 사항은 Spec Kit 기록을 사용하며, 표준 작업은 하나의 spec을 사용할 수 있고, 간단한 변경 사항은 PR 기록을 사용합니다. 호환성 결정은 여전히 AGENTS.md에 있는 별도의 사전 합의가 필요합니다. 실행 `pnpm sdd:check` 변경과 관련된 검사들과 함께.

<a id="start-locally"></a>

## 현지에서 시작하기

Node.js 22.12 이상 또는 Node.js 24 LTS, 그리고 pnpm 11.25.0. 버전은 고정되어 있습니다. `pnpm-lock.yaml`. 그 `better-sqlite3` 네이티브 빌드는 허용됩니다. `pnpm-workspace.yaml`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set the storage root in .env to an absolute writable local directory.
pnpm dev
```

Open http://127.0.0.1:39130. API는 39120에서 수신하며, 개발 서버는 같은 원본에서 이를 프록시합니다. 39120을 직접 열거나 사용할 수도 있습니다. `localhost` 대신에 `127.0.0.1`, 설정과 일치하지 않습니다.

복사 `.env.example` 시작하기 전에: file-store 변수가 필요합니다. 저장 루트는 `/data/storage` Docker의 경우, 소스에서 실행하기 전에 루트를 컴퓨터의 절대적로 쓰기 가능한 디렉터리로 설정하세요. 로컬 원본과 SQLite 경로는 그대로 유지하고, 비밀번호는 절대 커밋하지 마세요.

`DOCA_CREDENTIAL_MASTER_KEY` 플러그인 없이 개발도 포함된다는 점이 필요합니다. 새 데이터베이스의 경우, 공개 예제 값을 대체하세요. `openssl rand -hex 32` 출력 결과는 재시작 시에도 동일한 키를 유지하고 별도로 백업해야 합니다. 기존 데이터베이스는 원래의 키를 그대로 유지해야 합니다.

<a id="pdf-rendering-for-source-development"></a>

## 소스 개발을 위한 PDF 렌더링

리치 텍스트 및 Markdown PDF 내보내기는 일회용 파이썬 프로세스에서 WeasyPrint 70.0을 사용합니다. 파이썬 3.10+와 Pango를 설치한 다음, 고정된 의존성들을 설치하세요.

```sh
python3 -m venv .local/pdf-renderer
.local/pdf-renderer/bin/pip install -r docker/pdf-requirements.txt
export DOCA_PDF_PYTHON="$PWD/.local/pdf-renderer/bin/python"
```

macOS에서는 Pango를 설치하세요. `brew install pango`; 라이브러리 발견에 필요하다면 설정하세요 `DYLD_FALLBACK_LIBRARY_PATH` to `$(brew --prefix)/lib`Debian/Ubuntu는 요구합니다. `python3-venv`, `libpango-1.0-0`, `libpangoft2-1.0-0` 그리고 `libharfbuzz-subset0`Dockerfile은 이러한 의존성들을 설치합니다. `DOCA_PDF_CHROMIUM` 사용되지 않으며 명시적으로 거부됩니다; 시작 전에 제거하세요. 브라우저 대체 옵션은 없습니다.

AI 캔버스 이미지는 설치된 Canvas SDK의 SVG 엑스포터를 독립된 Node DOM에서 사용하며, 네이티브 텍스트 측정 기능이 적용되고, 그 후 resvg 래스터화 및 CJK 글꼴이 포함되어 있습니다. 실행하세요. `pnpm build:canvas-render` 종속성이 변경된 후에도 PDF 읽기/임포트는 여전히 PDF.js를 사용하며, Office 변환은 여전히 LibreOffice를 사용합니다.

`playwright-core` 이는 브라우저 지원을 위한 개발 의존성에 불과합니다. 해당 브라우저를 설치하세요. `pnpm exec playwright-core install chromium`또는 설정 `DOCA_QA_BROWSER` for `scripts/qa-document-pdf.mts`독립적인 내보내기/재인입 및 시각적 회귀를 위해 그 스크립트를 실행하세요. 문제점들은 그 아래에 있습니다. `artifacts/verification/document-pdf/` (오버라이드 with `DOCA_QA_OUTPUT` 아래에 `artifacts/`). 사용자 문서는 열리지 않습니다. 참조하세요 [파일 교환](editor-file-exchange-contract.ko.md#rendered-pdf-and-editable-import).

<a id="create-the-administrator"></a>

## 관리자를 생성하세요.

기본 계정은 없습니다. 프로젝트 디렉터리에서:

```sh
bash scripts/bootstrap-admin-local.sh
```

스크립트는 로그인 및 비밀번호 정보를 해당 명령어에만 전달합니다. 데이터베이스에는 해시가 저장됩니다.

컨테이너 배포가 진행 중입니다. [도카를 배포하세요.](deployment.ko.md)리버스 프록시를 포함하여 `DOCA_ORIGIN`첫 번째 관리자와 비밀번호 재설정.

<a id="reset-an-administrator-password"></a>

## 관리자 비밀번호를 재설정하기

관리자가 여전히 인증된 전화번호나 이메일을 가지고 있다면, 로그인 페이지의 코드를 사용하세요. 그렇지 않은 경우 배포 머신의 로컬 복구 명령을 사용하세요. 이 명령은 기존 관리자만을 인정하며, 새로운 관리자를 생성하지 않고 HTTP를 통해 공개되지도 않습니다.

```zsh
read "DOCA_RESET_ADMIN_LOGIN?Administrator login: "
read -s "DOCA_RESET_ADMIN_PASSWORD?New password (at least 12 characters): "
export DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
pnpm admin:reset-password
unset DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
```

이 명령은 계정이 활성화된 관리자인지 확인하고, 비밀번호를 업데이트하며, 모든 세션을 취소합니다. PostgreSQL는 필요합니다. `DOCA_DATABASE_URL` 같은 환경에서. SQLite는 사용한다. `DOCA_SQLITE_PATH`복구 비밀번호를 입력하지 마세요. `.env`, 셸 역사 또는 이미지.

<a id="configuration"></a>

## 구성

| 변수 | 기본값 | 목적 |
| --- | --- | --- |
| DOCA_ORIGIN | http://127.0.0.1:39130 | 유일한 브라우저 원본은 HTTP(S)로, 프로덕션 환경에서 지원됩니다. |
| DOCA_HOST | 127.0.0.1 | 바인드 주소 |
| DOCA_PORT | 39120 | API 및 배포된 서버 포트 |
| DOCA_WEB_PORT | 39130 | Dev 웹 포트 |
| DOCA_DATABASE | sqlite | sqlite 또는 postgres |
| DOCA_SQLITE_PATH | ./data/v1/doca.db | 현재의 데이터베이스 파일 |
| DOCA_DATABASE_URL | 아무것도 없음 | 설정된 데이터베이스의 PostgreSQL URL |
| DOCA_BOOK_BATCH_CHECKPOINTS | 에 | 온/오프만 가능; 오프는 배치 복구를 비활성화하며 저장된 체크포인트와 객체를 보존합니다. |
| NODE_ENV | 해제 | 생산 환경에서는 구축된 자산을 사용하고 개발 기능을 비활성화합니다. |
| DOCA_ASSET_BASE | 비어 있음 | 빌드된 자산에 대한 HTTP(S) 프리픽스. 비어 있으면 사용하지 않음 `/assets` 지역적으로 |

<a id="static-asset-urls"></a>

## 정적 자산 URL

생산된 HTML은 항상 Doca에서 제공되며, API도 같은 원본을 사용합니다. `DOCA_ASSET_BASE` 단순히 다시 쓰기만 함 `/assets/...` HTML 내의 URL들.

설정되지 않았을 때, 컨테이너는 JS, CSS 및 기타 빌드 파일을 제공합니다. `/assets`설정된 경우, 그 HTML URL들은 접두사를 사용합니다. 예를 들어 `https://cdn.example.com/doca/0.1.10/assets/index-abc.js`접두사는 userinfo, 쿼리, 또는 해시가 없는 HTTP(S) URL입니다. 공개 사이트의 경우 HTTPS를, 신뢰할 수 있는 내부 네트워크의 경우 HTTP를 사용하세요. `/assets` 컨테이너 내에 남아 있습니다. 루트 경로를 가진 CSS에서 참조된 폰트와 이미지도 여전히 Doca로 반환됩니다.

공식 태그 같은 것 `v1.2.3` GitHub Actions를 사용하여 웹 앱을 빌드하고 릴리스를 생성합니다. 첨부파일은 `doca-web-assets-v1.2.3.tar.gz`. 유지하세요 `assets` 해제 후 디렉터리로 만들고 설정하기 `DOCA_ASSET_BASE` 그것을 포함하는 HTTP(S) 프리픽스로. 예상 출시 전 태그와 같은 `v1.2.3-rc.1` 리프리즈를 생성하지 않습니다. 푸시를... `main` 그것도 안 돼요. 사용하지 마세요. `github.com/.../releases/download` 마치 `DOCA_ASSET_BASE`그 URL은 리디렉션을 수행하지만 ES 모듈에 대한 크로스오리엔티드 헤더를 전송하지 않습니다. 해제된 상태로 두세요. `assets` 크로스오리엔티드 스크립트 읽기를 허용하는 CDN이나 객체 저장소의 디렉터리.

<a id="production-process"></a>

## 생산 과정

```sh
pnpm check
NODE_ENV=production DOCA_ORIGIN=https://docs.example.com pnpm start
```

`check` 타입 검사, 테스트, 웹 빌드를 실행합니다. `start` Vite 없이 빌드된 웹 애플리케이션과 API를 제공합니다. 예제 이름을 바꾸고, 리버스 프록시에서 TLS를 종료하며, Host와 Origin을 유지하고, 포워드합니다. `DOCA_PORT`.

서버는 임의의 것을 신뢰하지 않습니다. `X-Forwarded-*` 헤더. 루프백을 포함한 프록시는 기본적으로 신뢰되지 않습니다. 설정해 주세요. `DOCA_TRUST_PROXY` 실제 프록시 IP/CIDR에만 적용됩니다. 인증 속도 제한은 연결 IP를 기준으로 하므로 한 프록시 뒤에 있는 사용자들이 할당량을 공유할 수 있습니다. 프로덕션 프록시는 신뢰할 수 있는 것으로 설정해야 합니다. 켜지 마세요. `trustProxy` 공공 인터넷을 위해.

<a id="ai-job-logs"></a>

## AI 작업 로그

생산 컨테이너는 Fastify 접근 로그와 백그라운드 AI 작업 오류를 stdout에 기록합니다.

```sh
docker compose ps
docker compose logs -f --tail=200 doca
```

AI 실패를 방지하기 위해:

```sh
docker compose logs --since=30m doca | grep -E "AI job failed|AI 工作流|模型|图片"
```

Docker만으로도 충분합니다. `doca` 컨테이너 이름과 함께. Kubernetes에서는 pod의 stdout을 읽습니다. `kubectl logs`브라우저 세션 API가 반환합니다. `jobs[].id`, `jobs[].status`, 그리고 `jobs[].error`그 일자리 ID와 일치시켜 주세요. `AI job failed`로그에는 편집된 오류 클래스가 기록됩니다. 모델 키나 전체 프롬프트는 표시되지 않습니다.

이것은 실행 가능한 개발 기준으로, 완성된 생산적 수용 단계는 아닙니다. 계정 복구 기능이 구현되었으며, 연락을 통한 복구를 위해 설정된 검증 게이트웨이가 필요합니다. OIDC 제공자로서의 역할은 사용할 수 없으며, 목표 인프라 모니터링 및 대량 쿼리 조정은 별도의 수용 과정을 거쳐야 합니다. 공개 [모니터링 서비스](plugin-monitoring.ko.md) 구현되었습니다. 외부 OIDC 및 소셜 로그인 어댑터가 존재합니다. 실시간 자격 증명이 있습니다. [인증](authentication.ko.md)경계가 있습니다. [건축학](architecture.ko.md).

<a id="data-protection"></a>

## 데이터 보호

- 빈 데이터베이스는 현재 대상에서 생성됩니다. 지원되는 기존 데이터베이스는 시작 시 검토된 추가 내용을 받습니다. 기본 SQLite 경로는 `data/v1/doca.db`.
- 정적 파일들은 단지 `apps/web/dist`. `.archive`, `data`, 그리고 `.env` 공개되지 않았습니다.
- 스타트업은 설치된 구조와 현재의 목표를 조정합니다. 검토나 검증에 실패하면 서버는 듣지 않고 업그레이드 작업이 되돌아집니다. 생산 환경에 전환하기 전에 백업을 하고 복구 테스트를 해야 합니다.
- 오프라인 SQLite 백업은 모든 작성자를 중단시키고, 그 다음 전체 디렉터리를 복사합니다. 온라인 백업은 백업 API를 사용합니다. 주 파일을 복사하고 WAL을 건너뛰는 것은 백업이 아닙니다.
- PostgreSQL은 자체적인 백업 및 복구 기능을 사용합니다. 재해 복구는 운영자의 역할입니다.
- SIGINT 및 SIGTERM은 HTTP, Vite, 그리고 데이터베이스를 종료합니다. 프로덕션 환경에서는 프로세스 관리자를 사용하여 다시 시작합니다.

<a id="database-changes"></a>

## 데이터베이스 변경 사항

읽고 따라 하세요. [데이터베이스 업그레이드 계약](database-schema-evolution.ko.md) 핵심 구조나 유지되는 형식을 수정하기 전에. 이것이 현재 진행 중인 프로젝트 표준입니다: 새로 만들거나 업그레이드할 때는 최신 DDL을 사용합니다. `schemaEvolution` 동의된 추가 사항을 선언하며, 일반적인 추가 사항은 호환성 생성 상태를 유지합니다. 역사적 필드 값과 의미적/파괴적 변경 사항에는 구체적인 동의된 보존, 검증 및 복구 계획이 필요합니다. [AGENTS.md](../AGENTS.md).

데이터베이스 변경에는 격리된 SQLite 및 PostgreSQL 17/18 구버전 스키마의 회귀 작업이 필요하며, 이에는 유지된 행, 기본 설정, 부분적 쓰기 없이 반복적/동시적인 시작 및 검토가 포함됩니다. 릴리스 승인 과정에서는 영향을 받은 실제 릴리스된 구버전으로 생성된 데이터베이스도 업그레이드됩니다. PostgreSQL CI 매트릭스는 `.github/workflows/database-upgrade.yml`이것은 기본 설정과 보완적인 역할을 합니다. 계약서와 업그레이드 안내서에 합의된 동작이나 지원 관련 변경 사항을 반영하세요.

<a id="checks"></a>

## 검사

공동 작업 작업이 시작됩니다. `skills/doca-collaboration/SKILL.md`. `AGENTS.md` 적용되는 경우를 나타냅니다. 인터페이스 언어는 `docs/i18n.md`.

`docs/collaboration-sdk-contract.md` 이것이 계약의 원천입니다. 기술을 게시하면 업데이트됩니다. `references/contract.md`계약서에 제안된 API는 현재 패키지에 이미 포함된 것이 아닙니다. 패키지가 업데이트된 후에는 새로운 아티팩트를 설치하고, 출력된 내용과 스키마를 확인하며, 저장 확인 메시지, 기존 데이터의 복구, 실시간 선택 기능을 확인해야 합니다. 버전 번호만 변경하는 것으로는 충분하지 않습니다.

```sh
pnpm typecheck
pnpm test
pnpm build
```

`tests/cloud.test.ts` 임시 SQLite 데이터베이스와 임시 계정을 사용한 후 해당 디렉터리를 삭제합니다. 실제 사용자 데이터베이스에는 영향을 주지 않습니다.

보장되는 기능에는 개인별 격리, 관리자 포함, 공개 읽기, 유산 및 숨겨진 조상, 버전 충돌, 소유권 이전, 트리 사이클, 이동 시 보조금 재설정, 배치 복원, 독립적 복사본, 코멘트 권한, 중복 불가능한 반응, 알림 격리, 호스트 및 기원, 등록 및 비활성화, 세션 취소, 재시작 유지성, 그리고 OpenAPI 경로가 포함됩니다.

로그인, 홈, 검색에서 문서 열기, 기록 방문, 관리 통계가 로컬 브라우저에서 확인되었습니다. 사례별 브라우저 및 개별적인 PostgreSQL 17/18 확인 내용이 기록되어 있습니다. [인증 기록](verification/README.md)전체 브라우저 지원, 타겟 인프라로서의 PostgreSQL, 키보드 접근성, 프록시 속도 제한, 부하 및 장시간 실행에 대한 인정도 여전히 필요합니다. SQLite을 사용하는 것만으로는 이 요구사항들을 대체할 수 없습니다.
