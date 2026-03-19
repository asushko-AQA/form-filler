// Shared context URL matching + storage helpers for popup/content.
(function attachContextMatcher(globalObj) {
  const MATCH_MODE = {
    EXACT: "exact",
    PREFIX: "prefix",
    WILDCARD: "wildcard",
    PATH_SEGMENT_WILDCARD: "pathSegmentWildcard",
  };

  const MODE_PRIORITY = {
    [MATCH_MODE.EXACT]: 4,
    [MATCH_MODE.PATH_SEGMENT_WILDCARD]: 3,
    [MATCH_MODE.WILDCARD]: 2,
    [MATCH_MODE.PREFIX]: 1,
  };

  function makeStableId(pattern, mode) {
    const seed = `${mode || ""}::${pattern || ""}`;
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return `ctx_${(h >>> 0).toString(16)}`;
  }

  function canonicalUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== "string") return "";
    try {
      const parsed = new URL(inputUrl);
      parsed.hash = "";
      parsed.hostname = parsed.hostname.toLowerCase();
      return parsed.toString();
    } catch (_e) {
      return String(inputUrl).trim().split("#")[0];
    }
  }

  function canonicalPattern(pattern) {
    if (!pattern || typeof pattern !== "string") return "";
    const trimmed = pattern.trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
      parsed.hash = "";
      parsed.hostname = parsed.hostname.toLowerCase();
      return `${parsed.host}${parsed.pathname}${parsed.search}`;
    } catch (_e) {
      return trimmed.toLowerCase().split("#")[0];
    }
  }

  function inferMatchMode(pattern) {
    const p = canonicalPattern(pattern);
    if (!p) return MATCH_MODE.EXACT;
    const hasWildcard = p.includes("*");
    if (!hasWildcard) return MATCH_MODE.EXACT;
    if (p.includes("/*/")) return MATCH_MODE.PATH_SEGMENT_WILDCARD;
    return MATCH_MODE.WILDCARD;
  }

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function splitUrlParts(urlStr) {
    const noScheme = urlStr.replace(/^[a-z]+:\/\//i, "");
    const qIdx = noScheme.indexOf("?");
    if (qIdx < 0) {
      return { hostPath: noScheme, query: "" };
    }
    return {
      hostPath: noScheme.slice(0, qIdx),
      query: noScheme.slice(qIdx),
    };
  }

  function compilePatternRegex(pattern, mode) {
    const p = canonicalPattern(pattern);
    if (!p) throw new Error("Context pattern is empty.");
    const { hostPath, query } = splitUrlParts(p);
    const escapedHostPath = escapeRegex(hostPath);
    const escapedQuery = escapeRegex(query);

    if (mode === MATCH_MODE.WILDCARD) {
      const hostPathExpr = escapedHostPath.replace(/\\\*/g, ".*");
      const queryExpr = escapedQuery.replace(/\\\*/g, ".*");
      return new RegExp(`^${hostPathExpr}${queryExpr}$`);
    }

    if (mode === MATCH_MODE.PATH_SEGMENT_WILDCARD) {
      const hostPathExpr = escapedHostPath.replace(/\\\*/g, "[^/]+");
      const queryExpr = escapedQuery.replace(/\\\*/g, ".*");
      return new RegExp(`^${hostPathExpr}${queryExpr}$`);
    }

    throw new Error(`Unsupported wildcard mode: ${mode}`);
  }

  function isMatch(url, pattern, mode) {
    const cUrl = canonicalUrl(url);
    const cPattern = canonicalPattern(pattern);
    if (!cUrl || !cPattern) return false;
    const target = cUrl.replace(/^[a-z]+:\/\//i, "");
    const normalizedMode = mode || inferMatchMode(cPattern);

    if (normalizedMode === MATCH_MODE.EXACT) {
      return target === cPattern;
    }
    if (normalizedMode === MATCH_MODE.PREFIX) {
      return target.startsWith(cPattern);
    }
    const re = compilePatternRegex(cPattern, normalizedMode);
    return re.test(target);
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const pattern = canonicalPattern(entry.pattern || "");
    if (!pattern) return null;
    const mode = entry.matchMode || inferMatchMode(pattern);
    const now = Date.now();
    return {
      id: entry.id || makeStableId(pattern, mode),
      pattern,
      matchMode: mode,
      customSelectors: Array.isArray(entry.customSelectors) ? entry.customSelectors : [],
      customVars: Array.isArray(entry.customVars) ? entry.customVars : [],
      createdAt: typeof entry.createdAt === "number" ? entry.createdAt : now,
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : now,
    };
  }

  function normalizeStoredContexts(storageObj) {
    const oldMap =
      storageObj && storageObj.contextConfigs && typeof storageObj.contextConfigs === "object"
        ? storageObj.contextConfigs
        : {};
    const incomingEntries = Array.isArray(storageObj && storageObj.contextEntries)
      ? storageObj.contextEntries
      : [];
    const merged = [];

    incomingEntries.forEach((entry) => {
      const normalized = normalizeEntry(entry);
      if (normalized) merged.push(normalized);
    });

    Object.keys(oldMap).forEach((legacyUrl) => {
      const legacy = oldMap[legacyUrl] || {};
      const normalized = normalizeEntry({
        pattern: legacyUrl,
        matchMode: MATCH_MODE.EXACT,
        customSelectors: legacy.customSelectors || [],
        customVars: legacy.customVars || [],
      });
      if (normalized) merged.push(normalized);
    });

    const dedupByModePattern = {};
    merged.forEach((entry) => {
      const k = `${entry.matchMode}::${entry.pattern}`;
      const prev = dedupByModePattern[k];
      if (!prev || (entry.updatedAt || 0) >= (prev.updatedAt || 0)) {
        dedupByModePattern[k] = entry;
      }
    });

    return Object.values(dedupByModePattern);
  }

  function pickBestContextEntry(entries, url) {
    const matches = (Array.isArray(entries) ? entries : []).filter((entry) =>
      isMatch(url, entry.pattern, entry.matchMode)
    );
    if (!matches.length) return null;
    matches.sort((a, b) => {
      const pDiff = (MODE_PRIORITY[b.matchMode] || 0) - (MODE_PRIORITY[a.matchMode] || 0);
      if (pDiff !== 0) return pDiff;
      const lenDiff = (b.pattern || "").length - (a.pattern || "").length;
      if (lenDiff !== 0) return lenDiff;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return matches[0];
  }

  function saveContextEntry(entries, newEntry) {
    const normalized = normalizeEntry(newEntry);
    if (!normalized) throw new Error("Invalid context entry.");
    const list = Array.isArray(entries) ? entries.slice() : [];
    const idx = list.findIndex((entry) => {
      if (!entry) return false;
      if (normalized.id && entry.id === normalized.id) return true;
      return entry.pattern === normalized.pattern && entry.matchMode === normalized.matchMode;
    });
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...normalized,
        createdAt: list[idx].createdAt || normalized.createdAt,
        updatedAt: Date.now(),
      };
    } else {
      list.push(normalized);
    }
    return list;
  }

  function validateContextPattern(pattern, mode) {
    const p = canonicalPattern(pattern);
    if (!p) return { ok: false, reason: "empty", message: "Context URL pattern is required." };
    try {
      if (mode === MATCH_MODE.WILDCARD || mode === MATCH_MODE.PATH_SEGMENT_WILDCARD) {
        compilePatternRegex(p, mode);
      }
      if (mode === MATCH_MODE.PATH_SEGMENT_WILDCARD && !p.includes("/")) {
        return {
          ok: false,
          reason: "broad_segment_pattern",
          message: "Path segment wildcard mode requires a path (for example: site.com/users/*/data).",
        };
      }
      return { ok: true };
    } catch (_e) {
      return { ok: false, reason: "invalid", message: "Context URL pattern is invalid." };
    }
  }

  globalObj.ContextMatcher = {
    MATCH_MODE,
    canonicalUrl,
    canonicalPattern,
    inferMatchMode,
    isMatch,
    normalizeStoredContexts,
    normalizeEntry,
    pickBestContextEntry,
    saveContextEntry,
    validateContextPattern,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
