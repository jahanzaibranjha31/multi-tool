'use strict';

/* ============================================================
   Case Converter — core application logic
   No frameworks, no build step. Pure vanilla JS.
   ============================================================ */

(function () {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    textarea: $('#textInput'),
    output: $('#textOutput'),
    dropZone: $('#dropZone'),
    fileInput: $('#fileInput'),
    activeCaseLabel: $('#activeCaseLabel'),
    toast: $('#toast'),

    statChars: $('#statChars'),
    statWords: $('#statWords'),
    statSentences: $('#statSentences'),
    statParagraphs: $('#statParagraphs'),
    statLetters: $('#statLetters'),
    statNumbers: $('#statNumbers'),
    statSymbols: $('#statSymbols'),
    statWhitespace: $('#statWhitespace'),
    statLongest: $('#statLongest'),
    statShortest: $('#statShortest'),
    statAvgLen: $('#statAvgLen'),
    statReading: $('#statReading'),
    statSpeaking: $('#statSpeaking'),
    statLevel: $('#statLevel'),

    themeToggle: $('#themeToggle'),
  };

  const MINOR_WORDS = new Set(['a','an','the','and','but','or','nor','for','on','at','to','from','by','of','in','as','if','so']);

  let currentCase = null;
  let debounceTimer = null;
  let historyStack = [''];
  let historyIndex = 0;
  let isRestoring = false;

  /* ---------------- Word splitting helper (for identifier cases) ---------------- */

  function splitWords(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-.\/]+/g, ' ')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase());
  }

  const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

  /* ---------------- Case conversion functions ---------------- */

  const CONVERTERS = {
    upper: (t) => t.toUpperCase(),
    lower: (t) => t.toLowerCase(),
    sentence: (t) => {
      const lower = t.toLowerCase();
      return lower.replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (m) => m.toUpperCase());
    },
    title: (t) =>
      t.replace(/\S+/g, (word, offset, full) => {
        const isFirst = full.slice(0, offset).trim() === '';
        const isLast = offset + word.length >= full.trimEnd().length;
        const lower = word.toLowerCase();
        const bare = lower.replace(/[^a-z]/g, '');
        if (!isFirst && !isLast && MINOR_WORDS.has(bare)) return lower;
        return word.replace(/[a-zA-Z]/, (c) => c.toUpperCase()).replace(/^([a-zA-Z])(.*)$/, (m, f, rest) => f.toUpperCase() + rest.toLowerCase());
      }),
    capitalize: (t) => t.replace(/\S+/g, (w) => cap(w.toLowerCase())),
    toggle: (t) => t.split('').map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
    camel: (t) => {
      const w = splitWords(t);
      return w.map((word, i) => (i === 0 ? word : cap(word))).join('');
    },
    pascal: (t) => splitWords(t).map(cap).join(''),
    snake: (t) => splitWords(t).join('_'),
    constant: (t) => splitWords(t).join('_').toUpperCase(),
    kebab: (t) => splitWords(t).join('-'),
    train: (t) => splitWords(t).map(cap).join('-'),
    dot: (t) => splitWords(t).join('.'),
    path: (t) => splitWords(t).join('/'),
    header: (t) => splitWords(t).map(cap).join('-'),
    reverse: (t) => t.split('').reverse().join(''),
    mirror: (t) => t.split('\n').map((line) => line.split('').reverse().join('')).join('\n'),
    removeSpaces: (t) => t.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n'),
    removeBlankLines: (t) => t.split('\n').filter((l) => l.trim() !== '').join('\n'),
    trim: (t) => t.split('\n').map((l) => l.trim()).join('\n').trim(),
    normalize: (t) => t.replace(/\s+/g, ' ').trim(),
  };

  const CASE_LABELS = {
    upper: 'UPPERCASE', lower: 'lowercase', sentence: 'Sentence case', title: 'Title Case',
    capitalize: 'Capitalize Each Word', toggle: 'Toggle Case', camel: 'camelCase', pascal: 'PascalCase',
    snake: 'snake_case', constant: 'CONSTANT_CASE', kebab: 'kebab-case', train: 'Train-Case',
    dot: 'dot.case', path: 'path/case', header: 'Header-Case', reverse: 'Reverse Text', mirror: 'Mirror Text',
    removeSpaces: 'Extra spaces removed', removeBlankLines: 'Blank lines removed', trim: 'Trimmed', normalize: 'Whitespace normalized',
  };

  /* ---------------- Text statistics ---------------- */

  function analyzeStats(text) {
    const chars = text.length;
    const whitespace = (text.match(/\s/g) || []).length;
    const letters = (text.match(/\p{L}/gu) || []).length;
    const numbers = (text.match(/[0-9]/g) || []).length;
    const symbols = chars - whitespace - letters - numbers;

    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
    const cleanedWords = words.map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean);

    let longest = '', shortest = '';
    cleanedWords.forEach((w) => {
      if (w.length > longest.length) longest = w;
      if (!shortest || w.length < shortest.length) shortest = w;
    });
    const avgLen = cleanedWords.length ? cleanedWords.reduce((s, w) => s + w.length, 0) / cleanedWords.length : 0;

    const sentenceMatches = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [];
    const sentenceCount = sentenceMatches.map((s) => s.trim()).filter(Boolean).length;

    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const paragraphCount = paragraphs.length || (text.trim() ? 1 : 0);

    const readingSeconds = Math.ceil((words.length / 225) * 60);
    const speakingSeconds = Math.ceil((words.length / 140) * 60);

    // Reading level via approximate Flesch Reading Ease
    let level = '–';
    if (words.length && sentenceCount) {
      const syllables = cleanedWords.reduce((sum, w) => sum + countSyllables(w), 0);
      const score = 206.835 - 1.015 * (words.length / sentenceCount) - 84.6 * (syllables / Math.max(1, cleanedWords.length));
      level = scoreToLevel(score);
    }

    return { chars, whitespace, letters, numbers, symbols: Math.max(0, symbols), words: words.length, longest, shortest, avgLen, sentenceCount, paragraphCount, readingSeconds, speakingSeconds, level };
  }

  function countSyllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 1;
    const matches = w.match(/[aeiouy]+/g);
    let count = matches ? matches.length : 1;
    if (w.endsWith('e') && count > 1) count--;
    return Math.max(1, count);
  }

  function scoreToLevel(score) {
    if (score >= 90) return 'Very easy';
    if (score >= 70) return 'Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly difficult';
    if (score >= 30) return 'Difficult';
    return 'Very difficult';
  }

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
    const duration = 300;
    const start = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(prev + (newValue - prev) * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------- Diff highlighting ---------------- */

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderOutput(input, output) {
    const inWords = input.split(/(\s+)/);
    const outWords = output.split(/(\s+)/);
    if (inWords.length === outWords.length) {
      const html = outWords.map((tok, i) => {
        const changed = tok.trim() !== '' && tok !== inWords[i];
        const safe = escapeHtml(tok);
        return changed ? `<mark>${safe}</mark>` : safe;
      }).join('');
      els.output.innerHTML = html;
    } else {
      els.output.textContent = output;
    }
  }

  /* ---------------- Main update ---------------- */

  function updateStats(text) {
    const s = analyzeStats(text);
    animateCount(els.statChars, s.chars);
    animateCount(els.statWords, s.words);
    animateCount(els.statSentences, s.sentenceCount);
    animateCount(els.statParagraphs, s.paragraphCount);
    els.statLetters.textContent = s.letters.toLocaleString();
    els.statNumbers.textContent = s.numbers.toLocaleString();
    els.statSymbols.textContent = s.symbols.toLocaleString();
    els.statWhitespace.textContent = s.whitespace.toLocaleString();
    els.statLongest.textContent = s.longest || '–';
    els.statShortest.textContent = s.shortest || '–';
    els.statAvgLen.textContent = s.avgLen.toFixed(1);
    els.statReading.textContent = formatTime(s.readingSeconds);
    els.statSpeaking.textContent = formatTime(s.speakingSeconds);
    els.statLevel.textContent = s.level;
  }

  function applyCase(caseKey) {
    if (!caseKey || !CONVERTERS[caseKey]) return;
    currentCase = caseKey;
    document.querySelectorAll('.case-btn').forEach((b) => b.classList.toggle('active', b.dataset.case === caseKey));
    els.activeCaseLabel.textContent = CASE_LABELS[caseKey] || '';
    const input = els.textarea.value;
    const output = CONVERTERS[caseKey](input);
    renderOutput(input, output);
  }

  function refresh() {
    const text = els.textarea.value;
    updateStats(text);
    autoResize();
    if (currentCase) applyCase(currentCase);
    else els.output.textContent = '';
  }

  function autoResize() {
    els.textarea.style.height = 'auto';
    els.textarea.style.height = Math.min(600, Math.max(320, els.textarea.scrollHeight)) + 'px';
  }

  /* ---------------- Undo / Redo ---------------- */

  function pushHistory(value) {
    if (isRestoring) return;
    if (historyStack[historyIndex] === value) return;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(value);
    historyIndex = historyStack.length - 1;
    updateUndoRedoButtons();
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    isRestoring = true;
    els.textarea.value = historyStack[historyIndex];
    isRestoring = false;
    refresh();
    updateUndoRedoButtons();
  }

  function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    isRestoring = true;
    els.textarea.value = historyStack[historyIndex];
    isRestoring = false;
    refresh();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    $('#btnUndo').disabled = historyIndex <= 0;
    $('#btnRedo').disabled = historyIndex >= historyStack.length - 1;
  }

  /* ---------------- Actions ---------------- */

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText();
      els.textarea.value += text;
      refresh();
      pushHistory(els.textarea.value);
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied — paste manually with Ctrl+V');
    }
  }

  async function copyOutput() {
    const text = els.output.textContent;
    if (!text) { showToast('Nothing to copy yet'); return; }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Output copied to clipboard');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(els.output);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      showToast('Output copied to clipboard');
    }
  }

  function clearInput() {
    if (!els.textarea.value) return;
    els.textarea.value = '';
    refresh();
    pushHistory('');
    els.textarea.focus();
    showToast('Input cleared');
  }

  function resetTool() {
    els.textarea.value = '';
    currentCase = null;
    document.querySelectorAll('.case-btn').forEach((b) => b.classList.remove('active'));
    els.activeCaseLabel.textContent = '';
    els.output.textContent = '';
    historyStack = [''];
    historyIndex = 0;
    updateUndoRedoButtons();
    updateStats('');
    autoResize();
    showToast('Tool reset');
  }

  function downloadOutput() {
    const text = els.output.textContent || '';
    if (!text) { showToast('Nothing to download yet'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded as .txt');
  }

  function printOutput() {
    window.print();
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      showToast('Only .txt files are supported');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      els.textarea.value = e.target.result;
      refresh();
      pushHistory(els.textarea.value);
      showToast(`Loaded ${file.name}`);
    };
    reader.onerror = () => showToast('Could not read that file');
    reader.readAsText(file);
  }

  /* ---------------- Theme ---------------- */

  function initTheme() {
    const saved = localStorage.getItem('cc-theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(saved || (prefersLight ? 'light' : 'dark'));
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

    document.querySelectorAll('.case-btn').forEach((btn) => {
      btn.addEventListener('click', () => applyCase(btn.dataset.case));
    });

    els.textarea.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      refresh();
      debounceTimer = setTimeout(() => pushHistory(els.textarea.value), 400);
    });

    $('#btnPaste').addEventListener('click', pasteText);
    $('#btnCopy').addEventListener('click', copyOutput);
    $('#btnClear').addEventListener('click', clearInput);
    $('#btnReset').addEventListener('click', resetTool);
    $('#btnUndo').addEventListener('click', undo);
    $('#btnRedo').addEventListener('click', redo);
    $('#btnDownload').addEventListener('click', downloadOutput);
    $('#btnPrint').addEventListener('click', printOutput);
    $('#btnUpload').addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    ['dragenter', 'dragover'].forEach((evt) =>
      els.dropZone.addEventListener(evt, (e) => { e.preventDefault(); els.dropZone.classList.add('dragging'); })
    );
    ['dragleave', 'drop'].forEach((evt) =>
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === 'drop') handleFile(e.dataTransfer.files[0]);
        els.dropZone.classList.remove('dragging');
      })
    );

    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') { e.preventDefault(); pasteText(); }
        else if (key === 'c') { e.preventDefault(); copyOutput(); }
        else if (key === 'x') { e.preventDefault(); clearInput(); }
        return;
      }
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (ctrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
    });

    els.themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
