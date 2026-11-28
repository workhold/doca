# 插件共享业务数据库

[English](plugin-database-isolation.md) · **简体中文** · [繁體中文](plugin-database-isolation.zh-Hant.md) · [日本語](plugin-database-isolation.ja.md) · [Français](plugin-database-isolation.fr.md) · [한국어](plugin-database-isolation.ko.md) · [Español](plugin-database-isolation.es.md) · [Русский](plugin-database-isolation.ru.md)

所有插件共用一个宿主管理的业务数据库，与核心数据库分开。PostgreSQL 只需为整套部署配置一次数据库和账号，宿主自动创建每个插件的 schema 和业务表。SQLite 无需配置，自动创建一个共享文件。插件继续使用原有 `storage.sql.v1` SDK、version 1 结构声明和 `dataVersion`，不接触连接串、驱动或文件路径。

## 配置与隔离

SQLite 默认使用 `<DOCA_SQLITE_PATH>.plugins.db`，可用 `DOCA_PLUGIN_DATABASE_PATH` 指定其他持久化本地文件，权限为 0600。物理表增加 `plugin_<插件 ID 的 SHA256 前 56 位十六进制>__` 前缀，SDK 表名不变。内存宿主在每个宿主连接内共用一个插件内存库。共享文件须与核心库、私有文件存储一起备份。SQLite 仍适用于单宿主。

