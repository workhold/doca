# Shared plugin business database

**English** · [简体中文](plugin-database-isolation.zh-CN.md) · [繁體中文](plugin-database-isolation.zh-Hant.md) · [日本語](plugin-database-isolation.ja.md) · [Français](plugin-database-isolation.fr.md) · [한국어](plugin-database-isolation.ko.md) · [Español](plugin-database-isolation.es.md) · [Русский](plugin-database-isolation.ru.md)

All plugins share one host-managed business database, separate from the core database. PostgreSQL needs one database/account configuration for the deployment; the host automatically creates each plugin's schema and tables. SQLite needs no configuration and automatically creates one shared file. Plugins continue to use the unchanged `storage.sql.v1` SDK, schema version 1 and `dataVersion`, without connection strings, drivers or filesystem paths.

## Configuration and isolation

SQLite defaults to `<DOCA_SQLITE_PATH>.plugins.db`. `DOCA_PLUGIN_DATABASE_PATH` optionally selects another persistent local file. The file is mode 0600. Each physical table has a `plugin_<SHA256(plugin ID), first 56 hex>__` prefix; SDK table names stay unchanged. In-memory hosts use one shared in-memory plugin database per host connection. Back up the shared file together with the core database and private file storage. SQLite remains a single-host option.

PostgreSQL uses one operator-provisioned business database and login account. Account privileges are chosen by the deployment operator; ordinary accounts, superusers, roles with administrative attributes or memberships, and the same account used for core are accepted. The account needs effective `CONNECT` and `CREATE` privileges on that business database to create plugin schemas, plus `USAGE` and `CREATE` on its `public` schema to initialize the shared marker. Database-level `CREATE` does not grant schema-level `CREATE`; PostgreSQL 17/18 do not grant the latter to ordinary non-owner roles by default. See [PostgreSQL schema privileges](https://www.postgresql.org/docs/18/ddl-schemas.html#DDL-SCHEMAS-PRIV). Configure these once before enabling SQL plugins:

```dotenv
DOCA_PLUGIN_DATABASE_URL=postgresql://doca_plugins:replace-me@postgres:5432/doca_plugins
DOCA_PLUGIN_DATABASE_POOL_MAX=4
```

For a new deployment, the following optional dedicated-account example provisions the store in `psql` (replace the password). An existing suitably authorized account can also be configured directly:

```sql
CREATE ROLE doca_plugins LOGIN PASSWORD 'replace-me';
CREATE DATABASE doca_plugins;
REVOKE ALL ON DATABASE doca_plugins FROM PUBLIC;
GRANT CONNECT, CREATE ON DATABASE doca_plugins TO doca_plugins;
\connect doca_plugins
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;
```

For an existing deployment, keep its role, database and data. If initialization reports missing `USAGE`/`CREATE` on `public`, connect as the database owner to the **plugin business database** and run `GRANT USAGE, CREATE ON SCHEMA public TO doca_plugins;`, using the configured role name. If creating a plugin schema reports missing database `CREATE`, grant `CREATE ON DATABASE doca_plugins TO doca_plugins` as its owner. Retry startup after correcting permissions; no uninstall, reset or data conversion is needed. The host does not grant privileges automatically. These grants apply only to the dedicated plugin business database. Existing shared markers do not require `CREATE` on `public` again. Connection strings/passwords and raw SQL errors remain hidden from plugin responses; these fixed host configuration diagnostics are reported explicitly.

The host automatically creates `plugin_<SHA256(plugin ID), first 56 hex>` schemas on first declaration. Every plugin shares one connection pool per host instance; `DOCA_PLUGIN_DATABASE_POOL_MAX` is an integer from 1 to 20, default 4. Include this pool, core/AI/webhook pools and instance count in the server connection budget. All replicas must use the same shared business database. No database, role or connection entry is required when adding another plugin. Plugins without SQL storage do not require this URL.

The configured business database must be separate from core, even when both URLs use the same login. The host does not inspect elevated role attributes, role memberships or core-table privileges and does not change database account permissions. Operators decide whether to restrict accounts with PostgreSQL grants. The host does not create databases/roles and never falls back to core storage. PostgreSQL transactions set a transaction-local schema; pooled connections do not retain another plugin's scope. Uninstall inspects and drops only the removed plugin's declared tables and installation marker; other plugin schemas/data and the shared store remain.

The operator-managed account policy was approved on 2026-10-16. It replaces the account privilege rejection in released 0.1.26–0.1.29. Existing format-3 declarations, markers, generations and data versions are retained without conversion; no data or permissions are modified by upgrading. Rolling back the host restores the old account restrictions, so an administrator login may be rejected again. Keep the existing database, data and configuration when planning rollback. The format-2 upgrade procedure below is unchanged.

This is isolation through host-owned SDK services. Plugins execute in a trusted Node.js process; sharing the business role is not a process or operating-system sandbox.

The core retains users, documents, permissions, security audit, raw AI usage, plugin registry/archive references, namespace records, encrypted credentials, private-object references and durable object garbage intents. File and credential ownership/permissions, core DDL and `schema_baseline.id` remain unchanged.

## Exact storage format and lifecycle

Host declarations use format 3 (`storageVersion: 3`, initially `schema: null`). The shared root marker is `_doca_shared_plugin_database` with format 3. Each plugin's `_doca_plugin_store` marker records its exact ID, generation, data version and canonical schema. Marker validation and scoped introspection prevent adopting unrelated data. Missing shared files, namespaces or previously declared tables are rejected; they are never silently recreated. Changing the URL/file does not migrate data, and an empty replacement is rejected once a schema has been recorded.

First declaration locks the core namespace, creates the plugin namespace, business tables and marker in one business transaction, then records the declaration in the core transaction. A retry after interrupted core commit accepts only the exact committed business marker and actual structure. Different schema definitions, types/defaults/nullability, primary/unique constraints and unexpected tables are rejected. User transaction callbacks execute once and handles expire after completion. A business commit followed by core-commit failure is an uncertain outcome requiring business idempotency/readback; callbacks are not replayed.

The core namespace lock is held through business commit, so uninstall waits for admitted writes. The business uninstall hook runs first. On success, the core registry transaction fences the generation, clears installation selection and credentials, and queues private-object cleanup. User files, permissions, receipts and release archives remain. Hook failure retains installation; external hook effects cannot be rolled back.

Business cleanup follows the core commit using the retained declaration as a durable intent. Startup, periodic cleanup, uninstall and install attempts retry it. Cleanup verifies the removed generation and marker before dropping declared tables. Unknown tables or mismatched markers reject cleanup without partial deletion. PostgreSQL leaves the empty namespace for idempotent retry; SQLite leaves the shared file. Reinstall waits for cleanup, increments the generation and creates empty business tables. No distributed atomic commit or automatic cluster task draining is promised; restart every instance.

## Approved upgrade from 0.1.25

The owner approved **normal uninstall on the previous version followed by reinstall, without migrating plugin data**. Released 0.1.25 uses per-plugin files/databases and format 2. Active format-2 installations, including stateless plugins, are rejected before core reconciliation writes. The obsolete `DOCA_PLUGIN_DATABASE_DIR` and `DOCA_PLUGIN_DATABASES_JSON` settings are rejected explicitly. There is no old-store reader, automatic data conversion, dual write or automatic deletion of old databases/files.

1. Back up the original core database, all old plugin databases/files, private file storage, configuration and original credential master key.
2. On the previous host, normally uninstall every external business plugin and resolve any pending cleanup. This deliberately discards their private business records, encrypted credentials and private objects. Reconfigure plugins and rebind external accounts after reinstall. Core data and ordinary user files remain.
3. Stop all host instances. Remove the old per-plugin settings. For PostgreSQL, provision/configure one empty shared business database and an operator-selected login; for SQLite, use the automatic shared file or configure its path. Retain the old stores/backups as recovery evidence.
4. Deploy the new host against the existing core database, ordinary files and original master key. Reinstall plugins and restart every instance. The host automatically joins each plugin to the shared business database, starting with empty private business data.

If uninstall fails, resolve it on the previous host. If startup rejects a residual installation, return to that host to finish uninstall; never reset the core database. Already-removed namespace history remains and explicit reinstall increments its generation. The existing handling of cleaned pre-0.1.25 namespace history remains; it does not read old business data. Residual colocated `plugin_<56 hex>` tables from still older releases remain review-required and are not deleted automatically.

Before new writes, recovery to the pre-uninstall state requires matching original core/plugin/file backups and the old code/configuration. Revoked external authorizations may need rebinding. After new writes, retain the new databases/files and agree on a separate recovery plan; restoring old backups would discard later data. Old hosts cannot read format 3. Mixed old/new host operation is unsupported.

## Verification

`scripts/verify-plugin-database-isolation-upgrade.ts` creates synthetic retained core data and format-2 private plugin data with the actual released `smartdoca/doca:0.1.25` image. It verifies rejection without changing retained core rows/declarations, normal old-host uninstall, reopening the same core database and reinstalling into an empty shared store. Run it on isolated SQLite and PostgreSQL 17/18. Managed-storage tests also cover same logical names across plugins, shared physical storage/pool, restart, concurrent scopes, rollback, stale generations, missing stores and retryable cleanup. These checks do not establish production rollout or mixed-version operation.
