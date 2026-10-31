import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPullRequest, checkSpecifications, checkTooling } from "../lib/sdd.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const path = "specs/001-example/spec.md";
const spec = (level = "standard", status = "accepted") => `# Example

**Level**: ${level}
**Status**: ${status}
**Created**: 2026-11-01
**Decision**: User authorized the scoped change.

## Scope

Update an existing local display.

## Acceptance

- **AC-001**：User can inspect the display.

## Design

Use the existing component and current contract.

## Tasks

- [x] T001 Update and check the display. AC-001.

## Validation

**Result**: passed

AC-001: checked using an isolated fixture, no production claim.
`;
const pr = (level = "light", reference = "none") => `SDD-Level: ${level}
SDD-Spec: ${reference}

## Problem

Existing label is misleading.

## Behavior

Label matches current behavior.

## Impacts

Local copy only; existing contracts, authorization and storage are unchanged.

## Verification

Ran the relevant local check; no application deployment was performed.
`;

async function fixture(run) {
  const parent = resolve(repository, "artifacts/verification/sdd-adoption/tests");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(resolve(parent, "case-"));
  const put = async (name, content) => {
    await mkdir(dirname(resolve(root, name)), { recursive: true });
    await writeFile(resolve(root, name), content);
  };
  try { await run({ root, put }); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test("standard work uses one spec with bilingual acceptance punctuation", async () => {
  await fixture(async ({ root, put }) => {
    await put(path, spec());
    assert.deepEqual((await checkSpecifications(root)).problems, []);
  });
});

test("full work requires separate design, tasks and validation records", async () => {
  await fixture(async ({ root, put }) => {
    await put(path, spec("full"));
    const result = await checkSpecifications(root);
    for (const file of ["plan", "tasks", "validation"]) assert.ok(result.problems.some((value) => value.includes(`${file}.md`)));
    await put("specs/001-example/plan.md", "# Plan\n\n[Spec](spec.md)\n\nUse the existing component.\n");
    await put("specs/001-example/tasks.md", "[Spec](spec.md)\n\n- [x] T001 Check display. AC-001.\n");
    await put("specs/001-example/validation.md", "[Spec](spec.md)\n\n**Result**: passed\n\nAC-001: passed isolated checks.\n");
    assert.deepEqual((await checkSpecifications(root)).problems, []);
  });
});

test("verified cannot hide unfinished tasks or incomplete acceptance", async () => {
  await fixture(async ({ root, put }) => {
    await put(path, spec("standard", "verified").replace("[x]", "[ ]").replace("**Result**: passed", "**Result**: partial").replace("AC-001: checked", "Not checked"));
    const { problems } = await checkSpecifications(root);
    assert.ok(problems.some((value) => value.includes("unfinished tasks")));
    assert.ok(problems.some((value) => value.includes("requires passed")));
    assert.ok(problems.some((value) => value.includes("does not cover AC-001")));
  });
});

test("duplicate feature numbers, invalid metadata and orphan acceptance fail", async () => {
  await fixture(async ({ root, put }) => {
    await put(path, spec().replace("T001 Update and check the display. AC-001.", "T001 Update the display."));
    await put("specs/001-other/spec.md", spec("light", "ready"));
    const { problems } = await checkSpecifications(root);
    for (const message of ["Duplicate spec number", "Level must", "invalid Status", "no task references"]) assert.ok(problems.some((value) => value.includes(message)));
  });
});

test("acceptance IDs are unique and accepted specs reject unresolved templates", async () => {
  await fixture(async ({ root, put }) => {
    await put(path, spec().replace("# Example", "# [FEATURE]").replace("## Design", "- **AC-001**: duplicate\n\n## Design"));
    const { problems } = await checkSpecifications(root);
    assert.ok(problems.some((value) => value.includes("duplicate acceptance")));
    assert.ok(problems.some((value) => value.includes("unresolved template")));
  });
});

test("an acceptance ID prefix does not satisfy another criterion", async () => {
  await fixture(async ({ root, put }) => {
    await put(path, spec().replace("T001 Update and check the display. AC-001.", "T001 Update and check the display. AC-0010."));
    assert.ok((await checkSpecifications(root)).problems.some((value) => value.includes("no task references AC-001")));
  });
});

test("light PR requires no spec directory; full PR links the matching accepted spec", () => {
  assert.deepEqual(checkPullRequest(pr(), new Map()), []);
  const records = new Map([[path, { level: "full", status: "accepted" }]]);
  assert.deepEqual(checkPullRequest(pr("full", path), records), []);
  assert.ok(checkPullRequest(pr("standard", path), records).some((value) => value.includes("disagrees")));
  assert.ok(checkPullRequest(pr("full", "../../private.md"), records).some((value) => value.includes("existing primary")));
});

test("draft and superseded specs cannot serve as a ready PR's primary spec", () => {
  for (const status of ["draft", "superseded"]) {
    assert.ok(checkPullRequest(pr("full", path), new Map([[path, { level: "full", status }]])).some((value) => value.includes("accepted, implemented or verified")));
  }
});

test("unfilled PR template, comment-only sections and duplicate declarations fail", async () => {
  const template = await readFile(resolve(repository, ".github/PULL_REQUEST_TEMPLATE.md"), "utf8");
  assert.ok(checkPullRequest(template, new Map()).some((value) => value.includes("Problem")));
  assert.ok(checkPullRequest(pr().replace("Label matches current behavior.", "<!-- Not a real description -->"), new Map()).some((value) => value.includes("Behavior")));
  assert.ok(checkPullRequest(`${pr()}\nSDD-Level: full\n`, new Map()).some((value) => value.includes("one SDD-Level")));
});

test("PR examples in code fences and comments cannot declare metadata", () => {
  for (const body of [`\`\`\`text\n${pr()}\n\`\`\``, `<!-- ${pr()} -->`, `~~~text\n${pr()}\n~~~`]) {
    assert.ok(checkPullRequest(body, new Map()).some((value) => value.includes("one SDD-Level")));
  }
});

test("CLI accepts a real PR event shape and rejects an unfilled PR", async () => {
  await fixture(async ({ root, put }) => {
    const eventPath = resolve(root, "pr event.json");
    await put("pr event.json", JSON.stringify({ pull_request: { body: pr() } }));
    const args = [resolve(repository, "scripts/sdd-check.mjs"), "--pr-event", eventPath];
    const output = execFileSync(process.execPath, args, { cwd: repository, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.ok(output.includes("PR classification and traceability"));
    await put("pr event.json", JSON.stringify({ pull_request: { body: "" } }));
    assert.throws(() => execFileSync(process.execPath, args, { cwd: repository, stdio: "pipe" }), (error) => {
      assert.equal(error.status, 1);
      assert.ok(error.stderr.toString().includes("SDD-Level"));
      return true;
    });
  });
});

test("pinned upstream files retain their installed manifest hashes", async () => {
  assert.deepEqual(await checkTooling(repository), []);
  await fixture(async ({ root }) => {
    await cp(resolve(repository, ".specify"), resolve(root, ".specify"), { recursive: true });
    await cp(resolve(repository, ".agents"), resolve(root, ".agents"), { recursive: true });
    await writeFile(resolve(root, ".specify/scripts/bash/common.sh"), "modified\n");
    assert.ok((await checkTooling(root)).some((value) => value.includes("Modified upstream file: .specify/scripts/bash/common.sh")));
  });
});

test("upstream scripts resolve project overrides, retain existing plans and ignore local pointers", async () => {
  await fixture(async ({ root, put }) => {
    execFileSync("git", ["init", "-q"], { cwd: root });
    const originalBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
    await cp(resolve(repository, ".specify"), resolve(root, ".specify"), { recursive: true });
    const env = { ...process.env, SPECIFY_INIT_DIR: root, SPECIFY_FEATURE_DIRECTORY: "specs/001-example" };
    delete env.SPECIFY_FEATURE;
    const run = (script, ...args) => execFileSync("bash", [resolve(root, `.specify/scripts/bash/${script}.sh`), ...args], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    await put(path, spec("full"));
    const result = JSON.parse(run("setup-plan", "--json"));
    const generated = await readFile(result.IMPL_PLAN, "utf8");
    assert.ok(generated.includes("apps/server"));
    assert.ok(generated.includes("Compatibility impact"));
    await writeFile(result.IMPL_PLAN, "# Existing plan\n");
    run("setup-plan", "--json");
    assert.equal(await readFile(result.IMPL_PLAN, "utf8"), "# Existing plan\n");
    const tasks = JSON.parse(run("setup-tasks", "--json"));
    assert.ok(tasks.TASKS_TEMPLATE.includes("templates/overrides/tasks-template.md"));
    assert.ok(tasks.TASKS_TEMPLATE_CONTENT.includes("AC-001"));
    await put("specs/001-example/tasks.md", tasks.TASKS_TEMPLATE_CONTENT);
    const checked = JSON.parse(run("check-prerequisites", "--json", "--require-spec", "--require-tasks", "--include-tasks"));
    assert.ok(checked.AVAILABLE_DOCS.includes("tasks.md"));
    assert.equal(run("resolve-template", "spec-template"), await readFile(resolve(root, ".specify/templates/overrides/spec-template.md"), "utf8"));
    assert.equal(execFileSync("git", ["check-ignore", ".specify/feature.json"], { cwd: root, encoding: "utf8" }).trim(), ".specify/feature.json");
    const pointer = await readFile(resolve(root, ".specify/feature.json"), "utf8");
    run("check-prerequisites", "--json", "--paths-only");
    assert.equal(await readFile(resolve(root, ".specify/feature.json"), "utf8"), pointer);
    const created = JSON.parse(run("create-new-feature", "--json", "--short-name", "smoke", "Isolated scaffold smoke"));
    const generatedSpec = await readFile(created.SPEC_FILE, "utf8");
    assert.ok(generatedSpec.includes("**Level**: full"));
    assert.ok(generatedSpec.includes("## Compatibility decision"));
    assert.equal(execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim(), originalBranch);
  });
});
