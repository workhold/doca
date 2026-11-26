<a id="docker-document-renderers"></a>

# Docker 문서 렌더러

[简体中文](docker-rendering.zh-CN.md)

재구축된 이미지는 WeasyPrint 70.0을 사용하여 풍부한 텍스트/Markdown PDF를 내보내고, Node, 네이티브 Canvas 및 resvg를 사용하여 AI 캔버스 PNG를 생성합니다. Chromium이나 Playwright 런타임이 필요 없으며, 호스트 seccomp JSON, 추가적인 브라우저 공유 메모리, 또는 브라우저 사용자-네임스페이스 설정도 필요하지 않습니다. 변경된 Compose 파일을 사용하기 전에 새로운 이미지를 빌드해야 합니다; 이전에 게시된 이미지들은 자동으로 이 렌더러를 얻지 못합니다.

PDF 읽기, 페이지별 텍스트/이미지 및 수정 가능한 임포트는 여전히 PDF.js를 사용합니다. LibreOffice Writer, Calc, Impress 및 Math는 시각적 변환 기능을 유지합니다. `.docx`, `.xlsx` 그리고 `.pptx`CJK 및 리베이لي제이션 글꼴은 그대로 유지됩니다. 공식, 다이어그램, 인코딩된 이미지, 긴 표 및 CJK 페이징 방식은 실제 출력 결과를 통해 확인해야 합니다. 건강 검진만으로는 시각적 정확도를 확인할 수 없습니다.

PDF 작업에서는 고정된 Python 환경을 사용합니다. `DOCA_PDF_PYTHON=/opt/doca-pdf/bin/python`임베드된 데이터 리소스만 허용됩니다; 네트워크 및 호스트-파일 읽기는 거부됩니다. 읽을 수 없거나 손상된 이미지나 글꼴은 불완전한 PDF를 반환하는 대신 실패합니다. 32 MiB 입력 제한, 2개 작업 동시 실행, 60초 마감 기한 및 후렌더링 후 재검사 권한은 그대로 유지됩니다. 캔버스 작업은 SDK 엔진, 승인된 자산, 선택/크롭, 경고, 대기열 및 취소 기능을 유지합니다. 두 렌더러는 취소나 마감 기한이 도래하면 종료되는 일회용 프로세스에서 실행됩니다.

`DOCA_PDF_CHROMIUM` 명시적으로 거부되며 브라우저 대체 옵션은 없습니다. 기존 문서, 데이터베이스, 첨부파일, 키 및 볼륨은 그대로 유지됩니다. SDK의 과거 읽기 기능은 저장된 데이터 변환 없이 기존 경로를 유지합니다. 롤백은 이전 코드, 종속성 잠금, 이미지 및 배포 설정을 복원하면서 후속 작업은 보존합니다. 이전의... `docker/chromium-seccomp.*` 파일들은 출처 확인 및 오래된 렌더러 비교를 위해만 남아 있으며, 새로운 배포 버전에는 포함되지 않습니다.

<a id="image-size-and-update-downloads"></a>

## 이미지 크기와 업데이트 다운로드

브라우저를 제거하면 공간이 절약되지만, Python/Pango/resvg는 의존성 요소를 추가합니다. LibreOffice, 글꼴, 애플리케이션 의존성 및 웹 자산은 그대로 남습니다. 동일한 버전/아키텍처의 압축된 레이어를 비교해 보세요; Docker Desktop의 멀티아키텍처 로컬 사용은 다운로드 예상치가 아닙니다.

웹 자산, 공통 종속성 및 편집기는 별도의 레이어, 경로 및 권한을 유지합니다. 참조하세요. [층별 검증](verification/image-web-layers-2026-10-23.md).

<a id="container-verification"></a>

## 컨테이너 검증

```sh
DOCA_RELEASE_QA_IMAGE=your-rebuilt-image node scripts/qa-release-render-image.mjs arm64
```

사용하기 `amd64` x86-64를 위한 것입니다. 이 실습에서는 네트워크가 없고 읽기 전용 루트가 있는 비루트 디스펜시브 컨테이너에서 실제 PDF 출력, 캔버스 픽셀 및 Office 변환을 수행하며 사용자 문서는 포함되지 않습니다. Docker의 기본 보안 정책만으로도 충분합니다. 실제 프로덕션 호스트를 별도로 확인해야 합니다; 한 아키텍처가 다른 아키텍처의 결과를 보장하지 않습니다.

<a id="optional-sam-runtime"></a>

## 선택적 SAM 런타임

기본적인 Doca 이미지에는 사용 가능한 SAM2/PyTorch 런타임, 세분화 작업자, 또는 모델 가중치가 포함되어 있지 않습니다. Core PDF/Office 읽기에는 SAM이 필요하지 않습니다. 세분화 기능을 활성화하는 것은 관리자가 직접 설치해야 하는 과정이며, AI 작업에 의해 다운로드되는 것이 아닙니다.

승인된 Doca 릴리스와 정확히 일치하는 신뢰할 수 있는 커스텀 이미지를 사용하여 사전 빌드된 런타임에 필요한 인터프리터/시스템 라이브러리를 추가하세요. Bookworm Python 3.11 CPU 런타임의 경우, 배포에 사용된 Dockerfile에는 다음이 포함될 수 있습니다:

```dockerfile
ARG DOCA_IMAGE
FROM ${DOCA_IMAGE}
USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*
USER node
```

