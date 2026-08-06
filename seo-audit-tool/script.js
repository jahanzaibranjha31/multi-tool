(function () {
  "use strict";

  var pageUrlInput = document.getElementById("pageUrl");
  var focusKeywordInput = document.getElementById("focusKeyword");
  var htmlSourceInput = document.getElementById("htmlSource");
  var tryFetchBtn = document.getElementById("tryFetchBtn");
  var fetchStatus = document.getElementById("fetchStatus");
  var runAuditBtn = document.getElementById("runAuditBtn");
  var formError = document.getElementById("formError");

  var resultsSection = document.getElementById("resultsSection");
  var scoreGauge = document.getElementById("scoreGauge");
  var scoreNumber = document.getElementById("scoreNumber");
  var resultsUrlLine = document.getElementById("resultsUrlLine");
  var resultsSummaryText = document.getElementById("resultsSummaryText");
  var checksGrid = document.getElementById("checksGrid");
  var densityTableBody = document.querySelector("#densityTable tbody");

  // Related keyword list pulled from real search-console queries for this tool.
  var RELATED_KEYWORDS = [
    "google keyword density",
    "keyword density google",
    "keyword density for google",
    "keyword density calculation",
    "keyword density tool text",
    "best keyword density",
    "word density",
    "best keyword density tool",
    "keyword density formula",
    "density tool",
    "keyword density tool chrome",
    "keyword density checker text",
    "keyword density tool google",
    "keyword density chrome extension",
    "keyword counter tool",
    "maximum keyword density"
  ];

  // ---------- Try auto-fetch (best-effort; many sites block cross-origin reads) ----------
  tryFetchBtn.addEventListener("click", function () {
    var url = (pageUrlInput.value || "").trim();
    if (!url) {
      fetchStatus.textContent = "Enter a website URL above first.";
      return;
    }
    fetchStatus.textContent = "Fetching…";
    fetch(url, { mode: "cors" })
      .then(function (res) {
        if (!res.ok) { throw new Error("Request failed (" + res.status + ")"); }
        return res.text();
      })
      .then(function (html) {
        htmlSourceInput.value = html;
        fetchStatus.textContent = "Loaded. Review the source below, then run the audit.";
      })
      .catch(function () {
        fetchStatus.textContent = "This site blocks cross-origin fetching (normal for most hosts). Please paste the page source manually below.";
      });
  });

  // ---------- Run audit ----------
  runAuditBtn.addEventListener("click", function () {
    formError.textContent = "";
    var html = htmlSourceInput.value.trim();
    if (!html) {
      formError.textContent = "Paste your page's HTML source before running the audit.";
      htmlSourceInput.focus();
      return;
    }

    var doc;
    try {
      var parser = new DOMParser();
      doc = parser.parseFromString(html, "text/html");
      if (!doc || !doc.documentElement) { throw new Error("parse failed"); }
    } catch (e) {
      formError.textContent = "That doesn't look like valid HTML. Double-check you copied the full page source.";
      return;
    }

    var pageUrl = (pageUrlInput.value || "").trim();
    var focusKeyword = (focusKeywordInput.value || "").trim();

    var checks = runChecks(doc);
    var density = buildDensityReport(doc, focusKeyword);

    renderResults(checks, density, pageUrl);
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- Checks ----------
  function runChecks(doc) {
    var checks = [];

    // Title tag
    var titleEl = doc.querySelector("title");
    var titleText = titleEl ? titleEl.textContent.trim() : "";
    if (!titleText) {
      checks.push(makeCheck("Title tag", "fail", "No <title> tag found. Every page needs one unique title."));
    } else if (titleText.length < 30 || titleText.length > 60) {
      checks.push(makeCheck("Title tag", "warn", "Title is " + titleText.length + " characters. Aim for roughly 30–60 so it doesn't get cut off in search results."));
    } else {
      checks.push(makeCheck("Title tag", "pass", "Title is " + titleText.length + " characters — a healthy length."));
    }

    // Meta description
    var metaDesc = doc.querySelector('meta[name="description"]');
    var descText = metaDesc ? (metaDesc.getAttribute("content") || "").trim() : "";
    if (!descText) {
      checks.push(makeCheck("Meta description", "fail", "No meta description found. Add one so search engines have good snippet copy to show."));
    } else if (descText.length < 70 || descText.length > 160) {
      checks.push(makeCheck("Meta description", "warn", "Description is " + descText.length + " characters. Aim for about 120–160."));
    } else {
      checks.push(makeCheck("Meta description", "pass", "Description is " + descText.length + " characters — good length."));
    }

    // H1
    var h1s = doc.querySelectorAll("h1");
    if (h1s.length === 0) {
      checks.push(makeCheck("H1 heading", "fail", "No H1 found. Add one clear H1 describing the page topic."));
    } else if (h1s.length > 1) {
      checks.push(makeCheck("H1 heading", "warn", "Found " + h1s.length + " H1 tags. Most pages should use exactly one."));
    } else {
      checks.push(makeCheck("H1 heading", "pass", "Exactly one H1 found."));
    }

    // Heading structure
    var h2s = doc.querySelectorAll("h2");
    if (h2s.length === 0) {
      checks.push(makeCheck("Subheadings (H2)", "warn", "No H2 tags found. Breaking content into sections helps both readers and crawlers."));
    } else {
      checks.push(makeCheck("Subheadings (H2)", "pass", h2s.length + " H2 subheading(s) found."));
    }

    // Images / alt text
    var imgs = doc.querySelectorAll("img");
    if (imgs.length === 0) {
      checks.push(makeCheck("Image alt text", "warn", "No images found to check."));
    } else {
      var missingAlt = 0;
      imgs.forEach(function (img) {
        var alt = img.getAttribute("alt");
        if (!alt || !alt.trim()) { missingAlt++; }
      });
      if (missingAlt === 0) {
        checks.push(makeCheck("Image alt text", "pass", "All " + imgs.length + " image(s) have alt text."));
      } else if (missingAlt === imgs.length) {
        checks.push(makeCheck("Image alt text", "fail", "None of the " + imgs.length + " image(s) have alt text."));
      } else {
        checks.push(makeCheck("Image alt text", "warn", missingAlt + " of " + imgs.length + " image(s) are missing alt text."));
      }
    }

    // Word count
    var bodyText = getVisibleText(doc);
    var wordCount = countWords(bodyText);
    if (wordCount < 300) {
      checks.push(makeCheck("Content length", "warn", wordCount + " words found. Thin content (under ~300 words) can be harder to rank."));
    } else {
      checks.push(makeCheck("Content length", "pass", wordCount + " words found."));
    }

    // Canonical tag
    var canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical && canonical.getAttribute("href")) {
      checks.push(makeCheck("Canonical tag", "pass", "Canonical URL is set."));
    } else {
      checks.push(makeCheck("Canonical tag", "warn", "No canonical tag found. Useful for avoiding duplicate-content issues."));
    }

    // Viewport meta
    var viewport = doc.querySelector('meta[name="viewport"]');
    if (viewport) {
      checks.push(makeCheck("Mobile viewport", "pass", "Viewport meta tag is present."));
    } else {
      checks.push(makeCheck("Mobile viewport", "fail", "No viewport meta tag. The page may not render correctly on mobile."));
    }

    // Robots meta
    var robots = doc.querySelector('meta[name="robots"]');
    var robotsContent = robots ? (robots.getAttribute("content") || "").toLowerCase() : "";
    if (robotsContent.indexOf("noindex") !== -1) {
      checks.push(makeCheck("Robots meta", "fail", "This page is set to \"noindex\" — search engines won't list it."));
    } else {
      checks.push(makeCheck("Robots meta", "pass", "Page is indexable."));
    }

    // Links
    var links = doc.querySelectorAll("a[href]");
    if (links.length === 0) {
      checks.push(makeCheck("Links", "warn", "No links found on the page."));
    } else {
      checks.push(makeCheck("Links", "pass", links.length + " link(s) found on the page."));
    }

    return checks;
  }

  function makeCheck(name, status, detail) {
    return { name: name, status: status, detail: detail };
  }

  function getVisibleText(doc) {
    var clone = doc.body ? doc.body.cloneNode(true) : doc.documentElement.cloneNode(true);
    var junk = clone.querySelectorAll("script, style, noscript");
    junk.forEach(function (el) { el.remove(); });
    return (clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function countWords(text) {
    if (!text) { return 0; }
    var matches = text.match(/[A-Za-z0-9'’-]+/g);
    return matches ? matches.length : 0;
  }

  // ---------- Keyword density ----------
  function buildDensityReport(doc, focusKeyword) {
    var text = getVisibleText(doc).toLowerCase();
    var totalWords = countWords(text) || 1;

    var list = [];
    if (focusKeyword) { list.push(focusKeyword.toLowerCase()); }
    RELATED_KEYWORDS.forEach(function (kw) {
      if (list.indexOf(kw) === -1) { list.push(kw); }
    });
    // Keep the report focused: primary keyword + top related terms.
    list = list.slice(0, 8);

    return list.map(function (phrase) {
      var count = countOccurrences(text, phrase);
      var density = (count / totalWords) * 100;
      return {
        phrase: phrase,
        count: count,
        density: density,
        isPrimary: focusKeyword && phrase === focusKeyword.toLowerCase()
      };
    });
  }

  function countOccurrences(text, phrase) {
    if (!phrase) { return 0; }
    var escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp(escaped, "gi");
    var matches = text.match(re);
    return matches ? matches.length : 0;
  }

  function densityStatus(density, count) {
    if (count === 0) { return { status: "fail", label: "Not found" }; }
    if (density > 3.5) { return { status: "fail", label: "Stuffing risk" }; }
    if (density > 2.5) { return { status: "warn", label: "High" }; }
    if (density >= 0.5) { return { status: "pass", label: "Optimal" }; }
    return { status: "warn", label: "Low" };
  }

  // ---------- Render ----------
  function renderResults(checks, density, pageUrl) {
    var passCount = checks.filter(function (c) { return c.status === "pass"; }).length;
    var warnCount = checks.filter(function (c) { return c.status === "warn"; }).length;
    var score = Math.round(((passCount + warnCount * 0.5) / checks.length) * 100);

    scoreNumber.textContent = String(score);
    scoreGauge.style.setProperty("--pct", String(score));

    resultsUrlLine.textContent = pageUrl ? pageUrl : "No URL provided — showing results from pasted source.";
    resultsSummaryText.textContent = "This seo audit tool checked " + checks.length + " on-page factors: " +
      passCount + " passed, " + warnCount + " need attention, and " +
      (checks.length - passCount - warnCount) + " failed.";

    checksGrid.innerHTML = "";
    checks.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "check-card " + c.status;
      card.innerHTML =
        '<div class="check-card-top">' +
          '<span class="check-name">' + escapeHtml(c.name) + '</span>' +
          '<span class="check-status ' + c.status + '">' + c.status + '</span>' +
        '</div>' +
        '<p class="check-detail">' + escapeHtml(c.detail) + '</p>';
      checksGrid.appendChild(card);
    });

    densityTableBody.innerHTML = "";
    density.forEach(function (row) {
      var st = densityStatus(row.density, row.count);
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' + escapeHtml(row.phrase) + (row.isPrimary ? ' <span class="pill pass">focus</span>' : '') + '</td>' +
        '<td>' + row.count + '</td>' +
        '<td>' + row.density.toFixed(2) + '%</td>' +
        '<td><span class="pill ' + st.status + '">' + st.label + '</span></td>';
      densityTableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
