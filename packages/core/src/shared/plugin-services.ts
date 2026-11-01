import { directorySourceRegistry } from "../modules/discovery/directory-registry.js";
import type { ContentSource } from "@smartdoca/plugin-sdk/content";
import type { PluginAISkill, AIContinuationSource } from "@smartdoca/plugin-sdk/ai";
import type { ActivitySource, DirectorySource, OperationPolicy, PermissionSource } from "@smartdoca/plugin-sdk/platform";
import type { JsonObject } from "@smartdoca/plugin-sdk";
import type { DB } from "../../../db/src/index.js";
import { databaseRuntimeScope } from "../../../db/src/runtime-scope.js";
import { fail } from "./errors.js";

export interface PluginServices {
  readonly content: Map<string, ContentSource>;
  readonly activities: Map<string, ActivitySource>;
  readonly skills: Map<string, PluginAISkill>;
  continuationsReady: boolean;
  readonly continuations: Map<string, AIContinuationSource>;
  readonly directories: Map<string, DirectorySource>;
  readonly permissions: Map<string, PermissionSource>;
  readonly policies: Map<string, OperationPolicy>;
  readonly unavailablePlugins: Set<string>;
}
export function pluginServices(db: DB): PluginServices {
  const scope = databaseRuntimeScope(db);
  let services = scope.get("plugin-services") as PluginServices | undefined;
  if (!services) {
    services = { content: new Map(), activities: new Map(), skills: new Map(), continuationsReady: true, continuations: new Map(), directories: directorySourceRegistry(db), permissions: new Map(), policies: new Map(), unavailablePlugins: new Set() };
    scope.set("plugin-services", services);
  }
  return services;
}
export async function checkOperation(db: DB, principalId: string, action: string, facts: JsonObject = {}) {
  if (pluginServices(db).unavailablePlugins.size)
    fail(503, "Plugin policies unavailable; upgrade or disable incompatible plugins and restart", { code: "plugin_policies_unavailable" });
  for (const policy of pluginServices(db).policies.values())
    await policy.check({ principalId, action, facts });
}
