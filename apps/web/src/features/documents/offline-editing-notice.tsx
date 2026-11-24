import { WifiOff } from "lucide-react";
import { createPortal } from "react-dom";
import { useI18n } from "@web/shared/i18n.js";
import "./offline-editing-notice.css";

export function OfflineEditingNotice({ active }: { active: boolean }) {
  const { t } = useI18n();
  const slot = active && document.getElementById("editor-offline-slot");
  if (!slot) return null;
  return createPortal(
    <div className="editor-offline-notice">
      <WifiOff size={16} aria-hidden="true" />
      <span>{t("editor.offlineEditing")}</span>
    </div>,
    slot,
  );
}
