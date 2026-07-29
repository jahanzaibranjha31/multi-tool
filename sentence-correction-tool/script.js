/* =========================================================
   Sentence Correction Tool — script.js
   All correction logic runs client-side. No network calls.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. DATA: spelling dictionary + grammar rules
     --------------------------------------------------------- */

  // Common misspelling -> correct spelling (lower-case keys)
  var SPELLING_MAP = {
    "recieve": "receive", "recieved": "received", "recieving": "receiving",
    "acheive": "achieve", "acheived": "achieved",
    "adress": "address", "adresses": "addresses",
    "arguement": "argument", "beleive": "believe", "belive": "believe",
    "buisness": "business", "calender": "calendar",
    "cant": "can't", "definately": "definitely", "definatly": "definitely",
    "diferent": "different", "diffrent": "different",
    "enviroment": "environment", "excelent": "excellent",
    "existance": "existence", "experiance": "experience",
    "familar": "familiar", "finaly": "finally",
    "foriegn": "foreign", "goverment": "government",
    "gramar": "grammar", "grammer": "grammar",
    "happend": "happened", "wich": "which",
    "immediatly": "immediately", "independant": "independent",
    "intrest": "interest", "knowlege": "knowledge",
    "langauge": "language", "lenght": "length",
    "libary": "library", "maintainance": "maintenance",
    "mispell": "misspell", "neccessary": "necessary", "necesary": "necessary",
    "occured": "occurred", "occuring": "occurring",
    "ocasion": "occasion", "occassion": "occasion",
    "peice": "piece", "perfom": "perform",
    "posession": "possession", "prefered": "preferred",
    "priviledge": "privilege", "probaly": "probably", "probably": "probably",
    "publically": "publicly", "questionaire": "questionnaire",
    "readible": "readable", "realy": "really",
    "recieveing": "receiving", "recomend": "recommend", "recommand": "recommend",
    "refered": "referred", "relevent": "relevant",
    "seperate": "separate", "seperated": "separated", "seperately": "separately",
    "similer": "similar", "sincerly": "sincerely",
    "succesful": "successful", "successfull": "successful",
    "suprise": "surprise", "suprised": "surprised",
    "tommorow": "tomorrow", "tommorrow": "tomorrow", "tomorow": "tomorrow",
    "truely": "truly", "untill": "until",
    "wether": "whether", "writting": "writing",
    "yesterday": "yesterday", "youre": "you're",
    "alot": "a lot", "atleast": "at least",
    "becuase": "because", "becasue": "because", "beacuse": "because",
    "commited": "committed", "comming": "coming",
    "concious": "conscious", "curiousity": "curiosity",
    "dilema": "dilemma", "dissapoint": "disappoint", "dissapear": "disappear",
    "embarass": "embarrass", "enviromental": "environmental",
    "excelent": "excellent", "explaination": "explanation",
    "fourty": "forty", "freind": "friend", "freindly": "friendly",
    "goverment": "government", "guage": "gauge",
    "hierachy": "hierarchy", "humourous": "humorous",
    "innoculate": "inoculate", "liason": "liaison",
    "millenium": "millennium", "noticable": "noticeable",
    "occurence": "occurrence", "pavillion": "pavilion",
    "persistant": "persistent", "posession": "possession",
    "reccomend": "recommend", "rythm": "rhythm",
    "supercede": "supersede", "temperture": "temperature",
    "thier": "their", "wich": "which", "withing": "within"
  };

  // Regex-based grammar / usage rules, applied in order.
  // Each rule: { pattern, replacement, flags }
  var GRAMMAR_RULES = [
    // would of / could of / should of / might of -> have
    { pattern: /\b(would|could|should|might|must)\s+of\b/gi, replace: function (m, modal) { return modal + " have"; } },
    // double negatives / spacing around punctuation handled separately
    // "your" vs "you're" before gerund/adjective is ambiguous — skip (avoid meaning change)
    // a / an correction handled by function pass
    { pattern: /\bi\b/g, replace: function () { return "I"; } }, // lone lowercase i -> I
    { pattern: /\beveryday\b(?=\s+(?:I|we|you|they|he|she|it)\b)/gi, replace: function () { return "every day"; } },
    { pattern: /\bmore\s+better\b/gi, replace: function () { return "better"; } },
    { pattern: /\bmore\s+easier\b/gi, replace: function () { return "easier"; } },
    { pattern: /\bless\s+(\w+)er\b/gi, replace: function (m, w) { return "less " + w + "er"; } }, // no-op placeholder kept simple
    { pattern: /\bdont\b/gi, replace: function () { return "don't"; } },
    { pattern: /\bdoesnt\b/gi, replace: function () { return "doesn't"; } },
    { pattern: /\bdidnt\b/gi, replace: function () { return "didn't"; } },
    { pattern: /\bwasnt\b/gi, replace: function () { return "wasn't"; } },
    { pattern: /\bwerent\b/gi, replace: function () { return "weren't"; } },
    { pattern: /\bisnt\b/gi, replace: function () { return "isn't"; } },
    { pattern: /\barent\b/gi, replace: function () { return "aren't"; } },
    { pattern: /\bhavent\b/gi, replace: function () { return "haven't"; } },
    { pattern: /\bhasnt\b/gi, replace: function () { return "hasn't"; } },
    { pattern: /\bwont\b/gi, replace: function () { return "won't"; } },
    { pattern: /\bim\b/gi, replace: function () { return "I'm"; } },
    { pattern: /\bive\b/gi, replace: function () { return "I've"; } },
    { pattern: /\bid\b/gi, replace: function () { return "I'd"; } },
    { pattern: /\btheres\b/gi, replace: function () { return "there's"; } },
    { pattern: /\btheyre\b/gi, replace: function () { return "they're"; } }
  ];

  /* ---------------------------------------------------------
     2. TEXT PROCESSING HELPERS
     --------------------------------------------------------- */

  function tokenizeWords(text) {
    var m = text.match(/[A-Za-z']+|[0-9]+|[^\sA-Za-z0-9]/g);
    return m || [];
  }

  function countWords(text) {
    var m = text.trim().match(/[A-Za-z0-9']+/g);
    return m ? m.length : 0;
  }

  function countSentences(text) {
    var trimmed = text.trim();
    if (!trimmed) return 0;
    var m = trimmed.match(/[^.!?]+[.!?]+|\S+$/g);
    return m ? m.filter(function (s) { return /[A-Za-z0-9]/.test(s); }).length : (trimmed ? 1 : 0);
  }

  function estimateReadTime(wordCount) {
    var wpm = 200;
    var seconds = Math.max(1, Math.round((wordCount / wpm) * 60));
    if (seconds < 60) return seconds + "s";
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return mins + "m " + (secs ? secs + "s" : "");
  }

  // Fix a/an agreement before a word
  function fixArticles(text) {
    return text.replace(/\b(a|A)\s+([aeiouAEIOU]\w*)/g, function (m, article, word) {
      var isUpper = article === "A";
      return (isUpper ? "An" : "an") + " " + word;
    }).replace(/\b(an|An)\s+([^aeiouAEIOU\s]\w*)/g, function (m, article, word) {
      // Guard against words that sound like consonants but start with vowel letters is out of scope;
      // only fix clear consonant-start words following "an".
      var isUpper = article === "An";
      return (isUpper ? "A" : "a") + " " + word;
    });
  }

  function removeRepeatedWords(text) {
    return text.replace(/\b(\w+)\b(\s+\1\b)+/gi, function (m, word) {
      return word;
    });
  }

  function fixPunctuationSpacing(text) {
    var out = text;
    out = out.replace(/\s+([,.!?;:])/g, "$1");           // no space before punctuation
    out = out.replace(/([,.!?;:])(?=[A-Za-z0-9])/g, "$1 "); // one space after punctuation
    out = out.replace(/[ \t]{2,}/g, " ");                 // collapse multiple spaces
    out = out.replace(/([!?]){2,}/g, "$1");                // collapse repeated ! or ?
    out = out.replace(/\.{4,}/g, "...");                   // collapse long dot runs to ellipsis
    out = out.replace(/,{2,}/g, ",");
    out = out.trim();
    return out;
  }

  function capitalizeSentences(text) {
    return text.replace(/(^\s*[a-z])|([.!?]\s+)([a-z])/g, function (m, first, sep, letter) {
      if (first) return first.toUpperCase();
      return sep + letter.toUpperCase();
    });
  }

  function ensureTerminalPunctuation(text) {
    var t = text.trim();
    if (!t) return t;
    if (!/[.!?]["')\]]?$/.test(t)) {
      t += ".";
    }
    return t;
  }

  function applySpellingMap(text) {
    return text.replace(/[A-Za-z']+/g, function (word) {
      var lower = word.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(SPELLING_MAP, lower)) {
        var fix = SPELLING_MAP[lower];
        // Preserve capitalization style of original word
        if (word[0] === word[0].toUpperCase() && word.length > 1) {
          return fix.charAt(0).toUpperCase() + fix.slice(1);
        }
        if (word === word.toUpperCase() && word.length > 1) {
          return fix.toUpperCase();
        }
        return fix;
      }
      return word;
    });
  }

  function applyGrammarRules(text) {
    var out = text;
    GRAMMAR_RULES.forEach(function (rule) {
      out = out.replace(rule.pattern, rule.replace);
    });
    return out;
  }

  function applyTone(text, tone) {
    if (tone === "formal") {
      var contractions = {
        "can't": "cannot", "won't": "will not", "don't": "do not",
        "doesn't": "does not", "didn't": "did not", "isn't": "is not",
        "aren't": "are not", "wasn't": "was not", "weren't": "were not",
        "haven't": "have not", "hasn't": "has not", "I'm": "I am",
        "I've": "I have", "I'd": "I would", "it's": "it is",
        "there's": "there is", "they're": "they are", "we're": "we are",
        "you're": "you are", "let's": "let us"
      };
      Object.keys(contractions).forEach(function (c) {
        var re = new RegExp("\\b" + c.replace("'", "'") + "\\b", "gi");
        text = text.replace(re, function (m) {
          var repl = contractions[c];
          return m[0] === m[0].toUpperCase() ? repl.charAt(0).toUpperCase() + repl.slice(1) : repl;
        });
      });
    } else if (tone === "casual") {
      var expansions = {
        "cannot": "can't", "will not": "won't", "do not": "don't",
        "does not": "doesn't", "did not": "didn't", "is not": "isn't",
        "are not": "aren't", "I am": "I'm", "I have": "I've", "it is": "it's"
      };
      Object.keys(expansions).forEach(function (c) {
        var re = new RegExp("\\b" + c + "\\b", "gi");
        text = text.replace(re, function (m) {
          var repl = expansions[c];
          return m[0] === m[0].toUpperCase() ? repl.charAt(0).toUpperCase() + repl.slice(1) : repl;
        });
      });
    }
    return text;
  }

  /**
   * Main correction pipeline. Order matters: spelling first, then
   * grammar patterns, then tone, then structural / punctuation cleanup,
   * then capitalization and terminal punctuation last.
   */
  function correctText(rawText, tone) {
    var text = rawText;
    text = applySpellingMap(text);
    text = applyGrammarRules(text);
    text = applyTone(text, tone);
    text = fixArticles(text);
    text = removeRepeatedWords(text);
    text = fixPunctuationSpacing(text);
    text = capitalizeSentences(text);
    text = ensureTerminalPunctuation(text);
    return text;
  }

  /* ---------------------------------------------------------
     3. WORD-LEVEL DIFF (simple LCS) for the "what changed" view
     --------------------------------------------------------- */

  function diffWords(originalText, correctedText) {
    var a = originalText.split(/(\s+)/).filter(Boolean);
    var b = correctedText.split(/(\s+)/).filter(Boolean);
    var n = a.length, m = b.length;
    var dp = new Array(n + 1);
    for (var i = 0; i <= n; i++) { dp[i] = new Array(m + 1).fill(0); }
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var ops = [];
    i = 0; var j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { ops.push({ type: "same", text: a[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", text: a[i] }); i++; }
      else { ops.push({ type: "ins", text: b[j] }); j++; }
    }
    while (i < n) { ops.push({ type: "del", text: a[i] }); i++; }
    while (j < m) { ops.push({ type: "ins", text: b[j] }); j++; }
    return ops;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderDiff(ops) {
    var html = "";
    var changeCount = 0;
    ops.forEach(function (op) {
      if (op.type === "same") {
        html += '<span class="no-change">' + escapeHtml(op.text) + "</span>";
      } else if (op.type === "del") {
        if (op.text.trim()) changeCount++;
        html += '<span class="del">' + escapeHtml(op.text) + "</span>";
      } else if (op.type === "ins") {
        html += '<span class="ins">' + escapeHtml(op.text) + "</span>";
      }
    });
    return { html: html, changeCount: changeCount };
  }

  /* ---------------------------------------------------------
     4. UI WIRING
     --------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {
    var inputText = document.getElementById("inputText");
    var correctBtn = document.getElementById("correctBtn");
    var clearBtn = document.getElementById("clearBtn");
    var toneSelect = document.getElementById("toneSelect");
    var statusMessage = document.getElementById("statusMessage");
    var resultWrapper = document.getElementById("resultWrapper");
    var resultOutput = document.getElementById("resultOutput");
    var diffOutput = document.getElementById("diffOutput");
    var changeCountEl = document.getElementById("changeCount");
    var copyBtn = document.getElementById("copyBtn");
    var downloadBtn = document.getElementById("downloadBtn");
    var darkModeToggle = document.getElementById("darkModeToggle");

    var statChars = document.querySelector("#statChars .stat-num");
    var statWords = document.querySelector("#statWords .stat-num");
    var statSentences = document.querySelector("#statSentences .stat-num");
    var statReadTime = document.querySelector("#statReadTime .stat-num");

    /* ---- Dark mode ---- */
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      darkModeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      try { localStorage.setItem("sct-theme", theme); } catch (e) { /* storage unavailable */ }
    }
    (function initTheme() {
      var saved = null;
      try { saved = localStorage.getItem("sct-theme"); } catch (e) { /* ignore */ }
      if (!saved) {
        saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      applyTheme(saved);
    })();
    darkModeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });

    /* ---- Live stats ---- */
    function updateStats() {
      var text = inputText.value;
      var words = countWords(text);
      statChars.textContent = text.length;
      statWords.textContent = words;
      statSentences.textContent = countSentences(text);
      statReadTime.textContent = words > 0 ? estimateReadTime(words) : "0s";
    }
    inputText.addEventListener("input", updateStats);
    updateStats();

    /* ---- Status helper ---- */
    var statusTimer = null;
    function showStatus(message, type) {
      statusMessage.textContent = message;
      statusMessage.className = "status-message" + (type ? " " + type : "");
      if (statusTimer) clearTimeout(statusTimer);
      if (type === "success") {
        statusTimer = setTimeout(function () { statusMessage.textContent = ""; statusMessage.className = "status-message"; }, 4000);
      }
    }

    /* ---- Correction action ---- */
    function runCorrection() {
      var original = inputText.value;
      if (!original.trim()) {
        showStatus("Please enter some text to correct.", "error");
        inputText.focus();
        return;
      }

      correctBtn.classList.add("is-loading");
      correctBtn.disabled = true;
      showStatus("Correcting your text…", "");

      // Small timeout gives the loading animation a moment to render,
      // keeping the UI responsive even though correction itself is fast.
      setTimeout(function () {
        try {
          var tone = toneSelect.value;
          var corrected = correctText(original, tone);
          var ops = diffWords(original, corrected);
          var diffResult = renderDiff(ops);

          resultOutput.textContent = corrected;
          diffOutput.innerHTML = diffResult.html || '<span class="no-change">No changes needed — this text looks correct.</span>';
          changeCountEl.textContent = diffResult.changeCount;
          resultWrapper.hidden = false;

          if (diffResult.changeCount === 0) {
            showStatus("Great news — no corrections were needed!", "success");
          } else {
            showStatus("Done! Fixed " + diffResult.changeCount + " issue" + (diffResult.changeCount === 1 ? "" : "s") + ".", "success");
          }
          resultWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (err) {
          showStatus("Something went wrong while correcting your text. Please try again.", "error");
        } finally {
          correctBtn.classList.remove("is-loading");
          correctBtn.disabled = false;
        }
      }, 350);
    }
    correctBtn.addEventListener("click", runCorrection);

    /* ---- Clear action ---- */
    function clearAll() {
      inputText.value = "";
      updateStats();
      resultWrapper.hidden = true;
      resultOutput.textContent = "";
      diffOutput.innerHTML = "";
      showStatus("Cleared.", "");
      inputText.focus();
    }
    clearBtn.addEventListener("click", clearAll);

    /* ---- Copy action ---- */
    copyBtn.addEventListener("click", function () {
      var text = resultOutput.textContent;
      if (!text) return;
      var done = function () { showStatus("Copied to clipboard!", "success"); };
      var fail = function () { showStatus("Could not copy automatically — please select and copy manually.", "error"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fail);
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          done();
        } catch (e) { fail(); }
      }
    });

    /* ---- Download action ---- */
    downloadBtn.addEventListener("click", function () {
      var text = resultOutput.textContent;
      if (!text) return;
      var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "corrected-text.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus("Download started.", "success");
    });

    /* ---- Keyboard shortcuts ---- */
    document.addEventListener("keydown", function (e) {
      var ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key === "Enter") {
        e.preventDefault();
        runCorrection();
      } else if (ctrlOrCmd && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        clearAll();
      }
    });
  });
})();
