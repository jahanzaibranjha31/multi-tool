/* =========================================================
   MULTI TOOLS — script.js (vanilla JS, no dependencies)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Tool directory (used for search) ---------- */
  var TOOLS = [
    { name: "Spin Wheel", href: "spin-wheel/", icon: "icon-spin", keywords: "spin wheel random decision picker" },
    { name: "Scientific Calculator", href: "scientific-calculator/", icon: "icon-calc", keywords: "calculator math scientific equations" },
    { name: "Age Calculator", href: "age-calculator/", icon: "icon-age", keywords: "age calculator birthday date" },
    { name: "BMI Calculator", href: "bmi-calculator/", icon: "icon-bmi", keywords: "bmi calculator health weight fitness" },
    { name: "Percentage Calculator", href: "percentage-calculator/", icon: "icon-percent", keywords: "percentage calculator math percent" },
    { name: "Password Generator", href: "password-generator/", icon: "icon-password", keywords: "password generator secure random security" },
    { name: "QR Code Generator", href: "qr-code-generator/", icon: "icon-qr", keywords: "qr code generator scan link" },
    { name: "Random Number Generator", href: "random-number-generator/", icon: "icon-random", keywords: "random number generator dice pick" },
    { name: "Word Counter", href: "word-counter/", icon: "icon-word", keywords: "word counter text writing count" },
    { name: "Character Counter", href: "character-counter/", icon: "icon-char", keywords: "character counter text limit count" },
    { name: "Color Picker", href: "color-picker/", icon: "icon-color", keywords: "color picker hex rgb palette design" },
    { name: "Unit Converter", href: "unit-converter/", icon: "icon-convert", keywords: "unit converter length weight temperature" },
    { name: "Calculators", href: "calculators/", icon: "icon-calcs", keywords: "calculators category" },
    { name: "Converters", href: "converters/", icon: "icon-convert", keywords: "converters category" },
    { name: "Text Tools", href: "text-tools/", icon: "icon-text", keywords: "text tools category" },
    { name: "Image Tools", href: "image-tools/", icon: "icon-image", keywords: "image tools category" },
    { name: "PDF Tools", href: "pdf-tools/", icon: "icon-pdf", keywords: "pdf tools category" },
    { name: "SEO Tools", href: "seo-tools/", icon: "icon-seo", keywords: "seo tools category" },
    { name: "Developer Tools", href: "developer-tools/", icon: "icon-dev", keywords: "developer tools category code" },
    { name: "Generators", href: "generators/", icon: "icon-gen", keywords: "generators category" },
    { name: "Productivity", href: "productivity/", icon: "icon-productivity", keywords: "productivity category" },
    { name: "Random Tools", href: "random-tools/", icon: "icon-shuffle", keywords: "random tools category" }
  ];

  var root = document.documentElement;

  /* =========================================================
     THEME TOGGLE (persisted, respects system preference)
     ========================================================= */
  (function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("mt-theme"); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored || (prefersDark ? "dark" : "light");
    root.setAttribute("data-theme", theme);

    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("mt-theme", next); } catch (e) {}
      });
    }
  })();

  /* =========================================================
     STICKY HEADER SHADOW ON SCROLL
     ========================================================= */
  var header = document.getElementById("siteHeader");
  var backToTop = document.getElementById("backToTop");
  function onScroll() {
    var scrolled = window.scrollY > 12;
    if (header) header.classList.toggle("is-scrolled", scrolled);
    if (backToTop) backToTop.classList.toggle("is-visible", window.scrollY > 480);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* =========================================================
     MOBILE NAV TOGGLE
     ========================================================= */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    mainNav.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* highlight active nav link on scroll */
  var navLinks = document.querySelectorAll(".nav-link");
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id], .hero[id]"));
  function updateActiveNav() {
    var pos = window.scrollY + (header ? header.offsetHeight : 0) + 40;
    var current = sections[0];
    sections.forEach(function (sec) {
      if (sec.offsetTop <= pos) current = sec;
    });
    navLinks.forEach(function (link) {
      var match = current && link.getAttribute("href") === "#" + current.id;
      link.classList.toggle("is-active", !!match);
    });
  }
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

  /* =========================================================
     SEARCH OVERLAY
     ========================================================= */
  var searchToggle = document.getElementById("searchToggle");
  var searchOverlay = document.getElementById("searchOverlay");
  var searchClose = document.getElementById("searchClose");
  var overlayInput = document.getElementById("overlaySearchInput");
  var overlayResults = document.getElementById("overlayResults");

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.add("is-open");
    searchToggle.setAttribute("aria-expanded", "true");
    renderOverlayResults("");
    setTimeout(function () { overlayInput && overlayInput.focus(); }, 60);
    document.body.style.overflow = "hidden";
  }
  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (searchToggle) searchToggle.addEventListener("click", openSearch);
  if (searchClose) searchClose.addEventListener("click", closeSearch);
  if (searchOverlay) {
    searchOverlay.addEventListener("click", function (e) {
      if (e.target === searchOverlay) closeSearch();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSearch();
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && !searchOverlay.classList.contains("is-open")) {
      e.preventDefault();
      openSearch();
    }
  });

  function renderOverlayResults(query) {
    if (!overlayResults) return;
    var q = query.trim().toLowerCase();
    var matches = TOOLS.filter(function (t) {
      return !q || (t.name + " " + t.keywords).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);

    if (!matches.length) {
      overlayResults.innerHTML = '<p class="search-empty">No tools found. Try a different keyword.</p>';
      return;
    }
    overlayResults.innerHTML = matches.map(function (t) {
      return '<a class="search-result-item" href="' + t.href + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><use href="#' + t.icon + '"/></svg>' +
        '<span>' + t.name + '</span></a>';
    }).join("");
  }
  if (overlayInput) {
    overlayInput.addEventListener("input", function () {
      renderOverlayResults(overlayInput.value);
    });
  }
const tools = [
  {
    name: "Spin Wheel",
    url: "spin-wheel/"
  },
  {
    name: "Password Generator",
    url: "password-generator/"
  },
  {
    name: "QR Code Generator",
    url: "qr-code-generator/"
  },
  {
    name: "BMI Calculator",
    url: "bmi-calculator/"
  }
];

const container = document.getElementById("tools-container");

tools.forEach(tool => {
  container.innerHTML += `
    <a href="${tool.url}" class="tool-card">
      ${tool.name}
    </a>
  `;
});
  /* =========================================================
     LIVE FILTER — POPULAR TOOLS GRID
     ========================================================= */
  var mainSearchInput = document.getElementById("mainSearchInput");
  var toolsGrid = document.getElementById("toolsGrid");
  var noResults = document.getElementById("noResults");
  var searchLiveStatus = document.getElementById("searchLiveStatus");
  var tagButtons = document.querySelectorAll(".tag-btn");
  var toolCards = toolsGrid ? Array.prototype.slice.call(toolsGrid.querySelectorAll(".tool-card")) : [];

  function filterTools(query) {
    var q = query.trim().toLowerCase();
    var visibleCount = 0;
    toolCards.forEach(function (card) {
      var haystack = (card.dataset.name + " " + card.dataset.keywords).toLowerCase();
      var match = !q || haystack.indexOf(q) !== -1;
      card.style.display = match ? "" : "none";
      if (match) visibleCount++;
    });
    if (noResults) noResults.hidden = visibleCount !== 0;
    if (searchLiveStatus) {
      searchLiveStatus.textContent = q ? visibleCount + " tool" + (visibleCount === 1 ? "" : "s") + ' found for "' + query.trim() + '"' : "";
    }
  }

  if (mainSearchInput) {
    mainSearchInput.addEventListener("input", function () {
      filterTools(mainSearchInput.value);
      tagButtons.forEach(function (b) { b.classList.remove("is-active"); });
      if (mainSearchInput.value.trim()) {
        document.getElementById("popular").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  tagButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var isActive = btn.classList.contains("is-active");
      tagButtons.forEach(function (b) { b.classList.remove("is-active"); });
      if (isActive) {
        if (mainSearchInput) mainSearchInput.value = "";
        filterTools("");
        return;
      }
      btn.classList.add("is-active");
      var tag = btn.dataset.tag || "";
      if (mainSearchInput) mainSearchInput.value = tag;
      filterTools(tag);
      document.getElementById("popular").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* =========================================================
     FAQ ACCORDION
     ========================================================= */
  document.querySelectorAll(".accordion-item").forEach(function (item) {
    var trigger = item.querySelector(".accordion-trigger");
    if (!trigger) return;
    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      item.closest(".accordion").querySelectorAll(".accordion-item").forEach(function (other) {
        other.classList.remove("is-open");
        var t = other.querySelector(".accordion-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* =========================================================
     NEWSLETTER FORM (client-side only demo)
     ========================================================= */
  var newsletterForm = document.getElementById("newsletterForm");
  var newsletterMsg = document.getElementById("newsletterMsg");
  var newsletterEmail = document.getElementById("newsletterEmail");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = newsletterEmail ? newsletterEmail.value.trim() : "";
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        newsletterMsg.textContent = "Please enter a valid email address.";
        return;
      }
      newsletterMsg.textContent = "You're subscribed! Watch your inbox for new tools.";
      newsletterForm.reset();
    });
  }

  /* =========================================================
     SCROLL REVEAL ANIMATIONS
     ========================================================= */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* =========================================================
     STAT COUNT-UP
     ========================================================= */
  var statEls = document.querySelectorAll(".stat-num[data-count]");
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var duration = 1200;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && statEls.length) {
    var statIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    statEls.forEach(function (el) { statIo.observe(el); });
  }

  /* =========================================================
     FOOTER YEAR
     ========================================================= */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
