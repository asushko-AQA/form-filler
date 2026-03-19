## Manual Test Coverage for AutoForm Filler

This document describes **manual test coverage** for the current AutoForm Filler Chrome extension. It focuses on end‑to‑end behavior in the popup, injected page UI, and form‑filling logic driven by **explicit custom selector rules** (with `data-automation-id` used only for discovery, not for guessing values).

## Popup – Fill Tab

### Feature: Popup Header Version Badge

Short description: The popup header badge shows the current extension version from `manifest.json` (e.g. `v1.2.0`) and is non-clickable.

- [ ] With the extension loaded, open the popup and verify that the header version badge text matches `v<version>` where `<version>` is the `version` value from `manifest.json`.
- [ ] Change the `version` in `manifest.json`, reload the extension in `chrome://extensions`, reopen the popup, and verify the header badge updates to show the new `v<version>` value.
- [ ] Click the version badge in the popup header and confirm that nothing happens (no navigation, no new tabs, and no visible state change apart from normal focus behavior).

### Feature: Fill Form from Popup

Short description: Trigger a fill run for the active tab using the popup `Fill Form Now` button and show summary stats, based solely on configured custom selector rules.

- [ ] On a page where you have configured several custom selector rules (including text fields and select‑like widgets), open the popup and click **Fill Form Now**; verify that only fields covered by those rules are populated and that no unrelated fields are touched.
- [ ] After a successful fill, verify that **Filled**, **Skipped**, and **Total** counters in the popup show non‑placeholder numeric values that roughly match the visible fields.
- [ ] On a page with **no** matching `data-automation-id` fields, click **Fill Form Now** and verify that the stats show either `0` filled or special markers and do not crash the popup.
- [ ] Confirm that repeated clicks on **Fill Form Now** continue to work without UI freezing, and stats update each time.
- [ ] Verify that the fill button shows a temporary “Filling…” state (disabled) and returns to its normal label/icon afterward.

### Feature: Fill Entry Point Hint

Short description: The Fill tab hints that a floating Auto Fill button may be injected on the page.

- [ ] Open the popup on a page where custom selectors are configured (see Custom Rules feature) and confirm the hint text mentions the floating Auto Fill button in the bottom‑right corner.
- [ ] On a fresh install or a page where no context config exists, confirm the hint text is still present and does not contradict actual behavior (mark specifics as **TBD** during first test run).

## Popup – Fields Tab

### Feature: Attribute‑Based Field Scan

Short description: Search the active page for fields by attribute name/value and display a list of detected candidates.

- [ ] On a page with known `data-automation-id` attributes, set “Search property” to `data-automation-id`, leave the value filter blank, click **Search fields**, and verify that a list of items appears instead of the empty state.
- [ ] For at least one item, verify that the label shows the attribute name/value and the tag (e.g. `<input>`), and that long values are truncated but still visible via tooltip.
- [ ] Change the attribute to `id` and set a value filter that matches a subset of elements; click **Search fields** and confirm only expected elements appear.
- [ ] Use a value filter that matches **no** elements and verify the **No matching fields found** empty state is displayed.

### Feature: Known vs Unknown Field Classification

Short description: Detected fields are visually classified as “known” or “unknown” based on heuristics (e.g. `firstName`, `email`).

- [ ] On a form with typical user fields (first name, last name, email, phone, address), run **Search fields** using `data-automation-id` and confirm that obvious user fields show a “known” indicator (colored dot) while unrelated IDs are marked as “unknown”.
- [ ] Verify that adding a field with a clearly unrelated ID (e.g. `fileUploadButton`) appears as “unknown” in the list.

### Feature: Bridge from Fields Tab to Custom Rules

Short description: Clicking a field in the scan results opens or updates a custom selector rule in the Custom tab.

- [ ] From the Fields tab, run a search, then click a detected field item; verify that the popup switches to the **Custom** tab.
- [ ] Confirm that a new custom rule row is created or updated with a selector matching the clicked field.
- [ ] After the bridge, verify that the selector input is focused and visible, and that any previous error message for that rule is cleared.

## Popup – Custom Tab: Selector Rules

### Feature: Custom Selector Rules CRUD

Short description: Manage a list of custom CSS selector rules with value templates and per‑rule options.

- [ ] Click **+ Add selector rule** and verify that a new rule row appears with empty selector and value template fields.
- [ ] Enter a valid CSS selector for a typable input and a simple value template (e.g. `testValue`), click **Save Custom Setup**, and confirm no validation errors are shown.
- [ ] Use the ellipsis **Options** menu on a rule to **Duplicate** it and confirm a new rule row appears with identical selector/value.
- [ ] Use **Delete** on a rule and verify it disappears from the list and is not included in subsequent saves.
- [ ] Switch modes between “type” and “select” (where available) and confirm the visual state of the rule row updates accordingly (icon/title) without errors.

