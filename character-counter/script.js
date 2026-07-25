/**
 * Character Counter – script.js
 * Pure Vanilla JavaScript · No dependencies
 * Features: Live stats, limit checkers, dark mode, auto-save, keyboard shortcuts, toast
 */

/* =============================================
   CONFIG
   ============================================= */
const LIMITS = [
  { name: 'Twitter / X',          max: 280   },
  { name: 'Instagram Bio',        max: 150   },
  { name: 'Meta Title',           max: 60    },
  { name: 'Meta Description',     max: 160   },
  { name: 'SMS',                  max: 160   },
  { name: 'YouTube Title',        max: 100   },
  { name: 'LinkedIn Headline',    max: 220   },
  { name: 'YouTube Description',  max: 5000  },
  { name: 'Facebook Post',        max: 63206 },
];

const STORAGE_KEY   = 'cc_text';
const DARK_MODE_KEY = 'cc_dark';

/* Reading speed: 238 wpm average adult reader (words per minute)
   Speaking speed: 130 wpm average conversational */
const READ_WPM  = 238;
const SPEAK_WPM = 130;

/* =============================================
   ELEMENTS
   ============================================= */
const textarea         = document.getElementById('mainTextarea');
const charCount        = document.getElementById('charCount');
const charNoSpaceCount = document.getElementById('charNoSpaceCount');
const wordCount        = document.getElementById('wordCount');
const sentenceCount    = document.getElementById('sentenceCount');
const paragraphCount   = document.getElementById('paragraphCount');
const lineCount        = document.getElementById('lineCount');
const spaceCount       = document.getElementById('spaceCount');
const readTime         = document.getElementById('readTime');
const speakTime        = document.getElementById('speakTime');
const avgWordLen       = document.getElementById('avgWordLen');
const limitsGrid       = document.getElementById('limitsGrid');
const darkToggle       = document.getElementById('darkToggle');
const btnCopy          = document.getElementById('btnCopy');
const btnPaste         = document.getElementById('btnPaste');
const btnClear         = document.getElementById('btnClear');
const btnDownload      = document.getElementById('btnDownload');
const autoSaveInd      = document.getElementById('autoSaveIndicator');
const toast            = document.getElementById('toast');
const footerYear       = document.getElementById('footerYear');

/* =============================================
   INIT
   ============================================= */
(function init() {
  // Footer year
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // Restore dark mode
  if (localStorage.getItem(DARK_MODE_KEY) === '1') applyDark(true);

  // Restore saved text
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    textarea.value = saved;
    updateAll();
  }

  // Build limit checkers
  buildLimitCheckers();

  // Events
  textarea.addEventListener('input', onInput);
  darkToggle.addEventListener('click', toggleDark);
  btnCopy.addEventListener('click', copyText);
  btnPaste.addEventListener('click', pasteText);
  btnClear.addEventListener('click', clearText);
  btnDownload.addEventListener('click', downloadTxt);

  // Keyboard shortcuts
  document.addEventListener('keydown', onKeydown);
})();

/* =============================================
   INPUT HANDLER
   ============================================= */
let saveTimer = null;

function onInput() {
  updateAll();
  scheduleSave();
}

function updateAll() {
  const text  = textarea.value;
  const chars = text.length;

  // ---- Core counts ----
  const noSpaces    = text.replace(/ /g, '').length;
  const spaces      = (text.match(/ /g) || []).length;
  const words       = getWordCount(text);
  const sentences   = getSentenceCount(text);
  const paragraphs  = getParagraphCount(text);
  const lines       = text === '' ? 0 : text.split('\n').length;

  // ---- Reading / Speaking time ----
  const readSecs  = Math.round((words / READ_WPM) * 60);
  const speakSecs = Math.round((words / SPEAK_WPM) * 60);

  // ---- Avg word length ----
  const wordList  = text.match(/\b\w+\b/g) || [];
  const avgLen    = wordList.length
    ? (wordList.reduce((s, w) => s + w.length, 0) / wordList.length).toFixed(1)
    : 0;

  // ---- Update DOM ----
  setStatValue(charCount,        chars);
  setStatValue(charNoSpaceCount, noSpaces);
  setStatValue(wordCount,        words);
  setStatValue(sentenceCount,    sentences);
  setStatValue(paragraphCount,   paragraphs);
  setStatValue(lineCount,        lines);
  setStatValue(spaceCount,       spaces);
  readTime.textContent  = formatTime(readSecs);
  speakTime.textContent = formatTime(speakSecs);
  avgWordLen.textContent = avgLen;

  // ---- Update limit bars ----
  updateLimitBars(chars);
}

/* =============================================
   TEXT ANALYSIS HELPERS
   ============================================= */
function getWordCount(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function getSentenceCount(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Match sentence-ending punctuation followed by space or end of string
  const matches = trimmed.match(/[^.!?]*[.!?]+(\s|$)/g);
  if (matches) return matches.length;
  // If no punctuation, count as 1 sentence if there's content
  return trimmed.length > 0 ? 1 : 0;
}

function getParagraphCount(text) {
  if (!text.trim()) return 0;
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean).length;
}

