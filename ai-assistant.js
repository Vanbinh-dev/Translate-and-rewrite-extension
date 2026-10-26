/**
 * Adjusting Writing Style - AI Assistant Module
 * Handles API key management (store/revoke), payload preparation,
 * chapter context extraction, and communication with AI model endpoints.
 */

(() => {
  const STORAGE_KEY_TOKEN = 'adjusting_writing_style_ai_token';
  const STORAGE_KEY_CONFIG = 'adjusting_writing_style_ai_config';

  const DEFAULT_CONFIG = {
    provider: 'gemini', // 'gemini' | 'openai'
    model: 'gemini-3.8-flash',
    customEndpoint: ''
  };

  const AIAssistant = {
    // ==========================================
    // 1. TOKEN & CONFIG STORAGE
    // ==========================================
    async getToken() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEY_TOKEN], (res) => {
            resolve(res[STORAGE_KEY_TOKEN] || '');
          });
        });
      }
      return localStorage.getItem(STORAGE_KEY_TOKEN) || '';
    },

    async saveToken(token) {
      const cleanToken = (token || '').trim();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: cleanToken }, resolve);
        });
      }
      localStorage.setItem(STORAGE_KEY_TOKEN, cleanToken);
    },

    async removeToken() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.remove([STORAGE_KEY_TOKEN], resolve);
        });
      }
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    },

    async getConfig() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEY_CONFIG], (res) => {
            resolve(Object.assign({}, DEFAULT_CONFIG, res[STORAGE_KEY_CONFIG] || {}));
          });
        });
      }
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      return raw ? Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw)) : DEFAULT_CONFIG;
    },

    async saveConfig(config) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY_CONFIG]: config }, resolve);
        });
      }
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    },

    // ==========================================
    // 2. ACTIVE TAB CONTEXT EXTRACTOR
    // ==========================================
    async getChapterContext() {
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
          resolve('');
          return;
        }

        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          const tab = tabs && tabs.find(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'));
          if (!tab || !tab.id) {
            resolve('');
            return;
          }

          if (typeof chrome.scripting !== 'undefined') {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const selection = window.getSelection().toString().trim();
                if (selection && selection.length > 20) {
                  return { type: 'selection', text: selection.slice(0, 4000) };
                }
                const contentEl = document.querySelector('#chapter-content') ||
                                  document.querySelector('.chapter-content') ||
                                  document.querySelector('article') ||
                                  document.body;
                const text = contentEl ? contentEl.innerText.trim() : '';
                return { type: 'chapter', text: text.slice(0, 4000) };
              }
            }, (results) => {
              if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                resolve('');
                return;
              }
              resolve(results[0].result.text || '');
            });
          } else {
            resolve('');
          }
        });
      });
    },

    // ==========================================
    // 3. API INVOCATION ENGINE
    // ==========================================
    async generateResponse(userPrompt, includeContext = false) {
      const token = await this.getToken();
      if (!token) {
        throw new Error('API token is missing. Please configure your API token first.');
      }

      const config = await this.getConfig();
      let contextText = '';
      if (includeContext) {
        contextText = await this.getChapterContext();
      }

      // Build system & user instruction
      let fullPrompt = userPrompt.trim();
      if (contextText) {
        fullPrompt += `\n\n---\n[Chapter Context Reference]:\n${contextText}\n---`;
      }

      if (config.provider === 'openai') {
        return this.callOpenAI(token, config, fullPrompt);
      }
      return this.callGemini(token, config, fullPrompt);
    },

    async callGemini(token, config, prompt) {
      const rawModel = config.model || 'gemini-3.8-flash';
      const cleanModel = rawModel.replace(/^models\//, '').trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(token)}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction: {
          parts: [{
            text: 'You are an expert translation, rewriting, and terminology consultant for web novel readers. Provide concise, elegant, and directly usable translations and terminology adjustments.'
          }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `Gemini API returned status ${response.status}`;
        throw new Error(msg);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No content returned by model.');
      }
      return text.trim();
    },

    async callOpenAI(token, config, prompt) {
      const endpoint = config.customEndpoint || 'https://api.openai.com/v1/chat/completions';
      const model = config.model || 'gpt-4o-mini';

      const payload = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert translation, rewriting, and terminology consultant for web novel readers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2048
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `API returned status ${response.status}`;
        throw new Error(msg);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('No content returned by model.');
      }
      return text.trim();
    }
  };

  // Expose module globally
  window.AIAssistant = AIAssistant;
})();
