import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";

const featureName = /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const statuses = new Set(["draft", "accepted", "implemented", "verified", "superseded"]);
const clean = (value) => value.replace(/<!--[\s\S]*?-->/g, "").trim();
const text = (node) => node.value ?? (node.children ?? []).map(text).join("");
const substantive = (value) => value && !/^(?:todo|tbd|pending|none|n\/a|待填写|填写|\.{3}|…)$/i.test(value.trim());
const acceptanceReferences = (value) => new Set(clean(value).match(/\bAC-\d{3,}\b/g) ?? []);
const metadata = (markdown, name) => {
  const matches = [...clean(markdown).matchAll(new RegExp(`^\\*\\*${name}\\*\\*:\\s*(.+)$`, "gm"))];
  return matches.length === 1 ? matches[0][1].trim() : "";
};

export function section(markdown, title) {
  const source = clean(markdown);
  const nodes = fromMarkdown(source).children;
  const index = nodes.findIndex((node) => node.type === "heading" && node.depth === 2 && text(node) === title);
  if (index < 0) return "";
  const next = nodes.slice(index + 1).find((node) => node.type === "heading" && node.depth <= 2);
  return source.slice(nodes[index].position.end.offset, next?.position.start.offset).trim();
}

async function read(root, path, problems) {
  try {
    const actual = await realpath(resolve(root, path));
    const base = await realpath(root);
    const location = relative(base, actual);
    if (location === ".." || location.startsWith("../")) throw new Error("outside repository");
    return await readFile(actual, "utf8");
  } catch {
    problems.push(`Missing or unsafe record: ${path}`);
    return "";
  }
}

