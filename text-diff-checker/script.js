'use strict';
/* =========================================================
   Text Diff Checker — Engine + UI
   No frameworks, no build step. GitHub Pages ready.
   ========================================================= */
(function(){

  /* ---------------- DOM shortcuts ---------------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const originalEl = $('#originalText');
  const modifiedEl = $('#modifiedText');
  const diffOutput = $('#diffOutput');
  const statusBadge = $('#diffStatusBadge');
  const compareBtn = $('#compareBtn');
  const compareSpinner = $('#compareSpinner');
  const resetBtn = $('#resetBtn');
  const autoCompareChk = $('#autoCompare');
  const toastEl = $('#toast');

  const STORAGE_KEY = 'tdc_session_v1';

  /* ---------------- Utilities ---------------- */
  function debounce(fn, wait){
    let t;
    return function(...args){ clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getOptions(){
    return {
      ignoreCase: $('#ignoreCase').checked,
      ignoreWhitespace: $('#ignoreWhitespace').checked,
      ignoreBlankLines: $('#ignoreBlankLines').checked,
      ignorePunctuation: $('#ignorePunctuation').checked,
      granularity: $('input[name="granularity"]:checked').value, // line | word | char
      viewMode: $('input[name="viewmode"]:checked').value // side | inline | split
    };
  }

  function normalizeKey(str, opts){
    let s = str;
    if (opts.ignoreCase) s = s.toLowerCase();
    if (opts.ignorePunctuation) s = s.replace(/[^\w\s]|_/g, '');
    if (opts.ignoreWhitespace) s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function splitLines(text){
    if (text === '') return [];
    return text.split(/\r\n|\r|\n/);
  }

  function splitWords(line){
    // Keeps whitespace runs as their own tokens so spacing differences are visible.
    return line.match(/\s+|[^\s]+/g) || [];
  }

  function splitChars(line){
    return Array.from(line);
  }

  function makeTokens(list, opts){
    return list.map(text => ({ text, key: normalizeKey(text, opts) }));
  }

  /* ---------------- Core LCS diff ---------------- */
  const LARGE_INPUT_LIMIT = 4000000; // n*m DP cell cap

  function lcsDiff(a, b){
    let start = 0;
    const maxStart = Math.min(a.length, b.length);
    while (start < maxStart && a[start].key === b[start].key) start++;

    let endA = a.length, endB = b.length;
    while (endA > start && endB > start && a[endA - 1].key === b[endB - 1].key) { endA--; endB--; }

    const ops = [];
    for (let i = 0; i < start; i++) ops.push({ type: 'equal', a: a[i], b: b[i] });

    const midA = a.slice(start, endA);
    const midB = b.slice(start, endB);
    const n = midA.length, m = midB.length;

    if (n === 0 && m === 0) {
      // nothing in the middle
    } else if (n === 0) {
      midB.forEach(t => ops.push({ type: 'add', b: t }));
    } else if (m === 0) {
      midA.forEach(t => ops.push({ type: 'remove', a: t }));
    } else if (n * m > LARGE_INPUT_LIMIT) {
      // Safety fallback for very large inputs: treat whole middle as replaced.
      midA.forEach(t => ops.push({ type: 'remove', a: t }));
      midB.forEach(t => ops.push({ type: 'add', b: t }));
    } else {
      const dp = new Array(n + 1);
      for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = midA[i].key === midB[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (midA[i].key === midB[j].key) { ops.push({ type: 'equal', a: midA[i], b: midB[j] }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'remove', a: midA[i] }); i++; }
        else { ops.push({ type: 'add', b: midB[j] }); j++; }
      }
      while (i < n) { ops.push({ type: 'remove', a: midA[i] }); i++; }
      while (j < m) { ops.push({ type: 'add', b: midB[j] }); j++; }
    }

    for (let k = 0; k < a.length - endA; k++) ops.push({ type: 'equal', a: a[endA + k], b: b[endB + k] });
    return ops;
  }

  /* Group flat ops into renderable blocks: equal / remove / add / replace */
  function buildBlocks(ops){
    const blocks = [];
    let i = 0;
    while (i < ops.length) {
      const op = ops[i];
      if (op.type === 'equal') {
        const a = [], b = [];
        while (i < ops.length && ops[i].type === 'equal') { a.push(ops[i].a); b.push(ops[i].b); i++; }
        blocks.push({ type: 'equal', a, b });
      } else {
        const rem = [], add = [];
        while (i < ops.length && ops[i].type === 'remove') { rem.push(ops[i].a); i++; }
        while (i < ops.length && ops[i].type === 'add') { add.push(ops[i].b); i++; }
        if (rem.length && add.length) blocks.push({ type: 'replace', a: rem, b: add });
        else if (rem.length) blocks.push({ type: 'remove', a: rem });
        else if (add.length) blocks.push({ type: 'add', b: add });
      }
    }
    return blocks;
  }

  function subTokenize(str, granularity, opts){
    if (granularity === 'char') return makeTokens(splitChars(str), opts);
    return makeTokens(splitWords(str), opts);
  }

  /* Render a line's text with intra-line highlight marks based on sub-diff */
  function renderPairedLine(aText, bText, granularity, opts){
    if (granularity === 'line' || aText === bText) {
      return { left: escapeHtml(aText), right: escapeHtml(bText) };
    }
    const subA = subTokenize(aText, granularity, opts);
    const subB = subTokenize(bText, granularity, opts);
    const ops = lcsDiff(subA, subB);
    let left = '', right = '';
    ops.forEach(op => {
      if (op.type === 'equal') { left += escapeHtml(op.a.text); right += escapeHtml(op.b.text); }
      else if (op.type === 'remove') { left += `<mark class="tok-remove">${escapeHtml(op.a.text)}</mark>`; }
      else if (op.type === 'add') { right += `<mark class="tok-add">${escapeHtml(op.b.text)}</mark>`; }
    });
    return { left, right };
  }

  /* ---------------- Stats ---------------- */
  function computeStats(blocks){
    let added = 0, removed = 0, changed = 0, totalA = 0, totalB = 0;
    blocks.forEach(block => {
      if (block.type === 'equal') { totalA += block.a.length; totalB += block.b.length; }
      else if (block.type === 'add') { added += block.b.length; totalB += block.b.length; }
      else if (block.type === 'remove') { removed += block.a.length; totalA += block.a.length; }
      else if (block.type === 'replace') {
        const paired = Math.min(block.a.length, block.b.length);
        changed += paired;
        added += Math.max(0, block.b.length - block.a.length);
        removed += Math.max(0, block.a.length - block.b.length);
        totalA += block.a.length; totalB += block.b.length;
      }
    });
    const totalDiff = added + removed + changed;
    const denom = Math.max(totalA, totalB, 1);
    const percent = Math.round((totalDiff / denom) * 100);
    return { added, removed, changed, percent: isFinite(percent) ? percent : 0 };
  }

  /* ---------------- Rendering: Side by Side ---------------- */
  let groupCounter = 0;

  function renderSide(blocks, granularity, opts, collapse){
    groupCounter = 0;
    let leftNum = 1, rightNum = 1;
    let leftRows = '', rightRows = '';

    blocks.forEach(block => {
      if (block.type === 'equal') {
        if (collapse && block.a.length > 4) {
          const gid = 'g' + (groupCounter++);
          const shown = 1; // context lines shown at top/bottom
          const head = block.a.slice(0, shown), tail = block.a.slice(-shown);
          const headB = block.b.slice(0, shown), tailB = block.b.slice(-shown);
          leftRows += equalRowsHtml(head, leftNum); rightRows += equalRowsHtml(headB, rightNum);
          leftNum += shown; rightNum += shown;
          const midCount = block.a.length - shown * 2;
          leftRows += `<div class="diff-group-toggle-row" data-group="${gid}"></div>`;
          rightRows += `<div class="diff-group-toggle-row" data-group="${gid}"></div>`;
          const midA = block.a.slice(shown, -shown), midB = block.b.slice(shown, -shown);
          leftRows = leftRows.replace(`<div class="diff-group-toggle-row" data-group="${gid}"></div>`,
            `<div class="diff-group collapsed" data-group="${gid}"><button type="button" class="diff-group-toggle"><span class="chev">▾</span> ${midCount} unchanged line${midCount===1?'':'s'}</button><div class="diff-group-body">${equalRowsHtml(midA, leftNum)}</div></div>`);
          rightRows = rightRows.replace(`<div class="diff-group-toggle-row" data-group="${gid}"></div>`,
            `<div class="diff-group collapsed" data-group="${gid}"><button type="button" class="diff-group-toggle"><span class="chev">▾</span> ${midCount} unchanged line${midCount===1?'':'s'}</button><div class="diff-group-body">${equalRowsHtml(midB, rightNum)}</div></div>`);
          leftNum += midA.length; rightNum += midB.length;
          leftRows += equalRowsHtml(tail, leftNum); rightRows += equalRowsHtml(tailB, rightNum);
          leftNum += shown; rightNum += shown;
        } else {
          leftRows += equalRowsHtml(block.a, leftNum); rightRows += equalRowsHtml(block.b, rightNum);
          leftNum += block.a.length; rightNum += block.b.length;
        }
      } else if (block.type === 'remove') {
        block.a.forEach(tok => { leftRows += lineRow(leftNum++, 'removed', escapeHtml(tok.text)); rightRows += lineRow(null, 'placeholder', ''); });
      } else if (block.type === 'add') {
        block.b.forEach(tok => { rightRows += lineRow(rightNum++, 'added', escapeHtml(tok.text)); leftRows += lineRow(null, 'placeholder', ''); });
      } else if (block.type === 'replace') {
        const max = Math.max(block.a.length, block.b.length);
        for (let i = 0; i < max; i++) {
          const a = block.a[i], b = block.b[i];
          if (a && b) {
            const { left, right } = renderPairedLine(a.text, b.text, granularity, opts);
            leftRows += lineRow(leftNum++, 'modified', left);
            rightRows += lineRow(rightNum++, 'modified', right);
          } else if (a) {
            leftRows += lineRow(leftNum++, 'removed', escapeHtml(a.text));
            rightRows += lineRow(null, 'placeholder', '');
          } else if (b) {
            rightRows += lineRow(rightNum++, 'added', escapeHtml(b.text));
            leftRows += lineRow(null, 'placeholder', '');
          }
        }
      }
    });

    return `<div class="diff-side">
      <div class="diff-col"><div class="diff-col-head">Original</div>${leftRows}</div>
      <div class="diff-col"><div class="diff-col-head">Modified</div>${rightRows}</div>
    </div>`;
  }

  function equalRowsHtml(tokens, startNum){
    let html = '';
    tokens.forEach((tok, idx) => { html += lineRow(startNum + idx, 'unchanged', escapeHtml(tok.text)); });
    return html;
  }

  function lineRow(num, cls, html){
    const n = num === null ? '' : num;
    return `<div class="diff-line ${cls}"><span class="ln">${n}</span><span class="content">${html || '&nbsp;'}</span></div>`;
  }

  /* ---------------- Rendering: Inline (unified) ---------------- */
  function renderInline(blocks, granularity, opts){
    let oldNum = 1, newNum = 1, rows = '';
    blocks.forEach(block => {
      if (block.type === 'equal') {
        block.a.forEach((tok, idx) => {
          rows += inlineRow(oldNum++, newNum++, 'unchanged', ' ', escapeHtml(tok.text));
        });
      } else if (block.type === 'remove') {
        block.a.forEach(tok => { rows += inlineRow(oldNum++, null, 'removed', '−', escapeHtml(tok.text)); });
      } else if (block.type === 'add') {
        block.b.forEach(tok => { rows += inlineRow(null, newNum++, 'added', '+', escapeHtml(tok.text)); });
      } else if (block.type === 'replace') {
        block.a.forEach(a => { rows += inlineRow(oldNum++, null, 'removed', '−', escapeHtml(a.text)); });
        block.b.forEach(b => { rows += inlineRow(null, newNum++, 'added', '+', escapeHtml(b.text)); });
      }
    });
    return `<div class="diff-inline">${rows}</div>`;
  }

  function inlineRow(oldN, newN, cls, marker, html){
    return `<div class="diff-line ${cls}"><span class="ln">${oldN ?? ''}</span><span class="ln">${newN ?? ''}</span><span class="marker">${marker}</span><span class="content">${html}</span></div>`;
  }

  /* ---------------- Wire toggles for collapsible groups ---------------- */
  function wireGroupToggles(){
    $$('.diff-group-toggle', diffOutput).forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.diff-group');
        group.classList.toggle('collapsed');
      });
    });
  }

  /* ---------------- Compare orchestration ---------------- */
  let lastBlocks = null;

  function runCompare(){
    const opts = getOptions();
    compareSpinner.hidden = false;

    setTimeout(() => {
      const originalRaw = splitLines(originalEl.value);
      const modifiedRaw = splitLines(modifiedEl.value);

      let originalLines = originalRaw, modifiedLines = modifiedRaw;
      if (opts.ignoreBlankLines) {
        originalLines = originalLines.filter(l => l.trim() !== '');
        modifiedLines = modifiedLines.filter(l => l.trim() !== '');
      }

      const aTokens = makeTokens(originalLines, opts);
      const bTokens = makeTokens(modifiedLines, opts);

      const ops = lcsDiff(aTokens, bTokens);
      const blocks = buildBlocks(ops);
      lastBlocks = blocks;

      const stats = computeStats(blocks);
      $('#statAdded').textContent = stats.added;
      $('#statRemoved').textContent = stats.removed;
      $('#statChanged').textContent = stats.changed;
      $('#statPercent').textContent = stats.percent + '%';
      $('#rulerFill').style.width = Math.min(100, stats.percent) + '%';
      const sweep = $('#rulerSweep');
      sweep.classList.remove('active'); void sweep.offsetWidth; sweep.classList.add('active');

      const hasDiff = stats.added + stats.removed + stats.changed > 0;
      statusBadge.textContent = hasDiff ? 'Differences found' : 'Texts are identical';
      statusBadge.className = 'badge ' + (hasDiff ? 'is-diff' : 'is-clean');

      if (!originalEl.value && !modifiedEl.value) {
        diffOutput.innerHTML = '<p class="diff-empty">Paste text on both sides and click <strong>Compare Text</strong> to see the differences.</p>';
      } else if (opts.viewMode === 'inline') {
        diffOutput.innerHTML = renderInline(blocks, opts.granularity, opts);
      } else if (opts.viewMode === 'split') {
        diffOutput.innerHTML = renderSide(blocks, opts.granularity, opts, true);
        wireGroupToggles();
      } else {
        diffOutput.innerHTML = renderSide(blocks, opts.granularity, opts, false);
      }

      compareSpinner.hidden = true;
      saveSession();
    }, 10);
  }

  /* ---------------- Counts ---------------- */
  function updateCounts(el, charsId, wordsId, linesId){
    const val = el.value;
    $(charsId).textContent = val.length;
    $(wordsId).textContent = val.trim() === '' ? 0 : val.trim().split(/\s+/).length;
    $(linesId).textContent = val === '' ? 0 : splitLines(val).length;
  }

  const updateLeftCounts = () => updateCounts(originalEl, '#leftChars', '#leftWords', '#leftLines');
  const updateRightCounts = () => updateCounts(modifiedEl, '#rightChars', '#rightWords', '#rightLines');

  /* ---------------- Session persistence ---------------- */
  function saveSession(){
    try {
      const opts = getOptions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        original: originalEl.value, modified: modifiedEl.value, opts
      }));
    } catch (e) { /* storage unavailable */ }
  }

  function restoreSession(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      originalEl.value = data.original || '';
      modifiedEl.value = data.modified || '';
      if (data.opts) {
        if (data.opts.ignoreCase) $('#ignoreCase').checked = true;
        if (data.opts.ignoreWhitespace) $('#ignoreWhitespace').checked = true;
        if (data.opts.ignoreBlankLines) $('#ignoreBlankLines').checked = true;
        if (data.opts.ignorePunctuation) $('#ignorePunctuation').checked = true;
        const g = document.querySelector(`input[name="granularity"][value="${data.opts.granularity}"]`);
        if (g) g.checked = true;
        const v = document.querySelector(`input[name="viewmode"][value="${data.opts.viewMode}"]`);
        if (v) v.checked = true;
      }
    } catch (e) { /* ignore corrupt session */ }
  }

  /* ---------------- File upload / drag & drop ---------------- */
  function loadFileInto(file, targetEl, updateFn){
    if (!file) return;
    if (!/\.txt$/i.test(file.name)) { toast('Only .txt files are supported'); return; }
    const reader = new FileReader();
    reader.onload = () => { targetEl.value = reader.result; updateFn(); maybeAutoCompare(); toast(`Loaded ${file.name}`); };
    reader.onerror = () => toast('Could not read file');
    reader.readAsText(file);
  }

  function wireDropzone(zoneId, targetEl, updateFn){
    const zone = $(zoneId);
    ['dragenter', 'dragover'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('drag-over'); }));
    zone.addEventListener('drop', e => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      loadFileInto(file, targetEl, updateFn);
    });
  }

  /* ---------------- Search within diff ---------------- */
  let searchMarks = [];
  let searchIndex = -1;

  function clearSearchMarks(){
    $$('mark.search-hit', diffOutput).forEach(m => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    searchMarks = [];
    searchIndex = -1;
    $('#matchCount').textContent = '0/0';
  }

  function runSearch(query){
    clearSearchMarks();
    if (!query) return;
    const q = query.toLowerCase();
    const walker = document.createTreeWalker(diffOutput, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('.diff-group-toggle')) continue;
      textNodes.push(node);
    }
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const lower = text.toLowerCase();
      if (!lower.includes(q)) return;
      const frag = document.createDocumentFragment();
      let last = 0, idx;
      while ((idx = lower.indexOf(q, last)) !== -1) {
        frag.appendChild(document.createTextNode(text.slice(last, idx)));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mark);
        searchMarks.push(mark);
        last = idx + q.length;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });
    $('#matchCount').textContent = (searchMarks.length ? 1 : 0) + '/' + searchMarks.length;
    if (searchMarks.length) { searchIndex = 0; focusSearchMark(); }
  }

  function focusSearchMark(){
    searchMarks.forEach(m => m.style.outline = '');
    const m = searchMarks[searchIndex];
    if (!m) return;
    m.scrollIntoView({ block: 'center', behavior: 'smooth' });
    m.style.outline = '2px solid var(--accent)';
    $('#matchCount').textContent = (searchIndex + 1) + '/' + searchMarks.length;
  }

  /* ---------------- Jump between changes ---------------- */
  function jumpChange(direction){
    const changeEls = $$('.diff-line.added, .diff-line.removed, .diff-line.modified', diffOutput);
    if (!changeEls.length) return;
    const viewportMid = diffOutput.scrollTop + diffOutput.clientHeight / 2;
    let target;
    if (direction > 0) {
      target = changeEls.find(el => el.offsetTop > viewportMid + 4) || changeEls[0];
    } else {
      const reversed = [...changeEls].reverse();
      target = reversed.find(el => el.offsetTop < viewportMid - 4) || changeEls[changeEls.length - 1];
    }
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.style.transition = 'box-shadow .3s';
    target.style.boxShadow = '0 0 0 2px var(--accent) inset';
    setTimeout(() => { target.style.boxShadow = ''; }, 900);
  }

  /* ---------------- Export / copy / print ---------------- */
  function buildPlainReport(){
    if (!lastBlocks) return '';
    let out = 'TEXT DIFF REPORT\n';
    out += 'Generated: ' + new Date().toLocaleString() + '\n';
    out += '='.repeat(40) + '\n\n';
    lastBlocks.forEach(block => {
      if (block.type === 'equal') block.a.forEach(t => out += '  ' + t.text + '\n');
      else if (block.type === 'remove') block.a.forEach(t => out += '- ' + t.text + '\n');
      else if (block.type === 'add') block.b.forEach(t => out += '+ ' + t.text + '\n');
      else if (block.type === 'replace') {
        block.a.forEach(t => out += '- ' + t.text + '\n');
        block.b.forEach(t => out += '+ ' + t.text + '\n');
      }
    });
    return out;
  }

  function downloadReport(){
    const content = buildPlainReport();
    if (!content) { toast('Run a comparison first'); return; }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'diff-report.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Diff report downloaded');
  }

  function copyDiff(){
    const content = buildPlainReport();
    if (!content) { toast('Run a comparison first'); return; }
    navigator.clipboard.writeText(content).then(() => toast('Diff copied to clipboard'))
      .catch(() => toast('Could not copy — check clipboard permissions'));
  }

  /* ---------------- Theme ---------------- */
  function initTheme(){
    const saved = localStorage.getItem('tdc_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton();
  }
  function updateThemeButton(){
    const isDark = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase().startsWith('#11') ||
      document.documentElement.getAttribute('data-theme') === 'dark';
    $('#themeToggle').setAttribute('aria-pressed', String(isDark));
    $('#themeToggle').setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  $('#themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : (current === 'light' ? 'dark' : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'));
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tdc_theme', next);
    updateThemeButton();
  });

  /* ---------------- Event wiring ---------------- */
  const debouncedAutoCompare = debounce(() => { if (autoCompareChk.checked) runCompare(); }, 350);
  function maybeAutoCompare(){ if (autoCompareChk.checked) runCompare(); else saveSession(); }

  originalEl.addEventListener('input', () => { updateLeftCounts(); debouncedAutoCompare(); saveSession(); });
  modifiedEl.addEventListener('input', () => { updateRightCounts(); debouncedAutoCompare(); saveSession(); });

  compareBtn.addEventListener('click', runCompare);

  resetBtn.addEventListener('click', () => {
    originalEl.value = ''; modifiedEl.value = '';
    updateLeftCounts(); updateRightCounts();
    diffOutput.innerHTML = '<p class="diff-empty">Paste text on both sides and click <strong>Compare Text</strong> to see the differences.</p>';
    statusBadge.textContent = 'Waiting for input'; statusBadge.className = 'badge';
    ['#statAdded', '#statRemoved', '#statChanged'].forEach(id => $(id).textContent = '0');
    $('#statPercent').textContent = '0%';
    $('#rulerFill').style.width = '0%';
    lastBlocks = null;
    localStorage.removeItem(STORAGE_KEY);
    toast('Cleared');
  });

  $$('input[name="granularity"], input[name="viewmode"], #ignoreCase, #ignoreWhitespace, #ignoreBlankLines, #ignorePunctuation')
    .forEach(el => el.addEventListener('change', () => maybeAutoCompare()));

  document.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'copy-left') navigator.clipboard.writeText(originalEl.value).then(() => toast('Original text copied'));
    if (action === 'copy-right') navigator.clipboard.writeText(modifiedEl.value).then(() => toast('Modified text copied'));
    if (action === 'clear-left') { originalEl.value = ''; updateLeftCounts(); maybeAutoCompare(); }
    if (action === 'clear-right') { modifiedEl.value = ''; updateRightCounts(); maybeAutoCompare(); }
    if (action === 'paste-left') navigator.clipboard.readText().then(t => { originalEl.value = t; updateLeftCounts(); maybeAutoCompare(); }).catch(() => toast('Clipboard permission denied'));
    if (action === 'paste-right') navigator.clipboard.readText().then(t => { modifiedEl.value = t; updateRightCounts(); maybeAutoCompare(); }).catch(() => toast('Clipboard permission denied'));
    if (action === 'upload-left') $('#fileInputLeft').click();
    if (action === 'upload-right') $('#fileInputRight').click();
  });

  $('#fileInputLeft').addEventListener('change', e => loadFileInto(e.target.files[0], originalEl, updateLeftCounts));
  $('#fileInputRight').addEventListener('change', e => loadFileInto(e.target.files[0], modifiedEl, updateRightCounts));
  wireDropzone('#dropzoneLeft', originalEl, updateLeftCounts);
  wireDropzone('#dropzoneRight', modifiedEl, updateRightCounts);

  $('#copyDiffBtn').addEventListener('click', copyDiff);
  $('#downloadDiffBtn').addEventListener('click', downloadReport);
  $('#printDiffBtn').addEventListener('click', () => { if (!lastBlocks) { toast('Run a comparison first'); return; } window.print(); });

  $('#jumpNextChange').addEventListener('click', () => jumpChange(1));
  $('#jumpPrevChange').addEventListener('click', () => jumpChange(-1));

  $('#expandAllBtn').addEventListener('click', () => $$('.diff-group', diffOutput).forEach(g => g.classList.remove('collapsed')));
  $('#collapseAllBtn').addEventListener('click', () => $$('.diff-group', diffOutput).forEach(g => g.classList.add('collapsed')));

  const debouncedSearch = debounce(() => runSearch($('#searchDiff').value.trim()), 200);
  $('#searchDiff').addEventListener('input', debouncedSearch);
  $('#nextMatch').addEventListener('click', () => { if (!searchMarks.length) return; searchIndex = (searchIndex + 1) % searchMarks.length; focusSearchMark(); });
  $('#prevMatch').addEventListener('click', () => { if (!searchMarks.length) return; searchIndex = (searchIndex - 1 + searchMarks.length) % searchMarks.length; focusSearchMark(); });

  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); runCompare(); }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#searchDiff').focus(); }
    if (e.key === 'Escape' && document.activeElement === $('#searchDiff')) { $('#searchDiff').value = ''; clearSearchMarks(); }
  });

  /* ---------------- Init ---------------- */
  initTheme();
  restoreSession();
  updateLeftCounts();
  updateRightCounts();
  if (originalEl.value || modifiedEl.value) runCompare();

})();
