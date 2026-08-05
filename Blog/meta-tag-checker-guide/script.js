// Meta Tag Checker article — light interactivity only, no tracking, no popups.

document.addEventListener('DOMContentLoaded', function () {

  // Keep only one FAQ item open at a time for easier scanning.
  var faqItems = document.querySelectorAll('.faq-list details');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  // Highlight the active table-of-contents link as the reader scrolls.
  var sections = document.querySelectorAll('main section[id]');
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');

  if ('IntersectionObserver' in window && sections.length && tocLinks.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (link) {
          link.style.color = link.getAttribute('href') === '#' + entry.target.id
            ? 'var(--accent)'
            : '';
        });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });

    sections.forEach(function (section) { observer.observe(section); });
  }

});
