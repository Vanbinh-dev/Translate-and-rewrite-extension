/**
 * Adjusting Writing Style - Universal Content Script
 * Scans DOM text nodes, listens for dynamic mutations, and replaces terms in-place.
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
  // 3. CORE REPLACEMENT LOGIC
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

    // Prioritize longer phrases before shorter substrings
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

      // Remove copy-protection overlays if present on reader sites
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
  // 4. MUTATION OBSERVER FOR DYNAMIC CONTENT
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
  // 5. STORAGE & MESSAGING LIFECYCLE
  // ==========================================
  function loadAndApply() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        activeDictionary = res[STORAGE_KEY] || [];
        if (activeDictionary.length > 0) {
          scanAndReplace(document.body);
        }
      });
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'APPLY_DICTIONARY') {
        activeDictionary = message.dictionary || [];
        scanAndReplace(document.body);
        sendResponse({ status: 'OK' });
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
