# 0.2.33 发布验证

**Spec**: [spec.md](spec.md)
**Result**: passed

## Scope

2026-11-03，0.2.32 main 基线 `fc630aaf`；0.2.33 发行源码、不可变 tag 与两个镜像的 revision 均为 `cc29f4ffb211f3a1417a89e32256e7c3270750ff`。功能验收与正式 Sheet 0.2.17 来源见 004，完整结果见[审阅回执](../../docs/verification/release-0.2.33.md)。仅使用隔离合成数据。

## Acceptance results

| Acceptance ID | Command or observation | Result and limits |
| --- | --- | --- |
| AC-001 | 隔离工作区、明确清单与正式依赖审阅 | Passed：只含本会话提及样式，其他未提交工作保留；正式 Sheet 0.2.17 注册表摘要及全部 84 个安装文件一致 |
| AC-002 | 版本、Compose、双语入口及文档检查 | Passed：0.2.33 引用一致，SDD/文档检查通过 |
| AC-003 | 本地回归、构建及 PR CI | 检查完成。类型、构建、SDK/部署打包、Compose、SDD/文档通过；全量初次 3516 通过、1 失败、11 条件跳过，画板字体用例所属文件在构建结束后串行复跑 13/13 通过，未改源码或断言；PostgreSQL 17/18 及其余 PR CI 成功。首次全量仍记为失败 |
| AC-004 | 原生双架构镜像与远端索引 | Passed：工作流 41659258036 成功，每架构原图/鉴权/插件隔离/渲染与 594 个运行文件、484 个 Web 文件一致；本机复核版本与 latest 的索引、平台 manifest/config 一致。索引 sha256:6dcc67ccf73ffeea39cd048ff18fe30b3f34975b50d768c316713f0b5b7c0e3e |
| AC-005 | 固定 tag、GitHub 附件与回执 | Passed：工作流 41661062733 与 v0.2.33 发布成功；7 个附件大小/API 摘要及 3 个校验文件一致，部署 7、Web 479、SDK 40 文件与本地一致，SDK manifest 契约和 Compose 解析通过；回执记录实际结果 |

## Evidence and exclusions

原始输出、截图、下载与 JSON 在忽略的 `artifacts/verification/release-0.2.33/`，不提交。临时 registry secrets 已删除并核对不存在；没有将凭据值写入文件或制品。未执行生产部署、用户数据读写或迁移；没有复跑 Safari/Firefox 或广泛协作操作。调查及文档维护耗时未计量。

## Contracts and compatibility

本次无新的兼容决定；源功能的视图 API 与零内容写入边界见 004 和编辑器集成契约。既有历史读取和默认规则不改造。本次验证针对上述源码、工作流与远端制品，不外推其他版本或运行中实例。
