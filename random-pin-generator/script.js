'use strict';

/* ============================================================
   THEME
============================================================ */
(function initTheme() {
  const THEME_KEY = 'mt-pin-theme';
  const stored = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = stored || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);

  const toggle = document.getElementById('theme-toggle');
  toggle.setAttribute('aria-pressed', String(theme === 'light'));
  toggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    toggle.setAttribute('aria-pressed', String(next === 'light'));
  });
})();

/* ============================================================
   MOBILE NAV
============================================================ */
(function initNav() {
  const btn = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    btn.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    nav.classList.toggle('is-open', !open);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    nav.classList.remove('is-open');
  }));
})();

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */
function showToast(message) {
  const region = document.getElementById('toast-region');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ============================================================
   SECURE RANDOM DIGIT (rejection sampling, no modulo bias)
============================================================ */
function secureRandomDigit() {
  const buf = new Uint32Array(1);
  const MAX_VALID = Math.floor(0xFFFFFFFF / 10) * 10; // largest multiple of 10 within uint32 range
  let value;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= MAX_VALID);
  return value % 10;
}

/* ============================================================
   PIN GENERATION
============================================================ */
function generateSinglePIN(length, { excludeRepeats, excludeLeadingZero }) {
  if (excludeRepeats && length > 10) return null; // impossible: only 10 unique digits exist

  let digits = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 500;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    digits = [];
    const used = new Set();

    for (let i = 0; i < length; i++) {
      let d;
      let tries = 0;
      do {
        d = secureRandomDigit();
        tries++;
      } while (
        ((excludeRepeats && used.has(d)) || (excludeLeadingZero && i === 0 && d === 0)) &&
        tries < 60
      );
      if (excludeRepeats && used.has(d)) { digits = null; break; } // ran out of tries, retry whole PIN
      if (excludeLeadingZero && i === 0 && d === 0) { digits = null; break; }
      digits.push(d);
      used.add(d);
    }
    if (digits) break;
  }
  return digits ? digits.join('') : null;
}

function estimateEntropyBits(length) {
  return +(length * Math.log2(10)).toFixed(1);
}

function strengthFromLength(length) {
  if (length <= 4) return { level: 'weak', label: 'Basic strength' };
  if (length <= 6) return { level: 'medium', label: 'Medium strength' };
  return { level: 'strong', label: 'Strong' };
}

/* ============================================================
   APP STATE + DOM REFERENCES
============================================================ */
const state = {
  length: 4,
  excludeRepeats: false,
  excludeLeadingZero: false,
  autoGenerate: false,
  currentPIN: '',
  batch: [],
};

