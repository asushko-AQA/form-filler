// ── Tab switching ─────────────────────────────

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// ── Helpers ───────────────────────────────────

function getActiveTab() {
  return new Promise((res) =>
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => res(tab))
  );
}

function getContextKeyFromUrl(url) {
  if (!url) return "";
  // Normalize by stripping hash fragments
  return url.split("#")[0];
}

async function sendToContent(msg) {
  const tab = await getActiveTab();
  return new Promise((res) =>
    chrome.tabs.sendMessage(tab.id, msg, (resp) => res(resp))
  );
}

let lastFocusedTemplateInput = null;
let customVarsCache = [];
let varSuggestBox = null;
let currentActiveRuleRow = null;
let lastSavedStateToken = null;
let isReorderMode = false;

const DEFAULT_CUSTOM_VARS = [
  { key: "randomFirstName", type: "randomFirstName", value: "" },
  { key: "randomLastName", type: "randomLastName", value: "" },
  { key: "timestamp", type: "timestamp", value: "" },
];

function hideAllOptionMenus() {
  const menus = document.querySelectorAll(".options-menu");
  menus.forEach((m) => {
    m.style.display = "none";
  });
}

function setReorderMode(on) {
  isReorderMode = !!on;
  const body = document.body;
  if (body) {
    body.classList.toggle("reorder-mode", isReorderMode);
  }

  const addBtn = document.getElementById("add-custom-rule-btn");
  if (addBtn) addBtn.style.display = isReorderMode ? "none" : "";

  const varsTitle = document.getElementById("section-custom-vars-title");
  const varsBody = document.getElementById("custom-vars-body");
  if (varsTitle) varsTitle.style.display = isReorderMode ? "none" : "";
  if (varsBody) {
    // Keep vars collapsed semantics simple: hide entire group while reordering.
    varsBody.style.display = isReorderMode ? "none" : varsBody.style.display;
  }

  const rows = document.querySelectorAll(".custom-rule");
  rows.forEach((row) => {
    const handle = row.querySelector(".options-handle");
    if (handle) {
      handle.draggable = isReorderMode;
    }
  });
}

function getDragAfterElement(container, y) {
  const elements = Array.from(
    container.querySelectorAll(".custom-rule:not(.dragging)")
  );
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

  elements.forEach((el) => {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: el };
    }
  });

  return closest.element;
}

function createCustomRuleRow(rule, container) {
  const wrap = document.createElement("div");
  wrap.className = "config-group custom-rule";
  wrap.style.position = "relative";
  wrap.draggable = true;

  const mode = rule.mode === "select" ? "select" : "type";
  wrap.dataset.mode = mode;
  wrap.dataset.active = "false";
  wrap.classList.add("custom-rule-inactive");

  const selectorInput = document.createElement("input");
  selectorInput.className = "config-input custom-selector";
  selectorInput.placeholder = "CSS selector (e.g. [data-automation-id='userName'] input)";
  selectorInput.value = rule.selector || "";
  selectorInput.style.width = "calc(100% - 30px)";

  const valueInput = document.createElement("input");
  valueInput.className = "config-input custom-value";
  valueInput.style.marginTop = "6px";
  valueInput.placeholder = "Value template";
  valueInput.value = rule.valueTemplate || "";
  valueInput.style.width = "calc(100% - 30px)";

  const errorDiv = document.createElement("div");
  errorDiv.className = "selector-error";
  errorDiv.style.marginTop = "4px";
  errorDiv.style.fontSize = "11px";
  errorDiv.style.color = "#f97373";
  errorDiv.style.display = "none";

  const modeBtn = document.createElement("button");
  modeBtn.type = "button";
  modeBtn.className = "selector-mode-btn";
  modeBtn.style.position = "absolute";
  modeBtn.style.top = "28px";
  modeBtn.style.right = "4px";
  modeBtn.style.width = "20px";
  modeBtn.style.height = "20px";
  modeBtn.style.borderRadius = "50%";
  modeBtn.style.border = "1px solid var(--border)";
  modeBtn.style.background = "transparent";
  modeBtn.style.color = "var(--muted)";
  modeBtn.style.cursor = "pointer";
  modeBtn.style.display = "flex";
  modeBtn.style.alignItems = "center";
  modeBtn.style.justifyContent = "center";

  const applyModeState = (m) => {
    wrap.dataset.mode = m;
    if (m === "select") {
      modeBtn.textContent = "▾";
      modeBtn.title = "Mode: select from dropdown";
    } else {
      modeBtn.textContent = "✎";
      modeBtn.title = "Mode: type into input";
    }
  };
  applyModeState(mode);

  modeBtn.addEventListener("click", () => {
    const current = wrap.dataset.mode === "select" ? "select" : "type";
    const next = current === "type" ? "select" : "type";
    applyModeState(next);
  });

  const moreBtn = document.createElement("button");
  moreBtn.type = "button";
  moreBtn.textContent = "⋮";
  moreBtn.title = "Options";
  moreBtn.classList.add("options-handle");
  moreBtn.style.position = "absolute";
  moreBtn.style.top = "4px";
  moreBtn.style.right = "4px";
  moreBtn.style.width = "20px";
  moreBtn.style.height = "20px";
  moreBtn.style.borderRadius = "50%";
  moreBtn.style.border = "1px solid var(--border)";
  moreBtn.style.background = "transparent";
  moreBtn.style.color = "var(--muted)";
  moreBtn.style.cursor = "pointer";
  moreBtn.style.display = "flex";
  moreBtn.style.alignItems = "center";
  moreBtn.style.justifyContent = "center";

  const menu = document.createElement("div");
  menu.className = "options-menu";
  menu.style.position = "absolute";
  menu.style.top = "4px";
  menu.style.right = "24px";
  menu.style.marginTop = "0";
  menu.style.zIndex = "50";
  menu.style.background = "#1a1a2e";
  menu.style.border = "1px solid var(--border)";
  menu.style.borderRadius = "6px";
  menu.style.padding = "4px 0";
  menu.style.fontSize = "11px";
  menu.style.minWidth = "80px";
  menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
  menu.style.display = "none";

  const editItem = document.createElement("div");
  editItem.textContent = "Edit";
  editItem.style.padding = "4px 10px";
  editItem.style.cursor = "pointer";
  editItem.addEventListener("mouseenter", () => {
    editItem.style.background = "rgba(255,255,255,0.06)";
  });
  editItem.addEventListener("mouseleave", () => {
    editItem.style.background = "transparent";
  });
  editItem.addEventListener("click", () => {
    setActiveRuleRow(wrap);
    menu.style.display = "none";
    selectorInput.focus();
  });

  const duplicateItem = document.createElement("div");
  duplicateItem.textContent = "Duplicate";
  duplicateItem.style.padding = "4px 10px";
  duplicateItem.style.cursor = "pointer";
  duplicateItem.addEventListener("mouseenter", () => {
    duplicateItem.style.background = "rgba(255,255,255,0.06)";
  });
  duplicateItem.addEventListener("mouseleave", () => {
    duplicateItem.style.background = "transparent";
  });
  duplicateItem.addEventListener("click", () => {
    const newRule = {
      selector: selectorInput.value,
      valueTemplate: valueInput.value,
      mode: wrap.dataset.mode || "type",
    };
    const newRow = createCustomRuleRow(newRule, container);
    container.insertBefore(newRow, wrap.nextSibling);
    menu.style.display = "none";
    saveCustomSetup(false);
  });

  const verifyItem = document.createElement("div");
  verifyItem.textContent = "Verify";
  verifyItem.style.padding = "4px 10px";
  verifyItem.style.cursor = "pointer";
  verifyItem.addEventListener("mouseenter", () => {
    verifyItem.style.background = "rgba(255,255,255,0.06)";
  });
  verifyItem.addEventListener("mouseleave", () => {
    verifyItem.style.background = "transparent";
  });
  verifyItem.addEventListener("click", () => {
    verifySelectorField(selectorInput, errorDiv);
    menu.style.display = "none";
  });

  const reorderItem = document.createElement("div");
  reorderItem.textContent = "Reorder";
  reorderItem.style.padding = "4px 10px";
  reorderItem.style.cursor = "pointer";
  reorderItem.addEventListener("mouseenter", () => {
    reorderItem.style.background = "rgba(255,255,255,0.06)";
  });
  reorderItem.addEventListener("mouseleave", () => {
    reorderItem.style.background = "transparent";
  });
  reorderItem.addEventListener("click", () => {
    setReorderMode(true);
    menu.style.display = "none";
  });

  const deleteItem = document.createElement("div");
  deleteItem.textContent = "Delete";
  deleteItem.style.padding = "4px 10px";
  deleteItem.style.cursor = "pointer";
  deleteItem.style.color = "#f97373";
  deleteItem.addEventListener("mouseenter", () => {
    deleteItem.style.background = "rgba(255,255,255,0.06)";
  });
  deleteItem.addEventListener("mouseleave", () => {
    deleteItem.style.background = "transparent";
  });
  deleteItem.addEventListener("click", () => {
    wrap.remove();
    menu.style.display = "none";
    saveCustomSetup(false);
  });

  menu.appendChild(editItem);
  menu.appendChild(reorderItem);
  menu.appendChild(duplicateItem);
  menu.appendChild(verifyItem);
  menu.appendChild(deleteItem);

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isReorderMode) {
      // In reorder mode this acts purely as a drag handle.
      return;
    }
    const willOpen = menu.style.display === "none" || menu.style.display === "";
    hideAllOptionMenus();
    if (willOpen) menu.style.display = "block";
  });

  wrap.appendChild(selectorInput);
  wrap.appendChild(valueInput);
  wrap.appendChild(errorDiv);
  wrap.appendChild(modeBtn);
  wrap.appendChild(moreBtn);
  wrap.appendChild(menu);

  // Drag-and-drop reordering (activated only in reorder mode)
  wrap.addEventListener("dragstart", (e) => {
    if (!isReorderMode) {
      e.preventDefault();
      return;
    }
    const handle = wrap.querySelector(".options-handle");
    if (handle && !handle.contains(e.target)) {
      e.preventDefault();
      return;
    }
    wrap.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    }
  });

  wrap.addEventListener("dragend", () => {
    wrap.classList.remove("dragging");
    const parent = wrap.parentElement;
    if (parent) {
      parent
        .querySelectorAll(".custom-rule.drop-before")
        .forEach((el) => el.classList.remove("drop-before"));
    }
  });

  if (container && !container.dataset.dndBound) {
    container.dataset.dndBound = "true";
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!isReorderMode) return;
      const dragging = container.querySelector(".custom-rule.dragging");
      if (!dragging) return;
      const afterElement = getDragAfterElement(container, e.clientY);
      container
        .querySelectorAll(".custom-rule.drop-before")
        .forEach((el) => el.classList.remove("drop-before"));
      if (!afterElement) {
        container.appendChild(dragging);
      } else {
        afterElement.classList.add("drop-before");
        container.insertBefore(dragging, afterElement);
      }
    });
  }

  return wrap;
}

