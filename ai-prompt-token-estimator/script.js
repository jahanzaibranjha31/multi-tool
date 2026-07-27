/* ============================================================
   AI Prompt Token Estimator — script.js
   Vanilla JS | Multi Tools
   ============================================================ */

'use strict';

/* ── Constants ───────────────────────────────────────────── */
const MODELS = {
  gpt:      { charsPerToken: 4.0,   maxTokens: 128000 },
  claude:   { charsPerToken: 4.0,   maxTokens: 200000 },
  gemini:   { charsPerToken: 4.1,   maxTokens: 1000000 },
  deepseek: { charsPerToken: 3.8,   maxTokens: 128000 },
  llama:    { charsPerToken: 4.0,   maxTokens: 128000 },
  mistral:  { charsPerToken: 4.5,   maxTokens: 128000 },
};

const READING_WPM  = 238;  // average adult silent reading speed
const SPEAKING_WPM = 130;  // average conversational speech speed

const SAMPLE_TEXTS = [
  `You are an expert software engineer specializing in distributed systems and cloud infrastructure. I need you to help me design a scalable microservices architecture for an e-commerce platform that expects to handle 100,000 concurrent users at peak load.

The platform needs to support:
- Product catalog with 2 million SKUs
- Real-time inventory management across 50 warehouses
- Payment processing with multiple providers (Stripe, PayPal, Apple Pay)
- Personalized recommendation engine
- Order management and fulfillment tracking

Please provide a detailed architecture overview, including which services to split into microservices, how to handle inter-service communication, and what database strategies to use for each service. Also recommend appropriate message queues, caching layers, and monitoring solutions.`,

  `Explain the concept of transformers in machine learning in simple terms. How do attention mechanisms work, and why have transformers replaced RNNs for most NLP tasks? Include examples of how self-attention computes relationships between tokens in a sentence.`,

  `Write a comprehensive marketing strategy for a B2B SaaS startup that provides AI-powered contract analysis software. The target audience is legal departments in Fortune 500 companies. The pricing ranges from $50,000 to $500,000 per year. Include channel strategy, content marketing plan, sales process, and key metrics to track.`,

  `Translate the following text into French, Spanish, German, and Japanese, preserving the tone and cultural nuances: "Innovation distinguishes between a leader and a follower. Stay hungry, stay foolish. The people who are crazy enough to think they can change the world are the ones who do."`,
];

/* ── DOM References ──────────────────────────────────────── */
const textarea      = document.getElementById('prompt-input');
const btnEstimate   = document.getElementById('btn-estimate');
const btnSample     = document.getElementById('btn-sample');
const btnCopy       = document.getElementById('btn-copy');
const btnClear      = document.getElementById('btn-clear');
const toast         = document.getElementById('toast');
const toastMsg      = document.getElementById('toast-msg');

const valChars      = document.getElementById('val-chars');
const valWords      = document.getElementById('val-words');
const valSentences  = document.getElementById('val-sentences');
const valParagraphs = document.getElementById('val-paragraphs');
const valTokens     = document.getElementById('val-tokens');
const valRead       = document.getElementById('val-read');
const valSpeak      = document.getElementById('val-speak');
const valCharsNoSp  = document.getElementById('val-chars-no-space');

/* ── State ───────────────────────────────────────────────── */
let sampleIndex = 0;
let toastTimer  = null;
let debounceTimer = null;

/* ── Utility: Format Numbers ─────────────────────────────── */
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

