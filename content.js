// ──────────────────────────────────────────────
//  AutoForm Filler — content.js
// ──────────────────────────────────────────────

// ── Data generators ──────────────────────────

const FIRST_NAMES = [
  "Alice", "Bob", "Carol", "David", "Emma", "Frank", "Grace", "Henry", "Iris", "James",
  "Karen", "Liam", "Mia", "Noah", "Olivia", "Paul", "Quinn", "Rachel", "Samuel", "Tina",
  "Umar", "Vera", "Walter", "Xena", "Yara", "Zachary", "Amanda", "Brian", "Chloe", "Derek",
  "Elaine", "Felix", "Gina", "Harold", "Ingrid", "Jake", "Kara", "Louis", "Monica", "Nathan",
  "Ophelia", "Peter", "Queenie", "Rita", "Scott", "Teresa", "Uma", "Victor", "Wendy", "Xavier",
  "Yvonne", "Zoe", "Aaron", "Bella", "Charles", "Diana", "Ethan", "Fiona", "George", "Hannah",
];
const LAST_NAMES  = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor",
  "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Moore", "Young", "Allen",
  "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson",
  "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans",
  "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Sanchez",
  "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Cooper", "Richardson", "Cox",
];
const DOMAINS     = ["gmail.com", "yahoo.com", "outlook.com", "example.com", "testmail.dev"];
const STREETS     = ["Main St", "Oak Ave", "Maple Blvd", "Cedar Ln", "Pine Rd", "Elm Dr", "Park Way"];
const CITIES      = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio"];
const STATES      = ["NY", "CA", "IL", "TX", "AZ", "PA", "FL", "OH", "GA", "NC"];
const COMPANIES   = ["Acme Corp", "Globex Inc", "Initech", "Umbrella Ltd", "Stark Industries", "Wayne Enterprises"];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDigits = (n) => Array.from({ length: n }, () => randInt(0, 9)).join("");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Template helpers ───────────────────────────

function formatTimestamp(now) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function buildCustomVarValues(defs) {
  const values = {};
  let list = Array.isArray(defs) ? defs.slice() : [];

  // Ensure built-in variables are always available
  const ensureBuiltin = (key, type) => {
    if (!list.some(d => d && (d.key || "").trim() === key)) {
      list.push({ key, type, value: "" });
    }
  };

  ensureBuiltin("randomFirstName", "randomFirstName");
  ensureBuiltin("randomLastName", "randomLastName");
  ensureBuiltin("timestamp", "timestamp");

  const now = new Date();
  const ts = formatTimestamp(now);

  list.forEach((def) => {
    if (!def) return;
    const key = (def.key || "").trim();
    if (!key) return;

    switch (def.type) {
      case "randomFirstName":
        values[key] = rand(FIRST_NAMES);
        break;
      case "randomLastName":
        values[key] = rand(LAST_NAMES);
        break;
      case "timestamp":
        values[key] = ts;
        break;
      case "manual":
      default:
        values[key] = def.value || "";
        break;
    }
  });

  return values;
}

function applyTemplate(str, customValues = {}) {
  if (!str || typeof str !== "string") return str;

  let result = str;

  result = result.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(customValues, key)) {
      return customValues[key];
    }
    return match;
  });

  return result;
}

// ── Keyword matcher ───────────────────────────
// Maps patterns found in data-automation-id to profile fields.

function matchAutomationId(id, profile) {
  const s = id.toLowerCase();

  // Name
  if (/first.?name|firstname|fname|given.?name/.test(s)) return profile.firstName;
  if (/last.?name|lastname|lname|sur.?name|family.?name/.test(s)) return profile.lastName;
  if (/\bname\b/.test(s) && !/user|file|company|org/.test(s))     return `${profile.firstName} ${profile.lastName}`;

  // Contact
  if (/email|e-mail/.test(s))           return profile.email;
  if (/phone|mobile|cell|tel/.test(s))  return profile.phone;

  // Auth
  if (/username|user.?name|login|handle/.test(s)) return profile.username;
  if (/password|passwd|pwd/.test(s))              return profile.password;
  if (/confirm.?pass|repeat.?pass|retype.?pass|verify.?pass/.test(s)) return profile.password;

  // Address
  if (/address|street|addr/.test(s))    return profile.street;
  if (/city/.test(s))                   return profile.city;
  if (/state|province|region/.test(s))  return profile.state;
  if (/zip|postal|postcode/.test(s))    return profile.zip;
  if (/country/.test(s))                return "United States";

  // Personal extras
  if (/company|organization|org|employer/.test(s)) return profile.company;
  if (/birth.?date|dob|date.?of.?birth/.test(s))   return profile.dob;

  return null; // unrecognised — skip
}

