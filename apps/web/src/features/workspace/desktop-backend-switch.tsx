import { ServerCog } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@web/shared/i18n.js";
import { workspacePublicOrigin } from "@web/shared/desktop-context.js";

export function DesktopBackendSwitch({ onError }: { onError: (message: string) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!workspacePublicOrigin()) return null;

  const label = t("desktop.switchBackend");
  return (
    <button
      type="button"
      className="desktop-backend-switch"
      title={label}
      aria-label={label}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const response = await fetch("/_doca/manager", {
            method: "POST",
            credentials: "same-origin",
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch {
          onError(t("desktop.switchFailed"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ServerCog size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
