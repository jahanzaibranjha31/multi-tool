(function () {
  "use strict";

  var textEl = document.getElementById("density-input");
  var targetEl = document.getElementById("density-target");
  var wordsEl = document.getElementById("stat-words");
  var countEl = document.getElementById("stat-count");
  var densityEl = document.getElementById("stat-density");
  var needleEl = document.getElementById("gauge-needle");
  var verdictEl = document.getElementById("widget-verdict");

  if (!textEl || !targetEl) return;

  // Escape a string for safe use inside a RegExp
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function countWords(text) {
    var matches = text.trim().match(/[\p{L}\p{N}'’-]+/gu);
    return matches ? matches.length : 0;
  }

  function countPhrase(text, phrase) {
    var clean = phrase.trim();
    if (!clean) return 0;
    var pattern = new RegExp("(^|[^\\p{L}\\p{N}])" + escapeRegExp(clean) + "($|[^\\p{L}\\p{N}])", "giu");
    var matches = (text + " ").match(pattern);
    return matches ? matches.length : 0;
  }

  function densityBand(pct, hasKeyword) {
    if (!hasKeyword) {
      return { label: "Add a target keyword above to get a live read.", pos: 0 };
    }
    if (pct === 0) {
      return { label: "0% — that phrase doesn't appear yet. If it's your main keyword, work it in near the top.", pos: 2 };
    }
    if (pct < 0.5) {
      return { label: "Thin: " + pct.toFixed(2) + "%. The topic may be under-signaled — consider one or two more natural mentions.", pos: mapPos(pct) };
    }
    if (pct <= 2.5) {
      return { label: "Natural: " + pct.toFixed(2) + "%. This sits right in the healthy range.", pos: mapPos(pct) };
    }
    if (pct <= 4) {
      return { label: "Borderline: " + pct.toFixed(2) + "%. Read it aloud — trim a repeat if it sounds mechanical.", pos: mapPos(pct) };
    }
    return { label: "Stuffed: " + pct.toFixed(2) + "%. This phrase is repeating well past natural reading — swap in synonyms.", pos: mapPos(pct) };
  }

  // Map a density percentage (0–6+) onto the 0–100% gauge track
  function mapPos(pct) {
    var capped = Math.min(pct, 6);
    return Math.min(96, (capped / 6) * 100);
  }

  function update() {
    var text = textEl.value || "";
    var target = targetEl.value || "";
    var wordCount = countWords(text);
    var matchCount = wordCount ? countPhrase(text, target) : 0;
    var density = wordCount > 0 ? (matchCount / wordCount) * 100 : 0;

    wordsEl.textContent = wordCount.toLocaleString();
    countEl.textContent = matchCount.toLocaleString();
    densityEl.textContent = density.toFixed(2) + "%";

    var band = densityBand(density, target.trim().length > 0 && wordCount > 0);
    verdictEl.textContent = band.label;
    needleEl.style.left = band.pos + "%";
  }

  textEl.addEventListener("input", update);
  targetEl.addEventListener("input", update);

  update();
})();
