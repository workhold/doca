import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { realtime } from "@web/features/documents/realtime.js";
import { useI18n } from "@web/shared/i18n.js";
import "./offline-editing-notice.css";

export function OfflineEditingNotice({
  editable,
  connected,
}: {
  editable: boolean;
  connected: boolean;
}) {
  const { t } = useI18n();
  const [disconnected, setDisconnected] = useState(() => realtime.unavailable);
  useEffect(() => {
    const check = () => {
      if (realtime.unavailable) setDisconnected(true);
    };
    const unsubscribe = realtime.subscribe(({ type }) => {
      if (type === "disconnected") check();
    });
    check();
    return unsubscribe;
  }, []);
  // The banner stays visible until the document catches up after reconnecting.
  useEffect(() => {
    if (connected && !realtime.unavailable) setDisconnected(false);
  }, [connected]);
  const slot = editable && !connected && disconnected &&
    document.getElementById("editor-offline-slot");
  if (!slot) return null;
  return createPortal(
    <div className="editor-offline-notice">
      <WifiOff size={16} aria-hidden="true" />
      <span>{t("editor.offlineEditing")}</span>
    </div>,
    slot,
  );
}
