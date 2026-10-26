# Adjusting Writing Style (Translate and Rewrite Extension)

A Chromium browser extension designed to help readers standardize terminology inconsistencies and adjust writing styles while reading web novels, light novels, and web fiction.

---

## 1. Target Audience

This extension is built for:
* **Web Novel and Light Novel Readers:** People who read long serialized fiction directly in browser tabs.
* **Readers of Machine Translations (MTL) and Multi-Translator Projects:** Stories where translation teams change across chapters, or where automated translation scripts produce conflicting terminology.
* **Readers Seeking Personalized Reading Preferences:** Users who want character names, locations, skills, and titles displayed according to their preferred translation or romanization style.

---

## 2. The Problem: Translation Inconsistencies

During serialized novel reading, **terminology inconsistency** is a frequent source of cognitive friction:
* **Translator Turnover:** Chapters 1–50 by Team A may translate a title as *"Crimson"*, while Chapter 51 onward by Team B switches it to *"Scarlet"*.
* **Sino-Vietnamese / Pinyin / Literal Discrepancies:** A single entity may alternate between its original name, transliteration, or multiple localized variants across arcs (e.g., *"The Fool"* vs. localized aliases).
* **Cognitive Load on the Reader:** Every time an inconsistent term appears, the reader must pause and mentally reconcile its meaning. This disrupts the narrative immersion and ruins reading flow.

This extension resolves the issue by performing immediate, in-place text replacements directly within the web page. The text renders as though the translation was consistent from the beginning.

---

## 3. Installation & Download

### Installing from Source (Raw Repository)
While the extension is in active development, you can load it directly from source:

1. **Download the source code:**
   * *Via Git:*
     ```bash
     git clone https://github.com/Vanbinh-dev/Translate-and-rewrite-extension.git
     ```
   * *Via ZIP:* Click the **Code** button on GitHub, select **Download ZIP**, and extract the contents to a folder on your computer.

2. **Load into Chromium Browsers (Chrome, Edge, Brave, Cốc Cốc):**
   * Open your browser and navigate to the extensions manager:
     * Google Chrome / Brave / Cốc Cốc: `chrome://extensions/`
     * Microsoft Edge: `edge://extensions/`
   * Enable **Developer mode** using the toggle switch in the top-right corner.
   * Click **Load unpacked** in the top-left corner.
   * Select the extracted project folder (the directory containing `manifest.json`).
   * Pin the extension icon to your browser toolbar for quick access.

### Chrome Web Store
* Link: *(Pending release — will be updated)*

---

## 4. Features Provided

* **In-Place DOM Mutation:** Operates directly on DOM `TextNode` objects. Does not insert wrapper elements, does not break line breaks, and does not alter the website's original typography or layout.
* **Automatic Case Preservation (`CasePreserver`):**
  * Lowercase: `crimson` $\rightarrow$ `scarlet`
  * Title Case: `Crimson` $\rightarrow$ `Scarlet`
  * Uppercase: `CRIMSON` $\rightarrow$ `SCARLET`
  * Correctly applies to multi-word phrases and compound terms.
* **Compatibility with Dynamic Web Renderers:** Uses `MutationObserver` to intercept content rendered after initial page load, including client-side decryption scripts, AJAX calls, and single-page application (SPA) transitions.
* **Popup Management Interface:**
  * Quick-entry form for original and replacement term pairs.
  * Scrollable list of active replacement rules with a slim custom scrollbar.
  * Individual term removal and a full reset option.
* **Plain Text Dictionary Import and Export:**
  * Imports and exports simple `.txt` files using a line-by-line `original - replacement` format.
  * Facilitates offline backup and sharing glossary presets between readers.
* **4-Button Navigation Toolbar:**
  * `Home`: Resets scroll position to top and focuses the input field.
  * `Login`: Account synchronization state indicator.
  * `Import`: Bulk loads glossary terms from a `.txt` file.
  * `Export`: Downloads current terms as a `.txt` file.
* **Local Storage & Privacy:** All dictionaries are stored locally within `chrome.storage.local`. No reading data or browsing history is sent to external servers.

---

## 5. Usage Guide

### Adding Terms Manually
1. Click the extension icon in the browser toolbar.
2. Under **Add Term Pair**:
   * **Original Term:** Enter the term you want to replace (e.g., `Crimson`).
   * **Replacement:** Enter the term you want displayed (e.g., `Scarlet`).
3. Keep *"Preserve letter casing (Aa)"* checked if you want casing transferred automatically.
4. Click **Add to Dictionary** (or press `Enter`).
5. The active story tab updates immediately.

### Importing a Dictionary File
1. Prepare a `.txt` file with one term pair per line:
   ```text
   # Novel Glossary
   # Format: original - replacement
   Crimson - Scarlet
   The Fool - Fool
   Dorothy - Dolly
   ```
2. Click **Import** on the popup toolbar and select your file.
3. Valid pairs are parsed and applied immediately.

### Exporting a Dictionary File
1. Click **Export** on the popup toolbar.
2. The extension generates and downloads a `.txt` file containing all currently saved terms.

---

## 6. Future Roadmap

* **Context Menu Quick-Add:** Highlight any word or phrase on a reading page, right-click, and select *"Replace this term with..."* to add rules without opening the popup.
* **Per-Novel Scope Matching:** Automatically detect novel endpoint patterns from page URLs to activate only the glossary belonging to the current novel.
* **Custom AI Model Integration (Bring Your Own Key):** Allow users to connect their own API key to rewrite clunky machine-translated sentences into fluent literary prose.
* **Community Glossary Presets:** Allow readers to download community-curated term presets for popular serialized titles.