function expandCustomRulesSection() {
  const body = document.getElementById("custom-rules-body");
  const indicator = document.getElementById("toggle-custom-rules-indicator");
  if (!body || !indicator) return;
  body.style.display = "";
  indicator.textContent = "▾";
}

function clearActiveRuleRow() {
  const rows = document.querySelectorAll(".custom-rule");
  rows.forEach((row) => {
    row.dataset.active = "false";
    row.classList.remove("custom-rule-active");
    row.classList.add("custom-rule-inactive");
    const sel = row.querySelector(".custom-selector");
    const val = row.querySelector(".custom-value");
    const modeBtn = row.querySelector(".selector-mode-btn");
    if (sel) sel.setAttribute("readonly", "readonly");
    if (val) val.style.display = "none";
    if (modeBtn) modeBtn.style.display = "none";
  });
  currentActiveRuleRow = null;
}

function setActiveRuleRow(row) {
  if (!row) {
    clearActiveRuleRow();
    return;
  }
  const rows = document.querySelectorAll(".custom-rule");
  rows.forEach((r) => {
    const isActive = r === row;
    r.dataset.active = isActive ? "true" : "false";
    if (isActive) {
      r.classList.add("custom-rule-active");
      r.classList.remove("custom-rule-inactive");
    } else {
      r.classList.remove("custom-rule-active");
      r.classList.add("custom-rule-inactive");
    }
    const sel = r.querySelector(".custom-selector");
    const val = r.querySelector(".custom-value");
    const modeBtn = r.querySelector(".selector-mode-btn");
    if (sel) {
      if (isActive) sel.removeAttribute("readonly");
      else sel.setAttribute("readonly", "readonly");
    }
    if (val) {
      if (isActive) val.style.display = "";
      else val.style.display = "none";
    }
    if (modeBtn) {
      if (isActive) modeBtn.style.display = "flex";
      else modeBtn.style.display = "none";
    }
  });
  currentActiveRuleRow = row;
}

