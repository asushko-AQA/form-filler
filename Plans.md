# Iteration Plans for AutoForm Filler

This document tracks **persistent iteration plans** for upcoming and past
versions of the AutoForm Filler extension. Each version gets its own section
with goals, changes, risks, and a release checklist.

> Note: `plan.md` is a temporary working plan for the current task or day.
> This `Plans.md` file is the long-lived, versioned source of truth for
> iteration planning.

## Version 1.5.4 — Fill message handler fix

**Branch:** `feature/side-panel-ui`

### Goals

- Restore reliable fill from the side panel / popup **Fill Form Now** button.
- Ensure fill stats (`filled` / `skipped` / `total`) update instead of showing error markers.

### Shipped

- `content.js` — `return true` on the async `fill` message branch so MV3 keeps the message channel open until `sendResponse` runs.

### Testing & Risk

- Regression: floating **Auto Fill** button (in-page) must still work independently.
- Side panel tab targeting via `getActiveTab()` + `sendMessage` — verify on checkout / SPA pages.

### Release Checklist

- [x] Version **1.5.4**; CHANGELOG updated.
- [x] Manual smoke: **Fill Form Now** returns numeric stats on a configured page.
- [ ] Extension reloaded and smoke tested in Chrome 114+.

## Version 1.5.3 — Toolbar UI toggle switch

**Branch:** `feature/side-panel-ui`

### Goals

- Replace the Toolbar UI dropdown with a clearer **Side Panel ↔ Pop-Up** control.

### Shipped

- Fill tab **Toolbar UI** uses a toggle switch (knob left = side panel, right = pop-up) instead of a `<select>` dropdown.

### Release Checklist

- [x] Version **1.5.3**; CHANGELOG updated.
- [ ] Manual smoke: toggle persists and applies on next toolbar click.

## Version 1.5.2 — Close panel/popup on mode switch

**Branch:** `feature/side-panel-ui`

### Goals

- Avoid two UI shells being open at once when switching toolbar mode.

### Shipped

- Switching to **Popup** closes the side panel immediately (`chrome.sidePanel.close` when available).
- Switching to **Side panel** closes an open popup the same way.

### Release Checklist

- [x] Version **1.5.2**; CHANGELOG updated.
- [ ] Manual smoke: switch popup ↔ side panel; only one shell visible at a time.

## Version 1.5.1 — MV3 CSP fix

**Branch:** `feature/side-panel-ui`

### Goals

- Fix Content Security Policy errors from inline scripts in popup / side panel shells.

### Shipped

- Removed inline `window.AFF_UI` bootstrap scripts from HTML shells.
- `app-core.js` detects popup vs side panel mode from the shell page URL (`popup.html` / `sidepanel.html`).

### Testing & Risk

- CSP: no inline script violations in extension DevTools console on panel open.

### Release Checklist

- [x] Version **1.5.1**; CHANGELOG updated.
- [ ] Extension loads without CSP errors in Chrome 114+.

## Version 1.5.0 — Unified UI (Architecture A)

**Branch:** `feature/side-panel-ui`

### Goals

- Keep **both** popup and side panel in one extension with shared storage and logic.
- Let users switch toolbar UI mode from the Fill tab without export/import.
- Single codebase: `app-core.js` + thin HTML shells.

### Shipped

- `app-core.js` — shared Fill / Fields / Custom logic.
- `popup.html` + `sidepanel.html` — layout shells; `app-core.js` detects shell from page URL.
- `background.js` — applies `uiMode` via `chrome.action.setPopup` / `chrome.sidePanel`.
- Fill tab **Toolbar UI** selector; default **side panel**.
- Removed monolithic `popup.js` in favor of shared `app-core.js`.

### Release Checklist

- [x] Architecture A implemented.
- [x] Version **1.5.0**; README and CHANGELOG updated.
- [ ] Manual smoke: switch popup ↔ side panel, shared configs persist.

## Version 1.4.1 — Hostname context fallback

**Branch:** `feature/side-panel-ui`

### Goals

- Load saved rules when the current URL path differs from a saved pattern but shares the same hostname.

### Shipped

- `context-matcher.js` — hostname-level fallback when no exact/prefix/wildcard match (e.g. `/portal` loads config saved for `host/external/*`).
- Restores rules and variables in the side panel and for the floating fill button on sibling paths.

### Testing & Risk

- Multiple contexts on the same host with different path patterns — verify the best match still wins.

### Release Checklist

- [x] Version **1.4.1**; CHANGELOG updated.
- [ ] Manual smoke: navigate to a sibling path and confirm rules load.

