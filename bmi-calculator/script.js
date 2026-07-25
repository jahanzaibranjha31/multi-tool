/* ============================================================
   MULTI TOOLS – BMI Calculator
   script.js
   ============================================================ */

'use strict';

/* ── DOM References ──────────────────────────────────────── */
const btnMetric      = document.getElementById('btnMetric');
const btnImperial    = document.getElementById('btnImperial');
const metricInputs   = document.getElementById('metricInputs');
const imperialInputs = document.getElementById('imperialInputs');
const bmiForm        = document.getElementById('bmiForm');
const btnCalculate   = document.getElementById('btnCalculate');
const btnReset       = document.getElementById('btnReset');
const formError      = document.getElementById('formError');
const resultsCard    = document.getElementById('resultsCard');
const bmiValue       = document.getElementById('bmiValue');
const categoryBadge  = document.getElementById('categoryBadge');
const categoryLabel  = document.getElementById('categoryLabel');
const healthyRange   = document.getElementById('healthyRange');
const idealWeight    = document.getElementById('idealWeight');
const weightStatus   = document.getElementById('weightStatus');
const weightDiff     = document.getElementById('weightDiff');
const gaugeNeedle    = document.getElementById('gaugeNeedle');
const navToggle      = document.getElementById('navToggle');
const mainNav        = document.getElementById('mainNav');
const footerYear     = document.getElementById('footerYear');

/* ── State ───────────────────────────────────────────────── */
let currentUnit = 'metric';

/* ── Init ────────────────────────────────────────────────── */
footerYear.textContent = new Date().getFullYear();

/* ── Mobile nav ──────────────────────────────────────────── */
navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  mainNav.classList.toggle('open', !expanded);
});

/* Close nav when a link is clicked */
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    mainNav.classList.remove('open');
  });
});

/* ── Unit Toggle ─────────────────────────────────────────── */
function setUnit(unit) {
  currentUnit = unit;

  btnMetric.classList.toggle('active', unit === 'metric');
  btnImperial.classList.toggle('active', unit === 'imperial');
  btnMetric.setAttribute('aria-pressed', String(unit === 'metric'));
  btnImperial.setAttribute('aria-pressed', String(unit === 'imperial'));

  metricInputs.classList.toggle('hidden', unit !== 'metric');
  imperialInputs.classList.toggle('hidden', unit !== 'imperial');

  clearError();
  hideResults();
}

btnMetric.addEventListener('click', () => setUnit('metric'));
btnImperial.addEventListener('click', () => setUnit('imperial'));

/* ── BMI Categories ──────────────────────────────────────── */
function getCategory(bmi) {
  if (bmi < 18.5) return { key: 'under',   label: 'Underweight', cls: 'cat-under'   };
  if (bmi < 25.0) return { key: 'healthy', label: 'Healthy Weight', cls: 'cat-healthy' };
  if (bmi < 30.0) return { key: 'over',    label: 'Overweight',  cls: 'cat-over'    };
  if (bmi < 35.0) return { key: 'obese',   label: 'Obese – Class I',  cls: 'cat-obese' };
  if (bmi < 40.0) return { key: 'obese',   label: 'Obese – Class II', cls: 'cat-obese' };
  return           { key: 'obese',          label: 'Obese – Class III', cls: 'cat-obese' };
}

/* ── BMI Calculation ─────────────────────────────────────── */
function calcBMIMetric(heightCm, weightKg) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function calcBMIImperial(totalInches, weightLbs) {
  return (703 * weightLbs) / (totalInches * totalInches);
}

/* ── Gauge Position (BMI 16–40 mapped to 0–100%) ─────────── */
function gaugePercent(bmi) {
  const min = 16, max = 40;
  const clamped = Math.max(min, Math.min(max, bmi));
  return ((clamped - min) / (max - min)) * 100;
}

/* ── Healthy weight range for a given height ─────────────── */
function healthyWeightRange(heightCm) {
  const m = heightCm / 100;
  const low  = (18.5 * m * m).toFixed(1);
  const high = (24.9 * m * m).toFixed(1);
  return { low: parseFloat(low), high: parseFloat(high) };
}

function healthyWeightRangeImperial(totalInches) {
  const low  = ((18.5 * totalInches * totalInches) / 703).toFixed(1);
  const high = ((24.9 * totalInches * totalInches) / 703).toFixed(1);
  return { low: parseFloat(low), high: parseFloat(high) };
}