function renderCustomRules(rules) {
  const container = document.getElementById("custom-rules-container");
  if (!container) return;

  container.innerHTML = "";

  if (!rules || rules.length === 0) {
    rules = [{ selector: "", valueTemplate: "", mode: "type" }];
  }

  const createRuleRow = (rule) => {
    const wrap = document.createElement("div");
    wrap.className = "config-group custom-rule";
    wrap.style.position = "relative";

    const mode = rule.mode === "select" ? "select" : "type";
    wrap.dataset.mode = mode;
    wrap.dataset.active = "false";
    wrap.classList.add("custom-rule-inactive");

    const selectorInput = document.createElement("input");
    selectorInput.className = "config-input custom-selector";
    selectorInput.placeholder = "CSS selector (e.g. [data-automation-id='userName'] input)";
    selectorInput.value = rule.selector || "";
    selectorInput.style.width = "calc(100% - 30px)";

    const valueInput = document.createElement("input");
    valueInput.className = "config-input custom-value";
    valueInput.style.marginTop = "6px";
    valueInput.placeholder = "Value template";
    valueInput.value = rule.valueTemplate || "";
    valueInput.style.width = "calc(100% - 30px)";

    const errorDiv = document.createElement("div");
    errorDiv.className = "selector-error";
    errorDiv.style.marginTop = "4px";
    errorDiv.style.fontSize = "11px";
    errorDiv.style.color = "#f97373";
    errorDiv.style.display = "none";

    const modeBtn = document.createElement("button");
    modeBtn.type = "button";
    modeBtn.className = "selector-mode-btn";
    modeBtn.style.position = "absolute";
    modeBtn.style.top = "28px";
    modeBtn.style.right = "4px";
    modeBtn.style.width = "20px";
    modeBtn.style.height = "20px";
    modeBtn.style.borderRadius = "50%";
    modeBtn.style.border = "1px solid var(--border)";
    modeBtn.style.background = "transparent";
    modeBtn.style.color = "var(--muted)";
    modeBtn.style.cursor = "pointer";
    modeBtn.style.display = "flex";
    modeBtn.style.alignItems = "center";
    modeBtn.style.justifyContent = "center";

    const applyModeState = (m) => {
      wrap.dataset.mode = m;
      if (m === "select") {
        modeBtn.textContent = "▾";
        modeBtn.title = "Mode: select from dropdown";
      } else {
        modeBtn.textContent = "✎";
        modeBtn.title = "Mode: type into input";
      }
    };
    applyModeState(mode);

    modeBtn.addEventListener("click", () => {
      const current = wrap.dataset.mode === "select" ? "select" : "type";
      const next = current === "type" ? "select" : "type";
      applyModeState(next);
    });

    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.textContent = "⋮";
    moreBtn.title = "Options";
    moreBtn.style.position = "absolute";
    moreBtn.style.top = "4px";
    moreBtn.style.right = "4px";
    moreBtn.style.width = "20px";
    moreBtn.style.height = "20px";
    moreBtn.style.borderRadius = "50%";
    moreBtn.style.border = "1px solid var(--border)";
    moreBtn.style.background = "transparent";
    moreBtn.style.color = "var(--muted)";
    moreBtn.style.cursor = "pointer";
    moreBtn.style.display = "flex";
    moreBtn.style.alignItems = "center";
    moreBtn.style.justifyContent = "center";

    const menu = document.createElement("div");
    menu.className = "options-menu";
    menu.style.position = "absolute";
    menu.style.top = "4px";
    menu.style.right = "24px";
    menu.style.marginTop = "0";
    menu.style.zIndex = "50";
    menu.style.background = "#1a1a2e";
    menu.style.border = "1px solid var(--border)";
    menu.style.borderRadius = "6px";
    menu.style.padding = "4px 0";
    menu.style.fontSize = "11px";
    menu.style.minWidth = "80px";
    menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
    menu.style.display = "none";

    const editItem = document.createElement("div");
    editItem.textContent = "Edit";
    editItem.style.padding = "4px 10px";
    editItem.style.cursor = "pointer";
    editItem.addEventListener("mouseenter", () => {
      editItem.style.background = "rgba(255,255,255,0.06)";
    });
    editItem.addEventListener("mouseleave", () => {
      editItem.style.background = "transparent";
    });
    editItem.addEventListener("click", () => {
      setActiveRuleRow(wrap);
      menu.style.display = "none";
      selectorInput.focus();
    });

    const duplicateItem = document.createElement("div");
    duplicateItem.textContent = "Duplicate";
    duplicateItem.style.padding = "4px 10px";
    duplicateItem.style.cursor = "pointer";
    duplicateItem.addEventListener("mouseenter", () => {
      duplicateItem.style.background = "rgba(255,255,255,0.06)";
    });
    duplicateItem.addEventListener("mouseleave", () => {
      duplicateItem.style.background = "transparent";
    });
    duplicateItem.addEventListener("click", () => {
      const newRule = {
        selector: selectorInput.value,
        valueTemplate: valueInput.value,
        mode: wrap.dataset.mode || "type",
      };
      const newRow = createRuleRow(newRule);
      container.insertBefore(newRow, wrap.nextSibling);
      menu.style.display = "none";
      saveCustomSetup(false);
    });

    const verifyItem = document.createElement("div");
    verifyItem.textContent = "Verify";
    verifyItem.style.padding = "4px 10px";
    verifyItem.style.cursor = "pointer";
    verifyItem.addEventListener("mouseenter", () => {
      verifyItem.style.background = "rgba(255,255,255,0.06)";
    });
    verifyItem.addEventListener("mouseleave", () => {
      verifyItem.style.background = "transparent";
    });
    verifyItem.addEventListener("click", () => {
      verifySelectorField(selectorInput, errorDiv);
      menu.style.display = "none";
    });

    const deleteItem = document.createElement("div");
    deleteItem.textContent = "Delete";
    deleteItem.style.padding = "4px 10px";
    deleteItem.style.cursor = "pointer";
    deleteItem.style.color = "#f97373";
    deleteItem.addEventListener("mouseenter", () => {
      deleteItem.style.background = "rgba(255,255,255,0.06)";
    });
    deleteItem.addEventListener("mouseleave", () => {
      deleteItem.style.background = "transparent";
    });
    deleteItem.addEventListener("click", () => {
      wrap.remove();
      menu.style.display = "none";
      saveCustomSetup(false);
    });

    menu.appendChild(editItem);
    menu.appendChild(duplicateItem);
    menu.appendChild(verifyItem);
    menu.appendChild(deleteItem);

    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.style.display === "none" || menu.style.display === "";
      hideAllOptionMenus();
      if (willOpen) menu.style.display = "block";
    });

    wrap.appendChild(selectorInput);
    wrap.appendChild(valueInput);
    wrap.appendChild(errorDiv);
    wrap.appendChild(modeBtn);
    wrap.appendChild(moreBtn);
    wrap.appendChild(menu);
    return wrap;
  };

  rules.forEach((rule) => {
    const row = createRuleRow(rule);
    container.appendChild(row);
  });
  // All rows start inactive; user must activate via Edit or Fields tab.
  clearActiveRuleRow();
}