const els = {
  readout: document.getElementById('pin-readout'),
  strength: document.getElementById('pin-strength'),
  strengthLabel: document.getElementById('pin-strength-label'),
  entropy: document.getElementById('pin-entropy'),
  lengthPresets: document.getElementById('length-presets'),
  rangeInput: document.getElementById('custom-length-range'),
  numberInput: document.getElementById('custom-length-input'),
  optExcludeRepeats: document.getElementById('opt-exclude-repeats'),
  optExcludeLeadingZero: document.getElementById('opt-exclude-leading-zero'),
  optAutoGenerate: document.getElementById('opt-auto-generate'),
  batchCount: document.getElementById('batch-count'),
  btnGenerate: document.getElementById('btn-generate'),
  btnRegenerate: document.getElementById('btn-regenerate'),
  btnCopy: document.getElementById('btn-copy'),
  btnCopyAll: document.getElementById('btn-copy-all'),
  btnDownload: document.getElementById('btn-download'),
  btnDownloadCsv: document.getElementById('btn-download-csv'),
  btnPrint: document.getElementById('btn-print'),
  btnClear: document.getElementById('btn-clear'),
  btnReset: document.getElementById('btn-reset'),
  batchResults: document.getElementById('batch-results'),
  batchList: document.getElementById('batch-list'),
  batchCountLabel: document.getElementById('batch-count-label'),
  historyList: document.getElementById('history-list'),
  historyEmpty: document.getElementById('history-empty'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  historyTabs: document.querySelectorAll('.history-tab'),
};

/* ============================================================
   RENDERING
============================================================ */
function renderPIN(pin) {
  els.readout.innerHTML = '';
  pin.split('').forEach(d => {
    const span = document.createElement('span');
    span.className = 'digit';
    span.textContent = d;
    els.readout.appendChild(span);
  });

  const { level, label } = strengthFromLength(pin.length);
  els.strength.dataset.level = level;
  els.strengthLabel.textContent = label;
  els.entropy.textContent = `≈ ${estimateEntropyBits(pin.length)} bits of entropy`;
}

function renderBatch(list) {
  els.batchList.innerHTML = '';
  list.forEach(pin => {
    const li = document.createElement('li');
    li.textContent = pin;
    els.batchList.appendChild(li);
  });
  els.batchCountLabel.textContent = String(list.length);
  const isBatch = list.length > 1;
  els.batchResults.hidden = !isBatch;
  els.btnCopyAll.hidden = !isBatch;
  els.btnDownloadCsv.hidden = !isBatch;
}

/* ============================================================
   GENERATE FLOW
============================================================ */
function runGenerate() {
  const qty = clamp(parseInt(els.batchCount.value, 10) || 1, 1, 100);
  const opts = { excludeRepeats: state.excludeRepeats, excludeLeadingZero: state.excludeLeadingZero };

  if (state.excludeRepeats && state.length > 10) {
    showToast('Length must be 10 or fewer to exclude repeated digits');
    return;
  }

  if (qty === 1) {
    const pin = generateSinglePIN(state.length, opts);
    if (!pin) { showToast('Could not generate a PIN with these settings'); return; }
    state.currentPIN = pin;
    state.batch = [pin];
    renderPIN(pin);
    renderBatch([]);
    addToHistory(pin);
  } else {
    const seen = new Set();
    const results = [];
    let guard = 0;
    while (results.length < qty && guard < qty * 40) {
      guard++;
      const pin = generateSinglePIN(state.length, opts);
      if (pin && !seen.has(pin)) { seen.add(pin); results.push(pin); }
    }
    if (!results.length) { showToast('Could not generate PINs with these settings'); return; }
    state.batch = results;
    state.currentPIN = results[0];
    renderPIN(results[0]);
    renderBatch(results);
    results.forEach(p => addToHistory(p, { silent: true }));
    showToast(`Generated ${results.length} PIN${results.length > 1 ? 's' : ''}`);
  }
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

/* ============================================================
   LENGTH CONTROLS
============================================================ */
function setLength(len, { fromPreset } = {}) {
  state.length = clamp(len, 4, 20);
  els.rangeInput.value = state.length;
  els.numberInput.value = state.length;

  els.lengthPresets.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('is-active', Number(chip.dataset.length) === state.length && fromPreset !== false);
  });
  if (![4, 5, 6, 8].includes(state.length)) {
    els.lengthPresets.querySelectorAll('.chip').forEach(chip => chip.classList.remove('is-active'));
  }
  if (state.autoGenerate) runGenerate();
}

els.lengthPresets.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  setLength(Number(btn.dataset.length));
});
els.rangeInput.addEventListener('input', () => setLength(Number(els.rangeInput.value)));
els.numberInput.addEventListener('input', () => {
  const v = parseInt(els.numberInput.value, 10);
  if (!isNaN(v)) setLength(v);
});

/* ============================================================
   TOGGLES
============================================================ */
els.optExcludeRepeats.addEventListener('change', () => {
  state.excludeRepeats = els.optExcludeRepeats.checked;
  if (state.autoGenerate) runGenerate();
});
els.optExcludeLeadingZero.addEventListener('change', () => {
  state.excludeLeadingZero = els.optExcludeLeadingZero.checked;
  if (state.autoGenerate) runGenerate();
});
els.optAutoGenerate.addEventListener('change', () => {
  state.autoGenerate = els.optAutoGenerate.checked;
  if (state.autoGenerate) runGenerate();
});

/* ============================================================
   ACTION BUTTONS
============================================================ */
els.btnGenerate.addEventListener('click', runGenerate);
els.btnRegenerate.addEventListener('click', runGenerate);

els.btnCopy.addEventListener('click', async () => {
  if (!state.currentPIN) { showToast('Generate a PIN first'); return; }
  await copyText(state.currentPIN);
  showToast('PIN copied to clipboard');
});

