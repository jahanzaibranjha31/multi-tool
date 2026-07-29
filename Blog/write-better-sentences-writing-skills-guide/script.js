/* =========================================================
   Multi Tools Blog — script.js
   Dark mode, reading progress bar, TOC active-link highlighting,
   back-to-top button, and reading-time estimate.
   ========================================================= */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var darkModeToggle = document.getElementById("darkModeToggle");
    var progressFill = document.getElementById("readProgress");
    var backToTop = document.getElementById("backToTop");
    var tocLinks = document.querySelectorAll(".toc a");
    var articleBody = document.querySelector(".article-body");
    var metaReadTime = document.getElementById("metaReadTime");

    /* ---- Dark mode ---- */
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      if (darkModeToggle) darkModeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
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
    if (darkModeToggle) {
      darkModeToggle.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }

    /* ---- Estimated reading time from actual article text ---- */
    if (articleBody && metaReadTime) {
      var text = articleBody.textContent || "";
      var wordCount = (text.trim().match(/\S+/g) || []).length;
      var minutes = Math.max(1, Math.round(wordCount / 220));
      metaReadTime.textContent = minutes + " min read";
    }

    /* ---- Reading progress bar ---- */
    function updateProgress() {
      if (!progressFill) return;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
      progressFill.style.width = pct + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    /* ---- Back to top button ---- */
    function updateBackToTop() {
      if (!backToTop) return;
      var show = (window.pageYOffset || document.documentElement.scrollTop) > 600;
      backToTop.hidden = !show;
    }
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    if (backToTop) {
      backToTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    /* ---- TOC active-link highlighting via IntersectionObserver ---- */
    if (tocLinks.length && "IntersectionObserver" in window) {
      var sectionMap = {};
      tocLinks.forEach(function (link) {
        var id = link.getAttribute("href").replace("#", "");
        var section = document.getElementById(id);
        if (section) sectionMap[id] = link;
      });

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var link = sectionMap[entry.target.id];
            if (!link) return;
            if (entry.isIntersecting) {
              tocLinks.forEach(function (l) { l.classList.remove("is-active"); });
              link.classList.add("is-active");
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );

      Object.keys(sectionMap).forEach(function (id) {
        observer.observe(document.getElementById(id));
      });
    }
  });
})();