function renderCustomVars(vars) {
  const container = document.getElementById("custom-vars-container");
  const pills = document.getElementById("custom-vars-pills");
  if (!container) return;

  container.innerHTML = "";
  if (pills) pills.innerHTML = "";

  const userVars = Array.isArray(vars) ? vars : [];

  // Merge built-in vars with user-defined ones for suggestions (user vars override by key)
  const mergedByKey = {};
  DEFAULT_CUSTOM_VARS.forEach((v) => {
    if (v && v.key) mergedByKey[v.key] = { ...v };
  });
  userVars.forEach((v) => {
    if (v && v.key) mergedByKey[v.key] = { ...v };
  });

  const mergedVars = Object.values(mergedByKey);
  customVarsCache = mergedVars;

  const typeLabel = (type) => {
    switch (type) {
      case "randomFirstName": return "Random first name";
      case "randomLastName":  return "Random last name";
      case "timestamp":       return "Timestamp";
      case "manual":
      default:                return "Manual value";
    }
  };

  // Rows: only user-defined vars (no defaults here)
  const rowsToRender = userVars.length ? userVars : [{ key: "", type: "manual", value: "" }];

  rowsToRender.forEach((v) => {
    const wrap = document.createElement("div");
    wrap.className = "config-group custom-var";
    wrap.style.position = "relative";

    const nameInput = document.createElement("input");
    nameInput.className = "config-input custom-var-key";
    nameInput.placeholder = "Variable name (e.g. userId)";
    nameInput.value = v.key || "";
    nameInput.style.width = "calc(100% - 28px)";

    const typeSelect = document.createElement("select");
    typeSelect.className = "config-input custom-var-type";
    typeSelect.innerHTML = `
      <option value="manual">Manual value</option>
      <option value="randomFirstName">Random first name</option>
      <option value="randomLastName">Random last name</option>
      <option value="timestamp">Timestamp</option>
    `;
    typeSelect.value = v.type || "manual";
    typeSelect.style.marginTop = "6px";
    typeSelect.style.width = "calc(100% - 28px)";

    const valueInput = document.createElement("input");
    valueInput.className = "config-input custom-var-value";
    valueInput.placeholder = "Manual value (for Manual type)";
    valueInput.style.marginTop = "6px";
    valueInput.value = v.value || "";
    valueInput.style.width = "calc(100% - 28px)";

    const updateVisibility = () => {
      valueInput.style.display = typeSelect.value === "manual" ? "block" : "none";
    };
    typeSelect.addEventListener("change", updateVisibility);
    updateVisibility();

    const valueError = document.createElement("div");
    valueError.className = "custom-var-error";
    valueError.style.marginTop = "4px";
    valueError.style.fontSize = "11px";
    valueError.style.color = "#f97373";
    valueError.style.display = "none";

    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.textContent = "⋮";
    moreBtn.title = "Options";
    moreBtn.style.position = "absolute";
    moreBtn.style.top = "4px";
    moreBtn.style.right = "4px";
    moreBtn.style.padding = "2px 4px";
    moreBtn.style.borderRadius = "999px";
    moreBtn.style.border = "none";
    moreBtn.style.background = "transparent";
    moreBtn.style.color = "var(--muted)";
    moreBtn.style.cursor = "pointer";

    const menu = document.createElement("div");
    menu.className = "options-menu";
    menu.style.position = "absolute";
    menu.style.top = "4px";
    menu.style.right = "24px";
    menu.style.marginTop = "0";
    menu.style.background = "#1a1a2e";
    menu.style.border = "1px solid var(--border)";
    menu.style.borderRadius = "6px";
    menu.style.padding = "4px 0";
    menu.style.fontSize = "11px";
    menu.style.minWidth = "80px";
    menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
    menu.style.display = "none";

    const duplicateItem = document.createElement("div");
    duplicateItem.textContent = "Duplicate";
    duplicateItem.style.padding = "4px 10px";
    duplicateItem.style.cursor = "pointer";
    duplicateItem.addEventListener("mouseenter", () => {
      duplicateItem.style.background = "rgba(255,255,255,0.06)";
    });
    duplicateItem.addEventListener("mouseleave", () => {
      duplicateItem.style.background = "transparent";
    });
    duplicateItem.addEventListener("click", () => {
      const container = document.getElementById("custom-vars-container");
      if (!container) return;
      const cloneWrap = document.createElement("div");
      cloneWrap.className = "config-group custom-var";
      cloneWrap.style.position = "relative";

      const keyInput = document.createElement("input");
      keyInput.className = "config-input custom-var-key";
      keyInput.placeholder = nameInput.placeholder;
      keyInput.value = nameInput.value;
      keyInput.style.width = "calc(100% - 28px)";

      const typeSel = document.createElement("select");
      typeSel.className = "config-input custom-var-type";
      typeSel.innerHTML = typeSelect.innerHTML;
      typeSel.value = typeSelect.value;
      typeSel.style.marginTop = "6px";
      typeSel.style.width = "calc(100% - 28px)";

      const valInput = document.createElement("input");
      valInput.className = "config-input custom-var-value";
      valInput.placeholder = valueInput.placeholder;
      valInput.value = valueInput.value;
      valInput.style.marginTop = "6px";
      valInput.style.width = "calc(100% - 28px)";

      const updateVis = () => {
        valInput.style.display = typeSel.value === "manual" ? "block" : "none";
      };
      typeSel.addEventListener("change", updateVis);
      updateVis();

      const errDiv = document.createElement("div");
      errDiv.className = "custom-var-error";
      errDiv.style.marginTop = "4px";
      errDiv.style.fontSize = "11px";
      errDiv.style.color = "#f97373";
      errDiv.style.display = "none";

      const more2 = moreBtn.cloneNode(true);
      const menu2 = menu.cloneNode(false);
      menu2.className = "options-menu";
      menu2.style.display = "none";

      const dup2 = duplicateItem.cloneNode(true);

      const del2 = document.createElement("div");
      del2.textContent = "Delete";
      del2.style.padding = "4px 10px";
      del2.style.cursor = "pointer";
      del2.style.color = "#f97373";
      del2.addEventListener("mouseenter", () => {
        del2.style.background = "rgba(255,255,255,0.06)";
      });
      del2.addEventListener("mouseleave", () => {
        del2.style.background = "transparent";
      });
      del2.addEventListener("click", () => {
        cloneWrap.remove();
        menu2.style.display = "none";
        saveCustomSetup(false);
      });

      menu2.appendChild(dup2);
      menu2.appendChild(del2);

      more2.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = menu2.style.display === "none" || menu2.style.display === "";
        hideAllOptionMenus();
        if (willOpen) menu2.style.display = "block";
      });

      cloneWrap.appendChild(keyInput);
      cloneWrap.appendChild(typeSel);
      cloneWrap.appendChild(valInput);
      cloneWrap.appendChild(errDiv);
      cloneWrap.appendChild(more2);
      cloneWrap.appendChild(menu2);
      container.insertBefore(cloneWrap, wrap.nextSibling);
      menu.style.display = "none";
      saveCustomSetup(false);
    });

    const deleteItem = document.createElement("div");
    deleteItem.textContent = "Delete";
    deleteItem.style.padding = "4px 10px";
    deleteItem.style.cursor = "pointer";
    deleteItem.style.color = "#f97373";
    deleteItem.addEventListener("mouseenter", () => {
      deleteItem.style.background = "rgba(255,255,255,0.06)";
    });
    deleteItem.addEventListener("mouseleave", () => {
      deleteItem.style.background = "transparent";
    });
    deleteItem.addEventListener("click", () => {
      wrap.remove();
      menu.style.display = "none";
      saveCustomSetup(false);
    });

    menu.appendChild(duplicateItem);
    menu.appendChild(deleteItem);

    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.style.display === "none" || menu.style.display === "";
      hideAllOptionMenus();
      if (willOpen) menu.style.display = "block";
    });

    wrap.appendChild(nameInput);
    wrap.appendChild(typeSelect);
    wrap.appendChild(valueInput);
    wrap.appendChild(valueError);
    wrap.appendChild(moreBtn);
    wrap.appendChild(menu);
    container.appendChild(wrap);

  });

  // Pills: all vars (defaults + custom), shown below fields
  if (pills) {
    mergedVars.forEach((v) => {
      const key = (v.key || "").trim();
      if (!key) return;
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "save-btn";
      pill.style.padding = "4px 8px";
      pill.style.fontSize = "10px";
      pill.style.borderRadius = "999px";
      pill.style.borderColor = "var(--border)";
      pill.textContent = key;
      pill.title = `{{${key}}} — ${typeLabel(v.type || "manual")}`;
      pill.addEventListener("click", () => {
        if (!lastFocusedTemplateInput) return;
        const input = lastFocusedTemplateInput;
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        const insert = `{{${key}}}`;
        input.value = `${before}${insert}${after}`;
        const caret = start + insert.length;
        input.focus();
        input.setSelectionRange(caret, caret);
      });
      pills.appendChild(pill);
    });
  }
}

// ── Fill button ───────────────────────────────

