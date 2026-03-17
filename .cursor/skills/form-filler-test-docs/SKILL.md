---
name: form-filler-test-docs
description: >
  Designs and updates manual test documentation and checklists for the form-filler
  Chrome extension, used when the user requests test plans, regression checklists,
  or improvements to TESTS.md and other test-related Markdown docs.
---

﻿# Form Filler Test Docs (Overview)

## When to use this skill

Use this overview skill whenever the main agent needs help with **manual test documentation** for the form-filler extension, including:

- The user asks to **add or refine test cases** for a new or existing feature.
- The user mentions or edits `TESTS.md` or other `.md` files that clearly contain **test plans or checklists**.
- A change to `popup.html`, `popup.js`, `content.js`, or related files adds or modifies a feature and the user wants **how-to-test notes**.
- A bug fix is implemented and the user wants a **targeted regression checklist**.
- The user asks for **testing guidance** (what to test, edge cases, regressions) rather than implementation code.
- The main agent needs to ensure **test docs match current behavior** after a feature change.

If the request is about **writing, updating, or organizing manual test docs in Markdown**, delegate to this overview skill, then route to one of the more focused testing skills:

- `testing-smoke` – quick smoke checks.
- `testing-regression` – regression checklist around core filling behavior.
- `testing-feature` – patterns/templates for feature-specific tests.

This keeps each testing concern in a smaller, focused skill while preserving a single entry point.

## Instructions

- **Identify relevant test docs**
  - **Search first** for existing Markdown test docs:
    - Start with `TESTS.md`.
    - Look for other `*.md` files whose names suggest testing, regression, or QA.
  - **Read** these files to understand:
    - Existing structure (sections, headings, checklists).
    - How features and flows are currently described.
    - Any existing notes on known issues or TBD behavior.

- **Decide: update vs. create**
  - **Update existing docs** when:
    - The feature/change clearly belongs under an existing section (e.g. popup behaviors, content script behavior, autofill rules).
    - There is already a related checklist or scenario list that can be extended or clarified.
    - A bug fix modifies behavior already covered by tests (update expected results and add regression bullets).
  - **Create a new doc** (under `.cursor/skills/` or alongside `TESTS.md` only when explicitly requested) when:
    - The user explicitly asks for a **separate test plan file** for a specific area.
    - The scope is large and focused (e.g. “full manual test plan for onboarding flow”) and would clutter `TESTS.md`.
    - The project evolves a dedicated testing area (e.g. “performance testing” or “cross-browser matrix”) that is logically independent.

- **Delegate to the tester agent**
  - When the task involves **structuring or refining test docs**, route it to this tester skill to:
    - Draft **concise, action-oriented checklists** for features or bug fixes.
    - Add or refine sections such as **Scope, Preconditions, Test Cases, Regression Areas**.
    - Capture **expected vs. observed behavior** when the user provides details.
  - The tester agent will:
    - Work **only in Markdown** and avoid editing implementation code.
    - Keep wording aligned with how the extension is described in this project (form filling, popup UI, content script behavior).
    - Prefer clear bullet lists and checklists over narrative prose.

- **Keep docs aligned with real behavior**
  - Base expectations on:
    - The user’s description of the feature or bug fix.
    - Any notes from implementation agents about **current actual behavior** and constraints.
  - Avoid inventing functionality; if behavior is not specified:
    - Mark it as **`TBD`** or **“to confirm”** instead of guessing.
  - Ensure each test case:
    - States **what to do** (steps) and **what to verify** (visible UI, stored data, etc.).
    - Is scoped to realistic user interactions in the popup or target webpages.

- **Style and structure**
  - Use:
    - `##` and `###` headings to organize features and flows.
    - `- [ ]` checklists for actionable test items.
    - Short, imperative phrasing (e.g. “Open popup and verify…”, “Fill form and confirm…”).
  - Avoid:
    - Overly verbose explanations.
    - Duplicating identical steps across many checklists; factor shared steps into **Preconditions** or a shared section when helpful.

## Templates

### New feature test checklist (snippet)

Use this as a starting point when documenting tests for a new feature in the form-filler extension:

```markdown
## Feature: <short feature name>

### Scope
- <one-line description of what this feature does in the extension>

### Preconditions
- Extension is installed and enabled.
- Browser: <e.g. Chrome stable version>.
- Test page: `<URL or description of form/page>`.

### Test Cases
- [ ] Basic happy path works as expected.
- [ ] Error/edge conditions are handled gracefully.
- [ ] Existing related behaviors are not broken (regression).

### Detailed checklist
- [ ] Open the popup on a page with a supported form and verify the feature is visible and enabled.
- [ ] Perform the main action (e.g. autofill, save profile, edit field) and verify the expected field values and UI state.
- [ ] Try with missing/partial form data and verify error messages or fallback behavior.
- [ ] Reload the page and re-open the popup to verify state persistence or reset behavior is correct.
- [ ] If applicable, test with multiple different forms/pages and confirm consistent behavior.
```

You can embed and adapt this snippet inside `TESTS.md` or another test doc section for the relevant feature.

## Maintenance rules

- **Prefer editing over duplicating**
  - When a feature’s behavior changes, **update the existing test cases** that describe it instead of adding nearly identical new ones.
  - If two sections describe the same flow, consolidate or cross-reference them; avoid maintaining parallel, diverging checklists.

- **Clarify expectations, do not guess**
  - When expected behavior is unclear:
    - Explicitly mark items as **`TBD`** or “expected behavior to confirm”.
    - Keep steps and observations factual and tied to what is known.
  - Do not add speculative outcomes or hidden side effects.

- **Update tests whenever behavior changes**
  - After features or fixes in:
    - `popup.js` (popup logic, buttons, settings).
    - `popup.html` (UI layout or labels).
    - `content.js` (form detection, field mapping, autofill logic).
  - Ensure the corresponding sections in `TESTS.md` (or other test docs) are:
    - Updated to match new flows and UI **once the new feature or fix is successfully integrated and working as intended**.
    - Expanded with **regression bullets** for fixed bugs (e.g. “should no longer overwrite existing values”, “should not autofill read-only fields”).

- **Keep tests concise and focused**
  - Each test case should:
    - Focus on a single behavior or small group of related checks.
    - Use 1–5 concise steps.
  - Group related checks (e.g. different types of forms, different input field combinations) under a single heading with multiple checklist items.

- **Document known issues and edge cases**
  - When the user reports or confirms limitations:
    - Add a **Notes / Observed Issues** or **Known Limitations** subsection.
    - Clearly separate current bugs from expected, accepted behavior.
  - Where appropriate, add **follow-up test items** for when a fix is implemented.

- **Maintain consistency across docs**
  - Use similar heading names and structure across all test docs for this extension:
    - `## Scope`, `## Preconditions`, `## Test Cases`, `## Regression Areas`, `## Notes / Observed Issues`.
  - When creating new docs, align them with the structure and tone already used in `TESTS.md`.

