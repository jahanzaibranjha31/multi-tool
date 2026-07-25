/**
 * Age Calculator — script.js
 * Pure vanilla JavaScript. No dependencies, no frameworks.
 * Works by opening index.html directly (GitHub Pages compatible).
 */

/* ============================================================
   SECTION 1 — DOM REFERENCES
   ============================================================ */
const $ = (id) => document.getElementById(id);

const ageForm           = $('ageForm');
const dobInput          = $('dob');
const ageAtInput        = $('ageAt');
const dobError          = $('dobError');
const darkModeToggle    = $('darkModeToggle');
const resultsSection    = $('results');
const liveCountdownCard = $('liveCountdownCard');
const footerYear        = $('footerYear');
const toast             = $('toast');

// Result display nodes
const resYears    = $('resYears');
const resMonths   = $('resMonths');
const resDays     = $('resDays');
const ageSummary  = $('ageSummary');

const liveHours   = $('liveHours');
const liveMinutes = $('liveMinutes');
const liveSeconds = $('liveSeconds');

const statTotalDays    = $('statTotalDays');
const statTotalMonths  = $('statTotalMonths');
const statTotalWeeks   = $('statTotalWeeks');
const statTotalHours   = $('statTotalHours');
const statTotalMinutes = $('statTotalMinutes');
const statTotalSeconds = $('statTotalSeconds');

const detBirthDay        = $('detBirthDay');
const detZodiac          = $('detZodiac');
const detChineseZodiac   = $('detChineseZodiac');
const detLeapYear        = $('detLeapYear');
const detDecimalAge      = $('detDecimalAge');
const detNextBirthday    = $('detNextBirthday');
const detBirthdayCountdown = $('detBirthdayCountdown');

/* ============================================================
   SECTION 2 — STATE
   ============================================================ */
let liveTimerID  = null;   // setInterval handle for live seconds counter
let bdTimerID    = null;   // setInterval handle for birthday countdown
let currentDOB   = null;   // Date object — birth date currently displayed
let isLiveMode   = false;  // true when Age At = today

/* ============================================================
   SECTION 3 — INIT
   ============================================================ */
(function init() {
  // Set footer year
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // Set max date on DOB input to today
  const todayStr = formatDateInput(new Date());
  dobInput.setAttribute('max', todayStr);

  // Default Age At Date to today
  ageAtInput.value = todayStr;

  // Restore dark mode preference
  const savedTheme = localStorage.getItem('age-calc-theme');
  if (savedTheme === 'dark') enableDark();

  // Event listeners
  ageForm.addEventListener('submit', onCalculate);
  $('resetBtn').addEventListener('click', onReset);
  $('copyBtn').addEventListener('click', onCopy);
  $('shareBtn').addEventListener('click', onShare);
  $('printBtn').addEventListener('click', () => window.print());
  darkModeToggle.addEventListener('click', toggleDark);

  // Re-calculate live stats every second if results visible
  // (handled inside startLiveCounter)
})();

/* ============================================================
   SECTION 4 — DARK MODE
   ============================================================ */
function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    disableDark();
  } else {
    enableDark();
  }
}

function enableDark() {
  document.documentElement.setAttribute('data-theme', 'dark');
  darkModeToggle.setAttribute('aria-pressed', 'true');
  localStorage.setItem('age-calc-theme', 'dark');
}

function disableDark() {
  document.documentElement.removeAttribute('data-theme');
  darkModeToggle.setAttribute('aria-pressed', 'false');
  localStorage.setItem('age-calc-theme', 'light');
}

/* ============================================================
   SECTION 5 — FORM HANDLING
   ============================================================ */
