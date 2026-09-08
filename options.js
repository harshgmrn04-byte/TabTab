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

const captureBtn = document.querySelector("#captureAll");
const captureStatus = document.querySelector("#captureStatus");

function updateCaptureUI({ capturing, lastCapturedAt }) {
  captureBtn.disabled = capturing;
  captureBtn.textContent = capturing ? "Capturing…" : "Capture now";
  if (capturing) {
    captureStatus.textContent = "Tabs will briefly flash — this is normal.";
  } else if (lastCapturedAt) {
    const mins = Math.round((Date.now() - lastCapturedAt) / 60000);
    captureStatus.textContent = mins < 1 ? "Captured just now." : `Last captured ${mins} min ago.`;
  } else {
    captureStatus.textContent = "";
  }
}

chrome.storage.local.get({ capturing: false, lastCapturedAt: null }, updateCaptureUI);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  chrome.storage.local.get({ capturing: false, lastCapturedAt: null }, updateCaptureUI);
});

captureBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "warm-previews" });
  updateCaptureUI({ capturing: true, lastCapturedAt: null });
});
