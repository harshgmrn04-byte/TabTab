(() => {
  const OVERLAY_VERSION = chrome.runtime.getManifest().version;
  if (globalThis.__tabSwitcherOverlayVersion === OVERLAY_VERSION) return;
  globalThis.__tabSwitcherOverlayVersion = OVERLAY_VERSION;
  let overlay;
  let tabs = [];
  let targetWindowId;
  let selectedIndex = 0;
  let isActivating = false;
  let releaseKeys = new Set(["Control", "Meta", "Alt", "Shift"]);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "show-overlay") {
      show(message);
      sendResponse({ handled: true });
    }
    if (message.type === "cycle-overlay") {
      if (!overlay || !tabs.length) { sendResponse({ handled: false }); return; }
      selectedIndex = (selectedIndex + 1) % tabs.length;
      updateSelected();
      sendResponse({ handled: true });
    }
  });

  function show(message) {
    if (overlay) { overlay.remove(); overlay = null; }
    isActivating = false;
    tabs = message.tabs;
    targetWindowId = message.windowId;
    releaseKeys = new Set(message.releaseKeys || ["Control", "Meta", "Alt", "Shift"]);
    selectedIndex = tabs.length > 1 ? 1 : 0;
    overlay = document.createElement("div");
    overlay.id = "tab-switcher-overlay";
    overlay.addEventListener("click", (event) => { if (event.target === overlay) dismiss(); });
    const panel = document.createElement("section");
    panel.className = "ts-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Tab switcher");
    const header = document.createElement("header");
    header.className = "ts-header";
    header.innerHTML = `<span class="ts-title">Your tabs</span><span class="ts-count">${tabs.length}</span>`;
    const grid = document.createElement("div");
    grid.className = "ts-grid";
    panel.append(header, grid);
    overlay.append(panel);
    document.documentElement.append(overlay);
    render();
  }

  function render() {
    const grid = overlay?.querySelector(".ts-grid");
    if (!grid) return;
    applyTabLayout(grid);
    grid.replaceChildren(...tabs.map((tab, index) => makeCard(tab, index)));
    updateSelected(false);
  }

  function applyTabLayout(grid) {
    const columns = tabs.length < 4 ? Math.max(1, tabs.length) : 4;
    const panel = overlay.querySelector(".ts-panel");
    panel.classList.remove("ts-columns-1", "ts-columns-2", "ts-columns-3", "ts-columns-4");
    panel.classList.add(`ts-columns-${columns}`);
    grid.style.setProperty("--tab-columns", columns);
  }

  function makeCard(tab, index) {
    const card = document.createElement("article");
    card.className = `ts-card${index === selectedIndex ? " ts-selected" : ""}`;
    card.addEventListener("mouseenter", () => { selectedIndex = index; updateSelected(); });
    card.addEventListener("click", () => activate(tab.id));
    const head = document.createElement("div");
    head.className = "ts-card-head";
    const icon = document.createElement("span");
    icon.className = "ts-icon";
    icon.textContent = (tab.title.trim()[0] || "?").toUpperCase();
    if (tab.favIconUrl) {
      const image = document.createElement("img");
      image.src = tab.favIconUrl;
      image.alt = "";
      image.addEventListener("load", () => icon.replaceChildren(image));
    }
    const name = document.createElement("span");
    name.className = "ts-name";
    name.textContent = tab.title;
    head.append(icon, name);
    if (tab.active) {
      const current = document.createElement("span");
      current.className = "ts-current";
      current.textContent = "CURRENT";
      head.append(current);
    }
    const close = document.createElement("button");
    close.className = "ts-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", `Close ${tab.title}`);
    close.addEventListener("click", (event) => { event.stopPropagation(); closeTab(tab.id); });
    const preview = document.createElement("div");
    preview.className = "ts-preview";
    if (tab.preview) {
      const image = document.createElement("img");
      image.src = tab.preview;
      image.alt = "";
      preview.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "ts-placeholder";
      const domain = document.createElement("span");
      domain.className = "ts-domain";
      domain.textContent = domainFor(tab.url);
      placeholder.append(domain, Object.assign(document.createElement("small"), { textContent: "Preview after visiting" }));
      preview.append(placeholder);
    }
    card.append(head, close, preview);
    return card;
  }

  function domainFor(url) { try { return new URL(url).hostname.replace(/^www\./, "") || "Chrome page"; } catch { return "Chrome page"; } }
  function updateSelected(scroll = true) {
    const cards = overlay ? [...overlay.querySelectorAll(".ts-card")] : [];
    cards.forEach((card, index) => card.classList.toggle("ts-selected", index === selectedIndex));
    if (scroll) cards[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function dismiss() { overlay?.remove(); overlay = null; }
  async function activate(tabId) {
    if (isActivating) return;
    isActivating = true;
    const response = await chrome.runtime.sendMessage({ type: "activate-tab", tabId, windowId: targetWindowId });
    if (response?.ok) dismiss();
    else isActivating = false;
  }
  async function closeTab(tabId) {
    const response = await chrome.runtime.sendMessage({ type: "close-tab", tabId });
    if (!response?.ok) return;
    tabs = tabs.filter((tab) => tab.id !== tabId);
    selectedIndex = Math.min(selectedIndex, Math.max(0, tabs.length - 1));
    if (!tabs.length) dismiss(); else render();
  }
  document.addEventListener("keydown", (event) => {
    if (!overlay) return;
    if (event.key === "Escape") { event.preventDefault(); dismiss(); return; }
    if (event.key === "Enter") { event.preventDefault(); activate(tabs[selectedIndex].id); return; }
    const columns = Number(overlay.querySelector(".ts-grid").style.getPropertyValue("--tab-columns")) || 4;
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    if (event.key in moves) {
      event.preventDefault();
      selectedIndex = (selectedIndex + moves[event.key] + tabs.length) % tabs.length;
      updateSelected();
    }
  }, true);
  function commitOnModifierRelease(event) {
    if (overlay && releaseKeys.has(event.key) && !hasHeldReleaseModifier(event)) activate(tabs[selectedIndex].id);
  }
  function hasHeldReleaseModifier(event) {
    return (releaseKeys.has("Control") && event.ctrlKey)
      || (releaseKeys.has("Alt") && event.altKey)
      || (releaseKeys.has("Meta") && event.metaKey)
      || (releaseKeys.has("Shift") && event.shiftKey);
  }
  window.addEventListener("keyup", commitOnModifierRelease, true);
  document.addEventListener("keyup", commitOnModifierRelease, true);
})();
