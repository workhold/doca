<a id="configuration"></a>

# 구성

타우리 데스크톱 클라이언트는 웹 프론트엔드를 포함하고 별도로 설정된 원격 호스트에 연결합니다. 로컬 비즈니스 호스트를 제공하지 않으며 원격 호스트의 배포 설정을 변경하지도 않습니다. 참조하세요. [데스크톱 클라이언트](desktop-client.ko.md).

[中文](configuration.zh-CN.md)

선택하세요 `docker.env.example` 작곡을 위한 것 `.env.example` 소스 개발을 위해서는 저장소 루트로 복사하세요. `.env`그들은 다른 기원과 데이터베이스 경로를 사용합니다; 둘 다 보여줍니다. `/data/storage` 컨테이너의 영구 파일 볼륨에 관한 내용입니다. 소스 개발 시에는 저장 위치를 컴퓨터上的 절대적 쓰기 가능한 디렉터리로 변경하세요. 출처를 바꾸거나 비밀 정보를 커밋하지 마세요.

<a id="required-compose-settings"></a>

## 필요한 작성 설정

| 변수 | 요구사항 | 단일 서버 예제 |
| --- | --- | --- |
| `DOCA_ORIGIN` | HTTP(S) 원본으로 명시적으로 설정해야 합니다. | `https://doca.example.com` |
| `DOCA_FILE_STORE_ID` | 비어 있지 않아야 하며, JSON 내의 스토어를 식별해야 합니다. | `local` |
| `DOCA_FILE_STORES_JSON` | 비어 있지 않아야 합니다. 물리적 백엔드를 포함한 유효한 버전 1 설정입니다. | 아래를 보세요. |
| `DOCA_CREDENTIAL_MASTER_KEY` | 모든 시작 시에 필요; 정확히 64개의 16진수 문자(32바이트) | 생성하기 `openssl rand -hex 32` |

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

새로운 단일 서버 설치의 경우, **공개 출처를 변경하고 공개 예제 자격 증명 키를 교체하세요.** 출력물과 함께 `openssl rand -hex 32`; 필요한 파일 저장 값은 이미 제공되었습니다. PostgreSQL, Redis, 모델 키 및 SSO 자격 증명은 조건부입니다. 기존 배포는 원래의 마스터 키를 유지해야 합니다.

