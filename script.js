/* =============================================
   MULTI TOOLS — script.js
   Vanilla JS · No frameworks · GitHub Pages
   ============================================= */

'use strict';

/* ── State ────────────────────────────────── */
let allTools   = [];
let allBlogs   = [];
let activeCategory = 'All';
let searchQuery    = '';

/* ── DOM Refs ─────────────────────────────── */
const toolsGrid      = document.getElementById('tools-grid');
const featuredGrid   = document.getElementById('featured-grid');
const blogsGrid      = document.getElementById('blogs-grid');
const catFilters     = document.getElementById('category-filters');
const searchInput    = document.getElementById('search-input');
const searchCount    = document.getElementById('search-count');
const noResults      = document.getElementById('search-no-results');
const statTools      = document.getElementById('stat-tools');
const statBlogs      = document.getElementById('stat-blogs');
const statCats       = document.getElementById('stat-cats');
const heroTools      = document.getElementById('hero-tools');
const heroBlog       = document.getElementById('hero-blogs');
const heroCats       = document.getElementById('hero-cats');
const backToTop      = document.getElementById('back-to-top');
const navbar         = document.getElementById('navbar');
const navToggle      = document.getElementById('nav-toggle');
const navLinks       = document.getElementById('nav-links');
const currentYear    = document.getElementById('current-year');
const faqList        = document.getElementById('faq-list');
const newsletterForm = document.getElementById('newsletter-form');
const newsletterMsg  = document.getElementById('newsletter-msg');

/* ── Bootstrap ────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  if (currentYear) currentYear.textContent = new Date().getFullYear();
  setupNavbar();
  setupBackToTop();
  setupScrollReveal();
  setupFAQ();
  setupNewsletter();

  // Load data in parallel
  const [tools, blogs] = await Promise.all([fetchTools(), fetchBlogs()]);
  allTools = tools;
  allBlogs = blogs;

  buildCategories();
  renderTools();
  renderFeatured();
  renderBlogs();
  animateStats();
  updateMetaStats();
}

/* ── Fetch helpers ────────────────────────── */
async function fetchTools() {
  try {
    const r = await fetch('tools.json');
    if (!r.ok) throw new Error('tools.json not found');
    return await r.json();
  } catch (e) {
    console.warn('Could not load tools.json', e);
    return [];
  }
}

async function fetchBlogs() {
  try {
    const r = await fetch('blogs.json');
    if (!r.ok) throw new Error('blogs.json not found');
    return await r.json();
  } catch (e) {
    console.warn('Could not load blogs.json', e);
    return [];
  }
}

/* ── Category builder ─────────────────────── */
function buildCategories() {
  const countMap = {};
  allTools.forEach(t => {
    const c = t.category || 'Other';
    countMap[c] = (countMap[c] || 0) + 1;
  });

  const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
  const total  = allTools.length;

  if (!catFilters) return;
  catFilters.innerHTML = '';

  // All pill
  const allPill = makePill('All', total, true);
  catFilters.appendChild(allPill);

  sorted.forEach(([cat, count]) => {
    catFilters.appendChild(makePill(cat, count, false));
  });
}

function makePill(label, count, active) {
  const btn = document.createElement('button');
  btn.className = 'cat-pill' + (active ? ' active' : '');
  btn.setAttribute('aria-pressed', String(active));
  btn.dataset.cat = label;
  btn.innerHTML = `${esc(label)} <span class="cat-count">${count}</span>`;
  btn.addEventListener('click', () => selectCategory(label));
  return btn;
}

function selectCategory(cat) {
  activeCategory = cat;
  catFilters.querySelectorAll('.cat-pill').forEach(p => {
    const a = p.dataset.cat === cat;
    p.classList.toggle('active', a);
    p.setAttribute('aria-pressed', String(a));
  });
  renderTools();
}

