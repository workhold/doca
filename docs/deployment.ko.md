<a id="deploy-doca"></a>

# 도카를 배포하세요.

Tauri 데스크톱 패키지에는 웹 프론트엔드가 포함되어 있으며, 데스크톱 인증 경로를 가진 별도로 배포된 호스트에 연결됩니다. Node 호스트는 포함되어 있지 않습니다. 각 OS/아키텍처 패키지를 개별적으로 빌드하고 검증해야 합니다. 참조하세요. [데스크톱 클라이언트](desktop-client.ko.md).

[中文](deployment.zh-CN.md)

한 서버에서 지정된 이미지를 실행할 수 있습니다. `compose.yaml` 메인에서 사용됩니다. 단일 컨테이너는 SQLite만을 사용하며 PostgreSQL이나 Redis는 필요하지 않습니다. 여러 애플리케이션 복제본을 실행할 경우에만 이들을 사용하세요. [단일 인스턴스 및 수평 확장](horizontal-scaling.ko.md).

<a id="requirements"></a>

## 요구사항

- Docker Engine과 Docker Compose 플러그인.
- 사용자가 접근할 수 있는 HTTP(S) 원본. 공개 HTTPS는 DNS와 TLS 인증서가 필요하며, 신뢰할 수 있는 내부 HTTP도 지원됩니다.
- 컨테이너와 같은 머신에 있는 리버스 프록시. Compose는 Doca만을 배포합니다. `127.0.0.1:39120`.

프록시는 HTTP 및 WebSocket 경로를 전달해야 합니다. `/api/v1/ws`원본을 그대로 유지하세요. `Host` 헤더.

<a id="files"></a>

## 파일들

