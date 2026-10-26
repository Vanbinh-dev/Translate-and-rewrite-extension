# Translate and Rewrite Extension (`Adjusting Writing Style`)

> **An AI-assisted Chrome Extension (Manifest V3) designed to address terminology inconsistencies across novel/story translations and seamlessly refine writing styles.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Browser Support](https://img.shields.io/badge/Browsers-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20C%E1%BB%91c%20C%E1%BB%91c-orange.svg)](#installation)

---

## 📖 Overview

When reading translated web novels, light novels, or machine translations (MTL), readers frequently face **terminology inconsistency** across chapters or different translation groups.
- *Example:* Chapter 1 translates "Crimson" as **"Xích Hoàn"**, while Chapter 50 changes it to **"Xích Thành"**; or "The Fool" shifts between **"Ngu Giả"** and **"Kẻ Khờ"**.

This extension operates as an in-browser custom glossary and style adjuster that dynamically and invisibly replaces target words and phrases directly within web page text nodes.

---

## ✨ Key Features

1. **Universal In-Place DOM Replacement**
   - Uses `TreeWalker` with `NodeFilter.SHOW_TEXT` to mutate `TextNode.nodeValue` directly.
   - **Zero visual traces:** No added `<span>` tags, no altered styling, no layout shifts.
   - **Dynamic Render Support:** Features a `MutationObserver` that intercepts text added by client-side decryptions (e.g., `ln.hako.vn`), AJAX requests, SPA frameworks (React, Vue), or infinite scrolling.

2. **Intelligent Case Preservation (`CasePreserver`)**
   - Automatically detects and transfers letter casing:
     - `xích` (lowercase) $\rightarrow$ `hồng`
     - `Xích` (Title Case) $\rightarrow$ `Hồng`
     - `XÍCH` (ALL CAPS) $\rightarrow$ `HỒNG`
     - `Xích Thành` $\rightarrow$ `Xích Hoàn`
   - Preserves punctuation and sentence cadence.

3. **Modern Popup UI (UI/UX Pro Max Standard)**
   - **4 Core Toolbar Actions:**
     - 🏠 **Home:** Quick focus and scroll-to-top.
     - 👤 **Login:** Account sync indicator.
     - 📥 **Import:** Load dictionary pairs from `.txt` files.
     - 📤 **Export:** Download current terms as a `.txt` file.
   - **Input Section:** Dual input (`Original` $\rightarrow$ `Replacement`) with instant keyboard `Enter` support.
   - **Scrollable Term List:** Custom slim scrollbar displaying saved terms with quick deletion.
   - **Accessible Design:** WCAG AA color contrast (Slate palette with `#2563EB` accent) and visible focus rings.

4. **Privacy & Security First**
   - All dictionaries are stored locally inside `chrome.storage.local`.
   - No data is transmitted to third-party tracking servers.

---

## 📂 Project Structure

```text
Adjusting Writing Style/
├── manifest.json       # Manifest V3 extension configuration & permissions
├── popup.html          # Extension popup UI structure
├── popup.css           # UI/UX Pro Max styling & design tokens
├── popup.js            # Popup controller, storage management & I/O
├── content.js          # Universal content script (DOM observer & replacer)
├── icons/              # Extension icons (16x16, 48x48, 128x128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .gitignore          # Git exclusion rules
└── README.md           # Project documentation
```

---

## 🚀 Installation & Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Vanbinh-dev/Translate-and-rewrite-extension.git
```

### 2. Load into Chromium Browsers (Chrome / Edge / Brave / Cốc Cốc)
1. Open your browser and navigate to the extensions page:
   - **Google Chrome / Brave / Cốc Cốc:** `chrome://extensions/`
   - **Microsoft Edge:** `edge://extensions/`
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the project folder: `Adjusting Writing Style`.
5. Pin the extension to your browser toolbar.

---

## 📝 Dictionary Format

When using **Import** or **Export**, the extension uses a clean line-based text format:

```text
# NOVEL GLOSSARY
# Format: original - replacement
xích thành - xích hoàn
ngu giả - kẻ khờ
dorothy - đóa la tây
```
- Lines starting with `#` or `//` are treated as comments and ignored.
- Supports delimiters: `-`, `->`, `=`, `:`.

---

## 🛣️ Roadmap

- [x] Core Universal DOM Replacement Engine (`TreeWalker` + `MutationObserver`)
- [x] Automatic letter case preservation engine
- [x] Manifest V3 Extension with Popup UI
- [x] Text file Import / Export
- [ ] Context Menu shortcut (Right click on selected text $\rightarrow$ "Replace with...")
- [ ] Per-novel glossary auto-switching based on URL pattern
- [ ] BYOK (Bring Your Own Key) Google Gemini Flash integration for literary AI rewriting

---

## 👤 Author

* **Vanbinh-dev** - [GitHub Profile](https://github.com/Vanbinh-dev)
* Email: `nguyenvanbinh542007@gmail.com`

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