승인된 이미지 다이제스트를 사용하여 빌드하세요. 예를 들어 `docker build --build-arg DOCA_IMAGE=docker.io/smartdoca/doca@sha256:YOUR_APPROVED_DIGEST -t doca-sam-runtime:local .`. 디게스트는 관리자가 선택한 릴리스 정보이며, 예시에는 그러한 정보가 없습니다. Python 환경을 준비하세요. **이 리눅스 이미지 내부와 그 아키텍처에 대해**, 동시에 `/opt/doca-segment` 실행 시 사용되는 경로입니다. macOS 가상 환경을 이 경로에 복사해서는 안 됩니다. Linux/amd64에서는 [공식적인 CPU 휠 명령어](https://pytorch.org/get-started/previous-versions/#v251) PyTorch 2.5.1과 torchvision 0.20.1을 제공합니다; 다른 아키텍처의 경우 별도로 검증된 사용 가능한 wheel과 맞는 프로파일 정보가 필요합니다.

신뢰할 수 있는 번들에는 정확한 릴리스 워커, 설치된 핀된 의존성들, 핀된 공식 SAM2 패키지의 링크가 없는 실행 환경 사본, 사전 예약된 체크포인트, 그리고 엄격한 프로필이 포함되어야 합니다. **실제 리눅스 경로, 버전 및 바이트/트리 해시**. 보기 [리눅스 프로필 준비 방법](ai-image-segmentation.md#linux-docker-profile) 또한 엄격한 설치/작업자 계약도 존재합니다. 번들 관리자의 소유로 유지되며 컨테이너 UID 1000이 읽을 수 있어야 합니다. 파일/디렉터리는 그룹이나 다른 사용자에 의해 쓰기 불가능해야 합니다. 모델 입력은 해당 경로를 선택하거나 변경할 수 없습니다.

만들기 `compose.segmentation.yaml` Docker Compose 2.24.4 이상이 필요합니다. `!reset` 기본 파일의 애플리케이션 빌드가 여러분이 별도로 빌드한 신뢰할 수 있는 런타임 이미지를 덮어쓰는 것을 방지합니다.

```yaml
services:
  doca:
    build: !reset null
    image: doca-sam-runtime:local
    pull_policy: never
    environment:
      DOCA_AI_IMAGE_SEGMENT_PROFILE: /opt/doca-segment/profile.json
    volumes:
      - type: bind
        source: /srv/doca-segment-linux
        target: /opt/doca-segment
        read_only: true
        bind:
          create_host_path: false
```

이 마운트는 독립적입니다. `/data`업로드된 문서와 자격증. 모델 키, QA 인증 상태 또는 가족 사진은 런타임 번들에 넣지 마세요. 변수를 설정하는 것 `.env` 혼자서는 기본 Compose 파일을 통해 전달하지도 않고 이 마운트도 제공하지 않습니다. 애플리케이션 데이터베이스가 없는 단일 컨테이너에서 설치된 프로필을 검증한 후에야 활성화해야 합니다. 잘못된 설정은 시작 시 실패를 초래하며, 사용할 수 없는/일치하지 않는 런타임 파일은 도구를 사용할 수 없게 만듭니다. 애플리케이션을 다시 생성할 때는 모든 지정된 오버라이드를 사용해야 합니다.

```sh
docker compose -f compose.yaml -f compose.segmentation.yaml config --quiet
docker compose -f compose.yaml -f compose.segmentation.yaml up -d
```

실행 시간/해시 검사는 설치 정보를 확인하는 것이며, 마스크나 최종 이미지의 품질과는 관련이 없습니다. 각 실제 후보, 마스크 및 전달 과정은 여전히 현재의 시각적 검사 및 허가/소스 바인딩이 필요합니다. 무게 업그레이드는 새로운 인증된 실행 환경/프로필과 조정된 재시작이 필요하며, 기존 프로필이나 유지된 마스크는 자동으로 변환되지 않습니다.

<a id="build-privacy"></a>

## 개인정보 보호를 구축하세요.

`.dockerignore` 제외됨 `.cache`, `.local`애플리케이션 빌드 컨텍스트에서의 데이터베이스, 환경 파일, 테스트 및 스크립트. 배포 런타임 번들, 체크포인트, 개인용 인수 작업물 및 자격 증명은 해당 컨텍스트 외에 유지해야 합니다. 배제는 로컬 파일을 삭제하지 않습니다. SAM 커스텀 이미지 빌드는 승인된 배포 파일만 포함된 별도의 최소 컨텍스트를 사용해야 합니다.


웹 출력물에는 독립적인 CAD, 폰트 및 입력 레이어가 있으며, 최소 512 KiB 이상의 8개의 대용량 파일 그룹과 안정적인 파일 이름으로 할당된 16개의 소규모 코드 그룹도 있습니다. 한 부분의 Vite 콘텐츠 해시 이름 변경은 기존 그룹에 그대로 유지되며, 배포된 경로, 바이트 및 권한은 변경되지 않습니다. 실제 컴파일된 웹 OCI 실험에서는 1번의 입력-부분 이름 변경/재할당 후 27개 레이어 중 25개를 재사용하여 334,554개의 압축된 바이트가 추가됩니다. 실제 Vite CSS 재구축에서는 27개 레이어 중 13개를 재사용하고 4,489,097개의 압축된 바이트가 추가되며(이전 전체 웹 레이어보다 약 77.2% 적음). 이는 측정된 사례이며, 모든 업데이트에 대해 고정된 크기는 아닙니다. 전체 웹 레이어에는 작은 추가 헤더 비용이 있습니다. 자세한 내용은...을 참조하세요. [검토된 층의 증거](verification/image-web-layers-2026-10-23.md).