메인에서 배포 파일을 복제하거나 전송하세요. [GitHub 접근 권한이 없는 서버를 위한 배포 번들](deployment-without-github.ko.md)비즈니스 서버는 소스 체크아웃이 필요하지 않습니다. 재구축된 이미지에는 포함되어 있습니다. `docker/admin.sh`시작 후, 실행하세요. `docker compose exec doca bash docker/admin.sh bootstrap`또는 사용하기 `reset-password` 기존 관리자를 재설정하는 것입니다. 호스트 래퍼 스크립트는 기존의 엔트리포인트를 그대로 유지합니다. 새로운 렌더러는 호스트 seccomp JSON이 필요하지 않습니다. 패키저는 수정 가능한 origin/key 값이 포함된 독립형 새 설치 YAML도 생성합니다. 이러한 변경 사항은 이미지를 다시 빌드해야 하며, 수정되지 않은 기존 이미지와 직접 사용할 수 없습니다.

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
cp docker.env.example .env
```

편집 `.env` 첫 시작 전에.

<a id="required-settings"></a>

## 필요한 설정

파일 저장도 필요합니다. `DOCA_FILE_STORE_ID` 그리고 `DOCA_FILE_STORES_JSON`제시된 대로 `docker.env.example`. 서버 경로와 자격 정보는 환경에서 읽어오며, 관리 페이지는 읽기 전용입니다. 참조하세요. [파일 저장](storage.ko.md).

현재 호스트는 génération을 사용합니다. `doca-2026-10-12-book-payload-storage-v1`스타트업은 자동으로 0.1.22 버전의 데이터베이스를 정렬합니다. `doca-2026-10-09-history-storage-v1` 현재의 DDL 검토/조정을 거쳐 새로운 세대가 기록됩니다. SQL 책의 결과를 포함한 모든 기존 행은 그대로 유지됩니다; 어떠한 변환, 정리 또는 기존 객체 어댑터도 추가되지 않습니다. 남아있는 기존 책 기록은 수동 처리가 필요할 수 있습니다. 기존의 0.1.23 객체 데이터는 그대로 유지됩니다. 참고하세요. [데이터베이스 구조의 발전](database-schema-evolution.ko.md) 그리고 [현재 출시 요구 사항](releases/0.3.1.ko.md)정확한 0.1.13 기준값 `doca-2026-10-08-knowledge-books-v2` 아래의 명시적인 역사 업그레이드가 여전히 필요합니다. 데이터베이스, 개인 정보, 설정 및 원본 자격 증명 마스터 키를 보존해야 합니다.

`DOCA_ORIGIN` 브라우저에서 원본 origin을 입력합니다. 프로덕션 환경에서도 HTTP와 HTTPS가 허용됩니다. 서브패스, 쿼리, 프래그먼트가 없는 원본만 사용하세요; 루트에 trailing slash는 정규화됩니다.

```text
DOCA_ORIGIN=https://docs.example.com
```

Docker 예제는 이미 필요한 파일 저장 값을 제공합니다. 새로 생성된 단일 서버의 경우, 원본을 변경하고 키를 생성하세요. `openssl rand -hex 32`, 그리고 공개 샘플을 교체하세요 `DOCA_CREDENTIAL_MASTER_KEY`플러그인이 없어도 키가 필요합니다. 기존 배포는 원래의 키를 유지해야 합니다. 파일 저장소 값을 보존하세요. PostgreSQL과 Redis는 조건부입니다. 참고하세요. [설정](configuration.ko.md) 기본 설정, S3 필드, 그리고 별도의 Webhook/AI 저장소에 대해서도 마찬가지입니다.

<a id="start"></a>

## 시작하기

0.1.26 버전에서 플러그인 저장소를 하나로 변경함 [공유 비즈니스 데이터베이스](plugin-database-isolation.ko.md)핵심 부분과는 별개로. 0.1.25 버전에서는 모든 인스턴스를 중단하기 전에 모든 외부 비즈니스 플러그인을 정상적으로 제거합니다. 개인 비즈니스 기록, 자격 증명 및 객체는 마이그레이션 없이 삭제되며, 핵심 데이터와 일반 파일은 그대로 유지됩니다. 구식 플러그인 설정은 제거하고, 하나의 PostgreSQL 데이터베이스/계정을 한 번만 설정(SQLite는 자동으로 처리됨), 그 후 플러그인을 다시 설치하고 재설정하세요. 참조하세요. [0.1.26 업그레이드 요구 사항](releases/0.1.26.md).

업데이트하기 전에 모든 기존 호스트를 중단하고 데이터베이스를 백업하세요. 0.1.22 스키마는 현재 시작 시 자동으로 적용되며 기존의 모든 비즈니스 레코드는 그대로 유지됩니다. 수동으로 'book' 명령을 실행할 필요가 없습니다. 유지된 SQL 'book' 결과는 기본 객체 형식에 맞지 않으므로 필요에 따라 남은 레코드를 수동으로 처리해야 합니다. 사용 가능한 결과로 유지하기 위해 기존의 선택적 명령을 실행하세요. [무손실 변환](knowledge-book-storage-verification.ko.md) 첫 시작 전에. 이전 버전의 경우 아래의 전체 업그레이드 과정을 완료해야 합니다. 모든 호스트와 웹 인스턴스를 함께 업데이트해야 합니다.

<a id="upgrade-from-0113"></a>

### 0.1.13에서 업그레이드

모든 Doca 인스턴스를 중단하고 데이터베이스(SQLite WAL 포함), 파일 저장소 및 설정 파일을 백업하세요. 원본을 그대로 보관하세요. `DOCA_CREDENTIAL_MASTER_KEY`현재의 주 배포 파일과 그에 맞는 이미지를 사용하세요. 이를 가져와서 기존 배포 환경에서 오프라인 유지보수 컨테이너를 실행하세요.

```sh
docker compose stop
docker compose pull
docker compose run --rm --no-deps doca node --import tsx apps/server/src/bootstrap/history-storage.ts upgrade --apply
```

단지 `doca-2026-10-08-knowledge-books-v2` 승인되었으며, 명령어는 데이터베이스를 생성하거나 재설정하지 않습니다. 트랜잭션은 모든 원본 스냅샷 바이트를 보존하면서 역사 아카이브 테이블과 작업을 추가합니다. 새로운 호스트가 시작된 후, 가장 최근의 20개의 전체 스냅샷이 데이터베이스에 남아 있습니다. 10개의 오래된 스냅샷 그룹에 대해서는 가장 최신 스냅샷만 파일 저장소에 보관되며, 나머지 9개는 쓰기/읽기 검증 후 삭제되어 애플리케이션에서 복원할 수 없습니다. 저장소 장애가 발생해도 원본 그룹 전체가 보존됩니다. 역사는 하나의 목록으로 표시되며, 불완전한 그룹은 데이터베이스에 남아 있습니다. 자세한 내용은... [역사 저장 및 롤백](storage.ko.md#history-storage-and-offline-upgrade).

명령은 먼저 기록합니다. `doca-2026-10-09-history-storage-v1`현재의 시작 과정에서 승인된 구조 정렬을 적용합니다. `doca-2026-10-12-book-payload-storage-v1`직접적인 역사 롤백 명령은 역사 저장 세대 또는 중단된 롤백 마커만을 받아들일 수 있으므로, 현재 호스트에 의해 이미 정렬된 데이터베이스를 되돌릴 수 없습니다. 참조하세요. [역사 유지 제한](storage.ko.md#history-storage-and-offline-upgrade) 그리고 [책 저장소 복구](knowledge-book-storage-verification.ko.md) 로테이션이 발생하기 전에. 이후의 쓰기 작업과 유지된 파일 바이트를 보존해야 합니다; 샘플링 방식의 역사 기록은 업그레이드 전의 백업이 필요합니다. 오래된 이미지를 새로워진 데이터베이스에 직접 연결해서는 안 됩니다.

```sh
docker compose pull
docker compose up -d
```

`docker compose up -d` 지정된 이미지를 가져옵니다. `compose.yaml`. 추가하기 `--build` 이 체크아웃으로 만들어진 이미지를 원할 때만 그렇습니다.

컨테이너를 확인하세요:

```sh
docker compose ps
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