export async function checkSpecifications(root) {
  const problems = [];
  const records = new Map();
  const numbers = new Set();
  let entries;
  try { entries = await readdir(resolve(root, "specs"), { withFileTypes: true }); }
  catch { return { problems: ["Missing specs directory"], records }; }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isFile() && entry.name === "README.md") continue;
    if (!entry.isDirectory() || !featureName.test(entry.name)) {
      problems.push(`Invalid spec directory: specs/${entry.name}`);
      continue;
    }
    const number = Number(entry.name.split("-")[0]);
    if (numbers.has(number)) problems.push(`Duplicate spec number: ${entry.name}`);
    numbers.add(number);
    const directory = `specs/${entry.name}`;
    const path = `${directory}/spec.md`;
    const spec = await read(root, path, problems);
    const level = metadata(spec, "Level");
    const status = metadata(spec, "Status");
    records.set(path, { level, status });
    if (!["full", "standard"].includes(level)) problems.push(`${path}: Level must be full or standard`);
    if (!statuses.has(status)) problems.push(`${path}: invalid Status`);
    for (const name of ["Created", "Decision"]) {
      if (!substantive(metadata(spec, name))) problems.push(`${path}: missing ${name}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata(spec, "Created"))) problems.push(`${path}: Created must be YYYY-MM-DD`);
    for (const name of ["Scope", "Acceptance"]) {
      if (!substantive(section(spec, name))) problems.push(`${path}: missing ${name} section`);
    }
    const ids = [...section(spec, "Acceptance").matchAll(/^\s*-\s+\*\*(AC-\d{3,})\*\*[:：]/gm)].map((match) => match[1]);
    if (!ids.length || new Set(ids).size !== ids.length) problems.push(`${path}: missing or duplicate acceptance IDs`);
    let tasks = section(spec, "Tasks");
    let validation = section(spec, "Validation");
    if (level === "full") {
      const plan = await read(root, `${directory}/plan.md`, problems);
      tasks = await read(root, `${directory}/tasks.md`, problems);
      validation = await read(root, `${directory}/validation.md`, problems);
      if (plan && !plan.includes("spec.md")) problems.push(`${directory}/plan.md: missing spec reference`);
      for (const [name, value] of [["tasks", tasks], ["validation", validation]]) {
        if (value && !value.includes("spec.md")) problems.push(`${directory}/${name}.md: missing spec reference`);
      }
    } else if (level === "standard" && !substantive(section(spec, "Design"))) {
      problems.push(`${path}: standard changes require a Design section`);
    }
    if (!/^\s*- \[[ xX]\] T\d{3,}\b/m.test(clean(tasks))) problems.push(`${path}: missing checkbox tasks with task IDs`);
    const taskReferences = acceptanceReferences(tasks);
    for (const id of ids) {
      if (!taskReferences.has(id)) problems.push(`${path}: no task references ${id}`);
    }
    const result = metadata(validation, "Result");
    if (!["pending", "passed", "partial", "failed"].includes(result)) problems.push(`${path}: validation requires Result pending/passed/partial/failed`);
    if (["implemented", "verified"].includes(status) && /^\s*- \[ \]/m.test(clean(tasks))) problems.push(`${path}: ${status} has unfinished tasks`);
    if (status === "verified") {
      if (result !== "passed") problems.push(`${path}: verified requires passed validation`);
      const verifiedReferences = acceptanceReferences(validation);
      for (const id of ids) {
        if (!verifiedReferences.has(id)) problems.push(`${path}: verified validation does not cover ${id}`);
      }
    }
    if (["accepted", "implemented", "verified"].includes(status) && /\[NEEDS CLARIFICATION|\[FEATURE\]|\[DATE\]|\[User request,|\[Problem,|\[Observable,|\[Concrete task,/i.test(clean(spec))) {
      problems.push(`${path}: unresolved template or clarification`);
    }
  }
  if (!records.size) problems.push("No change specifications found");
  return { problems, records };
}

export async function checkTooling(root) {
  const problems = [];
  for (const integration of ["speckit", "codex"]) {
    const path = `.specify/integrations/${integration}.manifest.json`;
    const source = await read(root, path, problems);
    if (!source) continue;
    let manifest;
    try { manifest = JSON.parse(source); }
    catch { problems.push(`Invalid upstream manifest: ${path}`); continue; }
    if (manifest.version !== "1.0.4") problems.push(`${path}: expected pinned version 1.0.4`);
    for (const [file, expected] of Object.entries(manifest.files ?? {})) {
      const content = await read(root, file, problems);
      if (createHash("sha256").update(content).digest("hex") !== expected) problems.push(`Modified upstream file: ${file}; customize project overrides instead`);
    }
  }
  const options = await read(root, ".specify/init-options.json", problems);
  try {
    const config = JSON.parse(options);
    if (config.speckit_version !== "1.0.4" || config.integration !== "codex" || config.ai_skills !== true) problems.push("Spec Kit init options disagree with pinned Codex skills installation");
  } catch { problems.push("Invalid Spec Kit init options"); }
  await read(root, ".specify/LICENSE", problems);
  return problems;
}

export function checkPullRequest(body, records) {
  const problems = [];
  // Only top-level paragraphs can declare metadata: examples in fences/comments do not count.
  const paragraphs = fromMarkdown(clean(body)).children.filter((node) => node.type === "paragraph").map(text).join("\n");
  const field = (name) => {
    const matches = [...paragraphs.matchAll(new RegExp(`^${name}:[ \\t]*(.*)$`, "gm"))];
    return matches.length === 1 ? matches[0][1].trim() : "";
  };
  const level = field("SDD-Level");
  const spec = field("SDD-Spec");
  if (!["full", "standard", "light"].includes(level)) problems.push("PR must declare one SDD-Level: full, standard or light");
  if (level === "light") {
    if (spec !== "none") problems.push("Light PR must declare SDD-Spec: none");
  } else if (["full", "standard"].includes(level)) {
    const record = records.get(spec);
    if (!record) problems.push("PR must link an existing primary specs/<number>-<name>/spec.md");
    else {
      if (record.level !== level) problems.push("PR level disagrees with its primary spec");
      if (["draft", "superseded"].includes(record.status)) problems.push("PR primary spec must be accepted, implemented or verified");
    }
  }
  for (const name of ["Problem", "Behavior", "Impacts", "Verification"]) {
    if (!substantive(section(body, name))) problems.push(`PR must fill the ${name} section`);
  }
  return problems;
}
