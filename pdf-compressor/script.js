/* ==========================================================================
   Multi Tools — PDF Compressor
   Real, local PDF compression: embedded raster images are decoded and
   re-encoded as optimized JPEGs via pdf-lib + pako; the PDF is then
   rewritten with compact object streams. No file ever leaves the browser.
   ========================================================================== */
(() => {
  "use strict";

  const dropzone       = document.getElementById("dropzone");
  const fileInput      = document.getElementById("fileInput");
  const resultsList    = document.getElementById("resultsList");
  const statusMsg      = document.getElementById("statusMsg");
  const compressAllBtn = document.getElementById("compressAllBtn");
  const clearAllBtn    = document.getElementById("clearAllBtn");
  const segButtons     = document.querySelectorAll(".segmented-btn");
  const levelHint      = document.getElementById("levelHint");
  const themeToggle    = document.getElementById("themeToggle");
  const themeIconMoon  = document.getElementById("themeIconMoon");
  const themeIconSun   = document.getElementById("themeIconSun");
  const previewDialog  = document.getElementById("previewDialog");
  const previewFrame   = document.getElementById("previewFrame");
  const closePreview   = document.getElementById("closePreview");

  const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB warning threshold

  const LEVELS = {
    low:      { quality: 0.90, maxDim: 2200, hint: "Low: preserves near-original image sharpness, smaller size gains." },
    balanced: { quality: 0.75, maxDim: 1600, hint: "Balanced: strong size reduction with minimal visible quality loss." },
    high:     { quality: 0.50, maxDim: 1100, hint: "High: maximum size reduction, visible softening on dense images." },
  };
  let currentLevel = "balanced";

  let items = []; // queue of { id, file, status, originalSize, compressedBytes, compressedUrl, pageCount, version, ms, error }
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

  const escapeHtml = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  const refreshBulkButtons = () => {
    const hasQueued = items.some(r => r.status === "queued" || r.status === "error");
    const hasAny = items.length > 0;
    compressAllBtn.classList.toggle("is-hidden", !hasQueued);
    clearAllBtn.classList.toggle("is-hidden", !hasAny);
  };

  /* ---------------- Theme ---------------- */

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    themeIconMoon.classList.toggle("is-hidden", theme === "light");
    themeIconSun.classList.toggle("is-hidden", theme !== "light");
    try { localStorage.setItem("mt-theme", theme); } catch { /* ignore */ }
  };
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("mt-theme"); } catch { /* ignore */ }
    applyTheme(saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  })();
  themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
  });

  /* ---------------- Compression level selector ---------------- */

  segButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      segButtons.forEach(b => { b.classList.remove("is-active"); b.setAttribute("aria-checked", "false"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-checked", "true");
      currentLevel = btn.dataset.level;
      levelHint.textContent = LEVELS[currentLevel].hint;
    });
  });

  /* ---------------- PDF version detection ---------------- */

  function detectPdfVersion(bytes) {
    const head = new TextDecoder("latin1").decode(bytes.slice(0, 16));
    const match = head.match(/%PDF-(\d\.\d)/);
    return match ? match[1] : "Unknown";
  }

  /* ---------------- Core: image re-encode ---------------- */

  async function reencodeBitmap(bitmap, settings) {
    let { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest > settings.maxDim) {
      const scale = settings.maxDim / longest;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", settings.quality));
    if (!blob) throw new Error("Canvas encoding failed");
    return new Uint8Array(await blob.arrayBuffer());
  }

  function deref(context, value) {
    return value && value instanceof PDFLib.PDFRef ? context.lookup(value) : value;
  }

  /* ---------------- Core: real PDF compression ---------------- */

  async function compressPdfBytes(arrayBuffer, level, onProgress) {
    const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray } = PDFLib;
    const settings = LEVELS[level];
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    const pages = pdfDoc.getPages();

    // Collect every image XObject across every page (name -> {resources, ref})
    const jobs = [];
    for (const page of pages) {
      let resources;
      try { resources = page.node.Resources(); } catch { continue; }
      if (!(resources instanceof PDFDict)) continue;
      const xobjRaw = resources.get(PDFName.of("XObject"));
      const xobjects = deref(pdfDoc.context, xobjRaw);
      if (!(xobjects instanceof PDFDict)) continue;

      for (const key of xobjects.keys()) {
        const ref = xobjects.get(key);
        const stream = deref(pdfDoc.context, ref);
        if (!(stream instanceof PDFRawStream)) continue;
        const subtype = stream.dict.get(PDFName.of("Subtype"));
        if (!subtype || subtype.toString() !== "/Image") continue;
        jobs.push({ xobjects, key, stream });
      }
    }

    let done = 0;
    const total = Math.max(jobs.length, 1);
    onProgress(0.05);

    for (const job of jobs) {
      try {
        await processImageJob(pdfDoc, job, settings);
      } catch {
        // Leave this image untouched if it can't be safely re-encoded.
      }
      done += 1;
      onProgress(0.05 + (done / total) * 0.85);
    }

    onProgress(0.93);
    const outBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
    onProgress(1);
    return { outBytes, pageCount: pages.length };
  }

  async function processImageJob(pdfDoc, job, settings) {
    const { PDFName, PDFArray } = PDFLib;
    const { xobjects, key, stream } = job;
    const dict = stream.dict;

    const filterRaw = dict.get(PDFName.of("Filter"));
    const filters = !filterRaw ? []
      : filterRaw instanceof PDFArray ? filterRaw.asArray().map(f => f.toString())
      : [filterRaw.toString()];

    const hasSMask = !!dict.get(PDFName.of("SMask")) || !!dict.get(PDFName.of("Mask"));
    let bitmap = null;

    if (filters.includes("/DCTDecode")) {
      // Contents are already a valid JPEG byte stream.
      const blob = new Blob([stream.contents], { type: "image/jpeg" });
      bitmap = await createImageBitmap(blob);
    } else if (!hasSMask && filters.every(f => f === "/FlateDecode")) {
      const widthObj = dict.get(PDFName.of("Width"));
      const heightObj = dict.get(PDFName.of("Height"));
      const bpcObj = dict.get(PDFName.of("BitsPerComponent"));
      const width = widthObj ? widthObj.asNumber() : 0;
      const height = heightObj ? heightObj.asNumber() : 0;
      const bpc = bpcObj ? bpcObj.asNumber() : 8;
      const csObj = dict.get(PDFName.of("ColorSpace"));
      const cs = csObj ? csObj.toString() : "";

      if (!width || !height || bpc !== 8) return; // unsupported, leave as-is
      let channels = 0;
      if (cs.includes("DeviceRGB") || cs.includes("CalRGB")) channels = 3;
      else if (cs.includes("DeviceGray") || cs.includes("CalGray")) channels = 1;
      else return; // CMYK / Indexed / ICC-unknown: leave untouched for safety

      let raw = stream.contents;
      if (filters.includes("/FlateDecode")) raw = window.pako.inflate(raw);
      if (raw.length < width * height * channels) return;

      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let p = 0, s = 0; p < width * height; p++, s += channels) {
        if (channels === 3) {
          rgba[p * 4] = raw[s]; rgba[p * 4 + 1] = raw[s + 1]; rgba[p * 4 + 2] = raw[s + 2];
        } else {
          rgba[p * 4] = rgba[p * 4 + 1] = rgba[p * 4 + 2] = raw[s];
        }
        rgba[p * 4 + 3] = 255;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").putImageData(new ImageData(rgba, width, height), 0, 0);
      bitmap = await createImageBitmap(canvas);
    } else {
      return; // Unsupported filter (e.g. JPX/CCITT) — leave untouched.
    }

    const jpegBytes = await reencodeBitmap(bitmap, settings);
    bitmap.close?.();
    const embedded = await pdfDoc.embedJpg(jpegBytes);
    xobjects.set(key, embedded.ref);
  }

  /* ---------------- Queue item lifecycle ---------------- */

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter(f =>
      f.type === "application/pdf" || /\.pdf$/i.test(f.name)
    );
    if (!files.length) {
      setStatus("No supported PDF files were found.", true);
      return;
    }
    files.forEach(file => {
      if (file.size > MAX_FILE_BYTES) {
        setStatus(`${file.name} is over 100 MB — it may take longer or fail to process.`, true);
      }
      const id = `pdf-${++uid}`;
      const record = { id, file, status: "queued", originalSize: file.size, level: currentLevel };
      items.unshift(record);
      resultsList.prepend(buildCard(record));
    });
    refreshBulkButtons();
    setStatus(`${files.length} file${files.length > 1 ? "s" : ""} added to the queue.`);
  }

  async function runCompression(record) {
    record.status = "processing";
    record.error = null;
    updateCard(record, 2);
    const startTime = performance.now();
    try {
      const buffer = await record.file.arrayBuffer();
      const bytesView = new Uint8Array(buffer.slice(0, 16));
      record.version = detectPdfVersion(bytesView);

      const { outBytes, pageCount } = await compressPdfBytes(buffer, record.level, (p) => updateCard(record, Math.round(p * 100)));

      record.pageCount = pageCount;
      record.compressedBytes = outBytes;
      record.compressedSize = outBytes.byteLength;
      record.compressedBlob = new Blob([outBytes], { type: "application/pdf" });
      record.compressedUrl = URL.createObjectURL(record.compressedBlob);
      record.ms = Math.round(performance.now() - startTime);
      record.status = "done";
      setStatus(`Compressed ${record.file.name}.`);
    } catch (err) {
      record.status = "error";
      record.error = "Could not compress this PDF. It may be encrypted or malformed.";
      setStatus(`Failed to compress ${record.file.name}.`, true);
    }
    updateCard(record, 100);
    refreshBulkButtons();
  }

  /* ---------------- Card rendering ---------------- */

  function badgeFor(status) {
    return { queued: "Queued", processing: "Compressing…", done: "Done", error: "Error" }[status] || status;
  }

  function buildCard(record) {
    const li = document.createElement("li");
    li.className = "result-card";
    li.id = record.id;
    li.innerHTML = cardHtml(record, 0);
    return li;
  }

  function cardHtml(record, progressPct) {
    const savedPct = record.compressedSize
      ? Math.max(0, Math.round((1 - record.compressedSize / record.originalSize) * 100))
      : null;
    const savedBytes = record.compressedSize ? Math.max(0, record.originalSize - record.compressedSize) : null;

    return `
      <div class="result-head">
        <p class="result-name">${escapeHtml(record.file.name)}</p>
        <span class="result-badge badge-${record.status}">${badgeFor(record.status)}</span>
      </div>
      ${record.status === "processing" ? `<div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>` : ""}
      ${record.error ? `<p class="result-error-msg">${escapeHtml(record.error)}</p>` : ""}
      <dl class="result-stats">
        <div><dt>Original size</dt><dd>${bytesToLabel(record.originalSize)}</dd></div>
        <div><dt>Compressed size</dt><dd>${record.compressedSize != null ? bytesToLabel(record.compressedSize) : "—"}</dd></div>
        <div><dt>Space saved</dt><dd class="${savedPct ? "stat-positive" : ""}">${savedPct != null ? `${savedPct}% (${bytesToLabel(savedBytes)})` : "—"}</dd></div>
        <div><dt>Pages</dt><dd>${record.pageCount ?? "—"}</dd></div>
        <div><dt>PDF version</dt><dd>${record.version ?? "—"}</dd></div>
        <div><dt>Processing time</dt><dd>${record.ms != null ? `${record.ms} ms` : "—"}</dd></div>
      </dl>
      <div class="result-actions">
        ${record.status === "queued" ? `<button type="button" class="btn btn-primary btn-sm" data-action="compress">Compress</button>` : ""}
        ${record.status === "error" ? `<button type="button" class="btn btn-primary btn-sm" data-action="retry">Retry</button>` : ""}
        ${record.status === "done" ? `<button type="button" class="btn btn-primary btn-sm" data-action="download">Download compressed PDF</button>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-action="preview">Preview</button>
        ${record.status === "done" ? `<button type="button" class="btn btn-ghost btn-sm" data-action="copy">Copy stats</button>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-action="replace">Replace file</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="remove">Remove</button>
      </div>`;
  }

  function updateCard(record, progressPct) {
    const li = document.getElementById(record.id);
    if (li) li.innerHTML = cardHtml(record, progressPct);
  }

  /* ---------------- Card actions (event delegation) ---------------- */

  resultsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = e.target.closest(".result-card");
    const record = items.find(r => r.id === card.id);
    if (!record) return;

    switch (btn.dataset.action) {
      case "compress":
      case "retry":
        record.level = currentLevel;
        await runCompression(record);
        break;
      case "download": {
        const a = document.createElement("a");
        a.href = record.compressedUrl;
        a.download = record.file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
        document.body.appendChild(a); a.click(); a.remove();
        setStatus(`Downloaded ${a.download}.`);
        break;
      }
      case "preview": {
        const url = record.compressedUrl || URL.createObjectURL(record.file);
        previewFrame.src = url;
        previewDialog.classList.remove("is-hidden");
        closePreview.focus();
        break;
      }
      case "copy": {
        const savedPct = Math.max(0, Math.round((1 - record.compressedSize / record.originalSize) * 100));
        const text = `${record.file.name} — Original: ${bytesToLabel(record.originalSize)}, Compressed: ${bytesToLabel(record.compressedSize)}, Saved: ${savedPct}%, Pages: ${record.pageCount}, PDF version: ${record.version}, Time: ${record.ms} ms`;
        try { await navigator.clipboard.writeText(text); setStatus("Compression statistics copied."); }
        catch { setStatus("Could not copy to clipboard.", true); }
        break;
      }
      case "replace": {
        const picker = document.createElement("input");
        picker.type = "file"; picker.accept = "application/pdf,.pdf";
        picker.addEventListener("change", () => {
          if (!picker.files[0]) return;
          record.file = picker.files[0];
          record.originalSize = picker.files[0].size;
          record.status = "queued";
          record.compressedBytes = null; record.compressedSize = null;
          record.compressedUrl = null; record.error = null;
          updateCard(record, 0);
          refreshBulkButtons();
          setStatus(`Replaced with ${record.file.name}.`);
        });
        picker.click();
        break;
      }
      case "remove":
        items = items.filter(r => r.id !== record.id);
        card.remove();
        refreshBulkButtons();
        break;
    }
  });

  /* ---------------- Preview dialog ---------------- */

  function shutPreview() {
    previewDialog.classList.add("is-hidden");
    previewFrame.src = "";
  }
  closePreview.addEventListener("click", shutPreview);
  previewDialog.addEventListener("click", (e) => { if (e.target === previewDialog) shutPreview(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !previewDialog.classList.contains("is-hidden")) shutPreview(); });

  /* ---------------- Bulk actions ---------------- */

  compressAllBtn.addEventListener("click", async () => {
    const queue = items.filter(r => r.status === "queued" || r.status === "error");
    for (const record of queue) {
      record.level = currentLevel;
      await runCompression(record);
    }
  });

  clearAllBtn.addEventListener("click", () => {
    items.forEach(r => { if (r.compressedUrl) URL.revokeObjectURL(r.compressedUrl); });
    items = [];
    resultsList.innerHTML = "";
    refreshBulkButtons();
    setStatus("Cleared all files.");
  });

  /* ---------------- Upload interactions ---------------- */

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", (e) => { addFiles(e.target.files); fileInput.value = ""; });

  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); })
  );
  dropzone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  /* ---------------- Library availability check ---------------- */

  window.addEventListener("load", () => {
    if (!window.PDFLib || !window.pako) {
      setStatus("Could not load required libraries. Check your internet connection and reload.", true);
    }
  });

  refreshBulkButtons();
})();
