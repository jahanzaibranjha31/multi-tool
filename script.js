/* Turntable is intentionally framework-free: one small state object, one canvas, no dependencies. */
(function () {
  'use strict';

  const palettes = {
    citrus: { name: 'Citrus club', colors: ['#ef6c4e', '#2f8d86', '#f2c94c', '#d8a24a', '#bd5c54', '#73a39a', '#e79b62', '#477c78'] },
    tide: { name: 'Tidal pool', colors: ['#276b83', '#e78e62', '#e9c46a', '#4d918f', '#d96f65', '#8db6aa', '#315e76', '#edb071'] },
    berry: { name: 'Berry dusk', colors: ['#9e4d69', '#ed8f78', '#d8b35c', '#60466e', '#cb6d75', '#87a487', '#b85b64', '#e4c185'] },
    meadow: { name: 'Meadow party', colors: ['#557d63', '#e1865b', '#d8bc63', '#4e7180', '#b9655e', '#86a78a', '#d5a56c', '#6c7781'] }
  };
  const defaultOptions = ['Mina', 'Theo', 'Rae', 'Jun'];
  const storageKey = 'turntable-state-v1';
  const $ = (id) => document.getElementById(id);
  const els = {
    body: document.body, input: $('optionsInput'), list: $('optionsList'), empty: $('emptyOptions'),
    countBadge: $('countBadge'), count: $('wheelCount'), charCount: $('charCount'), spin: $('spinButton'),
    spinSubtext: $('spinSubtext'), wheelHint: $('wheelHint'), canvas: $('wheelCanvas'), stage: $('wheelStage'),
    duration: $('durationRange'), durationValue: $('durationValue'), remove: $('removeWinner'),
    duplicates: $('allowDuplicates'), themeName: $('themeName'), modal: $('winnerModal'),
    winnerTitle: $('winnerTitle'), winnerSlice: $('winnerSlice'), winnerMessage: $('winnerMessage'),
    confetti: $('confetti'), save: $('saveStatus')
  };
  const ctx = els.canvas.getContext('2d');
  let state = loadState();
  let currentRotation = 0;
  let spinning = false;
  let editingIndex = null;
  let modalLastFocus = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && Array.isArray(saved.options)) return {
        options: saved.options.filter(Boolean).map(String).slice(0, 80),
        duration: Number(saved.duration) || 6,
        removeWinner: Boolean(saved.removeWinner),
        duplicates: Boolean(saved.duplicates),
        theme: palettes[saved.theme] ? saved.theme : 'citrus',
        dark: Boolean(saved.dark),
        colors: Array.isArray(saved.colors) ? saved.colors : null
      };
    } catch (_) {}
    return { options: defaultOptions.slice(), duration: 6, removeWinner: false, duplicates: false, theme: 'citrus', dark: false, colors: null };
  }
  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    els.save.innerHTML = '<span class="save-dot"></span> Saved locally';
  }
  function setThemeMode() {
    els.body.classList.toggle('dark', state.dark);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', state.dark ? '#1d2423' : '#f7f2ea');
    $('themeToggle').setAttribute('aria-label', state.dark ? 'Switch to light mode' : 'Switch to dark mode');
    $('themeToggle').querySelector('.icon-sun').style.display = state.dark ? 'none' : 'block';
    $('themeToggle').querySelector('.icon-moon').style.display = state.dark ? 'block' : 'none';
  }
  function actualColors() {
    const palette = palettes[state.theme].colors;
    return state.colors && state.colors.length ? state.colors : palette;
  }
  function normalize(raw) {
    let values = raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!state.duplicates) values = values.filter((value, index) => values.indexOf(value) === index);
    return values.slice(0, 80);
  }
  function render() {
    state.options = normalize(els.input.value);
    els.input.value = state.options.join('\n');
    els.countBadge.textContent = state.options.length;
    els.count.textContent = state.options.length + (state.options.length === 1 ? ' option' : ' options');
    els.charCount.textContent = els.input.value.length;
    els.empty.hidden = state.options.length > 0;
    els.list.hidden = state.options.length === 0;
    els.spin.disabled = state.options.length < 2 || spinning;
    els.spinSubtext.textContent = state.options.length < 2 ? 'Add at least two options to begin' : (spinning ? 'The wheel is deciding…' : 'Press Space anytime to spin');
    els.wheelHint.textContent = state.options.length ? 'Ready for a worthy choice' : 'Waiting for a worthy choice';
    els.duration.value = state.duration;
    els.durationValue.textContent = state.duration + ' sec';
    els.remove.checked = state.removeWinner;
    els.duplicates.checked = state.duplicates;
    els.themeName.textContent = palettes[state.theme].name;
    document.querySelectorAll('.theme-swatch').forEach((button) => button.classList.toggle('active', button.dataset.theme === state.theme));
    renderList();
    drawWheel();
  }
  function icon(name) {
    if (name === 'edit') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.4-10.4a2.3 2.3 0 0 0-3.2-3.2L4 16Z"></path><path d="m13.7 7.3 3 3"></path></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"></path></svg>';
  }
  function renderList() {
    els.list.innerHTML = state.options.map((option, index) => {
      const color = actualColors()[index % actualColors().length];
      const content = editingIndex === index
        ? `<input class="option-edit-input" value="${escapeHtml(option)}" aria-label="Edit option ${index + 1}" data-edit-input="${index}" />`
        : `<span class="option-name" title="${escapeHtml(option)}">${escapeHtml(option)}</span>`;
      return `<div class="option-row" style="animation-delay:${index * 25}ms" data-row="${index}">
        <span class="option-color" style="background:${color}"></span><span class="option-index">${String(index + 1).padStart(2, '0')}</span>
        ${content}<span class="row-actions">
        <button class="row-button edit-row" type="button" aria-label="Edit ${escapeHtml(option)}" data-index="${index}">${icon('edit')}</button>
        <button class="row-button delete-row" type="button" aria-label="Delete ${escapeHtml(option)}" data-index="${index}">${icon('delete')}</button></span>
      </div>`;
    }).join('');
    if (editingIndex !== null) {
      const input = els.list.querySelector('[data-edit-input]');
      if (input) { input.focus(); input.select(); }
    }
  }
  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }
  function drawWheel() {
    const rect = els.canvas.getBoundingClientRect();
    const size = Math.max(300, rect.width || 500);
    const dpr = window.devicePixelRatio || 1;
    els.canvas.width = size * dpr; els.canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, radius = size / 2 - 7;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(currentRotation);
    const options = state.options.length ? state.options : ['Add options', 'to begin'];
    const slice = Math.PI * 2 / options.length;
    options.forEach((option, index) => {
      const start = -Math.PI / 2 + index * slice, end = start + slice;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, start, end); ctx.closePath();
      ctx.fillStyle = actualColors()[index % actualColors().length]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = state.dark ? '#232b29' : '#f7f2ea'; ctx.stroke();
      if (state.options.length) {
        ctx.save(); ctx.rotate(start + slice / 2); ctx.translate(radius * .66, 0); ctx.rotate(Math.PI / 2);
        const fontSize = Math.max(10, Math.min(17, 210 / options.length));
        ctx.font = `600 ${fontSize}px "DM Sans", sans-serif`; ctx.fillStyle = contrastColor(actualColors()[index % actualColors().length]);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(option.length > 17 ? option.slice(0, 16) + '…' : option, 0, 0); ctx.restore();
      }
    });
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = state.dark ? '#f6efe4' : '#202421'; ctx.stroke();
    ctx.restore();
  }
  function contrastColor(hex) {
    const num = parseInt(hex.slice(1), 16);
    return ((num >> 16) * 299 + ((num >> 8) & 255) * 587 + (num & 255) * 114) / 1000 > 156 ? '#202421' : '#fffaf2';
  }
  function spin() {
    if (spinning || state.options.length < 2) return;
    spinning = true; render();
    const count = state.options.length, winnerIndex = Math.floor(Math.random() * count);
    const slice = Math.PI * 2 / count;
    const target = -(winnerIndex * slice + slice / 2);
    const turns = 5 + Math.floor(Math.random() * 3);
    const startRotation = currentRotation, endRotation = currentRotation + turns * Math.PI * 2 + normalizeAngle(target - currentRotation);
    const startTime = performance.now(), duration = state.duration * 1000;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    function frame(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      currentRotation = startRotation + (endRotation - startRotation) * ease(progress);
      drawWheel();
      if (progress < 1) requestAnimationFrame(frame);
      else finishSpin(winnerIndex);
    }
    requestAnimationFrame(frame);
  }
  function normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
  }
  function finishSpin(winnerIndex) {
    const winner = state.options[winnerIndex];
    spinning = false;
    if (state.removeWinner) state.options.splice(winnerIndex, 1);
    els.input.value = state.options.join('\n');
    saveState(); render();
    showWinner(winner, actualColors()[winnerIndex % actualColors().length]);
  }
  function showWinner(winner, color) {
    modalLastFocus = document.activeElement;
    els.winnerTitle.innerHTML = `It's your turn, <em>${escapeHtml(winner)}.</em>`;
    els.winnerSlice.style.background = color;
    els.winnerMessage.textContent = state.removeWinner ? 'A lovely choice. It has taken its bow from the wheel.' : 'A very good choice, if we may say so.';
    makeConfetti();
    els.modal.hidden = false;
    $('closeWinner').focus();
  }
  function closeWinner() {
    els.modal.hidden = true; els.confetti.innerHTML = '';
    if (modalLastFocus) modalLastFocus.focus();
  }
  function makeConfetti() {
    const colors = actualColors();
    els.confetti.innerHTML = Array.from({ length: 34 }, (_, index) => `<i style="left:${Math.random() * 100}%;background:${colors[index % colors.length]};animation-delay:${Math.random() * .7}s;animation-duration:${2 + Math.random() * 1.4}s"></i>`).join('');
  }
  function flashSaved() {
    els.save.innerHTML = '<span class="save-dot"></span> Saving…';
    clearTimeout(flashSaved.timer); flashSaved.timer = setTimeout(saveState, 260);
  }
  els.input.addEventListener('input', () => { state.options = normalize(els.input.value); render(); flashSaved(); });
  els.input.addEventListener('blur', saveState);
  $('spinButton').addEventListener('click', spin);
  $('shuffleButton').addEventListener('click', () => { state.options.sort(() => Math.random() - .5); els.input.value = state.options.join('\n'); render(); flashSaved(); });
  $('randomColorsButton').addEventListener('click', () => { state.colors = Array.from({ length: 8 }, () => `hsl(${Math.floor(Math.random() * 360)} 58% ${45 + Math.floor(Math.random() * 18)}%)`); render(); flashSaved(); });
  $('clearButton').addEventListener('click', () => { if (!state.options.length || confirm('Clear every option from the wheel?')) { state.options = []; els.input.value = ''; render(); flashSaved(); } });
  $('durationRange').addEventListener('input', (event) => { state.duration = Number(event.target.value); els.durationValue.textContent = state.duration + ' sec'; flashSaved(); });
  $('removeWinner').addEventListener('change', (event) => { state.removeWinner = event.target.checked; flashSaved(); });
  $('allowDuplicates').addEventListener('change', (event) => { state.duplicates = event.target.checked; state.options = normalize(els.input.value); els.input.value = state.options.join('\n'); render(); flashSaved(); });
  $('themeToggle').addEventListener('click', () => { state.dark = !state.dark; setThemeMode(); render(); flashSaved(); });
  document.querySelectorAll('.theme-swatch').forEach((button) => button.addEventListener('click', () => { state.theme = button.dataset.theme; state.colors = null; render(); flashSaved(); }));
  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button) return;
    const index = Number(button.dataset.index);
    if (button.classList.contains('delete-row')) { state.options.splice(index, 1); els.input.value = state.options.join('\n'); editingIndex = null; render(); flashSaved(); }
    if (button.classList.contains('edit-row')) { editingIndex = index; renderList(); }
  });
  els.list.addEventListener('keydown', (event) => {
    if (!event.target.matches('[data-edit-input]')) return;
    const index = Number(event.target.dataset.editInput);
    if (event.key === 'Enter') { const value = event.target.value.trim(); if (value) state.options[index] = value; editingIndex = null; els.input.value = state.options.join('\n'); render(); flashSaved(); }
    if (event.key === 'Escape') { editingIndex = null; renderList(); }
  });
  els.list.addEventListener('blur', (event) => {
    if (!event.target.matches('[data-edit-input]')) return;
    const index = Number(event.target.dataset.editInput), value = event.target.value.trim();
    if (value) state.options[index] = value;
    editingIndex = null; els.input.value = state.options.join('\n'); render(); flashSaved();
  }, true);
  $('closeWinner').addEventListener('click', closeWinner);
  $('spinAgainButton').addEventListener('click', () => { closeWinner(); setTimeout(spin, 80); });
  els.modal.addEventListener('click', (event) => { if (event.target === els.modal) closeWinner(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.modal.hidden) closeWinner();
    if (event.code === 'Space' && !/textarea|input/i.test(document.activeElement.tagName) && els.modal.hidden) { event.preventDefault(); spin(); }
  });
  window.addEventListener('resize', drawWheel);
  setThemeMode();
  els.input.value = state.options.join('\n');
  render();
})();