/* ── Display Result ──────────────────────────────────────── */
function showResult(bmi, heightCm, weightKg, unit) {
  const rounded = parseFloat(bmi.toFixed(1));
  const cat     = getCategory(rounded);

  /* BMI value */
  bmiValue.textContent = rounded.toFixed(1);

  /* Category badge */
  const prevCls = ['cat-under','cat-healthy','cat-over','cat-obese'];
  categoryBadge.querySelector('span').className = '';
  categoryBadge.querySelector('span').classList.add(cat.cls);
  categoryLabel.textContent = cat.label;

  /* Gauge needle */
  const pct = gaugePercent(rounded);
  gaugeNeedle.style.left = pct + '%';
  gaugeNeedle.style.display = 'block';

  /* Stats */
  if (unit === 'metric') {
    const range = healthyWeightRange(heightCm);
    healthyRange.textContent = `${range.low} – ${range.high} kg`;
    const midIdeal = ((range.low + range.high) / 2).toFixed(1);
    idealWeight.textContent  = `~${midIdeal} kg`;

    const diff = weightKg - range.high;
    if (diff > 0) {
      weightStatus.textContent = `${diff.toFixed(1)} kg over`;
    } else if (weightKg < range.low) {
      weightStatus.textContent = `${(range.low - weightKg).toFixed(1)} kg under`;
    } else {
      weightStatus.textContent = 'Within range';
    }

    if (cat.key === 'healthy') {
      weightDiff.textContent = 'At healthy weight ✓';
    } else if (diff > 0) {
      weightDiff.textContent = `Lose ${diff.toFixed(1)} kg`;
    } else {
      weightDiff.textContent = `Gain ${(range.low - weightKg).toFixed(1)} kg`;
    }

  } else {
    /* Imperial display — convert back for display */
    const hCm   = heightCm;
    const range = healthyWeightRange(hCm);
    const rangeLow  = (range.low  * 2.20462).toFixed(1);
    const rangeHigh = (range.high * 2.20462).toFixed(1);
    const midIdeal  = (((range.low + range.high) / 2) * 2.20462).toFixed(1);
    const weightLbs = weightKg * 2.20462;

    healthyRange.textContent = `${rangeLow} – ${rangeHigh} lbs`;
    idealWeight.textContent  = `~${midIdeal} lbs`;

    const diffLbs = weightLbs - parseFloat(rangeHigh);
    if (diffLbs > 0) {
      weightStatus.textContent = `${diffLbs.toFixed(1)} lbs over`;
      weightDiff.textContent   = `Lose ${diffLbs.toFixed(1)} lbs`;
    } else if (weightLbs < parseFloat(rangeLow)) {
      const under = (parseFloat(rangeLow) - weightLbs).toFixed(1);
      weightStatus.textContent = `${under} lbs under`;
      weightDiff.textContent   = `Gain ${under} lbs`;
    } else {
      weightStatus.textContent = 'Within range';
      weightDiff.textContent   = 'At healthy weight ✓';
    }
  }

  /* Show card */
  resultsCard.hidden = false;
  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Validation ──────────────────────────────────────────── */
function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = '';
  document.querySelectorAll('.input-wrapper input.error').forEach(el => el.classList.remove('error'));
}

function hideResults() {
  resultsCard.hidden = true;
  gaugeNeedle.style.display = 'none';
}

function markError(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.classList.add('error');
}

/* ── Form Submit ─────────────────────────────────────────── */
bmiForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  if (currentUnit === 'metric') {
    const hVal = document.getElementById('heightCm').value.trim();
    const wVal = document.getElementById('weightKg').value.trim();

    const hNum = parseFloat(hVal);
    const wNum = parseFloat(wVal);

    if (!hVal || isNaN(hNum) || hNum < 50 || hNum > 300) {
      showError('Please enter a valid height between 50 and 300 cm.');
      markError('heightCm');
      return;
    }
    if (!wVal || isNaN(wNum) || wNum < 10 || wNum > 500) {
      showError('Please enter a valid weight between 10 and 500 kg.');
      markError('weightKg');
      return;
    }

    const bmi = calcBMIMetric(hNum, wNum);
    showResult(bmi, hNum, wNum, 'metric');

  } else {
    const ftVal  = document.getElementById('heightFt').value.trim();
    const inVal  = document.getElementById('heightIn').value.trim();
    const lbsVal = document.getElementById('weightLbs').value.trim();

    const ftNum  = parseFloat(ftVal);
    const inNum  = parseFloat(inVal === '' ? '0' : inVal);
    const lbsNum = parseFloat(lbsVal);

    if (!ftVal || isNaN(ftNum) || ftNum < 1 || ftNum > 9) {
      showError('Please enter a valid height in feet (1–9 ft).');
      markError('heightFt');
      return;
    }
    if (isNaN(inNum) || inNum < 0 || inNum > 11) {
      showError('Please enter valid inches (0–11).');
      markError('heightIn');
      return;
    }
    if (!lbsVal || isNaN(lbsNum) || lbsNum < 20 || lbsNum > 1100) {
      showError('Please enter a valid weight between 20 and 1100 lbs.');
      markError('weightLbs');
      return;
    }

    const totalInches = ftNum * 12 + inNum;
    const heightCm    = totalInches * 2.54;
    const weightKg    = lbsNum / 2.20462;

    const bmi = calcBMIImperial(totalInches, lbsNum);
    showResult(bmi, heightCm, weightKg, 'imperial');
  }
});

/* ── Reset ───────────────────────────────────────────────── */
btnReset.addEventListener('click', () => {
  bmiForm.reset();
  clearError();
  hideResults();
  document.getElementById('heightCm').focus();
});

/* ── Keyboard: Enter on inputs triggers calculate ─────────── */
bmiForm.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bmiForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
});

/* ── FAQ: close others on open ───────────────────────────── */
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      document.querySelectorAll('.faq-item[open]').forEach(other => {
        if (other !== item) other.removeAttribute('open');
      });
    }
  });
});
