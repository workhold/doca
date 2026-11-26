import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  createDesktopTranslator,
  desktopEn,
  htmlLang,
  isLocale,
  localeNames,
  locales,
  matchLocale,
  type DesktopMessageKey,
  type Locale,
} from "@doca/i18n/desktop";
import "./style.css";

type Endpoint = {
  id: string;
  name: string;
  origin: string;
  accountId: string | null;
  connected: boolean;
  credentialError: string | null;
};
type Profiles = {
  active: string;
  endpoints: Endpoint[];
  workspaceOpen: boolean;
  managerLocale: Locale | null;
};

const localeStorageKey = "doca.locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(localeStorageKey);
    if (isLocale(saved)) return saved;
  } catch {
    /* The system locale is available even if storage is blocked. */
  }
  return (
    navigator.languages.map(matchLocale).find((locale) => locale !== null) ??
    "en"
  );
}

function desktopErrorKey(reason: unknown): DesktopMessageKey | undefined {
  if (
    typeof reason === "string" &&
    reason.startsWith("desktop.error.") &&
    Object.hasOwn(desktopEn, reason)
  ) {
    return reason as DesktopMessageKey;
  }
}

function Icon({ kind }: { kind: "book" | "remote" }) {
  const paths = {
    book: (
      <>
        <path d="M12 7v14" />
        <path d="M3 18V5.6A2.6 2.6 0 0 1 5.6 3H8a4 4 0 0 1 4 4 4 4 0 0 1 4-4h2.4A2.6 2.6 0 0 1 21 5.6V18a2 2 0 0 0-2-2h-3a4 4 0 0 0-4 4 4 4 0 0 0-4-4H5a2 2 0 0 0-2 2Z" />
      </>
    ),
    remote: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind]}
    </svg>
  );
}