els.btnCopyAll.addEventListener('click', async () => {
  if (!state.batch.length) return;
  await copyText(state.batch.join('\n'));
  showToast('All PINs copied to clipboard');
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

els.btnDownload.addEventListener('click', () => {
  if (!state.currentPIN) { showToast('Generate a PIN first'); return; }
  const content = state.batch.length > 1 ? state.batch.join('\n') : state.currentPIN;
  downloadFile(content, 'random-pin.txt', 'text/plain');
});

els.btnDownloadCsv.addEventListener('click', () => {
  if (!state.batch.length) return;
  const csv = 'PIN\n' + state.batch.join('\n');
  downloadFile(csv, 'random-pins.csv', 'text/csv');
});

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Download started');
}

els.btnPrint.addEventListener('click', () => {
  if (!state.currentPIN) { showToast('Generate a PIN first'); return; }
  const w = window.open('', '_blank', 'width=420,height=320');
  if (!w) { showToast('Allow pop-ups to print'); return; }
  const list = state.batch.length > 1 ? state.batch : [state.currentPIN];
  w.document.write(`<!DOCTYPE html><html><head><title>Random PIN</title><style>
    body{font-family:ui-monospace,monospace;text-align:center;padding:40px}
    .p{font-size:2.4rem;letter-spacing:.1em;margin:10px 0;font-weight:700}
  </style></head><body><h3>Multi Tools — Random PIN</h3>${list.map(p => `<div class="p">${p}</div>`).join('')}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
});

els.btnClear.addEventListener('click', () => {
  state.currentPIN = '';
  state.batch = [];
  els.readout.innerHTML = '';
  els.strengthLabel.textContent = '—';
  els.entropy.textContent = '';
  renderBatch([]);
});

els.btnReset.addEventListener('click', () => {
  state.excludeRepeats = false;
  state.excludeLeadingZero = false;
  state.autoGenerate = false;
  els.optExcludeRepeats.checked = false;
  els.optExcludeLeadingZero.checked = false;
  els.optAutoGenerate.checked = false;
  els.batchCount.value = 1;
  setLength(4);
  showToast('Settings reset');
});

/* ============================================================
   HISTORY (localStorage)
============================================================ */
const HISTORY_KEY = 'mt-pin-history';
const HISTORY_MAX = 50;
let historyFilter = 'all';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
}

function addToHistory(value, { silent } = {}) {
  const items = loadHistory();
  items.unshift({ id: Date.now() + Math.random().toString(36).slice(2, 7), value, ts: Date.now(), fav: false });
  saveHistory(items);
  renderHistory();
}

function renderHistory() {
  const items = loadHistory().filter(i => historyFilter === 'all' || i.fav);
  els.historyList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = historyFilter === 'favourites' ? 'No favourite PINs yet.' : 'No PINs generated yet this session.';
    els.historyList.appendChild(li);
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const time = new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `
      <span><span class="hval">${item.value}</span> <span class="htime">${time}</span></span>
      <span class="history-actions">
        <button type="button" class="icon-mini${item.fav ? ' is-fav' : ''}" data-action="fav" data-id="${item.id}" aria-label="${item.fav ? 'Remove from favourites' : 'Add to favourites'}" aria-pressed="${item.fav}">★</button>
        <button type="button" class="icon-mini" data-action="copy" data-id="${item.id}" aria-label="Copy PIN">⧉</button>
        <button type="button" class="icon-mini" data-action="remove" data-id="${item.id}" aria-label="Remove PIN">✕</button>
      </span>`;
    els.historyList.appendChild(li);
  });
}

els.historyList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const items = loadHistory();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;

  if (btn.dataset.action === 'fav') {
    items[idx].fav = !items[idx].fav;
    saveHistory(items);
    renderHistory();
  } else if (btn.dataset.action === 'copy') {
    await copyText(items[idx].value);
    showToast('PIN copied to clipboard');
  } else if (btn.dataset.action === 'remove') {
    items.splice(idx, 1);
    saveHistory(items);
    renderHistory();
  }
});

els.btnClearHistory.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared');
});

els.historyTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    els.historyTabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    historyFilter = tab.dataset.tab;
    renderHistory();
  });
});

/* ============================================================
   FAQ ACCORDION
============================================================ */
document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    document.getElementById(trigger.getAttribute('aria-controls')).hidden = expanded;
  });
});

/* ============================================================
   KEYBOARD SHORTCUTS
============================================================ */
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'g') { runGenerate(); }
  else if (key === 'c') { els.btnCopy.click(); }
  else if (key === 'r') { els.btnReset.click(); }
});

/* ============================================================
   BACK TO TOP
============================================================ */
(function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    btn.hidden = window.scrollY < 480;
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ============================================================
   FOOTER YEAR
============================================================ */
document.getElementById('footer-year').textContent = new Date().getFullYear();

/* ============================================================
   INIT
============================================================ */
renderHistory();
setLength(4);
runGenerate();
