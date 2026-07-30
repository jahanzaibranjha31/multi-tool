/* ==========================================================================
   Multi Tools — Image to Base64 Converter
   All conversion happens locally via FileReader. No uploads, ever.
   ========================================================================== */
(() => {
  "use strict";

  const dropzone      = document.getElementById("dropzone");
  const fileInput     = document.getElementById("fileInput");
  const resultsList   = document.getElementById("resultsList");
  const statusMsg     = document.getElementById("statusMsg");
  const downloadAllBtn= document.getElementById("downloadAllBtn");
  const clearAllBtn   = document.getElementById("clearAllBtn");
  const themeToggle   = document.getElementById("themeToggle");
  const themeIconMoon = document.getElementById("themeIconMoon");
  const themeIconSun  = document.getElementById("themeIconSun");
  const previewDialog = document.getElementById("previewDialog");
  const previewImg    = document.getElementById("previewImg");
  const closePreview  = document.getElementById("closePreview");

  const ACCEPTED_EXT = /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif)$/i;
  let items = []; // { id, name, format, base64, dataUrl, width, height, fileSize, encTime }
  let uid = 0;

  /* ---------------- Utilities ---------------- */

  const bytesToLabel = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const setStatus = (message, isError = false) => {
    statusMsg.textContent = message;
    statusMsg.dataset.error = String(isError);
  };

  const refreshBulkButtons = () => {
    const has = items.length > 0;
    downloadAllBtn.classList.toggle("is-hidden", !has);
    clearAllBtn.classList.toggle("is-hidden", !has);
  };

  /* ---------------- Theme ---------------- */

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    themeIconMoon.classList.toggle("is-hidden", theme === "light");
    themeIconSun.classList.toggle("is-hidden", theme !== "light");
    try { localStorage.setItem("mt-theme", theme); } catch { /* storage unavailable */ }
  };

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("mt-theme"); } catch { /* ignore */ }
    const preferred = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(preferred);
  })();

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
  });

  /* ---------------- File intake ---------------- */

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(f =>
      f.type.startsWith("image/") || ACCEPTED_EXT.test(f.name)
    );
    if (!files.length) {
      setStatus("No supported image files were found.", true);
      return;
    }
    files.forEach(convertFile);
  };

  const convertFile = (file) => {
    const id = `img-${++uid}`;
    const card = createLoadingCard(id, file.name);
    resultsList.prepend(card);

    const startTime = performance.now();
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(",")[1] || "";
      const img = new Image();
      img.onload = () => {
        const encTime = (performance.now() - startTime).toFixed(1);
        const record = {
          id, name: file.name, format: file.type || "image/*",
          base64, dataUrl, width: img.naturalWidth, height: img.naturalHeight,
          fileSize: file.size, base64Length: base64.length, encTime,
        };
        items.unshift(record);
        renderCard(record);
        setStatus(`Converted ${file.name}.`);
        refreshBulkButtons();
      };
      img.onerror = () => {
        // SVG or formats that fail Image decode still get a valid Base64 string.
        const encTime = (performance.now() - startTime).toFixed(1);
        const record = {
          id, name: file.name, format: file.type || "image/*",
          base64, dataUrl, width: null, height: null,
          fileSize: file.size, base64Length: base64.length, encTime,
        };
        items.unshift(record);
        renderCard(record);
        setStatus(`Converted ${file.name}.`);
        refreshBulkButtons();
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      card.remove();
      setStatus(`Could not read ${file.name}.`, true);
    };
    reader.readAsDataURL(file);
  };

  /* ---------------- Card rendering ---------------- */

  function createLoadingCard(id, name) {
    const li = document.createElement("li");
    li.className = "result-card is-loading";
    li.id = id;
    li.innerHTML = `
      <div class="result-thumb-wrap">
        <div class="result-thumb-btn" aria-hidden="true"><span class="spinner"></span></div>
      </div>
      <div class="result-body">
        <p class="result-name">${escapeHtml(name)}</p>
        <p>Encoding…</p>
      </div>`;
    return li;
  }

  function renderCard(record) {
    const li = document.getElementById(record.id);
    if (!li) return;
    li.classList.remove("is-loading");

    const dims = record.width ? `${record.width} × ${record.height}` : "—";
    li.innerHTML = `
      <div class="result-thumb-wrap">
        <button type="button" class="result-thumb-btn" data-action="preview" aria-label="Open full-size preview of ${escapeHtml(record.name)}">
          <img src="${record.dataUrl}" alt="Preview of ${escapeHtml(record.name)}" loading="lazy">
        </button>
        <button type="button" class="result-remove" data-action="remove">Remove</button>
      </div>
      <div class="result-body">
        <p class="result-name">${escapeHtml(record.name)}</p>
        <dl class="result-stats">
          <div><dt>Dimensions</dt><dd>${dims}</dd></div>
          <div><dt>Format</dt><dd>${escapeHtml(record.format)}</dd></div>
          <div><dt>File size</dt><dd>${bytesToLabel(record.fileSize)}</dd></div>
          <div><dt>Base64 length</dt><dd>${record.base64Length.toLocaleString()} chars</dd></div>
          <div><dt>Encoded size</dt><dd>${bytesToLabel(record.base64Length)}</dd></div>
          <div><dt>Encoding time</dt><dd>${record.encTime} ms</dd></div>
        </dl>
        <label class="visually-hidden" for="ta-${record.id}">Base64 data URL for ${escapeHtml(record.name)}</label>
        <textarea id="ta-${record.id}" class="b64-output" readonly spellcheck="false">${record.dataUrl}</textarea>
        <div class="result-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="copy">Copy Base64</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="download">Download .txt</button>
        </div>
      </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- Card actions (event delegation) ---------------- */

  resultsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = e.target.closest(".result-card");
    const id = card.id;
    const record = items.find(r => r.id === id);
    if (!record) return;

    switch (btn.dataset.action) {
      case "preview":
        openPreview(record);
        break;
      case "remove":
        items = items.filter(r => r.id !== id);
        card.remove();
        refreshBulkButtons();
        setStatus(`Removed ${record.name}.`);
        break;
      case "copy":
        try {
          await navigator.clipboard.writeText(record.dataUrl);
          setStatus(`Copied Base64 for ${record.name}.`);
        } catch {
          setStatus("Could not copy to clipboard.", true);
        }
        break;
      case "download":
        downloadText(`${record.name.replace(/\.[^.]+$/, "")}-base64.txt`, record.dataUrl);
        setStatus(`Downloaded ${record.name} as text.`);
        break;
    }
  });

  /* ---------------- Preview dialog ---------------- */

  function openPreview(record) {
    previewImg.src = record.dataUrl;
    previewImg.alt = `Full-size preview of ${record.name}`;
    previewDialog.classList.remove("is-hidden");
    closePreview.focus();
    document.addEventListener("keydown", onPreviewKeydown);
  }
  function shutPreview() {
    previewDialog.classList.add("is-hidden");
    previewImg.src = "";
    document.removeEventListener("keydown", onPreviewKeydown);
  }
  function onPreviewKeydown(e) { if (e.key === "Escape") shutPreview(); }
  closePreview.addEventListener("click", shutPreview);
  previewDialog.addEventListener("click", (e) => { if (e.target === previewDialog) shutPreview(); });

  /* ---------------- Bulk actions ---------------- */

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  downloadAllBtn.addEventListener("click", () => {
    if (!items.length) return;
    const combined = items.map(r => `# ${r.name}\n${r.dataUrl}\n`).join("\n");
    downloadText("all-images-base64.txt", combined);
    setStatus("Downloaded all Base64 strings as text.");
  });

  clearAllBtn.addEventListener("click", () => {
    items = [];
    resultsList.innerHTML = "";
    refreshBulkButtons();
    setStatus("Cleared all conversions.");
  });

  /* ---------------- Upload interactions ---------------- */

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", (e) => { handleFiles(e.target.files); fileInput.value = ""; });

  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); })
  );
  dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

  /* Paste from clipboard (works anywhere on the page) */
  document.addEventListener("paste", (e) => {
    const clipboardFiles = Array.from(e.clipboardData?.items || [])
      .filter(it => it.kind === "file" && it.type.startsWith("image/"))
      .map(it => it.getAsFile())
      .filter(Boolean);
    if (clipboardFiles.length) {
      e.preventDefault();
      handleFiles(clipboardFiles);
    }
  });

  /* Keyboard shortcuts: Ctrl/Cmd+O to open file picker */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
      e.preventDefault();
      fileInput.click();
    }
  });

  refreshBulkButtons();
})();
