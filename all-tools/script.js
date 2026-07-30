/*!
 * Multi Tools — All Tools Page
 * Loads every tool from ../tools.json (never hardcoded), renders cards,
 * powers live search + category filters, and injects a dynamic
 * ItemList JSON-LD block so structured data always matches reality.
 */
(() => {
  "use strict";

  const TOOLS_JSON_PATH = "../tools.json";
  const SITE_ORIGIN = "https://jahanzaibranjha31.github.io/multi-tool";

  /* Curated icon set — matched by keyword against category/name so every
     card gets a sensible SVG glyph without needing icons in tools.json. */
  const ICONS = {
    calculator: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 7h8M8 11h1M11.5 11h1M15 11h1M8 15h1M11.5 15h1M15 15h1M8 19h1M11.5 19h1M15 19h1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    ai: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="19" cy="19" r="2" stroke="currentColor" stroke-width="1.6"/></svg>',
    dev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 8l-5 4 5 4M16 8l5 4-5 4M13.5 5l-3 14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    seo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    text: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    image: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/><circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" stroke-width="1.5"/><path d="M21 16l-5.5-5.5L6 20" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    pdf: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 2h7l4 4v16H7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 2v4h4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 14v4M9.5 14h1.3a1.5 1.5 0 000-3H9.5M14.5 14v4M14.5 14h1.2a1.7 1.7 0 010 4h-1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    convert: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    generator: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    utility: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.8 2.8-2-2 2.8-2.8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    productivity: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    default: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>'
  };

  const ICON_KEYWORDS = [
    [/calc|loan|percentage|age/i, "calculator"],
    [/\bai\b|prompt|summar/i, "ai"],
    [/json|regex|base64|dev|html/i, "dev"],
    [/seo|keyword|meta/i, "seo"],
    [/text|case|sentence|lorem|diff|character/i, "text"],
    [/image|resiz/i, "image"],
    [/pdf/i, "pdf"],
    [/convert|currency|unit/i, "convert"],
    [/generat|password|pin|qr|random/i, "generator"],
    [/spin|wheel|utility/i, "utility"],
    [/productiv/i, "productivity"]
  ];

  const CATEGORY_LIST = [
    "Calculators", "AI Tools", "Developer Tools", "SEO Tools", "Text Tools",
    "Image Tools", "PDF Tools", "Converters", "Generators", "Utility Tools", "Productivity Tools"
  ];

  const els = {
    grid: document.getElementById("toolsContainer"),
    resultsCount: document.getElementById("resultsCount"),
    emptyState: document.getElementById("emptyState"),
    emptyReset: document.getElementById("emptyReset"),
    search: document.getElementById("toolSearch"),
    clearSearch: document.getElementById("clearSearch"),
    searchStatus: document.getElementById("searchStatus"),
    filterChips: document.getElementById("filterChips"),
    resetFilters: document.getElementById("resetFilters"),
    featuredSection: document.getElementById("featuredSection"),
    featuredGrid: document.getElementById("featuredGrid"),
    categoriesGrid: document.getElementById("categoriesGrid"),
    statTotal: document.getElementById("statTotal"),
    statCategories: document.getElementById("statCategories"),
    bandTotal: document.getElementById("bandTotal"),
    bandCategories: document.getElementById("bandCategories"),
    navToggle: document.getElementById("navToggle"),
    mainNav: document.getElementById("mainNav"),
    newsletterForm: document.getElementById("newsletterForm"),
    newsletterStatus: document.getElementById("newsletterStatus"),
    footerYear: document.getElementById("footerYear")
  };

  let allTools = [];
  let state = { query: "", category: "all" };

  /* ---------- Utilities ---------- */

  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function pickIconKey(tool) {
    const haystack = `${tool.category || ""} ${tool.name || ""}`.toLowerCase();
    for (const [re, key] of ICON_KEYWORDS) {
      if (re.test(haystack)) return key;
    }
    return "default";
  }

  /* Normalizes an entry from tools.json regardless of exact field naming,
     so this page keeps working even if the schema evolves slightly. */
  function normalizeTool(raw, index) {
    if (!raw || typeof raw !== "object") return null;

    const name = raw.name || raw.title || raw.toolName || raw.label;
    if (!name) return null;

    let slug = raw.slug || raw.id || raw.key || slugify(name);
    let url = raw.url || raw.link || raw.href || raw.path;
    if (!url) url = `../${slug}/`;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("../") && !url.startsWith("/")) {
      url = `../${url.replace(/^\.?\/*/, "")}`;
    }

    const description =
      raw.description || raw.desc || raw.summary || raw.shortDescription || "Free online tool — fast, simple, and browser-based.";

    let category = raw.category || raw.type || raw.group || "Utility Tools";
    category = String(category).trim();

    const keywordsRaw = raw.keywords || raw.tags || [];
    const keywords = Array.isArray(keywordsRaw) ? keywordsRaw : String(keywordsRaw).split(",").map((k) => k.trim());

    const popular = Boolean(raw.popular ?? raw.isPopular ?? raw.featured ?? raw.trending ?? false);
    const isNew = Boolean(raw.new ?? raw.isNew ?? raw.recent ?? false);

    return {
      id: slug || `tool-${index}`,
      name: String(name).trim(),
      url,
      description: String(description).trim(),
      category,
      keywords: keywords.filter(Boolean).map((k) => String(k).toLowerCase()),
      popular,
      isNew
    };
  }

  async function loadTools() {
    try {
      const res = await fetch(TOOLS_JSON_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`tools.json responded ${res.status}`);
      const data = await res.json();

      const rawList = Array.isArray(data) ? data : Array.isArray(data.tools) ? data.tools : [];
      allTools = rawList
        .map((t, i) => normalizeTool(t, i))
        .filter(Boolean)
        // Guard against duplicate/broken entries: unique by slug, must have a name + url.
        .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

      renderAll();
    } catch (err) {
      console.error("Multi Tools: failed to load tools.json", err);
      renderLoadError();
    }
  }

  /* ---------- Rendering ---------- */

  function renderAll() {
    populateFilterChips();
    renderStats();
    renderFeatured();
    renderCategories();
    applyFiltersAndRender();
    injectItemListSchema();
  }

  function renderLoadError() {
    els.grid.setAttribute("aria-busy", "false");
    els.grid.innerHTML = "";
    els.resultsCount.textContent = "Tools could not be loaded right now.";
    els.emptyState.hidden = false;
    els.emptyState.querySelector("h3").textContent = "Something went wrong";
    els.emptyState.querySelector("p").textContent =
      "We couldn't load the tools list. Please refresh the page or try again shortly.";
  }

  function populateFilterChips() {
    const present = new Set(allTools.map((t) => t.category));
    const ordered = CATEGORY_LIST.filter((c) => present.has(c)).concat(
      [...present].filter((c) => !CATEGORY_LIST.includes(c)).sort()
    );

    ordered.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.category = cat;
      btn.textContent = cat;
      els.filterChips.appendChild(btn);
    });
  }

  function renderStats() {
    const total = allTools.length;
    const cats = new Set(allTools.map((t) => t.category)).size;
    els.statTotal.textContent = total;
    els.statCategories.textContent = cats;
    els.bandTotal.textContent = total;
    els.bandCategories.textContent = cats;
  }

  function renderFeatured() {
    const featured = allTools.filter((t) => t.popular).slice(0, 8);
    if (!featured.length) {
      els.featuredSection.hidden = true;
      return;
    }
    els.featuredSection.hidden = false;
    els.featuredGrid.innerHTML = featured.map(toolCardHTML).join("");
  }

  function renderCategories() {
    const counts = {};
    allTools.forEach((t) => { counts[t.category] = (counts[t.category] || 0) + 1; });

    const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
    els.categoriesGrid.innerHTML = cats
      .map(
        (cat) => `
      <button type="button" class="category-card" data-category="${escapeHTML(cat)}">
        <h3>${escapeHTML(cat)}</h3>
        <span class="cat-count">${counts[cat]} tool${counts[cat] === 1 ? "" : "s"}</span>
      </button>`
      )
      .join("");
  }

  function toolCardHTML(tool) {
    const iconKey = pickIconKey(tool);
    const badges = [
      tool.popular ? '<span class="badge badge-popular">Popular</span>' : "",
      tool.isNew ? '<span class="badge badge-new">New</span>' : ""
    ].join("");

    return `
      <article class="tool-card" data-name="${escapeHTML(tool.name.toLowerCase())}">
        <div class="card-top">
          <span class="card-icon" aria-hidden="true">${ICONS[iconKey]}</span>
          <span class="card-badges">${badges}</span>
        </div>
        <h3>${escapeHTML(tool.name)}</h3>
        <p class="card-desc">${escapeHTML(tool.description)}</p>
        <div class="card-top" style="margin-top:auto;">
          <span class="badge badge-category">${escapeHTML(tool.category)}</span>
        </div>
        <span class="card-open" aria-hidden="true">
          Open Tool
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <a class="tool-card-link" href="${escapeHTML(tool.url)}" aria-label="Open ${escapeHTML(tool.name)}"></a>
      </article>`;
  }

  function matchesQuery(tool, q) {
    if (!q) return true;
    const hay = `${tool.name} ${tool.description} ${tool.category} ${tool.keywords.join(" ")}`.toLowerCase();
    return hay.includes(q);
  }

  function applyFiltersAndRender() {
    const q = state.query.trim().toLowerCase();
    const filtered = allTools.filter(
      (t) => (state.category === "all" || t.category === state.category) && matchesQuery(t, q)
    );

    els.grid.setAttribute("aria-busy", "false");

    if (!filtered.length) {
      els.grid.innerHTML = "";
      els.emptyState.hidden = false;
      els.resultsCount.textContent = "0 tools found";
    } else {
      els.emptyState.hidden = true;
      els.grid.innerHTML = filtered.map(toolCardHTML).join("");
      els.resultsCount.textContent = `Showing ${filtered.length} of ${allTools.length} tool${allTools.length === 1 ? "" : "s"}`;
    }

    els.searchStatus.textContent = q
      ? `${filtered.length} result${filtered.length === 1 ? "" : "s"} for “${state.query.trim()}”`
      : "";

    els.clearSearch.hidden = !state.query;
  }

  /* Dynamic ItemList JSON-LD — reflects the real, current tool catalog. */
  function injectItemListSchema() {
    const existing = document.getElementById("itemListSchema");
    if (existing) existing.remove();

    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: allTools.slice(0, 60).map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: t.url.startsWith("http") ? t.url : new URL(t.url, `${SITE_ORIGIN}/all-tools/`).href
      }))
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "itemListSchema";
    script.textContent = JSON.stringify(itemList);
    document.body.appendChild(script);
  }

  /* ---------- Events ---------- */

  function setCategory(cat) {
    state.category = cat;
    [...els.filterChips.querySelectorAll(".chip")].forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.category === cat);
    });
    applyFiltersAndRender();
  }

  els.filterChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    setCategory(chip.dataset.category);
  });

  els.categoriesGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".category-card");
    if (!card) return;
    setCategory(card.dataset.category);
    document.getElementById("toolsGrid").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.resetFilters.addEventListener("click", () => {
    state.query = "";
    els.search.value = "";
    setCategory("all");
  });
  els.emptyReset.addEventListener("click", () => els.resetFilters.click());

  let searchDebounce;
  els.search.addEventListener("input", (e) => {
    state.query = e.target.value;
    els.clearSearch.hidden = !state.query;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applyFiltersAndRender, 120);
  });
  els.clearSearch.addEventListener("click", () => {
    state.query = "";
    els.search.value = "";
    els.search.focus();
    applyFiltersAndRender();
  });
  document.getElementById("heroSearchForm").addEventListener("submit", (e) => e.preventDefault());

  els.navToggle.addEventListener("click", () => {
    const isOpen = els.mainNav.classList.toggle("is-open");
    els.navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  els.newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    els.newsletterStatus.textContent = "Thanks — you're on the list!";
    els.newsletterForm.reset();
  });

  els.footerYear.textContent = new Date().getFullYear();

  /* Read ?q= from the URL so the SearchAction / shared links work. */
  const params = new URLSearchParams(location.search);
  if (params.get("q")) {
    els.search.value = params.get("q");
    state.query = params.get("q");
  }

  loadTools();
})();
