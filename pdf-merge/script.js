/* ==========================================================
   PDF MERGE — client-side logic
   Uses pdf-lib (loaded via CDN in index.html) to read page counts
   and copy pages between PDFs. Everything below runs locally in
   the browser; no file content is ever sent to a network request.
   ========================================================== */
(() => {
  "use strict";

  /** @typedef {{ id:string, file:File, name:string, size:number, pages:number|null, status:'reading'|'ready'|'error' }} PdfEntry */

  /** @type {PdfEntry[]} */
  let entries = [];
  let isMerging = false;

  // ---- DOM refs ----
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileError = document.getElementById("fileError");
  const fileListEl = document.getElementById("fileList");
  const toolSummary = document.getElementById("toolSummary");
  const toolActions = document.getElementById("toolActions");
  const statCount = document.getElementById("statCount");
  const statPages = document.getElementById("statPages");
  const statSize = document.getElementById("statSize");
  const statTime = document.getElementById("statTime");
  const mergeBtn = document.getElementById("mergeBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const copyInfoBtn = document.getElementById("copyInfoBtn");
  const progressWrap = document.getElementById("progressWrap");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  const resultBanner = document.getElementById("resultBanner");

  // ---- Helpers ----
  const genId = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  function formatBytes(bytes) {
    if (bytes === 0) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function showError(message) {
    fileError.textContent = message;
    if (message) {
      window.clearTimeout(showError._t);
      showError._t = window.setTimeout(() => { fileError.textContent = ""; }, 6000);
    }
  }

  function setBanner(kind, html) {
    resultBanner.hidden = false;
    resultBanner.className = `result-banner ${kind}`;
    resultBanner.innerHTML = html;
  }
  function clearBanner() {
    resultBanner.hidden = true;
    resultBanner.innerHTML = "";
  }

  /** Reads the first bytes of a file to confirm the %PDF- magic header. */
  function looksLikePdf(bytes) {
    const header = String.fromCharCode(...bytes.slice(0, 5));
    return header === "%PDF-";
  }

  function isDuplicate(file) {
    return entries.some(e => e.name === file.name && e.size === file.size);
  }

  // ---- Rendering ----
  function fileIconSvg() {
    return `<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 3h11l7 7v18a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z" fill="currentColor" opacity="0.15"/>
      <path d="M19 3v7h7" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 3h11l7 7v18a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z" fill="none" stroke="currentColor" stroke-width="1.6"/>
    </svg>`;
  }

  function render() {
    // Summary
    toolSummary.hidden = entries.length === 0;
    toolActions.hidden = entries.length === 0;

    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const knownPages = entries.every(e => e.pages !== null && e.status === "ready");
    const totalPages = entries.reduce((sum, e) => sum + (e.pages || 0), 0);

    statCount.textContent = String(entries.length);
    statPages.textContent = knownPages ? String(totalPages) : "…";
    statSize.textContent = formatBytes(totalSize);
    // Rough estimate: ~120ms base per file + ~4ms per page, floored at 1s display
    const estMs = entries.length * 120 + totalPages * 4;
    statTime.textContent = `~${Math.max(1, Math.round(estMs / 100) / 10)}s`;

    const readyCount = entries.filter(e => e.status === "ready").length;
    mergeBtn.disabled = readyCount < 2 || isMerging;
    mergeBtn.textContent = isMerging ? "Merging…" : "Merge PDFs";

    // List
    fileListEl.innerHTML = "";
    entries.forEach((entry, index) => {
      const li = document.createElement("li");
      li.className = "file-item";
      li.draggable = true;
      li.dataset.id = entry.id;
      li.setAttribute("aria-label", `${entry.name}, position ${index + 1} of ${entries.length}`);

      const pagesLabel = entry.status === "reading" ? "Reading…" : entry.status === "error" ? "Not a valid PDF" : `${entry.pages} pages`;

      li.innerHTML = `
        <span class="file-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
        <span class="file-icon">${fileIconSvg()}</span>
        <span class="file-meta">
          <span class="file-name">${index + 1}. ${escapeHtml(entry.name)}</span>
          <span class="file-sub">
            <span>${formatBytes(entry.size)}</span>
            <span>${pagesLabel}</span>
          </span>
        </span>
        <span class="file-order-controls">
          <button type="button" class="icon-btn move-up" title="Move up" aria-label="Move ${escapeHtml(entry.name)} up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="icon-btn move-down" title="Move down" aria-label="Move ${escapeHtml(entry.name)} down" ${index === entries.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="icon-btn remove" title="Remove" aria-label="Remove ${escapeHtml(entry.name)}">✕</button>
        </span>
      `;

      li.querySelector(".move-up").addEventListener("click", () => moveEntry(entry.id, -1));
      li.querySelector(".move-down").addEventListener("click", () => moveEntry(entry.id, 1));
      li.querySelector(".remove").addEventListener("click", () => removeEntry(entry.id));

      attachDragHandlers(li, entry.id);
      fileListEl.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Mutations ----
  function moveEntry(id, delta) {
    const i = entries.findIndex(e => e.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= entries.length) return;
    [entries[i], entries[j]] = [entries[j], entries[i]];
    render();
    focusHandleFor(id);
  }

  function focusHandleFor(id) {
    const li = fileListEl.querySelector(`[data-id="${id}"]`);
    if (li) {
      const btn = li.querySelector(".move-up:not(:disabled)") || li.querySelector(".move-down:not(:disabled)");
      if (btn) btn.focus();
    }
  }

  function removeEntry(id) {
    entries = entries.filter(e => e.id !== id);
    clearBanner();
    render();
  }

  function clearAll() {
    entries = [];
    clearBanner();
    showError("");
    render();
  }

  async function addFiles(fileListRaw) {
    const files = Array.from(fileListRaw);
    if (!files.length) return;
    clearBanner();

    for (const file of files) {
      const isPdfExt = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
      if (!isPdfExt) {
        showError(`"${file.name}" was skipped — only PDF files are supported.`);
        continue;
      }
      if (isDuplicate(file)) {
        showError(`"${file.name}" is already in the list — duplicate skipped.`);
        continue;
      }

      const entry = { id: genId(), file, name: file.name, size: file.size, pages: null, status: "reading" };
      entries.push(entry);
      render();

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!looksLikePdf(bytes)) {
          entry.status = "error";
          showError(`"${file.name}" doesn't look like a valid PDF and was flagged.`);
        } else {
          const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          entry.pages = doc.getPageCount();
          entry.status = "ready";
        }
      } catch (err) {
        entry.status = "error";
        showError(`Couldn't read "${file.name}" — it may be encrypted or corrupted.`);
      }
      render();
    }
  }

  // ---- Drag & drop: upload ----
  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      if (evt === "dragleave" && e.target !== dropzone) return;
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", e => {
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = "";
  });

  // ---- Drag & drop: reordering the list ----
  let draggedId = null;
  function attachDragHandlers(li, id) {
    li.addEventListener("dragstart", () => {
      draggedId = id;
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      draggedId = null;
      fileListEl.querySelectorAll(".file-item").forEach(el => el.classList.remove("drag-over-top", "drag-over-bottom"));
    });
    li.addEventListener("dragover", e => {
      e.preventDefault();
      if (!draggedId || draggedId === id) return;
      const rect = li.getBoundingClientRect();
      const before = e.clientY - rect.top < rect.height / 2;
      li.classList.toggle("drag-over-top", before);
      li.classList.toggle("drag-over-bottom", !before);
    });
    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over-top", "drag-over-bottom");
    });
    li.addEventListener("drop", e => {
      e.preventDefault();
      li.classList.remove("drag-over-top", "drag-over-bottom");
      if (!draggedId || draggedId === id) return;
      const fromIndex = entries.findIndex(en => en.id === draggedId);
      let toIndex = entries.findIndex(en => en.id === id);
      const rect = li.getBoundingClientRect();
      const before = e.clientY - rect.top < rect.height / 2;
      if (!before) toIndex += 1;
      const [moved] = entries.splice(fromIndex, 1);
      if (fromIndex < toIndex) toIndex -= 1;
      entries.splice(toIndex, 0, moved);
      render();
    });
  }

  // ---- Actions ----
  clearAllBtn.addEventListener("click", clearAll);

  copyInfoBtn.addEventListener("click", async () => {
    const lines = entries.map((e, i) =>
      `${i + 1}. ${e.name} — ${formatBytes(e.size)}${e.pages !== null ? ` — ${e.pages} pages` : ""}`
    );
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      const original = copyInfoBtn.textContent;
      copyInfoBtn.textContent = "Copied!";
      window.setTimeout(() => { copyInfoBtn.textContent = original; }, 1800);
    } catch {
      showError("Couldn't copy to clipboard in this browser.");
    }
  });

  mergeBtn.addEventListener("click", async () => {
    const readyEntries = entries.filter(e => e.status === "ready");
    if (readyEntries.length < 2) return;

    isMerging = true;
    clearBanner();
    progressWrap.hidden = false;
    progressFill.style.width = "4%";
    progressLabel.textContent = "Preparing…";
    render();

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      for (let i = 0; i < readyEntries.length; i++) {
        const entry = readyEntries[i];
        progressLabel.textContent = `Merging ${i + 1} of ${readyEntries.length}: ${entry.name}`;
        const bytes = new Uint8Array(await entry.file.arrayBuffer());
        const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageIndices = src.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(src, pageIndices);
        copiedPages.forEach(page => mergedPdf.addPage(page));
        progressFill.style.width = `${Math.round(((i + 1) / readyEntries.length) * 92) + 4}%`;
      }

      progressLabel.textContent = "Finalizing document…";
      const mergedBytes = await mergedPdf.save();
      progressFill.style.width = "100%";

      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const totalPages = mergedPdf.getPageCount();

      setBanner("success", `
        <span>✅ Merged ${readyEntries.length} PDFs into one ${totalPages}-page document (${formatBytes(blob.size)}).</span>
        <a class="btn btn-primary btn-small" href="${url}" download="merged-document.pdf">Download PDF</a>
      `);
    } catch (err) {
      setBanner("error", `⚠️ Something went wrong while merging: ${escapeHtml(err.message || "unknown error")}. Please try again.`);
    } finally {
      isMerging = false;
      progressWrap.hidden = true;
      progressFill.style.width = "0%";
      render();
    }
  });

  render();
})();
