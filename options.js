const shortcut = document.querySelector("#shortcut");
chrome.commands.getAll().then((commands) => {
  const command = commands.find((item) => item.name === "open-switcher");
  shortcut.textContent = command?.shortcut || "Not assigned";
});
document.querySelector("#change").addEventListener("click", async () => {
  try {
    await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  } catch {
    shortcut.textContent = "Open chrome://extensions/shortcuts to change it";
  }
});

const releaseRadios = document.querySelectorAll("input[name='releaseAction']");
chrome.storage.sync.get({ releaseAction: "switch" }, ({ releaseAction }) => {
  releaseRadios.forEach((r) => { if (r.value === releaseAction) r.checked = true; });
});
releaseRadios.forEach((r) => r.addEventListener("change", () => {
  chrome.storage.sync.set({ releaseAction: r.value });
}));
