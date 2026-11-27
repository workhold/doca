<a id="deploy-without-github-access"></a>

# GitHub 접근 권한 없이 배포하기

[简体中文](deployment-without-github.zh-CN.md)

비즈니스 서버에는 소스 체크아웃, Git, Node.js 또는 pnpm이 필요하지 않습니다. 먼저 Docker Engine, Docker Compose 플러그인, Bash 및 OpenSSL을 설치한 다음 배포 파일을 전송하고 이미지를 준비한 후 Doca를 시작하고 관리자 계정을 초기화합니다. 이 가이드는 SQLite와 로컬 파일 저장소가 있는 새로 생긴 단일 서버에 Doca 0.3.1을 설치합니다. 기존 설치된 경우 확인해야 합니다. [출시 요구사항](releases/0.3.1.ko.md) 그들의 데이터베이스, 파일, 설정, 그리고 자격 증명 마스터 키를 보존합니다.

<a id="fresh-installation-from-one-yaml"></a>

## YAML 파일을 이용한 신규 설치

`node scripts/pack-deployment.mjs` 또한 출력됨 `doca-compose-vVERSION.yaml` 그리고 그 체크섬. YAML 파일을 전송하여 저장하세요. `compose.yaml` 영구 배포 디렉터리에서 수정하기 `DOCA_ORIGIN` 그리고 당신이 생성한 것 `DOCA_CREDENTIAL_MASTER_KEY`, 그것을 보호하세요 `chmod 600 compose.yaml`그런 다음 실행하세요 `docker compose up -d`. 아니요 `.env`seccomp JSON 또는 외부 관리자 스크립트가 필요합니다. 해당 0.3.1 이미지를 사용하세요; 독립형 YAML 및 체크섬도 GitHub Release에 함께 제공됩니다.

서비스가 건강한 후에 실행하세요. `docker compose exec doca bash docker/admin.sh bootstrap`; 사용하기 `reset-password` 비밀번호 재설정을 위한 것입니다. 비밀번호 입력은 숨겨져 있으며 YAML 파일에 저장되지 않습니다. 이 예시는 새로 설치된 SQLite/local-storage 환경에만 적용됩니다. 기존 사이트는 프로젝트 이름, 볼륨 및 키를 그대로 유지합니다. 백업에는 보호된 YAML 파일이 포함됩니다. 리버스 프로킷 관련 요구 사항은 아래에 설명된 대로 유지됩니다.

<a id="_1-transfer-deployment-files"></a>
<a id="1-transfer-deployment-files"></a>

## 1. 배포 파일 전송

리포지토리 접근 권한이 있는 사람이 main을 클론하고 배포 번들을 생성합니다:

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
node scripts/pack-deployment.mjs
```

아래의 아카이브 이름과 이미지 태그는 0.3.1을 예시로 사용합니다. 패키저가 생성한 파일명과 생성된 Compose 파일에 지정된 이미지를 사용하세요.

전송 `doca-deploy-v0.3.1.tar.gz` 그리고 그것 `.sha256` 기업 파일 서비스, 내부 다운로드 URL 또는 이동식 저장소를 통한 체크섬을 확인합니다. 패키저는 공개된 배포 파일만 읽고 로컬 파일은 포함하지 않습니다. `.env`사용자 데이터나 컨테이너 이미지입니다. 해당 태그에 대한 GitHub Release에는 번들과 체크섬이 포함되어 있습니다.

비즈니스 서버의 동일한 디렉터리에 두 파일을 넣고 확인한 후 추출합니다.

```sh
sha256sum -c doca-deploy-v0.3.1.tar.gz.sha256
tar -xzf doca-deploy-v0.3.1.tar.gz
cd doca-deploy-v0.3.1
```

macOS에서는 사용하세요. `shasum -a 256 -c doca-deploy-v0.3.1.tar.gz.sha256`이 디렉터리에서 다음 배포 명령을 실행하세요:

```text
doca-deploy-v0.3.1/
  compose.yaml
  docker.env.example
  README.zh-CN.md
  README.md
  LICENSE
  scripts/
    bootstrap-admin.sh
    reset-admin-password.sh
