/* =========================================================
   AI Text Summarizer
   On-device extractive summarization engine + UI controller.
   No external API calls — everything runs in the browser.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. STOPWORDS — filtered out of frequency scoring since
     they carry little topical meaning on their own.
  --------------------------------------------------------- */
  var STOPWORDS = new Set([
    "a","about","above","after","again","against","all","am","an","and","any","are","aren't","as","at",
    "be","because","been","before","being","below","between","both","but","by","can","cannot","could",
    "did","do","does","doing","down","during","each","few","for","from","further","had","has","have",
    "having","he","her","here","hers","herself","him","himself","his","how","i","if","in","into","is",
    "it","its","itself","just","let","me","more","most","my","myself","no","nor","not","of","off","on",
    "once","only","or","other","our","ours","ourselves","out","over","own","same","she","should","so",
    "some","such","than","that","the","their","theirs","them","themselves","then","there","these","they",
    "this","those","through","to","too","under","until","up","very","was","we","were","what","when",
    "where","which","while","who","whom","why","will","with","would","you","your","yours","yourself",
    "yourselves","also","however","therefore","thus","upon","across","among","within","without","per"
  ]);

  /* ---------------------------------------------------------
     2. SENTENCE SPLITTING — respects common abbreviations,
     decimals, and initials so sentences aren't cut mid-thought.
  --------------------------------------------------------- */
  var ABBREVIATIONS = ["mr","mrs","ms","dr","prof","sr","jr","vs","etc","e.g","i.e","u.s","u.k","st","no","fig","vol","approx"];

  function splitSentences(text) {
    var clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return [];

    // Protect abbreviations and decimal numbers from being treated as sentence ends.
    var protectedText = clean.replace(/(\d)\.(\d)/g, "$1<DEC>$2");
    ABBREVIATIONS.forEach(function (abbr) {
      var re = new RegExp("\\b" + abbr.replace(".", "\\.") + "\\.", "gi");
      protectedText = protectedText.replace(re, function (m) { return m.slice(0, -1) + "<DOT>"; });
    });

    var rawSentences = protectedText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [];

    return rawSentences
      .map(function (s) {
        return s.replace(/<DOT>/g, ".").replace(/<DEC>/g, ".").trim();
      })
      .filter(function (s) { return s.length > 0; });
  }

  function countWords(text) {
    var matches = text.trim().match(/[A-Za-z0-9'’-]+/g);
    return matches ? matches.length : 0;
  }

  function estimateReadTime(wordCount) {
    var minutes = wordCount / 200;
    if (minutes < 1) return "< 1 min";
    return Math.ceil(minutes) + " min";
  }

  /* ---------------------------------------------------------
     3. SCORING — word-frequency based, with positional and
     structural bonuses. Pure extractive approach: every word
     in the summary already existed in the source text.
  --------------------------------------------------------- */
  function tokenize(sentence) {
    var matches = sentence.toLowerCase().match(/[a-z0-9']+/g);
    return matches || [];
  }

  function buildFrequencyMap(sentences) {
    var freq = Object.create(null);
    var maxFreq = 0;

    sentences.forEach(function (sentence) {
      tokenize(sentence).forEach(function (word) {
        if (STOPWORDS.has(word) || word.length < 3) return;
        freq[word] = (freq[word] || 0) + 1;
        if (freq[word] > maxFreq) maxFreq = freq[word];
      });
    });

    // Normalize to 0–1 range so scores are comparable across texts.
    if (maxFreq > 0) {
      Object.keys(freq).forEach(function (word) {
        freq[word] = freq[word] / maxFreq;
      });
    }
    return freq;
  }

  function scoreSentences(sentences, freqMap) {
    var total = sentences.length;

    return sentences.map(function (sentence, index) {
      var words = tokenize(sentence);
      var meaningfulWords = words.filter(function (w) { return !STOPWORDS.has(w) && w.length >= 3; });

      var rawScore = meaningfulWords.reduce(function (sum, word) {
        return sum + (freqMap[word] || 0);
      }, 0);

      // Normalize by sqrt of length to avoid rewarding very long sentences unfairly.
      var lengthNorm = Math.sqrt(Math.max(words.length, 1));
      var densityScore = rawScore / lengthNorm;

      // Positional bonus: openings and closings often carry key ideas.
      var positionBonus = 0;
      if (index < 2) positionBonus = 0.18;
      else if (index >= total - 2) positionBonus = 0.10;
      else if (index === Math.floor(total / 2)) positionBonus = 0.04;

      // Numeric / capitalized-term bonus: sentences with figures or named
      // entities often carry concrete, citable information.
      var hasNumber = /\d/.test(sentence) ? 0.06 : 0;
      var properNouns = (sentence.match(/(?:^|\s)[A-Z][a-z]{2,}/g) || []).length;
      var properBonus = Math.min(properNouns * 0.02, 0.08);

      // Penalize very short filler sentences.
      var shortPenalty = words.length < 5 ? -0.15 : 0;

      var score = densityScore + positionBonus + hasNumber + properBonus + shortPenalty;

      return { text: sentence.trim(), index: index, score: score, wordCount: words.length };
    });
  }

  /* ---------------------------------------------------------
     4. SELECTION — pick top-N scored sentences for the target
     length, then restore original order for readable flow.
  --------------------------------------------------------- */
  function selectSentences(scored, lengthSetting) {
    var total = scored.length;
    var ratios = { short: 0.18, medium: 0.32, long: 0.5 };
    var minCounts = { short: 1, medium: 2, long: 3 };
    var ratio = ratios[lengthSetting] || ratios.medium;

    var target = Math.round(total * ratio);
    target = Math.max(minCounts[lengthSetting] || 2, target);
    target = Math.min(target, total);
    // Always leave at least one sentence uncut when the source is tiny.
    if (total <= 3) target = total;

    var ranked = scored.slice().sort(function (a, b) { return b.score - a.score; });
    var chosen = ranked.slice(0, target);
    chosen.sort(function (a, b) { return a.index - b.index; });
    return chosen;
  }

  /* ---------------------------------------------------------
     5. FORMATTING — turn selected sentences into the requested
     output style.
  --------------------------------------------------------- */
  function formatOutput(selected, style) {
    var sentences = selected.map(function (s) { return s.text; });

    if (style === "bullets") {
      var ul = document.createElement("ul");
      sentences.forEach(function (s) {
        var li = document.createElement("li");
        li.textContent = s;
        ul.appendChild(li);
      });
      return { html: ul.outerHTML, plainText: sentences.map(function (s) { return "• " + s; }).join("\n") };
    }

    if (style === "highlights") {
      var ulH = document.createElement("ul");
      sentences.forEach(function (s) {
        var li = document.createElement("li");
        var words = s.split(" ");
        var lead = words.slice(0, Math.min(6, words.length)).join(" ");
        var rest = words.slice(Math.min(6, words.length)).join(" ");
        var strong = document.createElement("strong");
        strong.textContent = lead;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(rest ? " " + rest : ""));
        ulH.appendChild(li);
      });
      return { html: ulH.outerHTML, plainText: sentences.map(function (s) { return "• " + s; }).join("\n") };
    }

    // Default: paragraph style.
    var paragraphText = sentences.join(" ");
    var p = document.createElement("p");
    p.textContent = paragraphText;
    return { html: p.outerHTML, plainText: paragraphText };
  }

  /* ---------------------------------------------------------
     6. PUBLIC ENGINE ENTRY POINT
  --------------------------------------------------------- */
  function summarize(text, options) {
    var sentences = splitSentences(text);
    if (sentences.length === 0) {
      return { html: "", plainText: "", originalWords: 0, summaryWords: 0 };
    }

    var freqMap = buildFrequencyMap(sentences);
    var scored = scoreSentences(sentences, freqMap);
    var selected = selectSentences(scored, options.length);
    var formatted = formatOutput(selected, options.style);

    return {
      html: formatted.html,
      plainText: formatted.plainText,
      originalWords: countWords(text),
      summaryWords: countWords(formatted.plainText)
    };
  }

  /* ===========================================================
     UI CONTROLLER
  =========================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    var inputText = document.getElementById("input-text");
    var inputError = document.getElementById("input-error");
    var statChars = document.getElementById("stat-chars");
    var statWords = document.getElementById("stat-words");
    var statSentences = document.getElementById("stat-sentences");
    var statReadtime = document.getElementById("stat-readtime");

    var summarizeBtn = document.getElementById("summarize-btn");
    var clearBtn = document.getElementById("clear-btn");
    var copyBtn = document.getElementById("copy-btn");
    var downloadBtn = document.getElementById("download-btn");
    var printBtn = document.getElementById("print-btn");

    var outputContent = document.getElementById("output-content");
    var outputStats = document.getElementById("output-stats");
    var statOriginalWords = document.getElementById("stat-original-words");
    var statSummaryWords = document.getElementById("stat-summary-words");
    var statReduction = document.getElementById("stat-reduction");
    var statSummaryReadtime = document.getElementById("stat-summary-readtime");

    var meterProgress = document.getElementById("meter-progress");
    var meterValue = document.getElementById("meter-value");
    var METER_CIRCUMFERENCE = 2 * Math.PI * 52;

    var themeToggle = document.getElementById("theme-toggle");

    var lengthSetting = "medium";
    var styleSetting = "paragraph";
    var lastSummaryPlainText = "";
    var MIN_WORDS_REQUIRED = 30;

    /* ---------- Auto-resize textarea ---------- */
    function autoResize() {
      inputText.style.height = "auto";
      inputText.style.height = Math.min(inputText.scrollHeight, 520) + "px";
    }

    /* ---------- Live stats ---------- */
    function updateLiveStats() {
      var text = inputText.value;
      var words = countWords(text);
      var sentences = splitSentences(text).length;

      statChars.textContent = text.length.toLocaleString();
      statWords.textContent = words.toLocaleString();
      statSentences.textContent = sentences.toLocaleString();
      statReadtime.textContent = estimateReadTime(words);

      if (inputError.textContent) {
        inputError.textContent = "";
      }
    }

    inputText.addEventListener("input", function () {
      autoResize();
      updateLiveStats();
    });

    /* ---------- Segmented controls ---------- */
    function wireSegmented(selector, onSelect) {
      var group = document.querySelectorAll(selector);
      group.forEach(function (btn) {
        btn.addEventListener("click", function () {
          group.forEach(function (b) {
            b.classList.remove("is-active");
            b.setAttribute("aria-checked", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-checked", "true");
          onSelect(btn);
        });
      });
    }

    wireSegmented(".seg-btn[data-length]", function (btn) {
      lengthSetting = btn.getAttribute("data-length");
    });
    wireSegmented(".seg-btn[data-style]", function (btn) {
      styleSetting = btn.getAttribute("data-style");
    });

    /* ---------- Meter ---------- */
    function setMeter(percent) {
      var clamped = Math.max(0, Math.min(100, percent));
      var offset = METER_CIRCUMFERENCE - (clamped / 100) * METER_CIRCUMFERENCE;
      meterProgress.style.strokeDasharray = METER_CIRCUMFERENCE.toFixed(1);
      meterProgress.style.strokeDashoffset = offset.toFixed(1);
      meterValue.textContent = Math.round(clamped) + "%";
    }

    /* ---------- Summarize action ---------- */
    function runSummarize() {
      var text = inputText.value.trim();
      var wordCount = countWords(text);

      if (wordCount === 0) {
        inputError.textContent = "Please paste some text before summarizing.";
        inputText.focus();
        return;
      }
      if (wordCount < MIN_WORDS_REQUIRED) {
        inputError.textContent = "Please enter at least " + MIN_WORDS_REQUIRED + " words for a meaningful summary (currently " + wordCount + ").";
        inputText.focus();
        return;
      }
      inputError.textContent = "";

      summarizeBtn.classList.add("is-loading");
      summarizeBtn.disabled = true;

      // Brief, honest processing delay so the loading state is perceivable;
      // the algorithm itself runs synchronously and is nearly instant.
      window.setTimeout(function () {
        try {
          var result = summarize(text, { length: lengthSetting, style: styleSetting });

          if (!result.plainText) {
            inputError.textContent = "Could not detect any sentences in that text. Try adding punctuation.";
            return;
          }

          outputContent.innerHTML = result.html;
          lastSummaryPlainText = result.plainText;

          var reduction = result.originalWords > 0
            ? Math.round((1 - result.summaryWords / result.originalWords) * 100)
            : 0;

          statOriginalWords.textContent = result.originalWords.toLocaleString();
          statSummaryWords.textContent = result.summaryWords.toLocaleString();
          statReduction.textContent = reduction + "%";
          statSummaryReadtime.textContent = estimateReadTime(result.summaryWords);
          outputStats.hidden = false;

          setMeter(reduction);

          copyBtn.disabled = false;
          downloadBtn.disabled = false;
          printBtn.disabled = false;
        } finally {
          summarizeBtn.classList.remove("is-loading");
          summarizeBtn.disabled = false;
        }
      }, 550);
    }

    summarizeBtn.addEventListener("click", runSummarize);

    /* ---------- Clear ---------- */
    clearBtn.addEventListener("click", function () {
      inputText.value = "";
      autoResize();
      updateLiveStats();
      inputError.textContent = "";
      outputContent.innerHTML = '<p class="output-placeholder">Your summary will appear here once you click <strong>Summarize Text</strong>.</p>';
      outputStats.hidden = true;
      lastSummaryPlainText = "";
      copyBtn.disabled = true;
      downloadBtn.disabled = true;
      printBtn.disabled = true;
      setMeter(0);
      inputText.focus();
    });

    /* ---------- Copy ---------- */
    copyBtn.addEventListener("click", function () {
      if (!lastSummaryPlainText) return;
      navigator.clipboard.writeText(lastSummaryPlainText).then(function () {
        var original = copyBtn.innerHTML;
        copyBtn.textContent = "Copied!";
        window.setTimeout(function () { copyBtn.innerHTML = original; }, 1600);
      }).catch(function () {
        inputError.textContent = "Could not copy automatically — please select and copy the summary manually.";
      });
    });

    /* ---------- Download ---------- */
    downloadBtn.addEventListener("click", function () {
      if (!lastSummaryPlainText) return;
      var blob = new Blob([lastSummaryPlainText], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "summary.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    /* ---------- Print ---------- */
    printBtn.addEventListener("click", function () {
      window.print();
    });

    /* ---------- Theme toggle ---------- */
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
      try { localStorage.setItem("ats-theme", theme); } catch (e) { /* storage unavailable */ }
    }

    themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      applyTheme(current === "light" ? "dark" : "light");
    });

    (function initTheme() {
      var saved = null;
      try { saved = localStorage.getItem("ats-theme"); } catch (e) { /* storage unavailable */ }
      if (saved === "light" || saved === "dark") {
        applyTheme(saved);
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        applyTheme("light");
      } else {
        applyTheme("dark");
      }
    })();

    /* ---------- Init ---------- */
    autoResize();
    updateLiveStats();
    setMeter(0);
  });
})();
