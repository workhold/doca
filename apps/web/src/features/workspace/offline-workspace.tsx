import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Search, WifiOff } from "lucide-react";
import { useI18n } from "@web/shared/i18n.js";
import {
  canDownloadOfflineShell,
  downloadOfflineShell,
} from "@web/shared/offline-shell.js";
import {
  listOfflineDocuments,
  watchOfflineDocuments,
} from "@web/features/documents/offline-document-catalog.js";
import { splitTitleIcon } from "@web/shared/utils/resource-title.js";
import "./offline-workspace.css";

type OfflineDocumentItem = { id: string; title: string; libraryTitle?: string };

export function OfflineWorkspace({
  accountId,
  offline,
  missingDocument,
  retry,
}: {
  accountId: string;
  offline: boolean;
  missingDocument: boolean;
  retry: () => void;
}) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<OfflineDocumentItem[] | null>(null);
  const [filter, setFilter] = useState("");
  const [download, setDownload] = useState<
    "idle" | "pending" | "done" | "failed"
  >("idle");
  const available = canDownloadOfflineShell();
  useEffect(() => {
    let revision = 0;
    const read = async () => {
      const request = ++revision;
      const documents = await listOfflineDocuments(accountId);
      if (request === revision) setItems(documents);
    };
    void read();
    const stop = watchOfflineDocuments(read);
    return () => {
      revision++;
      stop();
    };
  }, [accountId]);
  useEffect(() => {
    if (!available) return;
    let active = true;
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (
          active &&
          registration?.active?.scriptURL ===
            new URL("/doca-offline-worker.js", location.origin).href
        )
          setDownload("done");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [available]);
  const query = filter.trim().toLocaleLowerCase(locale);
  const list = items?.filter((item) =>
    [item.title, item.libraryTitle].some((value) =>
      value?.toLocaleLowerCase(locale).includes(query),
    ),
  );

  return (
    <main className="offline-workspace">
      <header className="offline-workspace-header">
        <div>
          {!offline && (
            <a href="#/home" className="offline-workspace-back">
              <ArrowLeft size={16} aria-hidden="true" />
              {t("offline.backWorkspace")}
            </a>
          )}
          <h1>{t(offline ? "offline.recent" : "offline.title")}</h1>
        </div>
        {offline ? (
          <button type="button" onClick={retry}>
            {t("shell.retry")}
          </button>
        ) : (
          available &&
          download !== "done" && (
            <button
              type="button"
              disabled={download === "pending"}
              onClick={() => {
                setDownload("pending");
                void downloadOfflineShell().then(
                  () => setDownload("done"),
                  () => setDownload("failed"),
                );
              }}
            >
              <Download size={16} aria-hidden="true" />
              {t(
                download === "pending"
                  ? "offline.downloadingFrontend"
                  : "offline.downloadFrontend",
              )}
            </button>
          )
        )}
      </header>
      {offline && (
        <p className="offline-workspace-status" role="status">
          <WifiOff size={17} aria-hidden="true" />
          {t("offline.unreachable")}
        </p>
      )}
      {missingDocument && (
        <p className="offline-workspace-status" role="status">
          {t("offline.missingDocument")}
        </p>
      )}
      {!offline && available && download === "done" && (
        <p role="status">{t("offline.frontendReady")}</p>
      )}
      {download === "failed" && (
        <p role="status">{t("offline.frontendFailed")}</p>
      )}
      {!!items?.length && (
        <label className="offline-workspace-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label={t("offline.search")}
            placeholder={t("offline.search")}
          />
        </label>
      )}
      {!list ? (
        <p role="status">{t("offline.loading")}</p>
      ) : list.length > 0 ? (
        <ul className="offline-workspace-list">
          {list.map(({ id, title, libraryTitle }) => (
            <li key={id}>
              <a href={`#/r/${id}`}>
                <FileText size={19} aria-hidden="true" />
                <span>
                  <strong>
                    {splitTitleIcon(title).text || t("shell.untitled")}
                  </strong>
                  {libraryTitle && (
                    <small>{splitTitleIcon(libraryTitle).text}</small>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t(items?.length ? "offline.noResults" : "offline.noDocuments")}</p>
      )}
    </main>
  );
}