function App() {
  const [profiles, setProfiles] = useState<Profiles>({
    active: "local",
    endpoints: [],
    workspaceOpen: false,
    managerLocale: null,
  });
  const [locale, setLocale] = useState(initialLocale);
  const localeChanged = useRef(false);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<DesktopMessageKey>();
  const [message, setMessage] = useState<DesktopMessageKey>();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);
  const t = createDesktopTranslator(locale);

  const showError = useCallback(
    (fallback: DesktopMessageKey, reason: unknown) => {
      const key = desktopErrorKey(reason);
      if (!key) console.error(fallback, reason);
      setError(key ?? fallback);
    },
    [],
  );
  const reload = useCallback(async () => {
    const next = await invoke<Profiles>("get_profiles");
    setProfiles(next);
    return next;
  }, []);
  const loadFailed = useCallback(
    (reason: unknown) => showError("desktop.manager.loadFailed", reason),
    [showError],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale);
    document.title = createDesktopTranslator(locale)("desktop.workspaceTitle");
  }, [locale]);

  useEffect(() => {
    let stopped = false;
    const stops: (() => void)[] = [];
    const keep = (registration: Promise<() => void>) =>
      registration
        .then((stop) => {
          if (stopped) stop();
          else stops.push(stop);
        })
        .catch((reason) => console.error(reason));

    const localeListener = keep(
      listen<Locale>("desktop-manager-locale", ({ payload }) => {
        if (!isLocale(payload)) return;
        localeChanged.current = true;
        setLocale(payload);
      }),
    );
    // The manager may still be mounting when a restored workspace opens it.
    void localeListener
      .then(reload)
      .then(({ managerLocale }) => {
        if (!stopped && !localeChanged.current && isLocale(managerLocale))
          setLocale(managerLocale);
      })
      .catch(loadFailed);
    keep(
      listen("desktop-login-complete", () => {
        setMessage("desktop.manager.loginComplete");
        setBusy("");
        void reload().catch(loadFailed);
      }),
    );
    keep(
      listen<string>("desktop-login-failed", (event) => {
        setBusy("");
        showError("desktop.connect.failed", event.payload);
      }),
    );
    keep(
      listen("desktop-session-ended", () => {
        setMessage("desktop.manager.sessionEnded");
        void reload().catch(loadFailed);
      }),
    );
    keep(
      listen<string>("desktop-session-error", (event) =>
        showError("desktop.manager.sessionFailed", event.payload),
      ),
    );
    keep(
      listen<string>("desktop-restore-failed", (event) =>
        showError("desktop.tabs.restoreFailed", event.payload),
      ),
    );
    return () => {
      stopped = true;
      stops.forEach((stop) => stop());
    };
  }, [loadFailed, reload, showError]);

  function chooseLocale(next: string) {
    if (!isLocale(next)) return;
    localeChanged.current = true;
    setLocale(next);
    try {
      localStorage.setItem(localeStorageKey, next);
    } catch {
      /* The current selection still applies. */
    }
  }

  async function act(
    key: string,
    errorKey: DesktopMessageKey,
    work: () => Promise<void>,
  ) {
    setBusy(key);
    setError(undefined);
    setMessage(undefined);
    try {
      await work();
    } catch (reason) {
      showError(errorKey, reason);
    } finally {
      await reload().catch(loadFailed);
      setBusy("");
    }
  }

  return (
    <div className="desktop-app">
      <header className="desktop-topbar">
        <span className="brand-symbol">
          <Icon kind="book" />
        </span>
        <strong>Doca</strong>
        <label className="locale-picker">
          <span>{t("desktop.manager.language")}</span>
          <select
            value={locale}
            onChange={(event) => chooseLocale(event.target.value)}
          >
            {locales.map((value) => (
              <option key={value} value={value} lang={htmlLang(value)}>
                {localeNames[value]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="shell">
        <div className="page-heading">
          <h1>{t("desktop.manager.heading")}</h1>
          <p>{t("desktop.manager.description")}</p>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {t(error)}
          </div>
        )}
        {message && (
          <div className="notice success" role="status">
            {t(message)}
          </div>
        )}
        <div className="section-heading">
          <h2>{t("desktop.manager.services")}</h2>
          <span>
            {t("desktop.manager.addressCount", {
              count: profiles.endpoints.length,
            })}
          </span>
        </div>
        <div className="remote-list">
          {profiles.endpoints.map((endpoint) => (
            <section
              className={`profile remote ${profiles.active === endpoint.id ? "selected" : ""}`}
              key={endpoint.id}
            >
              <div className="profile-top">
                <span className="profile-icon remote-icon">
                  <Icon kind="remote" />
                </span>
                <div>
                  <h3>{endpoint.name}</h3>
                  <p className="endpoint" title={endpoint.origin}>
                    {endpoint.origin}
                  </p>
                </div>
                <span
                  className={`tag ${endpoint.connected ? "connected" : ""}`}
                >
                  {t(
                    endpoint.credentialError
                      ? "desktop.manager.credentialUnavailable"
                      : endpoint.connected
                        ? "desktop.manager.connected"
                        : "desktop.manager.signedOut",
                  )}
                </span>
              </div>
              {endpoint.credentialError && (
                <p className="credential-warning" role="status">
                  {t("desktop.manager.credentialWarning")}
                </p>
              )}
              <div className="actions">
                <button
                  className="primary"
                  disabled={!!busy || !!endpoint.credentialError}
                  onClick={() =>
                    void act(
                      endpoint.id,
                      endpoint.connected
                        ? "desktop.manager.openFailed"
                        : "desktop.connect.failed",
                      async () => {
                        if (endpoint.connected)
                          await invoke("open_profile", { id: endpoint.id });
                        else {
                          await invoke("start_login", { id: endpoint.id });
                          setMessage("desktop.manager.finishInBrowser");
                        }
                      },
                    )
                  }
                >
                  {t(
                    busy === endpoint.id
                      ? "desktop.manager.wait"
                      : endpoint.connected
                        ? "desktop.manager.open"
                        : "desktop.manager.signIn",
                  )}
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => {
                    setRenaming(endpoint.id);
                    setRenameName(endpoint.name);
                    setConfirmRemoval(null);
                  }}
                >
                  {t("desktop.manager.rename")}
                </button>
                {endpoint.connected && (
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void act(
                        `logout-${endpoint.id}`,
                        "desktop.manager.signOutFailed",
                        () => invoke("sign_out", { id: endpoint.id }),
                      )
                    }
                  >
                    {t("desktop.manager.signOut")}
                  </button>
                )}
                <button
                  className="danger"
                  disabled={!!busy}
                  onClick={() => {
                    setConfirmRemoval(endpoint.id);
                    setRenaming(null);
                  }}
                >
                  {t("desktop.manager.remove")}
                </button>
              </div>
              {renaming === endpoint.id && (
                <form
                  className="inline-editor"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void act(
                      `rename-${endpoint.id}`,
                      "desktop.manager.renameFailed",
                      async () => {
                        await invoke("rename_endpoint", {
                          id: endpoint.id,
                          name: renameName,
                        });
                        setRenaming(null);
                      },
                    );
                  }}
                >
                  <label>
                    {t("desktop.manager.serviceName")}
                    <input
                      autoFocus
                      value={renameName}
                      onChange={(event) => setRenameName(event.target.value)}
                      required
                      maxLength={80}
                    />
                  </label>
                  <div className="actions">
                    <button className="primary" type="submit" disabled={!!busy}>
                      {t("desktop.manager.saveName")}
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => setRenaming(null)}
                    >
                      {t("desktop.manager.cancel")}
                    </button>
                  </div>
                </form>
              )}
              {confirmRemoval === endpoint.id && (
                <div
                  className="inline-confirm"
                  role="group"
                  aria-label={t("desktop.manager.confirmRemoval")}
                >
                  <p>
                    {t("desktop.manager.removePrompt", { name: endpoint.name })}
                  </p>
                  <div className="actions">
                    <button
                      className="danger"
                      disabled={!!busy}
                      onClick={() =>
                        void act(
                          `remove-${endpoint.id}`,
                          "desktop.manager.removeFailed",
                          async () => {
                            await invoke("remove_endpoint", {
                              id: endpoint.id,
                            });
                            setConfirmRemoval(null);
                          },
                        )
                      }
                    >
                      {t("desktop.manager.confirmRemoval")}
                    </button>
                    <button
                      disabled={!!busy}
                      onClick={() => setConfirmRemoval(null)}
                    >
                      {t("desktop.manager.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ))}
          {!profiles.endpoints.length && (
            <p className="empty">{t("desktop.manager.empty")}</p>
          )}
        </div>
        <form
          className="add"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void act("add", "desktop.manager.addFailed", async () => {
              await invoke("add_endpoint", { name, origin });
              setName("");
              setOrigin("");
            });
          }}
        >
          <h2>{t("desktop.manager.addService")}</h2>
          <label>
            {t("desktop.manager.serviceName")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("desktop.manager.nameExample")}
              required
              maxLength={80}
            />
          </label>
          <label>
            {t("desktop.manager.backendAddress")}
            <input
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              placeholder="https://doca.example.com"
              type="url"
              required
            />
          </label>
          <p>{t("desktop.manager.addressHelp")}</p>
          <button type="submit" disabled={!!busy}>
            {t(
              busy === "add"
                ? "desktop.manager.saving"
                : "desktop.manager.addAddress",
            )}
          </button>
        </form>
        <footer>{t("desktop.manager.saveBeforeSwitching")}</footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
