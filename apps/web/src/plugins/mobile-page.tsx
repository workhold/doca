import { useEffect, useState } from "react";
import { PluginPageHeader } from "./page-header.js";
import { loadWebPlugins } from "./load.js";
import { webPluginRegistry } from "./registry.js";
import { loadBootstrap } from "@web/shared/bootstrap.js";
import type { Bootstrap } from "@web/shared/api.js";
import { useI18n } from "@web/shared/i18n.js";

/** Minimal shell: no host sidebar, account requests, document list or global realtime connection. */
export function MobilePluginPage() {
  const { t } = useI18n();
  const [path, setPath] = useState(location.hash.slice(3));
  const [bootstrap, setBootstrap] = useState<Bootstrap>();
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const changed = () => setPath(location.hash.slice(3));
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    let active = true;
    void loadBootstrap().then(async (value) => {
      if (!active || !value.user) return;
      await loadWebPlugins(value);
      if (active) setBootstrap(value);
    }).catch((error) => console.error("Plugin discovery failed", error))
      .finally(() => { if (active) setFinished(true); });
    return () => { active = false; };
  }, []);
  if (!finished) return <p role="status">{t("plugins.loading")}</p>;
  const route = webPluginRegistry.resolveRoute(path.split("?")[0] ?? "");
  if (!route || !bootstrap?.plugins.some((plugin) => plugin.id === route.contribution.pluginId))
    return <p role="alert">{t("navigation.unavailable")}</p>;
  return (
    <main className="mobile-plugin-page">
      {route.contribution.render(
        { PageHeader: PluginPageHeader, sharedFolderName: "", onFileNavigationChange: () => {} },
        route.match,
      )}
    </main>
  );
}
