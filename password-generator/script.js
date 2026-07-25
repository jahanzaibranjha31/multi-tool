(function () {
  "use strict";

  /* =======================================================
     Character sets
     ======================================================= */
  var SETS = {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~`",
    space: " "
  };
  var SIMILAR = "il1LoO0";
  var AMBIGUOUS = "{}[]()/\\'\"`~,;:.<>";

  /* =======================================================
     Elements
     ======================================================= */
  var el = {
    output: document.getElementById("passwordOutput"),
    toggleVisibility: document.getElementById("toggleVisibility"),
    copyBtn: document.getElementById("copyBtn"),
    regenerateBtn: document.getElementById("regenerateBtn"),
    generateBtn: document.getElementById("generateBtn"),
    lengthSlider: document.getElementById("lengthSlider"),
    lengthValue: document.getElementById("lengthValue"),
    strengthBar: document.getElementById("strengthBar"),
    strengthLabel: document.getElementById("strengthLabel"),
    charCount: document.getElementById("charCount"),
    entropyValue: document.getElementById("entropyValue"),
    crackTime: document.getElementById("crackTime"),
    optUppercase: document.getElementById("optUppercase"),
    optLowercase: document.getElementById("optLowercase"),
    optNumbers: document.getElementById("optNumbers"),
    optSymbols: document.getElementById("optSymbols"),
    optExcludeSimilar: document.getElementById("optExcludeSimilar"),
    optExcludeAmbiguous: document.getElementById("optExcludeAmbiguous"),
    optSpaces: document.getElementById("optSpaces"),
    optionsWarning: document.getElementById("optionsWarning"),
    historyList: document.getElementById("historyList"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    toast: document.getElementById("toast"),
    footerYear: document.getElementById("footerYear"),
    rainCanvas: document.getElementById("rainCanvas")
  };

  var history = []; // in-memory only, never persisted
  var isMasked = false;
  var toastTimer = null;

  /* =======================================================
     Secure random helpers
     ======================================================= */
  function secureRandomInt(maxExclusive) {
    var range = Math.floor(4294967296 / maxExclusive) * maxExclusive;
    var arr = new Uint32Array(1);
    var value;
    do {
      window.crypto.getRandomValues(arr);
      value = arr[0];
    } while (value >= range);
    return value % maxExclusive;
  }

  function secureShuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = secureRandomInt(i + 1);
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function removeChars(pool, charsToRemove) {
    var result = "";
    for (var i = 0; i < pool.length; i++) {
      if (charsToRemove.indexOf(pool[i]) === -1) result += pool[i];
    }
    return result;
  }

  /* =======================================================
     Build active character pools based on selected options
     ======================================================= */
  function getActivePools() {
    var pools = [];
    var opts = getOptions();

    if (opts.uppercase) pools.push({ key: "uppercase", chars: SETS.uppercase });
    if (opts.lowercase) pools.push({ key: "lowercase", chars: SETS.lowercase });
    if (opts.numbers) pools.push({ key: "numbers", chars: SETS.numbers });
    if (opts.symbols) pools.push({ key: "symbols", chars: SETS.symbols });
    if (opts.spaces) pools.push({ key: "space", chars: SETS.space });

    pools.forEach(function (p) {
      if (opts.excludeSimilar) p.chars = removeChars(p.chars, SIMILAR);
      if (opts.excludeAmbiguous) p.chars = removeChars(p.chars, AMBIGUOUS);
    });

    // drop pools that ended up empty after exclusions
    pools = pools.filter(function (p) { return p.chars.length > 0; });

    return pools;
  }

  function getOptions() {
    return {
      uppercase: el.optUppercase.checked,
      lowercase: el.optLowercase.checked,
      numbers: el.optNumbers.checked,
      symbols: el.optSymbols.checked,
      excludeSimilar: el.optExcludeSimilar.checked,
      excludeAmbiguous: el.optExcludeAmbiguous.checked,
      spaces: el.optSpaces.checked,
      length: parseInt(el.lengthSlider.value, 10)
    };
  }

  /* =======================================================
     Password generation
     ======================================================= */
  function generatePassword() {
    var opts = getOptions();
    var pools = getActivePools();

    if (pools.length === 0) {
      el.optionsWarning.hidden = false;
      el.output.value = "";
      updateStrength("", 0);
      return null;
    }
    el.optionsWarning.hidden = true;

    var length = opts.length;
    var combinedPool = pools.map(function (p) { return p.chars; }).join("");
    var passwordChars = [];

    // Guarantee at least one character from each selected pool (when length allows)
    var guaranteed = pools.slice(0, length);
    guaranteed.forEach(function (p) {
      passwordChars.push(p.chars[secureRandomInt(p.chars.length)]);
    });

    for (var i = passwordChars.length; i < length; i++) {
      passwordChars.push(combinedPool[secureRandomInt(combinedPool.length)]);
    }

    secureShuffle(passwordChars);
    var password = passwordChars.join("");

    el.output.value = password;
    updateStrength(password, combinedPool.length);
    addToHistory(password);
    return password;
  }

  /* =======================================================
     Strength, entropy and crack-time estimation
     ======================================================= */
  function updateStrength(password, poolSize) {
    var length = password.length;
    var entropy = length > 0 && poolSize > 0 ? length * Math.log2(poolSize) : 0;

    el.charCount.textContent = length + (length === 1 ? " character" : " characters");
    el.entropyValue.textContent = Math.round(entropy) + " bits";
    el.crackTime.textContent = formatCrackTime(entropy);

    var level = strengthLevel(entropy, length);
    el.strengthBar.style.width = level.percent + "%";
    el.strengthBar.style.backgroundColor = level.color;
    el.strengthLabel.textContent = length === 0 ? "—" : level.label;
    el.strengthLabel.style.color = length === 0 ? "" : level.color;
  }

  function strengthLevel(entropy, length) {
    if (length === 0) return { label: "—", percent: 0, color: "#cbd5e1" };
    if (entropy < 28) return { label: "Weak", percent: 20, color: "#ef4444" };
    if (entropy < 40) return { label: "Fair", percent: 40, color: "#f59e0b" };
    if (entropy < 60) return { label: "Good", percent: 60, color: "#eab308" };
    if (entropy < 80) return { label: "Strong", percent: 82, color: "#22c55e" };
    return { label: "Very Strong", percent: 100, color: "#10b981" };
  }

  function formatCrackTime(entropyBits) {
    if (entropyBits <= 0) return "—";
    var guessesPerSecond = 1e10; // conservative offline fast-attack estimate
    var combinations = Math.pow(2, entropyBits);
    var seconds = combinations / guessesPerSecond;

    var units = [
      { label: "second", secs: 1 },
      { label: "minute", secs: 60 },
      { label: "hour", secs: 3600 },
      { label: "day", secs: 86400 },
      { label: "year", secs: 31557600 },
      { label: "century", secs: 3155760000 }
    ];

    if (seconds < 1) return "Instantly";

    var chosen = units[0];
    for (var i = 0; i < units.length; i++) {
      if (seconds >= units[i].secs) chosen = units[i];
    }

    var value = seconds / chosen.secs;

    if (chosen.label === "century" && value > 1e6) {
      return value.toExponential(1) + " centuries";
    }

    var rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
    return rounded + " " + chosen.label + (rounded === 1 ? "" : "s");
  }

  /* =======================================================
     History (session memory only — never persisted to disk)
     ======================================================= */
  function addToHistory(password) {
    history.unshift(password);
    if (history.length > 10) history.pop();
    renderHistory();
  }

  function renderHistory() {
    el.historyList.innerHTML = "";

    if (history.length === 0) {
      var empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "Your last 10 generated passwords will appear here for this session only.";
      el.historyList.appendChild(empty);
      return;
    }

    history.forEach(function (pw) {
      var li = document.createElement("li");
      li.className = "history-item";

      var span = document.createElement("span");
      span.className = "history-pw";
      span.textContent = pw;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Copy this password");
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      btn.addEventListener("click", function () {
        copyToClipboard(pw);
      });

      li.appendChild(span);
      li.appendChild(btn);
      el.historyList.appendChild(li);
    });
  }

  el.clearHistoryBtn.addEventListener("click", function () {
    history = [];
    renderHistory();
    showToast("History cleared");
  });

  /* =======================================================
     Clipboard + toast
     ======================================================= */
  function copyToClipboard(text) {
    if (!text) return;

    var done = function () {
      showToast("Password copied to clipboard");
      el.copyBtn.classList.add("copied");
      setTimeout(function () { el.copyBtn.classList.remove("copied"); }, 900);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* no-op */ }
    document.body.removeChild(temp);
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove("show");
    }, 2200);
  }

  /* =======================================================
     UI event wiring
     ======================================================= */
  el.lengthSlider.addEventListener("input", function () {
    el.lengthValue.textContent = el.lengthSlider.value;
    generatePassword();
  });

  [el.optUppercase, el.optLowercase, el.optNumbers, el.optSymbols,
   el.optExcludeSimilar, el.optExcludeAmbiguous, el.optSpaces].forEach(function (input) {
    input.addEventListener("change", generatePassword);
  });

  el.generateBtn.addEventListener("click", generatePassword);
  el.regenerateBtn.addEventListener("click", generatePassword);

  el.copyBtn.addEventListener("click", function () {
    copyToClipboard(el.output.value);
  });

  el.toggleVisibility.addEventListener("click", function () {
    isMasked = !isMasked;
    el.output.classList.toggle("masked", isMasked);
    el.toggleVisibility.setAttribute("aria-pressed", String(isMasked));
    el.toggleVisibility.setAttribute("aria-label", isMasked ? "Show password characters" : "Hide password characters");
  });

  el.output.addEventListener("click", function () {
    el.output.select();
  });

  document.addEventListener("keydown", function (e) {
    var ctrlOrCmd = e.ctrlKey || e.metaKey;
    if (ctrlOrCmd && e.key === "Enter") {
      e.preventDefault();
      generatePassword();
    }
    if (ctrlOrCmd && (e.key === "c" || e.key === "C")) {
      var selection = window.getSelection ? window.getSelection().toString() : "";
      var activeIsOutput = document.activeElement === el.output;
      if (!selection && !activeIsOutput) {
        e.preventDefault();
        copyToClipboard(el.output.value);
      }
    }
  });

  /* =======================================================
     Ambient background: falling character rain (signature visual)
     ======================================================= */
  function initRain() {
    var canvas = el.rainCanvas;
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    var fontSize = 15;
    var columns, drops, width, height;
    var rafId;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0).map(function () {
        return Math.floor(Math.random() * -height / fontSize);
      });
    }

    function draw() {
      ctx.fillStyle = "rgba(20, 11, 51, 0.18)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = fontSize + "px monospace";

      for (var i = 0; i < columns; i++) {
        var char = chars[Math.floor(Math.random() * chars.length)];
        var gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#8b5cf6");
        gradient.addColorStop(1, "#38bdf8");
        ctx.fillStyle = gradient;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      rafId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);

    if (!reduceMotion) {
      draw();
    } else {
      ctx.fillStyle = "rgba(20, 11, 51, 0.4)";
      ctx.fillRect(0, 0, width, height);
    }
  }

  /* =======================================================
     Init
     ======================================================= */
  function init() {
    el.footerYear.textContent = new Date().getFullYear();
    el.lengthValue.textContent = el.lengthSlider.value;
    generatePassword();
    initRain();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
