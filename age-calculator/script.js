/* =========================================================
   AGE CALCULATOR — APPLICATION LOGIC
   No frameworks. Vanilla JS, modern syntax.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Element references ---------- */
  const form            = document.getElementById('ageForm');
  const birthInput      = document.getElementById('birthDate');
  const targetInput     = document.getElementById('targetDate');
  const birthError      = document.getElementById('birthDateError');
  const targetError     = document.getElementById('targetDateError');
  const todayBtn        = document.getElementById('todayBtn');
  const resetBtn        = document.getElementById('resetBtn');
  const resultsWrapper  = document.getElementById('resultsWrapper');

  const resYears  = document.getElementById('resYears');
  const resMonths = document.getElementById('resMonths');
  const resDays   = document.getElementById('resDays');

  const statWeeks   = document.getElementById('statWeeks');
  const statDays    = document.getElementById('statDays');
  const statHours   = document.getElementById('statHours');
  const statMinutes = document.getElementById('statMinutes');
  const statSeconds = document.getElementById('statSeconds');
  const statMonths  = document.getElementById('statMonths');

  const detNextBirthday   = document.getElementById('detNextBirthday');
  const detDaysUntil      = document.getElementById('detDaysUntil');
  const detWeekday        = document.getElementById('detWeekday');
  const detZodiac         = document.getElementById('detZodiac');
  const detChineseZodiac  = document.getElementById('detChineseZodiac');
  const detLeapYear       = document.getElementById('detLeapYear');

  const copyBtn     = document.getElementById('copyBtn');
  const printBtn    = document.getElementById('printBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const shareBtn     = document.getElementById('shareBtn');
  const actionStatus = document.getElementById('actionStatus');

  const themeToggle = document.getElementById('themeToggle');
  const iconSun     = document.getElementById('iconSun');
  const iconMoon    = document.getElementById('iconMoon');

  const liveSecondsEl = document.getElementById('liveSeconds');
  const dialHourHand  = document.getElementById('dialHourHand');
  const dialMinHand   = document.getElementById('dialMinHand');
  const dialTicksGroup = document.getElementById('dialTicks');

  const DAY_MS = 86400000;
  let liveTimer = null;
  let liveBirthDate = null;
  let lastPlainText = '';

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
    try { localStorage.setItem('ageCalcTheme', theme); } catch (e) { /* storage unavailable */ }
  }

  function initTheme(){
    let saved = null;
    try { saved = localStorage.getItem('ageCalcTheme'); } catch (e) { /* ignore */ }
    if (saved === 'dark' || saved === 'light') { applyTheme(saved); return; }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* =========================================================
     DIAL DECORATION (hero clock face)
     ========================================================= */
  function buildDialTicks(){
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 60; i++){
      const angle = (i / 60) * 360;
      const isMajor = i % 5 === 0;
      const r1 = isMajor ? 88 : 92;
      const r2 = 98;
      const rad = (angle - 90) * Math.PI / 180;
      const x1 = 110 + r1 * Math.cos(rad), y1 = 110 + r1 * Math.sin(rad);
      const x2 = 110 + r2 * Math.cos(rad), y2 = 110 + r2 * Math.sin(rad);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', isMajor ? '2' : '1');
      line.setAttribute('opacity', isMajor ? '0.55' : '0.25');
      frag.appendChild(line);
    }
    dialTicksGroup.appendChild(frag);
  }

  function updateDialHands(){
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    const minAngle = (minutes / 60) * 360;
    const hourAngle = (hours / 12) * 360;

    setHand(dialMinHand, minAngle, 40);
    setHand(dialHourHand, hourAngle, 50);
  }

  function setHand(el, angleDeg, length){
    const rad = (angleDeg - 90) * Math.PI / 180;
    const x = 110 + length * Math.cos(rad);
    const y = 110 + length * Math.sin(rad);
    el.setAttribute('x2', x.toFixed(2));
    el.setAttribute('y2', y.toFixed(2));
  }

  /* =========================================================
     DATE HELPERS
     ========================================================= */
  function parseDateInput(value){
    // value: 'YYYY-MM-DD' from <input type="date">, parsed as local midnight
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function isLeapYear(year){
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function daysInMonth(year, monthIndex){
    // monthIndex: 0-11
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function formatNumber(n){
    return n.toLocaleString('en-US');
  }

  function formatDate(dt){
    return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* =========================================================
     CORE AGE CALCULATION (calendar-aware cascade)
     ========================================================= */
  function calculateAgeBreakdown(birth, target){
    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days = target.getDate() - birth.getDate();

    if (days < 0){
      months -= 1;
      const prevMonthIndex = (target.getMonth() - 1 + 12) % 12;
      const prevMonthYear = target.getMonth() === 0 ? target.getFullYear() - 1 : target.getFullYear();
      days += daysInMonth(prevMonthYear, prevMonthIndex);
    }
    if (months < 0){
      years -= 1;
      months += 12;
    }
    return { years, months, days };
  }

  function getZodiacSign(month, day){
    // month: 1-12
    const signs = [
      { name: 'Capricorn', end: [1, 19] },
      { name: 'Aquarius', end: [2, 18] },
      { name: 'Pisces', end: [3, 20] },
      { name: 'Aries', end: [4, 19] },
      { name: 'Taurus', end: [5, 20] },
      { name: 'Gemini', end: [6, 20] },
      { name: 'Cancer', end: [7, 22] },
      { name: 'Leo', end: [8, 22] },
      { name: 'Virgo', end: [9, 22] },
      { name: 'Libra', end: [10, 22] },
      { name: 'Scorpio', end: [11, 21] },
      { name: 'Sagittarius', end: [12, 21] },
      { name: 'Capricorn', end: [12, 31] }
    ];
    for (const s of signs){
      const [m, d] = s.end;
      if (month < m || (month === m && day <= d)) return s.name;
    }
    return 'Capricorn';
  }

  function getChineseZodiac(year){
    const animals = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
    const idx = ((year - 4) % 12 + 12) % 12;
    return animals[idx];
  }

  function getNextBirthday(birth, today){
    const birthMonth = birth.getMonth();
    const birthDay = birth.getDate();
    let year = today.getFullYear();

    let candidateMonth = birthMonth;
    let candidateDay = birthDay;

    // Handle Feb 29 birthdays in non-leap target years
    const buildCandidate = (y) => {
      if (birthMonth === 1 && birthDay === 29 && !isLeapYear(y)){
        return new Date(y, 1, 28); // Feb 28 fallback
      }
      return new Date(y, birthMonth, birthDay);
    };

    let candidate = buildCandidate(year);
    if (candidate.getTime() < stripTime(today).getTime()){
      year += 1;
      candidate = buildCandidate(year);
    }
    return candidate;
  }

  function stripTime(dt){
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  /* =========================================================
     VALIDATION
     ========================================================= */
  function validateInputs(birthVal, targetVal){
    birthError.textContent = '';
    targetError.textContent = '';
    birthInput.setAttribute('aria-invalid', 'false');
    targetInput.setAttribute('aria-invalid', 'false');
    let valid = true;

    if (!birthVal){
      birthError.textContent = 'Please enter a date of birth.';
      birthInput.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      const birth = parseDateInput(birthVal);
      const now = new Date();
      if (!birth){
        birthError.textContent = 'That date does not look valid.';
        birthInput.setAttribute('aria-invalid', 'true');
        valid = false;
      } else if (birth.getTime() > now.getTime()){
        birthError.textContent = 'Date of birth cannot be in the future.';
        birthInput.setAttribute('aria-invalid', 'true');
        valid = false;
      } else if (birth.getFullYear() < 1900){
        birthError.textContent = 'Please enter a year after 1900.';
        birthInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }
    }

    if (targetVal){
      const target = parseDateInput(targetVal);
      const birth = parseDateInput(birthVal);
      if (!target){
        targetError.textContent = 'That date does not look valid.';
        targetInput.setAttribute('aria-invalid', 'true');
        valid = false;
      } else if (birth && target.getTime() < birth.getTime()){
        targetError.textContent = 'This date is before the date of birth.';
        targetInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }
    }
    return valid;
  }

  /* =========================================================
     LIVE COUNTER
     ========================================================= */
  function startLiveCounter(birth){
    liveBirthDate = birth;
    if (liveTimer) clearInterval(liveTimer);
    updateLiveValues();
    liveTimer = setInterval(updateLiveValues, 1000);
  }

  function updateLiveValues(){
    if (!liveBirthDate) return;
    const now = new Date();
    const diffMs = now.getTime() - liveBirthDate.getTime();
    if (diffMs < 0) return;
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours   = Math.floor(diffMs / 3600000);

    statSeconds.textContent = formatNumber(totalSeconds);
    statMinutes.textContent = formatNumber(totalMinutes);
    statHours.textContent   = formatNumber(totalHours);
    liveSecondsEl.textContent = formatNumber(totalSeconds);
  }

  /* =========================================================
     MAIN CALCULATE HANDLER
     ========================================================= */
  function runCalculation(){
    const birthVal = birthInput.value;
    const targetVal = targetInput.value;

    if (!validateInputs(birthVal, targetVal)) return;

    const birth = parseDateInput(birthVal);
    const target = targetVal ? parseDateInput(targetVal) : stripTime(new Date());

    const { years, months, days } = calculateAgeBreakdown(birth, target);

    resYears.textContent = formatNumber(years);
    resMonths.textContent = formatNumber(months);
    resDays.textContent = formatNumber(days);

    const diffMs = target.getTime() - birth.getTime();
    const totalDays = Math.floor(diffMs / DAY_MS);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;

    statDays.textContent = formatNumber(totalDays);
    statWeeks.textContent = formatNumber(totalWeeks);
    statMonths.textContent = formatNumber(totalMonths);

    // Live seconds/minutes/hours only make sense against the real current moment.
    // If target date is today (or in the past relative to now), drive live values from "now".
    const now = new Date();
    const isTargetTodayOrPast = target.getTime() <= stripTime(now).getTime();
    if (isTargetTodayOrPast){
      startLiveCounter(birth);
    } else {
      if (liveTimer) clearInterval(liveTimer);
      const totalSeconds = Math.floor(diffMs / 1000);
      const totalMinutes = Math.floor(diffMs / 60000);
      const totalHours = Math.floor(diffMs / 3600000);
      statSeconds.textContent = formatNumber(totalSeconds);
      statMinutes.textContent = formatNumber(totalMinutes);
      statHours.textContent = formatNumber(totalHours);
      liveSecondsEl.textContent = formatNumber(totalSeconds);
    }

    const nextBirthday = getNextBirthday(birth, now);
    const daysUntil = Math.ceil((stripTime(nextBirthday).getTime() - stripTime(now).getTime()) / DAY_MS);
    detNextBirthday.textContent = nextBirthday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    detDaysUntil.textContent = daysUntil === 0 ? 'Today!' : `${formatNumber(daysUntil)} day${daysUntil === 1 ? '' : 's'}`;

    detWeekday.textContent = birth.toLocaleDateString('en-US', { weekday: 'long' });
    detZodiac.textContent = getZodiacSign(birth.getMonth() + 1, birth.getDate());
    detChineseZodiac.textContent = getChineseZodiac(birth.getFullYear());
    detLeapYear.textContent = isLeapYear(birth.getFullYear())
      ? (birth.getMonth() === 1 && birth.getDate() === 29 ? 'Yes — a leap day birthday' : 'Yes')
      : 'No';

    buildPlainTextSummary(birth, target, years, months, days, totalWeeks, totalDays, totalMonths, nextBirthday, daysUntil);

    resultsWrapper.hidden = false;
    resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    actionStatus.textContent = '';
  }

  function buildPlainTextSummary(birth, target, years, months, days, totalWeeks, totalDays, totalMonths, nextBirthday, daysUntil){
    lastPlainText =
`Age Calculator Results
Date of birth: ${formatDate(birth)}
Calculated on: ${formatDate(target)}

Exact age: ${years} years, ${months} months, ${days} days

Total months lived: ${formatNumber(totalMonths)}
Total weeks lived: ${formatNumber(totalWeeks)}
Total days lived: ${formatNumber(totalDays)}
Total hours lived: ${statHours.textContent}
Total minutes lived: ${statMinutes.textContent}
Total seconds lived: ${statSeconds.textContent}

Next birthday: ${nextBirthday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (${daysUntil === 0 ? 'today' : daysUntil + ' day(s) away'})
Born on a: ${detWeekday.textContent}
Western zodiac sign: ${detZodiac.textContent}
Chinese zodiac: ${detChineseZodiac.textContent}
Leap year birth: ${detLeapYear.textContent}

Generated by Multi Tools Age Calculator`;
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runCalculation();
  });

  todayBtn.addEventListener('click', () => {
    const today = new Date();
    targetInput.value = today.toISOString().slice(0, 10);
  });

  resetBtn.addEventListener('click', () => {
    resultsWrapper.hidden = true;
    birthError.textContent = '';
    targetError.textContent = '';
    if (liveTimer) clearInterval(liveTimer);
    liveBirthDate = null;
    liveSecondsEl.textContent = '—';
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

  downloadBtn.addEventListener('click', () => {
    if (!lastPlainText) return;
    const blob = new Blob([lastPlainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'age-calculator-results.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    actionStatus.textContent = 'Results downloaded.';
  });

  shareBtn.addEventListener('click', async () => {
    if (!lastPlainText) return;
    if (navigator.share){
      try {
        await navigator.share({ title: 'My Age Calculator Results', text: lastPlainText });
        actionStatus.textContent = 'Shared successfully.';
      } catch (e) {
        // user cancelled share — no error message needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(lastPlainText);
        actionStatus.textContent = 'Sharing is not supported here — results copied to clipboard instead.';
      } catch (e) {
        actionStatus.textContent = 'Sharing is not supported in this browser.';
      }
    }
  });

  /* =========================================================
     INIT
     ========================================================= */
  function init(){
    initTheme();
    buildDialTicks();
    updateDialHands();
    setInterval(updateDialHands, 1000);

    const today = new Date();
    birthInput.max = today.toISOString().slice(0, 10);
    targetInput.max = '2100-12-31';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
