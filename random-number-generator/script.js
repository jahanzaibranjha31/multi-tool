'use strict';

/* =========================================================
   Random Number Generator — vanilla JS, no dependencies.
   ========================================================= */

(function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const els = {
    form: $('#rngForm'),
    minInput: $('#minInput'),
    maxInput: $('#maxInput'),
    countInput: $('#countInput'),
    segButtons: $$('.seg-btn'),
    decimalPlacesField: $('#decimalPlacesField'),
    decimalPlaces: $('#decimalPlaces'),
    uniqueToggle: $('#uniqueToggle'),
    negativeToggle: $('#negativeToggle'),
    autoToggle: $('#autoToggle'),
    resultStage: $('#resultStage'),
    statCount: $('#statCount'),
    statMin: $('#statMin'),
    statMax: $('#statMax'),
    statAvg: $('#statAvg'),
    historyList: $('#historyList'),
    historyEmpty: $('#historyEmpty'),
    copyBtn: $('#copyBtn'),
    downloadBtn: $('#downloadBtn'),
    printBtn: $('#printBtn'),
    shuffleBtn: $('#shuffleBtn'),
    sortAscBtn: $('#sortAscBtn'),
    sortDescBtn: $('#sortDescBtn'),
    clearBtn: $('#clearBtn'),
    resetBtn: $('#resetBtn'),
    themeToggle: $('#themeToggle'),
    toastRegion: $('#toastRegion'),
  };

  const state = {
    type: 'integer', // integer | decimal | even | odd
    lastResults: [],
    generationCount: 0,
    allValues: [], // running list across generations, for min/max/avg stats
    history: [],
    autoTimer: null,
  };

  /* ---------------- secure random helpers ---------------- */
  function secureRandomFloat() {
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] / 4294967296; // 2^32
    }
    return Math.random();
  }

  function randomInt(min, max) {
    return Math.floor(secureRandomFloat() * (max - min + 1)) + min;
  }

  function randomDecimal(min, max, places) {
    const val = secureRandomFloat() * (max - min) + min;
    return parseFloat(val.toFixed(places));
  }

  /* ---------------- theme ---------------- */
  const memStore = {};
  function safeGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return memStore[key] || null; } }
  function safeSet(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { memStore[key] = val; } }

  function initTheme() {
    applyTheme(safeGet('rng-theme') || 'dark');
    els.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      safeSet('rng-theme', next);
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

  /* ---------------- number type segmented control ---------------- */
  function initTypeSegments() {
    els.segButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.segButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state.type = btn.dataset.type;
        els.decimalPlacesField.hidden = state.type !== 'decimal';
      });
    });
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

  /* ---------------- validation ---------------- */
  function validateInputs(min, max, count) {
    if (Number.isNaN(min) || Number.isNaN(max)) return 'Please enter valid numbers for min and max.';
    if (min >= max) return 'Minimum must be less than maximum.';
    if (!Number.isInteger(count) || count < 1) return 'Count must be at least 1.';
    if (count > 1000) return 'Please request 1000 numbers or fewer at a time.';
    if (els.uniqueToggle.checked) {
      let rangeSize;
      if (state.type === 'even') rangeSize = Math.floor(max / 2) - Math.ceil(min / 2) + 1;
      else if (state.type === 'odd') rangeSize = Math.floor((max - 1) / 2) - Math.ceil((min - 1) / 2) + 1;
      else rangeSize = Math.floor(max) - Math.ceil(min) + 1;
      if (state.type !== 'decimal' && count > rangeSize) {
        return `Range only contains ${Math.max(rangeSize, 0)} eligible unique value(s) for that count.`;
      }
    }
    return null;
  }

  /* ---------------- generation ---------------- */
  function generateOne(min, max) {
    if (state.type === 'decimal') {
      const places = Math.min(Math.max(parseInt(els.decimalPlaces.value, 10) || 2, 1), 10);
      return randomDecimal(min, max, places);
    }
    if (state.type === 'even') {
      const lo = Math.ceil(min / 2), hi = Math.floor(max / 2);
      return randomInt(lo, hi) * 2;
    }
    if (state.type === 'odd') {
      const lo = Math.ceil((min - 1) / 2), hi = Math.floor((max - 1) / 2);
      return randomInt(lo, hi) * 2 + 1;
    }
    return randomInt(Math.ceil(min), Math.floor(max));
  }

  function generateSet(min, max, count) {
    const unique = els.uniqueToggle.checked;
    const results = [];
    if (unique) {
      const seen = new Set();
      let guard = 0;
      while (results.length < count && guard < 200000) {
        const val = generateOne(min, max);
        if (!seen.has(val)) { seen.add(val); results.push(val); }
        guard++;
      }
    } else {
      for (let i = 0; i < count; i++) results.push(generateOne(min, max));
    }
    return results;
  }

  function runGeneration() {
    let min = parseFloat(els.minInput.value);
    let max = parseFloat(els.maxInput.value);
    const count = parseInt(els.countInput.value, 10);

    if (!els.negativeToggle.checked) {
      if (min < 0) min = 0;
      if (max < 0) max = 0;
    }

    const error = validateInputs(min, max, count);
    if (error) {
      showToast(error, 'error');
      return;
    }

    const results = generateSet(min, max, count);
    if (!results.length) {
      showToast('Could not generate numbers with these settings.', 'error');
      return;
    }

    state.lastResults = results;
    state.generationCount++;
    state.allValues.push(...results);

    renderResult(results);
    updateStats();
    pushHistory(results);
  }

  /* ---------------- render result ---------------- */
  function renderResult(results) {
    els.resultStage.innerHTML = '';
    if (results.length === 1) {
      const div = document.createElement('div');
      div.className = 'result-number';
      div.textContent = formatNumber(results[0]);
      els.resultStage.appendChild(div);
    } else {
      results.forEach((val) => {
        const chip = document.createElement('span');
        chip.className = 'result-chip';
        chip.textContent = formatNumber(val);
        els.resultStage.appendChild(chip);
      });
    }
  }

  function formatNumber(n) {
    return state.type === 'decimal' ? n.toFixed(Math.min(Math.max(parseInt(els.decimalPlaces.value, 10) || 2, 1), 10)) : String(n);
  }

  /* ---------------- stats ---------------- */
  function updateStats() {
    els.statCount.textContent = String(state.generationCount);
    if (!state.allValues.length) {
      els.statMin.textContent = '—'; els.statMax.textContent = '—'; els.statAvg.textContent = '—';
      return;
    }
    const min = Math.min(...state.allValues);
    const max = Math.max(...state.allValues);
    const avg = state.allValues.reduce((a, b) => a + b, 0) / state.allValues.length;
    els.statMin.textContent = trimNum(min);
    els.statMax.textContent = trimNum(max);
    els.statAvg.textContent = trimNum(avg);
  }
  function trimNum(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  /* ---------------- history ---------------- */
  function pushHistory(results) {
    const time = new Date().toLocaleTimeString();
    state.history.unshift({ values: results.slice(), time });
    if (state.history.length > 50) state.history.pop();
    renderHistory();
  }
  function renderHistory() {
    els.historyEmpty.hidden = state.history.length > 0;
    els.historyList.innerHTML = state.history.map((h) => `
      <li class="history-item">
        <span class="h-values">${h.values.map(formatNumber).join(', ')}</span>
        <span class="h-time">${h.time}</span>
      </li>
    `).join('');
  }

  /* ---------------- shuffle / sort ---------------- */
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(secureRandomFloat() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function requireResults() {
    if (!state.lastResults.length) { showToast('Generate numbers first.', 'error'); return false; }
    return true;
  }

  /* ---------------- toolbar actions ---------------- */
  function initToolbar() {
    els.form.addEventListener('submit', (e) => { e.preventDefault(); runGeneration(); });

    els.shuffleBtn.addEventListener('click', () => {
      if (!requireResults()) return;
      state.lastResults = shuffleArray(state.lastResults);
      renderResult(state.lastResults);
    });

    els.sortAscBtn.addEventListener('click', () => {
      if (!requireResults()) return;
      state.lastResults = state.lastResults.slice().sort((a, b) => a - b);
      renderResult(state.lastResults);
    });

    els.sortDescBtn.addEventListener('click', () => {
      if (!requireResults()) return;
      state.lastResults = state.lastResults.slice().sort((a, b) => b - a);
      renderResult(state.lastResults);
    });

    els.clearBtn.addEventListener('click', () => {
      state.lastResults = [];
      els.resultStage.innerHTML = '<p class="result-placeholder">Press Generate to draw your numbers</p>';
    });

    els.resetBtn.addEventListener('click', () => {
      els.form.reset();
      els.minInput.value = 1; els.maxInput.value = 100; els.countInput.value = 1;
      els.decimalPlaces.value = 2;
      els.segButtons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      els.segButtons[0].classList.add('is-active'); els.segButtons[0].setAttribute('aria-pressed', 'true');
      state.type = 'integer';
      els.decimalPlacesField.hidden = true;
      els.uniqueToggle.checked = false; els.negativeToggle.checked = false; els.autoToggle.checked = false;
      stopAuto();
      state.lastResults = []; state.generationCount = 0; state.allValues = []; state.history = [];
      els.resultStage.innerHTML = '<p class="result-placeholder">Press Generate to draw your numbers</p>';
      updateStats(); renderHistory();
      showToast('Everything reset.');
    });

    els.copyBtn.addEventListener('click', () => {
      if (!requireResults()) return;
      copyToClipboard(state.lastResults.map(formatNumber).join(', '));
      showToast('Copied to clipboard.');
    });

    els.downloadBtn.addEventListener('click', () => {
      if (!requireResults()) return;
      downloadFile('random-numbers.txt', state.lastResults.map(formatNumber).join('\n'));
    });

    els.printBtn.addEventListener('click', () => {
      if (!requireResults()) return;
      window.print();
    });

    els.autoToggle.addEventListener('change', () => {
      if (els.autoToggle.checked) startAuto(); else stopAuto();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement && document.activeElement.closest('#rngForm')) {
        // native form submit already handles this; no-op guard
      }
    });
  }

  function startAuto() {
    stopAuto();
    state.autoTimer = setInterval(runGeneration, 2000);
  }
  function stopAuto() {
    if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
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
    initTypeSegments();
    initToolbar();
    updateStats();
    renderHistory();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