/* ── Tool rendering ───────────────────────── */
function filteredTools() {
  const q = searchQuery.toLowerCase().trim();
  return allTools.filter(t => {
    const catMatch = activeCategory === 'All' || t.category === activeCategory;
    if (!catMatch) return false;
    if (!q) return true;
    const haystack = [t.name, t.category, t.description, ...(t.tags || [])]
      .join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

function renderTools() {
  if (!toolsGrid) return;
  const tools = filteredTools();

  if (searchCount) searchCount.textContent = `${tools.length} tool${tools.length !== 1 ? 's' : ''}`;
  if (noResults) noResults.style.display = tools.length === 0 ? 'block' : 'none';

  toolsGrid.innerHTML = '';
  tools.forEach((tool, i) => {
    const card = buildToolCard(tool, i);
    toolsGrid.appendChild(card);
  });
}

function buildToolCard(tool, delay) {
  const a = document.createElement('a');
  a.href        = tool.url;
  a.className   = 'tool-card';
  a.setAttribute('aria-label', tool.name);
  a.style.animationDelay = `${Math.min(delay * 0.05, 0.5)}s`;

  // 404 guard: mark cards as "checking"
  a.dataset.url = tool.url;

  a.innerHTML = `
    ${tool.featured ? '<span class="tool-card-featured" aria-label="Featured">⭐ Featured</span>' : ''}
    <div class="tool-icon" aria-hidden="true">${esc(tool.icon || '🔧')}</div>
    <div class="tool-card-name">${esc(tool.name)}</div>
    <div class="tool-card-desc">${esc(tool.description || '')}</div>
    <div class="tool-card-footer">
      <span class="tool-card-cat">${esc(tool.category || '')}</span>
      <span class="tool-card-open" aria-hidden="true">Open →</span>
    </div>
  `;

  // 404 guard: verify the URL exists before showing the card
  verifyUrl(tool.url, exists => {
    if (!exists) {
      a.style.display = 'none';
      a.setAttribute('aria-hidden', 'true');
    }
  });

  return a;
}

function renderFeatured() {
  if (!featuredGrid) return;
  const featured = allTools
    .filter(t => t.featured)
    .slice(0, 6);

  if (featured.length === 0) {
    const wrap = featuredGrid.closest('section');
    if (wrap) wrap.style.display = 'none';
    return;
  }

  featuredGrid.innerHTML = '';
  featured.forEach((tool, i) => {
    featuredGrid.appendChild(buildToolCard(tool, i));
  });
}

/* ── Blog rendering ───────────────────────── */
function renderBlogs() {
  if (!blogsGrid) return;

  // Sort newest first
  const blogs = [...allBlogs].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (blogs.length === 0) {
    const wrap = blogsGrid.closest('section');
    if (wrap) wrap.style.display = 'none';
    return;
  }

  blogsGrid.innerHTML = '';
  blogs.forEach((blog, i) => {
    blogsGrid.appendChild(buildBlogCard(blog, i));
  });
}

function buildBlogCard(blog, delay) {
  const a = document.createElement('a');
  a.href      = blog.url;
  a.className = 'blog-card';
  a.setAttribute('aria-label', blog.title);
  a.style.animationDelay = `${Math.min(delay * 0.08, 0.5)}s`;

  const imgHtml = blog.image
    ? `<img src="${esc(blog.image)}" alt="${esc(blog.title)}" class="blog-card-img" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'blog-card-img-placeholder\\'>📝</div>'">`
    : `<div class="blog-card-img-placeholder" aria-hidden="true">📝</div>`;

  a.innerHTML = `
    ${imgHtml}
    <div class="blog-card-body">
      <span class="blog-card-cat">${esc(blog.category || '')}</span>
      <div class="blog-card-title">${esc(blog.title)}</div>
      <div class="blog-card-desc">${esc(blog.description || '')}</div>
      <div class="blog-card-footer">
        <span class="blog-card-date">${formatDate(blog.date)}</span>
        <span class="blog-read-more" aria-hidden="true">Read More →</span>
      </div>
    </div>
  `;

  return a;
}

/* ── Stats animation ──────────────────────── */
function animateStats() {
  const cats = new Set(allTools.map(t => t.category)).size;

  animateCount(statTools,  allTools.length);
  animateCount(statBlogs,  allBlogs.length);
  animateCount(statCats,   cats);
  animateCount(heroTools,  allTools.length);
  animateCount(heroBlog,   allBlogs.length);
  animateCount(heroCats,   cats);
}

function animateCount(el, target) {
  if (!el) return;
  const duration = 1200;
  const start    = performance.now();

  const tick = now => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function updateMetaStats() {
  // Update meta description stat if present
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && allTools.length > 0) {
    const cats = new Set(allTools.map(t => t.category)).size;
    metaDesc.content =
      `Multi Tools — ${allTools.length}+ free online tools including calculators, generators, converters, and ${cats} categories. No sign-up required.`;
  }
}

/* ── Search ───────────────────────────────── */
if (searchInput) {
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value;
      renderTools();
      // Reset category pill counts are unaffected — intentional
    }, 150);
  });

  // Clear on Escape
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchQuery = '';
      renderTools();
    }
  });
}

/* ── 404 guard ────────────────────────────── */
const urlCache = {};

function verifyUrl(url, callback) {
  if (url in urlCache) {
    callback(urlCache[url]);
    return;
  }
  // Use a lightweight HEAD request; fall back gracefully on CORS/network errors
  fetch(url, { method: 'HEAD' })
    .then(r => {
      urlCache[url] = r.ok;
      callback(r.ok);
    })
    .catch(() => {
      // On fetch failure (offline, CORS), assume URL is valid to avoid hiding tools
      urlCache[url] = true;
      callback(true);
    });
}

/* ── Navbar ───────────────────────────────── */
function setupNavbar() {
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });

    // Close on link click (mobile)
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ── Back to Top ──────────────────────────── */
function setupBackToTop() {
  if (!backToTop) return;
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Scroll Reveal ────────────────────────── */
function setupScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
}

/* ── FAQ ──────────────────────────────────── */
function setupFAQ() {
  if (!faqList) return;

  faqList.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

/* ── Newsletter ───────────────────────────── */
function setupNewsletter() {
  if (!newsletterForm) return;
  newsletterForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input[type="email"]').value.trim();
    if (!email) return;
    if (newsletterMsg) {
      newsletterMsg.textContent = '🎉 Thank you! You\'re on the list.';
      newsletterMsg.style.color = '#a3e635';
    }
    newsletterForm.reset();
  });
}

/* ── Helpers ──────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return str; }
}

/* ── Schema.org dynamic injection ────────── */
function injectItemListSchema() {
  if (allTools.length === 0) return;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Free Online Tools',
    'description': 'A collection of free online tools including calculators, generators, and converters.',
    'numberOfItems': allTools.length,
    'itemListElement': allTools.map((t, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': t.name,
      'url': window.location.origin + window.location.pathname.replace(/\/?$/, '/') + t.url,
      'description': t.description || ''
    }))
  };
  const el = document.getElementById('schema-itemlist');
  if (el) el.textContent = JSON.stringify(schema);
}

// Inject after data loads
document.addEventListener('DOMContentLoaded', () => {
  // Give init() a moment to complete
  setTimeout(injectItemListSchema, 500);
});
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
