/* ============================================================
   MULTI TOOLS BLOG – script.js
   Vanilla JS | No Dependencies | Accessible | Performant
   ============================================================ */

'use strict';

/* ── Article data (searchable index) ───────────────────────── */
const ARTICLES = [
  {
    title: "How to Create a Strong Password That You'll Actually Remember",
    excerpt: "Learn the science behind strong passwords and discover mnemonic techniques that make security simple without sacrificing strength.",
    category: "Password Security",
    url: "how-to-create-strong-password/",
    date: "Jul 15, 2025",
    readTime: "8 min"
  },
  {
    title: "The Complete Guide to QR Codes: Generate, Track & Optimize",
    excerpt: "Everything you need to know about QR codes—from generating them for free to tracking scans and optimizing for conversion.",
    category: "QR Codes",
    url: "complete-guide-qr-codes/",
    date: "Jul 10, 2025",
    readTime: "11 min"
  },
  {
    title: "10 SEO Tools Every Content Creator Needs in 2025",
    excerpt: "A curated toolkit of the best free SEO tools to help you research keywords, audit your site and outrank your competitors.",
    category: "SEO",
    url: "seo-tools-content-creators/",
    date: "Jul 05, 2025",
    readTime: "7 min"
  },
  {
    title: "Base64 Encode & Decode: A Developer's Complete Reference",
    excerpt: "Master Base64 encoding and decoding with practical examples, use cases, and our free browser-based converter tool.",
    category: "Developer",
    url: "base64-encode-decode-guide/",
    date: "Jul 22, 2025",
    readTime: "6 min"
  },
  {
    title: "How to Compress Images Without Losing Quality",
    excerpt: "Reduce your image file sizes by up to 80% while keeping them crisp. Learn which format to use and when.",
    category: "Image Tools",
    url: "compress-images-without-losing-quality/",
    date: "Jul 19, 2025",
    readTime: "5 min"
  },
  {
    title: "The Pomodoro Technique: Boost Focus With a Simple Timer",
    excerpt: "Discover how 25-minute work blocks and strategic breaks can double your daily output with zero extra effort.",
    category: "Productivity",
    url: "pomodoro-technique-guide/",
    date: "Jul 17, 2025",
    readTime: "4 min"
  },
  {
    title: "How to Merge PDF Files for Free (No Software Needed)",
    excerpt: "Step-by-step guide to combining multiple PDFs into one file using only your browser—no downloads, no accounts.",
    category: "PDF Tools",
    url: "how-to-merge-pdf-files-free/",
    date: "Jul 14, 2025",
    readTime: "5 min"
  },
  {
    title: "Word Count, Character Count & Reading Time: The Ultimate Guide",
    excerpt: "Everything you need to know about measuring text—from academic word limits to optimizing blog post length for SEO.",
    category: "Text Tools",
    url: "word-count-character-count-guide/",
    date: "Jul 12, 2025",
    readTime: "7 min"
  },
  {
    title: "BMI Calculator Explained: What Your Number Really Means",
    excerpt: "A plain-language breakdown of Body Mass Index—what it measures, where it falls short, and healthier metrics to track.",
    category: "Calculators",
    url: "bmi-calculator-explained/",
    date: "Jul 08, 2025",
    readTime: "6 min"
  },
  {
    title: "How to Generate a Secure Wi-Fi QR Code for Your Home or Office",
    excerpt: "Share your Wi-Fi password without ever saying it aloud. Create a scannable QR code in seconds with our free tool.",
    category: "QR Codes",
    url: "wifi-qr-code-generator-guide/",
    date: "Jul 03, 2025",
    readTime: "4 min"
  },
  {
    title: "URL Encoder & Decoder: What It Is and When You Need It",
    excerpt: "Learn why special characters break URLs, how percent-encoding works, and how to use our free URL encoder tool instantly.",
    category: "Developer",
    url: "url-encoder-decoder-guide/",
    date: "Jun 28, 2025",
    readTime: "5 min"
  },
  {
    title: "Password Manager vs Password Generator: Which Do You Need?",
    excerpt: "A clear-headed comparison of password managers and generators—what each does, what it doesn't, and how to use both together.",
    category: "Password Security",
    url: "password-manager-vs-generator/",
    date: "Jun 25, 2025",
    readTime: "9 min"
  }
];

