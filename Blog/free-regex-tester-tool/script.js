/* =========================================================
   Free Regex Tester — live highlighting demo
   Vanilla JS, no dependencies. Escapes user input before
   inserting into the DOM to avoid HTML injection.
   ========================================================= */
(function () {
  "use strict";

  var patternInput = document.getElementById("demoPattern");
  var flagsInput = document.getElementById("demoFlags");
  var textInput = document.getElementById("demoText");
  var output = document.getElementById("demoOutput");
  var status = document.getElementById("demoStatus");

  if (!patternInput || !flagsInput || !textInput || !output || !status) {
    return; // demo widget not present on this page
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeFlags(raw) {
    var allowed = "gimsuy";
    var seen = {};
    var result = "";
    for (var i = 0; i < raw.length; i++) {
      var ch = raw[i];
      if (allowed.indexOf(ch) !== -1 && !seen[ch]) {
        seen[ch] = true;
        result += ch;
      }
    }
    // Highlighting needs every match, so always run global internally.
    if (result.indexOf("g") === -1) {
      result += "g";
    }
    return result;
  }

  function render() {
    var patternStr = patternInput.value;
    var text = textInput.value;
    var flags = sanitizeFlags(flagsInput.value || "");

    if (!patternStr) {
      output.innerHTML = escapeHtml(text);
      status.textContent = "Type a pattern to see matches highlighted.";
      status.removeAttribute("data-state");
      return;
    }

    var regex;
    try {
      regex = new RegExp(patternStr, flags);
    } catch (err) {
      output.innerHTML = escapeHtml(text);
      status.textContent = "Invalid pattern: " + err.message;
      status.setAttribute("data-state", "error");
      return;
    }

    var html = "";
    var lastIndex = 0;
    var match;
    var matchCount = 0;
    var guard = 0; // safety guard against zero-length infinite loops

    while ((match = regex.exec(text)) !== null) {
      guard++;
      if (guard > 5000) break;

      html += escapeHtml(text.slice(lastIndex, match.index));
      var matched = match[0];

      if (matched.length === 0) {
        // zero-length match: advance manually to avoid an infinite loop
        html += escapeHtml(text.slice(match.index, match.index + 1));
        lastIndex = match.index + 1;
        regex.lastIndex = lastIndex;
      } else {
        html += "<mark>" + escapeHtml(matched) + "</mark>";
        lastIndex = match.index + matched.length;
      }
      matchCount++;
    }

    html += escapeHtml(text.slice(lastIndex));
    output.innerHTML = html || "&nbsp;";

    if (matchCount === 0) {
      status.textContent = "No matches found.";
    } else {
      status.textContent = matchCount + (matchCount === 1 ? " match found." : " matches found.");
    }
    status.removeAttribute("data-state");
  }

  patternInput.addEventListener("input", render);
  flagsInput.addEventListener("input", render);
  textInput.addEventListener("input", render);

  render();
})();
