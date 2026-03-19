# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased 1.x.x] — started 2026-03-09

## 1.2.2 — 2026-03-19

- Added configurable context URL matching for custom rules/vars with strict (`exact`) and weak (`prefix`, `wildcard`, `pathSegmentWildcard`) modes, including wildcard patterns like `my-site.com/*` and `my-site.com/users/*/data`.
- Added backward-compatible storage migration to `contextEntries` with legacy fallback, and updated import/export payloads to include `pattern` and `matchMode`.
- Fixed context editing so changing a saved context from strict to wildcard updates the same context entry (instead of leaving the old one active in popup resolution).
- Fixed legacy-context migration id instability so edited context patterns/modes persist reliably across popup reopen/reload.
- Made the Context URL pattern control auto-grow and collapsible (collapsed by default) to match the Custom rules/vars sections.

## 1.2.1 — 2026-03-18

- Start of 1.1 development. Baseline taken from version 1.0.0.
- Added active/inactive flow for custom rules so only one selector/value pair is editable at a time.
- Enhanced Fields tab search and bridge to build selectors, jump to the Custom tab, and prefill the latest custom rule.
- Updated ellipsis menus for rules and variables (Edit/Duplicate/Verify/Delete) with single-open behavior and proper layering over fields.
- Tightened validation: selectors must be unique and valid; autosave and Save are blocked while the active rule has errors or an empty selector/value.
- Prevented adding new selector rules while the current active rule is invalid, and renamed the section to “Custom rules” which auto-expands when opened from the Fields tab.
- Added AI orchestration configuration for this repo:
  - Main agent now follows a **Think → Plan → Delegate** workflow for non-trivial changes.
  - Introduced domain skills for Build & Release, Iteration Planning, and release management.
  - Split test-doc guidance into smaller skills for smoke, regression, and feature-level testing.
- Documented AI workflows, planning artefacts (`plan.md`, `Plans.md`), and version badge behavior in `README.md` / `TESTS.md`.