/* Extra articles for "Load More" */
const EXTRA_ARTICLES = [
  {
    title: "How to Generate a Secure Wi-Fi QR Code for Your Home or Office",
    excerpt: "Share your Wi-Fi password without saying it aloud. Create a scannable QR code in seconds.",
    category: "QR Codes",
    categoryClass: "card-category--qr",
    categoryUrl: "category/qr-codes/",
    url: "wifi-qr-code-generator-guide/",
    date: "2025-07-03",
    dateFormatted: "Jul 03, 2025",
    readTime: "4 min",
    bgClass: "ac-image",
    icon: "📲"
  },
  {
    title: "URL Encoder & Decoder: What It Is and When You Need It",
    excerpt: "Learn why special characters break URLs, how percent-encoding works, and how to use our free URL encoder instantly.",
    category: "Developer",
    categoryClass: "card-category--dev",
    categoryUrl: "category/developer/",
    url: "url-encoder-decoder-guide/",
    date: "2025-06-28",
    dateFormatted: "Jun 28, 2025",
    readTime: "5 min",
    bgClass: "ac-dev",
    icon: "💻"
  },
  {
    title: "Password Manager vs Password Generator: Which Do You Need?",
    excerpt: "A clear-headed comparison of password managers and generators—and how to use both together for maximum security.",
    category: "Password Security",
    categoryClass: "card-category--security",
    categoryUrl: "category/password-security/",
    url: "password-manager-vs-generator/",
    date: "2025-06-25",
    dateFormatted: "Jun 25, 2025",
    readTime: "9 min",
    bgClass: "ac-pdf",
    icon: "🔐"
  }
];

/* ── DOM Ready ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initHeroSearch();
  initSearchOverlay();
  initFAQ();
  initNewsletter();
  initLoadMore();
  initScrollReveal();
  initBackToTop();
  setCurrentYear();
});

/* ═══════════════════════════════════════════════════════════
   HEADER – sticky scroll + mobile menu
═══════════════════════════════════════════════════════════ */
function initHeader() {
  const header     = document.getElementById('siteHeader');
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!header) return;

  /* Sticky scroll class */
  const onScroll = throttle(() => {
    header.classList.toggle('scrolled', window.scrollY > 20);
    updateBackToTop();
  }, 50);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu toggle */
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      mobileMenu.classList.toggle('open', open);
      mobileMenu.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    /* Close on link click */
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    /* Close on outside click */
    document.addEventListener('click', e => {
      if (!header.contains(e.target)) closeMobileMenu();
    });

    /* Close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  function closeMobileMenu() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

/* ═══════════════════════════════════════════════════════════
   SEARCH OVERLAY
═══════════════════════════════════════════════════════════ */
function initSearchOverlay() {
  const overlay    = document.getElementById('searchOverlay');
  const toggleBtn  = document.getElementById('searchToggle');
  const closeBtn   = document.getElementById('searchClose');
  const input      = document.getElementById('overlaySearchInput');
  const results    = document.getElementById('searchResults');

  if (!overlay || !toggleBtn) return;

  function openOverlay() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input && input.focus(), 50);
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (input) { input.value = ''; }
    if (results) { results.innerHTML = ''; }
    toggleBtn.focus();
  }

  toggleBtn.addEventListener('click', openOverlay);
  if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeOverlay();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
  });

  /* Search logic */
  if (input && results) {
    input.addEventListener('input', debounce(() => {
      const q = input.value.trim().toLowerCase();
      renderSearchResults(q, results);
    }, 200));
  }
}

