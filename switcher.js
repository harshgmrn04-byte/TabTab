const params = new URLSearchParams(location.search);
const targetWindowId = Number(params.get("window"));
const grid = document.querySelector("#tabs");
const empty = document.querySelector("#empty");
const tabCount = document.querySelector("#tabCount");
let tabs = [];
let selectedIndex = 0;

document.querySelector("#dismiss").addEventListener("click", () => window.close());

async function loadTabs() {
  tabs = await chrome.runtime.sendMessage({ type: "get-tabs", windowId: targetWindowId });
  tabCount.textContent = tabs.length;
  empty.hidden = tabs.length > 0;
  // The most recently used tab is first; start on the next one, mirroring Cmd+Tab.
  selectedIndex = tabs.length > 1 ? 1 : 0;
  render();
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, "") || "Chrome page"; }
  catch { return "Chrome page"; }
}

function titleInitial(title) {
  return (title.trim()[0] || "?").toUpperCase();
}

function render() {
  grid.replaceChildren(...tabs.map((tab, index) => {
    const card = document.createElement("article");
    card.className = `tab-card${index === selectedIndex ? " selected" : ""}${tab.active ? " active" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Switch to ${tab.title}`);
    card.addEventListener("mouseenter", () => { selectedIndex = index; updateSelected(); });
    card.addEventListener("click", () => activate(tab.id));
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") activate(tab.id); });

    const title = document.createElement("div");
    title.className = "title";
    if (tab.favIconUrl) {
      const icon = document.createElement("img");
      icon.className = "favicon";
      icon.src = tab.favIconUrl;
      icon.alt = "";
      icon.addEventListener("error", () => icon.replaceWith(makeFallback(tab.title)));
      title.append(icon);
    } else title.append(makeFallback(tab.title));
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = tab.title;
    title.append(name);

    const close = document.createElement("button");
    close.className = "close-tab";
    close.type = "button";
    close.textContent = "×";
    close.title = `Close ${tab.title}`;
    close.setAttribute("aria-label", `Close ${tab.title}`);
    close.addEventListener("click", (event) => { event.stopPropagation(); closeTab(tab.id); });

    const preview = document.createElement("div");
    preview.className = "preview";
    if (tab.preview) {
      const image = document.createElement("img");
      image.src = tab.preview;
      image.alt = "";
      preview.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      const domain = document.createElement("span");
      domain.className = "placeholder-domain";
      domain.textContent = hostname(tab.url);
      const label = document.createElement("span");
      label.className = "placeholder-label";
      label.textContent = "Preview available after visiting";
      placeholder.append(domain, label);
      preview.append(placeholder);
    }
    card.append(title, close, preview);
    return card;
  }));
  updateSelected(false);
}

function makeFallback(title) {
  const fallback = document.createElement("span");
  fallback.className = "fallback-icon";
  fallback.textContent = titleInitial(title);
  return fallback;
}

function updateSelected(scroll = true) {
  const cards = [...grid.children];
  cards.forEach((card, index) => card.classList.toggle("selected", index === selectedIndex));
  if (scroll) cards[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function activate(tabId) {
  const response = await chrome.runtime.sendMessage({ type: "activate-tab", tabId, windowId: targetWindowId });
  if (response?.ok) window.close();
}

async function closeTab(tabId) {
  const response = await chrome.runtime.sendMessage({ type: "close-tab", tabId });
  if (!response?.ok) return;
  tabs = tabs.filter((tab) => tab.id !== tabId);
  if (selectedIndex >= tabs.length) selectedIndex = Math.max(0, tabs.length - 1);
  tabCount.textContent = tabs.length;
  empty.hidden = tabs.length > 0;
  render();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { window.close(); return; }
  if (!tabs.length) return;
  const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
  if (event.key in moves) {
    event.preventDefault();
    selectedIndex = (selectedIndex + moves[event.key] + tabs.length) % tabs.length;
    updateSelected();
  }
  if (event.key === "Enter") { event.preventDefault(); activate(tabs[selectedIndex].id); }
});

loadTabs().catch(() => { empty.hidden = false; empty.textContent = "Unable to load this window’s tabs."; });
