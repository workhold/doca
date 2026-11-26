<a id="faq-and-troubleshooting"></a>

# FAQ 및 문제 해결

[中文](faq.zh-CN.md)

<a id="is-there-a-default-administrator-password"></a>

## 기본 관리자 비밀번호가 있나요?

아니요. 달리세요. `bash scripts/bootstrap-admin.sh` 컨테이너가 건강한 후에. 비밀번호는 최소 12자리 이상이어야 합니다. 기존 계정의 경우 사용하세요. `bash scripts/reset-admin-password.sh`; 초기화는 비밀번호 재설정이 아닙니다.

<a id="why-does-the-browser-not-connect-to-port-39120"></a>

## 왜 브라우저가 39120번 포트에 연결되지 않나요?

Compose는 포트를 서버의 루프백에 연결합니다. 설정된 HTTP(S) 원본을 사용하세요. `DOCA_ORIGIN`설정된 리버스 프록시를 통해 접근됩니다. 서버 IP URL은 원본 주소와 포트 매핑이 명시적으로 일치할 때만 작동합니다. 매핑, 호스트, 사용되는 TLS, WebSocket 전달을 확인하세요. [배포](deployment.ko.md).

<a id="which-environment-example-should-i-use"></a>

## 어떤 환경 예시를 사용해야 할까요?

출시된 Docker 이미지의 경우, 복사하세요. `docker.env.example`소스 개발을 위해 복사하기 `.env.example`설정하기 `DOCA_ORIGIN`, `DOCA_FILE_STORE_ID`, `DOCA_FILE_STORES_JSON`, 그리고 필요한 지속성 `DOCA_CREDENTIAL_MASTER_KEY` Compose를 시작하기 전에, 새로 설치할 경우 공개 샘플 키를 대체하세요. 기존 데이터베이스의 경우 원본 키를 그대로 유지하세요. 참고하세요. [설정](configuration.ko.md).

<a id="why-do-i-get-421-403-or-a-disconnected-editor"></a>

## 왜 421, 403이 나오거나 편집기가 연결되지 않는가요?

421은 일반적으로 호스트가 설정된 원본과 일치하지 않는다는 요청을 의미합니다. 변형 요청은 동일한 원본이 필요하며, 일치하지 않으면 403이 반환됩니다. 편집도 권한과 작동하는 WebSocket 업그레이드가 필요합니다. `/api/v1/ws`브라우저 주소, 프록시 설정, 계정 상태, 현재 리소스 권한을 확인하세요.

<a id="what-should-i-do-if-startup-rejects-the-database-baseline"></a>

## 스타트업이 데이터베이스 기준값을 거부한다면 어떻게 해야 할까요?

멈춰서 읽어보세요. [데이터베이스 업그레이드 계약](database-schema-evolution.ko.md) 그리고 일치하는 것 [출시 요구사항](releases/0.2.38.md)지원되는 세대는 승인된 구조적 조정을 받습니다. 지원되지 않는 세대의 경우, 의미적 변경 사항 및 검토가 필요한 차이점이 지속적인 변경 전에 시작을 차단합니다. 롤백을 위해 기존 배포, 데이터베이스, 파일 및 비밀 정보를 보존하십시오. 시작을 강제하기 위해 테이블을 삭제하거나 볼륨을 재설정하거나 기준 표시기를 변경하지 마십시오.

<a id="how-do-i-inspect-startup-problems"></a>

## 시작 문제를 어떻게 확인하나요?

```sh
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 doca
curl -fsS -H 'Host: doca.example.com' http://127.0.0.1:39120/health
```

체크아웃에 있는 서버에서 이를 실행하세요. `compose.yaml`비밀 정보가 포함된 로그는 게시하지 마세요. 소스 개발에는 사용하세요. `http://127.0.0.1:39130` 그리고 개발 설정입니다.

<a id="are-github-pages-and-the-doca-application-the-same-deployment"></a>

## GitHub Pages와 Doca 애플리케이션이 같은 배포인가요?

GitHub Pages는 이 정적 문서 웹사이트를 호스팅합니다. Doca 애플리케이션은 컨테이너/서버, 데이터베이스, 영구 파일 및 HTTP(S) 원본이 필요합니다. 문서 사이트 업데이트는 Doca 애플리케이션을 시작하거나 업그레이드하지 않습니다.

<a id="can-i-update-or-restart-without-deleting-my-files"></a>

## 파일을 삭제하지 않고 업데이트하거나 재시작할 수 있나요?

평범한 `docker compose restart` 영구 볼륨을 보존합니다. 설정 변경은 사용됩니다. `docker compose up -d`이미지 버전을 변경하기 전에 릴리스 노트를 읽고 모든 데이터베이스, 참조된 파일 저장소, 보호된 설정을 백업하세요. 피하세요. `docker compose down -v`볼륨을 삭제합니다.

<a id="why-is-a-plugin-or-an-external-service-unavailable"></a>

## 플러그인이나 외부 서비스가 사용할 수 없는 이유는 무엇인가요?

플러그인 패키지는 현재 SDK 및 저장소 계약을 준수해야 합니다. 설치 후 각 인스턴스를 수동으로 재시작해야 합니다. 암호화된 자격 증명을 사용하는 플러그인은 모든 복제본에 동일한 영구 마스터 키가 필요합니다. AI, SSO, 검색 및 클라우드 저장소의 가용성은 실제 자격 증명과 네트워크 연결에도 달려 있습니다; 소스 테스트는 실제 서비스의 수용성을 확인하지 않습니다. 자세한 내용은 참조하십시오. [플러그인 배포](plugin-deployment.ko.md).

위의 health 명령어에서는 실제로 설정된 호스트를 사용하세요. 421은 호스트 불일치를 나타내며, 루프백 테스트도 포함됩니다. 기본적으로는 어떤 프록시도 신뢰되지 않습니다. 공유 프록시 IP 제한이 있으므로 정확하게 설정해야 합니다. `DOCA_TRUST_PROXY`.

<a id="where-do-i-get-the-desktop-client"></a>

## 데스크톱 클라이언트는 어디에서 구할 수 있나요?

Windows와 macOS 설치 프로그램을 다운로드하세요. [GitHub Releases](https://github.com/workhold/doca/releases)이 빌드는 서명되지 않았으며 공증도 되지 않았습니다. macOS에서는 앱을 마우스 오른쪽 클릭하고 선택하세요. **열기** 첫 번째로 사용할 때, Windows에서 스마트스크린 알림이 나타날 수 있습니다. 서버는 0.2.37 이상 버전이어야 합니다. 자세한 내용은 [데스크톱 클라이언트 가이드](desktop-client.ko.md).
