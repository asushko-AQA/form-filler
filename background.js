const UI_MODES = {
  popup: "popup",
  sidepanel: "sidepanel",
};

function normalizeUiMode(mode) {
  return mode === UI_MODES.popup ? UI_MODES.popup : UI_MODES.sidepanel;
}

async function closeSidePanelForWindow(windowId) {
  if (!chrome.sidePanel || !chrome.sidePanel.close || windowId == null) {
    return false;
  }
  try {
    await chrome.sidePanel.close({ windowId });
    return true;
  } catch (_e) {
    return false;
  }
}

async function applyUiMode(mode, options) {
  const normalized = normalizeUiMode(mode);
  const windowId = options && options.windowId != null ? options.windowId : null;

  if (normalized === UI_MODES.popup) {
    await chrome.action.setPopup({ popup: "popup.html" });
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
    await closeSidePanelForWindow(windowId);
    return normalized;
  }

  await chrome.action.setPopup({ popup: "" });
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
  return normalized;
}

function readStoredUiMode() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["uiMode"], (res) => {
      if (chrome.runtime.lastError) {
        resolve(UI_MODES.sidepanel);
        return;
      }
      resolve(normalizeUiMode(res && res.uiMode));
    });
  });
}

async function applyStoredUiMode() {
  const mode = await readStoredUiMode();
  await applyUiMode(mode);
}

chrome.runtime.onInstalled.addListener(() => {
  applyStoredUiMode().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  applyStoredUiMode().catch(() => {});
});

applyStoredUiMode().catch(() => {});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.action !== "applyUiMode") return;
  applyUiMode(msg.mode, { windowId: msg.windowId })
    .then((mode) => sendResponse({ ok: true, mode }))
    .catch((err) =>
      sendResponse({ ok: false, error: err && err.message ? err.message : String(err) })
    );
  return true;
});
