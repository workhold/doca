import { useEffect, useState } from "react";
import { Copy, Plus, Plug, RefreshCw, ShieldCheck } from "lucide-react";
import { Switch } from "antd";
import { api } from "@web/shared/api.js";
import { useI18n } from "@web/shared/i18n.js";
import { Feedback } from "@web/shared/components/feedback.js";
import { Select } from "@web/shared/components/select.js";
import { Dialog } from "@web/features/documents/dialogs.js";
import { mcpExamples } from "./mcp-examples.js";
import "./mcp.css";

type Service = {
  id: string;
  name: string;
  kind: "personal" | "admin";
  owner_id: string;
  enabled: number;
  grant_mode: "all" | "selected";
  toolIds: string[];
  skillIds: string[];
  token_hint: string;
  expires_at: string | null;
  revoked_at: string | null;
  revision: number;
};
type Catalog = {
  tools: { id: string; description: string }[];
  skills: { id: string; name: string; description: string }[];
};
type Execution = {
  id: string; purpose: string; service_name: string; status: string;
  created_at: string; updated_at: string; closed_at: string | null;
};
type ExecutionDetail = Execution & {
  calls: { request_id: string; tool_id: string; status: string }[];
  resources: { kind: string; resource_id: string; title: string; href: string }[];
};
type Form = {
  id?: string;
  revision?: number;
  name: string;
  enabled: boolean;
  grantMode: "all" | "selected";
  toolIds: string[];
  skillIds: string[];
  expiresAt: string;
};

