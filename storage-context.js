// Per-entry context storage in chrome.storage.local (shared by popup/content).
(function attachStorageContext(globalObj) {
  const ENTRY_IDS_KEY = "contextEntryIds";
  const ENTRY_KEY_PREFIX = "contextEntry:";

  function entryKey(id) {
    return `${ENTRY_KEY_PREFIX}${id}`;
  }

  function storageErrorMessage(lastError) {
    if (!lastError) return "Could not save configuration.";
    const msg = lastError.message || String(lastError);
    if (/quota|exceed|limit/i.test(msg)) {
      return "Could not save configuration (storage limit). Try removing unused contexts.";
    }
    return `Could not save configuration: ${msg}`;
  }

  function readLocalEntries(localData) {
    const data = localData || {};
    const ids = Array.isArray(data[ENTRY_IDS_KEY]) ? data[ENTRY_IDS_KEY] : [];
    const entries = [];
    ids.forEach((id) => {
      const raw = data[entryKey(id)];
      const normalized = globalObj.ContextMatcher.normalizeEntry(raw);
      if (normalized) entries.push(normalized);
    });
    return entries;
  }

  function hasLocalContextData(localData) {
    const data = localData || {};
    if (Array.isArray(data[ENTRY_IDS_KEY]) && data[ENTRY_IDS_KEY].length > 0) {
      return true;
    }
    return Object.keys(data).some((key) => key.startsWith(ENTRY_KEY_PREFIX));
  }

  function clearLegacySyncKeys(cb) {
    chrome.storage.sync.remove(["contextEntries", "contextConfigs"], () => {
      if (typeof cb === "function") cb();
    });
  }

  function migrateFromSync(resolve) {
    chrome.storage.sync.get(["contextEntries", "contextConfigs"], (syncRes) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }
      const entries = globalObj.ContextMatcher.normalizeStoredContexts(syncRes || {});
      if (!entries.length) {
        clearLegacySyncKeys(() => resolve([]));
        return;
      }
      setStorageContexts(entries, (result) => {
        if (!result.ok) {
          resolve(entries);
          return;
        }
        clearLegacySyncKeys(() => resolve(entries));
      });
    });
  }

  function getStorageContexts() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (localRes) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }
        const localData = localRes || {};
        if (hasLocalContextData(localData)) {
          resolve(readLocalEntries(localData));
          return;
        }
        migrateFromSync(resolve);
      });
    });
  }

  function setStorageContexts(entries, cb) {
    const normalized = (Array.isArray(entries) ? entries : [])
      .map((entry) => globalObj.ContextMatcher.normalizeEntry(entry))
      .filter(Boolean);
    const newIds = normalized.map((entry) => entry.id);
    const payload = {};
    payload[ENTRY_IDS_KEY] = newIds;
    normalized.forEach((entry) => {
      payload[entryKey(entry.id)] = entry;
    });

    chrome.storage.local.get([ENTRY_IDS_KEY], (res) => {
      if (chrome.runtime.lastError) {
        cb({ ok: false, error: storageErrorMessage(chrome.runtime.lastError) });
        return;
      }
      const oldIds = Array.isArray(res && res[ENTRY_IDS_KEY]) ? res[ENTRY_IDS_KEY] : [];
      const staleKeys = oldIds.filter((id) => !newIds.includes(id)).map(entryKey);

      chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError) {
          cb({ ok: false, error: storageErrorMessage(chrome.runtime.lastError) });
          return;
        }
        if (!staleKeys.length) {
          cb({ ok: true });
          return;
        }
        chrome.storage.local.remove(staleKeys, () => {
          if (chrome.runtime.lastError) {
            cb({ ok: false, error: storageErrorMessage(chrome.runtime.lastError) });
            return;
          }
          cb({ ok: true });
        });
      });
    });
  }

  function removeStorageContext(id, cb) {
    if (!id) {
      cb({ ok: false, error: "Context id is required." });
      return;
    }
    getStorageContexts().then((entries) => {
      const nextEntries = entries.filter((entry) => entry && entry.id !== id);
      setStorageContexts(nextEntries, cb);
    });
  }

  const FLOATING_BTN_SETTINGS_KEY = "floatingButtonSettings";

  const FLOATING_BTN_CORNERS = [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left",
  ];

  const FLOATING_BTN_CORNER_AXES = {
    "bottom-right": ["bottom", "right"],
    "bottom-left": ["bottom", "left"],
    "top-right": ["top", "right"],
    "top-left": ["top", "left"],
  };

  const DEFAULT_FLOATING_BTN_SETTINGS = {
    corner: "bottom-right",
    gaps: { top: 24, bottom: 24, left: 24, right: 24 },
  };

  function normalizeGapPx(value, fallback) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.min(n, 999);
  }

  function normalizeFloatingButtonSettings(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const corner = FLOATING_BTN_CORNERS.includes(src.corner)
      ? src.corner
      : DEFAULT_FLOATING_BTN_SETTINGS.corner;
    const gapsSrc = src.gaps && typeof src.gaps === "object" ? src.gaps : {};
    return {
      corner,
      gaps: {
        top: normalizeGapPx(gapsSrc.top, DEFAULT_FLOATING_BTN_SETTINGS.gaps.top),
        bottom: normalizeGapPx(gapsSrc.bottom, DEFAULT_FLOATING_BTN_SETTINGS.gaps.bottom),
        left: normalizeGapPx(gapsSrc.left, DEFAULT_FLOATING_BTN_SETTINGS.gaps.left),
        right: normalizeGapPx(gapsSrc.right, DEFAULT_FLOATING_BTN_SETTINGS.gaps.right),
      },
    };
  }

  function getFloatingButtonSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([FLOATING_BTN_SETTINGS_KEY], (res) => {
        if (chrome.runtime.lastError) {
          resolve(normalizeFloatingButtonSettings(null));
          return;
        }
        resolve(normalizeFloatingButtonSettings(res && res[FLOATING_BTN_SETTINGS_KEY]));
      });
    });
  }

  function setFloatingButtonSettings(settings, cb) {
    const normalized = normalizeFloatingButtonSettings(settings);
    chrome.storage.local.set({ [FLOATING_BTN_SETTINGS_KEY]: normalized }, () => {
      if (typeof cb !== "function") return;
      if (chrome.runtime.lastError) {
        cb({ ok: false, error: storageErrorMessage(chrome.runtime.lastError) });
        return;
      }
      cb({ ok: true, settings: normalized });
    });
  }

  function getFloatingButtonCornerAxes(corner) {
    return FLOATING_BTN_CORNER_AXES[corner] || FLOATING_BTN_CORNER_AXES["bottom-right"];
  }

  function applyFloatingButtonPositionStyles(element, settings) {
    if (!element) return;
    const normalized = normalizeFloatingButtonSettings(settings);
    const { corner, gaps } = normalized;
    element.style.top = "";
    element.style.bottom = "";
    element.style.left = "";
    element.style.right = "";

    if (corner === "bottom-right") {
      element.style.bottom = `${gaps.bottom}px`;
      element.style.right = `${gaps.right}px`;
    } else if (corner === "bottom-left") {
      element.style.bottom = `${gaps.bottom}px`;
      element.style.left = `${gaps.left}px`;
    } else if (corner === "top-right") {
      element.style.top = `${gaps.top}px`;
      element.style.right = `${gaps.right}px`;
    } else if (corner === "top-left") {
      element.style.top = `${gaps.top}px`;
      element.style.left = `${gaps.left}px`;
    }
  }

  globalObj.StorageContext = {
    getStorageContexts,
    setStorageContexts,
    removeStorageContext,
    FLOATING_BTN_SETTINGS_KEY,
    FLOATING_BTN_CORNERS,
    DEFAULT_FLOATING_BTN_SETTINGS,
    normalizeFloatingButtonSettings,
    getFloatingButtonSettings,
    setFloatingButtonSettings,
    getFloatingButtonCornerAxes,
    applyFloatingButtonPositionStyles,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
