const historyByWindow = new Map();
const previews = new Map();
let previewCacheHydrated = false;
const PREVIEW_LIMIT = 18;

function previewKey(windowId, tabId) {
  return `${windowId}:${tabId}`;
}

function openPreviewDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("tab-switcher-previews", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("previews", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function hydratePreviewCache() {
  if (previewCacheHydrated) return;
  const database = await openPreviewDatabase();
  const records = await new Promise((resolve, reject) => {
    const request = database.transaction("previews", "readonly").objectStore("previews").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  records.forEach((record) => previews.set(record.key, record));
  database.close();
  previewCacheHydrated = true;
}

async function savePreview(record) {
  const database = await openPreviewDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction("previews", "readwrite").objectStore("previews").put(record);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  const records = await new Promise((resolve, reject) => {
    const request = database.transaction("previews", "readonly").objectStore("previews").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const stale = records.sort((a, b) => b.updatedAt - a.updatedAt).slice(PREVIEW_LIMIT);
  if (stale.length) {
    const transaction = database.transaction("previews", "readwrite");
    stale.forEach((item) => transaction.objectStore("previews").delete(item.key));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    stale.forEach((item) => previews.delete(item.key));
  }
  database.close();
}

async function deletePreview(windowId, tabId) {
  const key = previewKey(windowId, tabId);
  previews.delete(key);
  try {
    const database = await openPreviewDatabase();
    await new Promise((resolve, reject) => {
      const request = database.transaction("previews", "readwrite").objectStore("previews").delete(key);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch { /* Stale previews are evicted by the bounded cache. */ }
}

function rememberTab(windowId, tabId) {
  if (!windowId || !tabId) return;
  const history = historyByWindow.get(windowId) || [];
  historyByWindow.set(windowId, [tabId, ...history.filter((id) => id !== tabId)].slice(0, 40));
}

async function cacheVisiblePreview(windowId, tabId) {
  try {
    await hydratePreviewCache();
    const [beforeCapture] = await chrome.tabs.query({ active: true, windowId });
    if (beforeCapture?.id !== tabId) return;
    const image = await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 72 });
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab?.id !== tabId) return;
    const record = {
      key: previewKey(windowId, tabId),
      url: tab.url || "",
      preview: image,
      updatedAt: Date.now()
    };
    previews.set(record.key, record);
    await savePreview(record);
  } catch {
    // Chrome deliberately blocks captures for a few internal and protected pages.
  }
}

chrome.runtime.onStartup.addListener(async () => {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const window of windows) {
    const active = window.tabs?.find((tab) => tab.active);
    if (active?.id) rememberTab(window.id, active.id);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  rememberTab(windowId, tabId);
  void cacheVisiblePreview(windowId, tabId);
});

chrome.tabs.onRemoved.addListener((tabId, { windowId }) => {
  void deletePreview(windowId, tabId);
  const history = historyByWindow.get(windowId);
  if (history) historyByWindow.set(windowId, history.filter((id) => id !== tabId));
});

chrome.windows.onRemoved.addListener((windowId) => {
  historyByWindow.delete(windowId);
});

chrome.action.onClicked.addListener(() => openSwitcher());
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-switcher") openSwitcher({ cycleExistingOverlay: true });
});

async function openSwitcher({ cycleExistingOverlay = false } = {}) {
  const current = await chrome.windows.getLastFocused({ populate: true });
  if (!current?.id || current.type === "popup") return;
  const active = current.tabs?.find((tab) => tab.active);
  if (cycleExistingOverlay && active?.id) {
    try {
      const response = await chrome.tabs.sendMessage(active.id, { type: "cycle-overlay" });
      if (response?.handled) return;
    } catch {
      // No overlay is present yet; create one below.
    }
  }
  if (active?.id) {
    rememberTab(current.id, active.id);
  }

  const [tabs, releaseKeys] = await Promise.all([
    getTabsForSwitcher(current.id),
    getConfiguredReleaseKeys()
  ]);
  try {
    // Static scripts cover new pages; inject on demand so already-open tabs work too.
    await chrome.scripting.insertCSS({ target: { tabId: active.id }, files: ["overlay.css"] });
    await chrome.scripting.executeScript({ target: { tabId: active.id }, files: ["overlay.js"] });
    await chrome.tabs.sendMessage(active.id, { type: "show-overlay", windowId: current.id, tabs, releaseKeys });
    // Refresh the current preview after the release listener is already installed.
    if (active?.id) void cacheVisiblePreview(current.id, active.id);
  } catch {
    // Chrome internal pages do not permit content scripts, so retain a usable fallback.
    await chrome.windows.create({
      url: chrome.runtime.getURL(`switcher.html?window=${current.id}`),
      type: "popup",
      width: 1240,
      height: 760,
      focused: true
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "get-tabs") {
    getTabsForSwitcher(message.windowId).then(sendResponse);
    return true;
  }

  if (message.type === "activate-tab") {
    chrome.tabs.update(message.tabId, { active: true })
      .then(() => chrome.windows.update(message.windowId, { focused: true }))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "close-tab") {
    chrome.tabs.remove(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

async function getTabsForSwitcher(windowId) {
  await hydratePreviewCache();
  const tabs = await chrome.tabs.query({ windowId });
  const active = tabs.find((tab) => tab.active);
  if (active?.id) rememberTab(windowId, active.id);

  const history = historyByWindow.get(windowId) || [];
  const priority = new Map(history.map((id, index) => [id, index]));
  return tabs
    .sort((a, b) => (priority.get(a.id) ?? 9999) - (priority.get(b.id) ?? 9999) || a.index - b.index)
    .map((tab) => ({
      id: tab.id,
      title: tab.title || "Untitled tab",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || "",
      active: tab.active,
      preview: previews.get(previewKey(windowId, tab.id))?.url === (tab.url || "")
        ? previews.get(previewKey(windowId, tab.id)).preview
        : null
    }));
}

async function getConfiguredReleaseKeys() {
  const commands = await chrome.commands.getAll();
  const shortcut = commands.find((command) => command.name === "open-switcher")?.shortcut || "";
  const keys = [];
  if (/Command/i.test(shortcut)) keys.push("Meta");
  if (/MacCtrl|Ctrl/i.test(shortcut)) keys.push("Control");
  if (/Alt|Option/i.test(shortcut)) keys.push("Alt");
  if (/Shift/i.test(shortcut)) keys.push("Shift");
  return keys.length ? keys : ["Control", "Meta", "Alt", "Shift"];
}