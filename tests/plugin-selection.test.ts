import { expect, it } from "vitest";
import { selectPluginGraph } from "@server/plugins/selection.js";
import type { PluginManifest } from "@smartdoca/plugin-sdk";

function entry(
  id: string,
  sdkRange = "^0.2.0",
  dependencies: PluginManifest["dependencies"] = [],
) {
  return {
    enabled: true,
    manifest: {
      schemaVersion: 1 as const,
      id,
      version: "1.0.0",
      displayName: id,
      sdkRange,
      dependencies,
    },
  };
}
it("isolates SDK mismatches and transitive required dependents while optional consumers keep running", () => {
  const old = entry("example.old", "^0.1.9");
  const consumer = entry("example.consumer", undefined, [
    { id: old.manifest.id, range: "^1.0.0" },
  ]);
  const transitive = entry("example.transitive", undefined, [
    { id: consumer.manifest.id, range: "*" },
  ]);
  const optional = entry("example.optional", undefined, [
    { id: old.manifest.id, range: "*", optional: true },
  ]);
  const selected = selectPluginGraph(
    [],
    [transitive, consumer, old, optional, entry("example.healthy")],
  );
  expect([...selected.issues.keys()].sort()).toEqual([
    "example.consumer",
    "example.old",
    "example.transitive",
  ]);
  expect(selected.issues.get(old.manifest.id)).toEqual({
    code: "sdk_incompatible",
    sdkVersion: "0.2.0",
    sdkRange: "^0.1.9",
  });
  expect(selected.ordered.map((p) => p.id)).toEqual([
    "example.healthy",
    "example.optional",
  ]);
});
it("isolates missing, disabled and wrong-version dependencies without hiding unrelated plugins", () => {
  const disabled = { ...entry("example.disabled"), enabled: false };
  for (const dependency of [
    "example.missing",
    "example.disabled",
    "example.healthy",
  ]) {
    const selected = selectPluginGraph(
      [],
      [
        disabled,
        entry("example.healthy"),
        entry("example.consumer", undefined, [
          { id: dependency, range: "^2.0.0" },
        ]),
      ],
    );
    expect(selected.issues.get("example.consumer")).toMatchObject({
      code: "dependency_unavailable",
      dependencyId: dependency,
    });
    expect(selected.ordered.map((p) => p.id)).toEqual(["example.healthy"]);
  }
});
it("keeps core compatibility, duplicate identity and runnable cycles fatal", () => {
  expect(() =>
    selectPluginGraph([entry("doca.core", "^0.1.9").manifest], []),
  ).toThrow(/SDK/);
  expect(() =>
    selectPluginGraph([entry("doca.core").manifest], [entry("doca.core")]),
  ).toThrow(/more than once/);
  expect(() =>
    selectPluginGraph(
      [],
      [
        entry("example.a", undefined, [{ id: "example.b", range: "*" }]),
        entry("example.b", undefined, [{ id: "example.a", range: "*" }]),
      ],
    ),
  ).toThrow(/cycle/);
});

it("resolves required failures before optional versions regardless of input order", () => {
  const optional = entry("example.optional", undefined, [
    { id: "example.failed", range: "^2.0.0", optional: true },
  ]);
  const failed = entry("example.failed", undefined, [
    { id: "example.missing", range: "*" },
  ]);
  for (const entries of [
    [optional, failed],
    [failed, optional],
  ]) {
    const selected = selectPluginGraph([], entries);
    expect([...selected.issues.keys()]).toEqual(["example.failed"]);
    expect(selected.ordered.map((manifest) => manifest.id)).toEqual([
      "example.optional",
    ]);
  }
});
