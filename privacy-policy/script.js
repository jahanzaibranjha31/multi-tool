// =========================================================
// Multi Tools — script.js (vanilla JS, no dependencies)
// =========================================================
(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Tool search filter ---------- */
  var searchInput = document.getElementById("toolSearch");
  var toolCards = document.querySelectorAll(".tool-card");
  var noResults = document.getElementById("noResults");
  var searchStatus = document.getElementById("searchStatus");

  function filterTools() {
    var query = (searchInput.value || "").trim().toLowerCase();
    var visible = 0;
    toolCards.forEach(function (card) {
      var haystack = (card.dataset.name + " " + card.textContent).toLowerCase();
      var match = query === "" || haystack.indexOf(query) !== -1;
      card.style.display = match ? "" : "none";
      if (match) visible++;
    });
    if (noResults) noResults.hidden = visible !== 0 || query === "";
    if (searchStatus) {
      searchStatus.textContent = query
        ? visible + " tool" + (visible === 1 ? "" : "s") + " found for \u201c" + query + "\u201d"
        : "";
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterTools);
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var firstVisible = document.querySelector(".tool-card:not([style*='display: none'])");
        if (firstVisible) window.location.href = firstVisible.getAttribute("href");
      }
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var btn = item.querySelector(".faq-q");
    btn.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (other) {
        if (other !== item) {
          other.classList.remove("open");
          other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("open", !isOpen);
      btn.setAttribute("aria-expanded", (!isOpen).toString());
    });
  });

  /* ---------- Animated stat counters (on scroll into view) ---------- */
  var statEls = document.querySelectorAll(".stat-num");
  function animateStat(el) {
    var target = parseInt(el.dataset.target, 10) || 0;
    var suffix = el.dataset.suffix || "";
    var start = 0;
    var duration = 1200;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var value = Math.floor(start + (target - start) * progress);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && statEls.length) {
    var statObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach(function (el) { statObserver.observe(el); });
  } else {
    statEls.forEach(animateStat);
  }

  /* ---------- Hero glass card: rotating tool showcase ---------- */
  var showcase = [
    { icon: "🧮", label: "Scientific Calculator" },
    { icon: "🔐", label: "Password Generator" },
    { icon: "🔳", label: "QR Code Generator" },
    { icon: "⚖️", label: "BMI Calculator" },
    { icon: "🎡", label: "Spin Wheel" }
  ];
  var toolIcon = document.getElementById("toolIcon");
  var toolLabel = document.getElementById("toolLabel");
  if (toolIcon && toolLabel && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var idx = 0;
    setInterval(function () {
      idx = (idx + 1) % showcase.length;
      toolIcon.style.opacity = 0;
      setTimeout(function () {
        toolIcon.textContent = showcase[idx].icon;
        toolLabel.textContent = showcase[idx].label;
        toolIcon.style.opacity = 1;
      }, 250);
    }, 2600);
  }

  /* ---------- Back to top ---------- */
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.hidden = window.scrollY < 500;
    }, { passive: true });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