document.getElementById("popup-fill-btn").addEventListener("click", async () => {
  const btn = document.getElementById("popup-fill-btn");
  btn.disabled = true;
  btn.textContent = "Filling…";

  const stored = await new Promise(res => chrome.storage.sync.get(["fixedFields", "customSelectors", "customVars"], res));
  const overrides = stored.fixedFields || {};
  const customSelectors = stored.customSelectors || [];
  const customVars = stored.customVars || [];

  const result = await sendToContent({ action: "fill", overrides, customSelectors, customVars });

  if (result) {
    document.getElementById("stat-filled").textContent  = result.filled;
    document.getElementById("stat-skipped").textContent = result.skipped;
    document.getElementById("stat-total").textContent   = result.total;
  } else {
    document.getElementById("stat-filled").textContent  = "!";
    document.getElementById("stat-skipped").textContent = "!";
    document.getElementById("stat-total").textContent   = "?";
  }

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
    Fill Form Now`;
});

// ── Scan button (Fields tab advanced search) ──

let lastLinkedRuleRow = null;

function openOrUpdateLatestCustomRule(selector) {
  if (!selector) return;
  expandCustomRulesSection();
  const container = document.getElementById("custom-rules-container");
  if (!container) return;

  // Always create a NEW rule row synchronously for a Fields-tab click,
  // so we can immediately prefill its selector without racing against
  // async validation in the Add button handler.
  const newRule = { selector: "", valueTemplate: "", mode: "type" };
  const row = createCustomRuleRow(newRule, container);
  container.appendChild(row);

  lastLinkedRuleRow = row;
  setActiveRuleRow(row);

  const selectorInput = row.querySelector(".custom-selector");
  const errorDiv = row.querySelector(".selector-error");
  if (!selectorInput) return;

  selectorInput.value = selector;
  if (errorDiv) {
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
  }
  selectorInput.focus();
  if (row.scrollIntoView) {
    row.scrollIntoView({ block: "nearest" });
  }
}

function switchToCustomTab() {
  const tab = document.querySelector('.tab[data-tab="custom"]');
  if (tab) tab.click();
}

document.getElementById("scan-btn").addEventListener("click", async () => {
  const list = document.getElementById("field-list");
  const attrInput = document.getElementById("field-search-attr");
  const valueInput = document.getElementById("field-search-value");

  const attributeName =
    attrInput && attrInput.value.trim()
      ? attrInput.value.trim()
      : "data-automation-id";
  const valueFilter = valueInput && valueInput.value.trim()
    ? valueInput.value.trim()
    : "";

  const result = await sendToContent({
    action: "scan",
    attributeName,
    valueContains: valueFilter,
    textContains: valueFilter,
  });

  if (!result || !result.ids || result.ids.length === 0) {
    list.innerHTML = `<div class="empty-state">No matching fields found on this page</div>`;
    return;
  }

  const knownPatterns = [
    /first.?name|firstname|fname|given.?name/,
    /last.?name|lastname|lname|sur.?name/,
    /\bname\b/,
    /email|e-mail/,
    /phone|mobile|cell|tel/,
    /username|user.?name|login|handle/,
    /password|passwd|pwd/,
    /confirm.?pass|repeat.?pass/,
    /address|street|addr/,
    /city/,
    /state|province|region/,
    /zip|postal|postcode/,
    /country/,
    /company|organization|org|employer/,
    /birth.?date|dob|date.?of.?birth/,
  ];

  const isKnown = (id) => knownPatterns.some((p) => p.test(id.toLowerCase()));

  list.innerHTML = result.ids
    .map(({ id, attributeName: attrName, attributeValue, tag }) => {
      const label = attributeValue || id || "";
      const fullLabel = attrName ? `${attrName}=${label}` : label;
      const safeTitle = fullLabel.replace(/"/g, "&quot;");
      return `
        <div class="field-item">
          <div class="field-dot ${label && isKnown(label) ? "" : "unknown"}"></div>
          <div class="field-id" title="${safeTitle}">${fullLabel}</div>
          <div class="field-tag">&lt;${tag}&gt;</div>
        </div>
      `;
    })
    .join("");

  const items = Array.from(list.querySelectorAll(".field-item"));
  items.forEach((el, idx) => {
    const meta = result.ids[idx];
    el.addEventListener("click", () => {
      const selector = meta && meta.selector
        ? meta.selector
        : (meta.attributeName && meta.attributeValue
          ? `[${meta.attributeName}="${meta.attributeValue}"]`
          : "");
      if (!selector) return;
      switchToCustomTab();
      openOrUpdateLatestCustomRule(selector);
    });
  });
});

// ── Custom: load saved rules/vars for context ─

(async () => {
  const tab = await getActiveTab();
  const contextKey = getContextKeyFromUrl(tab && tab.url);

  chrome.storage.sync.get(["contextConfigs"], (res) => {
    const contexts = res.contextConfigs || {};
    const ctx = contexts[contextKey] || {};
    renderCustomRules(Array.isArray(ctx.customSelectors) ? ctx.customSelectors : []);
    renderCustomVars(Array.isArray(ctx.customVars) ? ctx.customVars : []);
    // Initialize saved state token from loaded data
    lastSavedStateToken = getCurrentStateToken();
  });
})();

// ── Custom selectors: add/save ────────────────

document.getElementById("add-custom-rule-btn").addEventListener("click", async () => {
  const container = document.getElementById("custom-rules-container");
  if (!container) return;

  // If there is an active rule under editing, require it to be valid before adding a new one.
  const { ok } = await validateActiveRule();
  if (!ok) return;

  const wrap = document.createElement("div");
  wrap.className = "config-group custom-rule";
  wrap.style.position = "relative";

  const selectorInput = document.createElement("input");
  selectorInput.className = "config-input custom-selector";
  selectorInput.placeholder = "CSS selector (e.g. [data-automation-id='userName'] input)";
  selectorInput.style.width = "calc(100% - 28px)";

  const valueInput = document.createElement("input");
  valueInput.className = "config-input custom-value";
  valueInput.style.marginTop = "6px";
  valueInput.placeholder = "Value template";
  valueInput.style.width = "calc(100% - 28px)";

  const errorDiv = document.createElement("div");
  errorDiv.className = "selector-error";
  errorDiv.style.marginTop = "4px";
  errorDiv.style.fontSize = "11px";
  errorDiv.style.color = "#f97373";
  errorDiv.style.display = "none";

  const moreBtn = document.createElement("button");
  moreBtn.type = "button";
  moreBtn.textContent = "⋮";
  moreBtn.title = "Options";
  moreBtn.style.position = "absolute";
  moreBtn.style.top = "4px";
  moreBtn.style.right = "4px";
  moreBtn.style.padding = "2px 4px";
  moreBtn.style.borderRadius = "999px";
  moreBtn.style.border = "none";
  moreBtn.style.background = "transparent";
  moreBtn.style.color = "var(--muted)";
  moreBtn.style.cursor = "pointer";

  const menu = document.createElement("div");
  menu.className = "options-menu";
  menu.style.position = "absolute";
  menu.style.top = "4px";
  menu.style.right = "24px";
  menu.style.marginTop = "0";
  menu.style.zIndex = "50";
  menu.style.background = "#1a1a2e";
  menu.style.border = "1px solid var(--border)";
  menu.style.borderRadius = "6px";
  menu.style.padding = "4px 0";
  menu.style.fontSize = "11px";
  menu.style.minWidth = "80px";
  menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
  menu.style.display = "none";

  const editItem = document.createElement("div");
  editItem.textContent = "Edit";
  editItem.style.padding = "4px 10px";
  editItem.style.cursor = "pointer";
  editItem.addEventListener("mouseenter", () => {
    editItem.style.background = "rgba(255,255,255,0.06)";
  });
  editItem.addEventListener("mouseleave", () => {
    editItem.style.background = "transparent";
  });
  editItem.addEventListener("click", () => {
    setActiveRuleRow(wrap);
    menu.style.display = "none";
    selectorInput.focus();
  });

  const duplicateItem = document.createElement("div");
  duplicateItem.textContent = "Duplicate";
  duplicateItem.style.padding = "4px 10px";
  duplicateItem.style.cursor = "pointer";
  duplicateItem.addEventListener("mouseenter", () => {
    duplicateItem.style.background = "rgba(255,255,255,0.06)";
  });
  duplicateItem.addEventListener("mouseleave", () => {
    duplicateItem.style.background = "transparent";
  });
  duplicateItem.addEventListener("click", () => {
    const container = document.getElementById("custom-rules-container");
    if (!container) return;
    const cloneWrap = document.createElement("div");
    cloneWrap.className = "config-group custom-rule";
    cloneWrap.style.position = "relative";

    const sel = document.createElement("input");
    sel.className = "config-input custom-selector";
    sel.placeholder = selectorInput.placeholder;
    sel.value = selectorInput.value;
    sel.style.width = "calc(100% - 28px)";

    const val = document.createElement("input");
    val.className = "config-input custom-value";
    val.style.marginTop = "6px";
    val.placeholder = valueInput.placeholder;
    val.value = valueInput.value;
    val.style.width = "calc(100% - 28px)";

    const err = document.createElement("div");
    err.className = "selector-error";
    err.style.marginTop = "4px";
    err.style.fontSize = "11px";
    err.style.color = "#f97373";
    err.style.display = "none";

    const more = moreBtn.cloneNode(true);
    const menuClone = menu.cloneNode(false);
    menuClone.className = "options-menu";
    menuClone.style.display = "none";

    const dupItem2 = duplicateItem.cloneNode(true);
    dupItem2.addEventListener("click", () => {
      saveCustomSetup(false);
    });

    const verifyItem2 = document.createElement("div");
    verifyItem2.textContent = "Verify";
    verifyItem2.style.padding = "4px 10px";
    verifyItem2.style.cursor = "pointer";
    verifyItem2.addEventListener("mouseenter", () => {
      verifyItem2.style.background = "rgba(255,255,255,0.06)";
    });
    verifyItem2.addEventListener("mouseleave", () => {
      verifyItem2.style.background = "transparent";
    });
    verifyItem2.addEventListener("click", () => {
      verifySelectorField(sel, err);
    });

    const delItem2 = document.createElement("div");
    delItem2.textContent = "Delete";
    delItem2.style.padding = "4px 10px";
    delItem2.style.cursor = "pointer";
    delItem2.style.color = "#f97373";
    delItem2.addEventListener("mouseenter", () => {
      delItem2.style.background = "rgba(255,255,255,0.06)";
    });
    delItem2.addEventListener("mouseleave", () => {
      delItem2.style.background = "transparent";
    });
    delItem2.addEventListener("click", () => {
      cloneWrap.remove();
      menuClone.style.display = "none";
      saveCustomSetup(false);
    });

    menuClone.appendChild(dupItem2);
    menuClone.appendChild(verifyItem2);
    menuClone.appendChild(delItem2);

    more.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menuClone.style.display === "none" || menuClone.style.display === "";
      hideAllOptionMenus();
      if (willOpen) menuClone.style.display = "block";
    });

    cloneWrap.appendChild(sel);
    cloneWrap.appendChild(val);
    cloneWrap.appendChild(err);
    cloneWrap.appendChild(more);
    cloneWrap.appendChild(menuClone);
    container.insertBefore(cloneWrap, wrap.nextSibling);
    menu.style.display = "none";
    saveCustomSetup(false);
  });

  const verifyItem = document.createElement("div");
  verifyItem.textContent = "Verify";
  verifyItem.style.padding = "4px 10px";
  verifyItem.style.cursor = "pointer";
  verifyItem.addEventListener("mouseenter", () => {
    verifyItem.style.background = "rgba(255,255,255,0.06)";
  });
  verifyItem.addEventListener("mouseleave", () => {
    verifyItem.style.background = "transparent";
  });
  verifyItem.addEventListener("click", () => {
    verifySelectorField(selectorInput, errorDiv);
    menu.style.display = "none";
  });

  const deleteItem = document.createElement("div");
  deleteItem.textContent = "Delete";
  deleteItem.style.padding = "4px 10px";
  deleteItem.style.cursor = "pointer";
  deleteItem.style.color = "#f97373";
  deleteItem.addEventListener("mouseenter", () => {
    deleteItem.style.background = "rgba(255,255,255,0.06)";
  });
  deleteItem.addEventListener("mouseleave", () => {
    deleteItem.style.background = "transparent";
  });
  deleteItem.addEventListener("click", () => {
    wrap.remove();
    menu.style.display = "none";
    saveCustomSetup(false);
  });

  menu.appendChild(editItem);
  menu.appendChild(duplicateItem);
  menu.appendChild(verifyItem);
  menu.appendChild(deleteItem);

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = menu.style.display === "none" || menu.style.display === "";
    hideAllOptionMenus();
    if (willOpen) menu.style.display = "block";
  });

  wrap.appendChild(selectorInput);
  wrap.appendChild(valueInput);
  wrap.appendChild(errorDiv);
  wrap.appendChild(moreBtn);
  wrap.appendChild(menu);
  container.appendChild(wrap);
  setActiveRuleRow(wrap);
});

document.getElementById("add-custom-var-btn").addEventListener("click", () => {
  const container = document.getElementById("custom-vars-container");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "config-group custom-var";
  wrap.style.position = "relative";

  const nameInput = document.createElement("input");
  nameInput.className = "config-input custom-var-key";
  nameInput.placeholder = "Variable name (e.g. userId)";
  nameInput.style.width = "calc(100% - 28px)";

  const typeSelect = document.createElement("select");
  typeSelect.className = "config-input custom-var-type";
  typeSelect.innerHTML = `
    <option value="manual">Manual value</option>
    <option value="randomFirstName">Random first name</option>
    <option value="randomLastName">Random last name</option>
    <option value="timestamp">Timestamp</option>
  `;
  typeSelect.style.marginTop = "6px";
  typeSelect.style.width = "calc(100% - 28px)";

  const valueInput = document.createElement("input");
  valueInput.className = "config-input custom-var-value";
  valueInput.placeholder = "Manual value (for Manual type)";
  valueInput.style.marginTop = "6px";
  valueInput.style.width = "calc(100% - 28px)";

  const updateVisibility = () => {
    valueInput.style.display = typeSelect.value === "manual" ? "block" : "none";
  };
  typeSelect.addEventListener("change", updateVisibility);
  updateVisibility();

  const errorDiv = document.createElement("div");
  errorDiv.className = "selector-error";
  errorDiv.style.marginTop = "4px";
  errorDiv.style.fontSize = "11px";
  errorDiv.style.color = "#f97373";
  errorDiv.style.display = "none";

  const moreBtn = document.createElement("button");
  moreBtn.type = "button";
  moreBtn.textContent = "⋮";
  moreBtn.title = "Options";
  moreBtn.style.position = "absolute";
  moreBtn.style.top = "4px";
  moreBtn.style.right = "4px";
  moreBtn.style.padding = "2px 4px";
  moreBtn.style.borderRadius = "999px";
  moreBtn.style.border = "none";
  moreBtn.style.background = "transparent";
  moreBtn.style.color = "var(--muted)";
  moreBtn.style.cursor = "pointer";

  const menu = document.createElement("div");
  menu.className = "options-menu";
  menu.style.position = "absolute";
  menu.style.top = "4px";
  menu.style.right = "24px";
  menu.style.marginTop = "0";
  menu.style.zIndex = "50";
  menu.style.background = "#1a1a2e";
  menu.style.border = "1px solid var(--border)";
  menu.style.borderRadius = "6px";
  menu.style.padding = "4px 0";
  menu.style.fontSize = "11px";
  menu.style.minWidth = "80px";
  menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
  menu.style.display = "none";
  const duplicateItem = document.createElement("div");
  duplicateItem.textContent = "Duplicate";
  duplicateItem.style.padding = "4px 10px";
  duplicateItem.style.cursor = "pointer";
  duplicateItem.addEventListener("mouseenter", () => {
    duplicateItem.style.background = "rgba(255,255,255,0.06)";
  });
  duplicateItem.addEventListener("mouseleave", () => {
    duplicateItem.style.background = "transparent";
  });
  duplicateItem.addEventListener("click", () => {
    const container = document.getElementById("custom-vars-container");
    if (!container) return;
    const cloneWrap = document.createElement("div");
    cloneWrap.className = "config-group custom-var";
    cloneWrap.style.position = "relative";

    const keyInput = document.createElement("input");
    keyInput.className = "config-input custom-var-key";
    keyInput.placeholder = nameInput.placeholder;
    keyInput.value = nameInput.value;
    keyInput.style.width = "calc(100% - 28px)";

    const typeSel = document.createElement("select");
    typeSel.className = "config-input custom-var-type";
    typeSel.innerHTML = typeSelect.innerHTML;
    typeSel.value = typeSelect.value;
    typeSel.style.marginTop = "6px";
    typeSel.style.width = "calc(100% - 28px)";

    const valInput = document.createElement("input");
    valInput.className = "config-input custom-var-value";
    valInput.placeholder = valueInput.placeholder;
    valInput.value = valueInput.value;
    valInput.style.marginTop = "6px";
    valInput.style.width = "calc(100% - 28px)";

    const updateVis = () => {
      valInput.style.display = typeSel.value === "manual" ? "block" : "none";
    };
    typeSel.addEventListener("change", updateVis);
    updateVis();

    const more2 = moreBtn.cloneNode(true);
    const menu2 = menu.cloneNode(false);
    menu2.style.display = "none";
    menu2.style.zIndex = "50";

    const dup2 = duplicateItem.cloneNode(true);
    dup2.addEventListener("click", () => {
      saveCustomSetup(false);
    });

    const del2 = document.createElement("div");
    del2.textContent = "Delete";
    del2.style.padding = "4px 10px";
    del2.style.cursor = "pointer";
    del2.style.color = "#f97373";
    del2.addEventListener("mouseenter", () => {
      del2.style.background = "rgba(255,255,255,0.06)";
    });
    del2.addEventListener("mouseleave", () => {
      del2.style.background = "transparent";
    });
    del2.addEventListener("click", () => {
      cloneWrap.remove();
      menu2.style.display = "none";
      saveCustomSetup(false);
    });

    menu2.appendChild(dup2);
    menu2.appendChild(del2);

    more2.addEventListener("click", (e) => {
      e.stopPropagation();
      menu2.style.display = menu2.style.display === "none" ? "block" : "none";
    });

    cloneWrap.appendChild(keyInput);
    cloneWrap.appendChild(typeSel);
    cloneWrap.appendChild(valInput);
    cloneWrap.appendChild(more2);
    cloneWrap.appendChild(menu2);
    container.insertBefore(cloneWrap, wrap.nextSibling);
    menu.style.display = "none";
    saveCustomSetup(false);
  });

  const deleteItem = document.createElement("div");
  deleteItem.textContent = "Delete";
  deleteItem.style.padding = "4px 10px";
  deleteItem.style.cursor = "pointer";
  deleteItem.style.color = "#f97373";
  deleteItem.addEventListener("mouseenter", () => {
    deleteItem.style.background = "rgba(255,255,255,0.06)";
  });
  deleteItem.addEventListener("mouseleave", () => {
    deleteItem.style.background = "transparent";
  });
  deleteItem.addEventListener("click", () => {
    wrap.remove();
    menu.style.display = "none";
    saveCustomSetup(false);
  });

  menu.appendChild(duplicateItem);
  menu.appendChild(deleteItem);

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = menu.style.display === "none" || menu.style.display === "";
    hideAllOptionMenus();
    if (willOpen) menu.style.display = "block";
  });

  wrap.appendChild(nameInput);
  wrap.appendChild(typeSelect);
  wrap.appendChild(valueInput);
  wrap.appendChild(errorDiv);
  wrap.appendChild(moreBtn);
  wrap.appendChild(menu);
  container.appendChild(wrap);
  setActiveRuleRow(wrap);
});

// Close any open options menu when clicking elsewhere in the popup
document.addEventListener("click", () => {
  hideAllOptionMenus();
});

function collectCustomSetup() {
  const ruleRows = document.querySelectorAll(".custom-rule");
  const rules = [];

  ruleRows.forEach((row) => {
    const selectorEl = row.querySelector(".custom-selector");
    const valueEl = row.querySelector(".custom-value");
    if (!selectorEl || !valueEl) return;

    const selector = selectorEl.value.trim();
    const valueTemplate = valueEl.value;
     const mode = row.dataset.mode === "select" ? "select" : "type";

    if (selector && valueTemplate) {
      rules.push({ selector, valueTemplate, mode });
    }
  });

  const varRows = document.querySelectorAll(".custom-var");
  const vars = [];

  varRows.forEach((row) => {
    const keyEl = row.querySelector(".custom-var-key");
    const typeEl = row.querySelector(".custom-var-type");
    const valueEl = row.querySelector(".custom-var-value");
    if (!keyEl || !typeEl || !valueEl) return;

    const key = keyEl.value.trim();
    const type = typeEl.value || "manual";
    const value = valueEl.value.trim();

    if (key && value) {
      vars.push({ key, type, value });
    }
  });

  return { rules, vars };
}

async function saveCustomSetup(showToast) {
  const { rules, vars } = collectCustomSetup();
  lastSavedStateToken = JSON.stringify({ rules, vars });
  const tab = await getActiveTab();
  const contextKey = getContextKeyFromUrl(tab && tab.url);

  chrome.storage.sync.get(["contextConfigs"], (res) => {
    const contexts = res.contextConfigs || {};
    contexts[contextKey] = { customSelectors: rules, customVars: vars };

    chrome.storage.sync.set({ contextConfigs: contexts }, () => {
      // After a successful save, treat all rules as inactive so the next edit
      // session starts with an explicit activation.
      clearActiveRuleRow();
      lastLinkedRuleRow = null;
      // Refresh UI (custom vars + pills) immediately from current in-memory data.
      // Selectors are left as-is to avoid unnecessary redraw/focus loss.
      renderCustomVars(vars);

      if (showToast) {
        const toast = document.getElementById("saved-toast");
        if (toast) {
          const original = toast.textContent;
          toast.textContent = "✓ Custom rules saved";
          toast.classList.add("show");
          setTimeout(() => {
            toast.classList.remove("show");
            toast.textContent = original;
          }, 2000);
        }
      }
    });
  });
}

function getCurrentStateToken() {
  const { rules, vars } = collectCustomSetup();
  return JSON.stringify({ rules, vars });
}

function hasUnsavedChanges() {
  const current = getCurrentStateToken();
  return current !== lastSavedStateToken;
}

async function validateActiveRule() {
  const rows = Array.from(document.querySelectorAll(".custom-rule"));
  const activeRow =
    rows.find((row) => row.dataset.active === "true" || row.classList.contains("custom-rule-active")) ||
    null;

  if (!activeRow) {
    return { ok: true, hasRow: false };
  }

  const selInput = activeRow.querySelector(".custom-selector");
  const valInput = activeRow.querySelector(".custom-value");
  const errDiv = activeRow.querySelector(".selector-error");
  if (!selInput || !valInput || !errDiv) {
    return { ok: true, hasRow: false };
  }

  const selector = selInput.value.trim();
  const valueTemplate = valInput.value.trim();

  if (!selector) {
    errDiv.textContent = "Selector is empty.";
    errDiv.style.display = "block";
    selInput.focus();
    return { ok: false, hasRow: true };
  }

  if (!valueTemplate) {
    errDiv.textContent = "Value template is empty.";
    errDiv.style.display = "block";
    valInput.focus();
    return { ok: false, hasRow: true };
  }

  const ok = await verifySelectorField(selInput, errDiv);
  if (!ok) {
    selInput.focus();
  }
  return { ok, hasRow: true };
}

document.getElementById("save-custom-rules-btn").addEventListener("click", async () => {
  const { ok } = await validateActiveRule();
  if (!ok) return;
  saveCustomSetup(true);
});

// Close / Save-or-leave confirmation
document.getElementById("close-popup-btn").addEventListener("click", () => {
  const panel = document.getElementById("close-confirm-panel");
  if (!panel) {
    window.close();
    return;
  }
  if (!hasUnsavedChanges()) {
    window.close();
    return;
  }
  panel.style.display = "block";
});

document.getElementById("close-confirm-cancel").addEventListener("click", () => {
  const panel = document.getElementById("close-confirm-panel");
  if (panel) panel.style.display = "none";
});

document.getElementById("close-confirm-discard").addEventListener("click", () => {
  window.close();
});

document.getElementById("close-confirm-save").addEventListener("click", async () => {
  const panel = document.getElementById("close-confirm-panel");
  const { ok } = await validateActiveRule();
  if (!ok) return;
  await saveCustomSetup(true);
  if (panel) panel.style.display = "none";
  window.close();
});

// ── Import / export config as JSON ─────────────

document.getElementById("export-config-btn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const contextKey = getContextKeyFromUrl(tab && tab.url);

  const stored = await new Promise(res =>
    chrome.storage.sync.get(["contextConfigs"], res)
  );

  const contexts = stored.contextConfigs || {};
  const ctx = contexts[contextKey] || {};

  const payload = {
    customSelectors: Array.isArray(ctx.customSelectors) ? ctx.customSelectors : [],
    customVars: Array.isArray(ctx.customVars) ? ctx.customVars : [],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "autoform-config.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("import-config-input").addEventListener("change", (e) => {
  const input = e.target;
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);
      const customSelectors = Array.isArray(json.customSelectors) ? json.customSelectors : [];
      const customVars = Array.isArray(json.customVars) ? json.customVars : [];

      getActiveTab().then((tab) => {
        const contextKey = getContextKeyFromUrl(tab && tab.url);
        chrome.storage.sync.get(["contextConfigs"], (res) => {
          const contexts = res.contextConfigs || {};
          contexts[contextKey] = { customSelectors, customVars };
          chrome.storage.sync.set({ contextConfigs: contexts }, () => {
            renderCustomRules(customSelectors);
            renderCustomVars(customVars);
            input.value = "";
          });
        });
      });
    } catch (err) {
      console.error("Failed to parse config JSON", err);
      input.value = "";
    }
  };
  reader.readAsText(file);
});

async function verifySelectorField(selectorInput, errorDiv) {
  if (!selectorInput || !errorDiv) return false;
  const selector = selectorInput.value.trim();
  errorDiv.style.display = "none";
  errorDiv.textContent = "";

  if (!selector) {
    errorDiv.textContent = "Selector is empty.";
    errorDiv.style.display = "block";
    return false;
  }

  // Check for duplicates in current config (excluding this row)
  const all = Array.from(document.querySelectorAll(".custom-selector"));
  const duplicates = all.filter((el) => el !== selectorInput && el.value.trim() === selector);
  if (duplicates.length > 0) {
    errorDiv.textContent = "Selector already exists.";
    errorDiv.style.display = "block";
    return false;
  }

  errorDiv.textContent = "Verifying...";
  errorDiv.style.display = "block";
  errorDiv.style.color = "var(--muted)";

  try {
    const res = await sendToContent({ action: "verifySelector", selector });
    if (!res) {
      errorDiv.textContent = "Could not reach page to verify.";
      errorDiv.style.color = "#f97373";
      return false;
    }
    if (res.ok) {
      errorDiv.textContent = "Selector looks valid and unique.";
      errorDiv.style.color = "#4ade80";
      return true;
    } else {
      errorDiv.style.color = "#f97373";
      switch (res.reason) {
        case "not_found":
          errorDiv.textContent = "No element found for this selector.";
          break;
        case "not_unique":
          errorDiv.textContent = `Selector matches multiple elements (${res.count}).`;
          break;
        case "not_typable":
          errorDiv.textContent = "Element found but is not a typable input.";
          break;
        case "invalid_selector":
          errorDiv.textContent = "Invalid selector syntax.";
          break;
        default:
          errorDiv.textContent = "Verification failed.";
      }
    }
  } catch (e) {
    errorDiv.textContent = "Verification error.";
    errorDiv.style.color = "#f97373";
  }
  return false;
}

// Track last focused template input for variable insertion & suggestions
document.addEventListener("focusin", (e) => {
  const target = e.target;
  if (target && target.classList && target.classList.contains("custom-value")) {
    lastFocusedTemplateInput = target;
  }
});

function ensureVarSuggestBox() {
  if (varSuggestBox) return varSuggestBox;
  const box = document.createElement("div");
  box.id = "var-suggest-box";
  box.style.position = "fixed";
  box.style.zIndex = "9999";
  box.style.background = "#1a1a2e";
  box.style.border = "1px solid var(--border)";
  box.style.borderRadius = "6px";
  box.style.padding = "4px 0";
  box.style.fontSize = "11px";
  box.style.minWidth = "120px";
  box.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
  box.style.display = "none";
  document.body.appendChild(box);
  varSuggestBox = box;
  return box;
}

function hideVarSuggestions() {
  if (varSuggestBox) {
    varSuggestBox.style.display = "none";
    varSuggestBox._targetInput = null;
  }
}

function showVarSuggestionsForInput(input) {
  if (!customVarsCache || customVarsCache.length === 0) return;
  const box = ensureVarSuggestBox();

  const keys = customVarsCache
    .map((v) => (v && v.key ? v.key.trim() : ""))
    .filter((k, idx, arr) => k && arr.indexOf(k) === idx);
  if (keys.length === 0) {
    hideVarSuggestions();
    return;
  }

  const rect = input.getBoundingClientRect();
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.bottom + 4}px`;

  box.innerHTML = "";
  keys.forEach((key) => {
    const item = document.createElement("div");
    item.textContent = key;
    item.style.padding = "4px 10px";
    item.style.cursor = "pointer";
    item.style.whiteSpace = "nowrap";
    item.addEventListener("mouseenter", () => {
      item.style.background = "rgba(255,255,255,0.06)";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "transparent";
    });
    item.addEventListener("click", () => {
      const target = box._targetInput;
      if (!target) return;
      const cursor = target.selectionStart != null ? target.selectionStart : target.value.length;
      const beforeFull = target.value.slice(0, cursor);
      const after = target.value.slice(cursor);
      // replace the last "{{" with {{key}}
      const lastIdx = beforeFull.lastIndexOf("{{");
      const before =
        lastIdx >= 0 ? beforeFull.slice(0, lastIdx) : beforeFull;
      const insert = `{{${key}}}`;
      target.value = `${before}${insert}${after}`;
      const caret = (before + insert).length;
      target.focus();
      target.setSelectionRange(caret, caret);
      hideVarSuggestions();
    });
    box.appendChild(item);
  });

  box._targetInput = input;
  box.style.display = "block";
}

document.addEventListener("input", (e) => {
  const target = e.target;
  if (!target || !target.classList || !target.classList.contains("custom-value")) return;
  const cursor = target.selectionStart != null ? target.selectionStart : target.value.length;
  const before = target.value.slice(0, cursor);
  if (before.endsWith("{{")) {
    showVarSuggestionsForInput(target);
  } else {
    // hide suggestions if user typed past the opening {{
    hideVarSuggestions();
  }
});

document.addEventListener("click", (e) => {
  if (!varSuggestBox || varSuggestBox.style.display === "none") return;
  if (e.target === varSuggestBox || varSuggestBox.contains(e.target)) return;
  hideVarSuggestions();
});

// ── Custom tab autosave on blur ────────────────

(function setupCustomAutosave() {
  const panel = document.getElementById("tab-custom");
  if (!panel) return;

  let autosaveTimeout = null;

  panel.addEventListener("focusout", (event) => {
    // Only trigger autosave when focus leaves the entire Custom panel,
    // not when it simply moves between controls inside the panel.
    const nextActive =
      (event && event.relatedTarget) || document.activeElement || null;
    if (nextActive && panel.contains(nextActive)) {
      return;
    }

    // If the popup window itself still has focus, treat this as an internal
    // focus move and do not autosave. When the user clicks outside the popup
    // or changes tab/window, document.hasFocus() becomes false and autosave
    // will be allowed.
    if (document.hasFocus && document.hasFocus()) {
      return;
    }

    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
      // Skip autosave while any custom var is incomplete (e.g. new row being edited)
      const varRows = Array.from(document.querySelectorAll(".custom-var"));
      const hasIncompleteVar = varRows.some((row) => {
        const keyEl = row.querySelector(".custom-var-key");
        const valEl = row.querySelector(".custom-var-value");
        const key = keyEl ? keyEl.value.trim() : "";
        const val = valEl ? valEl.value.trim() : "";
        return !key || !val;
      });

      if (hasIncompleteVar) return;

      const { ok } = await validateActiveRule();
      if (!ok) return;
      saveCustomSetup(false);
    }, 300);
  });
})();

