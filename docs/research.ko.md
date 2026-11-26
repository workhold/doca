<a id="research-and-acceptance-records"></a>

# 연구 및 승인 기록

[中文](research.zh-CN.md)

실행 지침, 제안서 및 과거 승인 기록은 각각 다른 버전 범위를 가집니다. 제안서나 오래된 제한 사항, 과거 테스트는 현재의 동작을 결정하지 않습니다. 공개 가이드, 계약 실행 목록 및 일치하는 릴리스 노트를 사용하십시오. 원본 기록은 그 언어, 날짜 및 검증 범위를 그대로 유지합니다. 공개 내비게이션이 아닌 링크는 외부 리포지토리 자료를 참조하십시오.

<a id="implementation-notes"></a>

## 실행 지침

- [权限申请、本地副本与事件同步（2026-09-11）](access-offline-events.md)
- [AI 첨부파일, 문서 읽기 및 초안 작성](ai-attachments.md)
- [플러그인 아키텍처下的 AI 제공 및 소비 최적화](ai-efficiency.md)
- [图片任务验收与返修](ai-image-acceptance.md)
- [图片模型适配器](ai-image-models.md)
- [로컬 이미지 분할 및 원래 부위 ROI](ai-image-segmentation.md)
- [AI 기반 화면과 데모 도구](ai-native-editors.md)
- [AI 장기 작업 성능](ai-performance.md)
- [브라우저 빠른 참고](browser-quick-note.md)
- [内容指纹与搜索对账](content-fingerprint-reconciliation.md)
- [文件存储与历史保留](file-storage.md)
- [大数据量列表审计](large-list-audit.md)
- [视觉与选择控件](ui-style.md)

<a id="design-and-upgrade-records"></a>

## 디자인 및 업그레이드 기록

- [플러그인 시작 전 격리 (2026-11-01)](../specs/003-plugin-startup-isolation/spec.md)
- [단계적 SDD 도입 (2026-11-01)](../specs/001-sdd-adoption/spec.md)

- [저장된 이미지 수정 계약 (2026-10-07 승인)](ai-image-revision-proposal.md)
- [지역별 저장 이미지 수정 설계 (2026-10-07 승인)](ai-image-local-revision-proposal.md)
- [历史快照分层存储与抽稀（中文）](history-storage-proposal.zh-CN.md)
- [지식-북 페이로드 저장 구현 계획](knowledge-book-payload-storage-plan.md)
- [知识册正文对象存储实施方案（中文）](knowledge-book-payload-storage-plan.zh-CN.md)
- [지식-북 저장소 평가](knowledge-book-storage-assessment.md)
- [知识册存储评估（中文）](knowledge-book-storage-assessment.zh-CN.md)
- [플러그인 SDK 공용 기능 및 인터페이스 확장 리팩토링](plugin-sdk-expansion.md)
- [产品与架构：重新设计基线](product-design.md)
- [个人文档扁平化与文档转移设计](superpowers/specs/2026-09-18-personal-docs-flattening-design.md)
- [统一授权来源与权限计算方案](superpowers/specs/2026-09-19-unified-authorization-design.md)
- [도카 브라우저 어시스턴트와 웹페이지 저장 설계](superpowers/specs/2026-10-20-browser-clipper-design.md)
- [편집기 패키지 업그레이드 기록 — 2026-10-14](releases/pending-editor-package-upgrade.md)
- [编辑器包升级记录 — 2026-10-14（中文）](releases/pending-editor-package-upgrade.zh-CN.md)
- [역사적 변화: 독립적인 플러그인 데이터베이스](releases/pending-plugin-database-isolation.md)
- [历史变更：插件独立业务库（中文）](releases/pending-plugin-database-isolation.zh-CN.md)

<a id="historical-implementations"></a>

## 역사적 구현 사례

- [HTTP API v0.1](api-history.md)
- [편집자, 공동 작업, 알림, 검색](collaboration-history.md)
- [문서 상호작용, 공유 및 역사](document-experience-history.md)
- [문서 통합 및 발견](editor-integration-history.md)
- [파일, 온라인 문서 및 RAG/Wiki 통합 설계](file-rag-wiki-design.md)
- [知识体系输入模板](knowledge-base-examples.md)
- [知识体系：定义、订阅、整理与独立问答](knowledge-system-design.md)
- [메일 플러그인 전달](plugin-mail-handoff.md)
- [邮箱插件接入交接（2026-09-26）（中文）](plugin-mail-handoff.zh-CN.md)
- [邮箱宿主交付范围与进度](plugin-mail-host-delivery.md)
- [이메일 플러그인 연동 매뉴얼: npm, Web, App 및 네비게이션 v1](plugin-mail-integration-v1.md)
- [插件托管存储实施状态](plugin-managed-storage-implementation.md)
- [随手记](quick-notes.md)
- [리팩토링 기능 평등 재고 목록](refactor-capability-parity.md)
- [分享卡片与资源工单](resource-tickets-and-sharing.md)
- [文档交互与回收站验收（2026-09-11）](trash-and-document-ui.md)
- [统一存储实现](unified-storage-implementation.md)

<a id="audits-and-acceptance"></a>

## 감사 및 인증

- [0.2.32 发布验证](verification/release-0.2.32.md)
- [0.2.31 发布验证](verification/release-0.2.31.md)

- [全仓库文档审查与修正（2026-10-28）](verification/documentation-audit-2026-10-28.md)
- [文档能力与部署核对（2026-10-04）](documentation-audit-2026-10-04.md)
- [界面国际化审计（2026-09-25）](i18n-audit.md)
- [Markdown 연동 및 검수 (2026-09-11)](markdown-integration.md)
- [托管凭证与部署环境验收](plugin-credential-acceptance.md)
- [文档任务真实环境测试与整改记录](qa/document-task-regression.md)
- [统一存储改造与本地浏览器验收](storage-browser-acceptance.md)
- [확인 기록](verification/README.md)
