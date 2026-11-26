<a id="quick-start"></a>

# 빠른 시작

[中文](quickstart.zh-CN.md)

이 가이드는 compose.yaml에 지정된 이미지를 하나의 서버, SQLite, 그리고 로컬 파일 저장소에서 설치합니다. Git, Docker Engine, Docker Compose 플러그인, 그리고 서버에 연결된 도메인이 필요합니다. 해당 서버에 있는 리버스 프록시는 HTTPS 또는 신뢰할 수 있는 내부 HTTP를 제공할 수 있습니다. 이미지를 실행하기 위해 Node.js나 pnpm이 필요하지 않습니다.

이것은 새로 설치된 것입니다. 기존 배포는 이를 읽어야 합니다. [출시 요구사항](releases/0.2.38.md) 첫째, 지원되는 호환성 버전 내에서 추가적인 변경 사항이 자동으로 업그레이드됩니다. 호환되지 않는 기준값 및 의미적 변경 사항은 별도로 처리해야 합니다. 기존 데이터베이스, 파일, 설정은 그대로 유지됩니다.

서버가 GitHub에 접속할 수 없다면, 소스를 클론하지 않고 Compose, 환경 예제, 보안 정책, 관리자 스크립트를 전송해야 합니다. 참조하세요. [GitHub 접근 권한 없이 배포하기](deployment-without-github.ko.md) 복사 가능한 Compose와 함께 `.env` 파일, 오프라인 이미지 전송, 그리고 초기화.

<a id="_1-clone-the-repository"></a>
<a id="1-clone-the-repository"></a>

## 1. 저장소를 클론합니다.

주 컴포지트 파일과 관리자 스크립트를 함께 얻기 위해 메인 클론을 사용합니다.

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
```

<a id="_2-configure-env"></a>
<a id="2-configure-env"></a>

## 2. .env 파일 설정하기

```sh
cp docker.env.example .env
```

새로운 설치의 경우, 먼저 자격 증명 마스터 키를 생성하세요:

```sh
openssl rand -hex 32
```

출력 결과는 32개의 무작위 바이트로, 64개의 16진수 문자로 인코딩되어 있습니다. 수정하기 `.env`예제 도메인을 자신의 HTTP(S) 원본으로 바꾸고 `DOCA_CREDENTIAL_MASTER_KEY` 생성된 가치와 함께:

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_CREDENTIAL_MASTER_KEY=7a52d29ab6db9a08292b9585d0dc5551f4156c2d02953b4262611bc1ad82f9ab
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

`DOCA_CREDENTIAL_MASTER_KEY` 플러그인이 없어도 시작 시에 필수적입니다; 누락된, 비어 있는 또는 잘못된 값은 시작을 거부합니다. 예제 파일에는 공개된, 올바르게 형식화된 샘플이 포함되어 있습니다; 새로 설치하려면 자신의 키로 대체하세요. 안전하고 별도로 백업하되, 복제본과 재시작에서 동일한 값을 사용하세요. 기존 배포는 원래의 키를 유지해야 하며, 업그레이드를 위해 키를 다시 생성하지 마세요. 대체 키는 데이터베이스 지문 검사에 의해 거부됩니다; 기존 암호문은 자동으로 변환되지 않습니다. 자세한 내용은...을 참조하세요. [관리된 자격 증명](plugin-credentials.ko.md).

서브패스, 쿼리, 또는 파편 없이 오리진만 사용하세요. 루트에 있는 마지막 슬래시는 정규화됩니다. 유지하세요. `/data/storage` 컨테이너의 영구 볼륨 내에. `docker.env.example` 이것은 Docker를 위한 것입니다. `.env.example` 는 위해서입니다. [소스 개발](development.ko.md).

동일한 서버에 리버스 프록시를 설정하세요. 예를 들어 Caddy를 사용하는 경우는 다음과 같습니다.

```caddyfile
doca.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

Caddy는 TLS를 종료하고 HTTP 및 WebSocket 트래픽을 전달합니다. DNS는 이 서버로 지정되어야 하며, 프록시는 자체 인증서를 획득할 수 있어야 합니다. 다른 프록시는 이를 보존해야 합니다. `Host` 그리고 WebSocket 업그레이드를 전달합니다. `/api/v1/ws`. 보기 [배포](deployment.ko.md).

<a id="_3-pull-the-image"></a>
<a id="3-pull-the-image"></a>

## 3. 이미지를 끌어올리기

```sh
docker compose pull
```

Compose는 지정된 이미지를 사용합니다. `compose.yaml` 메인에서 진행됩니다. 이 단계에서는 미리 만들어진 이미지를 다운로드할 뿐, 소스 코드를 빌드하지는 않습니다.

<a id="_4-start-doca"></a>
<a id="4-start-doca"></a>

## 4. 도카를 시작하세요

```sh
docker compose up -d
docker compose ps
```

컨테이너가 건강해지기를 기다리세요. 건강 반응은:

```json
{"status":"ok","version":"<image version>"}
```

스타트업이 실패하면 점검해 보세요. `docker compose logs --tail=100 doca`Compose 포트가 바인딩되어 있습니다. `127.0.0.1`브라우저 접속은 프록시를 통해 설정된 HTTP(S) 원본을 사용합니다.

<a id="_5-initialize-the-administrator-password"></a>
<a id="5-initialize-the-administrator-password"></a>

## 5. 관리자 비밀번호를 초기화합니다.

동일한 디렉터리에 `compose.yaml`, run:

```sh
bash scripts/bootstrap-admin.sh
```

관리자 로그인 정보, 최소 12자리의 비밀번호, 그리고 다시 비밀번호를 입력합니다. 현재 스크립트는 중국어로 프롬프트를 내보내며, 비밀번호 입력은 숨겨져 있습니다. Doca에는 기본 계정이나 비밀번호가 없습니다. 스크립트는 동일한 데이터베이스에 한 번만 컨테이너를 실행하고 비밀번호 해시를 저장합니다. 관리자 계정이 이미 존재하는 경우, 해당 계정을 변경하지 않고 초기화가 중단됩니다.

열기 `https://doca.example.com` 로그인하세요. 관리자 로그인 정보나 비밀번호를 입력하지 마세요. `.env`기존 관리자 계정을 복구하려면 사용하세요. [비밀번호 재설정](deployment.ko.md#change-a-password).

<a id="next-steps"></a>

## 다음 단계

- 읽어보세요 [사용자 가이드](user-guide.ko.md) 문서와 라이브러리를 만들기.
- 리뷰 [인증](authentication.ko.md) SSO 등록 또는 설정하기 전에.
- 읽기 [설정](configuration.ko.md), [파일 저장](storage.ko.md), 그리고 [운영](deployment.ko.md) 저장소를 변경하거나 백업을 만들기 전에.
- 사용하기 [수평 확장](horizontal-scaling.ko.md) 여러 복제본을 배포할 때만.

SQLite, 업로드, 플러그인, 그리고 AI 데이터베이스는 사용됩니다. `doca_data` 볼륨. 재시작에도 그 볼륨을 보존하고, 참조되는 모든 데이터베이스, 저장소, 그리고 보호된 설정을 백업에 포함시켜야 합니다. `docker compose down -v` 그 볼륨을 삭제해야 하며, 일반적인 재시작이나 업그레이드에는 사용해서는 안 됩니다.
