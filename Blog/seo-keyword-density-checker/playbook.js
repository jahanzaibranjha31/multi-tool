(function () {
  "use strict";

  var tabButtons = document.querySelectorAll("#scenario-tabs .tab-btn");
  var panels = document.querySelectorAll("#scenario-tabs .tab-panel");

  if (!tabButtons.length) return;

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-tab");

      tabButtons.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(function (panel) {
        var match = panel.id === "panel-" + target;
        panel.classList.toggle("is-active", match);
        if (match) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
    });
  });
})();