/* ── Utility: Format Time ────────────────────────────────── */
function formatTime(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  if (totalSeconds < 60) return totalSeconds + 's';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/* ── Core: Analyze Text ──────────────────────────────────── */
function analyzeText(text) {
  const trimmed = text.trim();

  const chars        = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;

  // Words: split on whitespace, filter empty
  const wordArr = trimmed.length === 0 ? [] : trimmed.split(/\s+/).filter(Boolean);
  const words   = wordArr.length;

  // Sentences: split on sentence-ending punctuation
  const sentences = trimmed.length === 0
    ? 0
    : (trimmed.match(/[^.!?…]*[.!?…]+/g) || [trimmed]).filter(s => s.trim().length > 0).length;

  // Paragraphs: split on one or more blank lines
  const paragraphs = trimmed.length === 0
    ? 0
    : trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

  // Token estimate (average across all models)
  const avgCharsPerToken = 4.0;
  const avgTokens = chars === 0 ? 0 : Math.max(1, Math.round(chars / avgCharsPerToken));

  // Time estimates
  const readSecs  = words === 0 ? 0 : (words / READING_WPM) * 60;
  const speakSecs = words === 0 ? 0 : (words / SPEAKING_WPM) * 60;

  // Per-model tokens
  const modelTokens = {};
  for (const [key, cfg] of Object.entries(MODELS)) {
    modelTokens[key] = chars === 0 ? 0 : Math.max(1, Math.round(chars / cfg.charsPerToken));
  }

  return { chars, charsNoSpace, words, sentences, paragraphs, avgTokens, readSecs, speakSecs, modelTokens };
}

/* ── UI: Animate Value Change ────────────────────────────── */
function setAnimated(el, newValue) {
  if (el.textContent !== newValue) {
    el.textContent = newValue;
    el.classList.remove('updated');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('updated');
  }
}

/* ── UI: Update Context Bar ──────────────────────────────── */
function updateBar(id, tokens, maxTokens) {
  const bar = document.getElementById(id);
  if (!bar) return;
  const pct = Math.min(100, (tokens / maxTokens) * 100);
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', Math.round(pct));

  // Color coding
  if (pct > 90) {
    bar.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } else if (pct > 70) {
    bar.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  } else {
    bar.style.background = '';
  }
}

/* ── UI: Render Results ──────────────────────────────────── */
function renderResults(stats) {
  const { chars, charsNoSpace, words, sentences, paragraphs, avgTokens, readSecs, speakSecs, modelTokens } = stats;

  setAnimated(valChars,      chars.toLocaleString());
  setAnimated(valCharsNoSp,  charsNoSpace.toLocaleString());
  setAnimated(valWords,      words.toLocaleString());
  setAnimated(valSentences,  sentences.toLocaleString());
  setAnimated(valParagraphs, paragraphs.toLocaleString());
  setAnimated(valTokens,     avgTokens === 0 ? '0' : formatNum(avgTokens));
  setAnimated(valRead,       chars === 0 ? '0s' : formatTime(readSecs));
  setAnimated(valSpeak,      chars === 0 ? '0s' : formatTime(speakSecs));

  // Model cards
  for (const [key, cfg] of Object.entries(MODELS)) {
    const countEl = document.getElementById('tokens-' + key);
    if (countEl) {
      const t = modelTokens[key];
      const displayVal = t === 0 ? '—' : formatNum(t);
      if (countEl.textContent !== displayVal) {
        countEl.textContent = displayVal;
        countEl.classList.remove('updated');
        void countEl.offsetWidth;
        countEl.classList.add('updated');
      }
    }
    updateBar('bar-' + key, modelTokens[key], cfg.maxTokens);
  }

  // Enable/disable copy button
  btnCopy.disabled = chars === 0;
}

/* ── Core: Run Estimation ────────────────────────────────── */
function runEstimation() {
  const text  = textarea.value;
  const stats = analyzeText(text);
  renderResults(stats);
}

/* ── Debounced Live Update ───────────────────────────────── */
function debouncedUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runEstimation, 120);
}

