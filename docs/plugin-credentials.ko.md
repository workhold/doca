<a id="host-managed-plugin-credentials"></a>

# 호스트가 관리하는 플러그인 자격 증명

[中文](plugin-credentials.zh-CN.md)

출시: 호스트 0.1.10과 SDK 0.1.9를 배포하며, 이에는 SDK 소스 0.1.8에서 추가된 자격증명 API도 포함됩니다. SDK 0.1.7에서는 이를 내보내지 않습니다. 메일 플러그인은 명시해야 합니다. `^0.1.9` 호스트 소스를 가져오거나 비밀번호를 직접 저장하는 대신 공용 서버 토큰을 사용합니다.

```ts
import { pluginCredentialToken } from '@smartdoca/plugin-sdk/storage';

// Declare pluginCredentialToken in injections.required.
const credentials = ctx.inject(pluginCredentialToken);
const created = await credentials.create({value: JSON.stringify({password: 'example'})});
// Store created.id in the plugin database with the business account and grants.
const metadata = await credentials.inspect(created.id); // No plaintext.
const stored = await credentials.get(created.id); // Server plaintext or null.
if (stored) {
  const refreshed = await credentials.update({
    id: stored.credential.id,
    expectedRevision: stored.credential.revision,
    value: JSON.stringify({accessToken: 'new', refreshToken: 'new-refresh'}),
  });
  await credentials.remove({id: refreshed.id, expectedRevision: refreshed.revision});
}
```

메타데이터는 `{id, revision, createdAt, updatedAt}`호스트가 ID를 생성하며, 플러그인은 ID, 스코프, 데이터베이스 이름, 서버 설정 정보를 제공할 수 없습니다. `get` 반환 `{credential: metadata, value: string} | null`; `inspect` 메타데이터를 반환하거나 null을 반환합니다. 값은 최대 64 KiB의 UTF-8 형식의 유효한 유니코드 문자열입니다. 플러그인은 OAuth 객체를 명시적으로 시리얼화하며, 암시적 형식 변환은 없습니다.

업데이트와 삭제는 양의 정수가 필요합니다. `expectedRevision`단 하나의 동시 업데이트만 성공합니다. 유효하지 않은 수정본이 반환됩니다. `conflict`새로운 refresh 토큰을 덮어쓰는 대신, 비즈니스 규칙을 다시 읽고 적용하세요. 누락된 레코드는 무효화됩니다. 유효하지 않은 입력은 거부됩니다. `invalid-input`; 유효하지 않은 설치, 손상된 기록, 서비스/데이터베이스 장애, 또는 누락된 기록 업데이트 시 오류 발생 `unavailable`오류에는 입력값 부재, SQL, 연결 설정, 또는 기반 암호화 관련 문제가 포함됩니다.

AES-256-GCM 인증 암호화는 레코드를 특정 객체와 연결합니다. `plugin:<pluginId>`설치 생성, UUID, 및 수정 정보입니다. 데이터베이스는 암호화된 기록을 저장하며, 각 쓰기 작업에서는 새로운 무작위 비밀번호를 사용합니다. 다른 플러그인은 이러한 기록을 읽거나 업데이트하거나 삭제할 수 없습니다. 비활성화하거나 종료하면 해당 기록이 보존됩니다. 명시적인 제거는 레지스트리 트랜잭션에서 해당 생성의 자격 증명을 제거하고 오래된 핸들을 무효화하며, 재설치는 새로운 생성을 사용합니다. 제거를 완료하기 전에 텍스트 형태의 정보가 필요한 경우 외부 취소 작업을 수행합니다. SDK는 비즈니스 계정 인증을 결정하지 않습니다: 플러그인은 읽기 전에 사용자/계정 권한을 확인하고, 브라우저, AI 컨텍스트, 로그, 또는 일반 설정 API로 텍스트 형태의 정보를 결코 반환하지 않습니다.

자격증 작업과 플러그인 비즈니스 거래는 별도로 처리됩니다. 자격증 생성 후 비즈니스 참조 저장에 실패하면 자격증을 삭제하여 보상합니다. 플러그인은 외부 OAuth 갱신, 데이터베이스 커밋, 손실된 응답을 각자의 규칙에 따라 복구합니다. 서비스 간 거래, 중복성 키 생성, 일반 작업 조정자, 자동 키 회전은 없습니다. 자세한 내용은...을 참조하세요. [저장 예시](../examples/plugin-storage/README.md)플러그인은 신뢰할 수 있는 Node.js 프로세스에서 실행됩니다. 스코프된 API는 운영 체제 샌드박스가 아닙니다.

<a id="deployment-environment"></a>

## 배포 환경

`DOCA_CREDENTIAL_MASTER_KEY` 32개의 무작위 바이트가 64개의 16진수 문자로 인코딩되어야 합니다; 그걸 생성하세요. `openssl rand -hex 32`한 번 설정하고 재시작 시에도 유지하며 별도로 백업해야 합니다. 플러그인이 없어도 모든 호스트 시작 시에는 키가 필요합니다. 키가 누락되거나 비어 있거나 잘못된 구성이면 시작이 거부됩니다. 예제 파일에는 설명을 위해 공개된 샘플 값만 포함되어 있습니다. 새로 설치할 때는 이 값을 바꾸고 기존 배포의 경우 원본 키를 유지해야 합니다. 데이터베이스는 키 지문을 저장합니다. 일치하지 않는 키는 데이터를 다시 암호화하지 않고 시작을 거부합니다. 마지막 플러그인을 제거해도 이 키 식별 정보는 사라지지 않습니다. 데이터베이스를 공유하는 모든 프로세스는 동일한 키를 사용합니다.

운영자는 데이터베이스와 파일 저장소를 선택합니다: 하나의 인스턴스를 위해 SQLite/로컬 파일을 사용하고, 여러 인스턴스를 위해 공유 데이터베이스와 클라우드 저장소를 설정합니다. 플러그인 API는 배포 토폴로지를 선택하지 않습니다. 데이터베이스, 풀, 웹호크 데이터베이스, Redis 및 인스턴스 설정을 조합할 수 있습니다. [docker.env.example](../docker.env.example).

파일 저장은 단지...으로 설정됩니다. `DOCA_FILE_STORE_ID` 그리고 엄격한 버전 1 `DOCA_FILE_STORES_JSON`S3/CDN 자격 정보도 포함됩니다. 스토리지 관리 페이지는 읽기 전용이며, 이전 스토리지 설정 제출은 거부됩니다. 자세한 내용은 [실행 기록](unified-storage-implementation.md) 예시를 위해서입니다. 플러그인 마스터 키와 클라우드 스토리지 연결 자격 증명은 독립적입니다. 기존의 ID, 메시징, 검색 플랫폼 설정은 이 업그레이드로 인해 변환되거나 다시 암호화되지 않습니다.

데이터베이스 기준값은 `doca-2026-10-03-credentials-v2`이전에 합의된 버전 정책에 따라 0.1.9 이전 버전의 호스트 데이터베이스는 거부됩니다. 기존 데이터베이스, 객체, 배포를 보존하며, 자동 테이블 수리, 마이그레이션, 임포트, 리셋 기능은 제공되지 않습니다. 새로 생성된 빈 데이터베이스를 사용해야 합니다. 롤백 기능은 원래의 배포/데이터를 사용하며, 새로운 배포 데이터는 별도로 보존됩니다. SDK 0.1.7의 누락된 자격 증명 서비스는 자체 관리되는 로컬 파일을 통해 우회해서는 안 됩니다.
