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
- **Keyboard navigation** — `↑` `↓` `←` `→` to move, `Enter` to switch, `Esc` to dismiss.
- **Mouse support** — Hover to select, click to switch, `×` to close a tab without leaving the switcher.
- **Close tabs inline** — Close any tab from the overlay without interrupting your flow.
- **Fallback for protected pages** — On Chrome internal pages (`chrome://`, Web Store, etc.) where content scripts are blocked, a clean popup window takes over automatically.
- **Customisable shortcut** — Remap the trigger key to anything you prefer via `chrome://extensions/shortcuts`.
- **Zero dependencies** — Pure HTML, CSS, and JavaScript. No build step, no node_modules, no framework. Load unpacked and it works.

---

## Screenshots

<!-- PLACEHOLDER: Replace the lines below with your actual screenshots -->
<!-- Tip: Use a tool like CleanShot X (Mac) or ShareX (Windows) to capture them -->

| Overlay (4 columns) | Overlay (2 tabs) | Options page |
|---|---|---|
| `[screenshot here]` | `[screenshot here]` | `[screenshot here]` |

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
- **Screenshots are per-visible-tab** — Chrome only exposes pixels of the currently visible tab. TabTab captures a preview each time you activate a tab and caches it in IndexedDB. Tabs you have never visited show a placeholder until Chrome permits a capture.
- **Protected pages** — Chrome blocks content scripts on `chrome://` URLs, the Chrome Web Store, and a handful of other internal pages. TabTab detects this and automatically opens a fallback popup window instead so the shortcut never gets stuck.
- **Privacy** — `<all_urls>` host permission is required solely to capture and cache tab screenshots locally. No page content is ever read, transmitted, or stored outside your browser.

---

## Contributing

Issues and pull requests are welcome. If you find a bug or have a feature idea, open an issue first so we can discuss it before you write any code.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test by loading the extension unpacked.
4. Open a pull request against `main`.

There is no build step — just edit the source files and reload the extension at `chrome://extensions`.

---

## License

MIT © Harsh Gupta(https://github.com/YOUR_USERNAME)