function onCalculate(e) {
  e.preventDefault();

  // Clear previous error
  clearError();

  const dobValue   = dobInput.value;
  const ageAtValue = ageAtInput.value;

  // Validate DOB
  if (!dobValue) {
    showError('Please enter your date of birth.');
    dobInput.setAttribute('aria-invalid', 'true');
    dobInput.focus();
    return;
  }

  const dob   = parseLocalDate(dobValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // DOB must not be in the future
  if (dob > today) {
    showError('Date of birth cannot be in the future.');
    dobInput.setAttribute('aria-invalid', 'true');
    dobInput.focus();
    return;
  }

  // Determine reference date
  let refDate;
  if (ageAtValue) {
    refDate = parseLocalDate(ageAtValue);
    // Ref must be >= DOB
    if (refDate < dob) {
      showError('Age At Date cannot be before your date of birth.');
      dobInput.setAttribute('aria-invalid', 'true');
      return;
    }
  } else {
    refDate = today;
  }

  // Store DOB globally
  currentDOB = dob;

  // Determine if we should run in live mode (Age At = today)
  const refStr   = formatDateInput(refDate);
  const todayStr = formatDateInput(new Date());
  isLiveMode = (refStr === todayStr);

  // Compute and display
  displayResults(dob, refDate);

  // Show results
  resultsSection.hidden = false;

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Start live counter if Age At is today
  stopLiveCounter();
  if (isLiveMode) {
    liveCountdownCard.hidden = false;
    startLiveCounter(dob);
  } else {
    liveCountdownCard.hidden = true;
  }
}

function onReset() {
  ageForm.reset();
  ageAtInput.value = formatDateInput(new Date());
  clearError();
  resultsSection.hidden = true;
  stopLiveCounter();
  currentDOB = null;
  dobInput.focus();
}

/* ============================================================
   SECTION 6 — CALCULATION ENGINE
   ============================================================ */

/**
 * Calculate age components between dob and refDate.
 * Returns { years, months, days, totalDays, totalMs }
 */
function calcAge(dob, refDate) {
  let years  = refDate.getFullYear() - dob.getFullYear();
  let months = refDate.getMonth()    - dob.getMonth();
  let days   = refDate.getDate()     - dob.getDate();

  // Adjust days
  if (days < 0) {
    months -= 1;
    // Days in previous month relative to refDate
    const prevMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust months
  if (months < 0) {
    years  -= 1;
    months += 12;
  }

  // Total days difference (using midnight timestamps)
  const msPerDay = 86400000;
  const dobMidnight = Date.UTC(dob.getFullYear(), dob.getMonth(), dob.getDate());
  const refMidnight = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const totalDays   = Math.floor((refMidnight - dobMidnight) / msPerDay);

  return { years, months, days, totalDays };
}

/**
 * Calculate total elapsed milliseconds from DOB to now (for live counter).
 */
function calcElapsedMs(dob) {
  return Date.now() - dob.getTime();
}

/* ============================================================
   SECTION 7 — DISPLAY RESULTS
   ============================================================ */
function displayResults(dob, refDate) {
  const { years, months, days, totalDays } = calcAge(dob, refDate);

  // Primary age
  resYears.textContent  = years;
  resMonths.textContent = months;
  resDays.textContent   = days;

  // Summary sentence
  ageSummary.textContent =
    `You are ${years} year${years !== 1 ? 's' : ''}, ` +
    `${months} month${months !== 1 ? 's' : ''}, and ` +
    `${days} day${days !== 1 ? 's' : ''} old.`;

  // Stat cards
  const totalMonths  = years * 12 + months;
  const totalWeeks   = Math.floor(totalDays / 7);
  const totalHours   = totalDays * 24;
  const totalMinutes = totalHours * 60;
  const totalSeconds = totalMinutes * 60;

  statTotalDays.textContent    = formatNumber(totalDays);
  statTotalMonths.textContent  = formatNumber(totalMonths);
  statTotalWeeks.textContent   = formatNumber(totalWeeks);
  statTotalHours.textContent   = formatNumber(totalHours);
  statTotalMinutes.textContent = formatNumber(totalMinutes);
  statTotalSeconds.textContent = formatNumber(totalSeconds);

  // Details
  detBirthDay.textContent      = getDayName(dob);
  detZodiac.textContent        = getZodiac(dob);
  detChineseZodiac.textContent = getChineseZodiac(dob);
  detLeapYear.textContent      = isLeapYear(dob.getFullYear()) ? '✅ Yes — Leap Year' : '❌ No — Not a Leap Year';
  detDecimalAge.textContent    = (totalDays / 365.25).toFixed(4) + ' years';

  // Next birthday
  const { nextBD, daysUntil } = getNextBirthday(dob, refDate);
  detNextBirthday.textContent = formatDateDisplay(nextBD);

  if (daysUntil === 0) {
    detBirthdayCountdown.textContent = '🎉 Today is your birthday!';
    // Start / update birthday countdown
    updateBirthdayCountdown(nextBD, true);
  } else {
    updateBirthdayCountdown(nextBD, false);
  }
}

/* ============================================================
   SECTION 8 — LIVE COUNTER (counts up every second)
   ============================================================ */
function startLiveCounter(dob) {
  // Update immediately
  tickLive(dob);
  liveTimerID = setInterval(() => tickLive(dob), 1000);
}

function tickLive(dob) {
  const elapsedMs = calcElapsedMs(dob);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  const hours   = Math.floor(elapsedSec / 3600) % 24;
  const minutes = Math.floor(elapsedSec / 60)   % 60;
  const seconds = elapsedSec % 60;

  liveHours.textContent   = String(hours).padStart(2, '0');
  liveMinutes.textContent = String(minutes).padStart(2, '0');
  liveSeconds.textContent = String(seconds).padStart(2, '0');

  // Also refresh total seconds stat card in real time
  const totalDaysLive    = Math.floor(elapsedMs / 86400000);
  const totalSecondsLive = Math.floor(elapsedMs / 1000);
  const totalMinutesLive = Math.floor(totalSecondsLive / 60);
  const totalHoursLive   = Math.floor(totalMinutesLive / 60);

  statTotalDays.textContent    = formatNumber(totalDaysLive);
  statTotalWeeks.textContent   = formatNumber(Math.floor(totalDaysLive / 7));
  statTotalHours.textContent   = formatNumber(totalHoursLive);
  statTotalMinutes.textContent = formatNumber(totalMinutesLive);
  statTotalSeconds.textContent = formatNumber(totalSecondsLive);

  // Update birthday countdown every tick
  if (currentDOB) {
    const today   = new Date();
    const { nextBD, daysUntil } = getNextBirthday(currentDOB, today);
    updateBirthdayCountdown(nextBD, daysUntil === 0);
  }
}

function stopLiveCounter() {
  if (liveTimerID) { clearInterval(liveTimerID); liveTimerID = null; }
  if (bdTimerID)   { clearInterval(bdTimerID);   bdTimerID   = null; }
}

/* ============================================================
   SECTION 9 — BIRTHDAY COUNTDOWN
   ============================================================ */
function updateBirthdayCountdown(nextBD, isBirthdayToday) {
  if (isBirthdayToday) {
    detBirthdayCountdown.textContent = '🎉 Today is your birthday!';
    return;
  }

  const msUntil  = nextBD.getTime() - Date.now();
  if (msUntil <= 0) {
    detBirthdayCountdown.textContent = '🎉 Today is your birthday!';
    return;
  }

  const totalSec = Math.floor(msUntil / 1000);
  const bdDays   = Math.floor(totalSec / 86400);
  const bdHours  = Math.floor((totalSec % 86400) / 3600);
  const bdMins   = Math.floor((totalSec % 3600)  / 60);
  const bdSecs   = totalSec % 60;

  detBirthdayCountdown.textContent =
    `${bdDays}d ${String(bdHours).padStart(2,'0')}h ` +
    `${String(bdMins).padStart(2,'0')}m ${String(bdSecs).padStart(2,'0')}s`;
}

/**
 * Get next birthday date and days until.
 * @param {Date} dob
 * @param {Date} from
 * @returns {{ nextBD: Date, daysUntil: number }}
 */
function getNextBirthday(dob, from) {
  const year   = from.getFullYear();
  const month  = dob.getMonth();
  const day    = dob.getDate();

  // Handle Feb 29 leap-year birthdays
  let candidateDay = day;
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    candidateDay = 28; // use Feb 28 in non-leap years
  }

  let nextBD = new Date(year, month, candidateDay, 0, 0, 0, 0);

  // Normalise "from" to midnight for day comparison
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (nextBD < fromMidnight) {
    // Birthday already passed this year — try next year
    const nextYear = year + 1;
    candidateDay   = (month === 1 && day === 29 && !isLeapYear(nextYear)) ? 28 : day;
    nextBD         = new Date(nextYear, month, candidateDay, 0, 0, 0, 0);
  }

  const msPerDay  = 86400000;
  const daysUntil = Math.round((nextBD.getTime() - fromMidnight.getTime()) / msPerDay);

  return { nextBD, daysUntil };
}

/* ============================================================
   SECTION 10 — ZODIAC CALCULATORS
   ============================================================ */

/** Western zodiac sign */
function getZodiac(dob) {
  const m = dob.getMonth() + 1; // 1-based
  const d = dob.getDate();

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return '♈ Aries (Mar 21 – Apr 19)';
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return '♉ Taurus (Apr 20 – May 20)';
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return '♊ Gemini (May 21 – Jun 20)';
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return '♋ Cancer (Jun 21 – Jul 22)';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return '♌ Leo (Jul 23 – Aug 22)';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return '♍ Virgo (Aug 23 – Sep 22)';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return '♎ Libra (Sep 23 – Oct 22)';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return '♏ Scorpio (Oct 23 – Nov 21)';
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return '♐ Sagittarius (Nov 22 – Dec 21)';
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19))  return '♑ Capricorn (Dec 22 – Jan 19)';
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18))   return '♒ Aquarius (Jan 20 – Feb 18)';
  return '♓ Pisces (Feb 19 – Mar 20)';
}

