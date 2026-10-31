import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPullRequest, checkSpecifications, checkTooling } from "./lib/sdd.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--pr-event")) {
  throw new Error("Usage: node scripts/sdd-check.mjs [--pr-event <GitHub event JSON>]");
}
const { problems, records } = await checkSpecifications(root);
problems.push(...await checkTooling(root));
if (args.length) {
  const event = JSON.parse(await readFile(resolve(args[1]), "utf8"));
  if (!event.pull_request || typeof event.pull_request.body !== "string") {
    problems.push("PR event must contain a pull_request body");
  } else {
    problems.push(...checkPullRequest(event.pull_request.body, records));
  }
}
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`SDD verified: ${records.size} change specification(s), pinned upstream hashes${args.length ? ", PR classification and traceability" : ""}. Semantic risk, approvals and execution evidence require review.`);
}
