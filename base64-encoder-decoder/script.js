'use strict';

/* ===========================================================
   Base64 Encoder / Decoder — script.js
   100% client-side. No dependencies. UTF-8 / Unicode safe.
=========================================================== */

(() => {
  const $ = (id) => document.getElementById(id);

  const inputText   = $('inputText');
  const outputText  = $('outputText');
  const inputStats  = $('inputStats');
  const outputStats = $('outputStats');
  const inputWarning= $('inputWarning');
  const copyToast   = $('copyToast');
  const dropZone    = $('dropZone');
  const fileInput   = $('fileInput');
  const historyList = $('historyList');

  const modeBtns = {
    encode: $('modeEncode'),
    decode: $('modeDecode'),
    auto:   $('modeAuto'),
  };

  let currentMode = 'encode'; // 'encode' | 'decode' | 'auto'
  let history = []; // session-only

  /* ---------- Core Base64 helpers (UTF-8 safe) ---------- */

  function encodeToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  function decodeFromBase64(str) {
    const cleaned = str.trim();
    const binary = atob(cleaned); // throws if invalid
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function isLikelyBase64(str) {
    const s = str.trim().replace(/\s+/g, '');
    if (!s) return false;
    if (s.length % 4 !== 0) return false;
    return /^[A-Za-z0-9+/]*={0,2}$/.test(s);
  }

  /* ---------- Stats ---------- */

  function computeStats(str) {
    const chars = str.length;
    const words = str.trim() ? str.trim().split(/\s+/).length : 0;
    const lines = str ? str.split(/\n/).length : 0;
    const bytes = new TextEncoder().encode(str).length;
    return `${chars} chars · ${words} words · ${lines} line${lines === 1 ? '' : 's'} · ${formatBytes(bytes)}`;
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  /* ---------- Conversion pipeline ---------- */

  function runConversion() {
    const raw = inputText.value;
    inputStats.textContent = computeStats(raw);
    hideWarning();

    if (!raw) {
      outputText.value = '';
      outputStats.textContent = computeStats('');
      return;
    }

    let mode = currentMode;
    if (mode === 'auto') {
      mode = isLikelyBase64(raw) ? 'decode' : 'encode';
    }

    try {
      let result;
      if (mode === 'encode') {
        result = encodeToBase64(raw);
      } else {
        result = decodeFromBase64(raw);
      }
      outputText.value = result;
      outputStats.textContent = computeStats(result);
      pushHistory(mode, raw, result);
    } catch (err) {
      outputText.value = '';
      outputStats.textContent = computeStats('');
      showWarning(mode === 'decode'
        ? 'Invalid Base64 input — check length and character set.'
        : 'Could not encode this input.');
    }
  }

  function showWarning(msg) {
    inputWarning.textContent = msg;
    inputWarning.hidden = false;
  }
  function hideWarning() {
    inputWarning.hidden = true;
    inputWarning.textContent = '';
  }

  /* ---------- Mode switching ---------- */

  function setMode(mode) {
    currentMode = mode;
    Object.entries(modeBtns).forEach(([key, btn]) => {
      const active = key === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    runConversion();
  }

  modeBtns.encode.addEventListener('click', () => setMode('encode'));
  modeBtns.decode.addEventListener('click', () => setMode('decode'));
  modeBtns.auto.addEventListener('click', () => setMode('auto'));

  /* ---------- Live conversion ---------- */

  let debounceTimer;
  inputText.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runConversion, 120);
  });

  /* ---------- Swap ---------- */

  $('btnSwap').addEventListener('click', () => {
    const tmp = inputText.value;
    inputText.value = outputText.value;
    outputText.value = tmp;
    if (currentMode === 'encode') setMode('decode');
    else if (currentMode === 'decode') setMode('encode');
    else runConversion();
  });

  /* ---------- Reset / Clear ---------- */

  $('btnReset').addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    hideWarning();
    inputStats.textContent = computeStats('');
    outputStats.textContent = computeStats('');
    setMode('encode');
  });

  $('btnClearInput').addEventListener('click', () => {
    inputText.value = '';
    runConversion();
    inputText.focus();
  });

  $('btnClearOutput').addEventListener('click', () => {
    outputText.value = '';
    outputStats.textContent = computeStats('');
  });

  /* ---------- Copy ---------- */

  async function copyOutput() {
    if (!outputText.value) return;
    try {
      await navigator.clipboard.writeText(outputText.value);
    } catch {
      outputText.select();
      document.execCommand('copy');
    }
    copyToast.hidden = false;
    copyToast.classList.add('show');
    clearTimeout(copyOutput._t);
    copyOutput._t = setTimeout(() => {
      copyToast.classList.remove('show');
      setTimeout(() => { copyToast.hidden = true; }, 200);
    }, 1400);
  }
  $('btnCopy').addEventListener('click', copyOutput);

  /* ---------- Paste ---------- */

  $('btnPaste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputText.value = text;
      runConversion();
    } catch {
      showWarning('Clipboard access was blocked. Paste manually with Ctrl+V.');
    }
  });

  /* ---------- Download ---------- */

  $('btnDownload').addEventListener('click', () => {
    if (!outputText.value) return;
    const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base64-${currentMode === 'decode' ? 'decoded' : 'encoded'}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  /* ---------- Upload file ---------- */

  $('btnUpload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) readFileIntoInput(file);
    fileInput.value = '';
  });

  function readFileIntoInput(file) {
    const reader = new FileReader();
    reader.onload = () => {
      inputText.value = reader.result;
      runConversion();
    };
    reader.onerror = () => showWarning('Could not read the selected file.');
    reader.readAsText(file);
  }

  /* ---------- Drag & drop ---------- */

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) readFileIntoInput(file);
  });

  /* ---------- History (session only) ---------- */

  function pushHistory(mode, input, output) {
    if (!input) return;
    const last = history[0];
    if (last && last.input === input && last.mode === mode) return; // avoid dup spam
    history.unshift({ mode, input, output, ts: Date.now() });
    history = history.slice(0, 8);
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach((item, idx) => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.innerHTML = `<span class="h-mode">${item.mode}</span><span class="h-text">${escapeHtml(item.input.slice(0, 60))}</span>`;
      li.addEventListener('click', () => {
        inputText.value = item.input;
        setMode(item.mode);
      });
      historyList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  $('btnClearHistory').addEventListener('click', () => {
    history = [];
    renderHistory();
  });

  /* ---------- Keyboard shortcuts ---------- */

  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'Enter') {
      e.preventDefault();
      runConversion();
    } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      $('btnSwap').click();
    } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyOutput();
    }
  });

  /* ---------- Theme toggle ---------- */

  const themeToggle = $('themeToggle');
  const iconSun = $('iconSun');
  const iconMoon = $('iconMoon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
    iconSun.hidden = theme !== 'light';
    iconMoon.hidden = theme === 'light';
    try { localStorage.setItem('b64-theme', theme); } catch {}
  }

  function initTheme() {
    let saved;
    try { saved = localStorage.getItem('b64-theme'); } catch {}
    if (saved) return applyTheme(saved);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });

  /* ---------- Init ---------- */

  initTheme();
  inputStats.textContent = computeStats('');
  outputStats.textContent = computeStats('');
})();
