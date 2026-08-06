(function () {
  "use strict";

  // ---------- Reading progress bar ----------
  var progressBar = document.getElementById("readingProgress");
  function updateProgress() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop;
    var scrollHeight = doc.scrollHeight - doc.clientHeight;
    var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    if (progressBar) { progressBar.style.width = pct + "%"; }
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  // ---------- Back to top button ----------
  var backToTop = document.getElementById("backToTop");
  function toggleBackToTop() {
    if (!backToTop) { return; }
    if (window.scrollY > 500) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  }
  window.addEventListener("scroll", toggleBackToTop, { passive: true });
  toggleBackToTop();

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ---------- TOC active-section highlighting ----------
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  var sections = tocLinks
    .map(function (link) {
      var id = link.getAttribute("href").replace("#", "");
      return document.getElementById(id);
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          var id = entry.target.id;
          tocLinks.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === "#" + id);
          });
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) { observer.observe(section); });
  }

  // ---------- FAQ: keep only one item open at a time ----------
  var faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) { return; }
      faqItems.forEach(function (other) {
        if (other !== item) { other.open = false; }
      });
    });
  });
})();