// ── Field filler ──────────────────────────────

function nativeInputSetter(el, value) {
  // Trigger React / Angular / Vue synthetic events
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeInputValueSetter) nativeInputValueSetter.call(el, value);

  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur",   { bubbles: true }));
}

function fillField(el, value) {
  if (!value) return false;

  const tag = el.tagName.toLowerCase();

  if (tag === "input" || tag === "textarea") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (["submit", "button", "reset", "image", "file", "hidden", "checkbox", "radio"].includes(type)) return false;
    el.focus();
    nativeInputSetter(el, value);
    return true;
  }

  if (tag === "select") {
    // Try exact match, then partial
    const opts = Array.from(el.options);
    let match = opts.find(o => o.value === value || o.text === value)
              || opts.find(o => o.value.toLowerCase().includes(value.toLowerCase()) || o.text.toLowerCase().includes(value.toLowerCase()));
    if (match) {
      el.value = match.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  return false;
}

// ── Custom selector filler ─────────────────────

function triggerOptionSelection(optionEl) {
  if (!optionEl) return;

  const events = ["mousedown", "mouseup", "click"];
  events.forEach((type) => {
    const evt = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    optionEl.dispatchEvent(evt);
  });
}

function normalizeText(str) {
  if (str == null) return "";
  return String(str)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function tokenizeForMatch(str) {
  const norm = normalizeText(str);
  if (!norm) return [];
  return norm.split(/[()\-,\s]+/).filter(Boolean);
}

function scoreOptionCandidate(candidate, normSearch, index) {
  const { rawText, normText, rawValue, normValue } = candidate;

  let tier = null;

  if (normValue && normValue === normSearch) {
    tier = 0;
  } else if (normText && normText === normSearch) {
    tier = 1;
  } else {
    const textTokens = tokenizeForMatch(rawText);
    const valueTokens = tokenizeForMatch(rawValue);
    const inTokens =
      textTokens.includes(normSearch) || valueTokens.includes(normSearch);
    if (inTokens) {
      tier = 2;
    } else if (
      (normValue && normValue.startsWith(normSearch)) ||
      (normText && normText.startsWith(normSearch))
    ) {
      tier = 3;
    } else if (
      (normValue && normValue.includes(normSearch)) ||
      (normText && normText.includes(normSearch))
    ) {
      tier = 4;
    }
  }

  if (tier === null) return null;

  const lengthText =
    typeof rawText === "string" && rawText.length > 0
      ? rawText.length
      : Number.POSITIVE_INFINITY;
  const lengthValue =
    typeof rawValue === "string" && rawValue.length > 0
      ? rawValue.length
      : Number.POSITIVE_INFINITY;

  return { tier, lengthText, lengthValue, index };
}

function pickBestOption(optionElements, search) {
  const normSearch = normalizeText(search);
  if (!normSearch) return null;

  const scored = [];

  optionElements.forEach((el, index) => {
    const rawText = el.textContent || "";
    const rawValue = el.getAttribute && el.getAttribute("value");
    const normText = normalizeText(rawText);
    const normValue = normalizeText(rawValue);

    const candidate = { rawText, normText, rawValue, normValue };
    const score = scoreOptionCandidate(candidate, normSearch, index);
    if (score) {
      scored.push({ el, ...score });
    }
  });

  if (!scored.length) return null;

  let best = scored[0];
  for (let i = 1; i < scored.length; i++) {
    const cur = scored[i];
    if (cur.tier !== best.tier) {
      if (cur.tier < best.tier) best = cur;
      continue;
    }
    if (cur.lengthText !== best.lengthText) {
      if (cur.lengthText < best.lengthText) best = cur;
      continue;
    }
    if (cur.lengthValue !== best.lengthValue) {
      if (cur.lengthValue < best.lengthValue) best = cur;
      continue;
    }
    if (cur.index < best.index) {
      best = cur;
    }
  }

  return best.el;
}

function fillSelectLikeField(el, value) {
  if (!value) return false;

  let inputEl = el;
  if (!inputEl || inputEl.tagName !== "INPUT") {
    inputEl = el.querySelector && el.querySelector("input");
  }
  if (!inputEl) return false;

  inputEl.focus();
  inputEl.click();
  nativeInputSetter(inputEl, value);

  // Prefer options within the listbox controlled by this input, if any
  const listboxId = inputEl.getAttribute("aria-controls");
  let root = document;
  if (listboxId) {
    const listbox = document.getElementById(listboxId);
    if (listbox) {
      root = listbox;
    }
  }

  let options = Array.from(root.querySelectorAll("[role=\"option\"]"));

  // If nothing was found in the scoped root, fall back to the whole document
  if (!options.length && root !== document) {
    options = Array.from(document.querySelectorAll("[role=\"option\"]"));
  }

  if (!options.length) {
    options = Array.from(document.querySelectorAll(".react-select__option, .Select-option"));
  }

  let match = pickBestOption(options, value);

  if (!match && options.length) {
    // Fallback to legacy includes-based behavior if no scored match is found.
    const lower = String(value).toLowerCase();
    match = options.find((opt) => {
      const text = (opt.textContent || "").toLowerCase();
      return text.includes(lower);
    });
  }

  if (match) {
    triggerOptionSelection(match);
    return true;
  }

  if (console && typeof console.debug === "function") {
    console.debug("[AutoForm] Select-mode: no matching option found", {
      value,
      scopedToListbox: !!listboxId && root !== document,
      totalOptions: options.length,
    });
  }

  return false;
}

async function fillCustomSelectors(rules, customValues) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { filled: 0, skipped: 0, log: [] };
  }

  let filled = 0;
  let skipped = 0;
  const log = [];
  const retryQueue = [];

  for (const rule of rules) {
    if (!rule || !rule.selector || !rule.valueTemplate) return;

    const mode = rule.mode === "select" ? "select" : "type";
    const value = applyTemplate(rule.valueTemplate, customValues || {});
    const elements = document.querySelectorAll(rule.selector);

    for (const el of elements) {
      await delay(30);
      let ok = false;
      if (mode === "select") {
        ok = fillSelectLikeField(el, value);
        if (!ok) {
          // fall back to normal input fill
          ok = fillField(el, value);
        }
      } else {
        ok = fillField(el, value);
      }
      if (ok) {
        filled++;
        log.push({ selector: rule.selector, value, status: "filled-first-pass" });
      } else {
        retryQueue.push({ rule, el, value });
        log.push({ selector: rule.selector, value, status: "pending-retry" });
      }
    }
  }

  // Second attempt: only for elements still present and effectively empty.
  const finalFailures = [];

  for (const item of retryQueue) {
    const { rule, el, value } = item;
    if (!document.contains(el)) {
      finalFailures.push({ rule, el, value, reason: "element-removed" });
      continue;
    }

    const tag = el.tagName && el.tagName.toLowerCase();
    let currentVal = "";
    if (tag === "input" || tag === "textarea" || tag === "select") {
      currentVal = el.value || "";
    }
    if (currentVal) {
      // Already got filled by page logic or other automation.
      log.push({ selector: rule.selector, value, status: "already-filled-before-retry" });
      continue;
    }

    await delay(30);

    let ok = false;
    const mode = rule.mode === "select" ? "select" : "type";
    if (mode === "select") {
      ok = fillSelectLikeField(el, value);
      if (!ok) {
        ok = fillField(el, value);
      }
    } else {
      ok = fillField(el, value);
    }

    if (ok) {
      filled++;
      log.push({ selector: rule.selector, value, status: "filled-second-pass" });
    } else {
      finalFailures.push({ rule, el, value, reason: "unsupported-element-after-retry" });
      log.push({ selector: rule.selector, value, status: "skipped-after-retry" });
    }
  }

  skipped = finalFailures.length;

  if (finalFailures.length) {
    console.warn("[AutoForm] Some custom fields could not be filled even after retry", {
      failedCount: finalFailures.length,
      failures: finalFailures.map((f) => ({
        selector: f.rule && f.rule.selector,
        value: f.value,
        reason: f.reason,
      })),
    });
  }

  if (log.length) {
    console.groupCollapsed(`[AutoForm] Custom selectors: filled ${filled}, skipped ${skipped} (with retry)`);
    console.table(log);
    console.groupEnd();
  }

  return { filled, skipped, log };
}