```

이 번들은 환경 변수와 지속적인 마운트를 유지하며, 소스 빌드 설정을 제거하고, 사용합니다. `pull_policy: missing`재구축된 이미지는 PDF/캔버스 런타임을 포함하며, seccomp JSON은 전송되지 않습니다. 기존 설치 환경은 Compose 프로젝트, 볼륨, 설정 및 마스터 키를 그대로 유지합니다. 이러한 변경 사항은 재구축된 이미지를 필요로 하며, 게시된 기존 이미지들은 원래의 배포 요구 사항을 여전히 준수합니다.

<a id="copy-compose-and-env-manually"></a>

### 복사, 작성 및 .env 파일을 수동으로 처리하기

텍스트 전달을 위해 이 단일 서버 구성을 저장하세요. `compose.yaml` 그리고 매칭 호스트를 사용하세요. `scripts/` 원한다면, 또는 내장된 이미지 관리자 명령을 사용할 수 있습니다. 이 패키지에는 추가적인 선택적 설정도 포함되어 있습니다; 이 예시에서는 SQLite와 로컬 저장만 사용됩니다.

```yaml
services:
  doca:
    image: docker.io/smartdoca/doca:0.3.1
    pull_policy: missing
    restart: unless-stopped
    init: true
    stop_grace_period: 30s
    environment:
      NODE_ENV: production
      DOCA_ORIGIN: "${DOCA_ORIGIN:?Set DOCA_ORIGIN in .env}"
      DOCA_HOST: 0.0.0.0
      DOCA_PORT: "39120"
      DOCA_DATABASE: sqlite
      DOCA_SQLITE_PATH: /data/doca.db
      DOCA_BOOK_BATCH_CHECKPOINTS: "${DOCA_BOOK_BATCH_CHECKPOINTS-on}"
      DOCA_AI_SQLITE_PATH: /data/ai.db
      DOCA_DATA_DIR: /data
      DOCA_FILE_STORE_ID: "${DOCA_FILE_STORE_ID:?Set DOCA_FILE_STORE_ID in .env}"
      DOCA_FILE_STORES_JSON: "${DOCA_FILE_STORES_JSON:?Set DOCA_FILE_STORES_JSON in .env}"
      DOCA_CREDENTIAL_MASTER_KEY: "${DOCA_CREDENTIAL_MASTER_KEY:?Generate and set the key in .env}"
    ports:
      - "127.0.0.1:39120:39120"
    volumes:
      - doca_data:/data

volumes:
  doca_data:
```

다음 내용을 저장하세요. `.env`실제 브라우저 원본을 설정하고, 다음 단계에서 생성된 마스터 키를 입력하세요.

```dotenv
DOCA_ORIGIN=https://docs.example.com
DOCA_CREDENTIAL_MASTER_KEY=
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

<a id="_2-configure-the-environment-and-proxy"></a>
<a id="2-configure-the-environment-and-proxy"></a>

## 2. 환경 및 프록시 설정

팩에 대해서는 다음 명령을 실행하세요. 만약 생성했다면 복사는 생략하세요. `.env` 수동으로:

```sh
cp docker.env.example .env
openssl rand -hex 32
chmod 600 .env
```

생성된 64자리 16진수 값을 작성하세요. `DOCA_CREDENTIAL_MASTER_KEY`공개 예제를 대체하기. 설정 `DOCA_ORIGIN` HTTP(S) 원본 사용자들에게 열리게 됩니다. 키를 한 번 생성한 후 안전하고 별도로 백업하여, 재시작 시에도 보관하세요. 로컬 저장소 루트는 `/data/storage`관리자 자격 증명을 넣지 마세요. `.env`.

Compose는 단지에만 결합됩니다. `127.0.0.1:39120`그러므로 같은 서버에 리버스 프록시를 설정하세요. 공개 HTTPS의 경우, Caddy를 사용할 수 있습니다.

```caddyfile
docs.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

서버에 DNS를 지정하고 인증서 발급을 허용하거나 기존의 기업 인증서를 사용하세요. 인터넷 접속이 없는 신뢰할 수 있는 내부 네트워크의 경우, 다음과 같이 설정하세요. `DOCA_ORIGIN=http://doca.internal`내부 DNS 또는 클라이언트 호스트 항목을 설정하고, 공개 인증서 발급 없이 이 HTTP 프록시를 사용하세요.

```caddyfile
http://doca.internal {
    reverse_proxy 127.0.0.1:39120
}
```

다른 프록시는 보존해야 합니다. `Host` 그리고 HTTP 및 WebSocket 업그레이드를 전달합니다. `/api/v1/ws`비즈니스 환경은 먼저 프로킷인 Docker와 그 설치 패키지를 제공해야 합니다. 이들은 배포 번들에 포함되어 있지 않습니다.

<a id="_3-prepare-the-image"></a>
<a id="3-prepare-the-image"></a>

## 3. 이미지를 준비하세요.

<a id="docker-hub-is-reachable"></a>

### Docker Hub에 접근할 수 있습니다.

GitHub가 차단되었지만 Docker Hub는 접근 가능하다면, 미리 만들어진 이미지를 다운로드하세요.

```sh
docker compose pull doca
```

<a id="registries-are-also-unreachable"></a>

### 등록 시스템도 접근할 수 없다.

공급업체는 레지스트리 접근이 가능한 기계에서 이미지 아카이브를 준비합니다. 먼저 대상 CPU 아키텍처를 확인하세요. 이 예제에서는 Linux x86-64를 사용합니다.`linux/amd64`); ARM64의 경우, 사용하세요 `linux/arm64` 전달된 파일에 해당하는 라벨을 붙이세요:

```sh
docker pull --platform linux/amd64 docker.io/smartdoca/doca:0.3.1
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
docker save -o doca-image-v0.3.1-linux-amd64.tar docker.io/smartdoca/doca:0.3.1
sha256sum doca-image-v0.3.1-linux-amd64.tar > doca-image-v0.3.1-linux-amd64.tar.sha256
```

