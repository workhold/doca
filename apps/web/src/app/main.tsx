import "../shared/browser-crypto.js";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AccountLogin } from "@web/features/auth/account-login.js";
import { rememberedShareToken, takeLoginDocument } from "@web/features/auth/login-return.js";
import { loadBootstrap } from "@web/shared/bootstrap.js";
import { isDesktopWorkspaceTab } from "@web/shared/desktop-tab-visibility.js";
import {
  invalidateStartupIdentity,
  readStartupAccount,
  startupSessionKey,
} from "@web/shared/document-startup-cache.js";
import { FeedbackViewport } from "@web/shared/components/feedback.js";
import { LocaleProvider, useI18n } from "@web/shared/i18n.js";
import { navigateToDefaultHome } from "@web/shared/navigation-layout.js";
import { canDownloadOfflineShell, downloadOfflineShell } from "@web/shared/offline-shell.js";
import "@web/styles/globals.css";
import "@web/styles/theme.css";
import "@web/styles/platform-polish.css";

const loadWorkspace = () => import("./app.js");

function isHome() {
  return !location.hash || location.hash === "#/home";
}

function Entry() {
  const { t, reloadLocale } = useI18n();
  const [openWorkspace, setOpenWorkspace] = useState(() => !isHome() || !!readStartupAccount());
  const [Workspace, setWorkspace] = useState<typeof import("./app.js").App>();
  const [workspaceError, setWorkspaceError] = useState(false);
  const [bootstrap, setBootstrap] = useState<Awaited<ReturnType<typeof loadBootstrap>>>();
  useEffect(() => {
    if (openWorkspace) return;
    let active = true;
    const openSpecialRoute = () => { if (!isHome()) setOpenWorkspace(true); };
    const sessionChanged = (event: StorageEvent) => {
      if (event.key !== startupSessionKey || !readStartupAccount()) return;
      invalidateStartupIdentity();
      setOpenWorkspace(true);
    };
    window.addEventListener("hashchange", openSpecialRoute);
    window.addEventListener("storage", sessionChanged);
    void loadBootstrap().then((value) => {
      if (!active) return;
      if (value.user || !isHome()) {
        setOpenWorkspace(true);
      } else {
        takeLoginDocument();
        setBootstrap(value);
        void reloadLocale(value.defaultLocale, false);
      }
    }).catch(() => {
      // The workspace already handles offline state and bootstrap retries.
      if (active) setOpenWorkspace(true);
    });
    return () => {
      active = false;
      window.removeEventListener("hashchange", openSpecialRoute);
      window.removeEventListener("storage", sessionChanged);
    };
  }, [openWorkspace, reloadLocale]);
  useEffect(() => {
    if (!openWorkspace && bootstrap?.siteName)
      document.title = t("app.documentTitle", { site: bootstrap.siteName });
  }, [bootstrap?.siteName, t, openWorkspace]);

  useEffect(() => {
    if (!openWorkspace) return;
    let active = true;
    void loadWorkspace().then(({ App }) => {
      if (active) setWorkspace(() => App);
    }).catch((error) => {
      console.error("Workspace could not load", error);
      if (active) setWorkspaceError(true);
    });
    return () => { active = false; };
  }, [openWorkspace]);

  if (Workspace) return <Workspace />;
  if (workspaceError)
    return (
      <main className="auth">
        <div className="auth-card" role="alert">
          <h1>{t("shell.offline")}</h1>
          <button onClick={() => location.reload()}>{t("shell.retry")}</button>
        </div>
      </main>
    );
  if (openWorkspace || !bootstrap)
    return <main className="auth" role="status">{t("shell.connecting")}</main>;
  return (
    <AccountLogin
      bootstrap={bootstrap}
      siteLogoUrl={bootstrap.siteLogoUrl}
      logged={async () => {
        const current = await loadBootstrap(true);
        if (!current.user) {
          setBootstrap(current);
          return;
        }
        void loadWorkspace().catch(() => {});
        const token = rememberedShareToken();
        const documentLocation = takeLoginDocument();
        if (token) location.hash = "/s/" + token;
        else if (documentLocation) location.hash = documentLocation;
        else await navigateToDefaultHome().catch(() => { location.hash = "/home"; });
        setOpenWorkspace(true);
      }}
    />
  );
}

// Let the workspace handle connection checks and its local offline entry for a known account.
if (isDesktopWorkspaceTab() || readStartupAccount())
  void loadWorkspace().catch(() => {});
if (!isHome()) void loadBootstrap().catch(() => {});

if (canDownloadOfflineShell()) {
  const standalone = matchMedia("(display-mode: standalone)");
  const prepare = () => {
    if (standalone.matches && navigator.onLine)
      void downloadOfflineShell().catch(() => {});
  };
  standalone.addEventListener("change", prepare);
  prepare();
}

createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <Entry />
    <FeedbackViewport />
  </LocaleProvider>,
);
