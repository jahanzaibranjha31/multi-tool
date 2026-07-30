'use strict';

/* =========================================================
   Regex Tester — vanilla JS, no dependencies.
   ========================================================= */

(function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const els = {
    patternInput: $('#regexPattern'),
    flagsGroup: $('#flagsGroup'),
    regexError: $('#regexError'),
    testText: $('#testText'),
    highlightLayer: $('#highlightLayer'),
    matchStats: $('#matchStats'),
    resultsBody: $('#resultsBody'),
    outputTitle: $('#outputTitle'),
    replaceControls: $('#replaceControls'),
    replaceInput: $('#replaceInput'),
    modeTabs: $$('.mode-tab'),
    cheatsheetPanel: $('#cheatsheetPanel'),
    outputPanel: $('#outputPanel'),
    commonPatterns: $('#commonPatterns'),
    copyRegexBtn: $('#copyRegexBtn'),
    copyResultsBtn: $('#copyResultsBtn'),
    downloadResultsBtn: $('#downloadResultsBtn'),
    downloadTextBtn: $('#downloadTextBtn'),
    clearTextBtn: $('#clearTextBtn'),
    resetAllBtn: $('#resetAllBtn'),
    uploadInput: $('#uploadInput'),
    themeToggle: $('#themeToggle'),
  };

  const state = {
    flags: new Set(['g']),
    mode: 'match', // match | replace | split
    lastResultsText: '',
  };

  const GROUP_CLASS_COUNT = 6;

  const COMMON_PATTERNS = [
    { label: 'Email', pattern: '^[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}$' },
    { label: 'US Phone', pattern: '^\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$' },
    { label: 'URL', pattern: '^https?:\\/\\/[\\w.-]+\\.[a-zA-Z]{2,}(\\/\\S*)?$' },
    { label: 'IPv4', pattern: '^(\\d{1,3}\\.){3}\\d{1,3}$' },
    { label: 'Hex Color', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
    { label: 'Strong Password', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$' },
    { label: 'ISO Date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    { label: 'Whitespace trim', pattern: '^\\s+|\\s+$' },
    { label: 'Hashtag', pattern: '#\\w+' },
    { label: 'HTML Tag', pattern: '<([a-z]+)[^<]*(?:>(.*?)<\\/\\1>|\\/>)' },
  ];

  /* ---------------- theme ---------------- */
  function initTheme() {
    const saved = safeStorageGet('regex-tester-theme');
    const theme = saved || 'dark';
    applyTheme(theme);
    els.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      safeStorageSet('regex-tester-theme', next);
    });
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
  }
  // In-memory fallback if storage is unavailable (artifact/sandboxed contexts)
  const memStore = {};
  function safeStorageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return memStore[key] || null; }
  }
  function safeStorageSet(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { memStore[key] = val; }
  }

  /* ---------------- flags ---------------- */
  function initFlags() {
    els.flagsGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.flag-pill');
      if (!btn) return;
      const flag = btn.dataset.flag;
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      if (pressed) state.flags.delete(flag); else state.flags.add(flag);
      run();
    });
  }
  function currentFlags() {
    return Array.from(state.flags).join('');
  }

  /* ---------------- build regex ---------------- */
  function buildRegex() {
    const pattern = els.patternInput.value;
    if (!pattern) return { regex: null, error: null };
    try {
      const regex = new RegExp(pattern, currentFlags());
      return { regex, error: null };
    } catch (err) {
      return { regex: null, error: err.message };
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ---------------- core run ---------------- */
  function run() {
    const pattern = els.patternInput.value;
    const text = els.testText.value;
    const { regex, error } = buildRegex();

    if (!pattern) {
      setStatus('', '');
      renderHighlight(text, []);
      renderStats(null);
      renderEmpty('Enter a pattern above to see matches here.');
      return;
    }

    if (error) {
      setStatus(error, 'error');
      renderHighlight(text, []);
      renderStats(null);
      renderEmpty('Fix the regex error above to see results.');
      return;
    }

    setStatus('Valid pattern', 'ok');

    const t0 = performance.now();
    let matches = [];
    try {
      matches = collectMatches(regex, text);
    } catch (err) {
      setStatus('Runtime error: ' + err.message, 'error');
    }
    const elapsed = (performance.now() - t0).toFixed(2);

    renderHighlight(text, matches);
    renderStats({ count: matches.length, elapsed });

    if (state.mode === 'match') {
      renderMatchList(matches);
    } else if (state.mode === 'replace') {
      renderReplace(regex, text);
    } else if (state.mode === 'split') {
      renderSplit(regex, text);
    }
  }

  function collectMatches(regex, text) {
    const matches = [];
    if (regex.global) {
      let m;
      const re = new RegExp(regex.source, regex.flags);
      let guard = 0;
      while ((m = re.exec(text)) !== null) {
        matches.push(m);
        if (m[0] === '') re.lastIndex++;
        guard++;
        if (guard > 20000) break; // safety guard against pathological loops
      }
    } else {
      const m = regex.exec(text);
      if (m) matches.push(m);
    }
    return matches;
  }

  function setStatus(msg, type) {
    els.regexError.textContent = msg;
    els.regexError.classList.remove('is-error', 'is-ok');
    if (type === 'error') els.regexError.classList.add('is-error');
    if (type === 'ok') els.regexError.classList.add('is-ok');
  }

  /* ---------------- highlight layer ---------------- */
  function renderHighlight(text, matches) {
    if (!matches.length) {
      els.highlightLayer.innerHTML = escapeHtml(text) || '';
      syncScroll();
      return;
    }
    let html = '';
    let last = 0;
    matches.forEach((m) => {
      const start = m.index;
      const end = start + (m[0] ? m[0].length : 0);
      html += escapeHtml(text.slice(last, start));
      html += `<mark class="hit">${escapeHtml(text.slice(start, end)) || '&#8203;'}</mark>`;
      last = Math.max(end, last);
    });
    html += escapeHtml(text.slice(last));
    els.highlightLayer.innerHTML = html;
    syncScroll();
  }

  function syncScroll() {
    els.highlightLayer.scrollTop = els.testText.scrollTop;
    els.highlightLayer.scrollLeft = els.testText.scrollLeft;
  }

  /* ---------------- stats ---------------- */
  function renderStats(info) {
    if (!info) { els.matchStats.innerHTML = ''; return; }
    els.matchStats.innerHTML = `
      <span class="stat-chip"><strong>${info.count}</strong> match${info.count === 1 ? '' : 'es'}</span>
      <span class="stat-chip">${info.elapsed} ms</span>
      <span class="stat-chip">flags: ${currentFlags() || '—'}</span>
    `;
  }

  function renderEmpty(msg) {
    els.resultsBody.innerHTML = `<p class="empty-state">${escapeHtml(msg)}</p>`;
  }

  /* ---------------- match list ---------------- */
  function renderMatchList(matches) {
    els.outputTitle.textContent = 'Matches';
    if (!matches.length) return renderEmpty('No matches found.');

    let out = '';
    let plainText = '';
    matches.forEach((m, i) => {
      const groups = [];
      for (let g = 1; g < m.length; g++) {
        if (m[g] !== undefined) groups.push({ idx: g, val: m[g] });
      }
      const namedGroups = m.groups ? Object.entries(m.groups).filter(([, v]) => v !== undefined) : [];

      out += `<div class="match-item">
        <div><span class="match-index">#${i + 1}</span><code>${escapeHtml(m[0])}</code></div>
        <div class="match-meta">index ${m.index}–${m.index + m[0].length} · length ${m[0].length}</div>`;
      plainText += `Match #${i + 1}: "${m[0]}" (index ${m.index}, length ${m[0].length})\n`;

      groups.forEach((g) => {
        const cls = 'g' + (((g.idx - 1) % GROUP_CLASS_COUNT) + 1);
        out += `<div class="group-line"><b class="${cls}">Group ${g.idx}:</b> ${escapeHtml(g.val)}</div>`;
        plainText += `  Group ${g.idx}: "${g.val}"\n`;
      });
      namedGroups.forEach(([name, val]) => {
        out += `<div class="group-line"><b>&lt;${escapeHtml(name)}&gt;:</b> ${escapeHtml(val)}</div>`;
        plainText += `  <${name}>: "${val}"\n`;
      });
      out += `</div>`;
    });
    els.resultsBody.innerHTML = out;
    state.lastResultsText = plainText.trim();
  }

  /* ---------------- replace mode ---------------- */
  function renderReplace(regex, text) {
    els.outputTitle.textContent = 'Replace preview';
    const replacement = els.replaceInput.value;
    let result;
    try {
      result = text.replace(regex, replacement);
    } catch (err) {
      renderEmpty('Replace error: ' + err.message);
      return;
    }
    els.resultsBody.innerHTML = `<div class="replace-preview">${escapeHtml(result) || '<span class="empty-state">Empty result.</span>'}</div>`;
    state.lastResultsText = result;
  }

  /* ---------------- split mode ---------------- */
  function renderSplit(regex, text) {
    els.outputTitle.textContent = 'Split preview';
    let parts;
    try {
      parts = text.split(regex);
    } catch (err) {
      renderEmpty('Split error: ' + err.message);
      return;
    }
    if (!parts.length) return renderEmpty('No output.');
    let out = '';
    let plainText = '';
    parts.forEach((p, i) => {
      out += `<div class="match-item"><span class="match-index">#${i + 1}</span><code>${escapeHtml(p) || '&#8203;'}</code></div>`;
      plainText += `Part #${i + 1}: "${p}"\n`;
    });
    els.resultsBody.innerHTML = out;
    state.lastResultsText = plainText.trim();
  }

  /* ---------------- mode tabs ---------------- */
  function initModeTabs() {
    els.modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        els.modeTabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });

        if (mode === 'cheatsheet') {
          els.cheatsheetPanel.hidden = false;
          els.outputPanel.closest('.grid').style.display = 'none';
          document.querySelector('.mode-tabs').nextElementSibling.style.display = 'none';
          return;
        }
        els.cheatsheetPanel.hidden = true;
        const grid = document.querySelector('.grid');
        grid.style.display = '';

        state.mode = mode;
        els.replaceControls.hidden = mode !== 'replace';
        run();
      });
    });
  }

  /* ---------------- cheat sheet chips ---------------- */
  function initCommonPatterns() {
    els.commonPatterns.innerHTML = COMMON_PATTERNS.map(
      (p) => `<button type="button" class="pattern-chip" data-pattern="${escapeHtml(p.pattern)}">${escapeHtml(p.label)}</button>`
    ).join('');
    els.commonPatterns.addEventListener('click', (e) => {
      const chip = e.target.closest('.pattern-chip');
      if (!chip) return;
      els.patternInput.value = chip.dataset.pattern;
      // switch back to match tab
      const matchTab = document.getElementById('tabMatch');
      matchTab.click();
      els.patternInput.focus();
      run();
    });
  }

  /* ---------------- toolbar actions ---------------- */
  function initToolbar() {
    els.patternInput.addEventListener('input', run);
    els.testText.addEventListener('input', run);
    els.testText.addEventListener('scroll', syncScroll);
    els.replaceInput.addEventListener('input', run);

    els.copyRegexBtn.addEventListener('click', () => {
      const pattern = els.patternInput.value;
      copyToClipboard(`/${pattern}/${currentFlags()}`);
      flashButton(els.copyRegexBtn);
    });

    els.copyResultsBtn.addEventListener('click', () => {
      copyToClipboard(state.lastResultsText || '');
      flashButton(els.copyResultsBtn);
    });

    els.downloadResultsBtn.addEventListener('click', () => {
      downloadFile('regex-results.txt', state.lastResultsText || '');
    });

    els.downloadTextBtn.addEventListener('click', () => {
      downloadFile('test-text.txt', els.testText.value);
    });

    els.clearTextBtn.addEventListener('click', () => {
      els.testText.value = '';
      run();
      els.testText.focus();
    });

    els.resetAllBtn.addEventListener('click', () => {
      els.patternInput.value = '';
      els.testText.value = '';
      els.replaceInput.value = '';
      state.flags = new Set(['g']);
      $$('.flag-pill').forEach((btn) => btn.setAttribute('aria-pressed', btn.dataset.flag === 'g' ? 'true' : 'false'));
      run();
      els.patternInput.focus();
    });

    els.uploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        els.testText.value = String(reader.result || '');
        run();
      };
      reader.readAsText(file);
      e.target.value = '';
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
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
  }

  function flashButton(btn) {
    btn.style.color = 'var(--teal)';
    setTimeout(() => { btn.style.color = ''; }, 500);
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------------- init ---------------- */
  function init() {
    initTheme();
    initFlags();
    initModeTabs();
    initCommonPatterns();
    initToolbar();
    els.testText.value = 'Contact us at support@example.com or sales@example.org.\nCall (555) 123-4567 for help.\nVisit https://example.com/docs for more.';
    els.patternInput.value = '[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}';
    run();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
