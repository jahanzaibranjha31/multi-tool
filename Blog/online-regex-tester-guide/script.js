// =========================================================
// Regex Tester Article — interactions
// 1. Hero "pattern match" demo (typewriter, respects
//    prefers-reduced-motion)
// 2. Back-to-top button
// =========================================================

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Hero demo ---------- */
  function initHeroDemo() {
    var patternEl = document.getElementById("demo-pattern");
    var textEl = document.getElementById("demo-text");
    if (!patternEl || !textEl) return;

    var pattern = "\\b[\\w.+-]+@[\\w-]+\\.[a-z]{2,}\\b";
    var sample = "Contact us at hello@multitool.click or support@multitool.click";
    var matchStart = sample.indexOf("hello@multitool.click");
    var matchLen = "hello@multitool.click".length;
    var secondStart = sample.indexOf("support@multitool.click");
    var secondLen = "support@multitool.click".length;

    function renderFinalText() {
      var before = escapeHtml(sample.slice(0, matchStart));
      var match1 = escapeHtml(sample.slice(matchStart, matchStart + matchLen));
      var mid = escapeHtml(sample.slice(matchStart + matchLen, secondStart));
      var match2 = escapeHtml(sample.slice(secondStart, secondStart + secondLen));
      var after = escapeHtml(sample.slice(secondStart + secondLen));
      textEl.innerHTML =
        before +
        "<mark>" + match1 + "</mark>" +
        mid +
        "<mark>" + match2 + "</mark>" +
        after;
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    if (prefersReducedMotion) {
      patternEl.textContent = pattern;
      renderFinalText();
      return;
    }

    var i = 0;
    function typePattern() {
      if (i <= pattern.length) {
        patternEl.textContent = pattern.slice(0, i);
        i++;
        window.setTimeout(typePattern, 22);
      } else {
        window.setTimeout(renderFinalText, 250);
      }
    }
    typePattern();
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;

    function toggle() {
      if (window.scrollY > 480) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    }

    window.addEventListener("scroll", toggle, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
    toggle();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeroDemo();
    initBackToTop();
  });
})();
