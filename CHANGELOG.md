# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased 1.x.x] — started 2026-03-09

## 1.5.4 — 2026-07-24

- Fixed **Fill Form Now** (side panel / popup) showing `!` / `?` stats instead of fill counts by returning `true` from the content script async `fill` message handler so `sendResponse` completes reliably.

## 1.5.3 — 2026-07-24

- Replaced the Toolbar UI dropdown with a **Side Panel ↔ Pop-Up** toggle switch (knob left = side panel, right = pop-up).

## 1.5.2 — 2026-07-24

- Switching **Toolbar UI** to Popup now closes the side panel immediately (`chrome.sidePanel.close` when available, otherwise `window.close()`); switching to Side panel closes an open popup the same way.

## 1.5.1 — 2026-07-24

- Fixed MV3 Content Security Policy errors by removing inline `window.AFF_UI` scripts; popup vs side panel mode is detected from the shell page URL in `app-core.js`.

## 1.5.0 — 2026-07-24

- **Unified UI:** one extension with a shared `app-core.js`; choose **Popup** or **Side panel** on the Fill tab (**Toolbar UI**). Preference persists in `chrome.storage.local` and applies on the next toolbar icon click.
- Restored classic **popup** UI (`popup.html`) alongside the side panel shell; both share rules, variables, and storage.
- Extracted shared logic into `app-core.js`; `background.js` switches `chrome.action.setPopup` / `chrome.sidePanel` behavior at startup and when the mode changes.

## 1.4.1 — 2026-07-24

- Fixed context resolution when the current URL path does not match a saved pattern but shares the same hostname (e.g. `/portal` now loads a config saved for `host/external/*`), restoring rules and variables in the side panel and for the floating fill button.

## 1.4.0 — 2026-07-24

- Replaced the toolbar **popup** with a Chrome **Side Panel** UI (Chrome 114+); clicking the extension icon docks the panel beside the page like Tag Assistant.
- Side panel layout uses full height with taller field scan lists; the header shows the active tab URL and refreshes when you switch tabs or navigate.
- Autosave on the Custom tab now runs when focus moves to the page or another extension tab, not when switching between controls inside the panel.
- Removed the in-panel **Close** control and save-on-close flow (dismiss the panel via Chrome's side panel chrome).

## 1.3.2 — 2026-07-24

- Floating **Auto Fill** button corner can be chosen from the popup Fill tab (bottom-right, bottom-left, top-right, top-left).
- Edge gap controls show only the sides relevant to the chosen corner (e.g. bottom + right for bottom-right); values persist in `chrome.storage.local` and update the on-page button immediately when it is already injected.

## 1.3.1 — 2026-07-08

- Per-entry `chrome.storage.local` storage with one-time migration from sync, fixing silent save failures when five or more context configurations exceeded Chrome sync storage's 8 KB per-item limit.
- Save and import now surface storage errors instead of updating the UI when persistence fails.

## 1.3.0 — 2026-06-26

- JSON import uses pasted JSON in the popup with an editable context URL pattern and match mode, fixing the popup closing when selecting a file on Linux/Chromium.
- Expanded random first-name and last-name pools from 10 to 60 entries each, giving more variety when filling forms with `randomFirstName` / `randomLastName` custom variables.

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