### Feature: Active/Inactive Rule Editing Flow

Short description: Only one rule is editable (active) at a time; others are read‑only and visually inactive.

- [ ] With multiple rules present, enter edit mode on one rule (e.g. via **Edit** in the menu) and verify the rule appears active (expanded) while others are visually inactive and read‑only.
- [ ] Attempt to type into a selector field of an inactive rule and confirm that it remains read‑only.
- [ ] After saving, confirm that all rules return to the inactive state and that subsequent edits require explicit activation again.

### Feature: Selector Validation and Uniqueness

Short description: Rules are validated for non‑empty selectors, non‑empty value templates, uniqueness, and page‑level correctness via `Verify`.

- [ ] For an active rule with an empty selector, click **Save Custom Setup** and confirm a validation error appears (e.g. “Selector is empty”) and save is blocked.
- [ ] For an active rule with a selector but empty value template, click **Save Custom Setup** and confirm a validation error appears and save is blocked.
- [ ] Create two rules with the same selector and run **Verify** on the second rule; confirm a “Selector already exists” style error is shown.
- [ ] Enter an invalid CSS selector (e.g. `[data-automation-id=` without closing bracket) and run **Verify**; confirm an error like “Invalid selector syntax” is reported.
- [ ] Use **Verify** on a selector that matches multiple elements and confirm the error explains that multiple elements were found and the selector is not unique.
- [ ] Use **Verify** on a selector that points at a non‑typable element (e.g. a button) and confirm a specific “not typable” error is shown.

### Feature: Per‑Context Saving of Custom Rules

Short description: Saving custom rules persists them per URL (without hash) using Chrome sync storage.

- [ ] On Page A, define at least one custom rule and click **Save Custom Setup**; close and reopen the popup on the same page and verify the rule is restored.
- [ ] Open a different page (Page B) with a different URL, open the popup, and confirm that Page A’s rules are **not** shown by default.
- [ ] On Page B, create different rules, save them, then switch back to Page A and verify that Page A’s rules are still intact and independent.
- [ ] On a single‑page application where the URL hash changes but the base URL remains the same, confirm that rules are shared across hash‑only navigations (TBD: confirm exact expected behavior).

### Feature: Context URL Matching Modes

Short description: Contexts can be matched using strict or weak URL pattern modes (`exact`, `prefix`, `wildcard`, `pathSegmentWildcard`).

- [ ] In Custom tab, confirm the **Context URL pattern** section is collapsed by default and can be expanded/collapsed like **Custom rules** and **Custom vars**.
- [ ] With the section expanded, confirm the pattern input auto-grows to fit multiple lines and does not show a resize-handle artifact in the bottom-right.
- [ ] In Custom tab, set pattern to `my-site.com/*` with **Wildcard** mode, save rules, then verify they apply on `my-site.com/home`, `my-site.com/sign-in`, and `my-site.com/cart?prodId=ZX121`.
- [ ] Set pattern to `my-site.com/users/*/data` with **Path segment wildcard** mode and verify it matches `my-site.com/users/11/data` but does not match `my-site.com/users/11/extra/data`.
- [ ] Set **Exact (strict)** mode with a fully specific URL and verify that only that exact URL context is applied.
- [ ] Confirm hash-only URL changes (e.g. `#sectionA` to `#sectionB`) do not break context matching.
- [ ] Export a config and verify the JSON includes `pattern` and `matchMode`; import it back and verify the same matching behavior is restored.

## Popup – Custom Tab: Variables and Templates

### Feature: Built‑In and Custom Variables

Short description: Support built‑in variables (`randomFirstName`, `randomLastName`, `timestamp`) and user‑defined custom variables.

- [ ] Open the Custom tab and confirm that pills or suggestions for at least the built‑in variables (`randomFirstName`, `randomLastName`, `timestamp`) are available even before adding custom vars.
- [ ] Add a new custom variable with type **Manual value**, set a name and value, save, and verify that it appears in the variables list.
- [ ] Add a new custom variable with type **Random first name** and confirm that its value does not need manual input.
- [ ] After saving, ensure that built‑in variables remain available and that custom variables are merged without duplicate keys.

### Feature: Variable Pills and `{{var}}` Insertion

Short description: Insert variable placeholders into a template by clicking variable pills or via inline suggestions.