function renderSearchResults(query, container) {
  if (!query || query.length < 2) {
    container.innerHTML = '';
    return;
  }

  const matches = ARTICLES.filter(a =>
    a.title.toLowerCase().includes(query) ||
    a.excerpt.toLowerCase().includes(query) ||
    a.category.toLowerCase().includes(query)
  ).slice(0, 6);

  if (!matches.length) {
    container.innerHTML = `<div class="search-no-results">No articles found for "<strong>${escapeHTML(query)}</strong>"</div>`;
    return;
  }

  container.innerHTML = matches.map(a => `
    <a href="${a.url}" class="search-result-item">
      <div class="search-result-item__category">${escapeHTML(a.category)}</div>
      <div class="search-result-item__title">${highlightMatch(a.title, query)}</div>
      <div class="search-result-item__excerpt">${escapeHTML(a.excerpt)}</div>
    </a>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════
   HERO SEARCH – inline search with article filtering
═══════════════════════════════════════════════════════════ */
function initHeroSearch() {
  const input       = document.getElementById('heroSearchInput');
  const resultsBox  = document.getElementById('heroSearchResults');
  const articlesGrid = document.getElementById('articlesGrid');
  const noResults   = document.getElementById('noResults');
  const loadMoreWrapper = document.getElementById('loadMoreWrapper');

  if (!input) return;

  let lastQuery = '';

  const onSearch = debounce(() => {
    const q = input.value.trim().toLowerCase();
    if (q === lastQuery) return;
    lastQuery = q;

    if (q.length < 2) {
      /* Reset */
      if (resultsBox) resultsBox.innerHTML = '';
      resetArticleGrid();
      return;
    }

    /* Show dropdown suggestions */
    if (resultsBox) {
      const matches = ARTICLES.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      ).slice(0, 5);

      if (matches.length) {
        resultsBox.innerHTML = matches.map(a => `
          <a href="${a.url}" class="search-result-item">
            <div class="search-result-item__category">${escapeHTML(a.category)}</div>
            <div class="search-result-item__title">${highlightMatch(a.title, q)}</div>
          </a>
        `).join('');
      } else {
        resultsBox.innerHTML = `<div class="search-no-results">No results for "<strong>${escapeHTML(q)}</strong>"</div>`;
      }
    }

    /* Filter article cards */
    filterArticleCards(q, articlesGrid, noResults, loadMoreWrapper);
  }, 200);

  input.addEventListener('input', onSearch);

  /* Search button click */
  const btn = input.closest('.hero__search-box') && input.closest('.hero__search-box').querySelector('.hero__search-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length >= 2) filterArticleCards(q, articlesGrid, noResults, loadMoreWrapper);
    });
  }

  /* Enter key */
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = input.value.trim().toLowerCase();
      if (q.length >= 2) {
        if (resultsBox) resultsBox.innerHTML = '';
        filterArticleCards(q, articlesGrid, noResults, loadMoreWrapper);
        articlesGrid && articlesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    if (e.key === 'Escape') {
      if (resultsBox) resultsBox.innerHTML = '';
      resetArticleGrid();
      input.value = '';
      lastQuery = '';
    }
  });

  /* Close dropdown on outside click */
  document.addEventListener('click', e => {
    if (resultsBox && !input.closest('.hero__search').contains(e.target)) {
      resultsBox.innerHTML = '';
    }
  });
}

function filterArticleCards(query, grid, noResultsEl, loadMoreEl) {
  if (!grid) return;
  const cards = grid.querySelectorAll('.article-card');
  let visible = 0;

  cards.forEach(card => {
    const title   = (card.dataset.title   || card.querySelector('.card-title')?.textContent || '').toLowerCase();
    const cat     = (card.dataset.category || '').toLowerCase();
    const excerpt = (card.dataset.excerpt  || card.querySelector('.card-excerpt')?.textContent || '').toLowerCase();

    const match = title.includes(query) || cat.includes(query) || excerpt.includes(query);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });

  if (noResultsEl) noResultsEl.hidden = visible > 0;
  if (loadMoreEl)  loadMoreEl.hidden  = query.length >= 2;
}

function resetArticleGrid() {
  const grid = document.getElementById('articlesGrid');
  const noResults = document.getElementById('noResults');
  const loadMoreWrapper = document.getElementById('loadMoreWrapper');

  if (grid) {
    grid.querySelectorAll('.article-card').forEach(c => (c.style.display = ''));
  }
  if (noResults) noResults.hidden = true;
  if (loadMoreWrapper) loadMoreWrapper.hidden = false;
}

/* ═══════════════════════════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════════════════════════ */
function initFAQ() {
  const questions = document.querySelectorAll('.faq-question');

  questions.forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen   = btn.getAttribute('aria-expanded') === 'true';
      const answerId = btn.getAttribute('aria-controls');
      const answer   = document.getElementById(answerId);

      /* Close all others */
      questions.forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          const otherAnswerId = other.getAttribute('aria-controls');
          const otherAnswer   = document.getElementById(otherAnswerId);
          if (otherAnswer) otherAnswer.hidden = true;
        }
      });

      /* Toggle current */
      const newOpen = !isOpen;
      btn.setAttribute('aria-expanded', newOpen);
      if (answer) answer.hidden = !newOpen;
    });
  });

  /* Keyboard: Space and Enter already work on buttons natively */
}

/* ═══════════════════════════════════════════════════════════
   NEWSLETTER FORM
═══════════════════════════════════════════════════════════ */
function initNewsletter() {
  const form    = document.getElementById('newsletterForm');
  const input   = document.getElementById('newsletterEmail');
  const success = document.getElementById('newsletterSuccess');
  const error   = document.getElementById('newsletterError');

  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    if (error)   error.hidden   = true;
    if (success) success.hidden = true;

    const email = input ? input.value.trim() : '';

    if (!isValidEmail(email)) {
      if (error) {
        error.hidden = false;
        error.focus();
      }
      return;
    }

    /* Simulate async submission */
    const btn = form.querySelector('.newsletter__btn');
    if (btn) {
      btn.textContent = 'Subscribing…';
      btn.disabled = true;
    }

    setTimeout(() => {
      if (success) {
        success.hidden = false;
        success.focus();
      }
      if (input) input.value = '';
      if (btn) {
        btn.textContent = 'Subscribe Free';
        btn.disabled = false;
      }
    }, 900);
  });
}

/* ═══════════════════════════════════════════════════════════
   LOAD MORE
═══════════════════════════════════════════════════════════ */
function initLoadMore() {
  const btn  = document.getElementById('loadMoreBtn');
  const grid = document.getElementById('articlesGrid');

  if (!btn || !grid) return;

  let loaded = false;

  btn.addEventListener('click', () => {
    if (loaded) return;
    loaded = true;

    /* Show loading state */
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Loading…';

    setTimeout(() => {
      EXTRA_ARTICLES.forEach((a, i) => {
        const card = createArticleCard(a);
        card.classList.add('reveal');
        if (i === 1) card.classList.add('reveal--delay-1');
        if (i === 2) card.classList.add('reveal--delay-2');
        grid.appendChild(card);
      });

      /* Hide load more button */
      const wrapper = document.getElementById('loadMoreWrapper');
      if (wrapper) wrapper.hidden = true;

      /* Reveal new cards */
      requestAnimationFrame(() => {
        grid.querySelectorAll('.reveal:not(.revealed)').forEach(el => {
          observeReveal(el);
        });
      });
    }, 600);
  });
}

function createArticleCard(a) {
  const article = document.createElement('article');
  article.className = 'article-card';
  article.setAttribute('role', 'listitem');
  article.dataset.category = a.category;
  article.dataset.title    = a.title;
  article.dataset.excerpt  = a.excerpt;

  article.innerHTML = `
    <a href="${a.url}" class="article-card__image-link" tabindex="-1" aria-hidden="true">
      <div class="article-card__image ${a.bgClass}" role="img" aria-label="${escapeHTML(a.category)} illustration">
        <div class="ac-icon" aria-hidden="true">${a.icon}</div>
      </div>
    </a>
    <div class="article-card__body">
      <div class="card-meta">
        <a href="${a.categoryUrl}" class="card-category ${a.categoryClass}">${escapeHTML(a.category)}</a>
        <time class="card-date" datetime="${a.date}">${a.dateFormatted}</time>
      </div>
      <h3 class="card-title">
        <a href="${a.url}">${escapeHTML(a.title)}</a>
      </h3>
      <p class="card-excerpt">${escapeHTML(a.excerpt)}</p>
      <div class="card-footer">
        <span class="card-reading-time">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${a.readTime} read
        </span>
        <a href="${a.url}" class="card-link">Read →</a>
      </div>
    </div>
  `;

  return article;
}

/* ═══════════════════════════════════════════════════════════
   SCROLL REVEAL (Intersection Observer)
═══════════════════════════════════════════════════════════ */
function initScrollReveal() {
  /* Add reveal classes to key sections */
  const targets = [
    '.featured-card',
    '.article-card',
    '.category-card',
    '.faq-item',
    '.newsletter-card',
    '.section-header',
    '.hero__stats'
  ];

  targets.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      /* Stagger siblings */
      if (i % 3 === 1) el.classList.add('reveal--delay-1');
      if (i % 3 === 2) el.classList.add('reveal--delay-2');
      observeReveal(el);
    });
  });
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

function observeReveal(el) {
  revealObserver.observe(el);
}

/* ═══════════════════════════════════════════════════════════
   BACK TO TOP
═══════════════════════════════════════════════════════════ */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const firstFocusable = document.querySelector('.site-header a, .site-header button');
      if (firstFocusable) firstFocusable.focus();
    }, 400);
  });
}

function updateBackToTop() {
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
}

/* ═══════════════════════════════════════════════════════════
   CURRENT YEAR
═══════════════════════════════════════════════════════════ */
function setCurrentYear() {
  const el = document.getElementById('currentYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */

/** Debounce: delay execution until activity stops */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Throttle: limit execution rate */
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/** Basic email validation */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Escape HTML special chars to prevent XSS */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Highlight query match within text */
function highlightMatch(text, query) {
  const safe = escapeHTML(text);
  const safeQuery = escapeHTML(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(`(${safeQuery})`, 'gi'), '<mark style="background:rgba(99,102,241,0.3);color:inherit;border-radius:2px;">$1</mark>');
}

/* ═══════════════════════════════════════════════════════════
   PERFORMANCE – Lazy loading polyfill for older browsers
═══════════════════════════════════════════════════════════ */
(function lazyLoadPolyfill() {
  if ('loading' in HTMLImageElement.prototype) return; /* Native support */
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  if (!imgs.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });
  imgs.forEach(img => observer.observe(img));
})();

/* ═══════════════════════════════════════════════════════════
   SMOOTH ANCHOR NAV (keyboard & pointer)
═══════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
  });
});
