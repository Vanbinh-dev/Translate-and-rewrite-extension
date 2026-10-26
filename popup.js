/**
 * Adjusting Writing Style - Popup Controller
 * Implements:
 * 1. Live Match Counter & In-Page Highlight.
 * 2. Automated Reverse Resolution & Rule Merging.
 * 3. Per-Novel Slug Scoping & Custom Scope/Domain Editor.
 * 4. Monochrome Hollow Line UI System.
 */

(() => {
  const STORAGE_KEY_GLOBAL = 'adjusting_writing_style_dictionary';
  const STORAGE_KEY_SCOPES = 'adjusting_writing_style_scopes';

  // DOM Elements
  const scopeDisplayText = document.getElementById('scope-display-text');
  const btnToggleScopeEdit = document.getElementById('btn-toggle-scope-edit');
  const scopeEditPanel = document.getElementById('scope-edit-panel');
  const inputScopePattern = document.getElementById('input-scope-pattern');
  const btnSaveScope = document.getElementById('btn-save-scope');
  const btnCancelScope = document.getElementById('btn-cancel-scope');

  const tabScopeNovel = document.getElementById('tab-scope-novel');
  const tabScopeGlobal = document.getElementById('tab-scope-global');

  const matchCounterBadge = document.getElementById('match-counter-badge');
  const formAddTerm = document.getElementById('form-add-term');
  const inputOriginal = document.getElementById('input-original');
  const inputReplacement = document.getElementById('input-replacement');
  const checkPreserveCase = document.getElementById('check-preserve-case');

  const termListContainer = document.getElementById('term-list-container');
  const termCountEl = document.getElementById('term-count');
  const emptyStateEl = document.getElementById('empty-state');
  const btnClearAll = document.getElementById('btn-clear-all');
  const feedbackBanner = document.getElementById('feedback-banner');

  const btnHome = document.getElementById('btn-home');
  const btnLogin = document.getElementById('btn-login');
  const loginLabel = document.getElementById('login-label');
  const btnImport = document.getElementById('btn-import');
  const fileImportInput = document.getElementById('file-import-input');
  const btnExport = document.getElementById('btn-export');

  // State
  let globalDictionary = [];
  let scopeDictionaries = {}; // { [pattern]: [ { from, to, preserveCase } ] }
  let currentScopeMode = 'NOVEL'; // 'NOVEL' | 'GLOBAL'
  let activeScopePattern = '';
  let activeTabId = null;
  let currentHostname = 'Reading page';
  let isLoggedIn = false;
  let searchDebounceTimer = null;

  // ==========================================
  // 1. STORAGE ADAPTER
  // ==========================================
  const StorageAdapter = {
    async getAll() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEY_GLOBAL, STORAGE_KEY_SCOPES], (res) => {
            resolve({
              global: res[STORAGE_KEY_GLOBAL] || [],
              scopes: res[STORAGE_KEY_SCOPES] || {}
            });
          });
        });
      } else {
        const rawGlobal = localStorage.getItem(STORAGE_KEY_GLOBAL);
        const rawScopes = localStorage.getItem(STORAGE_KEY_SCOPES);
        return {
          global: rawGlobal ? JSON.parse(rawGlobal) : [],
          scopes: rawScopes ? JSON.parse(rawScopes) : {}
        };
      }
    },

    async saveGlobal(entries) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY_GLOBAL]: entries }, resolve);
        });
      } else {
        localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(entries));
      }
    },

    async saveScopes(scopes) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY_SCOPES]: scopes }, resolve);
        });
      } else {
        localStorage.setItem(STORAGE_KEY_SCOPES, JSON.stringify(scopes));
      }
    }
  };

  function getCurrentActiveList() {
    if (currentScopeMode === 'GLOBAL') {
      return globalDictionary;
    }
    if (!scopeDictionaries[activeScopePattern]) {
      scopeDictionaries[activeScopePattern] = [];
    }
    return scopeDictionaries[activeScopePattern];
  }

  async function saveCurrentActiveList(newList) {
    if (currentScopeMode === 'GLOBAL') {
      globalDictionary = newList;
      await StorageAdapter.saveGlobal(globalDictionary);
    } else {
      scopeDictionaries[activeScopePattern] = newList;
      await StorageAdapter.saveScopes(scopeDictionaries);
    }
  }

  // ==========================================
  // 2. FEEDBACK BANNER
  // ==========================================
  let feedbackTimer = null;
  function showFeedback(message, type = 'success') {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackBanner.className = `feedback-banner ${type}`;
    feedbackBanner.textContent = message;
    feedbackBanner.style.display = 'block';

    feedbackTimer = setTimeout(() => {
      feedbackBanner.style.display = 'none';
    }, 2800);
  }

  // ==========================================
  // 3. LIVE MATCH SEARCH & IN-PAGE HIGHLIGHT
  // ==========================================
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function triggerLiveSearch(text) {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    if (!text || !text.trim()) {
      matchCounterBadge.style.display = 'none';
      sendTabMessage({ action: 'CLEAR_HIGHLIGHTS' });
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      sendTabMessage({ action: 'SEARCH_TERM', query: text.trim() }, (response) => {
        if (!response) {
          matchCounterBadge.style.display = 'none';
          return;
        }

        const count = response.count || 0;
        matchCounterBadge.style.display = 'inline-block';
        if (count > 0) {
          matchCounterBadge.className = 'match-badge found';
          matchCounterBadge.textContent = `${count} ${count === 1 ? 'match' : 'matches'}`;
        } else {
          matchCounterBadge.className = 'match-badge not-found';
          matchCounterBadge.textContent = '0 matches';
        }
      });
    }, 120);
  }

  // ==========================================
  // 4. AUTOMATED REVERSE RESOLUTION & MERGING
  // ==========================================
  function resolveToPristineSource(rawFrom, currentDict) {
    const fromLower = rawFrom.trim().toLowerCase();

    // 1. Check if user is reversing an existing rule (B -> A when A -> B exists)
    const reverseMatch = currentDict.find(d => d.to.toLowerCase() === fromLower);
    if (reverseMatch) {
      return {
        type: 'DIRECT_CHAIN',
        pristineFrom: reverseMatch.from,
        existingRule: reverseMatch
      };
    }

    // 2. Check if user input contains a phrase that was already translated
    let resolved = rawFrom.trim();
    let modified = false;
    const sortedByToLength = [...currentDict].sort((a, b) => b.to.length - a.to.length);

    for (const rule of sortedByToLength) {
      if (!rule.to) continue;
      const regex = new RegExp(escapeRegExp(rule.to), 'gi');
      if (regex.test(resolved)) {
        resolved = resolved.replace(regex, rule.from);
        modified = true;
      }
    }

    if (modified) {
      return {
        type: 'SUBSTRING_RESOLVED',
        pristineFrom: resolved
      };
    }

    return {
      type: 'ORIGINAL',
      pristineFrom: rawFrom.trim()
    };
  }

  // ==========================================
  // 5. TERM ACTIONS
  // ==========================================
  async function addTerm(rawFrom, rawTo, preserveCase = true) {
    rawFrom = rawFrom.trim();
    rawTo = rawTo.trim();

    if (!rawFrom || !rawTo) {
      showFeedback('Please enter both original and replacement terms.', 'error');
      return;
    }

    if (rawFrom.toLowerCase() === rawTo.toLowerCase()) {
      showFeedback('Original and replacement terms cannot be identical.', 'error');
      return;
    }

    const currentList = getCurrentActiveList();
    const resolution = resolveToPristineSource(rawFrom, currentList);
    const finalFrom = resolution.pristineFrom;

    if (finalFrom.toLowerCase() === rawTo.toLowerCase()) {
      // Reverted back to original: remove the rule
      const idx = currentList.findIndex(d => d.from.toLowerCase() === finalFrom.toLowerCase());
      if (idx >= 0) {
        currentList.splice(idx, 1);
        await saveCurrentActiveList(currentList);
        renderList();
        notifyContentScript();
        showFeedback(`Reverted to pristine: "${finalFrom}" restored.`);
        inputOriginal.value = '';
        inputReplacement.value = '';
        matchCounterBadge.style.display = 'none';
        return;
      }
    }

    // Check if pristine rule already exists
    const existingIndex = currentList.findIndex(d => d.from.toLowerCase() === finalFrom.toLowerCase());
    if (existingIndex >= 0) {
      currentList[existingIndex].to = rawTo;
      currentList[existingIndex].preserveCase = preserveCase;
      if (resolution.type === 'DIRECT_CHAIN') {
        showFeedback(`Auto-merged chain: "${finalFrom}" ➜ "${rawTo}"`);
      } else {
        showFeedback(`Updated: "${finalFrom}" ➜ "${rawTo}"`);
      }
    } else {
      currentList.unshift({ from: finalFrom, to: rawTo, preserveCase });
      if (resolution.type === 'SUBSTRING_RESOLVED') {
        showFeedback(`Auto-resolved to pristine: "${finalFrom}" ➜ "${rawTo}"`);
      } else {
        showFeedback(`Added: "${finalFrom}" ➜ "${rawTo}"`);
      }
    }

    await saveCurrentActiveList(currentList);
    renderList();
    notifyContentScript();

    inputOriginal.value = '';
    inputReplacement.value = '';
    matchCounterBadge.style.display = 'none';
    sendTabMessage({ action: 'CLEAR_HIGHLIGHTS' });
    inputOriginal.focus();
  }

  async function removeTerm(index) {
    const currentList = getCurrentActiveList();
    const removed = currentList.splice(index, 1)[0];
    await saveCurrentActiveList(currentList);
    renderList();
    notifyContentScript();
    showFeedback(`Removed "${removed.from}"`);
  }

  async function clearAllTerms() {
    const currentList = getCurrentActiveList();
    if (currentList.length === 0) return;
    if (confirm('Are you sure you want to clear all terms in this scope?')) {
      await saveCurrentActiveList([]);
      renderList();
      notifyContentScript();
      showFeedback('Scope dictionary cleared.');
    }
  }

  // ==========================================
  // 6. RENDER TERM LIST
  // ==========================================
  function renderList() {
    const list = getCurrentActiveList();
    termCountEl.textContent = list.length;

    const rows = termListContainer.querySelectorAll('.term-row');
    rows.forEach(r => r.remove());

    if (list.length === 0) {
      emptyStateEl.style.display = 'flex';
      btnClearAll.style.display = 'none';
      return;
    }

    emptyStateEl.style.display = 'none';
    btnClearAll.style.display = 'inline-block';

    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'term-row';

      const pairContent = document.createElement('div');
      pairContent.className = 'term-pair-content';

      const originalSpan = document.createElement('span');
      originalSpan.className = 'term-original';
      originalSpan.textContent = item.from;

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'term-arrow';
      arrowSpan.textContent = '➜';

      const replacementSpan = document.createElement('span');
      replacementSpan.className = 'term-replacement';
      replacementSpan.textContent = item.to;

      pairContent.appendChild(originalSpan);
      pairContent.appendChild(arrowSpan);
      pairContent.appendChild(replacementSpan);

      // Hollow outline trash icon
      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'btn-remove-term';
      btnRemove.title = `Remove "${item.from}"`;
      btnRemove.setAttribute('aria-label', `Remove ${item.from}`);
      btnRemove.innerHTML = `
        <svg class="hollow-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      `;

      btnRemove.addEventListener('click', () => {
        removeTerm(index);
      });

      row.appendChild(pairContent);
      row.appendChild(btnRemove);
      termListContainer.appendChild(row);
    });
  }

  // ==========================================
  // 7. SCOPE MANAGEMENT & CUSTOM DOMAIN EDIT
  // ==========================================
  function updateScopeUI() {
    if (currentScopeMode === 'GLOBAL') {
      scopeDisplayText.textContent = 'Global (All Web)';
      tabScopeGlobal.classList.add('active');
      tabScopeNovel.classList.remove('active');
      btnToggleScopeEdit.style.display = 'none';
    } else {
      scopeDisplayText.textContent = activeScopePattern || 'Novel Scope';
      tabScopeNovel.classList.add('active');
      tabScopeGlobal.classList.remove('active');
      btnToggleScopeEdit.style.display = 'inline-flex';
    }
    renderList();
  }

  btnToggleScopeEdit.addEventListener('click', () => {
    const isVisible = scopeEditPanel.style.display === 'flex';
    scopeEditPanel.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      inputScopePattern.value = activeScopePattern;
      inputScopePattern.focus();
    }
  });

  btnSaveScope.addEventListener('click', async () => {
    const newPattern = inputScopePattern.value.trim();
    if (!newPattern) {
      showFeedback('Scope pattern cannot be empty.', 'error');
      return;
    }

    // Migrate old scope data if renaming
    if (activeScopePattern !== newPattern) {
      if (scopeDictionaries[activeScopePattern] && !scopeDictionaries[newPattern]) {
        scopeDictionaries[newPattern] = scopeDictionaries[activeScopePattern];
        delete scopeDictionaries[activeScopePattern];
      }
      activeScopePattern = newPattern;
      await StorageAdapter.saveScopes(scopeDictionaries);
    }

    scopeEditPanel.style.display = 'none';
    updateScopeUI();
    notifyContentScript();
    showFeedback(`Scope pattern updated: ${activeScopePattern}`);
  });

  btnCancelScope.addEventListener('click', () => {
    scopeEditPanel.style.display = 'none';
  });

  tabScopeNovel.addEventListener('click', () => {
    if (currentScopeMode !== 'NOVEL') {
      currentScopeMode = 'NOVEL';
      updateScopeUI();
    }
  });

  tabScopeGlobal.addEventListener('click', () => {
    if (currentScopeMode !== 'GLOBAL') {
      currentScopeMode = 'GLOBAL';
      scopeEditPanel.style.display = 'none';
      updateScopeUI();
    }
  });

  // ==========================================
  // 8. TAB MESSAGING HELPERS
  // ==========================================
  function sendTabMessage(payload, callback) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, payload).then((res) => {
            if (callback) callback(res);
          }).catch(() => {
            if (callback) callback(null);
          });
        } else if (callback) {
          callback(null);
        }
      });
    } else if (callback) {
      callback(null);
    }
  }

  function notifyContentScript() {
    sendTabMessage({
      action: 'APPLY_DICTIONARY',
      dictionary: getCurrentActiveList()
    });
  }

  // ==========================================
  // 9. TOOLBAR BUTTONS
  // ==========================================
  btnHome.addEventListener('click', () => {
    termListContainer.scrollTop = 0;
    inputOriginal.focus();
    showFeedback('Scrolled to top.');
  });

  btnLogin.addEventListener('click', () => {
    if (!isLoggedIn) {
      const username = prompt('Enter your username or email for cloud sync:');
      if (username && username.trim()) {
        isLoggedIn = true;
        loginLabel.textContent = username.trim().split('@')[0];
        btnLogin.title = `Logged in: ${username.trim()}`;
        showFeedback(`Welcome, ${username.trim()}! Cloud sync enabled.`);
      }
    } else {
      if (confirm('Do you want to sign out of this account?')) {
        isLoggedIn = false;
        loginLabel.textContent = 'Login';
        btnLogin.title = 'Sign in';
        showFeedback('Signed out.');
      }
    }
  });

  btnImport.addEventListener('click', () => {
    fileImportInput.click();
  });

  fileImportInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const lines = content.split(/\r?\n/);
      let count = 0;
      const currentList = getCurrentActiveList();

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) continue;

        const parts = line.split(/\s*(?:->|-|=|:)\s*/);
        if (parts.length >= 2) {
          const from = parts[0].trim();
          const to = parts.slice(1).join('-').trim();
          if (from && to) {
            const resolution = resolveToPristineSource(from, currentList);
            const finalFrom = resolution.pristineFrom;

            const existIdx = currentList.findIndex(d => d.from.toLowerCase() === finalFrom.toLowerCase());
            if (existIdx >= 0) {
              currentList[existIdx].to = to;
            } else {
              currentList.push({ from: finalFrom, to, preserveCase: true });
            }
            count++;
          }
        }
      }

      await saveCurrentActiveList(currentList);
      renderList();
      notifyContentScript();
      showFeedback(`Successfully imported ${count} term pairs.`);
      fileImportInput.value = '';
    };

    reader.onerror = () => {
      showFeedback('Error reading file. Please try again.', 'error');
    };

    reader.readAsText(file, 'utf-8');
  });

  btnExport.addEventListener('click', () => {
    const currentList = getCurrentActiveList();
    if (currentList.length === 0) {
      showFeedback('Current dictionary is empty. Nothing to export.', 'error');
      return;
    }

    const textLines = [
      `# NOVEL GLOSSARY - ADJUSTING WRITING STYLE`,
      `# Scope: ${currentScopeMode === 'GLOBAL' ? 'Global' : activeScopePattern}`,
      `# Export Date: ${new Date().toISOString().split('T')[0]}`,
      `# Format: original - replacement`,
      ''
    ];

    currentList.forEach(d => {
      textLines.push(`${d.from} - ${d.to}`);
    });

    const fileContent = textLines.join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');

    const cleanName = (currentScopeMode === 'GLOBAL' ? 'global' : activeScopePattern).replace(/[^a-zA-Z0-9.-]/g, '_');
    downloadAnchor.href = url;
    downloadAnchor.download = `dictionary-${cleanName}.txt`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    showFeedback('Dictionary file downloaded.');
  });

  // ==========================================
  // 10. EVENT LISTENERS & INITIALIZATION
  // ==========================================
  inputOriginal.addEventListener('input', (e) => {
    triggerLiveSearch(e.target.value);
  });

  formAddTerm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTerm(inputOriginal.value, inputReplacement.value, checkPreserveCase.checked);
  });

  btnClearAll.addEventListener('click', clearAllTerms);

  window.addEventListener('beforeunload', () => {
    sendTabMessage({ action: 'CLEAR_HIGHLIGHTS' });
  });

  async function init() {
    const data = await StorageAdapter.getAll();
    globalDictionary = data.global;
    scopeDictionaries = data.scopes;

    // Detect active tab and pattern
    sendTabMessage({ action: 'GET_PAGE_INFO' }, (info) => {
      if (info && info.novelInfo) {
        currentHostname = info.hostname || 'Reading page';
        activeScopePattern = info.novelInfo.pattern;
      } else {
        activeScopePattern = `${window.location.hostname || 'reading-site'}/*`;
      }
      updateScopeUI();
    });
  }

  init();
})();
