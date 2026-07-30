'use strict';

/* =========================================================
   Lorem Ipsum Generator — vanilla JS, no dependencies.
   ========================================================= */

(function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const els = {
    form: $('#loremForm'),
    amountInput: $('#amountInput'),
    amountLabel: $('#amountLabel'),
    typeButtons: $$('.seg-btn[data-type]'),
    formatButtons: $$('.seg-btn[data-format]'),
    startLoremToggle: $('#startLoremToggle'),
    randomizeToggle: $('#randomizeToggle'),
    headingToggle: $('#headingToggle'),
    outputStage: $('#outputStage'),
    statusNote: $('#statusNote'),
    statWords: $('#statWords'),
    statChars: $('#statChars'),
    statParas: $('#statParas'),
    statSentences: $('#statSentences'),
    statReading: $('#statReading'),
    copyBtn: $('#copyBtn'),
    downloadBtn: $('#downloadBtn'),
    printBtn: $('#printBtn'),
    clearBtn: $('#clearBtn'),
    resetBtn: $('#resetBtn'),
    themeToggle: $('#themeToggle'),
    toastRegion: $('#toastRegion'),
  };

  const WORD_BANK = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '
    + 'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud '
    + 'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure '
    + 'in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur '
    + 'sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim '
    + 'id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nam '
    + 'congue risus semper porta morbi at ante placerat ultricies mauris cursus vel '
    + 'vivamus fermentum semper porttitor nunc diam velit adipiscing ut tortor pretium '
    + 'viverra suspendisse potenti nullam ac tortor vitae purus faucibus ornare integer '
    + 'malesuada nunc vel risus commodo viverra maecenas accumsan lacus vel facilisis '
    + 'volutpat blandit aliquam etiam erat velit scelerisque in dictum non consectetur '
    + 'a erat nam quam nunc blandit vel luctus pulvinar hendrerit').split(' ');

  const state = {
    type: 'paragraphs',
    format: 'plain',
    lastPlainText: '',
    lastMarkup: '',
  };

  /* ---------------- theme ---------------- */
  const memStore = {};
  function safeGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return memStore[key] || null; } }
  function safeSet(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { memStore[key] = val; } }

  function initTheme() {
    applyTheme(safeGet('lorem-theme') || 'light');
    els.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      safeSet('lorem-theme', next);
    });
  }
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      els.themeToggle.setAttribute('aria-pressed', 'true');
      els.themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
      document.documentElement.removeAttribute('data-theme');
      els.themeToggle.setAttribute('aria-pressed', 'false');
      els.themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  /* ---------------- segmented controls ---------------- */
  function initSegments() {
    els.typeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.typeButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state.type = btn.dataset.type;
        updateAmountLabel();
      });
    });
    els.formatButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.formatButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state.format = btn.dataset.format;
      });
    });
  }

  function updateAmountLabel() {
    const labels = { paragraphs: 'Number of paragraphs', sentences: 'Number of sentences', words: 'Number of words', characters: 'Number of characters' };
    els.amountLabel.textContent = labels[state.type];
    const defaults = { paragraphs: 5, sentences: 8, words: 50, characters: 300 };
    if (!els.amountInput.dataset.touched) els.amountInput.value = defaults[state.type];
  }

  /* ---------------- random helpers ---------------- */
  function randomWord() {
    return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  }
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function buildSentence(wordCount) {
    const words = [];
    for (let i = 0; i < wordCount; i++) words.push(randomWord());
    let sentence = words.join(' ');
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
    return sentence;
  }

  function buildParagraph(sentenceCount, randomize) {
    const sentences = [];
    for (let i = 0; i < sentenceCount; i++) {
      const len = randomize ? randomInt(6, 18) : 12;
      sentences.push(buildSentence(len));
    }
    return sentences.join(' ');
  }

  /* ---------------- generation by type ---------------- */
  function generateParagraphs(count, randomize, startLorem) {
    const paras = [];
    for (let i = 0; i < count; i++) {
      const sCount = randomize ? randomInt(3, 8) : 5;
      let para = buildParagraph(sCount, randomize);
      if (i === 0 && startLorem) {
        para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + para;
      }
      paras.push(para);
    }
    return paras;
  }

  function generateSentences(count, randomize, startLorem) {
    const sentences = [];
    for (let i = 0; i < count; i++) {
      const len = randomize ? randomInt(6, 18) : 12;
      sentences.push(buildSentence(len));
    }
    if (startLorem) sentences[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    return sentences;
  }

  function generateWords(count, startLorem) {
    const words = [];
    if (startLorem) words.push('Lorem', 'ipsum');
    while (words.length < count) words.push(randomWord());
    return words.slice(0, count);
  }

  function generateCharacters(count, startLorem) {
    let text = startLorem ? 'Lorem ipsum dolor sit amet ' : '';
    while (text.length < count) text += randomWord() + ' ';
    return text.slice(0, count).trim();
  }

  /* ---------------- format output ---------------- */
  function toPlainAndMarkup(units, kind) {
    // units: array of strings (paragraphs or sentences) OR a single string (words/characters)
    if (kind === 'paragraphs') {
      const plain = units.join('\n\n');
      let markup;
      if (state.format === 'html-p') {
        markup = units.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
      } else if (state.format === 'html-li') {
        markup = `<ul>\n${units.map((p) => `  <li>${escapeHtml(p)}</li>`).join('\n')}\n</ul>`;
      } else {
        markup = null;
      }
      return { plain, markup };
    }
    if (kind === 'sentences') {
      const plain = units.join(' ');
      let markup;
      if (state.format === 'html-p') {
        markup = `<p>${escapeHtml(plain)}</p>`;
      } else if (state.format === 'html-li') {
        markup = `<ul>\n${units.map((s) => `  <li>${escapeHtml(s)}</li>`).join('\n')}\n</ul>`;
      } else {
        markup = null;
      }
      return { plain, markup };
    }
    // words / characters: units is a single string
    const plain = units;
    let markup = null;
    if (state.format === 'html-p') markup = `<p>${escapeHtml(plain)}</p>`;
    return { plain, markup };
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------------- validation ---------------- */
  function validateAmount(amount) {
    if (!Number.isInteger(amount) || amount < 1) return 'Please enter a number of at least 1.';
    const maxByType = { paragraphs: 500, sentences: 500, words: 5000, characters: 20000 };
    if (amount > maxByType[state.type]) return `Please request ${maxByType[state.type]} or fewer for ${state.type}.`;
    return null;
  }

  /* ---------------- run generation ---------------- */
  function runGeneration() {
    const amount = parseInt(els.amountInput.value, 10);
    const error = validateAmount(amount);
    if (error) { showToast(error, 'error'); return; }

    const startLorem = els.startLoremToggle.checked;
    const randomize = els.randomizeToggle.checked;
    const includeHeading = els.headingToggle.checked;

    els.outputStage.classList.add('is-loading');
    els.statusNote.textContent = 'Generating…';

    // Simulate a brief, honest loading moment for larger requests (no artificial delay for tiny ones)
    const run = () => {
      let plain = '', markup = null, paraCountForStats = 0, sentenceCountForStats = 0;

      if (state.type === 'paragraphs') {
        const paras = generateParagraphs(amount, randomize, startLorem);
        const out = toPlainAndMarkup(paras, 'paragraphs');
        plain = out.plain; markup = out.markup;
        paraCountForStats = paras.length;
        sentenceCountForStats = plain.split(/[.!?]+/).filter((s) => s.trim()).length;
      } else if (state.type === 'sentences') {
        const sentences = generateSentences(amount, randomize, startLorem);
        const out = toPlainAndMarkup(sentences, 'sentences');
        plain = out.plain; markup = out.markup;
        paraCountForStats = 1;
        sentenceCountForStats = sentences.length;
      } else if (state.type === 'words') {
        const words = generateWords(amount, startLorem);
        plain = words.join(' ');
        const out = toPlainAndMarkup(plain, 'words');
        markup = out.markup;
        paraCountForStats = 1;
        sentenceCountForStats = 1;
      } else {
        plain = generateCharacters(amount, startLorem);
        const out = toPlainAndMarkup(plain, 'characters');
        markup = out.markup;
        paraCountForStats = 1;
        sentenceCountForStats = 1;
      }

      state.lastPlainText = plain;
      state.lastMarkup = markup;

      renderOutput(plain, markup, includeHeading);
      updateStats(plain, paraCountForStats, sentenceCountForStats);

      els.outputStage.classList.remove('is-loading');
      els.statusNote.textContent = 'Generated';
      showToast('Lorem Ipsum generated.');
    };

    if (amount > 100) setTimeout(run, 180); else run();
  }

  /* ---------------- render ---------------- */
  function renderOutput(plain, markup, includeHeading) {
    els.outputStage.innerHTML = '';

    if (includeHeading) {
      const h = document.createElement('h2');
      h.className = 'gen-heading';
      h.textContent = 'Consectetur Adipiscing Elit';
      els.outputStage.appendChild(h);
    }

    if (state.format === 'plain' || !markup) {
      const pre = document.createElement('div');
      pre.style.whiteSpace = 'pre-wrap';
      pre.textContent = plain;
      els.outputStage.appendChild(pre);
    } else {
      const container = document.createElement('div');
      container.innerHTML = markup;
      els.outputStage.appendChild(container);
      const code = document.createElement('pre');
      code.className = 'markup-source';
      code.style.cssText = 'margin-top:16px;padding:12px;background:rgba(0,0,0,.04);border-radius:8px;font-family:var(--font-mono);font-size:.8rem;white-space:pre-wrap;overflow-wrap:anywhere;';
      code.textContent = markup;
      els.outputStage.appendChild(code);
    }
  }

  /* ---------------- stats ---------------- */
  function updateStats(plain, paraCount, sentenceCount) {
    const words = plain.trim() ? plain.trim().split(/\s+/).length : 0;
    const chars = plain.length;
    const readingSeconds = Math.max(1, Math.round((words / 200) * 60)); // ~200 wpm

    els.statWords.textContent = words.toLocaleString();
    els.statChars.textContent = chars.toLocaleString();
    els.statParas.textContent = String(paraCount);
    els.statSentences.textContent = String(sentenceCount);
    els.statReading.textContent = readingSeconds < 60 ? `${readingSeconds} sec` : `${Math.round(readingSeconds / 60)} min`;
  }

  function resetStats() {
    els.statWords.textContent = '0';
    els.statChars.textContent = '0';
    els.statParas.textContent = '0';
    els.statSentences.textContent = '0';
    els.statReading.textContent = '0 sec';
  }

  /* ---------------- toasts ---------------- */
  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' is-error' : '');
    toast.textContent = message;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    els.toastRegion.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function requireOutput() {
    if (!state.lastPlainText) { showToast('Generate text first.', 'error'); return false; }
    return true;
  }

  /* ---------------- toolbar ---------------- */
  function initToolbar() {
    els.form.addEventListener('submit', (e) => { e.preventDefault(); runGeneration(); });
    els.amountInput.addEventListener('input', () => { els.amountInput.dataset.touched = '1'; });

    els.copyBtn.addEventListener('click', () => {
      if (!requireOutput()) return;
      const text = (state.format !== 'plain' && state.lastMarkup) ? state.lastMarkup : state.lastPlainText;
      copyToClipboard(text);
      showToast('Copied to clipboard.');
    });

    els.downloadBtn.addEventListener('click', () => {
      if (!requireOutput()) return;
      const text = (state.format !== 'plain' && state.lastMarkup) ? state.lastMarkup : state.lastPlainText;
      const ext = state.format === 'plain' ? 'txt' : 'html';
      downloadFile(`lorem-ipsum.${ext}`, text);
    });

    els.printBtn.addEventListener('click', () => {
      if (!requireOutput()) return;
      window.print();
    });

    els.clearBtn.addEventListener('click', () => {
      state.lastPlainText = ''; state.lastMarkup = null;
      els.outputStage.innerHTML = '<p class="output-placeholder">Press Generate to fill this space with Lorem Ipsum.</p>';
      resetStats();
      els.statusNote.textContent = '';
    });

    els.resetBtn.addEventListener('click', () => {
      els.form.reset();
      delete els.amountInput.dataset.touched;
      els.typeButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      els.typeButtons[0].classList.add('is-active'); els.typeButtons[0].setAttribute('aria-pressed', 'true');
      els.formatButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      els.formatButtons[0].classList.add('is-active'); els.formatButtons[0].setAttribute('aria-pressed', 'true');
      state.type = 'paragraphs'; state.format = 'plain';
      updateAmountLabel();
      els.startLoremToggle.checked = true;
      els.randomizeToggle.checked = false;
      els.headingToggle.checked = false;
      state.lastPlainText = ''; state.lastMarkup = null;
      els.outputStage.innerHTML = '<p class="output-placeholder">Press Generate to fill this space with Lorem Ipsum.</p>';
      resetStats();
      els.statusNote.textContent = '';
      showToast('Everything reset.');
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------------- init ---------------- */
  function init() {
    initTheme();
    initSegments();
    initToolbar();
    updateAmountLabel();
    resetStats();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
