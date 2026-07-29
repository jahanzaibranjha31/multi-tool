/* ==========================================================================
   MULTI TOOLS — SCRIPT.JS
   Vanilla JavaScript, no build step, no dependencies.

   IMPORTANT (auto-discovery of tools):
   This site never hardcodes tool cards. On load, it fetches "tools.json"
   — a file generated automatically by the site's existing
   "generate-homepage.js" build script whenever a tool folder is added
   or removed. Every card, category chip, and filter you see below is
   rendered from that data. If tools.json changes, simply rebuilding and
   redeploying updates the homepage with zero manual edits.

   Expected shape of tools.json:
   [
     {
       "slug": "age-calculator",        // folder name, used as relative URL
       "name": "Age Calculator",
       "description": "Find your exact age in years, months and days.",
       "category": "Calculators",
       "icon": "calculator",            // key into the ICONS map below
       "popular": true
     },
     ...
   ]
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------
     0. SMALL ICON LIBRARY (inline SVG strings, keyed by icon name)
     Falls back to a generic "tool" glyph if a key is missing so a
     newly added tool never renders broken markup.
  ------------------------------------------------------------------ */
  const ICONS = {
    calculator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 19h1M12 19h1"/></svg>',
    password: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15.2" r="1.4" fill="currentColor" stroke="none"/></svg>',
    wheel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12l6 3.4M12 12 6 8.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h14M5 5l1 14h12l1-14M9 9v6M15 9v6"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="11" rx="2.5"/><path d="M9 3.5 12 7l3-3.5M9 12h.01M15 12h.01"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.4-4.6-9.6-9.1C.9 8.4 2.7 5 6.2 5c2 0 3.4 1 4.8 2.8C12.4 6 13.8 5 15.8 5c3.5 0 5.3 3.4 3.8 6.9C17.4 16.4 12 21 12 21Z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h3v3h-3zM20.5 14.5v3M14.5 20.5h3"/></svg>',
    convert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13M17 8l-3-3M17 8l-3 3M20 16H7M7 16l3-3M7 16l3 3"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2.5h7l4 4V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z"/><path d="M14 2.5V7h4M9 13h6M9 16.5h6"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16 15 11l-8 8"/></svg>',
    dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14"/></svg>',
    seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8M7.5 10.5h6M10.5 7.5v6"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-2.8 2.6-2.6Z"/></svg>'
  };

  const iconFor = (key) => ICONS[key] || ICONS.tool;

  /* ------------------------------------------------------------------
     1. FALLBACK DATA
     Used only if tools.json cannot be fetched (e.g. opened directly
     from the filesystem before deployment, or a network hiccup). Once
     tools.json is present on the deployed site, it always takes over.
  ------------------------------------------------------------------ */
  const FALLBACK_TOOLS = [
    { slug: "age-calculator", name: "Age Calculator", description: "Get your exact age in years, months and days from any birth date.", category: "Calculators", icon: "calculator", popular: true },
    { slug: "bmi-calculator", name: "BMI Calculator", description: "Calculate your body mass index and see what the result means.", category: "Calculators", icon: "health", popular: true },
    { slug: "password-generator", name: "Password Generator", description: "Create strong, random passwords with custom length and character rules.", category: "Security", icon: "password", popular: true },
    { slug: "spin-wheel", name: "Spin the Wheel", description: "Make a fair random pick from a custom list of names or options.", category: "Generators", icon: "wheel", popular: true },
    { slug: "character-counter", name: "Character Counter", description: "Count characters, words and sentences for social posts and meta tags.", category: "Text Tools", icon: "text", popular: true },
    { slug: "ai-prompt-token-estimator", name: "AI Prompt Token Estimator", description: "Estimate how many tokens your prompt will use before you send it.", category: "AI Tools", icon: "ai", popular: true },
    { slug: "qr-code-generator", name: "QR Code Generator", description: "Turn any link or text into a scannable QR code in seconds.", category: "Developer Tools", icon: "qr", popular: true },
    { slug: "unit-converter", name: "Unit Converter", description: "Convert length, weight, temperature and more, instantly.", category: "Converters", icon: "convert", popular: false },
    { slug: "pdf-compressor", name: "PDF Compressor", description: "Shrink PDF file size while keeping text and images sharp.", category: "PDF Tools", icon: "pdf", popular: false },
    { slug: "image-resizer", name: "Image Resizer", description: "Resize and compress images for web use without losing quality.", category: "Image Tools", icon: "image", popular: false },
    { slug: "json-formatter", name: "JSON Formatter", description: "Format, validate and beautify JSON with one click.", category: "Developer Tools", icon: "dev", popular: false },
    { slug: "meta-tag-checker", name: "Meta Tag Checker", description: "Preview and audit a page's title, description and social tags.", category: "SEO Tools", icon: "seo", popular: false }
  ];

  let allTools = [];
  let activeCategory = "all";

  /* ------------------------------------------------------------------
     2. HEADER: scroll shadow, mobile menu, theme toggle
  ------------------------------------------------------------------ */
  const header = document.getElementById("site-header");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    backToTop.hidden = window.scrollY < 480;
  };

  const menuToggle = document.getElementById("menu-toggle");
  const mainNav = document.getElementById("main-nav");
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  const themeToggle = document.getElementById("theme-toggle");
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    try { localStorage.setItem("mt-theme", theme); } catch (e) { /* storage unavailable, ignore */ }
  };
  (() => {
    let stored = null;
    try { stored = localStorage.getItem("mt-theme"); } catch (e) { /* ignore */ }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored || (prefersDark ? "dark" : "light"));
  })();
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  const backToTop = document.getElementById("back-to-top");
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ------------------------------------------------------------------
     3. LOAD TOOLS.JSON AND RENDER CATEGORIES + CARDS
  ------------------------------------------------------------------ */
  const toolsGrid = document.getElementById("tools-grid");
  const toolsEmpty = document.getElementById("tools-empty");
  const categoryGrid = document.getElementById("category-grid");
  const filterBar = document.getElementById("filter-bar");

  const categoryIcon = (category) => {
    const map = {
      "Calculators": "calculator", "Converters": "convert", "Generators": "wheel",
      "Text Tools": "text", "AI Tools": "ai", "Security": "password",
      "Developer Tools": "dev", "SEO Tools": "seo", "PDF Tools": "pdf",
      "Image Tools": "image", "Health": "health"
    };
    return map[category] || "tool";
  };

  function buildCardMarkup(tool) {
    const name = escapeHtml(tool.name || tool.slug);
    const desc = escapeHtml(tool.description || "");
    const category = escapeHtml(tool.category || "Tools");
    const href = `${tool.slug}/`;
    return `
      <article class="tool-card" data-category="${category}">
        <div class="tool-icon" aria-hidden="true">${iconFor(tool.icon)}</div>
        <h3>${name}</h3>
        <p>${desc}</p>
        <div class="tool-card-footer">
          <span class="badge">${category}</span>
          <a class="tool-link" href="${href}">
            Open tool
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </article>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCategories(tools) {
    const counts = {};
    tools.forEach((t) => {
      const cat = t.category || "Tools";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const categories = Object.keys(counts).sort();

    categoryGrid.innerHTML = categories.map((cat) => `
      <a class="category-card" href="/tools/?category=${encodeURIComponent(cat)}" role="listitem">
        <span class="cat-icon" aria-hidden="true">${iconFor(categoryIcon(cat))}</span>
        <span>
          <span class="cat-name">${escapeHtml(cat)}</span>
          <span class="cat-count">${counts[cat]} tool${counts[cat] === 1 ? "" : "s"}</span>
        </span>
      </a>`).join("");

    // Filter chips (in addition to the static "All" chip already in the HTML)
    const existingExtra = filterBar.querySelectorAll('[data-dynamic="1"]');
    existingExtra.forEach((el) => el.remove());
    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.filter = cat;
      btn.dataset.dynamic = "1";
      btn.textContent = cat;
      filterBar.appendChild(btn);
    });
  }

  function renderTools(tools) {
    const list = tools.filter((t) => t.popular).length ? tools.filter((t) => t.popular) : tools;
    toolsGrid.classList.add("is-loaded");
    toolsGrid.querySelectorAll(".tool-card").forEach((el) => el.remove());

    const filtered = activeCategory === "all" ? list : list.filter((t) => t.category === activeCategory);

    if (!filtered.length) {
      toolsEmpty.hidden = false;
      return;
    }
    toolsEmpty.hidden = true;

    const markup = filtered.slice(0, 8).map(buildCardMarkup).join("");
    toolsEmpty.insertAdjacentHTML("beforebegin", markup);
  }

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filterBar.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeCategory = btn.dataset.filter;
    renderTools(allTools);
  });

  async function loadTools() {
    try {
      const res = await fetch("tools.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`tools.json responded with ${res.status}`);
      const data = await res.json();
      allTools = Array.isArray(data) ? data : [];
      if (!allTools.length) throw new Error("tools.json was empty");
    } catch (err) {
      // tools.json isn't available yet (e.g. before the first build) —
      // fall back so the page still demonstrates full functionality.
      allTools = FALLBACK_TOOLS;
    }
    renderCategories(allTools);
    renderTools(allTools);
  }

  loadTools();

  /* ------------------------------------------------------------------
     4. LIVE SEARCH (hero search bar)
  ------------------------------------------------------------------ */
  const searchForm = document.getElementById("hero-search-form");
  const searchInput = document.getElementById("hero-search");
  const resultsBox = document.getElementById("live-search-results");

  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) { resultsBox.hidden = true; resultsBox.innerHTML = ""; return; }

    const matches = allTools.filter((t) =>
      (t.name || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.category || "").toLowerCase().includes(q)
    ).slice(0, 6);

    if (!matches.length) {
      resultsBox.innerHTML = `<a role="option" aria-disabled="true" tabindex="-1">No tools match “${escapeHtml(query)}”</a>`;
      resultsBox.hidden = false;
      return;
    }

    resultsBox.innerHTML = matches.map((t) => `
      <a href="${t.slug}/" role="option">
        ${escapeHtml(t.name)}
        <span class="lr-cat">${escapeHtml(t.category || "")}</span>
      </a>`).join("");
    resultsBox.hidden = false;
  }

  let searchDebounce;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const val = e.target.value;
    searchDebounce = setTimeout(() => renderSearchResults(val), 120);
  });
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    renderSearchResults(searchInput.value);
  });
  document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) resultsBox.hidden = true;
  });

  /* ------------------------------------------------------------------
     5. STAT COUNTERS (animate once, when scrolled into view)
  ------------------------------------------------------------------ */
  const statNumbers = document.querySelectorAll(".stat-number");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }

    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window && statNumbers.length) {
    const statsObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statNumbers.forEach((el) => statsObserver.observe(el));
  } else {
    statNumbers.forEach(animateCount);
  }

  /* ------------------------------------------------------------------
     6. FAQ ACCORDION
  ------------------------------------------------------------------ */
  document.querySelectorAll(".faq-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const answer = document.getElementById(trigger.getAttribute("aria-controls"));
      trigger.setAttribute("aria-expanded", String(!expanded));
      answer.hidden = expanded;
    });
  });

  /* ------------------------------------------------------------------
     7. NEWSLETTER FORMS (client-side only — wire up to a real
        provider/back end when one is available)
  ------------------------------------------------------------------ */
  const newsletterForm = document.getElementById("newsletter-form");
  const newsletterStatus = document.getElementById("newsletter-status");
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletter-email").value.trim();
    newsletterStatus.textContent = email
      ? "Thanks — check your inbox to confirm your subscription."
      : "Please enter a valid email address.";
    if (email) newsletterForm.reset();
  });

  const footerNewsletterForm = document.getElementById("footer-newsletter-form");
  footerNewsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    footerNewsletterForm.reset();
    const btn = footerNewsletterForm.querySelector("button");
    const original = btn.textContent;
    btn.textContent = "Joined";
    setTimeout(() => { btn.textContent = original; }, 2200);
  });

  /* ------------------------------------------------------------------
     8. FOOTER YEAR
  ------------------------------------------------------------------ */
  document.getElementById("footer-year").textContent = new Date().getFullYear();
})();
