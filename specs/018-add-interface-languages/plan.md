# Implementation Plan: Eight interface languages

**Spec**: [spec.md](spec.md)
**Date**: 2026-11-26

## Technical context

- Host baseline: Doca 0.2.46. Editor baselines: Slate 0.4.26, Markdown 0.4.4, Sheet 0.2.20, Canvas 0.5.16, Slides 0.3.0-alpha.5.
- Extend the shared host locale inventory and use it for validation and selectors. Keep client date and list presentation tied to the active language. Keep machine identifiers and user-authored content intact.
- Each independently released editor owns its catalog and its locale handling. Build and test the candidates in isolated checkouts, then install the exact published npm versions. The editor mount and lifecycle remain independent of the language setting.
- Localize documentation navigation and active public pages. Preserve archived release and research evidence. Render screenshots with localized synthetic sample content in an isolated deployment.

## Constitution check

The approved compatibility plan is in [the specification](spec.md#compatibility-decision). Inspect installed editor exports, use disposable data, preserve the preceding releases, and keep generated evidence under `artifacts/`.

## Acceptance mapping

| Acceptance | Source | Verification |
| --- | --- | --- |
| AC-001 | Shared catalogs, language provider, sign-in and workspace UI, site settings and page state | Catalog parity, interpolation, isolated API and browser checks |
| AC-002 | Five editor repositories and Doca editor mounts | Package checks, native translated controls, locale changes during editing and content/session invariants |
| AC-003 | Desktop, mobile and browser extension | Client checks and isolated UI observations |
| AC-004 | Repository READMEs, Docsify, screenshots | Language-route and link checks with visual review of published images |
| AC-005 | Exact npm pins, version manifests, release workflows | Archive contents, full local checks and published version/release/image receipts |