## Version 1.4.0 — Side panel UI (completed)

**Branch:** `feature/side-panel-ui`

### Goals

- Replace the toolbar **popup** with a **Chrome Side Panel** (Tag Assistant–style docked UI).
- Keep all existing Fill / Fields / Custom functionality working from the panel.
- Improve layout for a tall, persistent panel instead of a small fixed popup.
- Preserve the floating **Auto Fill** button on the page as an optional entry point.

### Features / Changes

#### Phase 1 — Side Panel migration (MVP)

1. **Manifest & background**
   - Add `"side_panel": { "default_path": "sidepanel.html" }`.
   - Add `"sidePanel"` permission.
   - Add MV3 **service worker** (`background.js`) with:
     ```js
     chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
     ```
   - Remove `action.default_popup` so toolbar click opens the side panel.
   - Set `minimum_chrome_version` to `"114"` (Side Panel API baseline).

2. **UI shell**
   - Copy/adapt `popup.html` → `sidepanel.html` (or rename and update references).
   - Copy/adapt `popup.js` → shared logic in `app-core.js` (later iteration).
   - **CSS changes for panel layout:**
     - `html, body { height: 100%; }` — use full panel height.
     - Remove `width: 340px` and `max-height: 600px` constraints.
     - Use `width: 100%` and flex column layout (header / tabs / scrollable body).
     - Widen rule editor and Fields scan results where useful (~360–420px is typical panel width).

3. **Popup-specific cleanup**
   - Remove or repurpose **Close** button (`close-popup-btn`) — the panel is closed via Chrome chrome, not an in-UI dismiss.
   - Review autosave-on-blur logic tuned for popup focus loss; side panel stays open while editing the page.

4. **Docs & tests**
   - Update README “Option B” from popup to side panel.
   - Add manual test cases in `TESTS.md` for open/close, tab switch while panel open, fill from panel.

#### Phase 2 — Side-panel UX improvements

- **Context header:** show active tab URL / matched context name (like Tag Assistant’s “connected page”).
- **Live tab sync:** refresh Fill stats and context when user switches tabs (listen to `chrome.tabs.onActivated` / `onUpdated`).
- **Better vertical use:** expandable rule rows, sticky Fill action bar at bottom of panel.
- **Optional:** keyboard shortcut to toggle panel (`chrome.commands`).

#### Phase 3 — Tag Assistant–inspired enhancements (optional)

- Highlight on page which selectors match when hovering a rule in the panel.
- Inline “pick element” mode from Fields tab without closing the panel.
- Badge on extension icon when current page has matching rules.

### Architecture notes

| Approach | Pros | Cons |
|----------|------|------|
| **Chrome Side Panel API** (recommended) | Native docked UI, persists while interacting with page, same extension context as today | Chrome 114+ only; needs background SW |
| Injected iframe in content script | Works on older Chrome | Feels hacky, z-index/focus issues, not “native” |
| DevTools panel | Good for dev tools | Wrong UX for end users filling forms |

**Why Side Panel fits AutoForm Filler:** users configure rules while looking at the page; a popup closes on outside click and is size-limited. Tag Assistant uses the same pattern — panel stays open beside the page.

**Files touched (Phase 1):** `manifest.json`, new `background.js`, `sidepanel.html`, `app-core.js` (from popup logic), `README.md`, `TESTS.md`, `CHANGELOG.md` (on ship).

### Testing & Risk

- **Chrome version:** Side Panel requires Chrome 114+; document in README.
- **Tab messaging:** `getActiveTab()` + `sendMessage` must still target the browsed tab, not the panel — verify after migration.
- **Focus / autosave:** popup blur autosave may fire differently; regression-test Custom tab edits.
- **Floating button:** ensure it still works independently of panel open state.
- Link to `TESTS.md` regression checklist after UI shell lands.

### Release Checklist

- [x] Phase 1 implemented and smoke-tested (pending manual pass).
- [x] Version bumped to **1.4.0** (MINOR — UI/entry-point change).
- [x] README updated to match behavior.
- [x] Relevant test checklists reviewed/updated.
- [ ] Extension reloaded and smoke tested in Chrome 114+.

## Version TBD

### Goals
- TBD – define high-level goals for this version.

### Features / Changes
- TBD – list planned features, fixes, and refactors.

### Testing & Risk
- TBD – call out risky areas and link to `TESTS.md` sections.

### Release Checklist
- [ ] Version bumped and Build workflow executed.
- [ ] README updated to match behavior.
- [ ] Relevant test checklists reviewed/updated.
- [ ] Extension reloaded and smoke tested in Chrome.