자격 증명, 서브패스, 쿼리, 또는 프래그먼트가 없는 HTTP(S) 원본을 사용하세요. 루트에 있는 마지막 슬래시는 정규화됩니다. 프로덕션 환경에서는 HTTP와 HTTPS 모두를 허용합니다. 프록시는 설정된 값을 유지합니다. `Host`; 오직 특정인에게만 보내는 요청 `127.0.0.1` 호스트 검사에 실패했습니다. 참조 [건강 검사](deployment.ko.md#start).

<a id="defaults-depend-on-the-entry-point"></a>

## 기본값은 입력 지점에 따라 달라집니다.

| 입장 지점 | 기원 | 데이터베이스 / 파일 | 자격 증명 마스터 키 |
| --- | --- | --- | --- |
| 리포지토리 코프로세스 | 필요함 `.env` | SQLite `/data/doca.db`; 파일 ID/JSON이 필요함 `.env`; `doca_data` 설치됨 `/data` | 필요; 영구 배포 키를 사용하세요. |
| Compose 없이 게시된 이미지 | HTTP(S) 원본을 제공해야 합니다. | 이미지는 SQLite와 로컬 저장소 기본 설정을 명시적으로 제공합니다. `/data`; 지속적인 마운트 `/data` 자신 | 필요; 영구 배포 키를 사용하세요. |
| 소스 개발 | `http://127.0.0.1:39130` | SQLite `./data/v1/doca.db`; 파일 ID/JSON이 필요하며, 제공된 값 `.env.example` | 필요; 공개 예시 키를 교체하세요 |

소스 파일-저장 파서에는 암시적 기본값이 없습니다; 이미지의 기본값은 명시적인 Dockerfile 환경 값입니다. 로컬 저장소는 쓰기 가능한 영구적인 루트가 필요합니다. S3는 필요합니다. `bucket`, `region`, 부울 `forcePathStyle`, 그리고 명시적 `credentials:{accessKeyId,secretAccessKey,sessionToken?}`선택적 엔드포인트는 자격 증명, 서브패스, 쿼리, 혹은 프래그먼트가 없는 HTTP(S) 루트 원본이어야 합니다. 명시적인 HTTP 엔드포인트는 RustFS와 같은 신뢰할 수 있는 내부 객체 저장소를 지원합니다. 운영자는 네트워크 접근을 제어할 수 있으며, 사이트, 자산 및 CDN 원본도 HTTP(S)를 지원합니다. AWS 셸 자격 증명은 이러한 JSON 필드를 대체하지 않습니다. 자세한 내용은 참조하세요. [파일 저장](storage.ko.md) RustFS 설정 예제를 위해.

오브젝트가 저장된 후에도 스토어 ID와 물리적 위치는 계속 사용할 수 있어야 합니다. 설정된 현재 스토어 ID는 기록된 활성 ID와 일치해야 하며, ID, 경로 또는 버킷을 수정해도 데이터는 이동되지 않습니다. 마이그레이션 단축 조치로 이러한 값을 변경하지 마세요.

<a id="conditional-settings-and-optional-backends"></a>

## 조건부 설정 및 선택적 서버

| 변수 | 필요할 때 / 기본값 |
| --- | --- |
| `DOCA_DATABASE=postgres`, `DOCA_DATABASE_URL` | PostgreSQL 선택에는 URL이 필요합니다. 기본 데이터베이스는 SQLite입니다. |
| `DOCA_DATABASE_POOL_MAX` | 프로세스당 주 데이터베이스 연결 수; 기본값 10 |
| `DOCA_WEBHOOK_DATABASE_URL` | 선택적 명시적 PostgreSQL 전달 데이터베이스; 그렇지 않을 경우 아래에 설명된 대로 생성됩니다. |
| `DOCA_REDIS_URL` | 크로스인스턴스 이벤트, 존재 여부, 속도 제한에 필요; 설정되지 않으면 프로세스별 구현이 사용됩니다. |
| `DOCA_REDIS_PREFIX`, `DOCA_INSTANCE_ID` | 접두사는 기본값으로 설정됨 `doca`; 인스턴스 ID는 랜덤한 프로세스 ID로 설정됩니다 |
| `DOCA_TRUST_PROXY` | 쉼표로 구분된 신뢰할 수 있는 프록시 IP/CIDR; **기본적으로 어떤 프록시도 신뢰되지 않습니다.**루프백을 포함한 |
| `DOCA_PLUGINS_DIR` | 쓰기 가능한 설치/캐시 디렉터리; Compose는 기본적으로 `/data/plugins` |
| `DOCA_PDF_PYTHON` | PDF 내보내기용 고정된 WeasyPrint 의존성을 갖춘 파이썬 실행 파일; 기본값으로 `python3`, `/opt/doca-pdf/bin/python` Docker에서. 구식입니다. `DOCA_PDF_CHROMIUM` 거부됨 |
| `DOCA_PLUGIN_STORE_URL` | HTTP(S) 원본; 기본값 `https://store.smartdoca.cc` |
| `DOCA_PLUGIN_NPM_REGISTRY` | 사전 빌드 패키지 레지스트리; 기본값 `https://registry.npmjs.org` |
| `DOCA_ASSET_BASE` | 선택적 구축 자산 접두사; 비어 있음 `/assets` 도카로부터 |
| `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE` | 각 소스 페이지에 대해 지불된 이미지 요청을 제출합니다. 설정되지 않을 경우 기본값은 5입니다. 양수인 안전한 정수 값이 필요합니다. 0, 비어 있거나 잘못된 값은 시작 시 실패합니다. |
| `DOCA_AI_IMAGE_SEGMENT_PROFILE` | 신뢰할 수 있고 엄격한 버전 1의 로컬 SAM2 프로필에 대한 선택적 절대 경로입니다. 이 값을 설정하지 않으면 세분화 기능이 비활성화됩니다. 잘못된 명시적 설정은 시작 실패를 초래하며, 사용할 수 없는 검증된 런타임은 도구를 사용할 수 없게 합니다. 자세한 내용은... [로컬 세분화](ai-image-segmentation.md) |

이미지 요청 제한은 서버가 시작될 때 고정됩니다. 예를 들어, 설정하세요. `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE=10` 소스에서 또는 Compose에서 `.env` 서버를 재시작하거나 컨테이너를 다시 생성해야 합니다. 모든 복제본은 동일한 제한을 사용해야 합니다. 재시도, 재시작, 프롬프트 변경 또는 배치의 재등록은 축적된 시도 횟수를 지우지 않습니다. 처리 중이거나 불확실한 요청은 계산에 포함되지 않습니다; 참조 내보내기와 로컬 재구성은 그렇지 않습니다. 기존 이미지, 요청 기록 및 사용량은 변경되지 않습니다. 제한을 낮추면 유료 요청이 거부되며, 이는 제한을 초과한 순서의 유료 시도 수락도 포함됩니다; 이러한 기록은 절대 건너뛰거나 변환되지 않습니다. 배치 버전 3과 유료 시도 버전 1은 변경되지 않습니다; 더 오래된 배치 형식은 마이그레이션 없이 여전히 거부됩니다.

누락된, 비어 있는 또는 잘못된 마스터 키는 배포를 포함한 플러그인이 없는 배포도 시작을 거부합니다. 런타임에는 기본 키가 없습니다. 새 설치를 위해 예제 파일에 있는 공개 예제 값을 대체해야 합니다. 한 번 생성하세요. `openssl rand -hex 32`별도로 백업을 하고, 모든 복제본/재시작에서 같은 키를 사용하세요. 보세요. [관리된 자격 증명](plugin-credentials.ko.md).

웹호크 전송은 항상 별도의 데이터베이스를 사용합니다. SQLite가 생성합니다. `webhooks.db` 주 데이터베이스 옆. PostgreSQL는 기본적으로 `<main_database>_webhooks`데이터베이스가 없으면 생성 시도가 발생합니다. 계정에 데이터베이스 생성 권한이 없다면, 해당 전용 데이터베이스를 미리 생성하고 접근 권한을 부여하거나 설정하세요. `DOCA_WEBHOOK_DATABASE_URL` 접근이 용이한 전용 데이터베이스로. AI 스토어는 사용합니다. `ai.db` 코프레즈와 함께 `doca_ai` 주요 PostgreSQL 데이터베이스의 스키마입니다; PostgreSQL 권한이 초기화를 허용해야 합니다. 외부 AI 모델이 설정되지 않았더라도 이러한 저장소는 백업이 필요합니다.

여러 복제본을 사용하려면 공유된 PostgreSQL, Redis, 그리고 파일 저장소가 필요합니다. 변수를 변경해도 기존 데이터는 전송되지 않습니다. 읽기 [수평 확장](horizontal-scaling.ko.md) 그리고 [출시 요구사항](releases/0.2.24.md).

<a id="passing-environment-variables-through-compose"></a>

## Compose를 통해 환경 변수 전달하기

`.env` 공급품: 인터пол레이션을 구성합니다. 모든 변수를 자동으로 컨테이너로 전달하지는 않습니다. 설정은 명시된 것만 적용됩니다. `compose.yaml` 서비스에 접근할 수 있습니다. 컨테이너의 바인딩 주소, 포트, SQLite/AI 경로, 데이터 디렉터리는 현재 파일에 고정되어 있습니다. 해당 값을 커스터마이징할 때 환경, 포트 매핑, 영구 마운트를 함께 변경해야 합니다.

추가적인 환경 변수는 Compose 서비스 환경에서 명시적으로 전달되어야 하며 배포 디렉터리에 설정되어야 합니다. `.env`.

<a id="administrator-settings-and-applying-changes"></a>

## 관리자 설정 및 변경 사항 적용

시스템 로고는 이에 따라 관리됩니다. **사이트 및 서비스 → 사이트 정보 → 시스템 로고**관리자들은 최대 5MB 크기의 PNG/JPEG/WebP 이미지를 미리보고 저장하거나 기본 아이콘을 복원할 수 있습니다. 이 아이콘은 네비게이션, 로그인 및 문서가 아닌 페이지의 팬 아이콘에 표시되며, 문서 탭은 각자의 아이콘을 유지합니다. 표준화된 PNG는 저장됩니다. `settings.site_logo`다른 사이트 설정과 동일한 수정 사항을 사용합니다. 역사적 NULL 값은 기본 아이콘을 유지합니다. 보기 [0.2.24 업그레이드 요구 사항](releases/0.2.24.md) 기존 설치를 업데이트하기 전에.

등록, 신원 제공자, 인증 게이트웨이, 검색, AI 모델, 웹호크 구독은 각각의 관리 페이지를 사용합니다. 파일 서버 자격 증명은 환경에 남아 있으며, 저장 페이지는 읽기 전용입니다. 플랫폼 서비스 자격 증명과 플러그인 암호화 자격 증명은 별도의 서비스입니다. 자세한 내용은 참조하세요. [서비스 자격 증명](service-credentials.ko.md).

`docker compose config --quiet` 해결된 비밀번호를 출력하지 않고 인터пол레이션을 검증합니다. 애플리케이션 JSON, 데이터베이스 접근, 클라우드 자격 증명의 작동 여부를 검증하지 않습니다. 다음으로 재시작하세요. `docker compose up -d`로그와 상태를 확인한 후, 설정된 서비스를 실행하세요. 참고하세요. [배포](deployment.ko.md) 그리고 [개발](development.ko.md).

<a id="login-lifetime"></a>

## 로그인 생명주기

`DOCA_SESSION_TTL_SECONDS` 브라우저, QR 로그인 및 WebView 세션을 제어하며, 데이터베이스 만료 및 세션 쿠키도 포함됩니다. `Max-Age`기본값은 `86400` 초 (24시간). `DOCA_MOBILE_SESSION_TTL_SECONDS` 모바일 보유자 세션과 그 기존 갱신 프로세스를 관리합니다. 기본값은 `15552000` 초 (180일). 둘 다 1에서 2147483647까지의 소수 정수를 받습니다. 비어 있거나, 0이거나, 음수이거나, 잘못된 값은 시작을 거부합니다. ComposeExplicit은 두 변수를 모두 전달합니다.

```dotenv
DOCA_SESSION_TTL_SECONDS=86400
DOCA_MOBILE_SESSION_TTL_SECONDS=15552000
```

배포 변경 사항을 적용하려면 다시 시작하세요. 이미 발행된 브라우저 세션은 저장된 만료일을 그대로 유지하며, 새로운 로그인은 새로운 기간을 사용하고, 모바일 재활성화는 설정된 모바일 기간을 사용합니다. 세션 행이나 저장된 형식은 변환되지 않습니다. 세션 및 인증-플로우 쿠키는 사용됩니다. `Secure` HTTPS에서는, HTTP는 그대로 유지됩니다. `HttpOnly` 그리고 기존의 SameSite 정책도. HTTP 사이트는 사용합니다. `ws` 실시간 연결을 위해.

승인된 HTTP 브라우저 어댑터는 UUID v4를 제공합니다. `crypto.getRandomValues` 때에 `crypto.randomUUID` 누락되어 있으며, SHA-256만 제공됩니다. `crypto.subtle.digest` 핀된 것을 통과하여 `@noble/hashes` 때에 `crypto.subtle` 누락되어 있습니다. 네이티브 구현은 존재할 경우 계속 사용됩니다. 디그래스는 네이티브 바이트와 일치하며, 기존 ID, 스프레드시트 체크섬 및 문서 형식은 변환되지 않습니다. 이는 다른 WebCrypto 작업을 지원하지 않습니다.

텍스트 복사 버튼은 하나의 공유 도구를 사용합니다. 사용 가능한 경우 네이티브 클립보드를 사용하고, 그렇지 않으면 승인된 HTTP 어댑터가 임시 텍스트 영역을 통해 복사를 수행합니다. `document.execCommand("copy")`집중과 선택 상태를 복구하고, 실패 상황을 보고합니다. 시스템 클립보드를 읽거나 실패한 복사 작업을 성공으로 처리하지 않습니다.
