import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./style.css";

type Endpoint = { id: string; name: string; origin: string; accountId: string | null; connected: boolean; credentialError: string | null };
type Profiles = { active: string; endpoints: Endpoint[]; workspaceOpen: boolean };

function Icon({ kind }: { kind: "book" | "remote" }) {
  const paths = {
    book: <><path d="M12 7v14" /><path d="M3 18V5.6A2.6 2.6 0 0 1 5.6 3H8a4 4 0 0 1 4 4 4 4 0 0 1 4-4h2.4A2.6 2.6 0 0 1 21 5.6V18a2 2 0 0 0-2-2h-3a4 4 0 0 0-4 4 4 4 0 0 0-4-4H5a2 2 0 0 0-2 2Z" /></>,
    remote: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  };
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function App() {
  const [profiles, setProfiles] = useState<Profiles>({ active: "local", endpoints: [], workspaceOpen: false });
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);
  const reload = useCallback(async () => setProfiles(await invoke<Profiles>("get_profiles")), []);

  useEffect(() => {
    void reload().catch((reason) => setError(String(reason)));
    const stops: (() => void)[] = [];
    const keep = (promise: Promise<() => void>) => { void promise.then((stop) => stops.push(stop)); };
    keep(listen("desktop-login-complete", () => {
      setMessage("浏览器登录已完成，工作空间已打开。");
      setBusy("");
      void reload();
    }));
    keep(listen<string>("desktop-login-failed", (event) => {
      setBusy("");
      setError(event.payload || "浏览器登录未完成，请重新发起。");
    }));
    keep(listen("desktop-session-ended", () => {
      setMessage("桌面登录已退出，所有页面已关闭。");
      void reload();
    }));
    keep(listen<string>("desktop-session-error", (event) => setError(event.payload)));
    keep(listen<string>("desktop-restore-failed", (event) => setError(`无法恢复工作空间：${event.payload}`)));
    return () => { stops.forEach((stop) => stop()); };
  }, [reload]);

  async function act(key: string, work: () => Promise<void>) {
    setBusy(key); setError(""); setMessage("");
    try { await work(); }
    catch (reason) { setError(String(reason)); }
    finally { await reload().catch((reason) => setError(String(reason))); setBusy(""); }
  }

  return <div className="desktop-app">
    <header className="desktop-topbar"><span className="brand-symbol"><Icon kind="book" /></span><strong>Doca</strong><span className="edition">桌面版</span></header>
    <main className="shell">
    <div className="page-heading"><h1>工作空间</h1><p>连接到远端 Doca 服务，使用与 Web 端一致的工作空间。</p></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {message && <div className="notice success" role="status">{message}</div>}
    <div className="section-heading"><h2>远端服务</h2><span>{profiles.endpoints.length} 个地址</span></div>
    <div className="remote-list">
      {profiles.endpoints.map((endpoint) => <section className={`profile remote ${profiles.active === endpoint.id ? "selected" : ""}`} key={endpoint.id}>
        <div className="profile-top"><span className="profile-icon remote-icon"><Icon kind="remote" /></span><div><h3>{endpoint.name}</h3><p className="endpoint" title={endpoint.origin}>{endpoint.origin}</p></div><span className={`tag ${endpoint.connected ? "connected" : ""}`}>{endpoint.credentialError ? "凭据库不可用" : endpoint.connected ? "已连接" : "未登录"}</span></div>
        {endpoint.credentialError && <p className="credential-warning" role="status">{endpoint.credentialError}</p>}
        <div className="actions">
          <button className="primary" disabled={!!busy || !!endpoint.credentialError} onClick={() => void act(endpoint.id, async () => {
            if (endpoint.connected) await invoke("open_profile", { id: endpoint.id });
            else { await invoke("start_login", { id: endpoint.id }); setMessage("请在浏览器完成登录，然后返回桌面应用。"); }
          })}>{busy === endpoint.id ? "请稍候…" : endpoint.connected ? "打开" : "浏览器登录"}</button>
          <button disabled={!!busy} onClick={() => { setRenaming(endpoint.id); setRenameName(endpoint.name); setConfirmRemoval(null); }}>重命名</button>
          {endpoint.connected && <button disabled={!!busy} onClick={() => void act(`logout-${endpoint.id}`, () => invoke("sign_out", { id: endpoint.id }))}>退出登录</button>}
          <button className="danger" disabled={!!busy} onClick={() => { setConfirmRemoval(endpoint.id); setRenaming(null); }}>移除</button>
        </div>
        {renaming === endpoint.id && <form className="inline-editor" onSubmit={(event) => { event.preventDefault(); void act(`rename-${endpoint.id}`, async () => { await invoke("rename_endpoint", { id: endpoint.id, name: renameName }); setRenaming(null); }); }}>
          <label>服务名称<input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} required maxLength={80}/></label>
          <div className="actions"><button className="primary" type="submit" disabled={!!busy}>保存名称</button><button type="button" disabled={!!busy} onClick={() => setRenaming(null)}>取消</button></div>
        </form>}
        {confirmRemoval === endpoint.id && <div className="inline-confirm" role="group" aria-label="确认移除地址">
          <p>移除“{endpoint.name}”地址？本机缓存将保留。</p>
          <div className="actions"><button className="danger" disabled={!!busy} onClick={() => void act(`remove-${endpoint.id}`, async () => { await invoke("remove_endpoint", { id: endpoint.id }); setConfirmRemoval(null); })}>确认移除</button><button disabled={!!busy} onClick={() => setConfirmRemoval(null)}>取消</button></div>
        </div>}
      </section>)}
      {!profiles.endpoints.length && <p className="empty">还没有远端服务。添加地址后可通过系统浏览器登录。</p>}
    </div>
    <form className="add" onSubmit={(event) => { event.preventDefault(); void act("add", async () => { await invoke("add_endpoint", { name, origin }); setName(""); setOrigin(""); }); }}>
      <h2>添加远端服务</h2>
      <label>名称<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：团队 Doca" required maxLength={80}/></label>
      <label>后端地址<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="https://doca.example.com" type="url" required/></label>
      <p>正式服务需要 HTTPS；本机开发可使用 127.0.0.1 的 HTTP 地址。</p>
      <button type="submit" disabled={!!busy}>{busy === "add" ? "正在保存…" : "添加地址"}</button>
    </form>
    <footer>切换远端服务前，请确认正在编辑的内容已保存。</footer>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);