/* ── Toast ────────────────────────────────────────────────── */
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Button Handlers ─────────────────────────────────────── */
btnEstimate.addEventListener('click', () => {
  runEstimation();
  showToast('Token estimation complete!');

  // Brief visual feedback on button
  btnEstimate.textContent = '✓ Done!';
  btnEstimate.style.transition = 'none';
  setTimeout(() => {
    btnEstimate.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 9l5 5 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Estimate Tokens`;
  }, 1200);
});

btnSample.addEventListener('click', () => {
  textarea.value = SAMPLE_TEXTS[sampleIndex % SAMPLE_TEXTS.length];
  sampleIndex++;
  runEstimation();
  showToast('Sample text loaded!');
  textarea.focus();
});

btnCopy.addEventListener('click', async () => {
  const text = textarea.value;
  if (!text) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('Text copied to clipboard!');
  } catch {
    showToast('Copy failed — please use Ctrl+C');
  }
});

btnClear.addEventListener('click', () => {
  if (!textarea.value) return;
  textarea.value = '';
  runEstimation();
  showToast('Text cleared.');
  textarea.focus();
});

/* ── Live Estimation on Input ────────────────────────────── */
textarea.addEventListener('input', debouncedUpdate);
textarea.addEventListener('paste', () => setTimeout(debouncedUpdate, 50));

/* ── FAQ Accordion ───────────────────────────────────────── */
function initFAQ() {
  const questions = document.querySelectorAll('.faq-question');

  questions.forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen    = btn.getAttribute('aria-expanded') === 'true';
      const answerId  = btn.getAttribute('aria-controls');
      const answerEl  = document.getElementById(answerId);

      // Close all
      questions.forEach(q => {
        q.setAttribute('aria-expanded', 'false');
        const a = document.getElementById(q.getAttribute('aria-controls'));
        if (a) a.classList.remove('open');
      });

      // Toggle clicked
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        if (answerEl) answerEl.classList.add('open');
      }
    });

    // Keyboard: Space and Enter already work for buttons
    // Add Escape to close
    btn.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        btn.setAttribute('aria-expanded', 'false');
        const a = document.getElementById(btn.getAttribute('aria-controls'));
        if (a) a.classList.remove('open');
      }
    });
  });
}

/* ── Wrap FAQ answer children for grid animation ─────────── */
function wrapFAQAnswers() {
  document.querySelectorAll('.faq-answer').forEach(el => {
    // Already has a wrapper? skip
    if (el.querySelector('.faq-answer-inner')) return;
    const inner = document.createElement('div');
    inner.className = 'faq-answer-inner';
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
  });
}

/* ── Intersection Observer: Reveal Cards ─────────────────── */
function initReveal() {
  if (!('IntersectionObserver' in window)) return;

  const cards = document.querySelectorAll(
    '.stat-card, .model-card, .info-card, .model-info-card, .tip-card, .related-card, .faq-item'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(18px)';
    card.style.transition = `opacity 0.45s ease ${Math.min(i % 6, 5) * 0.06}s, transform 0.45s ease ${Math.min(i % 6, 5) * 0.06}s`;
    observer.observe(card);
  });

  // When revealed, animate in
  document.addEventListener('animateReveal', e => {
    if (e.target.classList.contains('revealed')) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });

  // Use MutationObserver to catch .revealed additions
  const mo = new MutationObserver(muts => {
    muts.forEach(mut => {
      if (mut.type === 'attributes' && mut.attributeName === 'class') {
        const el = mut.target;
        if (el.classList.contains('revealed')) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }
      }
    });
  });
  cards.forEach(c => mo.observe(c, { attributes: true }));
}

/* ── Year in Footer ──────────────────────────────────────── */
function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ── Keyboard shortcut: Ctrl+Enter to estimate ───────────── */
textarea.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runEstimation();
    showToast('Token estimation complete!');
  }
});

/* ── Smooth scroll for anchor links ──────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80; // header height
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    // Set focus for accessibility
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

/* ── Init ────────────────────────────────────────────────── */
function init() {
  setYear();
  wrapFAQAnswers();
  initFAQ();
  initReveal();
  runEstimation(); // initial (empty) state
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

