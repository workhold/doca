import "../shared/browser-crypto.js";
import { PluginExtensionHost } from "../plugins/extensions.js";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import { FeedbackViewport } from "@web/shared/components/feedback.js";
import { LocaleProvider } from "@web/shared/i18n.js";
import { UserMentionLinkStyles } from "@web/shared/components/user-mention.js";
import { loadWebPlugins } from "../plugins/load.js";
import { readDocumentStartup } from "../shared/document-startup-cache.js";

function mount() {
  createRoot(document.getElementById("root")!).render(
    <LocaleProvider>
      <UserMentionLinkStyles />
      <App />
      <PluginExtensionHost />
      <FeedbackViewport />
    </LocaleProvider>,
  );
}
// Cached documents can restore their existing editor while discovery connects.
const cachedDocument = readDocumentStartup(location.hash);
const plugins = loadWebPlugins().catch((error) =>
  console.error("Plugin discovery failed", error),
);
if (cachedDocument) mount();
else void plugins.finally(mount);