- [ ] Focus a rule’s **Value template** input and click a variable pill; confirm the placeholder in the form `{{varName}}` is inserted at the caret position.
- [ ] Type `{{` in a value template field and confirm a small suggestion box appears listing available variable keys.
- [ ] Select a variable from the suggestion box and verify the last `{{` is replaced with the full `{{varName}}` placeholder.
- [ ] Ensure that clicking outside the suggestion box closes it and does not corrupt the template text.

### Feature: Value Template Application at Fill Time

Short description: Custom selector rules use templates and variable values to build final strings at fill time.

- [ ] Define a custom rule whose value template uses a manual variable (e.g. `user_{{userId}}`) and confirm that the filled value on the page replaces `{{userId}}` with the configured manual value.
- [ ] Define a custom rule whose value template uses `{{timestamp}}` and verify that repeated fills produce different, reasonable timestamp suffixes.
- [ ] Define custom variables of type **Random first name** and **Random last name**, use them in a template, and confirm the filled value looks like a plausible name combination.

## Custom Tab – Save, Close, and Autosave Behavior

### Feature: Save Button Behavior and Toast

Short description: Explicit saves persist custom rules/vars and show a success message.

- [ ] With valid custom rules and variables configured, click **Save Custom Setup** and confirm a short success toast appears (e.g. “Custom rules saved”) and then fades away.
- [ ] After saving, close and reopen the popup on the same page and verify all rules and variables are restored and function as expected when filling.

### Feature: Unsaved Changes Close Confirmation

Short description: Closing the popup with unsaved changes prompts the user to save, discard, or cancel.

- [ ] Modify an existing rule or variable without saving and click **Close**; verify that a confirmation panel appears asking whether to Save & Close, Leave without saving, or Cancel.
- [ ] Choose **Cancel** and confirm the popup remains open and unsaved changes are still present.
- [ ] Choose **Leave without saving** and confirm the popup closes; when reopened, verify that previously saved values (not the unsaved edits) are shown.
- [ ] Choose **Save & Close** and confirm changes are persisted and restored on the next open.

### Feature: Autosave on Blur (Custom Tab)

Short description: Under safe conditions, leaving the Custom tab triggers an autosave of valid changes.

- [ ] With a fully completed rule and variable configuration (no empty required fields), switch focus away from the popup (e.g. click into the page) and verify changes are saved without explicitly clicking **Save Custom Setup** (TBD: confirm exact trigger timing).
- [ ] Start editing a new variable but leave its key or value empty, then blur the popup; confirm that autosave **does not** run while the variable is incomplete.
- [ ] With an active rule that has validation errors, blur the popup and confirm those errors prevent autosave; no partial or invalid configuration should be saved.

## Injected Page UI and Form Filling

### Feature: Floating Auto Fill Button Injection

Short description: Inject a floating Auto Fill button on pages that have context configurations and a ready DOM.

- [ ] On a page where custom context configuration exists (custom selectors and/or vars), reload the page and verify that a floating **Auto Fill** button appears in the bottom‑right corner.
- [ ] Confirm the button styling is modern (gradient, rounded) and remains visible above page content due to a high `z-index`.
- [ ] Interact with typical page elements (scrolling, hovering) and verify the button remains visible and responsive.
- [ ] On a page where no context configuration exists, reload and confirm that **no** floating Auto Fill button is injected.

### Feature: Auto Fill Button Click Behavior

Short description: Clicking the injected button runs the same custom‑rule fill logic and shows a toast summary.

- [ ] On a page where a context configuration exists (custom selectors/vars), click the floating **Auto Fill** button and verify that fields targeted by those rules are populated as expected and that other fields remain unchanged.
- [ ] Confirm a toast appears near the button summarizing how many fields were filled and skipped (e.g. “✅ X fields filled, Y skipped”).
- [ ] On a page with selectors but no matching elements (or unsupported elements), click the button and verify that the toast reports zero filled or a clear warning, without leaving the page in a broken state.
- [ ] Click the button multiple times and ensure subsequent runs continue to work and update the toast, with the button re‑enabled after each run.

### Feature: `data-automation-id` Discovery Only (no guessing)

Short description: `data-automation-id` is used to **discover** fields and build selectors, but filling itself is controlled only by custom selector rules.

- [ ] Using the Fields tab with `data-automation-id` as the search attribute, scan a page and confirm that results help you create or update custom selector rules in the Custom tab.
- [ ] Run a fill with **no custom rules configured**, even on a page rich in `data-automation-id` attributes, and verify that no fields are filled and the popup/toast clearly reports zero filled without errors.
- [ ] After adding custom rules derived from those attributes, run a fill again and confirm that only fields matched by your selectors are filled; fields that merely have `data-automation-id` but no corresponding rules remain unchanged.

