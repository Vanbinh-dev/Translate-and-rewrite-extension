/**
 * Adjusting Writing Style - Popup Controller
 * Quản lý giao diện, lưu trữ chrome.storage.local, nhập/xuất file .txt, và đồng bộ với Content Script.
 */

(() => {
  // Key lưu trữ trong chrome.storage
  const STORAGE_KEY = 'adjusting_writing_style_dictionary';

  // DOM Elements
  const siteHostnameEl = document.getElementById('site-hostname');
  const formAddTerm = document.getElementById('form-add-term');
  const inputOriginal = document.getElementById('input-original');
  const inputReplacement = document.getElementById('input-replacement');
  const checkPreserveCase = document.getElementById('check-preserve-case');
  const termListContainer = document.getElementById('term-list-container');
  const termCountEl = document.getElementById('term-count');
  const emptyStateEl = document.getElementById('empty-state');
  const btnClearAll = document.getElementById('btn-clear-all');
  const feedbackBanner = document.getElementById('feedback-banner');

  // Toolbar buttons
  const btnHome = document.getElementById('btn-home');
  const btnLogin = document.getElementById('btn-login');
  const loginLabel = document.getElementById('login-label');
  const btnImport = document.getElementById('btn-import');
  const fileImportInput = document.getElementById('file-import-input');
  const btnExport = document.getElementById('btn-export');

  // State
  let dictionary = []; // Mặc định không có sample data ban đầu
  let currentHostname = 'Trang đọc truyện';
  let isLoggedIn = false;

  // ==========================================
  // STORAGE ADAPTER (Chrome Storage + LocalStorage Fallback)
  // ==========================================
  const StorageAdapter = {
    async get() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEY], (result) => {
            resolve(result[STORAGE_KEY] || []);
          });
        });
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      }
    },

    async set(entries) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY]: entries }, resolve);
        });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      }
    }
  };

  // ==========================================
  // FEEDBACK NOTIFICATION
  // ==========================================
  let feedbackTimer = null;
  function showFeedback(message, type = 'success') {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackBanner.className = `feedback-banner ${type}`;
    feedbackBanner.textContent = message;
    feedbackBanner.style.display = 'block';

    feedbackTimer = setTimeout(() => {
      feedbackBanner.style.display = 'none';
    }, 2500);
  }

  // ==========================================
  // RENDER TERM LIST
  // ==========================================
  function renderList() {
    termCountEl.textContent = dictionary.length;

    // Xóa các row cũ, giữ lại emptyState
    const rows = termListContainer.querySelectorAll('.term-row');
    rows.forEach(r => r.remove());

    if (dictionary.length === 0) {
      emptyStateEl.style.display = 'flex';
      btnClearAll.style.display = 'none';
      return;
    }

    emptyStateEl.style.display = 'none';
    btnClearAll.style.display = 'inline-block';

    // Tạo các row
    dictionary.forEach((item, index) => {
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

      // Nút xóa
      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'btn-remove-term';
      btnRemove.title = `Xóa cụm từ "${item.from}"`;
      btnRemove.setAttribute('aria-label', `Xóa từ ${item.from}`);
      btnRemove.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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
  // TERM ACTIONS
  // ==========================================
  async function addTerm(from, to, preserveCase = true) {
    from = from.trim();
    to = to.trim();

    if (!from || !to) {
      showFeedback('Vui lòng nhập cả từ gốc và từ thay thế.', 'error');
      return;
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      showFeedback('Từ gốc và từ thay thế không được trùng nhau.', 'error');
      return;
    }

    // Kiểm tra trùng lặp
    const existingIndex = dictionary.findIndex(d => d.from.toLowerCase() === from.toLowerCase());
    if (existingIndex >= 0) {
      dictionary[existingIndex].to = to;
      dictionary[existingIndex].preserveCase = preserveCase;
      showFeedback(`Đã cập nhật: "${from}" ➜ "${to}"`);
    } else {
      dictionary.unshift({ from, to, preserveCase });
      showFeedback(`Đã thêm: "${from}" ➜ "${to}"`);
    }

    await StorageAdapter.set(dictionary);
    renderList();
    notifyContentScript();

    inputOriginal.value = '';
    inputReplacement.value = '';
    inputOriginal.focus();
  }

  async function removeTerm(index) {
    const removed = dictionary.splice(index, 1)[0];
    await StorageAdapter.set(dictionary);
    renderList();
    notifyContentScript();
    showFeedback(`Đã xóa cụm từ "${removed.from}"`);
  }

  async function clearAllTerms() {
    if (dictionary.length === 0) return;
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách từ điển này?')) {
      dictionary = [];
      await StorageAdapter.set(dictionary);
      renderList();
      notifyContentScript();
      showFeedback('Đã làm trống danh sách từ điển.');
    }
  }

  // ==========================================
  // SYNC WITH ACTIVE TAB (CONTENT SCRIPT)
  // ==========================================
  function notifyContentScript() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'APPLY_DICTIONARY',
            dictionary: dictionary
          }).catch(() => {
            // Tab có thể không có content script (vd: chrome://, settings...)
          });
        }
      });
    }
  }

  // ==========================================
  // DETECT ACTIVE HOSTNAME
  // ==========================================
  function detectActiveTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            currentHostname = url.hostname || 'Trang đọc truyện';
            siteHostnameEl.textContent = currentHostname;
          } catch (e) {
            siteHostnameEl.textContent = 'Trang web';
          }
        }
      });
    } else {
      siteHostnameEl.textContent = window.location.hostname || 'localhost';
    }
  }

  // ==========================================
  // TOOLBAR 4 BUTTONS IMPLEMENTATION
  // ==========================================

  // 1. Home Button
  btnHome.addEventListener('click', () => {
    termListContainer.scrollTop = 0;
    inputOriginal.focus();
    showFeedback('Đã quay về đầu danh sách từ điển.');
  });

  // 2. Login Button
  btnLogin.addEventListener('click', () => {
    if (!isLoggedIn) {
      const username = prompt('Nhập tên tài khoản hoặc email để đồng bộ từ điển:');
      if (username && username.trim()) {
        isLoggedIn = true;
        loginLabel.textContent = username.trim().split('@')[0];
        btnLogin.title = `Đã đăng nhập: ${username.trim()}`;
        showFeedback(`Xin chào, ${username.trim()}! Đã bật đồng bộ.`);
      }
    } else {
      if (confirm('Bạn có muốn đăng xuất khỏi tài khoản này?')) {
        isLoggedIn = false;
        loginLabel.textContent = 'Login';
        btnLogin.title = 'Đăng nhập tài khoản';
        showFeedback('Đã đăng xuất.');
      }
    }
  });

  // 3. Import Button (Text File)
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

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) continue;

        const parts = line.split(/\s*(?:->|-|=|:)\s*/);
        if (parts.length >= 2) {
          const from = parts[0].trim();
          const to = parts.slice(1).join('-').trim();
          if (from && to) {
            const existIdx = dictionary.findIndex(d => d.from.toLowerCase() === from.toLowerCase());
            if (existIdx >= 0) {
              dictionary[existIdx].to = to;
            } else {
              dictionary.push({ from, to, preserveCase: true });
            }
            count++;
          }
        }
      }

      await StorageAdapter.set(dictionary);
      renderList();
      notifyContentScript();
      showFeedback(`Đã nạp thành công ${count} cặp từ từ file!`);
      fileImportInput.value = ''; // Reset input file
    };

    reader.onerror = () => {
      showFeedback('Lỗi đọc file. Vui lòng thử lại.', 'error');
    };

    reader.readAsText(file, 'utf-8');
  });

  // 4. Export Button (Text File)
  btnExport.addEventListener('click', () => {
    if (dictionary.length === 0) {
      showFeedback('Danh sách trống, không có từ nào để xuất.', 'error');
      return;
    }

    const textLines = [
      `# TỪ ĐIỂN THUẬT NGỮ - ADJUSTING WRITING STYLE`,
      `# Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
      `# Định dạng: từ gốc - từ thay thế`,
      ''
    ];

    dictionary.forEach(d => {
      textLines.push(`${d.from} - ${d.to}`);
    });

    const fileContent = textLines.join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');

    const cleanHost = currentHostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    downloadAnchor.href = url;
    downloadAnchor.download = `dictionary-${cleanHost}.txt`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    showFeedback('Đã tải file từ điển về máy thành công!');
  });

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  formAddTerm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTerm(inputOriginal.value, inputReplacement.value, checkPreserveCase.checked);
  });

  btnClearAll.addEventListener('click', clearAllTerms);

  // Khởi động
  async function init() {
    detectActiveTab();
    dictionary = await StorageAdapter.get();
    renderList();
  }

  init();
})();
