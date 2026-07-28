#!/usr/bin/env node
/**
 * =============================================================================
 * scripts/generate-homepage.js
 * -----------------------------------------------------------------------------
 * Multi Tools — Automatic Homepage Generator
 *
 * Scans the repository root for "tool" directories and the Blog directory for
 * "blog article" directories, then regenerates the Tool Cards and Blog Cards
 * sections inside index.html without touching anything else in the file.
 *
 * Design goals:
 *   - Zero external dependencies (Node.js built-ins only)
 *   - Never crash: every filesystem operation is guarded
 *   - Idempotent: re-running produces the same output for the same repo state
 *   - GitHub Pages safe: only relative URLs are emitted
 *   - Self-healing: deleted tools/posts automatically disappear from the page
 *
 * Usage:
 *   node scripts/generate-homepage.js
 * =============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/* =============================================================================
 * CONFIGURATION
 * ========================================================================== */

const CONFIG = {
  // Repository root is assumed to be the current working directory when the
  // script is invoked from a GitHub Actions workflow (actions/checkout).
  ROOT_DIR: process.cwd(),

  INDEX_FILE: 'index.html',

  // Both casings are supported for the blog directory.
  BLOG_DIR_CANDIDATES: ['Blog', 'blog'],

  TOOLS_CONTAINER_ID: 'tools-container',
  BLOG_CONTAINER_ID: 'blog-container',

  // Directories / files at the repository root that must never be treated as
  // tools, even if they happen to contain an index.html file.
  EXCLUDED_ROOT_ENTRIES: new Set([
    '.github',
    '.git',
    'node_modules',
    'assets',
    'images',
    'img',
    'css',
    'js',
    'scripts',
    'fonts',
    'icons',
    'blog',
    'Blog',
    'README.md',
    'LICENSE',
    'package.json',
    'package-lock.json',
    '.githubignore',
    '.gitignore',
  ]),

  EMPTY_TOOLS_MESSAGE: 'No tools available yet.',
  EMPTY_BLOG_MESSAGE: 'No blog articles available yet.',
};

/* =============================================================================
 * LOGGING HELPERS
 * ========================================================================== */

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  section: (title) => console.log(`\n=== ${title} ===`),
};

/* =============================================================================
 * SAFE FILESYSTEM HELPERS
 * ========================================================================== */

/**
 * Safely reads the contents of a directory.
 * Returns an empty array (and logs a warning) instead of throwing.
 */
function safeReadDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    log.warn(`Could not read directory "${dirPath}": ${err.message}`);
    return [];
  }
}

/**
 * Safely reads a text file. Returns null (and logs a warning) on failure.
 */
function safeReadFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    log.warn(`Could not read file "${filePath}": ${err.message}`);
    return null;
  }
}

/**
 * Safely writes a text file. Returns true/false indicating success.
 */
function safeWriteFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (err) {
    log.error(`Could not write file "${filePath}": ${err.message}`);
    return false;
  }
}

/**
 * Safely reads basic stats for a path (used to detect file mtime for
 * "newest first" blog sorting when no explicit metadata is present).
 */
function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

/* =============================================================================
 * TEXT / SLUG UTILITIES
 * ========================================================================== */

/**
 * Converts a directory slug such as "password-generator" or "ai_prompt_token
 * -estimator" into a human readable title: "Password Generator",
 * "Ai Prompt Token Estimator" -> then fixes common acronyms (AI, QR, PDF...).
 */
