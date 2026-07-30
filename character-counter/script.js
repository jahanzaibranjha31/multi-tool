'use strict';

/* ============================================================
   Character Counter — core application logic
   No frameworks, no build step. Pure vanilla JS.
   ============================================================ */

(function () {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    textarea: $('#textInput'),
    dropZone: $('#dropZone'),
    fileInput: $('#fileInput'),
    statusPill: $('#statusPill'),
    limitSelect: $('#limitSelect'),
    limitHint: $('#charLimitHint'),
    toast: $('#toast'),

    statChars: $('#statChars'),
    statWords: $('#statWords'),
    statSentences: $('#statSentences'),
    statParagraphs: $('#statParagraphs'),

    charsWith: $('#charsWith'),
    charsWithout: $('#charsWithout'),
    statWhitespace: $('#statWhitespace'),
    statNumbers: $('#statNumbers'),
    statPunctuation: $('#statPunctuation'),
    statEmoji: $('#statEmoji'),

    statLines: $('#statLines'),
    statAvgLen: $('#statAvgLen'),
    statLongest: $('#statLongest'),
    statShortest: $('#statShortest'),
    statReading: $('#statReading'),
    statSpeaking: $('#statSpeaking'),

    keywordList: $('#keywordList'),
    freqChart: $('#freqChart'),
    themeToggle: $('#themeToggle'),
  };

  const STOP_WORDS = new Set([
    'the','and','that','have','for','not','with','you','this','but','his','from','they',
    'she','will','would','there','their','what','about','which','when','make','like','time',
    'just','know','take','into','your','some','could','them','than','then','look','only',
    'come','over','think','also','back','after','use','two','how','our','work','well','way',
    'even','new','want','because','any','these','give','day','most','are','was','were','been',
    'has','had','does','did','doing','can','shall','should','might','must','let','ought'
  ]);

  const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

  let debounceTimer = null;
  let statusTimer = null;

  /* ---------------- Core analysis ---------------- */

  function analyze(text) {
    const withSpaces = text.length;
    const withoutSpaces = text.replace(/\s/g, '').length;
    const whitespace = withSpaces - withoutSpaces;

    const numbers = (text.match(/[0-9]/g) || []).length;
    const punctuation = (text.match(/[.,/#!$%^&*;:{}=\-_`~()"'?¿¡…—–„“”‘’]/g) || []).length;
    const emoji = (text.match(EMOJI_REGEX) || []).length;

    const wordTokens = text.trim().length ? text.trim().split(/\s+/) : [];
    const words = wordTokens.filter(Boolean);
    const wordCount = words.length;

    const cleanedWords = words.map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean);
    const avgLen = cleanedWords.length
      ? (cleanedWords.reduce((sum, w) => sum + w.length, 0) / cleanedWords.length)
      : 0;

    let longest = '', shortest = '';
    cleanedWords.forEach((w) => {
      if (w.length > longest.length) longest = w;
      if (!shortest || w.length < shortest.length) shortest = w;
    });

    const sentenceMatches = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [];
    const sentenceCount = sentenceMatches.map(s => s.trim()).filter(Boolean).length;

    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const paragraphCount = paragraphs.length || (text.trim() ? 1 : 0);

    const lineCount = text.length ? text.split('\n').length : 0;

    const readingSeconds = Math.ceil((wordCount / 225) * 60);
    const speakingSeconds = Math.ceil((wordCount / 140) * 60);

    // Keyword density (words with 4+ letters, not stop-words)
    const freqMap = new Map();
    cleanedWords.forEach((w) => {
      const lw = w.toLowerCase();
      if (lw.length < 4 || STOP_WORDS.has(lw)) return;
      freqMap.set(lw, (freqMap.get(lw) || 0) + 1);
    });
    const topKeywords = [...freqMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => ({ word, count, pct: wordCount ? (count / wordCount) * 100 : 0 }));

    // Letter frequency (a-z)
    const letterFreq = {};
    for (let i = 97; i <= 122; i++) letterFreq[String.fromCharCode(i)] = 0;
    for (const ch of text.toLowerCase()) {
      if (letterFreq[ch] !== undefined) letterFreq[ch]++;
    }

    return {
      withSpaces, withoutSpaces, whitespace, numbers, punctuation, emoji,
      wordCount, avgLen, longest, shortest,
      sentenceCount, paragraphCount, lineCount,
      readingSeconds, speakingSeconds, topKeywords, letterFreq,
    };
  }

  /* ---------------- Rendering ---------------- */

  function formatTime(seconds) {
    if (seconds < 60) return `${seconds} sec`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s} sec` : `${m} min`;
  }

  function animateCount(el, newValue) {
    const prev = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (prev === newValue) return;
    el.setAttribute('data-count', newValue);
    const duration = 320;
    const start = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(prev + (newValue - prev) * eased);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderKeywords(topKeywords) {
    els.keywordList.innerHTML = '';
    if (!topKeywords.length) {
      const li = document.createElement('li');
      li.className = 'empty-state';
      li.textContent = 'Start typing to see keyword density';
      els.keywordList.appendChild(li);
      return;
    }
    const max = topKeywords[0].count;
    topKeywords.forEach(({ word, count, pct }) => {
      const li = document.createElement('li');
      const barWidth = Math.max(6, (count / max) * 100);
      li.innerHTML = `
        <span class="kw-name">${escapeHtml(word)}</span>
        <span class="kw-bar-track"><span class="kw-bar" style="width:${barWidth}%"></span></span>
        <span class="kw-pct">${pct.toFixed(1)}%</span>
      `;
      els.keywordList.appendChild(li);
    });
  }

  function renderFreqChart(letterFreq) {
    const entries = Object.entries(letterFreq);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    els.freqChart.innerHTML = '';
    entries.forEach(([letter, count]) => {
      const bar = document.createElement('div');
      bar.className = 'freq-bar';
      const heightPct = (count / max) * 100;
      bar.style.height = `${Math.max(2, heightPct)}%`;
      bar.title = `${letter}: ${count}`;
      if (heightPct > 15) {
        const label = document.createElement('span');
        label.textContent = letter;
        bar.appendChild(label);
      }
      els.freqChart.appendChild(bar);
    });
  }

  function checkLimit(text) {
    const limit = parseInt(els.limitSelect.value, 10);
    if (!limit) { els.limitHint.textContent = ''; els.limitHint.className = 'limit-hint'; return; }
    const used = text.length;
    const remaining = limit - used;
    els.limitHint.className = 'limit-hint';
    if (remaining < 0) {
      els.limitHint.textContent = `${Math.abs(remaining).toLocaleString()} characters over the limit`;
      els.limitHint.classList.add('over');
    } else if (remaining <= limit * 0.1) {
      els.limitHint.textContent = `${remaining.toLocaleString()} characters remaining`;
      els.limitHint.classList.add('near');
    } else {
      els.limitHint.textContent = `${remaining.toLocaleString()} characters remaining`;
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setStatus(message, isTransient) {
    els.statusPill.textContent = message;
    if (isTransient) {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { els.statusPill.textContent = 'Ready'; }, 1600);
    }
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  /* ---------------- Main update loop ---------------- */

  function update() {
    const text = els.textarea.value;
    const a = analyze(text);

    animateCount(els.statChars, a.withSpaces);
    animateCount(els.statWords, a.wordCount);
    animateCount(els.statSentences, a.sentenceCount);
    animateCount(els.statParagraphs, a.paragraphCount);

    els.charsWith.textContent = a.withSpaces.toLocaleString();
    els.charsWithout.textContent = a.withoutSpaces.toLocaleString();
    els.statWhitespace.textContent = a.whitespace.toLocaleString();
    els.statNumbers.textContent = a.numbers.toLocaleString();
    els.statPunctuation.textContent = a.punctuation.toLocaleString();
    els.statEmoji.textContent = a.emoji.toLocaleString();

    els.statLines.textContent = a.lineCount.toLocaleString();
    els.statAvgLen.textContent = a.avgLen.toFixed(1);
    els.statLongest.textContent = a.longest || '–';
    els.statShortest.textContent = a.shortest || '–';
    els.statReading.textContent = formatTime(a.readingSeconds);
    els.statSpeaking.textContent = formatTime(a.speakingSeconds);

    renderKeywords(a.topKeywords);
    renderFreqChart(a.letterFreq);
    checkLimit(text);

    autoResize();
    setStatus('Saved', true);
  }

  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    setStatus('Typing…');
    debounceTimer = setTimeout(update, 120);
  }

  function autoResize() {
    els.textarea.style.height = 'auto';
    els.textarea.style.height = Math.min(600, Math.max(320, els.textarea.scrollHeight)) + 'px';
  }

  /* ---------------- Actions ---------------- */

  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText();
      els.textarea.value += text;
      update();
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied — paste manually with Ctrl+V');
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(els.textarea.value);
      showToast('Text copied to clipboard');
    } catch {
      els.textarea.select();
      document.execCommand('copy');
      showToast('Text copied to clipboard');
    }
  }

  function clearText() {
    if (!els.textarea.value) return;
    els.textarea.value = '';
    update();
    els.textarea.focus();
    showToast('Text cleared');
  }

  function downloadText() {
    const blob = new Blob([els.textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-counter-text.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded as .txt');
  }

  function printReport() {
    window.print();
  }

  async function shareText() {
    const text = els.textarea.value;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Character Counter', text });
        return;
      } catch { /* user cancelled */ }
    }
    copyText();
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      showToast('Only .txt files are supported');
      return;
    }
    const reader = new FileReader();
    setStatus('Loading file…');
    reader.onload = (e) => {
      els.textarea.value = e.target.result;
      update();
      showToast(`Loaded ${file.name}`);
    };
    reader.onerror = () => showToast('Could not read that file');
    reader.readAsText(file);
  }

  /* ---------------- Theme ---------------- */

  function initTheme() {
    const saved = localStorage.getItem('cc-theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefersLight ? 'light' : 'dark');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      els.themeToggle.setAttribute('aria-pressed', 'true');
      els.themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    } else {
      document.documentElement.removeAttribute('data-theme');
      els.themeToggle.setAttribute('aria-pressed', 'false');
      els.themeToggle.setAttribute('aria-label', 'Switch to light mode');
    }
    localStorage.setItem('cc-theme', theme);
  }

  function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  }

  /* ---------------- Event wiring ---------------- */

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();

    els.textarea.addEventListener('input', debouncedUpdate);
    els.limitSelect.addEventListener('change', () => checkLimit(els.textarea.value));

    $('#btnPaste').addEventListener('click', pasteText);
    $('#btnCopy').addEventListener('click', copyText);
    $('#btnClear').addEventListener('click', clearText);
    $('#btnDownload').addEventListener('click', downloadText);
    $('#btnPrint').addEventListener('click', printReport);
    $('#btnShare').addEventListener('click', shareText);
    $('#btnUpload').addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    // Drag and drop
    ['dragenter', 'dragover'].forEach((evt) =>
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        els.dropZone.classList.add('dragging');
      })
    );
    ['dragleave', 'drop'].forEach((evt) =>
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === 'drop') handleFile(e.dataTransfer.files[0]);
        els.dropZone.classList.remove('dragging');
      })
    );

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'v') { e.preventDefault(); pasteText(); }
      else if (key === 'c') { e.preventDefault(); copyText(); }
      else if (key === 'x') { e.preventDefault(); clearText(); }
    });

    els.themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