PostgreSQL 由部署者预先提供一个业务数据库和登录账号。账号权限由部署者决定；普通账号、超级用户、具有管理属性或角色成员关系的账号，以及核心库使用的同一个账号均可配置。账号须实际具备该业务库的 `CONNECT`、`CREATE` 权限以创建插件 schema，并有该库 `public` schema 的 `USAGE`、`CREATE` 权限以初始化共享标记。数据库级 `CREATE` 不包含 schema 级 `CREATE`；PostgreSQL 17/18 默认不会把后者授予普通非所有者角色，见 [PostgreSQL schema 权限说明](https://www.postgresql.org/docs/18/ddl-schemas.html#DDL-SCHEMAS-PRIV)。启用 SQL 插件前配置一次：

```dotenv
DOCA_PLUGIN_DATABASE_URL=postgresql://doca_plugins:replace-me@postgres:5432/doca_plugins
DOCA_PLUGIN_DATABASE_POOL_MAX=4
```

以下是新部署在 `psql` 中创建专用账号的可选示例（替换密码），也可以直接配置已有且授权合适的账号：

```sql
CREATE ROLE doca_plugins LOGIN PASSWORD 'replace-me';
CREATE DATABASE doca_plugins;
REVOKE ALL ON DATABASE doca_plugins FROM PUBLIC;
GRANT CONNECT, CREATE ON DATABASE doca_plugins TO doca_plugins;
\connect doca_plugins
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;
```

已有部署保留原角色、数据库和数据。若初始化提示缺少 `public` 的 `USAGE`／`CREATE`，由数据库所有者连接到**插件业务库**，按配置的角色名执行 `GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;`。若创建插件 schema 提示缺少数据库 `CREATE`，由所有者执行 `GRANT CREATE ON DATABASE doca_plugins TO doca_plugins;`。修正授权后重新启动即可重试，无需卸载、重置或转换数据。宿主不自动授权；这些授权仅作用于专用插件业务库。已有共享标记不再要求 `public` 的 `CREATE` 权限。连接串、密码及原始 SQL 异常仍不向插件响应暴露，上述固定的宿主配置诊断会明确返回。

首次声明时，宿主自动创建 `plugin_<插件 ID 的 SHA256 前 56 位十六进制>` schema。每个宿主实例中的所有插件共用一个连接池；`DOCA_PLUGIN_DATABASE_POOL_MAX` 为 1–20 的整数，默认 4。连接预算须计入插件池、核心／AI／webhook 池和实例数量。所有副本必须使用同一个共享业务库。以后添加插件不再需要创建数据库、角色或单独配置连接。不使用 SQL 的插件不要求此 URL。

配置的业务库仍须与核心库分离，即使两个 URL 使用同一个账号。宿主不检查账号的高权限属性、角色成员关系或核心表访问权限，也不修改数据库账号权限；是否通过 PostgreSQL 授权限制账号，由部署者决定。宿主不创建数据库或角色，也不回退到核心库。PostgreSQL 事务使用事务局部 schema，归还连接后不保留其他插件的作用域。卸载只检查和删除目标插件声明的表及安装标记，其他插件 schema、数据和共享库保留。

账号权限由部署者管理的规则于 2026-10-16 获得确认，取代已发布 0.1.26–0.1.29 的账号权限拒绝检查。已有格式 3 声明、标记、安装代次和数据版本原样保留，不做格式转换；升级不修改任何数据或账号权限。回退宿主会恢复旧账号限制，管理员账号可能再次被拒绝，规划回退时须保留现有数据库、数据和配置。下文格式 2 的升级流程不变。

这是通过宿主 SDK 服务实现的隔离。插件仍运行在受信任的 Node.js 进程中；共享业务账号不构成进程或操作系统沙箱。

核心库仍保存用户、文档、权限、安全审计、原始 AI 用量、插件注册／归档引用、命名空间记录、加密凭证、私有对象引用和持久化对象垃圾意图。文件／凭证归属与权限、核心 DDL 和 `schema_baseline.id` 均不变。

## 精确存储格式与生命周期

宿主声明使用格式 3，初始为 `storageVersion: 3`、`schema: null`。共享库根标记 `_doca_shared_plugin_database` 记录格式 3；每个插件的 `_doca_plugin_store` 记录精确的插件 ID、安装代次、数据版本和规范化结构。标记验证及限定作用域的结构检查防止接管无关数据。共享文件、命名空间或已声明的表丢失时明确拒绝，不会静默重建。更换 URL／文件不迁移数据；已有结构声明后，空替代库会被拒绝。

首次声明锁住核心命名空间，在同一个业务事务中创建插件命名空间、表及标记，再在核心事务记录声明。核心提交中断后的重试只接受精确匹配的已提交业务标记及实际结构。不同结构定义、类型／默认值／可空性、主键／唯一约束或额外表均拒绝。用户事务回调仅执行一次，完成后句柄失效。业务提交后核心提交失败属于结果不确定，须通过业务幂等／读回处理，不重放回调。

核心命名空间锁保持到业务提交结束，卸载须等待已获准的写入完成。业务卸载钩子先运行；成功后，核心注册事务封禁旧代次、清除安装选择及凭证，并排队清理私有对象。普通用户文件、权限、回执和发布归档保留。钩子失败保留安装，外部钩子副作用不能回滚。

业务清理在核心提交之后执行，以保留的声明作为持久化意图。启动、定时清理、卸载和安装尝试都会重试。清理验证已移除代次及标记，只删除声明的表。未知表或标记不符时拒绝且不部分删表。PostgreSQL 保留空命名空间以便幂等重试，SQLite 保留共享文件。重装等待清理完成，增加代次并创建空业务表。不承诺分布式原子提交或自动集群任务排空；每个实例仍须重启。

## 从 0.1.25 升级的已确认方案

用户已确认：**旧版正常卸载后重装，不迁移插件数据**。已发布的 0.1.25 使用每插件独立文件／数据库及格式 2。有效的格式 2 安装（包括无状态插件）会在核心结构核对写入前被拒绝。旧配置 `DOCA_PLUGIN_DATABASE_DIR` 和 `DOCA_PLUGIN_DATABASES_JSON` 明确拒绝。没有旧库读取、自动数据转换、双写或自动删除旧库／文件。

1. 备份原核心库、全部旧插件库／文件、私有文件存储、配置和原凭证主密钥。
2. 在旧宿主正常卸载全部外部业务插件，并处理完待清理项。此操作明确丢弃插件私有业务记录、加密凭证和私有对象；重装后重新配置并绑定外部账号。核心数据和普通用户文件保留。
3. 停止全部实例，移除旧的每插件配置。PostgreSQL 提供一个新的空共享业务库和部署者选择的登录账号；SQLite 使用自动共享文件或指定路径。旧库及备份保留作为恢复依据。
4. 新宿主继续使用原核心库、普通文件和原主密钥。重装插件并重启每个实例，宿主自动将插件加入共享业务库，私有业务数据从空开始。

卸载失败须在旧版解决。启动拒绝残留安装时，回到旧版完成卸载，不得重置核心库。已移除的命名空间历史保留，显式重装增加代次。现有对 0.1.25 之前已清理命名空间历史的处理保持不变，不读取旧业务数据。更早版本残留的同库 `plugin_<56 位十六进制>` 表仍需人工审查，不自动删除。

新写入之前，恢复到卸载前状态须使用相互匹配的原核心／插件／文件备份及旧代码／配置。已撤销的外部授权可能需要重新绑定。新写入之后须保留新数据库／文件并另行确认恢复方案；直接恢复旧备份会丢失后续数据。旧宿主不能读取格式 3，不支持新旧宿主混跑。

## 验证

`scripts/verify-plugin-database-isolation-upgrade.ts` 使用实际发布的 `smartdoca/doca:0.1.25` 镜像创建合成核心数据和格式 2 插件私有数据，验证拒绝时核心行／声明不变、旧版正常卸载、同一核心库重新打开并重装到空共享库。在隔离 SQLite 和 PostgreSQL 17/18 上运行。托管存储测试还覆盖插件同名逻辑表、共享物理存储／连接池、重启、并发作用域、回滚、旧代次封禁、库丢失及可重试清理。这不代表已生产部署或支持新旧版本混跑。
