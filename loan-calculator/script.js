/* =========================================================
   LOAN CALCULATOR — APPLICATION LOGIC
   No frameworks. Vanilla JS. Charts drawn on HTML5 Canvas.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Element references ---------- */
  const form            = document.getElementById('loanForm');
  const loanTypeSel     = document.getElementById('loanType');
  const loanAmountInput = document.getElementById('loanAmount');
  const currencySel     = document.getElementById('currency');
  const currencyAffix   = document.getElementById('currencyAffix');
  const currencyAffixExtra = document.getElementById('currencyAffixExtra');
  const interestRateInput = document.getElementById('interestRate');
  const loanTermInput   = document.getElementById('loanTerm');
  const termUnitSel     = document.getElementById('termUnit');
  const paymentFreqSel  = document.getElementById('paymentFrequency');
  const startDateInput  = document.getElementById('startDate');
  const extraPaymentInput = document.getElementById('extraPayment');
  const resetBtn        = document.getElementById('resetBtn');

  const loanAmountError = document.getElementById('loanAmountError');
  const interestRateError = document.getElementById('interestRateError');
  const loanTermError    = document.getElementById('loanTermError');
  const extraPaymentError = document.getElementById('extraPaymentError');

  const resultsWrapper = document.getElementById('resultsWrapper');
  const resPayment      = document.getElementById('resPayment');
  const resPaymentIncExtra = document.getElementById('resPaymentIncExtra');
  const statInterest     = document.getElementById('statInterest');
  const statRepayment    = document.getElementById('statRepayment');
  const statPayoffDate   = document.getElementById('statPayoffDate');
  const statNumPayments  = document.getElementById('statNumPayments');
  const statInterestSaved = document.getElementById('statInterestSaved');
  const statTimeSaved     = document.getElementById('statTimeSaved');

  const doughnutCanvas = document.getElementById('doughnutChart');
  const doughnutLegend = document.getElementById('doughnutLegend');
  const lineCanvas      = document.getElementById('lineChart');
  const lineLegend      = document.getElementById('lineLegend');

  const amortBody = document.getElementById('amortBody');
  const tableHint = document.getElementById('tableHint');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  const copyBtn = document.getElementById('copyBtn');
  const printBtn = document.getElementById('printBtn');
  const pdfBtn = document.getElementById('pdfBtn');
  const actionStatus = document.getElementById('actionStatus');

  const themeToggle = document.getElementById('themeToggle');
  const iconSun = document.getElementById('iconSun');
  const iconMoon = document.getElementById('iconMoon');

  const heroSpark = document.getElementById('heroSpark');

  const MAX_TABLE_ROWS = 600;
  let lastPlainText = '';
  let lastActualSchedule = [];
  let lastCurrencySymbol = '$';
  let hasCalculatedOnce = false;

  /* =========================================================
     THEME
     ========================================================= */
  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    iconSun.hidden = isDark;
    iconMoon.hidden = !isDark;
    try { localStorage.setItem('loanCalcTheme', theme); } catch (e) { /* storage unavailable */ }
    if (hasCalculatedOnce) { drawDoughnut(lastDoughnutData); drawLine(lastLineData); }
    drawHeroSpark();
  }

  function initTheme(){
    let saved = null;
    try { saved = localStorage.getItem('loanCalcTheme'); } catch (e) { /* ignore */ }
    if (saved === 'dark' || saved === 'light') { applyTheme(saved); return; }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* =========================================================
     NUMERIC INPUT HELPERS
     ========================================================= */
  function sanitizeNumberString(str){
    return str.replace(/[^0-9.]/g, '');
  }

  function parseNumberField(str){
    const cleaned = sanitizeNumberString(String(str || ''));
    const val = parseFloat(cleaned);
    return isNaN(val) ? NaN : val;
  }

  function formatThousands(numStr){
    const cleaned = sanitizeNumberString(numStr);
    if (cleaned === '') return '';
    const parts = cleaned.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.slice(0, 2).join('.');
  }

  function attachThousandsFormatting(input){
    input.addEventListener('input', () => {
      const cursorFromEnd = input.value.length - input.selectionStart;
      input.value = formatThousands(input.value);
      const pos = Math.max(0, input.value.length - cursorFromEnd);
      input.setSelectionRange(pos, pos);
    });
  }

  attachThousandsFormatting(loanAmountInput);
  attachThousandsFormatting(extraPaymentInput);

  /* =========================================================
     CURRENCY
     ========================================================= */
  function updateCurrencyAffix(){
    lastCurrencySymbol = currencySel.value;
    currencyAffix.textContent = lastCurrencySymbol;
    currencyAffixExtra.textContent = lastCurrencySymbol;
  }
  currencySel.addEventListener('change', () => {
    updateCurrencyAffix();
    if (hasCalculatedOnce) runCalculation(false);
  });

  function formatCurrency(amount){
    const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
    return lastCurrencySymbol + rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* =========================================================
     DATE HELPERS
     ========================================================= */
  function addMonths(date, months){
    const d = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const daysInTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(date.getDate(), daysInTarget));
    return d;
  }
  function addDays(date, days){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }
  function formatDateShort(d){
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* =========================================================
     LOAN MATH
     ========================================================= */
  function computePayment(principal, periodicRate, n){
    if (periodicRate === 0) return principal / n;
    const factor = Math.pow(1 + periodicRate, n);
    return principal * periodicRate * factor / (factor - 1);
  }

  function buildSchedule(principal, periodicRate, payment, maxPeriods){
    let balance = principal;
    const schedule = [];
    let period = 0;
    while (balance > 0.005 && period < maxPeriods){
      period++;
      const interest = balance * periodicRate;
      let actualPayment = payment;
      if (actualPayment > balance + interest) actualPayment = balance + interest;
      const principalPaid = actualPayment - interest;
      balance = Math.max(0, balance - principalPaid);
      schedule.push({ period, interest, principalPaid, payment: actualPayment, balance });
    }
    return schedule;
  }

  function sumField(schedule, field){
    return schedule.reduce((acc, row) => acc + row[field], 0);
  }

  function dateForPeriod(startDate, periodIndex, freqValue){
    if (freqValue === 12) return addMonths(startDate, periodIndex);
    if (freqValue === 26) return addDays(startDate, 14 * periodIndex);
    return addDays(startDate, 7 * periodIndex); // 52 weekly
  }

  /* =========================================================
     VALIDATION
     ========================================================= */
  function clearErrors(){
    [loanAmountError, interestRateError, loanTermError, extraPaymentError].forEach(el => el.textContent = '');
    [loanAmountInput, interestRateInput, loanTermInput, extraPaymentInput].forEach(el => el.setAttribute('aria-invalid', 'false'));
  }

  function validate(){
    clearErrors();
    let valid = true;
    const amount = parseNumberField(loanAmountInput.value);
    const rate = parseNumberField(interestRateInput.value);
    const term = parseNumberField(loanTermInput.value);
    const extra = extraPaymentInput.value.trim() === '' ? 0 : parseNumberField(extraPaymentInput.value);

    if (isNaN(amount) || amount <= 0){
      loanAmountError.textContent = 'Enter a loan amount greater than zero.';
      loanAmountInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (isNaN(rate) || rate < 0 || rate > 100){
      interestRateError.textContent = 'Enter an interest rate between 0 and 100.';
      interestRateInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (isNaN(term) || term <= 0){
      loanTermError.textContent = 'Enter a loan term greater than zero.';
      loanTermInput.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      const years = termUnitSel.value === 'years' ? term : term / 12;
      if (years > 60){
        loanTermError.textContent = 'Loan term seems unusually long — please check the value.';
        loanTermInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }
    }
    if (isNaN(extra) || extra < 0){
      extraPaymentError.textContent = 'Extra payment cannot be negative.';
      extraPaymentInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    return valid;
  }

  /* =========================================================
     CHARTS
     ========================================================= */
  let lastDoughnutData = null;
  let lastLineData = null;

  function drawDoughnut(data){
    if (!data) return;
    lastDoughnutData = data;
    const ctx = doughnutCanvas.getContext('2d');
    const w = doughnutCanvas.width, h = doughnutCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, outerR = Math.min(w, h) / 2 - 8, innerR = outerR * 0.62;
    const total = data.principal + data.interest;
    const principalAngle = (data.principal / total) * Math.PI * 2;

    const colorPrincipal = cssVar('--brass-strong') || '#9C7A0E';
    const colorInterest = cssVar('--teal') || '#0E8F84';
    const trackColor = cssVar('--panel-border') || '#ddd';

    ctx.lineWidth = outerR - innerR;
    const midR = (outerR + innerR) / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, midR, 0, Math.PI * 2);
    ctx.strokeStyle = trackColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, midR, -Math.PI / 2, -Math.PI / 2 + principalAngle);
    ctx.strokeStyle = colorPrincipal;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, midR, -Math.PI / 2 + principalAngle, -Math.PI / 2 + Math.PI * 2);
    ctx.strokeStyle = colorInterest;
    ctx.stroke();

    ctx.fillStyle = cssVar('--text') || '#111';
    ctx.textAlign = 'center';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText('Total repayment', cx, cy - 6);
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillText(formatCurrency(total), cx, cy + 16);

    doughnutLegend.innerHTML = '';
    const principalPct = ((data.principal / total) * 100).toFixed(1);
    const interestPct = ((data.interest / total) * 100).toFixed(1);
    doughnutLegend.innerHTML =
      `<li><span class="legend-dot" style="background:${colorPrincipal}"></span>Principal — ${formatCurrency(data.principal)} (${principalPct}%)</li>` +
      `<li><span class="legend-dot" style="background:${colorInterest}"></span>Interest — ${formatCurrency(data.interest)} (${interestPct}%)</li>`;
  }

  function drawLine(data){
    if (!data) return;
    lastLineData = data;
    const ctx = lineCanvas.getContext('2d');
    const w = lineCanvas.width, h = lineCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 16, right: 16, bottom: 28, left: 64 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const gridColor = cssVar('--panel-border') || '#ddd';
    const textColor = cssVar('--text-muted') || '#666';
    const baseColor = cssVar('--brass-strong') || '#9C7A0E';
    const extraColor = cssVar('--teal') || '#0E8F84';

    const maxBalance = data.principal;
    const maxLen = Math.max(data.baseline.length, data.actual.length);

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    const steps = 4;
    for (let i = 0; i <= steps; i++){
      const y = padding.top + (plotH * i) / steps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      const val = maxBalance * (1 - i / steps);
      ctx.fillText(formatCurrency(val).replace('.00', ''), padding.left - 8, y + 3);
    }

    function plotSeries(series, color){
      if (series.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      series.forEach((val, i) => {
        const x = padding.left + (plotW * i) / (maxLen - 1 || 1);
        const y = padding.top + plotH * (1 - val / maxBalance);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // baseline balances (only meaningful if extra payment present)
    if (data.showBaseline) plotSeries([data.principal, ...data.baseline], baseColor + 'AA');
    plotSeries([data.principal, ...data.actual], data.showBaseline ? extraColor : baseColor);

    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.fillText('Start', padding.left, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText('Payoff', w - padding.right, h - 8);

    lineLegend.innerHTML = '';
    if (data.showBaseline){
      lineLegend.innerHTML =
        `<li><span class="legend-dot" style="background:${baseColor}"></span>Original schedule</li>` +
        `<li><span class="legend-dot" style="background:${extraColor}"></span>With extra payments</li>`;
    } else {
      lineLegend.innerHTML = `<li><span class="legend-dot" style="background:${baseColor}"></span>Loan balance</li>`;
    }
  }

  function drawHeroSpark(){
    if (!heroSpark) return;
    const ctx = heroSpark.getContext('2d');
    const w = heroSpark.width, h = heroSpark.height;
    ctx.clearRect(0, 0, w, h);
    const points = 24;
    const color = cssVar('--teal') || '#0E8F84';
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < points; i++){
      // sample declining balance curve, steeper decline near the end (typical amortization shape)
      const t = i / (points - 1);
      const val = Math.pow(1 - t, 1.6);
      const x = (w * i) / (points - 1);
      const y = h - val * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /* =========================================================
     AMORTIZATION TABLE
     ========================================================= */
  function renderTable(schedule, startDate, freqValue){
    amortBody.innerHTML = '';
    const rowsToShow = Math.min(schedule.length, MAX_TABLE_ROWS);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < rowsToShow; i++){
      const row = schedule[i];
      const tr = document.createElement('tr');
      const date = dateForPeriod(startDate, row.period, freqValue);
      tr.innerHTML =
        `<td>${row.period}</td>` +
        `<td>${formatDateShort(date)}</td>` +
        `<td>${formatCurrency(row.principalPaid)}</td>` +
        `<td>${formatCurrency(row.interest)}</td>` +
        `<td>${formatCurrency(row.balance)}</td>`;
      frag.appendChild(tr);
    }
    amortBody.appendChild(frag);
    tableHint.textContent = schedule.length > MAX_TABLE_ROWS
      ? `Showing first ${MAX_TABLE_ROWS} of ${schedule.length} payments — export CSV for the full schedule.`
      : `${schedule.length} payment${schedule.length === 1 ? '' : 's'} total.`;
  }

  function exportCsv(schedule, startDate, freqValue){
    const header = 'Payment Number,Payment Date,Principal Paid,Interest Paid,Remaining Balance\n';
    const rows = schedule.map(row => {
      const date = dateForPeriod(startDate, row.period, freqValue);
      return [
        row.period,
        formatDateShort(date),
        row.principalPaid.toFixed(2),
        row.interest.toFixed(2),
        row.balance.toFixed(2)
      ].join(',');
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amortization-schedule.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportCsvBtn.addEventListener('click', () => {
    if (!lastActualSchedule.length) return;
    const startDate = startDateInput.value ? parseDateInput(startDateInput.value) : new Date();
    const freqValue = parseInt(paymentFreqSel.value, 10);
    exportCsv(lastActualSchedule, startDate, freqValue);
    actionStatus.textContent = 'CSV exported.';
  });

  function parseDateInput(value){
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /* =========================================================
     MAIN CALCULATION
     ========================================================= */
  function runCalculation(scrollToResults){
    if (!validate()) return;

    const principal = parseNumberField(loanAmountInput.value);
    const annualRatePercent = parseNumberField(interestRateInput.value);
    const termValue = parseNumberField(loanTermInput.value);
    const termYears = termUnitSel.value === 'years' ? termValue : termValue / 12;
    const periodsPerYear = parseInt(paymentFreqSel.value, 10);
    const extra = extraPaymentInput.value.trim() === '' ? 0 : parseNumberField(extraPaymentInput.value);
    const startDate = startDateInput.value ? parseDateInput(startDateInput.value) : new Date();

    const n = Math.max(1, Math.round(termYears * periodsPerYear));
    const periodicRate = (annualRatePercent / 100) / periodsPerYear;

    const scheduledPayment = computePayment(principal, periodicRate, n);
    const baselineSchedule = buildSchedule(principal, periodicRate, scheduledPayment, n + 2);
    const actualSchedule = extra > 0
      ? buildSchedule(principal, periodicRate, scheduledPayment + extra, n + 2)
      : baselineSchedule;

    const baselineInterest = sumField(baselineSchedule, 'interest');
    const actualInterest = sumField(actualSchedule, 'interest');
    const actualPrincipalSum = sumField(actualSchedule, 'principalPaid');
    const totalRepayment = actualPrincipalSum + actualInterest;

    const interestSaved = Math.max(0, baselineInterest - actualInterest);
    const periodsSaved = Math.max(0, baselineSchedule.length - actualSchedule.length);
    const monthsSaved = Math.round(periodsSaved * (12 / periodsPerYear));
    const yearsSavedPart = Math.floor(monthsSaved / 12);
    const monthsSavedPart = monthsSaved % 12;

    const payoffDate = dateForPeriod(startDate, actualSchedule.length, periodsPerYear);

    /* ---- Update headline & stats ---- */
    resPayment.textContent = formatCurrency(scheduledPayment);
    resPaymentIncExtra.textContent = extra > 0
      ? `Actual payment with extra: ${formatCurrency(scheduledPayment + extra)} per period`
      : '';

    statInterest.textContent = formatCurrency(actualInterest);
    statRepayment.textContent = formatCurrency(totalRepayment);
    statPayoffDate.textContent = formatDateShort(payoffDate);
    statNumPayments.textContent = actualSchedule.length.toLocaleString('en-US');
    statInterestSaved.textContent = extra > 0 ? formatCurrency(interestSaved) : '—';
    statTimeSaved.textContent = extra > 0
      ? (periodsSaved === 0 ? 'None yet' : `${periodsSaved} payments (~${yearsSavedPart}y ${monthsSavedPart}m)`)
      : '—';

    /* ---- Charts ---- */
    drawDoughnut({ principal, interest: actualInterest });
    drawLine({
      principal,
      baseline: baselineSchedule.map(r => r.balance),
      actual: actualSchedule.map(r => r.balance),
      showBaseline: extra > 0
    });

    /* ---- Table ---- */
    lastActualSchedule = actualSchedule;
    renderTable(actualSchedule, startDate, periodsPerYear);

    /* ---- Plain text summary for copy/print/pdf ---- */
    lastPlainText =
`Loan Calculator Results (${loanTypeSel.options[loanTypeSel.selectedIndex].text})
Loan amount: ${formatCurrency(principal)}
Interest rate: ${annualRatePercent}% annual
Term: ${termValue} ${termUnitSel.value}
Payment frequency: ${paymentFreqSel.options[paymentFreqSel.selectedIndex].text}
Start date: ${formatDateShort(startDate)}

Payment per period: ${formatCurrency(scheduledPayment)}${extra > 0 ? ` (+ ${formatCurrency(extra)} extra = ${formatCurrency(scheduledPayment + extra)})` : ''}
Total interest: ${formatCurrency(actualInterest)}
Total repayment: ${formatCurrency(totalRepayment)}
Loan payoff date: ${formatDateShort(payoffDate)}
Total number of payments: ${actualSchedule.length}
Interest saved from extra payments: ${extra > 0 ? formatCurrency(interestSaved) : 'N/A'}
Time saved: ${extra > 0 ? (periodsSaved + ' payments (~' + yearsSavedPart + 'y ' + monthsSavedPart + 'm)') : 'N/A'}

Generated by Multi Tools Loan Calculator`;

    hasCalculatedOnce = true;
    resultsWrapper.hidden = false;
    if (scrollToResults) resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    actionStatus.textContent = '';
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runCalculation(true);
  });

  // Live calculation: recompute quietly once the user has calculated at least once
  const liveFields = [loanAmountInput, interestRateInput, loanTermInput, termUnitSel, paymentFreqSel, startDateInput, extraPaymentInput, loanTypeSel];
  let liveDebounce = null;
  liveFields.forEach(el => {
    const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if (!hasCalculatedOnce) return;
      clearTimeout(liveDebounce);
      liveDebounce = setTimeout(() => runCalculation(false), 400);
    });
  });

  resetBtn.addEventListener('click', () => {
    resultsWrapper.hidden = true;
    hasCalculatedOnce = false;
    clearErrors();
    actionStatus.textContent = '';
  });

  copyBtn.addEventListener('click', async () => {
    if (!lastPlainText) return;
    try {
      await navigator.clipboard.writeText(lastPlainText);
      actionStatus.textContent = 'Results copied to clipboard.';
    } catch (e) {
      actionStatus.textContent = 'Could not copy automatically — please select and copy manually.';
    }
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });

  pdfBtn.addEventListener('click', () => {
    if (!lastPlainText) return;
    const win = window.open('', '_blank');
    if (!win){
      actionStatus.textContent = 'Please allow pop-ups to download a PDF.';
      return;
    }
    const escaped = lastPlainText.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    win.document.write(
      '<!DOCTYPE html><html><head><title>Loan Calculator Results</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:2rem;white-space:pre-wrap;line-height:1.6;color:#111}h1{font-size:1.3rem}</style>' +
      '</head><body><h1>Loan Calculator Results</h1><pre>' + escaped + '</pre></body></html>'
    );
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
    actionStatus.textContent = 'Use the print dialog to save as PDF.';
  });

  /* =========================================================
     INIT
     ========================================================= */
  function init(){
    initTheme();
    updateCurrencyAffix();
    drawHeroSpark();

    const today = new Date();
    startDateInput.value = today.toISOString().slice(0, 10);

    window.addEventListener('resize', () => {
      drawHeroSpark();
      if (hasCalculatedOnce){ drawDoughnut(lastDoughnutData); drawLine(lastLineData); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
