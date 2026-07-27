/**
 * Multi Tools — Homepage Script
 * Pure Vanilla JavaScript, No Frameworks
 * Version: 1.0.0
 */

'use strict';

/* ================================================================
   GLOBAL STATE
   ================================================================ */
const State = {
  tools: [],
  blogs: [],
  categories: {},
  searchQuery: '',
  featuredLimit: 6,
  toolsLimit: 9,
  blogsLimit: 6,
};

/* ================================================================
   SVG ICON LIBRARY
   ================================================================ */
const Icons = {
  shield:     `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l6 2.67V11c0 3.61-2.44 7.01-6 8.24-3.56-1.23-6-4.63-6-8.24V7.67L12 5zm-1 4v4h2V9h-2zm0 6v2h2v-2h-2z"/></svg>`,
  qr:         `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 6h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v8h-2v-8zm2 4h2v2h-2v-2zm2-8h2v2h-2v-2zm0 8h2v2h-2v-2z"/></svg>`,
  heart:      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  calculator: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3h2v2h-2V6zm0 4h2v2h-2v-2zm-4-4h2v2H8V6zm0 4h2v2H8v-2zm-1 6l1-2 1 2H7zm4 0l1-2 1 2h-2zm4 0l1-2 1 2h-2zM16 10h-2V8h2v2zm0-4h-2V4h2v2z"/></svg>`,
  calendar:   `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`,
  spin:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`,
  text:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>`,
  code:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
  link:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
  palette:    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5S18.33 12 17.5 12z"/></svg>`,
  image:      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
  convert:    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>`,
  currency:   `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`,
  seo:        `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
  note:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 18h12v-2H3v2zm0-5h12v-2H3v2zm0-7v2h12V6H3zm14 9.59V13h-2v5.59l3.71 3.7 1.41-1.41L17 14.59z"/></svg>`,
  clock:      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>`,
  logo:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 9.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  arrow:      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.58L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.42z"/></svg>`,
  arrowUp:    `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
  chevDown:   `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
  search:     `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
  close:      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  moon:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>`,
  sun:        `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`,
  menu:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
  blog:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`,
  mail:       `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
};

/* ================================================================
   ICON EMOJI MAP — for category icons
   ================================================================ */
const CategoryEmoji = {
  'Calculators':    '🧮',
  'Converters':     '🔄',
  'Generators':     '⚡',
  'Developer Tools':'💻',
  'SEO Tools':      '🔍',
  'Image Tools':    '🖼️',
  'Text Tools':     '📝',
  'Productivity':   '⏱️',
  'Finance':        '💰',
  'Health':         '❤️',
  'Random Tools':   '🎲',
  'Security':       '🛡️',
  'Design Tools':   '🎨',
};

/* ================================================================
   DATA LOADING
   ================================================================ */
async function loadData() {
  try {
    const [toolsRes, blogsRes] = await Promise.all([
      fetch('tools.json'),
      fetch('blogs.json'),
    ]);
    State.tools = await toolsRes.json();
    State.blogs = await blogsRes.json();
    buildCategories();
    renderAll();
  } catch (e) {
    console.error('Failed to load data:', e);
    renderErrorState();
  }
}

function buildCategories() {
  State.categories = {};
  State.tools.forEach(tool => {
    const cat = tool.category || 'Other';
    State.categories[cat] = (State.categories[cat] || 0) + 1;
  });
}

function renderAll() {
  renderStatistics();
  renderCategories();
  renderFeaturedTools();
  renderLatestTools();
  renderLatestBlogs();
  updateHeroStats();
  initReveal();
}

/* ================================================================
   STATISTICS
   ================================================================ */
