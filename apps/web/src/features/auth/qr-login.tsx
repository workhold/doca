import { useEffect, useRef, useState } from "react";
import type { MessageKey } from "@doca/i18n";
import { writeClipboardText } from "@web/shared/clipboard.js";
import { useI18n } from "@web/shared/i18n.js";
import { Feedback } from "@web/shared/components/feedback.js";

export function QrLogin({ logged }: { logged: () => Promise<void> }) {
  const { t } = useI18n();
  const loggedRef = useRef(logged);
  loggedRef.current = logged;
  const [svg, setSvg] = useState("");
  const [payload, setPayload] = useState("");
  const [error, setError] = useState<MessageKey | { message: string }>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    async function issue() {
      const response = await fetch("/api/v1/auth/qr", {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const data = await response.json();
      if (stop) return;
      if (!response.ok) {
        setError(
          typeof data.message === "string"
            ? { message: data.message }
            : "login.qr.issueFailed",
        );
        return;
      }
      if (
        typeof data.svg !== "string" ||
        !data.svg.includes("<svg") ||
        data.svg.includes("<script")
      ) {
        setError("login.qr.issueFailed");
        return;
      }
      setSvg(data.svg);
      setPayload(typeof data.payload === "string" ? data.payload : "");
      setError(undefined);
      const wait = async () => {
        if (stop) return;
        try {
          const status = await fetch(`/api/v1/auth/qr/${data.code}`, {
            headers: {
              accept: "application/json",
              "x-doca-qr-secret": data.secret,
            },
          });
          const body = await status.json().catch(() => ({}));
          if (stop) return;
          if (body.status === "active") {
            await loggedRef.current();
            return;
          }
          if (status.status === 410) {
            void issue().catch(issueFailed);
            return;
          }
          if (!status.ok) {
            setError(
              typeof body.message === "string"
                ? { message: body.message }
                : "login.qr.statusFailed",
            );
            return;
          }
        } catch {
          if (!stop) setError("login.qr.statusFailed");
        }
        if (!stop) timer = window.setTimeout(() => void wait(), 2000);
      };
      timer = window.setTimeout(() => void wait(), 1500);
    }
    function issueFailed() {
      if (!stop) setError("login.qr.issueFailed");
    }
    void issue().catch(issueFailed);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="qr-login">
      {svg ? (
        <div
          role="img"
          aria-label={t("login.qr.label")}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p>{t("login.qr.loading")}</p>
      )}
      <p>{t("login.qr.instruction")}</p>
      {payload ? (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void writeClipboardText(payload)
              .then(() => {
                setError(undefined);
                setCopied(true);
              })
              .catch(() => {
                setError("fileManager.copyFailed");
              });
          }}
        >
          {t(copied ? "login.qr.copied" : "login.qr.copy")}
        </button>
      ) : null}
      <Feedback
        message={typeof error === "string" ? t(error) : error?.message}
        tone="error"
      />
    </div>
  );
}