### Feature: Phone Country Code Select‑Like Dropdowns

Short description: Select or select‑like widgets for phone country codes (e.g. flags + code, multiple `+1` options) are matched intelligently so the intended option is chosen.

- [ ] On a phone input that uses a separate country code dropdown with multiple `+1` entries (e.g. “United States (+1)”, “Canada (+1)”), run a fill and verify that:
  - The extension consistently selects the expected `+1` entry (e.g. preferring “United States (+1)” when the form or surrounding labels imply US).
  - The filled phone number value in the main input includes a plausible local number and the UI shows the correct flag/label for the chosen country.
- [ ] On a form with country codes other than `+1` (e.g. `+44`, `+91`), confirm that the dropdown selects the correct non‑`+1` option and the phone field is filled accordingly.
- [ ] On a select‑like widget implemented via custom HTML/ARIA (not a native `<select>`), verify that the extension still selects the correct country code option when configured via a custom selector rule in **select mode**.
- [ ] On a form where the country code dropdown is already pre‑selected, run a fill and confirm that:
  - The extension respects the existing selected country when filling the phone number, or
  - If it changes the country code, the resulting code + number combination is internally consistent.
- [ ] With devtools console open, run several fills across different phone country dropdown implementations and confirm logs show which country code option was matched and that no ambiguous `+1` matches are silently miscounted as filled when the wrong option is chosen (TBD: refine expected logging details).

### Feature: Supported and Unsupported Field Types

Short description: Fill only text‑like and select inputs; skip unsupported types gracefully.

- [ ] Confirm that standard text, email, password, and textarea inputs are filled correctly and fire input/change/blur events.
- [ ] Confirm that inputs of type `submit`, `button`, `reset`, `image`, `file`, `hidden`, `checkbox`, and `radio` are **not** modified and are counted as skipped where applicable.
- [ ] On a native `<select>` element with matching options, verify that an appropriate option is selected based on exact or partial text/value match.
- [ ] For custom React/ARIA select widgets, verify that custom selector rules with **select mode** can still select an appropriate option (where option roles exist).

### Feature: Staggered (Delayed) Field Filling

Short description: Field fills are staggered with small delays between individual operations to avoid interaction issues, while preserving correct final values and UX.

- [ ] On a typical multi‑field form (first/last name, email, phone, address, etc.), trigger a fill (popup or injected button) and visually confirm that fields appear to fill in sequence with a slight delay, but all expected fields end up correctly populated and the final **Filled/Skipped/Total** counts match the visible result.
- [ ] On a page with client‑side validation that fires on `input`/`change`/`blur`, run a fill and verify that:
  - No validation errors remain on required fields that the extension filled.
  - Any validation messages that appear while fields are filling resolve once the delayed filling completes.
- [ ] On a SPA form that dynamically mounts or enables later fields in response to earlier ones being filled, confirm that:
  - The delayed filling does not get “ahead” of the DOM (no attempts to fill fields that are not yet present).
  - Newly mounted fields that match known patterns or custom selectors are eventually filled once they appear, or are clearly counted as skipped with logging if they cannot be reached.
- [ ] While a fill is in progress, attempt light user interaction (scrolling, moving focus) and confirm there are no visible race conditions such as values being overwritten after manual edits, stalled toasts, or stuck loading states.
- [ ] Run repeated fills on the same page and confirm that delays do not accumulate or cause the popup/injected button to remain disabled after completion.

### Feature: Logging and Diagnostics (Console)

Short description: Log summary and per‑field details for **custom selector rules** to the browser console for debugging.

- [ ] After running a fill, open the browser DevTools console and confirm a collapsed group logs a summary with counts for custom selectors (e.g. “Custom selectors: filled X, skipped Y (with retry)”).
- [ ] Expand the log and verify a table shows each selector, the value used, and whether it was filled on first pass, second pass, or skipped after retry.

### Feature: Two‑Pass Custom Selector Filling

Short description: Custom selector rules are applied in two passes: a first pass that fills all reachable elements, followed by a second pass that retries only still‑empty fields; final failures are logged and counted as skipped.

#### First pass behavior

- [ ] Configure several custom selector rules, including:
  - At least one selector that matches a stable, always‑present field.
  - At least one selector whose element is temporarily disabled or not yet present at initial page load but becomes available after a short delay or user interaction.
  - At least one selector that intentionally points to a non‑typable or non‑existent element.
- [ ] Trigger a fill and, using devtools console logs, verify that the first pass:
  - Attempts each configured selector once.
  - Marks selectors whose elements are found and filled as **filled**.
  - Marks selectors with missing/untypable elements as candidates for retry or skipped, without crashing the run.