대체하기 `docs.example.com` 설정된 오리진에 있는 호스트를 사용하며, 비표준인 경우 포트도 포함됩니다. 내장된 컨테이너 프로브는 이미 이 호스트를 제공합니다; 기다리세요. `docker compose ps` 보여주기 `healthy`순수한 루프백 커럴은 421으로 거부됩니다.

건강한 과정이 회복됩니다 `status: "ok"` 그리고 실제 이미지 버전은 `version`.

문서 렌더링에도 배포 검사가 필요합니다: 이 체크아웃 과정에서는 LibreOffice와 샌드박스된 Chromium이 추가되며, 선택적 SAM은 별도의 신뢰할 수 있는 Linux 런타임이 필요합니다. 자세한 내용은 참조하세요. [Docker 문서 렌더러](docker-rendering.ko.md) 컴포넌트 가용성 측면에서는 포함된 Chromium seccomp 정책과 명시적인 SAM 마운트가 필요합니다. 건강한 서버만으로는 이러한 도구들을 확인할 수 없습니다.

SQLite, 업로드된 파일들, 그리고 AI 데이터베이스는 저장되어 있습니다. `doca_data` 볼륨. 처음 시작할 때 데이터베이스는 비어 있어야 합니다. 비어 있지 않은 데이터베이스는 지원되는 호환성 생성 방식을 사용해야 합니다. 검토된 추가적인 변경 사항은 자동으로 조정되지만, 파괴적이거나 의미상의 차이가 있으면 보고되어 검토됩니다. 이미 사용자가 포함된 데이터베이스를 삭제하지 마십시오.

<a id="reverse-proxy"></a>

## 리버스 프록시

동일한 호스트에서 Caddy 또는 Nginx의 TLS를 종료하고 전달합니다. `127.0.0.1:39120`.

```caddyfile
docs.example.com {
	reverse_proxy 127.0.0.1:39120
}
```

Caddy 프록시는 기본적으로 WebSocket 업그레이드를 지원합니다. Nginx 서버도 필요합니다. `Upgrade` 그리고 `Connection` 헤더들 `/api/v1/ws`.

`DOCA_TRUST_PROXY` 기본적으로 비어 있습니다: 루프백 연결을 포함한 전달된 헤더는 신뢰되지 않습니다. 감사 및 제한을 위해 클라이언트 IP를 유지하려면 애플리케이션이 실제로 보는 프록시 IP/CIDR만 설정해야 합니다. Docker 브리지는 호스트 프록시를 브리지 게이트웨이로 표시할 수 있습니다. `127.0.0.1`이 값을 선택하기 전에 배포 네트워크를 확인하세요. 이 값이 없으면 프록시로 연결된 사용자들이 프록시 IP 할당량을 공유할 수 있습니다.

다른 머신에 있는 로드 밸런서가 이 호스트에 연결될 경우, 개인 인터페이스에서 컨테이너 포트를 공개하되 단순히 루프백으로만 전송하지 말고, 설정하세요. `DOCA_TRUST_PROXY` 그 로드 밸런서의 IP 범위에 속합니다. 공개 인터넷을 신뢰하지 마세요.

신뢰할 수 있는 내부 HTTP 사이트의 경우, 설정하기 `DOCA_ORIGIN=http://doca.internal` 그 주소를 HTTP 리버스 프록시를 통해 전달할 수 있습니다. 선택한 프라이빗 인터페이스에 컨테이너 포트를 배포하고 그 포트를 Origin에 포함시킬 수도 있습니다. 제공된 Compose 매핑은 단지 루프백에만 적용됩니다. 개발 모드의 우회는 필요하지 않으며, 프로덕션 모드를 유지하세요. HTTP 지원은 Host나 Origin 검증을 변경하지 않습니다.

