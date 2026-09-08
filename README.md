# TabTab

**The Alt-Tab experience for your browser tabs.**

Hold `Ctrl`, tap `Q` to cycle through tabs, release to switch — exactly the way your OS switches apps. A visual overlay with real screenshot previews appears instantly, right on top of the page you're on. No popup window, no new tab, no friction.

<!-- PLACEHOLDER: Add a demo GIF or screen recording here -->
<!-- Example: ![TabTab demo](assets/demo.gif) -->

---

## Features

- **Hold-to-cycle workflow** — Hold `Ctrl`, tap `Q` repeatedly to cycle forward through tabs. Release `Ctrl` to land. One tap jumps straight to your previous tab, mirroring `Cmd+Tab` muscle memory exactly.
- **In-page overlay** — The switcher appears over the active page, not in a detached popup. No context switch, no flicker.
- **Most-recently-used ordering** — Tabs are sorted by recency, not by their position in the tab bar. The tab you were just on is always first.
- **Screenshot previews** — Real captured screenshots of tabs you've visited, cached locally so they load instantly. Unvisited tabs show a branded placeholder.
- **Preview warm-up on install** — On first install, TabTab automatically cycles through all your open tabs to pre-capture screenshots so the switcher is fully populated immediately. You can also trigger this manually any time from the Options page.
- **Keyboard navigation** — `↑` `↓` `←` `→` to move, `Enter` to switch, `Esc` to dismiss.
- **Mouse support** — Hover to select, click to switch, `×` to close a tab without leaving the switcher.
- **Close tabs inline** — Close any tab from the overlay without interrupting your flow.
- **Fallback for protected pages** — On Chrome internal pages (`chrome://`, Web Store, etc.) where content scripts are blocked, a clean popup window takes over automatically.
- **Customisable shortcut** — Remap the trigger key to anything you prefer via `chrome://extensions/shortcuts`.
- **Configurable key release behaviour** — Choose in Options whether releasing the modifier switches immediately (like Cmd+Tab) or keeps the overlay open so you can browse freely and switch with a click or Enter.
- **Zero dependencies** — Pure HTML, CSS, and JavaScript. No build step, no node_modules, no framework. Load unpacked and it works.

---

## Screenshots

<!-- PLACEHOLDER: Replace the lines below with your actual screenshots -->
<!-- Tip: Use a tool like CleanShot X (Mac) or ShareX (Windows) to capture them -->

| Overlay (4 columns) | Overlay (2 tabs) | Options page |
|---|---|---|
| <img width="1710" height="1112" alt="Screenshot 2026-09-07 at 10 56 30 PM" src="https://github.com/user-attachments/assets/2413edd0-b0f1-4206-857e-28eabf8dc844" />
 | <img width="1710" height="1112" alt="Screenshot 2026-09-09 at 3 50 41 AM" src="https://github.com/user-attachments/assets/81914949-a074-4443-9580-0b6667897bd9" />
 | <img width="1710" height="1112" alt="image" src="https://github.com/user-attachments/assets/2fbd0bc8-49c7-445c-9ad3-73e6c6b50783" />
 |

---

## Install locally

TabTab is not yet on the Chrome Web Store. You can load it as an unpacked extension in under a minute.

1. Clone or download this repository.
   ```
   git clone https://github.com/harshgmrn04-byte/tabtab.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Press `Ctrl+Q` on any page to open TabTab.

> **Mac users:** The shortcut is also `Ctrl+Q` (not `Cmd+Q`). Chrome reserves `Cmd+Tab` for macOS app switching — see [Chrome limitations](#chrome-limitations) below.

---

## Usage

### Switching tabs

| Action | Result |
|---|---|
| Hold `Ctrl`, tap `Q` | Open the switcher and advance to the next tab |
| Tap `Q` again (while holding `Ctrl`) | Cycle to the next tab |
| Release `Ctrl` | Switch to the highlighted tab |
| Click the toolbar icon | Open the switcher |

### Inside the switcher

| Key / Action | Result |
|---|---|
| `↑` `↓` `←` `→` | Move selection |
| `Enter` | Switch to the selected tab |
| `Esc` | Dismiss without switching |
| Hover a card | Move selection to that tab |
| Click a card | Switch to that tab |
| Click `×` on a card | Close that tab |

### Changing the shortcut

Go to **`chrome://extensions/shortcuts`** and set a new key combination next to TabTab. Alternatively, open the extension's **Options** page (right-click the toolbar icon → Options) and click **Change shortcut**.