#### Second pass retry behavior

- [ ] On a form where one or more selector targets become available only after a small delay (e.g. fields that appear after an AJAX response), trigger a fill and confirm via console logs that:
  - Those selectors are re‑attempted in a second pass once their elements exist.
  - Fields that became reachable between passes are now filled and counted as **filled** in the final summary.
- [ ] Verify that selectors whose elements remain missing or untypable after the second pass are not retried indefinitely and do not block completion of the fill run.

#### Logging and skipped counts

- [ ] After a two‑pass run, expand the custom selector log group/table in the console and confirm it clearly indicates:
  - Which selectors were filled on the first pass vs. second pass (TBD: exact labels/columns).
  - Which selectors failed after both passes, along with reasons (e.g. “element not found”, “element not typable”).
- [ ] Confirm that selectors that fail even after the second pass are:
  - Counted as **skipped** in the popup and injected toast summaries.
  - Included in the total selector count so the user can reconcile the numbers.
- [ ] Trigger fills from both the popup and the injected Auto Fill button and verify that both entry points await the full two‑pass process before showing final **Filled/Skipped/Total** counts and re‑enabling their UI controls.

## Import/Export and Storage Behavior

### Feature: Export Context Configuration as JSON

Short description: Download a JSON file containing custom selectors and variables for the current context.

- [ ] Configure at least one custom selector and one custom variable, then click **Download JSON**; verify that a file named like `autoform-config.json` is downloaded.
- [ ] Open the downloaded file and confirm it contains `customSelectors` and `customVars` arrays with the expected values.

### Feature: Import Context Configuration from JSON

Short description: Upload a JSON file to replace the current context’s custom selectors and variables.

- [ ] Start from a clean state, click **Upload JSON**, select a previously exported `autoform-config.json`, and confirm that rules and variables are rendered to match the file.
- [ ] Modify the imported JSON to add or remove rules and variables, import again, and verify the popup reflects the new configuration.
- [ ] Attempt to import blatantly invalid JSON (e.g. a text file); confirm that parsing failures are handled gracefully (e.g. console error, input reset) and the existing configuration is not silently corrupted.

### Feature: Chrome Sync Storage Scope

Short description: Use `chrome.storage.sync` to persist configs across browser restarts and machines (subject to Chrome sync).

- [ ] After saving custom rules/vars for a context, restart the browser and revisit the same URL; verify that the configuration is restored from sync storage.
- [ ] (If Chrome account sync is enabled) Install the extension on a second profile/machine, sign into the same account, and verify that saved configurations appear there as well (TBD depending on sync setup).

## Regression Checklist – Form Filling Core

Use this checklist when making changes to core form‑filling logic in `content.js` (including timing, selector handling, and matching heuristics).

- [ ] Phone country code dropdowns:
  - [ ] Multiple `+1` options still resolve to the expected entry and do not silently switch to an unintended country.
  - [ ] Non‑`+1` codes (`+44`, `+91`, etc.) are matched correctly in both native `<select>` and custom select‑like widgets.
- [ ] Delayed/staggered filling:
  - [ ] All previously supported field types still end up filled correctly despite per‑field delays.
  - [ ] SPA/validation flows that depend on field events continue to work and do not show persistent errors after a fill.
  - [ ] Popup and injected button remain responsive and show accurate final **Filled/Skipped/Total** counts.
- [ ] Two‑pass custom selector fill:
  - [ ] First pass still fills all straightforward, reachable custom selector targets.
  - [ ] Second pass reliably retries only initially empty fields that remain present and can now be filled.
  - [ ] Final failures are logged with selectors/reasons and are counted as **skipped**, not silently ignored or mis‑counted as filled.

## Tester Rules

- **Keep coverage aligned with code and UI**: When features or flows change in `popup.html`, `popup.js`, `content.js`, or `manifest.json`, update or add the corresponding feature sections and checklists in this document.
- **Update existing cases before adding new ones**: When users report confusion about a test, prefer clarifying or refining the existing checklist items instead of adding near‑duplicates.
- **Mark uncertainty as `TBD`**: If expected behavior is unclear from the implementation or UX, annotate checklist items or notes with `TBD` rather than guessing; revisit and refine once behavior is confirmed.
- **Group tests logically**: Add new features under the most relevant group (e.g. Popup tabs, Custom rules, Injected UI, Storage) and maintain concise, action‑oriented checklists.
- **Avoid implementation detail coupling**: Write tests in terms of user‑visible behavior (button labels, visible outcomes) rather than internal function names, so tests remain stable as code is refactored.

