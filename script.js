/* =========================================================
   MULTI TOOLS — script.js
   Vanilla JS. Loads tools.json + blogs.json and renders every
   dynamic section: categories, featured, latest, search,
   blog, stats, footer lists. No frameworks, no build step.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     ICONS — small, original inline-SVG set (no external deps)
     --------------------------------------------------------- */
  const ICONS = {
    key: '<path d="M14.5 9.5a4.5 4.5 0 10-4.24 6H10l-1.2 1.2H7.5V18H6v1.5H3V16l6.24-6.24A4.5 4.5 0 0114.5 9.5z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="15.2" cy="8.8" r="1.1" fill="currentColor"/>',
    qrcode: '<rect x="3" y="3" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7"/><rect x="14.5" y="14.5" width="2.5" height="2.5" fill="currentColor"/><rect x="18.5" y="14.5" width="2" height="2" fill="currentColor"/><rect x="14.5" y="18.5" width="2" height="2" fill="currentColor"/><rect x="18.5" y="18.5" width="2.5" height="2.5" fill="currentColor"/>',
    type: '<path d="M5 6h14M12 6v13M9 19h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    hash: '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    percent: '<circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.7"/><circle cx="17" cy="17" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M18 5L5 19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    dollar: '<path d="M12 2v20M17 6.5c0-1.8-2-3-5-3s-5 1.3-5 3c0 4 10 2.3 10 6.3 0 1.8-2.2 3.2-5 3.2s-5-1.4-5-3.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/>',
    heart: '<path d="M12 20s-7.4-4.6-9.8-9.2C.6 7.3 2.3 4 5.7 4c2 0 3.4 1.1 4.3 2.6C11 5.1 12.4 4 14.4 4c3.4 0 5.1 3.3 3.5 6.8C15.4 15.4 12 20 12 20z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    barchart: '<path d="M4 20V11M12 20V4M20 20v-7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    ruler: '<rect x="2.5" y="8.5" width="19" height="7" rx="1.4" transform="rotate(-8 12 12)" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8 9l.7 2.3M12 8.4l.9 2.9M16.2 7.7l.7 2.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    filetext: '<path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/><path d="M14 3v4h4M9.5 13h5M9.5 16.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    layers: '<path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/><path d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    compress: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="3.5" cy="6" r="1.3" fill="currentColor"/><circle cx="3.5" cy="12" r="1.3" fill="currentColor"/><circle cx="3.5" cy="18" r="1.3" fill="currentColor"/>',
    code: '<path d="M9 8l-5 4 5 4M15 8l5 4-5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M7 9l3 3-3 3M13 15h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    palette: '<path d="M12 3a9 8 0 100 16c1.2 0 1.7-1.4.7-2.1-1-.7-.5-2.4.7-2.4H15a5 5 0 005-5c0-3.6-3.6-6.5-8-6.5z" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="7.5" cy="11" r="1.1" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.1" fill="currentColor"/><circle cx="15" cy="8" r="1.1" fill="currentColor"/>',
    globe: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" stroke="currentColor" stroke-width="1.5"/>',
    search: '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" stroke-width="1.4"/><path d="M4 17l5-5 3.5 3.5L17 11l3 3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    crop: '<path d="M6 2v14a2 2 0 002 2h14M18 22V8a2 2 0 00-2-2H2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" stroke="currentColor" stroke-width="1.6"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    clock: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    calculator: '<rect x="4" y="2.5" width="16" height="19" rx="2.2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M7 6.5h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="7.3" cy="11" r=".9" fill="currentColor"/><circle cx="12" cy="11" r=".9" fill="currentColor"/><circle cx="16.7" cy="11" r=".9" fill="currentColor"/><circle cx="7.3" cy="15" r=".9" fill="currentColor"/><circle cx="12" cy="15" r=".9" fill="currentColor"/><circle cx="16.7" cy="15" r=".9" fill="currentColor"/><circle cx="7.3" cy="18.6" r=".9" fill="currentColor"/><circle cx="12" cy="18.6" r=".9" fill="currentColor"/>',
    zap: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/>'
  };

  const CATEGORY_ICONS = {
    "Calculators": "calculator",
    "Converters": "ruler",
    "Generators": "key",
    "Developer Tools": "code",
    "SEO Tools": "globe",
    "PDF Tools": "filetext",
    "Text Tools": "type",
    "Image Tools": "image",
    "Finance": "dollar",
    "Health": "heart",
    "Productivity": "briefcase"
  };

  function icon(name, size) {
    size = size || 22;
    const path = ICONS[name] || ICONS.grid;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + path + '</svg>';
  }

  function arrowIcon() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ---------------------------------------------------------
     STATE
     --------------------------------------------------------- */
  const state = { tools: [], posts: [], categories: [] };

  /* ---------------------------------------------------------
     DATA LOADING
     --------------------------------------------------------- */
  async function loadData() {
    try {
      const [toolsRes, blogsRes] = await Promise.all([
        fetch("tools.json"),
        fetch("blogs.json")
      ]);
      const toolsData = await toolsRes.json();
      const blogsData = await blogsRes.json();
      state.tools = toolsData.tools || [];
      state.posts = blogsData.posts || [];
      buildCategories();
      renderAll();
    } catch (err) {
      console.error("Multi Tools: could not load tools.json / blogs.json", err);
      showLoadError();
    }
  }

  function showLoadError() {
    const grids = ["featured-tools-grid", "latest-tools-grid", "categories-grid", "blog-grid"];
    grids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '<p class="empty-state">Content could not be loaded. If you are viewing this file directly from disk, please serve it over a local or GitHub Pages server so tools.json and blogs.json can be fetched.</p>';
      }
    });
  }

  function buildCategories() {
    const map = new Map();
    state.tools.forEach((t) => {
      map.set(t.category, (map.get(t.category) || 0) + 1);
    });
    state.categories = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /* ---------------------------------------------------------
     TEMPLATES
     --------------------------------------------------------- */
  function toolCardHTML(t, opts) {
    opts = opts || {};
    const badge = opts.badge ? '<span class="tool-badge">' + opts.badge + '</span>' : "";
    return (
      '<article class="tool-card">' +
        '<div class="tool-card-top">' +
          '<span class="tool-icon">' + icon(t.icon) + '</span>' + badge +
        '</div>' +
        '<h3>' + escapeHtml(t.name) + '</h3>' +
        '<p>' + escapeHtml(t.description) + '</p>' +
        '<div class="tool-card-footer">' +
          '<span class="tool-category-tag">' + escapeHtml(t.category) + '</span>' +
          '<a class="tool-open" href="' + t.url + '">Open Tool ' + arrowIcon() + '</a>' +
        '</div>' +
      '</article>'
    );
  }

  function blogCardHTML(p) {
    const date = new Date(p.date);
    const dateStr = isNaN(date) ? p.date : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return (
      '<article class="blog-card">' +
        '<div class="blog-thumb" role="img" aria-label="' + escapeHtml(p.title) + ' illustration">' + icon("filetext", 40) + '</div>' +
        '<div class="blog-body">' +
          '<div class="blog-meta"><span class="blog-cat">' + escapeHtml(p.category) + '</span><span>·</span><span>' + p.readingTime + ' min read</span><span>·</span><time datetime="' + p.date + '">' + dateStr + '</time></div>' +
          '<h3>' + escapeHtml(p.title) + '</h3>' +
          '<p>' + escapeHtml(p.excerpt) + '</p>' +
          '<a class="blog-read-more" href="' + p.url + '">Read More ' + arrowIcon() + '</a>' +
        '</div>' +
      '</article>'
    );
  }

  function categoryCardHTML(cat) {
    const iconName = CATEGORY_ICONS[cat.name] || "grid";
    return (
      '<button type="button" class="category-card" data-category="' + escapeHtml(cat.name) + '">' +
        '<span class="category-icon">' + icon(iconName, 22) + '</span>' +
        '<h3>' + escapeHtml(cat.name) + '</h3>' +
        '<span class="category-count">' + cat.count + (cat.count === 1 ? " tool" : " tools") + '</span>' +
      '</button>'
    );
  }

  /* ---------------------------------------------------------
     RENDER
     --------------------------------------------------------- */
  function renderAll() {
    renderCategories();
    renderFeatured();
    renderLatest();
    renderBlog();
    renderFooterLists();
    renderStats();
    renderHeroChips();
  }

  function renderCategories() {
    const grid = document.getElementById("categories-grid");
    if (!grid) return;
    grid.innerHTML = state.categories.map(categoryCardHTML).join("");
    grid.querySelectorAll(".category-card").forEach((card) => {
      card.addEventListener("click", () => filterByCategory(card.dataset.category));
    });
  }

  function renderFeatured() {
    const grid = document.getElementById("featured-tools-grid");
    if (!grid) return;
    const featured = state.tools.filter((t) => t.featured).slice(0, 8);
    const list = featured.length ? featured : state.tools.slice(0, 8);
    grid.innerHTML = list.map((t) => toolCardHTML(t, { badge: "Featured" })).join("");
  }

  function renderLatest() {
    const grid = document.getElementById("latest-tools-grid");
    if (!grid) return;
    const sorted = [...state.tools].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 8);
    grid.innerHTML = sorted.map((t) => toolCardHTML(t, { badge: "New" })).join("");
  }

  function renderBlog() {
    const grid = document.getElementById("blog-grid");
    if (!grid) return;
    const sorted = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    grid.innerHTML = sorted.map(blogCardHTML).join("");
  }

  function renderHeroChips() {
    const wrap = document.getElementById("hero-chips");
    if (!wrap) return;
    const top = state.categories.slice(0, 6);
    wrap.innerHTML = top.map((c) =>
      '<button type="button" class="hero-chip" data-category="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + '</button>'
    ).join("");
    wrap.querySelectorAll(".hero-chip").forEach((chip) => {
      chip.addEventListener("click", () => filterByCategory(chip.dataset.category));
    });
  }

  function renderFooterLists() {
    const toolsList = document.getElementById("footer-tools-list");
    if (toolsList) {
      const popular = state.tools.filter((t) => t.featured).slice(0, 6);
      toolsList.innerHTML = popular.map((t) => '<li><a href="' + t.url + '">' + escapeHtml(t.name) + '</a></li>').join("");
    }
    const articlesList = document.getElementById("footer-articles-list");
    if (articlesList) {
      const latestPosts = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      articlesList.innerHTML = latestPosts.map((p) => '<li><a href="' + p.url + '">' + escapeHtml(p.title) + '</a></li>').join("");
    }
    const catList = document.getElementById("footer-categories-list");
    if (catList) {
      catList.innerHTML = state.categories.slice(0, 8).map((c) =>
        '<li><a href="#categories" data-footer-category="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + '</a></li>'
      ).join("");
      catList.querySelectorAll("[data-footer-category]").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          filterByCategory(a.dataset.footerCategory);
        });
      });
    }
  }

  function renderStats() {
    setCounterTarget("stat-tools", state.tools.length);
    setCounterTarget("stat-categories", state.categories.length);
    setCounterTarget("stat-posts", state.posts.length);
    setCounterTarget("stat-free", 100);
  }

  function setCounterTarget(id, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("data-target", value);
  }

  /* ---------------------------------------------------------
     STAT COUNTER ANIMATION (IntersectionObserver)
     --------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll(".stat-number");
    if (!counters.length) return;
    const animate = (el) => {
      const target = parseInt(el.getAttribute("data-target"), 10) || 0;
      const duration = 1100;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => observer.observe(c));
  }

  /* ---------------------------------------------------------
     SEARCH
     --------------------------------------------------------- */
  function searchTools(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return state.tools.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.keywords || []).some((k) => k.toLowerCase().includes(q))
      );
    });
  }

  function suggestItemHTML(t) {
    return (
      '<a class="suggest-item" href="' + t.url + '" role="option">' +
        '<span class="s-icon">' + icon(t.icon, 18) + '</span>' +
        '<span>' + escapeHtml(t.name) + '</span>' +
        '<span class="s-cat">' + escapeHtml(t.category) + '</span>' +
      '</a>'
    );
  }

  function wireLiveSearch(inputEl, dropdownEl, opts) {
    opts = opts || {};
    let debounceTimer;
    inputEl.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = inputEl.value;
        if (!q.trim()) {
          dropdownEl.hidden = true;
          dropdownEl.innerHTML = "";
          return;
        }
        const results = searchTools(q).slice(0, 7);
        dropdownEl.innerHTML = results.length
          ? results.map(suggestItemHTML).join("")
          : '<p class="suggest-empty">No tools found for “' + escapeHtml(q) + '”</p>';
        dropdownEl.hidden = false;
      }, 120);
    });

    document.addEventListener("click", (e) => {
      if (!dropdownEl.contains(e.target) && e.target !== inputEl) {
        dropdownEl.hidden = true;
      }
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        dropdownEl.hidden = true;
        inputEl.blur();
      }
    });
  }

  function renderSearchResults(query) {
    const section = document.getElementById("search-results-section");
    const grid = document.getElementById("search-results-grid");
    const meta = document.getElementById("search-results-meta");
    if (!section || !grid) return;
    const results = searchTools(query);
    grid.innerHTML = results.length
      ? results.map((t) => toolCardHTML(t)).join("")
      : '<p class="empty-state">No tools matched “' + escapeHtml(query) + '”. Try a different keyword or browse categories below.</p>';
    meta.textContent = results.length
      ? results.length + ' result' + (results.length === 1 ? "" : "s") + ' for “' + query + '”'
      : "";
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function filterByCategory(categoryName) {
    const heroInput = document.getElementById("hero-search-input");
    if (heroInput) heroInput.value = categoryName;
    const section = document.getElementById("search-results-section");
    const grid = document.getElementById("search-results-grid");
    const meta = document.getElementById("search-results-meta");
    if (!section || !grid) return;
    const results = state.tools.filter((t) => t.category === categoryName);
    grid.innerHTML = results.map((t) => toolCardHTML(t)).join("");
    meta.textContent = results.length + ' tool' + (results.length === 1 ? "" : "s") + ' in “' + categoryName + '”';
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initSearch() {
    const navInput = document.getElementById("nav-search-input");
    const navSuggest = document.getElementById("nav-search-suggest");
    if (navInput && navSuggest) wireLiveSearch(navInput, navSuggest);

    const heroInput = document.getElementById("hero-search-input");
    const heroSuggest = document.getElementById("hero-search-suggest");
    if (heroInput && heroSuggest) wireLiveSearch(heroInput, heroSuggest);

    const heroForm = document.getElementById("hero-search-form");
    if (heroForm) {
      heroForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = heroInput.value;
        if (!q.trim()) return;
        heroSuggest.hidden = true;
        renderSearchResults(q);
      });
    }

    // Keyboard shortcut: "/" focuses nav search
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        const target = navInput && navInput.offsetParent !== null ? navInput : heroInput;
        if (target) target.focus();
      }
    });

    // Support ?search= query param on load
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("search");
    if (initialQuery) {
      if (heroInput) heroInput.value = initialQuery;
      renderSearchResults(initialQuery);
    }
  }

  /* ---------------------------------------------------------
     THEME TOGGLE
     --------------------------------------------------------- */
  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    const root = document.documentElement;
    const saved = localStorage.getItem("multitools-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
    if (initial === "dark") {
      root.setAttribute("data-theme", "dark");
      toggle && toggle.setAttribute("aria-pressed", "true");
    }
    if (toggle) {
      toggle.addEventListener("click", () => {
        const isDark = root.getAttribute("data-theme") === "dark";
        if (isDark) {
          root.removeAttribute("data-theme");
          localStorage.setItem("multitools-theme", "light");
          toggle.setAttribute("aria-pressed", "false");
        } else {
          root.setAttribute("data-theme", "dark");
          localStorage.setItem("multitools-theme", "dark");
          toggle.setAttribute("aria-pressed", "true");
        }
      });
    }
  }

  /* ---------------------------------------------------------
     MOBILE NAV
     --------------------------------------------------------- */
  function initMobileNav() {
    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------
     NEWSLETTER (client-side only, no backend in this build)
     --------------------------------------------------------- */
  function initNewsletter() {
    const form = document.getElementById("newsletter-form");
    const note = document.getElementById("newsletter-note");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("newsletter-email").value;
      if (!email) return;
      note.textContent = "Thanks! " + email + " has been added to the list.";
      form.reset();
    });
  }

  /* ---------------------------------------------------------
     MISC
     --------------------------------------------------------- */
  function initFooterYear() {
    const el = document.getElementById("footer-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function initHeaderShadowOnScroll() {
    const header = document.getElementById("site-header");
    if (!header) return;
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.style.boxShadow = window.scrollY > 8 ? "0 8px 24px -16px rgba(19,26,44,.3)" : "none";
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileNav();
    initNewsletter();
    initFooterYear();
    initHeaderShadowOnScroll();
    loadData().then(() => {
      initSearch();
      initCounters();
    });
  });
})();
