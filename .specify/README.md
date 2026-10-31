# Doca Spec Kit installation

Upstream: [GitHub Spec Kit](https://github.com/github/spec-kit). Installed package: `specify-cli==1.0.4`, matching the inspected LightMoni installation. The upstream MIT notice is preserved in [LICENSE](LICENSE).

The bundled Codex integration, ten `.agents/skills/speckit-*` skills, shared Bash scripts, base templates and workflow were generated with this exact command in an isolated directory:

```sh
uvx --from specify-cli==1.0.4 specify init upstream --non-interactive --ignore-agent-tools --integration codex --integration-options=--skills --script sh
```

Only the generated `.specify/` and `.agents/` directories and the installed distribution's license were copied into the repository. `init-options.json` records this repository as `here: true`. No global tool installation is necessary for the checked-in scripts. Generating the scaffold requires Python 3.11+ and uv; normal checks use the project's Node runtime, and the shared shell scripts require Bash plus Python 3 or jq for JSON handling.

Project-owned customization:

- [Workflow and risk levels](../docs/sdd.md), [module index](../docs/sdd-module-index.md) and [AGENTS.md](../AGENTS.md).
- [Constitution](memory/constitution.md), which references Doca's existing governance.
- `templates/overrides/`, resolved before the immutable upstream templates.
- `scripts/sdd-check.mjs`, PR template and SDD CI workflow, which belong to Doca.

The upstream manifests in `integrations/` record SHA-256 hashes of bundled files. `pnpm sdd:check` verifies those hashes. Customization stays outside those files. The supplied `speckit` workflow retains upstream review gates; Doca's documented default is the tiered skill/manual workflow with existing user authorization and the separate mandatory compatibility agreement.

Before upgrading, generate the chosen pinned version in `artifacts/`, inspect upstream changes and manifest hashes, compare Doca overrides with the new skill/template expectations, and rerun the isolated script and repository checks. Do not reinitialize the working checkout with `--force`. No automatic tool upgrade or old-configuration conversion is configured.

`.specify/feature.json` and per-machine extension overrides are ignored by the bundled `.gitignore`. Use `SPECIFY_FEATURE_DIRECTORY=specs/<number>-<name>` to select a feature explicitly; branch names remain independent and use the repository's `codex/` prefix when a branch is created. Generated diagnostics stay under `artifacts/`.
