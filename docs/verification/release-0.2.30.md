# Doca 0.2.30 发布验收

2026-11-01（Asia/Shanghai）完成 GitHub / Docker Hub 制品发布。[PR #124](https://github.com/workhold/doca/pull/124) 纳入全部 158 个受管变更文件，包含 MCP 独立执行、插件 SDK 0.2.0、分级 SDD 接入及候选回归发现的图片批次并发守卫修复。不可变 tag `v0.2.30` 固定指向 `a4b26320e634dbbfa89e09d5956b2764d1f7e08f`，其文件树与本地验证候选一致；本回执不移动 tag。

## 行为与升级

MCP 创建独立任务，权限、租约、取消、操作回执和真实用量继续共用。历史 MCP 对话及其存储保留，从聊天入口排除，不转换、不续跑。任务/模型关联原生改为可空，新增空任务资源账本，兼容代际不变。沿用所有者在原对话明确同意的具体方案，没有新增适配、历史默认值或自动降级。已有图片回执多版本校验和停用的旧 MCP 凭据存储不变。

宿主、Web 和插件须协调更新；旧 SDK 范围及 AI 服务被拒绝，插件使用 SDK 0.2.0 / ai.v2 / ai.continuations.v2 重新构建。SDK 编译包随 GitHub 附件提供，本次未向 npm 发布。升级前保留数据库、文件、原配置和主密钥；上线后恢复先保全新增任务与文件，再单独审查。详见[发行说明](../releases/0.2.30.zh-CN.md)、[MCP 专项验证](mcp-execution-decoupling-2026-11-01.md)和[发布规格](../../specs/002-release-0-2-30/spec.md)。

## 本地与数据库验证

- 类型检查、生产 Web/浏览器扩展/画板渲染构建、SDK 声明构建和部署打包通过。
- 全量 341 个测试文件：338 个通过、3 个条件跳过；3,511 项通过、11 项条件跳过，0 失败。使用固定 WeasyPrint 70.0 和直接 Node 入口保留 macOS 动态库环境；初次缺少渲染环境的失败已定位并完成配置后的全量复验。
- 239 项图片回归通过，包括同会话较晚启动的运行执行器阻止批次升级、记录保留及跨任务/会话原图访问拒绝。隔离 MCP 桌面/390px 浏览器验证覆盖详情、停止、清理、保留产物和普通会话，无页面异常。
- [PostgreSQL 17/18 CI](https://github.com/workhold/doca/actions/runs/41220523652) 每组 33 个文件、398 项通过、3 项条件跳过。两组随后实际升级已发行 0.2.29 创建的数据；本地 SQLite 同样通过，三种环境均保留 138 张原有业务表的行哈希，验证重复/并发启动、NULL 任务及拒绝前无部分修改。
- SDD 13 项、文档检查器 6 项通过；规格追溯、上游哈希、版本/结构/契约副本检查通过。[文档发布](https://github.com/workhold/doca/actions/runs/41221105793) 成功，包含 112 页双语内容。

## Docker Hub

[原生发布流水线](https://github.com/workhold/doca/actions/runs/41221119658) 在真实 Linux amd64 / arm64 runner 上完成构建和验收。两种镜像均通过原图字节、登录/退出/撤权、Logo、浏览器扩展下载、可选择中文 PDF、画板像素和 Office 转换检查；每种架构匹配 593 个运行源文件和 484 个 Web 文件。

发布后在本机独立匿名读取公开 Registry，重新验证索引、子 manifest 和 config 的原始字节 SHA256、平台及版本/源码标签。[Docker Hub](https://hub.docker.com/r/smartdoca/doca/tags) 的 `0.2.30` 与发布时的 `latest` 均为：

`sha256:1fc480236482ecd03166e0d4d69ba0bd92bcb4002311118a5504c283dcd208f6`

| 架构 | Manifest SHA256 | 压缩层字节 |
| --- | --- | ---: |
| amd64 | `sha256:42187b7db1ca1b010dacef96545ee3976a1118cf7d18381b0af9bf7fa75e1612` | 519,900,923 |
| arm64 | `sha256:b35476d21d4ef1db6d9180fa86894129e2607425a39b95b82637f94ae3c00daf` | 511,801,831 |

## GitHub Release

[GitHub Release](https://github.com/workhold/doca/releases/tag/v0.2.30)及[发行流水线](https://github.com/workhold/doca/actions/runs/41222335843)成功。7 个附件已实际下载，大小与 SHA256 均匹配 GitHub 元数据，三份独立校验文件全部通过。部署包 7 个文件、Web 资源 479 个文件、SDK 编译与许可证等 40 个文件均匹配本地验证构建；SDK 公共导出及依赖正确，未保留 workspace 引用。单文件 Compose 与打包器输出一致，并通过 Docker Compose 解析。

| 附件 | 字节 | SHA256 |
| --- | ---: | --- |
| doca-compose-v0.2.30.yaml | 807 | `7e9db0154e9a7056cb650a6606bf444b71f08e469aa5486ffff7ecdc5157e085` |
| doca-compose-v0.2.30.yaml.sha256 | 92 | `7227e18bc2c8cf079dff49a347aa54590028a3ad10facc300483a9eea0bb9bf1` |
| doca-deploy-v0.2.30.tar.gz | 11,150 | `b321963c86aa55d8bb2a88a5c458912f2e4d21ba50ca28bfc6f50e4d9dcf4d9f` |
| doca-deploy-v0.2.30.tar.gz.sha256 | 93 | `a8a4e08506796fc17364e2df8d033feff536841fb50dca91f2ecfe0162b32069` |
| doca-web-assets-v0.2.30.tar.gz | 19,227,299 | `65694c404e9fc51bad782a708de6df30bf1d5d6978be8a7f34036ba472a85740` |
| smartdoca-plugin-sdk-0.2.0.tgz | 26,367 | `d40e1fae3176474d2ecbad237a59d4aa6d88a68919faa80ea12608a13fd9727b` |
| smartdoca-plugin-sdk-0.2.0.tgz.sha256 | 97 | `86a55979bd5f911d164277fccf75b33fa9457c46d93dca64d29adec76aff9ba9` |

## 清理与范围

临时 Docker Hub 发布 secrets 已删除，并重新读取仓库列表确认不存在；凭据值未写入文件、日志、URL 或源码。原始输出、隔离数据、截图、下载及 JSON 位于本地忽略目录 `artifacts/verification/release-0.2.30/` 和 `artifacts/verification/mcp-decoupling/`。

本次发布制品，未部署运行中的站点，未访问用户数据库/文档，未进行原生设备或真实外部模型质量验收。分级 SDD 的首次发布记录已关联规格、任务和结果；调查耗时未测量，长期维护效果仍需接下来 3–5 次真实变更观察。
