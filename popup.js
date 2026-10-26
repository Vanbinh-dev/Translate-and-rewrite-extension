/**
 * Adjusting Writing Style - Popup Controller
 * Implements:
 * 1. Direct & Instant URL Pattern Extraction from Active Tab.
 * 2. Auto-Injection & Live Search/Highlight with In-Page Scrolling.
 * 3. Automated Reverse Resolution & Rule Merging.
 * 4. Per-Novel Slug Scoping & Custom Scope/Domain Editor.
 * 5. Monochrome Hollow Line UI System.
 */

(() => {
  const STORAGE_KEY_GLOBAL = 'adjusting_writing_style_dictionary';
  const STORAGE_KEY_SCOPES = 'adjusting_writing_style_scopes';

  // DOM Elements - Views & Navigation
  const appViewLabel = document.getElementById('app-view-label');
  const viewDictionary = document.getElementById('view-dictionary');
  const viewAIAssistant = document.getElementById('view-ai-assistant');

  const btnNavHome = document.getElementById('btn-nav-home');
  const btnNavAi = document.getElementById('btn-nav-ai');
  const btnNavApi = document.getElementById('btn-nav-api');
  const btnNavLogin = document.getElementById('btn-nav-login');
  const loginLabel = document.getElementById('login-label');

  // DOM Elements - API Token Modal
  const apiModalPanel = document.getElementById('api-modal-panel');
  const btnCloseApiModal = document.getElementById('btn-close-api-modal');
  const apiStatusBadge = document.getElementById('api-status-badge');
  const selectAiProvider = document.getElementById('select-ai-provider');
  const customEndpointGroup = document.getElementById('custom-endpoint-group');
  const inputCustomEndpoint = document.getElementById('input-custom-endpoint');
  const inputApiToken = document.getElementById('input-api-token');
  const btnToggleTokenVisibility = document.getElementById('btn-toggle-token-visibility');
  const btnSaveApiToken = document.getElementById('btn-save-api-token');
  const btnRemoveApiToken = document.getElementById('btn-remove-api-token');

  // DOM Elements - AI Assistant View
  const checkAiChapterContext = document.getElementById('check-ai-chapter-context');
  const inputAiPrompt = document.getElementById('input-ai-prompt');
  const btnAiSubmit = document.getElementById('btn-ai-submit');
  const aiTokenWarning = document.getElementById('ai-token-warning');
  const aiLoader = document.getElementById('ai-loader');
  const btnCopyAiOutput = document.getElementById('btn-copy-ai-output');
  const btnClearAiOutput = document.getElementById('btn-clear-ai-output');
  const aiPlaceholder = document.getElementById('ai-placeholder');
  const aiResponseText = document.getElementById('ai-response-text');
  const aiChips = document.querySelectorAll('.btn-chip');

  // DOM Elements - Scope & Dictionary View
  const scopeDisplayText = document.getElementById('scope-display-text');
  const btnToggleScopeEdit = document.getElementById('btn-toggle-scope-edit');
  const scopeEditPanel = document.getElementById('scope-edit-panel');
  const inputScopePattern = document.getElementById('input-scope-pattern');
  const btnSaveScope = document.getElementById('btn-save-scope');
  const btnCancelScope = document.getElementById('btn-cancel-scope');

  const tabScopeNovel = document.getElementById('tab-scope-novel');
  const tabScopeGlobal = document.getElementById('tab-scope-global');

  const searchNavBar = document.getElementById('search-nav-bar');
  const matchCounterBadge = document.getElementById('match-counter-badge');
  const btnPrevMatch = document.getElementById('btn-prev-match');
  const btnNextMatch = document.getElementById('btn-next-match');

  const formAddTerm = document.getElementById('form-add-term');
  const inputOriginal = document.getElementById('input-original');
  const inputReplacement = document.getElementById('input-replacement');
  const checkPreserveCase = document.getElementById('check-preserve-case');

  const inputFilterTerms = document.getElementById('input-filter-terms');
  const termListContainer = document.getElementById('term-list-container');
  const termCountEl = document.getElementById('term-count');
  const emptyStateEl = document.getElementById('empty-state');
  const btnClearAll = document.getElementById('btn-clear-all');
  const feedbackBanner = document.getElementById('feedback-banner');

  const btnImport = document.getElementById('btn-import');
  const fileImportInput = document.getElementById('file-import-input');
  const btnExport = document.getElementById('btn-export');

  // State
  let globalDictionary = [];
  let scopeDictionaries = {};
  let currentScopeMode = 'NOVEL';
  let activeScopePattern = '';
  let activeTabUrl = '';
  let currentHostname = 'Reading page';
  let isLoggedIn = false;
  let searchDebounceTimer = null;
  let currentFilterQuery = '';

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
  // 2. URL PATTERN EXTRACTION & NORMALIZATION
  // ==========================================
  function normalizeUrl(url) {
    if (!url) return '';
    return url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  function matchUrlPattern(urlStr, pattern) {
    if (!urlStr || !pattern) return false;
    try {
      const normUrl = normalizeUrl(urlStr);
      const normPattern = normalizeUrl(pattern);

      if (normPattern === '*' || normPattern === 'all') return true;

      if (normPattern.startsWith('*.')) {
        const rest = normPattern.slice(2);
        const slashIdx = rest.indexOf('/');
        const domainSuffix = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
        const pathSuffix = slashIdx === -1 ? '' : rest.slice(slashIdx);

        const urlSlashIdx = normUrl.indexOf('/');
        const urlHost = urlSlashIdx === -1 ? normUrl : normUrl.slice(0, urlSlashIdx);
        const urlPath = urlSlashIdx === -1 ? '' : normUrl.slice(urlSlashIdx);

        const hostMatches = urlHost === domainSuffix || urlHost.endsWith('.' + domainSuffix);
        if (!hostMatches) return false;
        if (!pathSuffix || pathSuffix === '/*') return true;
        if (pathSuffix.endsWith('/*')) {
          const prefix = pathSuffix.slice(0, -2);
          return urlPath === prefix || urlPath.startsWith(prefix + '/');
        }
        return urlPath === pathSuffix;
      }

      if (normPattern.endsWith('/*')) {
        const prefix = normPattern.slice(0, -2);
        return normUrl === prefix || normUrl.startsWith(prefix + '/');
      }
      if (normPattern.endsWith('*')) {
        const prefix = normPattern.slice(0, -1);
        return normUrl.startsWith(prefix);
      }
      return normUrl === normPattern;
    } catch (e) {
      return false;
    }
  }

  function extractPatternFromUrl(urlStr) {
    if (!urlStr) return 'reading-site/*';
    try {
      const url = new URL(urlStr);
      if (url.protocol.startsWith('chrome') || url.protocol.startsWith('edge') || url.protocol === 'about:') {
        return 'reading-site/*';
      }
      const host = url.hostname;
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        segments.pop(); // Remove chapter slug (e.g. c636660-chuong-635-vi-giai)
      }
      if (segments.length > 0) {
        return `${host}/${segments.join('/')}/*`;
      }
      return `${host}/*`;
    } catch (e) {
      return 'reading-site/*';
    }
  }

  // ==========================================
  // 3. FEEDBACK BANNER
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
  // 4. LIVE MATCH SEARCH & IN-PAGE HIGHLIGHT
  // ==========================================
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function triggerLiveSearch(text) {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    if (!text || !text.trim()) {
      searchNavBar.style.display = 'none';
      sendTabMessage({ action: 'CLEAR_HIGHLIGHTS' });
      return;
    }

    searchDebounceTimer = setTimeout(() => {
      sendTabMessage({ action: 'SEARCH_TERM', query: text.trim() }, (response) => {
        if (!response || typeof response.count === 'undefined') {
          searchNavBar.style.display = 'none';
          return;
        }

        searchNavBar.style.display = 'flex';
        const count = response.count || 0;
        const current = response.currentIndex || (count > 0 ? 1 : 0);

        if (count > 0) {
          matchCounterBadge.className = 'match-badge found';
          matchCounterBadge.textContent = `${current} / ${count} ${count === 1 ? 'match' : 'matches'}`;
        } else {
          matchCounterBadge.className = 'match-badge not-found';
          matchCounterBadge.textContent = '0 matches';
        }
      });
    }, 60);
  }

  function navigateMatch(direction) {
    sendTabMessage({ action: 'NAVIGATE_SEARCH_MATCH', direction: direction }, (res) => {
      if (res && res.count > 0) {
        matchCounterBadge.className = 'match-badge found';
        matchCounterBadge.textContent = `${res.currentIndex} / ${res.count} ${res.count === 1 ? 'match' : 'matches'}`;
      }
    });
  }

  // ==========================================
  // 5. AUTOMATED REVERSE RESOLUTION & MERGING
  // ==========================================
  function resolveToPristineSource(rawFrom, currentDict) {
    const fromLower = rawFrom.trim().toLowerCase();

    // 1. Direct chain match (A -> B, now user enters B)
    const reverseMatch = currentDict.find(d => d.to.toLowerCase() === fromLower);
    if (reverseMatch) {
      return {
        type: 'DIRECT_CHAIN',
        pristineFrom: reverseMatch.from,
        existingRule: reverseMatch
      };
    }

    // 2. Substring resolution (phrase contains a translated substring)
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
  // 6. TERM ACTIONS
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
      const idx = currentList.findIndex(d => d.from.toLowerCase() === finalFrom.toLowerCase());
      if (idx >= 0) {
        currentList.splice(idx, 1);
        await saveCurrentActiveList(currentList);
        renderList();
        notifyContentScript();
        showFeedback(`Reverted to pristine: "${finalFrom}" restored.`);
        inputOriginal.value = '';
        inputReplacement.value = '';
        searchNavBar.style.display = 'none';
        return;
      }
    }

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
    searchNavBar.style.display = 'none';
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
  // 7. RENDER TERM LIST
  // ==========================================
  function renderList() {
    const list = getCurrentActiveList();
    const query = currentFilterQuery.trim().toLowerCase();
    const filteredList = query
      ? list.filter(item => item.from.toLowerCase().includes(query) || item.to.toLowerCase().includes(query))
      : list;

    termCountEl.textContent = query ? `${filteredList.length}/${list.length}` : list.length;

    const rows = termListContainer.querySelectorAll('.term-row');
    rows.forEach(r => r.remove());

    if (list.length === 0) {
      emptyStateEl.style.display = 'flex';
      emptyStateEl.querySelector('.empty-title').textContent = 'No terms saved yet';
      emptyStateEl.querySelector('.empty-desc').textContent = 'Add a term pair above or click Import to load from a .txt file.';
      btnClearAll.style.display = 'none';
      return;
    }

    if (filteredList.length === 0) {
      emptyStateEl.style.display = 'flex';
      emptyStateEl.querySelector('.empty-title').textContent = 'No matching terms';
      emptyStateEl.querySelector('.empty-desc').textContent = `No terms in this list match "${currentFilterQuery}".`;
      btnClearAll.style.display = 'inline-block';
      return;
    }

    emptyStateEl.style.display = 'none';
    btnClearAll.style.display = 'inline-block';

    filteredList.forEach((item) => {
      const realIndex = list.indexOf(item);
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
        removeTerm(realIndex);
      });

      row.appendChild(pairContent);
      row.appendChild(btnRemove);
      termListContainer.appendChild(row);
    });
  }

  // ==========================================
  // 8. SCOPE MANAGEMENT & CUSTOM DOMAIN EDIT
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
  // 9. TAB QUERY & MESSAGING WITH AUTO-INJECTION
  // ==========================================
  function getActiveTab(callback) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tab = tabs && tabs.find(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'));
        if (tab) {
          callback(tab);
          return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs2) => {
          const tab2 = tabs2 && tabs2.find(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'));
          callback(tab2 || (tabs2 && tabs2[0]) || null);
        });
      });
    } else {
      callback(null);
    }
  }

  function sendTabMessage(payload, callback) {
    getActiveTab((tab) => {
      if (!tab || !tab.id) {
        if (callback) callback(null);
        return;
      }

      const tabId = tab.id;
      chrome.tabs.sendMessage(tabId, payload, (res) => {
        if (chrome.runtime.lastError) {
          // Auto-inject content script into pre-existing tabs
          if (typeof chrome.scripting !== 'undefined') {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                if (callback) callback(null);
                return;
              }
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, payload, (retryRes) => {
                  if (chrome.runtime.lastError) {
                    if (callback) callback(null);
                  } else if (callback) {
                    callback(retryRes);
                  }
                });
              }, 80);
            });
            return;
          }
          if (callback) callback(null);
          return;
        }
        if (callback) callback(res);
      });
    });
  }

  function notifyContentScript() {
    sendTabMessage({
      action: 'APPLY_DICTIONARY',
      dictionary: getCurrentActiveList()
    });
  }

  // ==========================================
  // 10. NAVBAR, VIEW SWITCHING & API TOKEN MANAGEMENT
  // ==========================================
  function switchView(viewName) {
    if (viewName === 'AI') {
      viewDictionary.style.display = 'none';
      viewAIAssistant.style.display = 'flex';
      btnNavHome.classList.remove('active');
      btnNavAi.classList.add('active');
      appViewLabel.textContent = 'AI Studio';
      checkAiTokenStatus();
    } else {
      viewAIAssistant.style.display = 'none';
      viewDictionary.style.display = 'flex';
      btnNavAi.classList.remove('active');
      btnNavHome.classList.add('active');
      appViewLabel.textContent = 'Term Replacer';
    }
  }

  btnNavHome.addEventListener('click', () => {
    switchView('DICTIONARY');
  });

  btnNavAi.addEventListener('click', () => {
    switchView('AI');
  });

  async function checkAiTokenStatus() {
    if (typeof AIAssistant === 'undefined') return;
    const token = await AIAssistant.getToken();
    if (token) {
      apiStatusBadge.textContent = 'Configured';
      apiStatusBadge.className = 'badge-status configured';
      if (aiTokenWarning) aiTokenWarning.style.display = 'none';
    } else {
      apiStatusBadge.textContent = 'No Token';
      apiStatusBadge.className = 'badge-status unconfigured';
      if (aiTokenWarning) aiTokenWarning.style.display = 'inline';
    }
  }

  async function openApiModal() {
    if (typeof AIAssistant === 'undefined') return;
    const token = await AIAssistant.getToken();
    const config = await AIAssistant.getConfig();

    inputApiToken.value = token;
    const providerKey = `${config.provider}:${config.model}`;
    if (selectAiProvider.querySelector(`option[value="${providerKey}"]`)) {
      selectAiProvider.value = providerKey;
    }
    inputCustomEndpoint.value = config.customEndpoint || '';
    customEndpointGroup.style.display = config.provider === 'openai' && config.model === 'custom' ? 'flex' : 'none';

    await checkAiTokenStatus();
    apiModalPanel.style.display = 'block';
  }

  function closeApiModal() {
    apiModalPanel.style.display = 'none';
  }

  btnNavApi.addEventListener('click', () => {
    const isVisible = apiModalPanel.style.display === 'block';
    if (isVisible) {
      closeApiModal();
    } else {
      openApiModal();
    }
  });

  btnCloseApiModal.addEventListener('click', closeApiModal);

  selectAiProvider.addEventListener('change', (e) => {
    const val = e.target.value;
    customEndpointGroup.style.display = val === 'openai:custom' ? 'flex' : 'none';
  });

  btnToggleTokenVisibility.addEventListener('click', () => {
    const isPassword = inputApiToken.type === 'password';
    inputApiToken.type = isPassword ? 'text' : 'password';
    btnToggleTokenVisibility.textContent = isPassword ? 'Hide' : 'Show';
  });

  btnSaveApiToken.addEventListener('click', async () => {
    if (typeof AIAssistant === 'undefined') return;
    const token = inputApiToken.value.trim();
    if (!token) {
      showFeedback('Please enter an API token.', 'error');
      return;
    }

    const [provider, model] = selectAiProvider.value.split(':');
    const customEndpoint = inputCustomEndpoint.value.trim();

    await AIAssistant.saveToken(token);
    await AIAssistant.saveConfig({ provider, model, customEndpoint });
    await checkAiTokenStatus();
    showFeedback('API Token & configuration saved.');
    closeApiModal();
  });

  btnRemoveApiToken.addEventListener('click', async () => {
    if (typeof AIAssistant === 'undefined') return;
    if (confirm('Are you sure you want to remove the API token?')) {
      await AIAssistant.removeToken();
      inputApiToken.value = '';
      await checkAiTokenStatus();
      showFeedback('API token removed.');
    }
  });

  btnNavLogin.addEventListener('click', () => {
    if (!isLoggedIn) {
      const username = prompt('Enter your username or email for cloud sync:');
      if (username && username.trim()) {
        isLoggedIn = true;
        loginLabel.textContent = username.trim().split('@')[0];
        btnNavLogin.title = `Logged in: ${username.trim()}`;
        showFeedback(`Welcome, ${username.trim()}! Cloud sync enabled.`);
      }
    } else {
      if (confirm('Do you want to sign out of this account?')) {
        isLoggedIn = false;
        loginLabel.textContent = 'Login';
        btnNavLogin.title = 'Sign in';
        showFeedback('Signed out.');
      }
    }
  });

  // ==========================================
  // AI ASSISTANT PANEL EVENTS
  // ==========================================
  aiChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const template = chip.getAttribute('data-prompt');
      if (template) {
        inputAiPrompt.value = template;
        inputAiPrompt.focus();
      }
    });
  });

  btnAiSubmit.addEventListener('click', async () => {
    if (typeof AIAssistant === 'undefined') return;
    const promptText = inputAiPrompt.value.trim();
    if (!promptText) {
      showFeedback('Please enter a prompt or instruction.', 'error');
      inputAiPrompt.focus();
      return;
    }

    const token = await AIAssistant.getToken();
    if (!token) {
      showFeedback('Please configure your API token first.', 'error');
      openApiModal();
      return;
    }

    aiPlaceholder.style.display = 'none';
    aiResponseText.style.display = 'block';
    aiResponseText.textContent = '';
    aiLoader.style.display = 'inline';
    btnAiSubmit.disabled = true;

    try {
      const result = await AIAssistant.generateResponse(promptText, checkAiChapterContext.checked);
      aiResponseText.textContent = result;
      showFeedback('Response received from AI.');
    } catch (err) {
      aiResponseText.textContent = `Error: ${err.message || 'Failed to generate response.'}`;
      showFeedback(err.message || 'Error occurred.', 'error');
    } finally {
      aiLoader.style.display = 'none';
      btnAiSubmit.disabled = false;
    }
  });

  btnCopyAiOutput.addEventListener('click', () => {
    const text = aiResponseText.textContent.trim();
    if (!text) {
      showFeedback('No response content to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showFeedback('Response copied to clipboard.');
    });
  });

  btnClearAiOutput.addEventListener('click', () => {
    aiResponseText.textContent = '';
    aiResponseText.style.display = 'none';
    aiPlaceholder.style.display = 'flex';
    inputAiPrompt.value = '';
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
  // 11. EVENT LISTENERS & INITIALIZATION
  // ==========================================
  inputOriginal.addEventListener('input', (e) => {
    triggerLiveSearch(e.target.value);
  });

  inputOriginal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (searchNavBar.style.display !== 'none') {
        e.preventDefault();
        navigateMatch('next');
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      if (searchNavBar.style.display !== 'none') {
        e.preventDefault();
        navigateMatch('prev');
      }
    } else if (e.key === 'Escape') {
      searchNavBar.style.display = 'none';
      sendTabMessage({ action: 'CLEAR_HIGHLIGHTS' });
    }
  });

  btnPrevMatch.addEventListener('click', () => navigateMatch('prev'));
  btnNextMatch.addEventListener('click', () => navigateMatch('next'));

  inputFilterTerms.addEventListener('input', (e) => {
    currentFilterQuery = e.target.value;
    renderList();
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

    // Migrate old scope keys with http:// or https:// to clean normalized keys
    let migrated = false;
    for (const [key, val] of Object.entries(scopeDictionaries)) {
      if (/^https?:\/\//i.test(key)) {
        const cleanKey = key.replace(/^https?:\/\//i, '');
        if (!scopeDictionaries[cleanKey]) {
          scopeDictionaries[cleanKey] = val;
        } else {
          // Merge terms
          const existingList = scopeDictionaries[cleanKey];
          val.forEach(item => {
            if (!existingList.some(e => e.from.toLowerCase() === item.from.toLowerCase())) {
              existingList.push(item);
            }
          });
        }
        delete scopeDictionaries[key];
        migrated = true;
      }
    }
    if (migrated) {
      await StorageAdapter.saveScopes(scopeDictionaries);
    }

    getActiveTab((tab) => {
      if (tab && tab.url) {
        activeTabUrl = tab.url;
        try {
          currentHostname = new URL(activeTabUrl).hostname;
        } catch (e) {
          currentHostname = 'Reading page';
        }

        // Check if an existing scope pattern matches the current URL
        const matchedScope = Object.keys(scopeDictionaries)
          .filter(p => matchUrlPattern(activeTabUrl, p))
          .sort((a, b) => b.length - a.length)[0];

        if (matchedScope) {
          activeScopePattern = matchedScope;
        } else {
          activeScopePattern = extractPatternFromUrl(activeTabUrl);
        }
      } else {
        activeScopePattern = 'reading-site/*';
      }

      updateScopeUI();
      // Ensure the content script receives and applies the dictionary immediately
      notifyContentScript();
      checkAiTokenStatus();
    });
  }

  init();
})();
