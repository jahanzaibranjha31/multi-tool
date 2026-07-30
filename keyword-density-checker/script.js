/* ============================================================
   Multi Tools — Keyword Density Checker
   Vanilla JS. No frameworks, no build step, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Constants ---------------- */
  var STOP_WORDS = new Set(["a","about","above","after","again","against","all","am","an","and","any","are","aren't","as","at","be","because","been","before","being","below","between","both","but","by","can","can't","cannot","could","couldn't","did","didn't","do","does","doesn't","doing","don't","down","during","each","few","for","from","further","had","hadn't","has","hasn't","have","haven't","having","he","he'd","he'll","he's","her","here","here's","hers","herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've","if","in","into","is","isn't","it","it's","its","itself","let's","me","more","most","mustn't","my","myself","no","nor","not","of","off","on","once","only","or","other","ought","our","ours","ourselves","out","over","own","same","shan't","she","she'd","she'll","she's","should","shouldn't","so","some","such","than","that","that's","the","their","theirs","them","themselves","then","there","there's","these","they","they'd","they'll","they're","they've","this","those","through","to","too","under","until","up","very","was","wasn't","we","we'd","we'll","we're","we've","were","weren't","what","what's","when","when's","where","where's","which","while","who","who's","whom","why","why's","with","won't","would","wouldn't","you","you'd","you'll","you're","you've","your","yours","yourself","yourselves"]);

  var SAMPLE_TEXT = "Choosing the right home espresso machine starts with understanding how you actually drink coffee. A home espresso machine built for daily lattes needs a different boiler and steam wand than a home espresso machine bought purely for the occasional weekend shot. Before you buy a home espresso machine, decide on your budget, your counter space, and whether you want to grind fresh beans every morning. Semi-automatic machines give you full control over extraction, while super-automatic machines handle grinding, tamping, and brewing at the touch of a button. Either way, a good grinder matters as much as the machine itself, because inconsistent grounds ruin even the best espresso machine on the market. Take time to read reviews, compare warranties, and, if possible, test a machine in person before committing to a purchase you will use every single day.";

  /* ---------------- State ---------------- */
  var state = {
    ignoreStop: false,
    caseSensitive: false,
    minLen: 1,
    highlight: ""
  };
  var lastAnalysis = null;
  var debounceTimer = null;

  /* ---------------- DOM refs ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var textInput = $("text-input");

  /* ================= Theme ================= */
  function initTheme() {
    var saved = localStorage.getItem("kdc-theme");
    var theme = saved || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeUI(theme);
    $("theme-toggle").addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("kdc-theme", next);
      updateThemeUI(next);
    });
  }
  function updateThemeUI(theme) {
    $("theme-label").textContent = theme === "dark" ? "Dark mode" : "Light mode";
    $("theme-toggle").setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }

  /* ================= Loading bar (page-load flourish) ================= */
  function runLoadingBar() {
    var bar = $("loading-bar");
    requestAnimationFrame(function () { bar.classList.add("active"); });
    window.addEventListener("load", function () {
      setTimeout(function () {
        bar.classList.add("done");
      }, 250);
    });
  }

  /* ================= Tokenizing helpers ================= */
  function getSentences(text) {
    var trimmed = text.trim();
    if (!trimmed) return [];
    var parts = trimmed.split(/[.!?]+(?:\s+|$)/).map(function (s) { return s.trim(); }).filter(Boolean);
    return parts;
  }
  function getParagraphs(text) {
    var trimmed = text.trim();
    if (!trimmed) return [];
    return trimmed.split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }
  function rawWords(text) {
    var matches = text.match(/[A-Za-z0-9'’-]+/g);
    return matches ? matches : [];
  }
  function normalizeWord(w) {
    var word = w.replace(/^['’-]+|['’-]+$/g, "");
    return state.caseSensitive ? word : word.toLowerCase();
  }
  function filteredTokens(text) {
    var words = rawWords(text);
    var out = [];
    for (var i = 0; i < words.length; i++) {
      var norm = normalizeWord(words[i]);
      if (!norm) continue;
      if (norm.length < state.minLen) continue;
      if (state.ignoreStop && STOP_WORDS.has(norm.toLowerCase())) continue;
      out.push(norm);
    }
    return out;
  }

  /* ================= Core analysis ================= */
  function analyze(text) {
    var allWords = rawWords(text);
    var totalWords = allWords.length;
    var sentences = getSentences(text);
    var paragraphs = getParagraphs(text);
    var chars = text.length;
    var charsNoSpace = text.replace(/\s/g, "").length;

    var tokens = filteredTokens(text);

    // Frequency maps
    var freq1 = buildNgramFreq(tokens, 1, totalWords);
    var freq2 = buildNgramFreq(tokens, 2, totalWords);
    var freq3 = buildNgramFreq(tokens, 3, totalWords);

    // Word length stats (based on all real words, unfiltered by stopword toggle, respecting min length + case)
    var lengths = allWords.map(function (w) { return normalizeWord(w); }).filter(Boolean);
    var longest = "", shortest = "";
    lengths.forEach(function (w) {
      if (w.length > longest.length) longest = w;
      if (!shortest || w.length < shortest.length) shortest = w;
    });
    var avgWordLen = lengths.length ? (lengths.reduce(function (a, w) { return a + w.length; }, 0) / lengths.length) : 0;
    var avgSentLen = sentences.length ? (totalWords / sentences.length) : 0;

    var uniqueSet = new Set(lengths.map(function (w) { return w.toLowerCase(); }));
    var uniqueCount = uniqueSet.size;
    var diversity = lengths.length ? (uniqueCount / lengths.length) * 100 : 0;

    var readingTime = totalWords / 225; // minutes
    var speakingTime = totalWords / 130; // minutes

    return {
      text: text,
      totalWords: totalWords,
      chars: chars,
      charsNoSpace: charsNoSpace,
      sentences: sentences.length,
      paragraphs: paragraphs.length || (text.trim() ? 1 : 0),
      readingTime: readingTime,
      speakingTime: speakingTime,
      freq1: freq1,
      freq2: freq2,
      freq3: freq3,
      longest: longest || "—",
      shortest: shortest || "—",
      avgWordLen: avgWordLen,
      avgSentLen: avgSentLen,
      uniqueCount: uniqueCount,
      diversity: diversity,
      quarterText: text
    };
  }

  function buildNgramFreq(tokens, n, totalWords) {
    var map = new Map();
    for (var i = 0; i <= tokens.length - n; i++) {
      var gram = tokens.slice(i, i + n).join(" ");
      var entry = map.get(gram);
      if (!entry) {
        entry = { term: gram, count: 0, positions: [] };
        map.set(gram, entry);
      }
      entry.count++;
      entry.positions.push(i);
    }
    var list = Array.from(map.values());
    list.forEach(function (e) {
      e.density = totalWords ? (e.count / totalWords) * 100 : 0;
    });
    list.sort(function (a, b) { return b.count - a.count; });
    return list.slice(0, 50);
  }

  /* ================= Rendering ================= */
  function formatMinutes(mins) {
    if (!mins || mins < 0.05) return "0 min";
    if (mins < 1) return "<1 min";
    return Math.round(mins) + " min";
  }

  function renderMiniStats(a) {
    $("stat-words").textContent = a.totalWords.toLocaleString();
    $("stat-chars").textContent = a.chars.toLocaleString();
    $("stat-chars-ns").textContent = a.charsNoSpace.toLocaleString();
    $("stat-sentences").textContent = a.sentences.toLocaleString();
    $("stat-paragraphs").textContent = a.paragraphs.toLocaleString();
    $("stat-reading").textContent = formatMinutes(a.readingTime);
    $("stat-speaking").textContent = formatMinutes(a.speakingTime);
  }

  function renderOverview(a) {
    $("stat-unique").textContent = a.uniqueCount.toLocaleString();
    $("stat-diversity").textContent = a.diversity.toFixed(0) + "%";
    $("stat-avgword").textContent = a.avgWordLen.toFixed(1);
    $("stat-avgsent").textContent = a.avgSentLen.toFixed(1);
    $("stat-longest").textContent = a.longest;
    $("stat-shortest").textContent = a.shortest;

    // SEO score heuristic
    var score = computeSeoScore(a);
    renderGauge(score.value);
    $("seo-score-word").textContent = score.label;
    $("seo-score-desc").textContent = score.desc;

    renderAlerts(a, score);
    renderDistribution(a);
  }

  function computeSeoScore(a) {
    if (a.totalWords === 0) return { value: 0, label: "—", desc: "Add some text to calculate an SEO score based on length, density, and diversity." };
    var score = 100;
    var notes = [];

    if (a.totalWords < 300) { score -= 20; notes.push("content is quite short"); }
    else if (a.totalWords < 600) { score -= 8; notes.push("could be more comprehensive"); }

    var topDensity = a.freq1.length ? a.freq1[0].density : 0;
    if (topDensity > 4) { score -= 30; notes.push("top keyword density is very high"); }
    else if (topDensity > 3) { score -= 15; notes.push("top keyword density is a bit high"); }
    else if (topDensity < 0.3 && a.totalWords > 150) { score -= 10; notes.push("no clearly dominant keyword"); }

    if (a.diversity < 35 && a.totalWords > 150) { score -= 15; notes.push("low lexical diversity"); }
    if (a.avgSentLen > 30) { score -= 8; notes.push("sentences run long on average"); }

    score = Math.max(0, Math.min(100, Math.round(score)));
    var label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs work" : "Poor";
    var desc = notes.length ? ("Score reduced because: " + notes.join(", ") + ".") : "Balanced length, density, and vocabulary diversity.";
    return { value: score, label: label, desc: desc };
  }

  function renderGauge(score) {
    var circumference = 264;
    var offset = circumference - (score / 100) * circumference;
    $("seo-gauge-fill").setAttribute("stroke-dashoffset", String(offset));
    $("seo-gauge-num").textContent = String(score);
    var color = score >= 85 ? "var(--good)" : score >= 50 ? "var(--warn)" : "var(--danger)";
    $("seo-gauge-fill").style.stroke = color;
  }

  function renderAlerts(a, score) {
    var container = $("alerts-container");
    container.innerHTML = "";
    if (a.totalWords === 0) return;

    var alerts = [];
    var top = a.freq1[0];
    if (top && top.density > 3) {
      alerts.push({ type: "danger", text: '"' + top.term + '" appears at ' + top.density.toFixed(1) + '% density — likely keyword stuffing. Consider using synonyms or removing repeats.' });
    } else if (top && top.density > 2) {
      alerts.push({ type: "warn", text: '"' + top.term + '" is at ' + top.density.toFixed(1) + '% density — approaching the upper edge of a natural range.' });
    } else if (top) {
      alerts.push({ type: "good", text: '"' + top.term + '" density (' + top.density.toFixed(1) + '%) is within a natural, healthy range.' });
    }

    // repeated-words detection (words appearing 5+ times beyond the top one)
    var repeated = a.freq1.filter(function (e) { return e.count >= 6; }).slice(0, 3).map(function (e) { return e.term; });
    if (repeated.length) {
      alerts.push({ type: "warn", text: "Frequently repeated words: " + repeated.join(", ") + ". Skim for natural variation." });
    }

    if (a.totalWords > 0 && a.totalWords < 300) {
      alerts.push({ type: "warn", text: "Content is under 300 words — search engines may see this as thin content." });
    }

    var icons = {
      good: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      warn: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      danger: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };

    alerts.forEach(function (al) {
      var div = document.createElement("div");
      div.className = "alert alert-" + al.type;
      div.innerHTML = icons[al.type] + "<span>" + escapeHtml(al.text) + "</span>";
      container.appendChild(div);
    });
  }

  function renderDistribution(a) {
    var row = $("distribution-row");
    row.innerHTML = "";
    if (!a.freq1.length || a.totalWords === 0) {
      $("distribution-caption").textContent = "How your #1 keyword is spread across the document (in quarters).";
      return;
    }
    var top = a.freq1[0];
    $("distribution-caption").textContent = 'Occurrences of "' + top.term + '" across four equal sections of the text.';
    var quarterSize = Math.max(1, Math.ceil(a.totalWords / 4));
    var counts = [0, 0, 0, 0];
    top.positions.forEach(function (pos) {
      var q = Math.min(3, Math.floor(pos / quarterSize));
      counts[q]++;
    });
    var max = Math.max.apply(null, counts.concat([1]));
    counts.forEach(function (c) {
      var seg = document.createElement("div");
      seg.className = "distribution-seg";
      var pct = Math.max(6, (c / max) * 100);
      seg.style.height = pct + "%";
      seg.innerHTML = "<span>" + c + "</span>";
      row.appendChild(seg);
    });
  }

  function renderTable(bodyId, list, totalLabel) {
    var tbody = $(bodyId);
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">No data yet — start typing in the manuscript.</td></tr>';
      return;
    }
    var maxCount = list[0].count;
    var frag = document.createDocumentFragment();
    list.forEach(function (e) {
      var tr = document.createElement("tr");
      var barPct = Math.max(4, (e.count / maxCount) * 100);
      tr.innerHTML =
        '<td class="kw-word">' + escapeHtml(e.term) + '</td>' +
        '<td>' + e.count + '</td>' +
        '<td>' + e.density.toFixed(2) + '%</td>' +
        '<td><div class="kw-bar-track"><div class="kw-bar-fill" style="width:' + barPct + '%"></div></div></td>';
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ================= Highlight preview ================= */
  function renderPreview() {
    var box = $("preview-box");
    var text = textInput.value;
    if (!text.trim()) {
      box.innerHTML = '<span class="preview-empty">Your highlighted text will appear here once you start typing.</span>';
      return;
    }
    var term = state.highlight.trim();
    var safe = escapeHtml(text);
    if (!term) {
      box.textContent = text;
      return;
    }
    var escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var flags = state.caseSensitive ? "g" : "gi";
    var re = new RegExp("(" + escapedTerm + ")", flags);
    box.innerHTML = safe.replace(re, "<mark>$1</mark>");
  }

  /* ================= Tabs ================= */
  function initTabs() {
    var tabs = [
      { btn: "tab-btn-overview", panel: "tab-overview" },
      { btn: "tab-btn-1", panel: "tab-1" },
      { btn: "tab-btn-2", panel: "tab-2" },
      { btn: "tab-btn-3", panel: "tab-3" }
    ];
    tabs.forEach(function (t, idx) {
      $(t.btn).addEventListener("click", function () {
        tabs.forEach(function (t2, idx2) {
          $(t2.btn).setAttribute("aria-selected", idx === idx2 ? "true" : "false");
          $(t2.panel).hidden = idx !== idx2;
        });
      });
    });
  }

  /* ================= Toast ================= */
  var toastTimer;
  function showToast(msg) {
    var toast = $("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  /* ================= Export / Copy / Print ================= */
  function buildSummaryText(a) {
    var lines = [];
    lines.push("Keyword Density Report");
    lines.push("=======================");
    lines.push("Words: " + a.totalWords);
    lines.push("Characters: " + a.chars + " (no spaces: " + a.charsNoSpace + ")");
    lines.push("Sentences: " + a.sentences + " | Paragraphs: " + a.paragraphs);
    lines.push("Reading time: " + formatMinutes(a.readingTime) + " | Speaking time: " + formatMinutes(a.speakingTime));
    lines.push("Unique words: " + a.uniqueCount + " | Lexical diversity: " + a.diversity.toFixed(1) + "%");
    lines.push("Avg word length: " + a.avgWordLen.toFixed(1) + " | Avg sentence length: " + a.avgSentLen.toFixed(1));
    lines.push("Longest word: " + a.longest + " | Shortest word: " + a.shortest);
    lines.push("");
    lines.push("Top single-word keywords:");
    a.freq1.slice(0, 20).forEach(function (e) { lines.push("  " + e.term + " — " + e.count + "x (" + e.density.toFixed(2) + "%)"); });
    lines.push("");
    lines.push("Top 2-word phrases:");
    a.freq2.slice(0, 15).forEach(function (e) { lines.push("  " + e.term + " — " + e.count + "x (" + e.density.toFixed(2) + "%)"); });
    lines.push("");
    lines.push("Top 3-word phrases:");
    a.freq3.slice(0, 15).forEach(function (e) { lines.push("  " + e.term + " — " + e.count + "x (" + e.density.toFixed(2) + "%)"); });
    return lines.join("\n");
  }

  function buildCsv(a) {
    var rows = [["Type", "Term", "Count", "Density %"]];
    a.freq1.forEach(function (e) { rows.push(["1-word", e.term, e.count, e.density.toFixed(2)]); });
    a.freq2.forEach(function (e) { rows.push(["2-word", e.term, e.count, e.density.toFixed(2)]); });
    a.freq3.forEach(function (e) { rows.push(["3-word", e.term, e.count, e.density.toFixed(2)]); });
    return rows.map(function (r) {
      return r.map(function (cell) {
        var s = String(cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\n");
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ================= Debounced live analysis ================= */
  function scheduleAnalysis() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runAnalysis, 120);
  }

  function runAnalysis() {
    var text = textInput.value;
    lastAnalysis = analyze(text);
    renderMiniStats(lastAnalysis);
    renderOverview(lastAnalysis);
    renderTable("table-1", lastAnalysis.freq1);
    renderTable("table-2", lastAnalysis.freq2);
    renderTable("table-3", lastAnalysis.freq3);
    renderPreview();
  }

  /* ================= Wiring ================= */
  function initControls() {
    textInput.addEventListener("input", scheduleAnalysis);

    $("opt-stopwords").addEventListener("change", function (e) { state.ignoreStop = e.target.checked; runAnalysis(); });
    $("opt-casesensitive").addEventListener("change", function (e) { state.caseSensitive = e.target.checked; runAnalysis(); });
    $("opt-minlen").addEventListener("input", function (e) {
      var v = parseInt(e.target.value, 10);
      state.minLen = isNaN(v) || v < 1 ? 1 : v;
      runAnalysis();
    });
    $("highlight-input").addEventListener("input", function (e) {
      state.highlight = e.target.value;
      renderPreview();
    });

    $("btn-sample").addEventListener("click", function () {
      textInput.value = SAMPLE_TEXT;
      runAnalysis();
      textInput.focus();
    });
    $("btn-clear").addEventListener("click", function () {
      textInput.value = "";
      state.highlight = "";
      $("highlight-input").value = "";
      runAnalysis();
      textInput.focus();
    });

    $("btn-copy").addEventListener("click", function () {
      if (!lastAnalysis || !lastAnalysis.totalWords) { showToast("Add some text first"); return; }
      var summary = buildSummaryText(lastAnalysis);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summary).then(function () { showToast("Results copied to clipboard"); })
          .catch(function () { showToast("Couldn't copy — try again"); });
      } else {
        showToast("Clipboard not available in this browser");
      }
    });
    $("btn-export-txt").addEventListener("click", function () {
      if (!lastAnalysis || !lastAnalysis.totalWords) { showToast("Add some text first"); return; }
      downloadFile("keyword-density-report.txt", buildSummaryText(lastAnalysis), "text/plain;charset=utf-8");
      showToast("Downloaded .txt report");
    });
    $("btn-export-csv").addEventListener("click", function () {
      if (!lastAnalysis || !lastAnalysis.totalWords) { showToast("Add some text first"); return; }
      downloadFile("keyword-density-report.csv", buildCsv(lastAnalysis), "text/csv;charset=utf-8");
      showToast("Downloaded .csv report");
    });
    $("btn-print").addEventListener("click", function () { window.print(); });
  }

  /* ================= Init ================= */
  document.addEventListener("DOMContentLoaded", function () {
    runLoadingBar();
    initTheme();
    initTabs();
    initControls();
    runAnalysis();
  });
})();