/** Chinese zodiac animal (based on birth year) */
function getChineseZodiac(dob) {
  const animals = [
    '🐀 Rat', '🐂 Ox', '🐅 Tiger', '🐇 Rabbit',
    '🐉 Dragon', '🐍 Snake', '🐎 Horse', '🐑 Goat',
    '🐒 Monkey', '🐓 Rooster', '🐕 Dog', '🐖 Pig'
  ];
  // 1900 is a Rat year
  const idx = (dob.getFullYear() - 1900) % 12;
  const adjusted = ((idx % 12) + 12) % 12; // handle years before 1900
  return animals[adjusted];
}

/* ============================================================
   SECTION 11 — UTILITY FUNCTIONS
   ============================================================ */

/** Check if a year is a leap year */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Format a Date as YYYY-MM-DD (for input[type=date]) */
function formatDateInput(d) {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

/**
 * Parse a YYYY-MM-DD string as a LOCAL date (avoids UTC midnight offset issues).
 * @param {string} str — e.g. "1990-03-15"
 * @returns {Date}
 */
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Human-readable date format: "March 15, 2027" */
function formatDateDisplay(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Day name: "Wednesday" */
function getDayName(d) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[d.getDay()];
}

/** Format large numbers with commas */
function formatNumber(n) {
  return n.toLocaleString('en-US');
}

/* ============================================================
   SECTION 12 — VALIDATION HELPERS
   ============================================================ */
function showError(msg) {
  dobError.textContent = msg;
}

function clearError() {
  dobError.textContent = '';
  dobInput.removeAttribute('aria-invalid');
}

/* ============================================================
   SECTION 13 — RESULT TEXT BUILDER (for copy / share)
   ============================================================ */
function buildResultText() {
  if (!currentDOB) return '';

  const lines = [
    '📅 Age Calculator Results',
    '─'.repeat(30),
    `Date of Birth:  ${formatDateDisplay(currentDOB)}`,
    `Day of Birth:   ${getDayName(currentDOB)}`,
    '',
    `Age:  ${resYears.textContent} years, ${resMonths.textContent} months, ${resDays.textContent} days`,
    '',
    `Total Days:     ${statTotalDays.textContent}`,
    `Total Weeks:    ${statTotalWeeks.textContent}`,
    `Total Months:   ${statTotalMonths.textContent}`,
    `Total Hours:    ${statTotalHours.textContent}`,
    `Total Minutes:  ${statTotalMinutes.textContent}`,
    `Total Seconds:  ${statTotalSeconds.textContent}`,
    '',
    `Zodiac Sign:    ${detZodiac.textContent}`,
    `Chinese Zodiac: ${detChineseZodiac.textContent}`,
    `Leap Year Born: ${detLeapYear.textContent}`,
    `Age (decimal):  ${detDecimalAge.textContent}`,
    '',
    `Next Birthday:  ${detNextBirthday.textContent}`,
    `Countdown:      ${detBirthdayCountdown.textContent}`,
    '',
    '─'.repeat(30),
    'Calculated at age-calculator/'
  ];
  return lines.join('\n');
}

/* ============================================================
   SECTION 14 — COPY, SHARE, PRINT
   ============================================================ */
async function onCopy() {
  const text = buildResultText();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Results copied to clipboard!');
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ Results copied!');
  }
}

async function onShare() {
  const text = buildResultText();
  if (!text) return;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Age Calculator Results',
        text: text,
      });
    } catch (err) {
      // User cancelled share — no toast needed
      if (err.name !== 'AbortError') {
        showToast('Sharing failed. Try copying instead.');
      }
    }
  } else {
    // Fallback: copy to clipboard
    await onCopy();
    showToast('📋 Share not supported — copied to clipboard instead!');
  }
}

/* ============================================================
   SECTION 15 — TOAST NOTIFICATION
   ============================================================ */
let toastTimeout = null;

function showToast(message, durationMs = 2800) {
  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, durationMs);
}

/* ============================================================
   SECTION 16 — KEYBOARD ACCESSIBILITY
   ============================================================ */
// Allow Enter/Space on custom interactive elements
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !resultsSection.hidden) {
    // Pressing Escape does NOT hide results, but could be extended
  }
});

// Ensure dark mode toggle is accessible via keyboard (already a <button>)
darkModeToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleDark();
  }
});