이미지를 전송하세요. `.tar` 그리고 체크섬을 함께 사용합니다. 비즈니스 서버의 그들의 디렉터리에서입니다.

```sh
sha256sum -c doca-image-v0.3.1-linux-amd64.tar.sha256
docker load -i doca-image-v0.3.1-linux-amd64.tar
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
```

로드된 태그가 맞는지 확인하세요. `smartdoca/doca:0.3.1` 아키텍처가 목표와 일치하면 배포 디렉터리로 돌아갑니다. 내부 레지스트리는 또 다른 전달 옵션입니다: 공급업체가 동일한 릴리스 이미지를 전송하고 비즈니스 팀이 Compose를 변경합니다. `image` 풀기 전에 그 내부 레지스트리 주소를 사용하세요. 번들, 이미지, 초기화 스크립트를 동일한 릴리스에 유지하세요.

<a id="_4-start-and-initialize-the-database"></a>
<a id="4-start-and-initialize-the-database"></a>

## 4. 데이터베이스를 시작하고 초기화합니다.

이미지를 다운로드하거나 로드한 후, 배포 디렉터리에서 실행하세요:

```sh
docker compose config --quiet
docker compose up -d --pull never --no-build
docker compose ps
```

`--pull never --no-build` 로컬 이미지를 사용하며, 이미지가 없으면 실패하고, 온라인 다운로드나 소스 빌드를 시도하지 않습니다. 첫 번째 시작 시 현재 데이터베이스 스키마와 파일/AI 데이터 디렉터리를 비어 있는 위치에 생성합니다. `doca_data` 볼륨. 수동적인 SQL 또는 데이터베이스 설치가 필요하지 않습니다. 기존의 오래된 데이터베이스는 자동으로 업그레이드되지 않습니다.

기다려 `docker compose ps` 보여주기 `healthy`수동 검사 시에는 Host를 사용해야 합니다. `.env`비표준 포트를 포함한 경우:

```sh
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

예상할 것 `{"status":"ok","version":"0.3.1"}`내부 예시를 위해서는 사용하세요. `Host: doca.internal`바레 루프백 요청은 호스트 검증에 실패합니다. 시작 실패를 확인하세요. `docker compose logs --tail=100 doca`.

<a id="_5-initialize-the-administrator"></a>
<a id="5-initialize-the-administrator"></a>

## 5. 관리자를 초기화합니다.

서비스가 정상적으로 작동하면 같은 배포 디렉터리에서 실행하세요:

```sh
bash scripts/bootstrap-admin.sh
```

로그인 정보와 최소 12자리 이상의 비밀번호를 입력하고 확인합니다. 비밀번호는 숨겨져 있습니다. 스크립트는 준비된 이미지와 동일한 영구 볼륨을 사용하여 단 한 번만 실행되는 컨테이너를 시작합니다. 관리자가 없을 경우에만 계정을 생성하며, 데이터베이스에는 비밀번호 해시가 저장됩니다. 기본 로그인 정보나 비밀번호는 없습니다. 설정된 내용을 열어보세요. `DOCA_ORIGIN` 로그인하세요.

기존 관리자 비밀번호를 나중에 재설정하려면:

```sh
bash scripts/reset-admin-password.sh
```

이것은 계정을 생성하지 않습니다. 데이터베이스가 잠겨 있으면 실행하세요. `docker compose stop`비밀번호를 재설정한 다음, `docker compose up -d --pull never --no-build`.

<a id="preserve-data-and-deliver-later-releases"></a>

## 데이터를 보존하고 후속 릴리스를 제공합니다.

사용하기 `docker compose restart` 일반적인 재시작에 해당합니다. 배포 디렉터리와 Compose 프로젝트 이름을 그대로 유지하세요. `doca_data` 볼륨이 사용되고 있으므로, 둘 중 하나를 변경하면 실수로 별도의 빈 사이트가 생길 수 있습니다. 영구 볼륨 내의 모든 데이터베이스와 파일 저장소, 그리고 보호된 내용도 모두 백업하세요. `.env` 그리고 마스터 키. `docker compose down -v` 볼륨을 삭제했으므로 일반적인 재시작이나 업그레이드에는 사용할 수 없습니다.

검토해 보세요. [출시 요구사항](releases/0.3.1.ko.md) 업그레이드하기 전에 맞는 번들과 이미지를 제공해야 합니다. 이 가이드는 새로 시작하는 사이트를 초기화하며 기존 데이터는 변환하지 않습니다. 비밀번호 로그인 및 로컬 문서 서비스는 GitHub 접근이 필요하지 않습니다; AI, 외부 로그인, 플러그인 설치 또는 클라우드 스토리지를 위한 외부 서비스는 여전히 접근 가능해야 합니다. 대상 호스트에서 문서 렌더링을 별도로 확인하십시오: 애플리케이션의 건강 상태만으로는 PDF, 캔버스 및 오피스 렌더링의 정확성을 보장할 수 없습니다. 참조하십시오. [Docker 문서 렌더링](docker-rendering.ko.md).