function slugToTitle(slug) {
  const KNOWN_ACRONYMS = new Set(['ai', 'qr', 'pdf', 'seo', 'url', 'api', 'bmi', 'css', 'html', 'js']);

  const words = slug
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const titled = words.map((word) => {
    const lower = word.toLowerCase();
    if (KNOWN_ACRONYMS.has(lower)) return lower.toUpperCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return titled.join(' ') || 'Untitled';
}

/**
 * Escapes text for safe embedding inside HTML attribute/content contexts.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a relative, GitHub Pages safe href for a root-level tool folder.
 */
function buildToolHref(folderName) {
  return `${folderName}/`;
}

/**
 * Builds a relative, GitHub Pages safe href for a blog article folder.
 */
function buildBlogHref(blogDirName, articleFolderName) {
  return `${blogDirName}/${articleFolderName}/`;
}

/* =============================================================================
 * AUTO DESCRIPTION GENERATOR
 * ========================================================================== */

/**
 * Maps recognizable keywords in a tool's slug to a short, natural sentence
 * describing what the tool does. Falls back to a generic description when no
 * keyword matches.
 */
const DESCRIPTION_RULES = [
  { test: /password/i, text: 'Generate strong, secure passwords instantly.' },
  { test: /qr/i, text: 'Create custom QR codes in seconds.' },
  { test: /spin.*wheel|wheel/i, text: 'Spin the wheel to make quick random decisions.' },
  { test: /bmi/i, text: 'Calculate your Body Mass Index quickly and accurately.' },
  { test: /scientific.*calculator|calculator/i, text: 'Perform advanced calculations with ease.' },
  { test: /token.*estimator|prompt.*token/i, text: 'Estimate AI prompt token usage before you run it.' },
  { test: /ai/i, text: 'Boost your workflow with this AI-powered tool.' },
  { test: /random/i, text: 'Generate random results instantly.' },
  { test: /convert|converter/i, text: 'Convert files and values quickly and easily.' },
  { test: /image|img|photo/i, text: 'Edit and process images effortlessly.' },
  { test: /text/i, text: 'Analyze and manipulate text with ease.' },
  { test: /pdf/i, text: 'Work with PDF files quickly and easily.' },
  { test: /finance|budget|loan|tax/i, text: 'Simplify your financial calculations.' },
  { test: /health|fitness/i, text: 'Track and improve your health metrics.' },
  { test: /developer|dev|code|json|regex/i, text: 'A handy utility built for developers.' },
];

function generateToolDescription(slug) {
  const rule = DESCRIPTION_RULES.find((r) => r.test.test(slug));
  if (rule) return rule.text;
  return `A free online ${slugToTitle(slug).toLowerCase()} tool.`;
}

/* =============================================================================
 * AUTO ICON ASSIGNMENT (INLINE SVG)
 * ========================================================================== */

const ICONS = {
  calculator: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>`,
  password: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="14"/><line x1="17" y1="17" x2="21" y2="17"/><line x1="17" y1="21" x2="21" y2="21"/></svg>`,
  ai: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
  random: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  developer: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  finance: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  health: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  text: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  pdf: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  converter: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  default: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>`,
};

const ICON_RULES = [
  { test: /password/i, icon: 'password' },
  { test: /qr/i, icon: 'qr' },
  { test: /random|spin.*wheel|wheel/i, icon: 'random' },
  { test: /calculator|bmi/i, icon: 'calculator' },
  { test: /ai/i, icon: 'ai' },
  { test: /developer|dev|code|json|regex/i, icon: 'developer' },
  { test: /finance|budget|loan|tax/i, icon: 'finance' },
  { test: /health|fitness/i, icon: 'health' },
  { test: /image|img|photo/i, icon: 'image' },
  { test: /text/i, icon: 'text' },
  { test: /pdf/i, icon: 'pdf' },
  { test: /convert|converter/i, icon: 'converter' },
];

function getIconForSlug(slug) {
  const rule = ICON_RULES.find((r) => r.test.test(slug));
  const key = rule ? rule.icon : 'default';
  return ICONS[key] || ICONS.default;
}

/* =============================================================================
 * TOOL DETECTION
 * ========================================================================== */

/**
 * Scans the repository root and returns a list of tool descriptors.
 * A directory qualifies as a tool when:
 *   - it is a direct child of the repository root
 *   - it is not in the excluded list
 *   - it does not start with a dot
 *   - it contains an index.html file
 */
function detectTools(rootDir) {
  const entries = safeReadDir(rootDir);
  const tools = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;

    if (name.startsWith('.')) continue;
    if (CONFIG.EXCLUDED_ROOT_ENTRIES.has(name)) continue;

    const toolDirPath = path.join(rootDir, name);
    const toolIndexPath = path.join(toolDirPath, 'index.html');

    if (!fs.existsSync(toolIndexPath)) continue;

    tools.push({
      slug: name,
      title: slugToTitle(name),
      description: generateToolDescription(name),
      href: buildToolHref(name),
      icon: getIconForSlug(name),
    });
  }

  // Alphabetical sort by title, per spec.
  tools.sort((a, b) => a.title.localeCompare(b.title));

  return tools;
}

/* =============================================================================
 * BLOG DETECTION
 * ========================================================================== */

/**
 * Attempts to pull lightweight metadata (title, description, category,
 * readingTime, date) out of a blog article's index.html via simple meta-tag
 * / comment scanning. Never throws; missing metadata simply falls back to
 * auto-generated values.
 *
 * Supported (all optional) embedded metadata formats inside the article's
 * index.html:
 *   <meta name="description" content="...">
 *   <meta name="category" content="...">
 *   <meta name="reading-time" content="5 min read">
 *   <meta name="date" content="2026-01-01">
 *   <title>...</title>
 */
function extractBlogMetadata(articleIndexPath) {
  const html = safeReadFile(articleIndexPath);
  const metadata = {};

  if (!html) return metadata;

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1].trim();

  const metaTagRegex = /<meta\s+[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
  let match;
  while ((match = metaTagRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();

    if (key === 'description') metadata.description = value;
    if (key === 'category') metadata.category = value;
    if (key === 'reading-time' || key === 'reading_time') metadata.readingTime = value;
    if (key === 'date') metadata.date = value;
  }

  return metadata;
}

/**
 * Scans the Blog/blog directory and returns a list of blog article
 * descriptors. Returns an empty array safely if no blog directory exists.
 */
function detectBlogPosts(rootDir) {
  let blogDirName = null;

  for (const candidate of CONFIG.BLOG_DIR_CANDIDATES) {
    if (fs.existsSync(path.join(rootDir, candidate))) {
      blogDirName = candidate;
      break;
    }
  }

  if (!blogDirName) {
    log.warn('No Blog/ or blog/ directory found. Skipping blog detection.');
    return [];
  }

  const blogDirPath = path.join(rootDir, blogDirName);
  const entries = safeReadDir(blogDirPath);
  const posts = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;
    if (name.startsWith('.')) continue;

    const articleDirPath = path.join(blogDirPath, name);
    const articleIndexPath = path.join(articleDirPath, 'index.html');

    if (!fs.existsSync(articleIndexPath)) continue;

    const metadata = extractBlogMetadata(articleIndexPath);
    const stats = safeStat(articleIndexPath);

    posts.push({
      slug: name,
      title: metadata.title || slugToTitle(name),
      description: metadata.description || `Read our latest article about ${slugToTitle(name).toLowerCase()}.`,
      category: metadata.category || 'General',
      readingTime: metadata.readingTime || '5 min read',
      date: metadata.date || null,
      mtimeMs: stats ? stats.mtimeMs : 0,
      href: buildBlogHref(blogDirName, name),
    });
  }

  // Sort newest first using explicit date metadata when available, falling
  // back to filesystem modification time, and finally to alphabetical order.
  posts.sort((a, b) => {
    const dateA = a.date ? Date.parse(a.date) : NaN;
    const dateB = b.date ? Date.parse(b.date) : NaN;

    if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
      return dateB - dateA;
    }
    if (!Number.isNaN(dateA)) return -1;
    if (!Number.isNaN(dateB)) return 1;

    if (a.mtimeMs && b.mtimeMs && a.mtimeMs !== b.mtimeMs) {
      return b.mtimeMs - a.mtimeMs;
    }

    return a.title.localeCompare(b.title);
  });

  return posts;
}

/* =============================================================================
 * HTML CARD RENDERERS
 * ========================================================================== */

/**
 * Renders a single tool card.
 */
function renderToolCard(tool) {
  return `<article class="tool-card">
  <div class="tool-icon" aria-hidden="true">${tool.icon}</div>
  <h3 class="tool-title">${escapeHtml(tool.title)}</h3>
  <p class="tool-description">${escapeHtml(tool.description)}</p>
  <a class="tool-open-btn" href="${escapeHtml(tool.href)}" aria-label="Open ${escapeHtml(tool.title)} tool">Open Tool</a>
</article>`;
}

/**
 * Renders a single blog card.
 */
function renderBlogCard(post) {
  return `<article class="blog-card">
  <div class="blog-image-placeholder" role="img" aria-label="${escapeHtml(post.title)} article image" loading="lazy"></div>
  <div class="blog-card-body">
    <span class="blog-category">${escapeHtml(post.category)}</span>
    <span class="blog-reading-time">${escapeHtml(post.readingTime)}</span>
    <h3 class="blog-title">${escapeHtml(post.title)}</h3>
    <p class="blog-description">${escapeHtml(post.description)}</p>
    <a class="blog-read-more-btn" href="${escapeHtml(post.href)}" aria-label="Read more about ${escapeHtml(post.title)}">Read More</a>
  </div>
</article>`;
}

/**
 * Renders the full tools container inner HTML, including the empty state.
 */
function renderToolsSection(tools) {
  if (!tools.length) {
    return `<p class="empty-state" role="status">${CONFIG.EMPTY_TOOLS_MESSAGE}</p>`;
  }
  return tools.map(renderToolCard).join('\n');
}

/**
 * Renders the full blog container inner HTML, including the empty state.
 */
function renderBlogSection(posts) {
  if (!posts.length) {
    return `<p class="empty-state" role="status">${CONFIG.EMPTY_BLOG_MESSAGE}</p>`;
  }
  return posts.map(renderBlogCard).join('\n');
}

/* =============================================================================
 * INDEX.HTML PATCHING
 * ========================================================================== */

/**
 * Builds a regex that matches a container div by id, capturing everything
 * between its opening and matching closing tag. This is a lightweight,
 * dependency-free approach: it assumes the container div does not contain
 * nested <div> elements with the same id and is written as a normal
 * <div id="...">...</div> block (not self-closing).
 */
function buildContainerRegex(containerId) {
  // Matches: <div id="containerId" ...> ... </div>
  // Uses a non-greedy match up to the first closing </div> that appears
  // after the opening tag. This is safe for the generated content above,
  // which does not itself introduce raw <div ...id="containerId"> markers.
  const escapedId = containerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(<div[^>]*\\bid=["']${escapedId}["'][^>]*>)([\\s\\S]*?)(<\\/div>)`, 'i');
}

/**
 * Replaces the inner contents of a named container div inside the given
 * HTML string. Returns { html, replaced } where `replaced` indicates
 * whether the container was found.
 */
function replaceContainerContents(html, containerId, innerHtml) {
  const regex = buildContainerRegex(containerId);

  if (!regex.test(html)) {
    return { html, replaced: false };
  }

  const updatedHtml = html.replace(regex, (_match, openTag, _oldInner, closeTag) => {
    return `${openTag}\n${innerHtml}\n${closeTag}`;
  });

  return { html: updatedHtml, replaced: true };
}

/**
 * Reads index.html, patches the tools and blog containers, and writes the
 * result back to disk. Leaves the rest of the file completely untouched.
 */
function updateIndexHtml(rootDir, tools, posts) {
  const indexPath = path.join(rootDir, CONFIG.INDEX_FILE);
  const originalHtml = safeReadFile(indexPath);

  if (originalHtml === null) {
    log.error(`Could not find or read "${CONFIG.INDEX_FILE}" at repository root. Aborting update.`);
    return false;
  }

  let html = originalHtml;

  const toolsResult = replaceContainerContents(html, CONFIG.TOOLS_CONTAINER_ID, renderToolsSection(tools));
  html = toolsResult.html;
  if (!toolsResult.replaced) {
    log.warn(`Could not find <div id="${CONFIG.TOOLS_CONTAINER_ID}"></div> in ${CONFIG.INDEX_FILE}.`);
  }

  const blogResult = replaceContainerContents(html, CONFIG.BLOG_CONTAINER_ID, renderBlogSection(posts));
  html = blogResult.html;
  if (!blogResult.replaced) {
    log.warn(`Could not find <div id="${CONFIG.BLOG_CONTAINER_ID}"></div> in ${CONFIG.INDEX_FILE}.`);
  }

  if (!toolsResult.replaced && !blogResult.replaced) {
    log.error('Neither container was found. index.html was not modified.');
    return false;
  }

  return safeWriteFile(indexPath, html);
}

/* =============================================================================
 * MAIN
 * ========================================================================== */

function main() {
  log.section('Multi Tools — Homepage Generator');

  const rootDir = CONFIG.ROOT_DIR;
  log.info(`Repository root: ${rootDir}`);

  log.section('Detected Tools');
  const tools = detectTools(rootDir);
  if (tools.length) {
    tools.forEach((tool) => log.info(`- ${tool.title} (${tool.href})`));
  } else {
    log.warn('No tools detected.');
  }

  log.section('Detected Blogs');
  const posts = detectBlogPosts(rootDir);
  if (posts.length) {
    posts.forEach((post) => log.info(`- ${post.title} (${post.href})`));
  } else {
    log.warn('No blog articles detected.');
  }

  log.section('Updating index.html');
  const success = updateIndexHtml(rootDir, tools, posts);

  if (success) {
    log.section('Homepage Updated Successfully');
    log.info(`Tools rendered: ${tools.length}`);
    log.info(`Blog articles rendered: ${posts.length}`);
  } else {
    log.error('Homepage update failed. See warnings/errors above.');
    process.exitCode = 1;
  }
}

main();

