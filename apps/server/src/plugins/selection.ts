import { validatePluginGraph } from "@doca/plugin-host";
import {
  PluginContractError,
  satisfiesPluginVersion,
  type PluginManifest,
} from "@smartdoca/plugin-sdk";
import { PLUGIN_SDK_VERSION } from "@smartdoca/plugin-sdk/version";
import type { PluginStartupIssue } from "@core/shared/plugin-store.js";

/** Compatibility failures isolate business plugins; core and structural errors remain fatal. */
export function selectPluginGraph(
  core: readonly PluginManifest[],
  entries: readonly { manifest: PluginManifest; enabled: boolean }[],
) {
  validatePluginGraph(core);
  const all = new Map(
    core.map((manifest) => [manifest.id, { manifest, enabled: true }]),
  );
  for (const entry of entries) {
    if (all.has(entry.manifest.id))
      throw new PluginContractError(
        "DUPLICATE_PLUGIN",
        `plugin ${entry.manifest.id} is registered more than once`,
        entry.manifest.id,
      );
    all.set(entry.manifest.id, entry);
  }
  const issues = new Map<string, PluginStartupIssue>();
  for (const { manifest } of entries)
    if (
      manifest.sdkRange &&
      !satisfiesPluginVersion(PLUGIN_SDK_VERSION, manifest.sdkRange)
    )
      issues.set(manifest.id, {
        code: "sdk_incompatible",
        sdkVersion: PLUGIN_SDK_VERSION,
        sdkRange: manifest.sdkRange,
      });
  // Resolve required failures before considering optional version constraints.
  // Otherwise input order could block an optional consumer of an already unavailable plugin.
  let changed: boolean;
  do {
    do {
      changed = false;
      for (const { manifest, enabled } of entries) {
        if (!enabled || issues.has(manifest.id)) continue;
        for (const dependency of manifest.dependencies ?? []) {
          if (dependency.optional) continue;
          const target = all.get(dependency.id);
          if (
            !target?.enabled ||
            issues.has(dependency.id) ||
            !satisfiesPluginVersion(target.manifest.version, dependency.range)
          ) {
            issues.set(manifest.id, {
              code: "dependency_unavailable",
              dependencyId: dependency.id,
              requiredRange: dependency.range,
              installedVersion: target?.manifest.version ?? null,
            });
            changed = true;
            break;
          }
        }
      }
    } while (changed);
    for (const { manifest, enabled } of entries) {
      if (!enabled || issues.has(manifest.id)) continue;
      for (const dependency of manifest.dependencies ?? []) {
        if (!dependency.optional) continue;
        const target = all.get(dependency.id);
        const available = target?.enabled && !issues.has(dependency.id);
        if (!available) continue;
        if (
          !satisfiesPluginVersion(target.manifest.version, dependency.range)
        ) {
          issues.set(manifest.id, {
            code: "dependency_unavailable",
            dependencyId: dependency.id,
            requiredRange: dependency.range,
            installedVersion: target?.manifest.version ?? null,
          });
          changed = true;
          break;
        }
      }
    }
  } while (changed);
  const runnable = entries.filter(
    (entry) => entry.enabled && !issues.has(entry.manifest.id),
  );
  const ordered = validatePluginGraph([
    ...core,
    ...runnable.map((entry) => entry.manifest),
  ]);
  return { issues, ordered };
}

export function compatibilityError(id: string, issue: PluginStartupIssue) {
  return new PluginContractError(
    "INCOMPATIBLE_DEPENDENCY",
    issue.code === "sdk_incompatible"
      ? `plugin ${id} requires Doca SDK ${issue.sdkRange}, but ${issue.sdkVersion} is installed; upgrade the plugin`
      : `plugin ${id} requires available plugin ${issue.dependencyId} ${issue.requiredRange}; upgrade or enable its dependency`,
    `${id}.${issue.code === "sdk_incompatible" ? "sdkRange" : "dependencies"}`,
  );
}
