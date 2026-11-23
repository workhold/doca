import { useEffect, useState } from "react";
import { api } from "@web/shared/api.js";
import { Feedback } from "@web/shared/components/feedback.js";
import { useI18n } from "@web/shared/i18n.js";
import { ProviderIcon } from "./provider-icon.js";
import "./authentication.css";

type LoginProvider = { id: string; type: string; name: string };

export async function startExternalAuthentication(id: string, intent: "login" | "link" | "replace") {
  const result = await api<{ url: string }>(
    `/auth/providers/${id}/start`,
    "POST",
    { intent },
  );
  location.assign(result.url);
}
export function ExternalLoginOptions() {
  const { t } = useI18n();

  const [items, setItems] = useState<LoginProvider[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<{ items: LoginProvider[] }>("/auth/providers")
      .then((r) => setItems(r.items))
      .catch(() => setError(t("authAdmin.loadFailed")));
  }, []);
  return (
    <>
      {items.length > 0 && (
        <div className="external-login">
          <span>{t("authAdmin.alternative")}</span>
          <div>
            {items.map((p) => (
              <button
                type="button"
                key={p.id}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void startExternalAuthentication(p.id, "login").catch((e) => {
                    setError(e.message);
                    setBusy(false);
                  });
                }}
              >
                <ProviderIcon type={p.type} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <Feedback message={error} tone="error" />}
    </>
  );
}
