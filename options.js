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
