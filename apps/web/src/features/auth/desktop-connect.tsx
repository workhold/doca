import { useState } from "react";
import { api } from "@web/shared/api.js";
import { useI18n } from "@web/shared/i18n.js";

export function DesktopConnect() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [returnUrl, setReturnUrl] = useState("");
  const state = new URLSearchParams(location.hash.split("?")[1] ?? "").get("state");
  const validState = !!state && /^[a-f0-9]{64}$/.test(state);
  async function approve() {
    if (!validState || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<{ url: string }>("/auth/desktop/approve", "POST", { state });
      const url = new URL(response.url);
      if (url.protocol !== "doca:" || url.host !== "auth" || url.pathname !== "/complete")
        throw new Error(t("desktop.connect.invalidReturn"));
      sessionStorage.removeItem("doca.desktop-login.pending");
      setReturnUrl(response.url);
      location.href = response.url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("desktop.connect.failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <section className="auth-card">
        <h1>{t("desktop.connect.title")}</h1>
        <p>{t("desktop.connect.description")}</p>
        {!validState ? <p role="alert">{t("desktop.connect.invalidRequest")}</p> : (
          <div className="auth-actions">
            <button className="primary" disabled={busy} onClick={() => void approve()}>
              {busy ? t("desktop.connect.wait") : t("desktop.connect.approve")}
            </button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {returnUrl && <p><a href={returnUrl}>{t("desktop.connect.openAgain")}</a></p>}
      </section>
    </main>
  );
}
