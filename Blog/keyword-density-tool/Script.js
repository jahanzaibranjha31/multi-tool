(function () {
  "use strict";

  var chips = document.querySelectorAll("#goal-picker .goal-chip");
  var rows = document.querySelectorAll("#tool-table tbody tr");

  if (!chips.length) return;

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var goal = chip.getAttribute("data-goal");

      chips.forEach(function (c) {
        c.classList.toggle("is-active", c === chip);
      });

      rows.forEach(function (row) {
        var rowGoal = row.getAttribute("data-goal");
        if (goal === "all") {
          row.classList.remove("is-dim");
          row.classList.remove("is-match");
        } else if (rowGoal === goal) {
          row.classList.remove("is-dim");
          row.classList.add("is-match");
        } else {
          row.classList.add("is-dim");
          row.classList.remove("is-match");
        }
      });
    });
  });
})();