export function McpSettings({ admin = false }: { admin?: boolean }) {
  const { t, locale } = useI18n();
  const base = admin ? "/admin/mcp-services" : "/me/mcp-services";
  const [services, setServices] = useState<Service[]>([]),
    [endpoint, setEndpoint] = useState("");
  const [settings, setSettings] = useState({ enabled: false, revision: 0 });
  const [catalog, setCatalog] = useState<Catalog>({ tools: [], skills: [] });
  const [history, setHistory] = useState(false),
    [executions, setExecutions] = useState<Execution[] | null>(null),
    [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [form, setForm] = useState<Form | null>(null),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [credential, setCredential] = useState<{
    service: Service;
    token: string;
  } | null>(null);
  const [action, setAction] = useState<{
    service: Service;
    kind: "rotate" | "revoke";
  } | null>(null);
  async function load() {
    const [data, capabilities, personal] = await Promise.all([
      api<{ endpoint: string; services: Service[] }>(base),
      api<Catalog>(`${base}/catalog`),
      admin ? Promise.resolve(null) : api<typeof settings>("/me/mcp"),
    ]);
    setServices(data.services);
    setEndpoint(data.endpoint);
    setCatalog(capabilities);
    if (personal) setSettings(personal);
    setLoaded(true);
  }
  useEffect(() => {
    void load().catch((error) => setError(error.message));
  }, [base]);
  useEffect(() => {
    if (!history) return;
    let disposed = false;
    const refresh = async () => {
      try {
        const data = await api<Execution[]>("/me/mcp-executions");
        if (!disposed) setExecutions(data);
      } catch (error) { if (!disposed) setError((error as Error).message); }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [history]);
  const executionStatus = (status: string) => {
    switch (status) {
      case "running": return t("mcp.execution.running");
      case "completed": return t("mcp.execution.completed");
      case "failed": return t("mcp.execution.failed");
      case "interrupted": return t("mcp.execution.interrupted");
      case "cancelled": return t("mcp.execution.cancelled");
      case "queued": return t("mcp.execution.queued");
      case "awaiting_approval": return t("mcp.execution.awaiting_approval");
      default: return status;
    }
  };
  async function executionAction(id: string, operation: "cancel" | "delete") {
    await act(async () => {
      await api(`/me/mcp-executions/${id}${operation === "cancel" ? "/cancel" : ""}`, operation === "cancel" ? "POST" : "DELETE");
      setDetail(null);
      setExecutions(await api<Execution[]>("/me/mcp-executions"));
    });
  }
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(t("mcp.copied"));
    } catch {
      setError(t("mcp.copyFailed"));
    }
  }
  function edit(service?: Service) {
    setError("");
    setForm(
      service
        ? {
            id: service.id,
            revision: service.revision,
            name: service.name,
            enabled: !!service.enabled,
            grantMode: service.grant_mode,
            toolIds: [...service.toolIds],
            skillIds: [...service.skillIds],
            expiresAt: service.expires_at
              ? new Date(
                  new Date(service.expires_at).getTime() -
                    new Date(service.expires_at).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)
              : "",
          }
        : {
            name: "",
            enabled: true,
            grantMode: "selected",
            toolIds: [
              "document_read",
              "document_exists",
              "knowledge_search",
              "file_browse",
              "file_read",
            ].filter((id) => catalog.tools.some((tool) => tool.id === id)),
            skillIds: ["writing"].filter((id) =>
              catalog.skills.some((skill) => skill.id === id),
            ),
            expiresAt: "",
          },
    );
  }
  function examples(service: Service) {
    const sample = mcpExamples(service.id, endpoint, admin);
    const prompt =
      t("mcp.installPrompt", {
        name: sample.name,
        endpoint,
        env: sample.env,
        command: sample.command,
      }) + (admin ? " " + t("mcp.adminInstall") : "");
    return (
      <div className="mcp-examples">
        <label>
          {t("mcp.endpoint")}
          <code>{endpoint}</code>
        </label>
        <p>{t("mcp.environmentHelp", { env: sample.env })}</p>
        {admin && (
          <p className="mcp-target">
            <ShieldCheck size={16} />
            {t("mcp.userIdHelp")}
          </p>
        )}
        {[
          { label: t("mcp.aiInstall"), value: prompt },
          { label: t("mcp.codexCommand"), value: sample.command },
          { label: t("mcp.codexConfig"), value: sample.toml },
          { label: t("mcp.unattendedConfig"), value: sample.unattended },
          { label: t("mcp.handshake"), value: sample.initialize },
          { label: t("mcp.httpExample"), value: sample.discover },
        ].map((item) => (
          <div className="mcp-code" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <button type="button" onClick={() => void copy(item.value)}>
                <Copy size={14} />
                {t("mcp.copy")}
              </button>
            </div>
            <pre>{item.value}</pre>
          </div>
        ))}
        <p>{t("mcp.unattendedHelp")}</p>
        <a
          href="https://learn.chatgpt.com/docs/extend/mcp?surface=cli"
          target="_blank"
          rel="noreferrer"
        >
          {t("mcp.clientDocs")}
        </a>
      </div>
    );
  }
  const pending = services.filter((service) => !service.revoked_at);
  return (
    <section className="mcp-settings admin-card">
      <div className="mcp-heading">
        <div>
          <h2>
            <Plug size={22} />
            {t(admin ? "mcp.adminTitle" : "mcp.title")}
          </h2>
          <p>{t(admin ? "mcp.adminDescription" : "mcp.description")}</p>
        </div>
        <div className="mcp-actions">
        {!admin && <button type="button" onClick={() => { setError(""); setHistory(true); }}>
          {t("mcp.executions")}
        </button>}
        <button
          type="button"
          className="primary"
          disabled={busy || !loaded}
          onClick={() => edit()}
        >
          <Plus size={16} />
          {t("mcp.add")}
        </button>
        </div>
      </div>
      <Feedback message={!form && !action ? error : ""} tone="error" />
      <Feedback message={!credential ? notice : ""} tone="success" />
      {!admin && (
        <label className="mcp-master setting-toggle">
          <span>
            <strong>{t("mcp.enablePersonal")}</strong>
            <small>{t("mcp.enableHelp")}</small>
          </span>
          <Switch
            aria-label={t("mcp.enablePersonal")}
            checked={settings.enabled}
            disabled={busy || !loaded}
            loading={busy}
            onChange={(enabled) => {
              void act(async () => {
                setSettings(
                  await api("/me/mcp", "PUT", {
                    enabled,
                    revision: settings.revision,
                  }),
                );
              });
            }}
          />
        </label>
      )}
      {!loaded ? (
        <p>{t("mcp.loading")}</p>
      ) : !services.length ? (
        <div className="mcp-empty">
          <Plug size={28} />
          <h3>{t("mcp.empty")}</h3>
          <p>{t("mcp.emptyHelp")}</p>
        </div>
      ) : (
        <div className="mcp-list">
          {services.map((service) => {
            const expired =
              !!service.expires_at &&
              new Date(service.expires_at).getTime() <= Date.now();
            const active =
              !service.revoked_at &&
              !!service.enabled &&
              !expired &&
              (admin || settings.enabled);
            return (
              <article className="mcp-service" key={service.id}>
                <div className="mcp-service-heading">
                  <div>
                    <h3>
                      {service.name}
                      <span className={`mcp-status ${active ? "active" : ""}`}>
                        {t(
                          service.revoked_at
                            ? "mcp.revoked"
                            : expired
                              ? "mcp.expired"
                              : active
                                ? "mcp.active"
                                : "mcp.disabled",
                        )}
                      </span>
                    </h3>
                    <p>
                      {service.grant_mode === "all"
                        ? t("mcp.all")
                        : t("mcp.scopeCount", {
                            tools: service.toolIds.length,
                            skills: service.skillIds.length,
                          })}
                      <span> · Token ····{service.token_hint}</span>
                      {service.expires_at && (
                        <span>
                          {" "}
                          · {t("mcp.expires")}{" "}
                          {new Date(service.expires_at).toLocaleString(
                            locale === "zh" ? "zh-CN" : "en",
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="mcp-actions">
                    {!service.revoked_at && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => edit(service)}
                        >
                          {t("mcp.edit")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setAction({ service, kind: "rotate" })}
                        >
                          <RefreshCw size={14} />
                          {t("mcp.rotate")}
                        </button>
                        <button
                          type="button"
                          className="mcp-danger"
                          disabled={busy}
                          onClick={() => setAction({ service, kind: "revoke" })}
                        >
                          {t("mcp.revoke")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {!service.revoked_at && (
                  <details>
                    <summary>{t("mcp.examples")}</summary>
                    {examples(service)}
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!!pending.length && <p className="mcp-footnote">{t("mcp.grantHelp")}</p>}
      {history && <Dialog title={t("mcp.executions")} close={() => { setHistory(false); setDetail(null); }} className="mcp-dialog mcp-executions-dialog">
        <p>{t("mcp.executionHelp")}</p>
        <Feedback message={error} tone="error" />
        {detail ? <div className="mcp-execution-detail">
          <button type="button" onClick={() => setDetail(null)}>{t("mcp.executionBack")}</button>
          <h3>{detail.purpose}</h3>
          <p>{detail.service_name} · {executionStatus(detail.status)}</p>
          <h4>{t("mcp.executionCalls")}</h4>
          <ul>{detail.calls.map(call => <li key={call.request_id}><code>{call.tool_id}</code> · {executionStatus(call.status)}</li>)}</ul>
          <h4>{t("mcp.executionResources")}</h4>
          <ul>{detail.resources.map(resource => <li key={`${resource.kind}:${resource.resource_id}`}><a href={resource.href}>{resource.title}</a></li>)}</ul>
        </div> : executions === null ? <p>{t("mcp.loading")}</p> : !executions.length ? <p>{t("mcp.executionEmpty")}</p> :
          <div className="mcp-list">{executions.map(execution => <article className="mcp-service" key={execution.id}>
            <h3>{execution.purpose}</h3>
            <p>{execution.service_name} · {executionStatus(execution.status)} · {new Date(execution.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en")}</p>
            <div className="mcp-actions">
              <button type="button" disabled={busy} onClick={() => void act(async () => setDetail(await api<ExecutionDetail>(`/me/mcp-executions/${execution.id}`)))}>{t("mcp.executionView")}</button>
              {!execution.closed_at || ["queued", "running", "awaiting_approval"].includes(execution.status)
                ? <button type="button" disabled={busy} onClick={() => void executionAction(execution.id, "cancel")}>{t("mcp.executionStop")}</button>
                : <button type="button" disabled={busy} onClick={() => void executionAction(execution.id, "delete")}>{t("mcp.executionRemove")}</button>}
            </div>
          </article>)}</div>}
      </Dialog>}
      {form && (
        <Dialog
          title={t(form.id ? "mcp.edit" : "mcp.add")}
          close={() => {
            if (!busy) setForm(null);
          }}
          className="mcp-dialog"
        >
          <form
            className="mcp-form"
            onSubmit={(event) => {
              event.preventDefault();
              void act(async () => {
                const { id, revision, ...draft } = form;
                const body = {
                  ...draft,
                  expiresAt: draft.expiresAt
                    ? new Date(draft.expiresAt).toISOString()
                    : null,
                  toolIds: draft.grantMode === "all" ? [] : draft.toolIds,
                  skillIds: draft.grantMode === "all" ? [] : draft.skillIds,
                  ...(id ? { revision } : {}),
                };
                const result = await api<{ service: Service; token: string }>(
                  id ? `${base}/${id}` : base,
                  id ? "PUT" : "POST",
                  body,
                );
                setForm(null);
                if (result.token) setCredential(result);
              });
            }}
          >
            <Feedback message={error} tone="error" />
            <label>
              {t("mcp.name")}
              <input
                autoFocus
                required
                maxLength={80}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label className="setting-toggle">
              <span>{t("mcp.enableService")}</span>
              <Switch
                aria-label={t("mcp.enableService")}
                checked={form.enabled}
                disabled={busy}
                onChange={(enabled) => setForm({ ...form, enabled })}
              />
            </label>
            <label>
              {t("mcp.scope")}
              <Select
                aria-label={t("mcp.scope")}
                value={form.grantMode}
                onChange={(event) =>
                  setForm({
                    ...form,
                    grantMode: event.target.value as Form["grantMode"],
                  })
                }
              >
                <option value="selected">{t("mcp.selected")}</option>
                <option value="all">{t("mcp.all")}</option>
              </Select>
            </label>
            <p>
              {t(form.grantMode === "all" ? "mcp.allHelp" : "mcp.selectedHelp")}
            </p>
            {form.grantMode === "selected" && (
              <div className="mcp-grants">
                {(["tools", "skills"] as const).map((group) => {
                  const key = group === "tools" ? "toolIds" : "skillIds";
                  return (
                    <fieldset key={group}>
                      <legend>
                        {t(group === "tools" ? "mcp.tools" : "mcp.skills")}
                      </legend>
                      <div>
                        {catalog[group].map((item) => (
                          <label className="mcp-grant" key={item.id}>
                            <input
                              type="checkbox"
                              checked={form[key].includes(item.id)}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  [key]: event.target.checked
                                    ? [...form[key], item.id]
                                    : form[key].filter((id) => id !== item.id),
                                })
                              }
                            />
                            <span>
                              <strong>
                                {"name" in item ? item.name : item.id}
                              </strong>
                              <small>{item.description}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            )}
            <label>
              {t("mcp.expiresOptional")}
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm({ ...form, expiresAt: event.target.value })
                }
              />
            </label>
            <div className="mcp-form-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setForm(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="primary"
                disabled={
                  busy ||
                  !form.name.trim() ||
                  (form.grantMode === "selected" &&
                    !form.toolIds.length &&
                    !form.skillIds.length)
                }
              >
                {t("mcp.save")}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {credential && (
        <Dialog
          title={t("mcp.tokenCreated")}
          close={() => setCredential(null)}
          className="mcp-dialog"
        >
          <p>{t("mcp.tokenOnce")}</p>
          <div className="mcp-token">
            <code>{credential.token}</code>
            <button type="button" onClick={() => void copy(credential.token)}>
              <Copy size={16} />
              {t("mcp.copy")}
            </button>
          </div>
          <Feedback message={notice} tone="success" />
          {examples(credential.service)}
        </Dialog>
      )}
      {action && (
        <Dialog
          title={t(action.kind === "rotate" ? "mcp.rotate" : "mcp.revoke")}
          close={() => {
            if (!busy) setAction(null);
          }}
        >
          <p>
            {t(action.kind === "rotate" ? "mcp.rotateHelp" : "mcp.revokeHelp", {
              name: action.service.name,
            })}
          </p>
          <Feedback message={error} tone="error" />
          <footer>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const result = await api<{
                    service: Service;
                    token?: string;
                  }>(`${base}/${action.service.id}/${action.kind}`, "POST", {
                    revision: action.service.revision,
                  });
                  setAction(null);
                  if (result.token)
                    setCredential({
                      service: result.service,
                      token: result.token,
                    });
                })
              }
            >
              {t("mcp.confirm")}
            </button>
          </footer>
        </Dialog>
      )}
    </section>
  );
}
