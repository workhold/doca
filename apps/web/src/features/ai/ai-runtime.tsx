import { createContext, useContext, type ReactNode } from "react";
import { api } from "@web/shared/api.js";
import { workspaceIdentityOrigin } from "@web/shared/desktop-context.js";
import { readPageState, writePageState } from "@web/features/page-state/client.js";
import type { FileSourceDialog, FolderFilePicker } from "@web/features/files/files.js";
import type { SearchPanel } from "@web/features/search/search.js";
import type { AIUserSettings } from "./ai-user-settings.js";
import type { AIReferencePreview } from "./ai-reference-preview.js";
import type { AIBlockRenderContext } from "@web/plugins/registry.js";
import type { FileDelivery, FolderDelivery } from "@core/modules/ai/progress.js";
import type { PendingQueueScope } from "./ai-pending-store.js";

export type AIChatWorkspace = {
  FileSourceDialog: typeof FileSourceDialog;
  FolderFilePicker: typeof FolderFilePicker;
  SearchPanel: typeof SearchPanel;
  AIUserSettings: typeof AIUserSettings;
  ReferencePreview: typeof AIReferencePreview;
};

export type AIJobStream = Pick<EventTarget, "addEventListener"> & { close: () => void };
export type AIChatRuntime = {
  request: typeof api;
  stream: (sessionId: string) => AIJobStream;
  embedded: boolean;
  workspaceActions: boolean;
  /** Explicit target-site/account/connection/profile identity for embedded senders. */
  pendingScope?: PendingQueueScope;
  workspace?: AIChatWorkspace;
  renderBlock?: (kind: "file" | "folder", payload: FileDelivery | FolderDelivery, context: AIBlockRenderContext) => ReactNode | undefined;
  navigate: (href: string) => void;
  resolveHref: (href: string) => string;
  sessionChanged?: (id: string | null) => void;
  composerContext?: ReactNode;
  readModel: () => Promise<string | undefined>;
  writeModel: (id: string) => Promise<unknown>;
};

const hostRuntime: AIChatRuntime = {
  request: api,
  stream: (id) => new EventSource(`/api/v1/ai/sessions/${id}/stream`),
  embedded: false,
  workspaceActions: true,
  navigate: (href) => { location.hash = href.replace(/^.*#/, ""); },
  resolveHref: (href) => href,
  readModel: async () => (await readPageState<string>("ai.model"))?.value,
  writeModel: (id) => writePageState("ai.model", id),
};
const AIRuntimeContext = createContext<AIChatRuntime>(hostRuntime);
export const useAIChatRuntime = () => useContext(AIRuntimeContext);
export function pendingQueueScope(runtime: AIChatRuntime, userId: string): PendingQueueScope {
  return runtime.pendingScope ?? { docaOrigin: workspaceIdentityOrigin(), userId, connectionId: "website", profile: null };
}
export function AIChatRuntimeProvider({ runtime, children }: { runtime: AIChatRuntime; children: ReactNode }) {
  return <AIRuntimeContext.Provider value={runtime}>{children}</AIRuntimeContext.Provider>;
}