<a id="create-the-administrator"></a>

## 관리자를 생성하세요.

기본 계정이나 비밀번호는 없습니다. 컨테이너가 정상적으로 작동하면, 다음 디렉터리에서 이 명령을 실행하세요. `compose.yaml`:

```sh
bash scripts/bootstrap-admin.sh
```

스크립트는 로그인 정보와 비밀번호를 요청합니다. 비밀번호는 최소 12자리여야 합니다. 이 값은 단지 해당 컨테이너 명령어에만 전달됩니다. 데이터베이스에는 해시가 저장됩니다. 관리자가 이미 존재하는 경우, 명령어는 중단되며 현재 비밀번호는 변경되지 않습니다.

<a id="change-a-password"></a>

## 비밀번호 변경

로그인한 사용자가 열기 `#/account` 그리고 선택한다 **비밀번호 변경**새로운 비밀번호는 최소 12자리여야 합니다. 저장된 후에는 해당 계정의 모든 세션이 종료됩니다.

관리자가 로그인할 수 없을 때, 배포 디렉터리에서 기존 계정을 초기화하세요:

```sh
bash scripts/reset-admin-password.sh
```

이 기능은 계정을 생성하지 않으며 HTTP를 통해 사용할 수 없습니다. 데이터베이스 파일이 잠겨 있는 경우, 실행하세요. `docker compose stop`비밀번호를 재설정한 다음, `docker compose up -d`로그인 정보나 비밀번호를 입력하지 마세요. `.env`.

<a id="static-assets"></a>

## 정적 자산

HTML 페이지와 API는 그대로 유지됩니다. `DOCA_ORIGIN`. `DOCA_ASSET_BASE` 변경 사항만 `/assets/...` 그 HTML 내의 URL들.

서버가 Brotli를 협상합니다.`br`), gzip, 또는 원본 바이트를 사용하여 `Accept-Encoding` 그리고 보내다 `Vary: Accept-Encoding`URL과 빌드된 파일은 변경되지 않으며, 기존의 빌드 디렉터리도 그대로 유지됩니다. HTML 자산의 URL은 압축 전에 다시 작성됩니다. 서버는 각 프로세스당 32 MiB의 인코딩된 공개 정적 리소스 캐시를 사용하며, 이미지에 압축된 사본을 추가하거나 개인적인 API/파일 응답을 이 방식으로 압축하지 않습니다. 프로킷/CDN은 인코딩 협상 과정을 유지해야 합니다. `Vary`또는 자체적으로 압축 처리를 할 수도 있습니다. 이는 브라우저 전송에 영향을 미칩니다; Docker는 자체 이미지-레이어 압축 및 캐시를 사용합니다.

건설된 것 `/cad/` 작업자 파일과 WASM은 동일한 인코딩 협상 방식을 사용하며 그대로 유지됩니다. `no-cache` 그들의 이름이 해시화되지 않았기 때문입니다. 선언된 CAD 자산 외부의 경로는 사용할 수 없습니다.

JavaScript, CSS 및 컨테이너에서 생성된 다른 파일들을 사용하려면 설정하지 않고 두세요. `/assets`설정할 때, userinfo, query, hash 또는 마지막 슬래시가 없는 HTTP(S) 접두사를 사용하세요.

```text
DOCA_ASSET_BASE=https://cdn.example.com/doca/0.1.11
```

참조된 페이지 `/assets/index-abc.js` 그러면 로드됩니다:

```text
https://cdn.example.com/doca/0.1.11/assets/index-abc.js
```

전체를 게시하기 `apps/web/dist/assets` 그 접두사에 있는 디렉터리를 유지하세요. `assets` 경로 세그먼트. 파일 이름에는 콘텐츠 해시가 포함되어 있으며, 같은 이미지 내의 HTML과 일치해야 합니다. API 요청은 그대로 유지됩니다. `DOCA_ORIGIN`.

공식 태그 같은 것 `v1.2.3` 웹 애플리케이션을 구축하고 연결합니다. `doca-web-assets-v1.2.3.tar.gz` GitHub 릴리스로 가져가세요. 그걸 추출하고, 보관하세요. `assets` 디렉터리로 만들고, 그 디렉터리를 ES 모듈에 대한 크로스오리엔티드 헤더를 전송하는 CDN에 배치하세요. 사용하지 마세요. `github.com/.../releases/download` URL로 표시 `DOCA_ASSET_BASE`밀어내는 힘 `main`또는 사전 출시 태그와 같은 것 `v1.2.3-rc.1`그것은 그 릴리스를 생성하지 않습니다.

