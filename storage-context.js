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

  globalObj.StorageContext = {
    getStorageContexts,
    setStorageContexts,
    removeStorageContext,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
