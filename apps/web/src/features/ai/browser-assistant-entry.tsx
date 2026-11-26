import type { Locale } from "@doca/i18n";
import { useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "@web/shared/i18n.js";
import { AIProvider, useAI } from "./ai-context.js";
import { AIChat } from "./ai-chat.js";
import { AIChatRuntimeProvider, type AIChatRuntime, type AIJobStream } from "./ai-runtime.js";
import { createBrowserAssistantRequest, type BrowserPageCapture } from "./browser-assistant-transport.js";

export type BrowserAssistantConfig = {
  userId: string;
  connectionId: string;
  origin: string;
  sessionId: string | null;
  profile: { id: string; revision: number; name: string };
  page: { title: string; url: string };
  locale?: Locale;
  /** Paths use the shared /ai/... vocabulary. The bridge must only map to assistant/ui. */
  request: AIChatRuntime["request"];
  captureCurrentPage: () => Promise<BrowserPageCapture>;
  onSessionChange: (id: string | null) => void;
  openDoca?: (href: string) => void;
};

type ComposerController = { compose: ((text: string) => void) | null; pending: string | null };
function BrowserComposerBridge({ controller }: { controller: ComposerController }) {
  const ai = useAI()!;
  useEffect(() => {
    const compose = (text: string) => ai.setComposerDraft(text);
    controller.compose = compose;
    if (controller.pending !== null) {
      compose(controller.pending);
      controller.pending = null;
    }
    return () => { if (controller.compose === compose) controller.compose = null; };
  }, [ai.setComposerDraft, controller]);
  return null;
}

function BrowserAssistant({ config, controller }: { config: BrowserAssistantConfig; controller: ComposerController }) {
  const page = config.page;
  const captures = useRef(new Map<string, Promise<BrowserPageCapture>>()).current;
  const runtime = useMemo<AIChatRuntime>(() => {
    // Retried messages keep their frozen material; the composer follows the active page.
    const request = createBrowserAssistantRequest({ ...config, captured: () => {} }, captures);
    const stream = (id: string): AIJobStream => {
      const target = new EventTarget();
      let closed = false, busy = false;
      const seen = new Map<string, string>();
      const poll = async () => {
        if (closed || busy) return;
        busy = true;
        try {
          const conversation = await request<{ jobs: { id: string }[] }>(`/ai/sessions/${id}`);
          if (closed) return;
          for (const job of conversation.jobs) {
            const data = JSON.stringify(job);
            if (seen.get(job.id) === data) continue;
            seen.set(job.id, data);
            target.dispatchEvent(new MessageEvent("job", { data }));
          }
        } catch (error) {
          if (!closed && [401, 403, 404, 409].includes((error as { status?: number }).status ?? 0)) {
            closed = true;
            target.dispatchEvent(new Event("revoked"));
          }
        } finally { busy = false; }
      };
      const timer = setInterval(() => void poll(), 1000);
      void poll();
      return {
        addEventListener: target.addEventListener.bind(target),
        close: () => { closed = true; clearInterval(timer); },
      };
    };
    const modelKey = `doca.browser.model:${config.connectionId}:${config.profile.id}`;
    const resolveHref = (href: string) => new URL(href.startsWith("/") && !href.startsWith("/api/") ? `#${href}` : href, config.origin + "/").href;
    return {
      request, stream, embedded: true, workspaceActions: false,
      pendingScope: { docaOrigin: new URL(config.origin).origin, userId: config.userId, connectionId: config.connectionId,
        profile: { id: config.profile.id, revision: config.profile.revision } },
      resolveHref,
      navigate: (href) => {
        const url = resolveHref(href);
        if (config.openDoca) config.openDoca(url);
        else window.open(url, "_blank", "noopener,noreferrer");
      },
      sessionChanged: config.onSessionChange,
      readModel: async () => localStorage.getItem(modelKey) ?? undefined,
      writeModel: async (id) => { localStorage.setItem(modelKey, id); },
    };
  }, [config]);
  const contextualRuntime = useMemo(() => ({ ...runtime, composerContext: (
    <a className="ai-browser-page-context" href={page.url} target="_blank" rel="noopener noreferrer" title={page.url}>
      {page.title || page.url}
    </a>
  ) }), [runtime, page]);
  return (
    <AIChatRuntimeProvider runtime={contextualRuntime}>
      <LocaleProvider initialLocale={config.locale}>
        <AIProvider userId={`browser:${config.userId}:${config.connectionId}`} hash={`#/ai${config.sessionId ? `?session=${config.sessionId}` : ""}`} contextLoading={false}>
          <AIChat full browser />
          <BrowserComposerBridge controller={controller} />
        </AIProvider>
      </LocaleProvider>
    </AIChatRuntimeProvider>
  );
}

/** Bundle this entry locally in the extension; no remote code or credential-bearing URL. */
export function mountBrowserAssistant(element: HTMLElement, config: BrowserAssistantConfig) {
  const root = createRoot(element);
  const controller: ComposerController = { compose: null, pending: null };
  const boundary = (value: BrowserAssistantConfig) => JSON.stringify([value.origin, value.userId, value.connectionId, value.profile.id, value.profile.revision]);
  let currentBoundary = boundary(config), mounted = true;
  if (config.locale) localStorage.setItem("doca.locale", config.locale);
  root.render(<BrowserAssistant key={currentBoundary} config={config} controller={controller} />);
  return {
    // Account/profile changes remount state so caches and an in-flight request
    // cannot be handed to another browser authorization boundary.
    update: (next: BrowserAssistantConfig) => {
      if (!mounted) return;
      const nextBoundary = boundary(next);
      if (currentBoundary !== nextBoundary) {
        controller.compose = null;
        controller.pending = null;
        currentBoundary = nextBoundary;
      }
      if (next.locale) localStorage.setItem("doca.locale", next.locale);
      root.render(<BrowserAssistant key={currentBoundary} config={next} controller={controller} />);
    },
    compose: (text: string) => {
      if (!mounted) return;
      if (controller.compose) controller.compose(text);
      else controller.pending = text;
    },
    unmount: () => { mounted = false; controller.pending = null; controller.compose = null; root.unmount(); },
  };
}
