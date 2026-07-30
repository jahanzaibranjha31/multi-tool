/* ==========================================================
   META TAG CHECKER — client-side logic
   Parses either a pasted HTML string or a fetched URL response
   using DOMParser, scores the result, and renders a report.
   No third-party libraries; no data is sent to any backend
   other than the direct browser fetch to the URL the user enters.
   ========================================================== */
(() => {
  "use strict";

  // ---- Theme ----
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const iconMoon = themeToggle.querySelector(".icon-moon");
  const iconSun = themeToggle.querySelector(".icon-sun");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const isLight = theme === "light";
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
    iconMoon.hidden = isLight;
    iconSun.hidden = !isLight;
  }

  const storedTheme = localStorage.getItem("mtc-theme");
  const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(storedTheme || (systemPrefersLight ? "light" : "dark"));

  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("mtc-theme", next);
  });

  // ---- DOM refs ----
  const tabUrlBtn = document.getElementById("tabUrlBtn");
  const tabHtmlBtn = document.getElementById("tabHtmlBtn");
  const panelUrl = document.getElementById("panelUrl");
  const panelHtml = document.getElementById("panelHtml");
  const urlInput = document.getElementById("urlInput");
  const htmlInput = document.getElementById("htmlInput");
  const analyzeUrlBtn = document.getElementById("analyzeUrlBtn");
  const analyzeHtmlBtn = document.getElementById("analyzeHtmlBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const toolError = document.getElementById("toolError");
  const loadingState = document.getElementById("loadingState");
  const resultsEl = document.getElementById("results");
  const resultsGrid = document.getElementById("resultsGrid");
  const issuesList = document.getElementById("issuesList");
  const scoreNumber = document.getElementById("scoreNumber");
  const scoreRingFill = document.getElementById("scoreRingFill");
  const scoreGrade = document.getElementById("scoreGrade");
  const resultSearch = document.getElementById("resultSearch");
  const copyReportBtn = document.getElementById("copyReportBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");

  const RING_CIRC = 327; // 2 * PI * 52, matches SVG r=52
  let lastReportText = "";
  let lastReportHtml = "";
  let lastSourceLabel = "";

  // ---- Tabs ----
  function setTab(active) {
    const isUrl = active === "url";
    tabUrlBtn.classList.toggle("is-active", isUrl);
    tabHtmlBtn.classList.toggle("is-active", !isUrl);
    tabUrlBtn.setAttribute("aria-selected", String(isUrl));
    tabHtmlBtn.setAttribute("aria-selected", String(!isUrl));
    panelUrl.hidden = !isUrl;
    panelHtml.hidden = isUrl;
    showError("");
  }
  tabUrlBtn.addEventListener("click", () => setTab("url"));
  tabHtmlBtn.addEventListener("click", () => setTab("html"));

  sampleBtn.addEventListener("click", () => {
    htmlInput.value = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Trail Running Shoes for Beginners | TrailGear Co.</title>
<meta name="description" content="Find the best beginner trail running shoes, reviewed and compared by our team of ultrarunners. Free shipping over $50.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/trail-running-shoes">
<meta property="og:title" content="Trail Running Shoes for Beginners">
<meta property="og:description" content="Find the best beginner trail running shoes, reviewed by ultrarunners.">
<meta property="og:image" content="https://example.com/images/trail-shoes.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Trail Running Shoe"}<\/script>
</head>
<body></body>
</html>`;
    showError("");
  });

  // ---- Error / loading helpers ----
  function showError(message) {
    toolError.textContent = message;
  }
  function setLoading(on) {
    loadingState.hidden = !on;
    analyzeUrlBtn.disabled = on;
    analyzeHtmlBtn.disabled = on;
  }

  // ==========================================================
  // PARSING
  // ==========================================================
  function attr(el, name) { return el ? (el.getAttribute(name) || "").trim() : ""; }

  function analyzeDocument(doc, sourceLabel) {
    const data = { source: sourceLabel };

    // Title
    const titleEls = Array.from(doc.querySelectorAll("title"));
    data.title = titleEls[0] ? titleEls[0].textContent.trim() : "";
    data.titleCount = titleEls.length;

    // Meta description / keywords / robots / author / theme-color / viewport
    const metaByName = name => Array.from(doc.querySelectorAll(`meta[name="${name}" i]`));
    const descEls = metaByName("description");
    const keywordEls = metaByName("keywords");
    const robotsEls = metaByName("robots");
    const authorEls = metaByName("author");
    const themeEls = metaByName("theme-color");
    const viewportEls = metaByName("viewport");

    data.description = attr(descEls[0], "content");
    data.descriptionCount = descEls.length;
    data.keywords = attr(keywordEls[0], "content");
    data.robots = attr(robotsEls[0], "content");
    data.robotsCount = robotsEls.length;
    data.author = attr(authorEls[0], "content");
    data.themeColor = attr(themeEls[0], "content");
    data.viewport = attr(viewportEls[0], "content");
    data.viewportCount = viewportEls.length;

    // Charset
    const charsetEl = doc.querySelector("meta[charset]");
    const httpEquivCharset = doc.querySelector('meta[http-equiv="Content-Type" i]');
    data.charset = charsetEl ? attr(charsetEl, "charset") : (httpEquivCharset ? attr(httpEquivCharset, "content") : "");

    // Language
    data.language = attr(doc.documentElement, "lang");

    // Canonical
    const canonicalEls = Array.from(doc.querySelectorAll('link[rel="canonical" i]'));
    data.canonical = attr(canonicalEls[0], "href");
    data.canonicalCount = canonicalEls.length;

    // Favicon
    const iconEl = doc.querySelector('link[rel~="icon"], link[rel="shortcut icon" i]');
    data.favicon = attr(iconEl, "href");

    // Hreflang
    data.hreflang = Array.from(doc.querySelectorAll('link[rel="alternate" i][hreflang]'))
      .map(el => `${attr(el, "hreflang")} → ${attr(el, "href")}`);

    // Open Graph
    const ogEls = Array.from(doc.querySelectorAll('meta[property^="og:" i]'));
    data.og = ogEls.map(el => ({ key: attr(el, "property"), value: attr(el, "content") }));

    // Twitter Card
    const twEls = Array.from(doc.querySelectorAll('meta[name^="twitter:" i]'));
    data.twitter = twEls.map(el => ({ key: attr(el, "name"), value: attr(el, "content") }));

    // Structured data
    const ldEls = Array.from(doc.querySelectorAll('script[type="application/ld+json" i]'));
    data.jsonLdCount = ldEls.length;
    data.schemaTypes = [];
    ldEls.forEach(el => {
      try {
        const parsed = JSON.parse(el.textContent);
        const items = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);
        items.forEach(item => { if (item && item["@type"]) data.schemaTypes.push([].concat(item["@type"]).join(", ")); });
      } catch { /* malformed JSON-LD is flagged separately as an issue */ }
    });

    // Duplicate & empty detection across single-instance tags
    data.duplicates = [];
    data.empties = [];
    const singletons = [
      ["Title", titleEls.map(e => e.textContent.trim())],
      ["Meta description", descEls.map(e => attr(e, "content"))],
      ["Canonical", canonicalEls.map(e => attr(e, "href"))],
      ["Viewport", viewportEls.map(e => attr(e, "content"))],
      ["Robots", robotsEls.map(e => attr(e, "content"))]
    ];
    singletons.forEach(([label, values]) => {
      if (values.length > 1) data.duplicates.push(`${label} (${values.length} instances)`);
      values.forEach(v => { if (v === "") data.empties.push(label); });
    });
    ogEls.forEach(el => { if (attr(el, "content") === "") data.empties.push(`Open Graph ${attr(el, "property")}`); });
    twEls.forEach(el => { if (attr(el, "content") === "") data.empties.push(`Twitter ${attr(el, "name")}`); });

    return data;
  }

  // ==========================================================
  // SCORING
  // ==========================================================
  function scoreReport(d) {
    let score = 0;
    const issues = [];

    // Title (15)
    if (!d.title) { issues.push(["bad", "Title tag is missing entirely."]); }
    else {
      score += 10;
      if (d.title.length >= 50 && d.title.length <= 60) score += 5;
      else if (d.title.length < 50) issues.push(["warn", `Title is short (${d.title.length} characters). Aim for 50–60.`]);
      else issues.push(["warn", `Title is long (${d.title.length} characters) and may be truncated in search results.`]);
    }

    // Description (15)
    if (!d.description) { issues.push(["bad", "Meta description is missing."]); }
    else {
      score += 10;
      if (d.description.length >= 120 && d.description.length <= 160) score += 5;
      else if (d.description.length < 120) issues.push(["warn", `Meta description is short (${d.description.length} characters). Aim for 120–160.`]);
      else issues.push(["warn", `Meta description is long (${d.description.length} characters) and may be truncated.`]);
    }

    // Canonical (10)
    if (!d.canonical) issues.push(["warn", "No canonical tag found."]);
    else score += 10;

    // Robots (5)
    if (!d.robots) issues.push(["warn", "No robots meta tag found (defaults to index, follow)."]);
    else {
      score += 5;
      if (/noindex/i.test(d.robots)) issues.push(["bad", `Robots meta blocks indexing: "${d.robots}".`]);
    }

    // Viewport (10)
    if (!d.viewport) issues.push(["warn", "No viewport meta tag — mobile rendering may suffer."]);
    else score += 10;

    // Charset (5)
    if (!d.charset) issues.push(["warn", "No character encoding declared."]);
    else score += 5;

    // Language (5)
    if (!d.language) issues.push(["warn", "No lang attribute on the <html> element."]);
    else score += 5;

    // Favicon (5)
    if (!d.favicon) issues.push(["warn", "No favicon link found."]);
    else score += 5;

    // Open Graph (15)
    const ogKeys = d.og.map(t => t.key.toLowerCase());
    const ogRequired = ["og:title", "og:description", "og:image", "og:url"];
    const ogFound = ogRequired.filter(k => ogKeys.includes(k));
    if (ogFound.length === 0) issues.push(["bad", "No Open Graph tags found — social shares will look generic."]);
    else {
      score += Math.round((ogFound.length / ogRequired.length) * 15);
      if (ogFound.length < ogRequired.length) issues.push(["warn", `Open Graph is incomplete (missing ${ogRequired.filter(k => !ogFound.includes(k)).join(", ")}).`]);
    }

    // Twitter Card (10)
    const twKeys = d.twitter.map(t => t.key.toLowerCase());
    const twRequired = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];
    const twFound = twRequired.filter(k => twKeys.includes(k));
    if (twFound.length === 0) issues.push(["warn", "No Twitter Card tags found."]);
    else {
      score += Math.round((twFound.length / twRequired.length) * 10);
      if (twFound.length < twRequired.length) issues.push(["warn", "Twitter Card tags are incomplete."]);
    }

    // Structured data (5)
    if (d.jsonLdCount === 0) issues.push(["warn", "No JSON-LD structured data detected."]);
    else score += 5;

    // Duplicates / empties (penalties)
    d.duplicates.forEach(label => { score -= 3; issues.push(["bad", `Duplicate tag detected: ${label}.`]); });
    d.empties.forEach(label => { score -= 2; issues.push(["warn", `Empty tag with no content: ${label}.`]); });

    score = Math.max(0, Math.min(100, Math.round(score)));

    if (issues.length === 0) issues.push(["good", "No issues found — this page's meta tags are in great shape."]);

    let grade = "F";
    if (score >= 90) grade = "A";
    else if (score >= 75) grade = "B";
    else if (score >= 60) grade = "C";
    else if (score >= 40) grade = "D";

    return { score, grade, issues };
  }

  // ==========================================================
  // RENDERING
  // ==========================================================
  function statusFor(condition) { return condition ? "good" : "bad"; }

  function card({ title, status, value, meta, chips }) {
    const el = document.createElement("div");
    el.className = "result-card";
    el.dataset.search = `${title} ${value || ""} ${(chips || []).map(c => c.label || c).join(" ")}`.toLowerCase();
    el.innerHTML = `
      <div class="result-card-head">
        <span class="result-card-title">${title}</span>
        <span class="status-dot ${status}" title="${status}"></span>
      </div>
      <div class="result-card-value">${value || "<em>Not found</em>"}</div>
      ${meta ? `<div class="result-card-meta">${meta}</div>` : ""}
      ${chips && chips.length ? `<div class="tag-chip-row">${chips.map(c => `<span class="tag-chip">${typeof c === "string" ? c : `${c.label}`}</span>`).join("")}</div>` : ""}
    `;
    return el;
  }

  function renderResults(d, scored) {
    resultsGrid.innerHTML = "";

    resultsGrid.appendChild(card({ title: "Title tag", status: statusFor(!!d.title), value: escapeHtml(d.title), meta: d.title ? `${d.title.length} characters` : "" }));
    resultsGrid.appendChild(card({ title: "Meta description", status: statusFor(!!d.description), value: escapeHtml(d.description), meta: d.description ? `${d.description.length} characters` : "" }));
    resultsGrid.appendChild(card({ title: "Canonical URL", status: statusFor(!!d.canonical), value: escapeHtml(d.canonical) }));
    resultsGrid.appendChild(card({ title: "Robots meta", status: statusFor(!!d.robots), value: escapeHtml(d.robots) || "Defaults to index, follow" }));
    resultsGrid.appendChild(card({ title: "Viewport", status: statusFor(!!d.viewport), value: escapeHtml(d.viewport) }));
    resultsGrid.appendChild(card({ title: "Charset", status: statusFor(!!d.charset), value: escapeHtml(d.charset) }));
    resultsGrid.appendChild(card({ title: "Language", status: statusFor(!!d.language), value: escapeHtml(d.language) }));
    resultsGrid.appendChild(card({ title: "Author", status: d.author ? "good" : "warn", value: escapeHtml(d.author) }));
    resultsGrid.appendChild(card({ title: "Theme color", status: d.themeColor ? "good" : "warn", value: escapeHtml(d.themeColor) }));
    resultsGrid.appendChild(card({ title: "Favicon", status: statusFor(!!d.favicon), value: escapeHtml(d.favicon) }));
    resultsGrid.appendChild(card({ title: "Meta keywords", status: d.keywords ? "good" : "warn", value: escapeHtml(d.keywords) || "Not present (largely ignored by Google)" }));

    resultsGrid.appendChild(card({
      title: "Open Graph",
      status: d.og.length ? "good" : "bad",
      value: d.og.length ? `${d.og.length} tags found` : "",
      chips: d.og.map(t => `${t.key}`)
    }));
    resultsGrid.appendChild(card({
      title: "Twitter Card",
      status: d.twitter.length ? "good" : "warn",
      value: d.twitter.length ? `${d.twitter.length} tags found` : "",
      chips: d.twitter.map(t => `${t.key}`)
    }));
    resultsGrid.appendChild(card({
      title: "Hreflang",
      status: d.hreflang.length ? "good" : "warn",
      value: d.hreflang.length ? `${d.hreflang.length} alternates` : "Not present (fine for single-language sites)",
      chips: d.hreflang
    }));
    resultsGrid.appendChild(card({
      title: "Structured data",
      status: d.jsonLdCount ? "good" : "warn",
      value: d.jsonLdCount ? `${d.jsonLdCount} JSON-LD block(s)` : "",
      chips: d.schemaTypes.length ? d.schemaTypes : []
    }));

    // Issues
    issuesList.innerHTML = "";
    scored.issues
      .slice()
      .sort((a, b) => sevRank(b[0]) - sevRank(a[0]))
      .forEach(([sev, text]) => {
        const li = document.createElement("li");
        li.className = `issue-item sev-${sev}`;
        li.dataset.search = text.toLowerCase();
        const icon = sev === "bad" ? "✕" : sev === "warn" ? "!" : "✓";
        li.innerHTML = `<span class="issue-icon" aria-hidden="true">${icon}</span><span>${escapeHtml(text)}</span>`;
        issuesList.appendChild(li);
      });

    function sevRank(s) { return s === "bad" ? 2 : s === "warn" ? 1 : 0; }

    // Score
    scoreNumber.textContent = String(scored.score);
    scoreGrade.textContent = `Grade ${scored.grade}`;
    const color = scored.score >= 75 ? "var(--good)" : scored.score >= 50 ? "var(--warn)" : "var(--bad)";
    scoreRingFill.style.stroke = color;
    scoreGrade.style.color = color;
    const offset = RING_CIRC - (scored.score / 100) * RING_CIRC;
    requestAnimationFrame(() => { scoreRingFill.style.strokeDashoffset = String(offset); });

    resultsEl.hidden = false;
    resultSearch.value = "";
    buildReportText(d, scored);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  // ==========================================================
  // REPORT EXPORT
  // ==========================================================
  function buildReportText(d, scored) {
    const lines = [];
    lines.push(`META TAG CHECKER REPORT`);
    lines.push(`Source: ${d.source}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`SEO Score: ${scored.score}/100 (Grade ${scored.grade})`);
    lines.push("");
    lines.push(`Title: ${d.title || "(missing)"} [${d.title ? d.title.length : 0} chars]`);
    lines.push(`Description: ${d.description || "(missing)"} [${d.description ? d.description.length : 0} chars]`);
    lines.push(`Canonical: ${d.canonical || "(missing)"}`);
    lines.push(`Robots: ${d.robots || "(default)"}`);
    lines.push(`Viewport: ${d.viewport || "(missing)"}`);
    lines.push(`Charset: ${d.charset || "(missing)"}`);
    lines.push(`Language: ${d.language || "(missing)"}`);
    lines.push(`Favicon: ${d.favicon || "(missing)"}`);
    lines.push(`Open Graph tags: ${d.og.length}`);
    lines.push(`Twitter Card tags: ${d.twitter.length}`);
    lines.push(`JSON-LD blocks: ${d.jsonLdCount}${d.schemaTypes.length ? ` (${d.schemaTypes.join(", ")})` : ""}`);
    lines.push("");
    lines.push("ISSUES & RECOMMENDATIONS:");
    scored.issues.forEach(([sev, text]) => lines.push(`[${sev.toUpperCase()}] ${text}`));

    lastReportText = lines.join("\n");
    lastReportHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Meta Tag Report — ${escapeHtml(d.source)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111}h1{font-size:1.4rem}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:0.92rem}li{margin-bottom:6px}.bad{color:#c0392b}.warn{color:#b8860b}.good{color:#1e8449}</style>
</head><body>
<h1>Meta Tag Checker Report</h1>
<p><strong>Source:</strong> ${escapeHtml(d.source)}<br><strong>Generated:</strong> ${new Date().toLocaleString()}<br><strong>SEO Score:</strong> ${scored.score}/100 (Grade ${scored.grade})</p>
<table>
<tr><th>Tag</th><th>Value</th></tr>
<tr><td>Title</td><td>${escapeHtml(d.title) || "(missing)"}</td></tr>
<tr><td>Description</td><td>${escapeHtml(d.description) || "(missing)"}</td></tr>
<tr><td>Canonical</td><td>${escapeHtml(d.canonical) || "(missing)"}</td></tr>
<tr><td>Robots</td><td>${escapeHtml(d.robots) || "(default)"}</td></tr>
<tr><td>Viewport</td><td>${escapeHtml(d.viewport) || "(missing)"}</td></tr>
<tr><td>Open Graph tags</td><td>${d.og.length}</td></tr>
<tr><td>Twitter Card tags</td><td>${d.twitter.length}</td></tr>
<tr><td>JSON-LD blocks</td><td>${d.jsonLdCount}</td></tr>
</table>
<h2>Issues &amp; recommendations</h2>
<ul>${scored.issues.map(([sev, text]) => `<li class="${sev}">[${sev.toUpperCase()}] ${escapeHtml(text)}</li>`).join("")}</ul>
</body></html>`;
    lastSourceLabel = d.source;
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  copyReportBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastReportText);
      const original = copyReportBtn.textContent;
      copyReportBtn.textContent = "Copied!";
      window.setTimeout(() => { copyReportBtn.textContent = original; }, 1800);
    } catch {
      showError("Couldn't copy to clipboard in this browser.");
    }
  });
  downloadTxtBtn.addEventListener("click", () => downloadFile("meta-tag-report.txt", lastReportText, "text/plain"));
  downloadHtmlBtn.addEventListener("click", () => downloadFile("meta-tag-report.html", lastReportHtml, "text/html"));
  printBtn.addEventListener("click", () => window.print());
  resetBtn.addEventListener("click", resetAll);

  function resetAll() {
    urlInput.value = "";
    htmlInput.value = "";
    resultsEl.hidden = true;
    showError("");
    resultSearch.value = "";
  }

  // ---- Search inside results ----
  resultSearch.addEventListener("input", () => {
    const q = resultSearch.value.trim().toLowerCase();
    resultsGrid.querySelectorAll(".result-card").forEach(el => {
      el.classList.toggle("is-hidden", q !== "" && !el.dataset.search.includes(q));
    });
    issuesList.querySelectorAll(".issue-item").forEach(el => {
      el.classList.toggle("is-hidden", q !== "" && !el.dataset.search.includes(q));
    });
  });

  // ==========================================================
  // ANALYZE ACTIONS
  // ==========================================================
  analyzeHtmlBtn.addEventListener("click", () => {
    const html = htmlInput.value.trim();
    showError("");
    if (!html) { showError("Paste some HTML source first."); return; }
    setLoading(true);
    window.setTimeout(() => {
      try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const data = analyzeDocument(doc, "Pasted HTML");
        const scored = scoreReport(data);
        renderResults(data, scored);
      } catch (err) {
        showError("Couldn't parse that HTML. Please check it's valid markup.");
      } finally {
        setLoading(false);
      }
    }, 250);
  });

  analyzeUrlBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    showError("");
    if (!url) { showError("Enter a URL to analyze."); return; }
    let parsed;
    try { parsed = new URL(url); } catch { showError("Enter a full URL, including https://"); return; }
    if (!/^https?:$/.test(parsed.protocol)) { showError("Only http:// and https:// URLs are supported."); return; }

    setLoading(true);
    try {
      const res = await fetch(parsed.toString(), { mode: "cors" });
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const data = analyzeDocument(doc, parsed.toString());
      const scored = scoreReport(data);
      renderResults(data, scored);
    } catch (err) {
      showError(`Couldn't fetch that URL directly (often a CORS restriction from the target site). Try the "Paste HTML" tab with the page's view-source instead.`);
    } finally {
      setLoading(false);
    }
  });
})();