function formatTime(totalSeconds) {
  if (totalSeconds === 0) return '0 sec';
  if (totalSeconds < 60) return totalSeconds + ' sec';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

/* =============================================
   STAT VALUE WITH PULSE ANIMATION
   ============================================= */
function setStatValue(el, value) {
  if (!el) return;
  if (el.textContent === String(value)) return; // no change, skip
  el.textContent = value;
  el.classList.remove('updated');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('updated');
}

/* =============================================
   LIMIT CHECKERS – BUILD
   ============================================= */
function buildLimitCheckers() {
  limitsGrid.innerHTML = '';
  LIMITS.forEach(({ name, max }, idx) => {
    const item = document.createElement('div');
    item.className = 'limit-item';
    item.innerHTML = `
      <div class="limit-header">
        <span class="limit-name">${escHtml(name)} <span style="color:var(--clr-text-muted);font-weight:400">(${max.toLocaleString()})</span></span>
        <span class="limit-count" id="lc-count-${idx}">0 / ${max.toLocaleString()}</span>
      </div>
      <div class="limit-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="0" aria-label="${escHtml(name)} character limit" id="lc-track-${idx}">
        <div class="limit-bar-fill" id="lc-fill-${idx}"></div>
      </div>
      <div class="limit-pct" id="lc-pct-${idx}">0%</div>
    `;
    limitsGrid.appendChild(item);
  });
}

/* =============================================
   LIMIT CHECKERS – UPDATE
   ============================================= */
function updateLimitBars(chars) {
  LIMITS.forEach(({ max }, idx) => {
    const fill  = document.getElementById(`lc-fill-${idx}`);
    const count = document.getElementById(`lc-count-${idx}`);
    const pct   = document.getElementById(`lc-pct-${idx}`);
    const track = document.getElementById(`lc-track-${idx}`);
    if (!fill) return;

    const ratio      = chars / max;
    const pctVal     = Math.min(ratio * 100, 100);
    const overLimit  = chars > max;
    const nearLimit  = ratio >= 0.85 && !overLimit;

    fill.style.width = pctVal + '%';
    fill.className   = 'limit-bar-fill' +
      (overLimit ? ' danger' : nearLimit ? ' warn' : '');

    count.textContent = chars.toLocaleString() + ' / ' + max.toLocaleString();
    count.style.color = overLimit
      ? '#ef4444'
      : nearLimit
        ? '#f59e0b'
        : '';

    pct.textContent = overLimit
      ? '+' + (chars - max).toLocaleString() + ' over'
      : Math.round(pctVal) + '%';

    if (track) {
      track.setAttribute('aria-valuenow', Math.min(chars, max));
    }
  });
}

/* =============================================
   BUTTONS
   ============================================= */
async function copyText() {
  const text = textarea.value;
  if (!text) { showToast('Nothing to copy!'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ Copied to clipboard!');
  } catch {
    // Fallback
    textarea.select();
    document.execCommand('copy');
    showToast('✓ Copied!');
  }
}

async function pasteText() {
  try {
    const text = await navigator.clipboard.readText();
    textarea.value += text;
    updateAll();
    scheduleSave();
    textarea.focus();
    showToast('✓ Pasted!');
  } catch {
    showToast('Paste not permitted — use Ctrl+V in the text box.');
  }
}

function clearText() {
  if (!textarea.value) return;
  textarea.value = '';
  updateAll();
  localStorage.removeItem(STORAGE_KEY);
  autoSaveInd.textContent = '';
  textarea.focus();
  showToast('✓ Cleared!');
}

function downloadTxt() {
  const text = textarea.value;
  if (!text) { showToast('Nothing to download!'); return; }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'character-counter-text.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ Downloaded!');
}

/* =============================================
   KEYBOARD SHORTCUTS
   ============================================= */
function onKeydown(e) {
  // Ctrl+L – Clear
  if (e.ctrlKey && !e.shiftKey && e.key === 'l') {
    e.preventDefault();
    clearText();
    return;
  }
  // Ctrl+Shift+C – Copy
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    copyText();
    return;
  }
}

/* =============================================
   DARK MODE
   ============================================= */
function toggleDark() {
  const isDark = document.body.classList.contains('dark-mode');
  applyDark(!isDark);
}

function applyDark(on) {
  if (on) {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    darkToggle.querySelector('.toggle-icon').textContent = '☀️';
    darkToggle.setAttribute('aria-label', 'Switch to light mode');
    localStorage.setItem(DARK_MODE_KEY, '1');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    darkToggle.querySelector('.toggle-icon').textContent = '🌙';
    darkToggle.setAttribute('aria-label', 'Switch to dark mode');
    localStorage.setItem(DARK_MODE_KEY, '0');
  }
}

/* =============================================
   AUTO-SAVE
   ============================================= */
function scheduleSave() {
  clearTimeout(saveTimer);
  autoSaveInd.textContent = '';
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, textarea.value);
    autoSaveInd.textContent = 'Saved ✓';
    setTimeout(() => { autoSaveInd.textContent = ''; }, 2000);
  }, 800);
}

/* =============================================
   TOAST NOTIFICATION
   ============================================= */
let toastTimer = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

/* =============================================
   UTILITY
   ============================================= */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