// ── Main fill logic ───────────────────────────

async function fillForm(_overrides = {}) {
  // Legacy API kept for backward compatibility. All automatic guessing
  // based on data-automation-id has been disabled; only custom selectors
  // are used for filling now.
  return { filled: 0, skipped: 0, total: 0, profile: {} };
}

// ── Injected UI button ────────────────────────

function injectButton() {
  if (document.getElementById("autoform-btn-wrap")) return;

  const wrap = document.createElement("div");
  wrap.id = "autoform-btn-wrap";
  wrap.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    font-family: 'Segoe UI', system-ui, sans-serif;
  `;

  // Toast element
  const toast = document.createElement("div");
  toast.style.cssText = `
    background: #1a1a2e;
    color: #e0e0e0;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.5;
    max-width: 240px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.25s, transform 0.25s;
    pointer-events: none;
  `;
  wrap.appendChild(toast);

  // Main button
  const btn = document.createElement("button");
  btn.id = "autoform-fill-btn";
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
    <span>Auto Fill</span>
  `;
  btn.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #6c63ff, #48bfe3);
    color: #fff;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.5);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    letter-spacing: 0.3px;
  `;

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.05)";
    btn.style.boxShadow = "0 6px 28px rgba(108,99,255,0.65)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 4px 20px rgba(108,99,255,0.5)";
  });

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.style.opacity = "0.7";

    // Pull custom selectors and vars from storage if any, for this page context
    StorageContext.getStorageContexts().then((entries) => {
      (async () => {
        const ctx = ContextMatcher.pickBestContextEntry(entries, window.location.href) || {};
        const customSelectors = Array.isArray(ctx.customSelectors) ? ctx.customSelectors : [];
        const customVars = Array.isArray(ctx.customVars) ? ctx.customVars : [];
        const customValues = buildCustomVarValues(customVars);
        const resultCustom = await fillCustomSelectors(customSelectors, customValues);

        const filled = resultCustom.filled;
        const skipped = resultCustom.skipped;
        const total = filled + skipped;

        // Show toast
        toast.innerHTML = filled > 0
          ? `✅ <strong>${filled}</strong> field${filled > 1 ? "s" : ""} filled<br><span style="opacity:0.6;font-size:11px">${skipped} skipped</span>`
          : `⚠️ No matching fields found.<br><span style="opacity:0.6;font-size:11px">Check selectors and rules</span>`;
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";

        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(8px)";
        }, 3500);

        setTimeout(() => {
          btn.disabled = false;
          btn.style.opacity = "1";
        }, 1000);
      })();
    });
  });

  wrap.appendChild(btn);
  document.body.appendChild(wrap);
}

// ── Observer: re-inject if DOM changes (SPAs) ─

function shouldShowInjectedButton(entriesOrStorage) {
  const entries = Array.isArray(entriesOrStorage)
    ? entriesOrStorage
    : ContextMatcher.normalizeStoredContexts(entriesOrStorage || {});
  const ctx = ContextMatcher.pickBestContextEntry(entries, window.location.href);
  if (!ctx) return false;
  const hasSelectors = Array.isArray(ctx.customSelectors) && ctx.customSelectors.length > 0;
  const hasVars = Array.isArray(ctx.customVars) && ctx.customVars.length > 0;
  return hasSelectors || hasVars;
}

function waitForBody() {
  if (document.body) {
    StorageContext.getStorageContexts().then((entries) => {
      if (shouldShowInjectedButton(entries)) {
        injectButton();
        // Re-check on SPA navigation
        const obs = new MutationObserver(() => {
          if (!document.getElementById("autoform-btn-wrap")) {
            StorageContext.getStorageContexts().then((entries2) => {
              if (shouldShowInjectedButton(entries2)) {
                injectButton();
              }
            });
          }
        });
        obs.observe(document.body, { childList: true, subtree: false });
      }
    });
  } else {
    setTimeout(waitForBody, 100);
  }
}

waitForBody();

function escapeCssAttrValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ── Message bridge (from popup) ───────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "fill") {
    (async () => {
      const customSelectors = msg.customSelectors || [];
      const customVars = msg.customVars || [];
      const customValues = buildCustomVarValues(customVars);

      const resultCustom = await fillCustomSelectors(customSelectors, customValues);

      const filled = resultCustom.filled;
      const skipped = resultCustom.skipped;
      const total = filled + skipped;

      sendResponse({ filled, skipped, total });
    })();
  }
  if (msg.action === "verifySelector") {
    const selector = msg.selector;
    if (!selector || typeof selector !== "string") {
      sendResponse({ ok: false, reason: "empty_selector" });
      return true;
    }

    try {
      const elements = document.querySelectorAll(selector);
      const count = elements.length;
      if (count === 0) {
        sendResponse({ ok: false, reason: "not_found", count: 0 });
        return true;
      }
      if (count > 1) {
        sendResponse({ ok: false, reason: "not_unique", count });
        return true;
      }

      const el = elements[0];
      const tag = el.tagName.toLowerCase();
      let typable = false;

      if (tag === "input" || tag === "textarea") {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        typable = !["submit", "button", "reset", "image", "file", "hidden", "checkbox", "radio"].includes(type);
      } else if (tag === "select") {
        typable = true;
      }

      if (!typable) {
        sendResponse({ ok: false, reason: "not_typable", count: 1, tag });
        return true;
      }

      sendResponse({ ok: true, reason: null, count: 1, tag });
    } catch (e) {
      sendResponse({ ok: false, reason: "invalid_selector", error: String(e) });
    }
    return true;
  }
  if (msg.action === "scan") {
    const attributeNameRaw = msg.attributeName || "data-automation-id";
    const attributeName =
      attributeNameRaw && typeof attributeNameRaw === "string"
        ? attributeNameRaw.trim()
        : "data-automation-id";
    const valueFilterRaw = msg.valueContains || msg.textContains || "";
    const valueFilter =
      typeof valueFilterRaw === "string"
        ? valueFilterRaw.trim().toLowerCase()
        : "";

    const allElements = Array.from(document.querySelectorAll("*"));
    const items = [];

    allElements.forEach((el) => {
      let attrValue = "";
      if (attributeName) {
        attrValue = el.getAttribute(attributeName) || "";
      }
      const text = (el.textContent || "").trim();

      if (!attrValue && !text) return;

      if (valueFilter) {
        const inAttr = attrValue.toLowerCase().includes(valueFilter);
        const inText = text.toLowerCase().includes(valueFilter);
        if (!inAttr && !inText) return;
      } else if (attributeName && !attrValue) {
        // When no value filter is provided, require the attribute to be present.
        return;
      }

      let selector = "";
      if (attributeName && attrValue) {
        selector = `[${attributeName}="${escapeCssAttrValue(attrValue)}"]`;
      } else {
        selector = el.tagName.toLowerCase();
      }

      const child =
        el.querySelector && el.querySelector("input, select, textarea");
      if (child) {
        selector += ` ${child.tagName.toLowerCase()}`;
      }

      items.push({
        id: attrValue || text || "",
        tag: el.tagName.toLowerCase(),
        attributeName,
        attributeValue: attrValue,
        textSnippet: text.slice(0, 120),
        selector,
      });
    });

    sendResponse({ ids: items });
  }
  return true; // keep channel open for async
});
