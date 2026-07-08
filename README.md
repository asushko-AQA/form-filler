# AutoForm Filler — Chrome Extension

A Chrome extension that fills web forms **only for fields you explicitly configure**.  
You define pairs of **CSS selector → value template**, and the extension fills just those fields under your control.

---

## 📦 Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **\"Load unpacked\"**
4. Select the `form-filler-extension` folder
5. The extension is now installed

---

## 🚀 How to Use

### Option A — Floating button on the page
If you have custom rules configured for the current page, a purple **\"Auto Fill\"** button appears in the bottom-right corner.  
Click it to run your rules and fill matching fields.

### Option B — Extension popup
Click the extension icon in Chrome's toolbar. The popup has three main areas:
- **Fill tab** → \"Fill Form Now\" button with **filled / skipped / total** stats for your custom rules.
- **Fields tab** → Scan the current page by attribute (e.g. `data-automation-id`) to discover candidate elements and quickly create rules from them.
- **Custom tab** → Define and manage your custom rules and variables.

The extension **does not guess values automatically**. It only fills selectors and templates you define.

---

## 🎯 Core Concept: Selector → Value Template

Each rule has:
- **Selector** – a CSS selector that targets one or more fields on the page  
  (for example: `[data-automation-id=\"email\"] input`, `input[name=\"phone\"]`, `#user-login`).
- **Value template** – the value to type or select, which can use variables.
- **Mode** – either:
  - `type` – type the value into an `<input>` / `<textarea>` / similar field.
  - `select` – choose an option from a select-like widget (including custom dropdowns).

When you press **Fill**, the content script:
1. Builds values for your variables.
2. Applies each rule in order.
3. For `select` mode, it tries to pick the best matching option text (e.g. for `\"+1\"` on a phone country dropdown).

If a field cannot be filled (unsupported element, no matching option, etc.), it is counted as **skipped** and reported in the stats/log.

---

## 🧩 Custom Variables

You can define reusable variables on the **Custom** tab and reference them in value templates using `{{variableName}}` syntax.

Built‑in variable types include:
- `randomFirstName` – random first name
- `randomLastName` – random last name
- `timestamp` – timestamp like `YYYYMMDDHHMMSS`

You can also create **manual** variables with fixed values (e.g. test email, company name).  
Example template:

```text
{{randomFirstName}} {{randomLastName}} ({{timestamp}})
```

Variables are expanded before filling, so each run can produce unique but structured data.

---

## 🔍 Discovering Fields (Fields Tab)

The **Fields** tab helps you find elements worth targeting:

- Choose an attribute (by default `data-automation-id`) and optional filter text.
- Click **Scan** to list matching elements on the current page.
- Click an item to create a new custom rule pre-populated with a selector for that element.

This scan is purely for **discovery and rule creation**.  
The extension no longer tries to infer or auto-map values based on attribute names.

---

## ⚙️ Behavior and Limitations

- The extension **never fills anything you have not configured** via custom rules.
- There is **no automatic guessing** from `data-automation-id`, `name`, labels, or other patterns.
- Complex select-like widgets (React Select, ARIA listboxes, phone country dropdowns, etc.) are supported via `select` mode, which chooses the best matching option text/value for your desired value.
- Filling runs twice for custom rules:
  - First pass attempts all matches.
  - Second pass retries still-empty fields that are still present in the DOM.
  - Persistent failures are logged to the DevTools console with selectors and reasons.

---

## 🛠 Technical Notes

- Works with **React, Angular, Vue** — uses native input value setters to trigger synthetic events.
- Handles `<input>`, `<textarea>`, `<select>`, and many select-like widgets (via ARIA roles and common CSS classes).
- Re-injects the floating button on SPA navigation (MutationObserver).
- All configuration (rules and variables) is persisted via `chrome.storage.local`, with one context entry per storage key. Existing data in `chrome.storage.sync` is migrated automatically on first read.

---

## 🤖 AI Orchestration & Workflows

This repo is configured for AI-assisted workflows in Cursor. The main agent acts as an **orchestrator**:

- **Think → Plan → Delegate**:
  - For non-trivial changes, the agent first restates the goal, then creates a short plan before editing, and finally delegates implementation to specialized subagents.
- **Key domain skills**:
  - `build-and-release` – guides the **Build** workflow (version bump, README update, changelog).
  - `iteration-planning` – guides **Plan iteration** tasks (future version, branch naming, `Plans.md` updates).
  - Testing skills:
    - `form-filler-test-docs` – overview for manual test docs.
    - `testing-smoke` – quick smoke checks.
    - `testing-regression` – core regression focus.
    - `testing-feature` – feature-level test templates.
- **Planning artefacts**:
  - `plan.md` – ephemeral working plan (ignored by git).
  - `Plans.md` – persistent iteration plan with versioned sections.