### Options page

Right-click the toolbar icon and select **Options** to configure:

| Setting | Description |
|---|---|
| **Shortcut** | Change the trigger key combination |
| **Key release behaviour** | **Switch immediately** — releasing the modifier jumps to the selected tab (default). **Keep overlay open** — releasing the modifier does nothing; click a tab or press Enter to switch, Esc to dismiss. |
| **Screenshot previews** | **Capture all previews now** — cycles through every open tab and captures a fresh screenshot. Your tabs will briefly flash; this is normal. Shows when the last capture ran. |

---

## How it works

TabTab has three moving parts:

- **`background.js`** — A Manifest V3 service worker that tracks tab activation history in memory (most-recently-used order), captures screenshot previews via `chrome.tabs.captureVisibleTab`, persists those previews in IndexedDB across sessions, and responds to messages from the overlay and popup.
- **`overlay.js` + `overlay.css`** — A content script injected into every page. When the shortcut fires, the background sends tab data to the content script, which renders the overlay directly in the page's DOM at the highest possible `z-index`. It also handles the hold-and-release cycling gesture.
- **`switcher.html` + `switcher.js` + `switcher.css`** — A standalone fallback page opened in a Chrome popup window when the active tab is a protected page that blocks content scripts.

---

## Chrome limitations

- **`Cmd+Tab` is reserved** — macOS claims `Cmd+Tab` at the system level before Chrome ever sees it. A browser extension cannot intercept it.
- **Tab strip is off-limits** — The overlay starts below Chrome's native tab bar. It cannot paint over the browser UI itself.
- **Screenshots are per-visible-tab** — Chrome only exposes pixels of the currently visible tab. TabTab captures a preview each time you activate a tab, when a tab finishes loading a new page, and once on first install by cycling through all open tabs. Previews are cached in IndexedDB across sessions.
- **Protected pages** — Chrome blocks content scripts on `chrome://` URLs, the Chrome Web Store, and a handful of other internal pages. TabTab detects this and automatically opens a fallback popup window instead so the shortcut never gets stuck.
- **Privacy** — `<all_urls>` host permission is required solely to capture and cache tab screenshots locally. No page content is ever read, transmitted, or stored outside your browser.

---

## Changelog

### v1.2.0
- **New:** "Capture all previews now" button in Options — manually trigger a full preview warm-up at any time, with live status feedback.
- **Fix:** Preview warm-up on install now works correctly — `captureVisibleTab` requires the window to be focused, which was missing and caused all captures to fail silently.
- **Fix:** Original window focus is restored after the warm-up cycle completes.

### v1.1.0
- **New:** Configurable key release behaviour — choose between switching immediately on modifier release or keeping the overlay open until you explicitly click or press Enter (set in Options).
- **New:** Preview warm-up on first install — TabTab quietly cycles through all open tabs once to pre-capture screenshots so the overlay is populated immediately.
- **Fix:** The overlay no longer captures itself as a preview screenshot.
- **Fix:** Previews now update when a tab navigates to a new page, not only when you switch tabs.

### v1.0.0
- Initial public release.

---

## Contributing

Issues and pull requests are welcome. If you find a bug or have a feature idea, open an issue first so we can discuss it before you write any code.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test by loading the extension unpacked.
4. Open a pull request against `main`.

There is no build step — just edit the source files and reload the extension at `chrome://extensions`.


