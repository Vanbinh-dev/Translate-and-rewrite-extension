/**
 * Adjusting Writing Style - Universal Content Script
 * Scans DOM text nodes, listens for dynamic mutations, handles live search/highlighting,
 * and replaces terms in-place with zero layout shift.
 */

(() => {
  const STORAGE_KEY = 'adjusting_writing_style_dictionary';
  let activeDictionary = [];
  let isProcessing = false;

  // ==========================================
  // 1. CASE PRESERVATION ENGINE
  // ==========================================
  const CasePreserver = {
    detect(text) {
      if (!text) return 'LOWERCASE';
      if (text === text.toUpperCase() && text !== text.toLowerCase()) {
        return 'UPPERCASE';
      }
      if (text === text.toLowerCase() && text !== text.toUpperCase()) {
        return 'LOWERCASE';
      }
      const words = text.trim().split(/\s+/);
      const isTitle = words.length > 0 && words.every(w => {
        if (!w) return true;
        const first = w[0];
        const rest = w.slice(1);
        return first === first.toUpperCase() && rest === rest.toLowerCase();
      });
      if (isTitle) return 'TITLECASE';

      if (text[0] === text[0].toUpperCase() && text.slice(1) === text.slice(1).toLowerCase()) {
        return 'SENTENCECASE';
      }
      return 'ORIGINAL';
    },

    apply(replacement, pattern) {
      if (!replacement) return replacement;
      switch (pattern) {
        case 'UPPERCASE':
          return replacement.toUpperCase();
        case 'LOWERCASE':
          return replacement.toLowerCase();
        case 'TITLECASE':
          return replacement.split(/(\s+)/).map(w => {
            if (!w || /^\s+$/.test(w)) return w;
            return w[0].toUpperCase() + w.slice(1).toLowerCase();
          }).join('');
        case 'SENTENCECASE':
          return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
        default:
          return replacement;
      }
    }
  };

  // ==========================================
  // 2. HELPER FUNCTIONS
  // ==========================================
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function shouldFilterTag(node) {
    const tag = node.parentElement?.tagName;
    return tag === 'SCRIPT' || 
           tag === 'STYLE' || 
           tag === 'NOSCRIPT' || 
           tag === 'TEXTAREA' || 
           tag === 'INPUT' ||
           node.parentElement?.isContentEditable;
  }

  // ==========================================
  // 3. LIVE SEARCH & IN-PAGE HIGHLIGHT
  // ==========================================
  function clearSearchHighlights() {
    const marks = document.querySelectorAll('.novel-match-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });
  }

  function searchAndHighlight(query) {
    clearSearchHighlights();
    if (!query || !query.trim()) return { count: 0 };

    const trimmed = query.trim();
    const escaped = escapeRegExp(trimmed);
    const regex = new RegExp(escaped, 'gi');

    const root = document.querySelector('#chapter-content') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (shouldFilterTag(node)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.classList?.contains('novel-match-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const matchingNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (regex.test(node.nodeValue)) {
        matchingNodes.push(node);
      }
      regex.lastIndex = 0;
    }

    let totalMatches = 0;
    for (const textNode of matchingNodes) {
      const text = textNode.nodeValue;
      const parent = textNode.parentNode;
      if (!parent) continue;

      const fragment = document.createDocumentFragment();
      let lastIdx = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        totalMatches++;
        if (match.index > lastIdx) {
          fragment.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
        }

        const mark = document.createElement('mark');
        mark.className = 'novel-match-highlight';
        mark.style.cssText = 'background: rgba(254, 240, 138, 0.45); color: inherit; outline: 1px dashed rgba(202, 138, 4, 0.8); border-radius: 2px; padding: 0 1px;';
        mark.textContent = match[0];
        fragment.appendChild(mark);

        lastIdx = regex.lastIndex;
      }

      if (lastIdx < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
      }

      parent.replaceChild(fragment, textNode);
    }

    return { count: totalMatches };
  }

  // ==========================================
  // 4. CORE REPLACEMENT LOGIC
  // ==========================================
  function replaceTextInString(text, dict) {
    if (!text || dict.length === 0) return text;

    const pattern = new RegExp(
      dict.map(d => `(${escapeRegExp(d.from)})`).join('|'),
      'gi'
    );

    return text.replace(pattern, (matched) => {
      const entry = dict.find(d => d.from.toLowerCase() === matched.toLowerCase());
      if (!entry) return matched;

      if (entry.preserveCase !== false) {
        const detectedCase = CasePreserver.detect(matched);
        return CasePreserver.apply(entry.to, detectedCase);
      }
      return entry.to;
    });
  }

  function processTextNode(node, dict) {
    if (shouldFilterTag(node)) return false;
    const oldVal = node.nodeValue;
    const newVal = replaceTextInString(oldVal, dict);
    if (oldVal !== newVal) {
      node.nodeValue = newVal;
      return true;
    }
    return false;
  }

  function scanAndReplace(root = document.body) {
    if (!root || activeDictionary.length === 0) return;

    clearSearchHighlights();
    const sortedDict = [...activeDictionary].sort((a, b) => b.from.length - a.from.length);

    isProcessing = true;
    try {
      if (document.title && root === document.body) {
        const newTitle = replaceTextInString(document.title, sortedDict);
        if (document.title !== newTitle) document.title = newTitle;
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (shouldFilterTag(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let node;
      while ((node = walker.nextNode())) {
        processTextNode(node, sortedDict);
      }

      const noSelects = document.querySelectorAll('.no-select, [style*="user-select: none"]');
      noSelects.forEach(el => {
        el.classList.remove('no-select');
        el.style.userSelect = 'text';
      });
    } finally {
      isProcessing = false;
    }
  }

  // ==========================================
  // 5. MUTATION OBSERVER
  // ==========================================
  const observer = new MutationObserver((mutations) => {
    if (isProcessing || activeDictionary.length === 0) return;

    const sortedDict = [...activeDictionary].sort((a, b) => b.from.length - a.from.length);

    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.TEXT_NODE) {
          processTextNode(addedNode, sortedDict);
        } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
          scanAndReplace(addedNode);
        }
      }
    }
  });

  function startObserving() {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ==========================================
  // 6. SCOPE RESOLUTION & STORAGE
  // ==========================================
  function extractNovelEndpoint(urlStr = window.location.href) {
    try {
      const url = new URL(urlStr);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        segments.pop(); // Remove chapter slug
      }
      const basePath = '/' + segments.join('/');
      return {
        hostname: url.hostname,
        pattern: `${url.origin}${basePath}/*`,
        endpoint: `${url.origin}${basePath}`
      };
    } catch (e) {
      return null;
    }
  }

  function loadAndApply() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY, 'adjusting_writing_style_scopes'], (res) => {
        const globalDict = res[STORAGE_KEY] || [];
        const scopes = res['adjusting_writing_style_scopes'] || {};
        
        // Find matching scoped dictionary
        const currentUrl = window.location.href;
        let scopedDict = [];
        for (const [pattern, dict] of Object.entries(scopes)) {
          if (matchUrlPattern(currentUrl, pattern)) {
            scopedDict = dict;
            break;
          }
        }

        // Merge global and scoped dictionaries (scoped takes precedence)
        activeDictionary = [...scopedDict, ...globalDict];
        if (activeDictionary.length > 0) {
          scanAndReplace(document.body);
        }
      });
    }
  }

  function matchUrlPattern(urlStr, pattern) {
    if (!pattern) return false;
    try {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return urlStr.startsWith(prefix);
      }
      return urlStr === pattern;
    } catch (e) {
      return false;
    }
  }

  // ==========================================
  // 7. RUNTIME MESSAGING
  // ==========================================
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'APPLY_DICTIONARY') {
        activeDictionary = message.dictionary || [];
        scanAndReplace(document.body);
        sendResponse({ status: 'OK' });
      } else if (message.action === 'SEARCH_TERM') {
        const result = searchAndHighlight(message.query);
        sendResponse(result);
      } else if (message.action === 'CLEAR_HIGHLIGHTS') {
        clearSearchHighlights();
        sendResponse({ status: 'OK' });
      } else if (message.action === 'GET_PAGE_INFO') {
        const novelInfo = extractNovelEndpoint(window.location.href);
        sendResponse({
          url: window.location.href,
          hostname: window.location.hostname,
          novelInfo: novelInfo
        });
      }
      return true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadAndApply();
      startObserving();
    });
  } else {
    loadAndApply();
    startObserving();
  }
})();