컨테이너는 자체적으로 유지됩니다. `/assets` 파일들. 스타일시트에서 참조된 폰트와 이미지들은 여전히 Doca에서 로드됩니다.

`index.html` 보내짐 `Cache-Control: no-cache`그래서 릴리스 후 새로운 방문하면 새로운 페이지를 얻을 수 있습니다. 해시된 파일은... `/assets/` 보내짐 `Cache-Control: public, max-age=31536000, immutable`그들의 이름은 콘텐츠가 변경될 때 바뀌기 때문에, 1년 동안 저장된 캐시는 새로운 HTML이 로드된 후에는 오래된 스크립트를 유지하지 못합니다. 앞에 CDN이 있는 경우 `DOCA_ASSET_BASE` 해시된 파일들에도 같은 긴 캐시가 필요합니다.

<a id="configure-static-cdn-response-headers"></a>

### 정적-CDN 응답 헤더 설정

`DOCA_ASSET_BASE` URL을 변경합니다; CDN을 설정하지 않습니다. 업로드된 S3 빌드 객체를 `Cache-Control: public, max-age=31536000, immutable` 그리고 콘텐츠 타입을 유지하세요 (`text/javascript` JS를 위해, `text/css` CSS를 위한 것입니다. 메타데이터를 변경하지 않고 기존 객체를 커버하려면 CloudFront를 연결하세요. **응답 헤더 정책** 단지 정적에만 `*/assets/*` 행동: Cache-Control을 추가하세요. **사용자 정의 헤더** 와서 **오버라이드**크로스오리엔티드 ES 모듈도 필요합니다. `Access-Control-Allow-Origin: https://doca.example.com`; 이 공개된 빌드 파일들은 사용할 수 있습니다 `*` 인증 정보 없이. 이 정책을 HTML, API 또는 개인 파일에 첨부하지 마세요.

정적 해시 파일을 설정하세요. **캐시 정책** 별도로: 최소 TTL 0, 기본/최대 TTL 31536000초. 응답 헤더 정책은 브라우저 헤더를 변경하며, Edge TTL은 변경되지 않습니다; 참조 [AWS 응답 헤더 정책](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)새로운 파일명을 발표하고, 이미 열린 페이지에서 나중에 부분적으로 로드될 때 더 오래된 버전을 유지합니다.

정적인 Nginx CDN은 표준 방식으로 릴리스 디렉터리를 다음과 같이 제공할 수 있습니다. `mime.types` 서버에 로드됨:

```nginx
location /doca/0.2.12/assets/ {
    alias /srv/doca/0.2.12/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "https://doca.example.com";
}
```

도카를 프록시링할 때 `/assets/`기존의 origin 헤더를 숨깁니다. `proxy_hide_header Cache-Control;` 대체품을 추가하기 전에. 예시에서는 생략됨 `always` 따라서 누락된 파일들은 1년간의 404 캐시를 받지 못합니다. 최종 CDN 응답을 확인하세요.

```sh
curl -I https://cdn.example.com/doca/0.2.12/assets/<actual-hashed-JS-filename>.js
```

Cache-Control, Content-Type 및 CORS를 확인하세요. HTML은 재인증을 통해 Doca에 남아 있습니다. 문서 이미지와 보호된 파일의 경우에는 사용하세요. [저장: 브라우저 이미지 캐싱 및 파일 CDN](storage.ko.md#browser-image-caching-and-the-file-cdn).

<a id="knowledge-book-payload-conversion"></a>

## 지식-북 페이로드 변환

0.1.25는 일반적인 스키마 비교를 통해 지원되는 기존 세대를 정렬하며, 자동적인 책 정리나 런타임 바디 어댑터 없이 모든 비즈니스 데이터를 보존합니다. 기존의 타겟 세대 객체는 변경되지 않습니다. 기존의 [선택적 무손실 처리 과정](knowledge-book-storage-verification.ko.md) 오래된 SQL 결과가 계속 사용 가능하도록 하려면 첫 번째 시작 전에 반드시 실행해야 합니다. 중단된 변환 작업의 경우 원래의 매니페드가 필요합니다. 백업을 복원할 때 모든 데이터와 후속 작업을 보존해야 하며, 모든 호스트와 웹 빌드를 함께 업데이트해야 합니다.