function renderStatistics() {
  const totalTools = State.tools.length;
  const totalBlogs = State.blogs.length;
  const totalCats  = Object.keys(State.categories).length;
  const totalUsers = '500K+'; // static marketing figure

  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__num" data-target="${totalTools}">${totalTools}+</div>
      <div class="stat-card__label">Free Online Tools</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num">${totalCats}</div>
      <div class="stat-card__label">Tool Categories</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num" data-target="${totalBlogs}">${totalBlogs}+</div>
      <div class="stat-card__label">Blog Articles</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num">${totalUsers}</div>
      <div class="stat-card__label">Monthly Users</div>
    </div>
  `;
}

function updateHeroStats() {
  const el = document.getElementById('hero-tools-count');
  if (el) el.textContent = State.tools.length + '+';
  const el2 = document.getElementById('hero-cats-count');
  if (el2) el2.textContent = Object.keys(State.categories).length;
}

/* ================================================================
   CATEGORIES
   ================================================================ */
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;

  const sorted = Object.entries(State.categories).sort((a, b) => b[1] - a[1]);

  grid.innerHTML = sorted.map(([cat, count]) => `
    <a href="javascript:void(0)" class="category-card reveal" onclick="filterByCategory('${escHtml(cat)}')" aria-label="${escHtml(cat)}">
      <div class="category-card__icon">${CategoryEmoji[cat] || '🔧'}</div>
      <div class="category-card__name">${escHtml(cat)}</div>
      <div class="category-card__count">${count} tool${count !== 1 ? 's' : ''}</div>
    </a>
  `).join('');
}

/* ================================================================
   FEATURED TOOLS
   ================================================================ */
function renderFeaturedTools() {
  const grid = document.getElementById('featured-tools-grid');
  if (!grid) return;

  const featured = State.tools.filter(t => t.featured).slice(0, State.featuredLimit);
  grid.innerHTML = featured.map((tool, i) => buildToolCard(tool, i)).join('');
}

/* ================================================================
   LATEST TOOLS
   ================================================================ */
function renderLatestTools(filter = null) {
  const grid = document.getElementById('latest-tools-grid');
  if (!grid) return;

  let tools = filter
    ? State.tools.filter(t => t.category === filter)
    : State.tools;

  tools = tools.slice(0, State.toolsLimit);
  grid.innerHTML = tools.map((tool, i) => buildToolCard(tool, i)).join('');

  const moreBtn = document.getElementById('load-more-tools');
  if (moreBtn) {
    moreBtn.style.display = State.tools.length > State.toolsLimit ? 'inline-flex' : 'none';
  }
}

function loadMoreTools() {
  State.toolsLimit += 9;
  renderLatestTools();
  initReveal();
}

/* ================================================================
   LATEST BLOGS
   ================================================================ */
function renderLatestBlogs() {
  const grid = document.getElementById('blogs-grid');
  if (!grid) return;

  const blogs = State.blogs.slice(0, State.blogsLimit);
  grid.innerHTML = blogs.map((blog, i) => buildBlogCard(blog, i)).join('');

  const moreBtn = document.getElementById('load-more-blogs');
  if (moreBtn) {
    moreBtn.style.display = State.blogs.length > State.blogsLimit ? 'inline-flex' : 'none';
  }
}

function loadMoreBlogs() {
  State.blogsLimit += 6;
  renderLatestBlogs();
  initReveal();
}

/* ================================================================
   CARD BUILDERS
   ================================================================ */
function buildToolCard(tool, index) {
  const iconSvg = Icons[tool.icon] || Icons.code;
  const delay = `reveal-delay-${(index % 3) + 1}`;
  const badges = [
    tool.featured ? '<span class="badge badge--featured">⭐ Featured</span>' : '',
    tool.new      ? '<span class="badge badge--new">✦ New</span>' : '',
  ].filter(Boolean).join('');

  return `
    <a href="${escHtml(tool.url)}" class="tool-card reveal ${delay}" aria-label="${escHtml(tool.name)}">
      <div class="tool-card__arrow">${Icons.arrow}</div>
      ${badges ? `<div class="tool-card__badges">${badges}</div>` : ''}
      <div class="tool-card__icon">${iconSvg}</div>
      <h3 class="tool-card__name">${escHtml(tool.name)}</h3>
      <p class="tool-card__desc">${escHtml(tool.description)}</p>
      <span class="tool-card__category">${escHtml(tool.category)}</span>
    </a>
  `;
}

function buildBlogCard(blog, index) {
  const delay = `reveal-delay-${(index % 3) + 1}`;
  const dateStr = formatDate(blog.date);
  const imgContent = blog.image
    ? `<img src="${escHtml(blog.image)}" alt="${escHtml(blog.title)}" loading="lazy" width="400" height="180">`
    : `<div class="blog-card__img-placeholder">📰</div>`;

  return `
    <a href="${escHtml(blog.url)}" class="blog-card reveal ${delay}" aria-label="${escHtml(blog.title)}">
      <div class="blog-card__img">${imgContent}</div>
      <div class="blog-card__body">
        <div class="blog-card__meta">
          <span class="blog-card__cat">${escHtml(blog.category)}</span>
          <span class="blog-card__dot"></span>
          <span class="blog-card__time">${escHtml(blog.readingTime)}</span>
          <span class="blog-card__dot"></span>
          <span class="blog-card__date">${dateStr}</span>
        </div>
        <h3 class="blog-card__title">${escHtml(blog.title)}</h3>
        <p class="blog-card__desc">${escHtml(blog.description)}</p>
        <span class="blog-card__read-more">Read Article ${Icons.arrow}</span>
      </div>
    </a>
  `;
}

/* ================================================================
   SEARCH
   ================================================================ */
function initSearch() {
  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const clearBtn= document.getElementById('search-clear');

  if (!input || !results) return;

  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      State.searchQuery = q;
      if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
      if (q.length < 2) {
        results.classList.remove('active');
        return;
      }
      const matches = runSearch(q);
      renderSearchResults(matches, results);
      results.classList.add('active');
    }, 180);
  });

  clearBtn && clearBtn.addEventListener('click', () => {
    input.value = '';
    State.searchQuery = '';
    results.classList.remove('active');
    clearBtn.style.display = 'none';
    input.focus();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-box')) {
      results.classList.remove('active');
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      results.classList.remove('active');
      input.blur();
    }
  });
}

function runSearch(q) {
  const toolMatches = State.tools.filter(t => {
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  }).slice(0, 6);

  const blogMatches = State.blogs.filter(b => {
    return (
      b.title.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  }).slice(0, 3);

  return { tools: toolMatches, blogs: blogMatches };
}

function renderSearchResults({ tools, blogs }, container) {
  if (!tools.length && !blogs.length) {
    container.innerHTML = `<div class="search-results__empty">No results found for "<strong>${escHtml(State.searchQuery)}</strong>"</div>`;
    return;
  }

  let html = '';

  if (tools.length) {
    html += `<div class="search-results__group">
      <div class="search-results__group-label">🔧 Tools</div>
      ${tools.map(t => `
        <a href="${escHtml(t.url)}" class="search-result-item">
          <div class="search-result-item__icon">${CategoryEmoji[t.category] || '🔧'}</div>
          <div class="search-result-item__body">
            <div class="search-result-item__name">${highlight(t.name, State.searchQuery)}</div>
            <div class="search-result-item__meta">${escHtml(t.category)}</div>
          </div>
        </a>
      `).join('')}
    </div>`;
  }

  if (blogs.length) {
    html += `<div class="search-results__group">
      <div class="search-results__group-label">📰 Blog</div>
      ${blogs.map(b => `
        <a href="${escHtml(b.url)}" class="search-result-item">
          <div class="search-result-item__icon">📰</div>
          <div class="search-result-item__body">
            <div class="search-result-item__name">${highlight(b.title, State.searchQuery)}</div>
            <div class="search-result-item__meta">${escHtml(b.category)} · ${escHtml(b.readingTime)}</div>
          </div>
        </a>
      `).join('')}
    </div>`;
  }

  container.innerHTML = html;
}

function filterByCategory(cat) {
  document.getElementById('latest-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => renderLatestTools(cat), 300);
}

function triggerSearch(term) {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.value = term;
  input.dispatchEvent(new Event('input'));
  document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => input.focus(), 350);
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function initNav() {
  const nav    = document.getElementById('main-nav');
  const toggle = document.getElementById('nav-toggle');
  const mobile = document.getElementById('nav-mobile');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 20);
    toggleBackToTop();
  }, { passive: true });

  // Hamburger
  toggle && toggle.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  mobile && mobile.addEventListener('click', e => {
    if (e.target.tagName === 'A') mobile.classList.remove('open');
  });

  // Active link highlight
  const links = document.querySelectorAll('.nav__links a, .nav__mobile a');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Nav search open
  document.getElementById('nav-search-btn')?.addEventListener('click', () => {
    document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('search-input')?.focus(), 400);
  });
}

/* ================================================================
   DARK / LIGHT MODE
   ================================================================ */
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('mt_theme') || 'dark';
  applyTheme(saved);

  btn && btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('mt_theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

/* ================================================================
   FAQ ACCORDION
   ================================================================ */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q && q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ================================================================
   NEWSLETTER
   ================================================================ */
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]')?.value.trim();
    if (!email) return;
    const success = document.getElementById('newsletter-success');
    form.style.display = 'none';
    if (success) success.style.display = 'block';
    showToast('Thanks for subscribing! 🎉');
  });
}

/* ================================================================
   BACK TO TOP
   ================================================================ */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function toggleBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
}

/* ================================================================
   REVEAL ON SCROLL (Intersection Observer)
   ================================================================ */
function initReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

/* ================================================================
   TOAST
   ================================================================ */
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ================================================================
   COUNTER ANIMATION
   ================================================================ */
function initCounters() {
  const nums = document.querySelectorAll('[data-target]');
  if (!nums.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  nums.forEach(el => obs.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1500;
  const start = performance.now();
  const update = now => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + '+';
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ================================================================
   ERROR STATE
   ================================================================ */
function renderErrorState() {
  const msg = '<p style="text-align:center;color:var(--clr-text-2);padding:40px">Could not load tools. Please refresh the page.</p>';
  ['featured-tools-grid','latest-tools-grid','categories-grid','blogs-grid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = msg;
  });
}

/* ================================================================
   HELPERS
   ================================================================ */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, query) {
  if (!query) return escHtml(text);
  const safe = escHtml(text);
  const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(safeQ, 'gi'), m => `<mark style="background:rgba(109,40,217,0.25);color:inherit;border-radius:2px">${m}</mark>`);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initSearch();
  initFAQ();
  initNewsletter();
  initBackToTop();
  loadData().then(() => {
    initCounters();
  });
});
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