// ── Expandable sections & pills positioning ────

(function setupExpandableSectionsAndPills() {
  const rulesTitle = document.getElementById("section-custom-rules-title");
  const rulesBody = document.getElementById("custom-rules-body");
  const rulesIndicator = document.getElementById("toggle-custom-rules-indicator");

  const varsTitle = document.getElementById("section-custom-vars-title");
  const varsBody = document.getElementById("custom-vars-body");
  const varsIndicator = document.getElementById("toggle-custom-vars-indicator");

  function toggleSection(body, indicator) {
    if (!body || !indicator) return;
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "" : "none";
    indicator.textContent = isHidden ? "▾" : "▸";
  }

  if (rulesTitle && rulesBody && rulesIndicator) {
    rulesTitle.addEventListener("click", () => toggleSection(rulesBody, rulesIndicator));
  }
  if (varsTitle && varsBody && varsIndicator) {
    varsTitle.addEventListener("click", () => toggleSection(varsBody, varsIndicator));
  }

  const pills = document.getElementById("custom-vars-pills");
  if (!pills) return;

  document.addEventListener("focusin", (e) => {
    const target = e.target;
    if (!target || !target.classList || !target.classList.contains("custom-value")) return;
    const group = target.closest(".config-group");
    if (!group || !group.parentElement) return;
    group.insertAdjacentElement("afterend", pills);
  });
})();
