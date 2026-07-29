'use strict';

/* ============================================================
   JSON Formatter — Multi Tools
   Vanilla JS, no dependencies. All processing is local.
   ============================================================ */

(() => {
  const el = (id) => document.getElementById(id);

  const input = el('jsonInput');
  const output = el('jsonOutput');
  const treeOutput = el('treeOutput');
  const lineNumbers = el('lineNumbers');
  const errorBar = el('errorBar');
  const toast = el('toast');
  const loadingDot = el('loadingDot');
  const dropZone = el('dropZone');
  const dropOverlay = el('dropOverlay');
  const fileInput = el('fileInput');

  const stats = {
    chars: el('statChars'), words: el('statWords'), lines: el('statLines'),
    size: el('statSize'), keys: el('statKeys'), objects: el('statObjects'),
    arrays: el('statArrays'), depth: el('statDepth'),
  };

  let treeMode = false;
  let lastValidData = null;
  let toastTimer = null;

  /* ---------------- Theme ---------------- */
  const themeToggle = el('themeToggle');
  const iconSun = el('iconSun');
  const iconMoon = el('iconMoon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    iconSun.hidden = theme === 'dark';
    iconMoon.hidden = theme !== 'dark';
    try { localStorage.setItem('jf-theme', theme); } catch (e) { /* storage unavailable */ }
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('jf-theme'); } catch (e) { /* ignore */ }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  })();

  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ---------------- Toast ---------------- */
  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2600);
  }

  /* ---------------- Error bar ---------------- */
  function showError(message) {
    errorBar.hidden = false;
    errorBar.textContent = message;
  }
  function hideError() {
    errorBar.hidden = true;
    errorBar.textContent = '';
  }

  /* ---------------- Line numbers ---------------- */
  function updateLineNumbers() {
    const count = input.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= count; i++) html += i + '\n';
    lineNumbers.textContent = html;
  }
  input.addEventListener('scroll', () => { lineNumbers.scrollTop = input.scrollTop; });

  /* ---------------- Stats ---------------- */
  function byteSize(str) {
    return new Blob([str]).size;
  }
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function countStructure(data) {
    let keys = 0, objects = 0, arrays = 0, maxDepth = 0;
    function walk(node, depth) {
      maxDepth = Math.max(maxDepth, depth);
      if (Array.isArray(node)) {
        arrays++;
        node.forEach((item) => walk(item, depth + 1));
      } else if (node !== null && typeof node === 'object') {
        objects++;
        const ks = Object.keys(node);
        keys += ks.length;
        ks.forEach((k) => walk(node[k], depth + 1));
      }
    }
    walk(data, 0);
    return { keys, objects, arrays, maxDepth };
  }
  function updateStats() {
    const text = input.value;
    stats.chars.textContent = text.length.toLocaleString();
    stats.words.textContent = (text.trim() ? text.trim().split(/\s+/).length : 0).toLocaleString();
    stats.lines.textContent = text.split('\n').length.toLocaleString();
    stats.size.textContent = formatBytes(byteSize(text));

    if (lastValidData !== null) {
      const s = countStructure(lastValidData);
      stats.keys.textContent = s.keys.toLocaleString();
      stats.objects.textContent = s.objects.toLocaleString();
      stats.arrays.textContent = s.arrays.toLocaleString();
      stats.depth.textContent = s.maxDepth.toLocaleString();
    } else {
      stats.keys.textContent = '0';
      stats.objects.textContent = '0';
      stats.arrays.textContent = '0';
      stats.depth.textContent = '0';
    }
  }

  /* ---------------- Error line/position detection ---------------- */
  function locateError(text, message) {
    const posMatch = message.match(/position (\d+)/i);
    if (!posMatch) return null;
    const pos = parseInt(posMatch[1], 10);
    let line = 1, col = 1;
    for (let i = 0; i < pos && i < text.length; i++) {
      if (text[i] === '\n') { line++; col = 1; } else { col++; }
    }
    return { line, col, pos };
  }

  function tryParse(text) {
    try {
      const data = JSON.parse(text);
      return { ok: true, data };
    } catch (err) {
      const loc = locateError(text, err.message);
      return {
        ok: false,
        message: err.message,
        line: loc ? loc.line : null,
        col: loc ? loc.col : null,
      };
    }
  }

  /* ---------------- Syntax highlighting ---------------- */
  function highlight(jsonString) {
    const escaped = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'tok-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'tok-key' : 'tok-string';
        } else if (/true|false/.test(match)) {
          cls = 'tok-boolean';
        } else if (/null/.test(match)) {
          cls = 'tok-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  /* ---------------- Tree view ---------------- */
  function buildTree(data) {
    treeOutput.innerHTML = '';
    treeOutput.appendChild(renderNode('root', data, true));
  }

  function typeLabel(value) {
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value === null) return 'null';
    return typeof value;
  }

  function renderNode(key, value, isRoot) {
    const wrapper = document.createElement('div');
    const isContainer = value !== null && typeof value === 'object';

    if (!isContainer) {
      const line = document.createElement('div');
      line.className = 'tree-line';
      let valSpan = document.createElement('span');
      if (typeof value === 'string') { valSpan.className = 'tok-string'; valSpan.textContent = JSON.stringify(value); }
      else if (typeof value === 'number') { valSpan.className = 'tok-number'; valSpan.textContent = value; }
      else if (typeof value === 'boolean') { valSpan.className = 'tok-boolean'; valSpan.textContent = value; }
      else { valSpan.className = 'tok-null'; valSpan.textContent = 'null'; }

      line.innerHTML = isRoot ? '' : `<span class="tree-key">${key}</span>: `;
      line.appendChild(valSpan);
      wrapper.appendChild(line);
      return wrapper;
    }

    const node = document.createElement('div');
    node.className = 'tree-node';
    const line = document.createElement('div');
    line.className = 'tree-line';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle';
    toggle.textContent = '▾';
    toggle.setAttribute('aria-label', 'Toggle node');
    toggle.addEventListener('click', () => {
      node.classList.toggle('tree-collapsed');
      toggle.textContent = node.classList.contains('tree-collapsed') ? '▸' : '▾';
    });

    const label = document.createElement('span');
    label.innerHTML = (isRoot ? '' : `<span class="tree-key">${key}</span>: `) +
      `<span class="tree-count">${typeLabel(value)}</span>`;

    line.appendChild(toggle);
    line.appendChild(label);
    node.appendChild(line);

    const children = document.createElement('div');
    children.className = 'tree-children';
    const entries = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
    entries.forEach(([k, v]) => children.appendChild(renderNode(k, v, false)));
    node.appendChild(children);

    wrapper.appendChild(node);
    return wrapper;
  }

  function setAllCollapsed(collapsed) {
    treeOutput.querySelectorAll('.tree-node').forEach((node) => {
      node.classList.toggle('tree-collapsed', collapsed);
      const btn = node.querySelector(':scope > .tree-line > .tree-toggle');
      if (btn) btn.textContent = collapsed ? '▸' : '▾';
    });
  }

  /* ---------------- Core actions ---------------- */
  function withLoading(fn) {
    loadingDot.hidden = false;
    requestAnimationFrame(() => {
      setTimeout(() => {
        fn();
        loadingDot.hidden = true;
      }, 120);
    });
  }

  function formatJSON() {
    const text = input.value.trim();
    if (!text) { showError('Input is empty. Paste or upload JSON to format.'); return; }
    withLoading(() => {
      const result = tryParse(text);
      if (!result.ok) {
        lastValidData = null;
        const loc = result.line ? ` (Line ${result.line}, Column ${result.col})` : '';
        showError(`Invalid JSON: ${result.message}${loc}`);
        output.innerHTML = '';
        updateStats();
        showToast('JSON has syntax errors', 'error');
        return;
      }
      hideError();
      lastValidData = result.data;
      const pretty = JSON.stringify(result.data, null, 2);
      output.hidden = treeMode;
      treeOutput.hidden = !treeMode;
      output.innerHTML = highlight(pretty);
      if (treeMode) buildTree(result.data);
      updateStats();
      showToast('JSON formatted successfully', 'success');
    });
  }

  function minifyJSON() {
    const text = input.value.trim();
    if (!text) { showError('Input is empty. Paste or upload JSON to minify.'); return; }
    withLoading(() => {
      const result = tryParse(text);
      if (!result.ok) {
        lastValidData = null;
        const loc = result.line ? ` (Line ${result.line}, Column ${result.col})` : '';
        showError(`Invalid JSON: ${result.message}${loc}`);
        updateStats();
        showToast('JSON has syntax errors', 'error');
        return;
      }
      hideError();
      lastValidData = result.data;
      const min = JSON.stringify(result.data);
      output.hidden = false;
      treeOutput.hidden = true;
      treeMode = false;
      el('btnTreeView').setAttribute('aria-pressed', 'false');
      output.innerHTML = highlight(min);
      updateStats();
      showToast('JSON minified successfully', 'success');
    });
  }

  function validateJSON() {
    const text = input.value.trim();
    if (!text) { showError('Input is empty. Nothing to validate.'); return; }
    const result = tryParse(text);
    if (!result.ok) {
      lastValidData = null;
      const loc = result.line ? ` (Line ${result.line}, Column ${result.col})` : '';
      showError(`Invalid JSON: ${result.message}${loc}`);
      updateStats();
      showToast('Validation failed', 'error');
    } else {
      hideError();
      lastValidData = result.data;
      updateStats();
      showToast('Valid JSON ✓', 'success');
    }
  }

  function toggleTreeView() {
    treeMode = !treeMode;
    const btn = el('btnTreeView');
    btn.setAttribute('aria-pressed', String(treeMode));
    if (treeMode) {
      if (lastValidData === null) {
        const result = tryParse(input.value.trim());
        if (!result.ok) { showToast('Format valid JSON first', 'error'); treeMode = false; btn.setAttribute('aria-pressed', 'false'); return; }
        lastValidData = result.data;
      }
      output.hidden = true;
      treeOutput.hidden = false;
      buildTree(lastValidData);
    } else {
      output.hidden = false;
      treeOutput.hidden = true;
    }
  }

  function copyResult() {
    const text = treeMode ? JSON.stringify(lastValidData, null, 2) : output.textContent;
    if (!text) { showToast('Nothing to copy', 'error'); return; }
    navigator.clipboard.writeText(text).then(
      () => showToast('Copied to clipboard', 'success'),
      () => showToast('Copy failed', 'error')
    );
  }

  function downloadResult() {
    const text = treeMode ? JSON.stringify(lastValidData, null, 2) : output.textContent;
    if (!text) { showToast('Nothing to download', 'error'); return; }
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Download started', 'success');
  }

  function clearAll() {
    input.value = '';
    output.innerHTML = '';
    treeOutput.innerHTML = '';
    lastValidData = null;
    hideError();
    updateLineNumbers();
    updateStats();
    input.focus();
  }

  function resetAll() {
    clearAll();
    treeMode = false;
    el('btnTreeView').setAttribute('aria-pressed', 'false');
    output.hidden = false;
    treeOutput.hidden = true;
    showToast('Reset complete', 'success');
  }

  function loadFile(file) {
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
      showToast('Please upload a .json file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      input.value = String(reader.result);
      updateLineNumbers();
      updateStats();
      formatJSON();
    };
    reader.onerror = () => showToast('Could not read file', 'error');
    reader.readAsText(file, 'UTF-8');
  }

  /* ---------------- Event wiring ---------------- */
  el('btnFormat').addEventListener('click', formatJSON);
  el('btnMinify').addEventListener('click', minifyJSON);
  el('btnValidate').addEventListener('click', validateJSON);
  el('btnTreeView').addEventListener('click', toggleTreeView);
  el('btnExpandAll').addEventListener('click', () => setAllCollapsed(false));
  el('btnCollapseAll').addEventListener('click', () => setAllCollapsed(true));
  el('btnCopy').addEventListener('click', copyResult);
  el('btnDownload').addEventListener('click', downloadResult);
  el('btnClear').addEventListener('click', clearAll);
  el('btnReset').addEventListener('click', resetAll);
  fileInput.addEventListener('change', (e) => loadFile(e.target.files[0]));

  input.addEventListener('input', () => {
    updateLineNumbers();
    updateStats();
  });

  /* Keyboard shortcuts */
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); formatJSON(); }
    else if (mod && e.key.toLowerCase() === 'm') { e.preventDefault(); minifyJSON(); }
    else if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); clearAll(); }
  });

  /* Drag & drop */
  ['dragenter', 'dragover'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragging');
    });
  });
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  });

  /* Init */
  updateLineNumbers();
  updateStats();
})();
