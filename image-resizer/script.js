/* ==========================================================================
   Multi Tools — Image Resizer
   All processing happens locally via the Canvas API. No uploads, ever.
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- Element references ---------- */
  const dropzone       = document.getElementById("dropzone");
  const fileInput      = document.getElementById("fileInput");
  const compareWrap     = document.getElementById("compareWrap");
  const beforeImg       = document.getElementById("beforeImg");
  const afterImg        = document.getElementById("afterImg");
  const beforeMeta      = document.getElementById("beforeMeta");
  const afterMeta       = document.getElementById("afterMeta");

  const controlsPanel   = document.getElementById("controlsPanel");
  const segButtons      = document.querySelectorAll(".segmented-btn");
  const pixelInputs     = document.getElementById("pixelInputs");
  const percentInputs   = document.getElementById("percentInputs");
  const widthInput      = document.getElementById("widthInput");
  const heightInput     = document.getElementById("heightInput");
  const lockRatio       = document.getElementById("lockRatio");
  const percentInput    = document.getElementById("percentInput");
  const percentOutput   = document.getElementById("percentOutput");
  const presetSelect    = document.getElementById("presetSelect");
  const formatSelect    = document.getElementById("formatSelect");
  const qualityInput    = document.getElementById("qualityInput");
  const qualityOutput   = document.getElementById("qualityOutput");
  const smoothingToggle = document.getElementById("smoothingToggle");

  const statOriginal    = document.getElementById("statOriginal");
  const statNew         = document.getElementById("statNew");
  const statEstimate    = document.getElementById("statEstimate");

  const downloadBtn     = document.getElementById("downloadBtn");
  const clearBtn        = document.getElementById("clearBtn");
  const resetBtn        = document.getElementById("resetBtn");
  const copyDimBtn      = document.getElementById("copyDimBtn");
  const statusMsg       = document.getElementById("statusMsg");

  const ACCEPTED_TYPES = ["image/jpeg","image/png","image/webp","image/gif","image/bmp"];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  /** Mutable state for the currently loaded image */
  let state = {
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    originalFileSize: 0,
    originalFileName: "image",
    mode: "pixels",          // 'pixels' | 'percent'
    ratioLocked: true,
    renderedBlob: null,
    renderedUrl: null,
  };

  let debounceTimer = null;

  /* ---------------- Helpers ---------------- */

  const bytesToLabel = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const setStatus = (message, isError = false) => {
    statusMsg.textContent = message;
    statusMsg.dataset.error = String(isError);
  };

  const enableControls = (enabled) => {
    controlsPanel.setAttribute("aria-disabled", String(!enabled));
    [widthInput, heightInput, percentInput, presetSelect, formatSelect,
     qualityInput, smoothingToggle, downloadBtn].forEach(el => { el.disabled = !enabled; });
  };

  /* ---------------- File loading ---------------- */

  const handleFile = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
      setStatus("Unsupported file type. Please choose a JPG, PNG, WEBP, GIF or BMP image.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        state.originalWidth = img.naturalWidth;
        state.originalHeight = img.naturalHeight;
        state.originalFileSize = file.size;
        state.originalFileName = file.name.replace(/\.[^.]+$/, "") || "image";

        beforeImg.src = e.target.result;
        beforeImg.alt = `Original image, ${img.naturalWidth} by ${img.naturalHeight} pixels`;
        beforeMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${bytesToLabel(file.size)}`;

        widthInput.value = img.naturalWidth;
        heightInput.value = img.naturalHeight;
        percentInput.value = 100;
        percentOutput.textContent = "100%";
        presetSelect.value = "";

        compareWrap.classList.remove("is-hidden");
        enableControls(true);
        setStatus("Image loaded. Adjust dimensions to resize.");
        renderResize();
      };
      img.onerror = () => setStatus("Could not read this image file.", true);
      img.src = e.target.result;
    };
    reader.onerror = () => setStatus("Could not read this file.", true);
    reader.readAsDataURL(file);
  };

  /* ---------------- Drag & drop / click upload ---------------- */

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  });

  /* ---------------- Resize mode toggle ---------------- */

  segButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      segButtons.forEach(b => { b.classList.remove("is-active"); b.setAttribute("aria-checked","false"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-checked","true");
      state.mode = btn.dataset.mode;
      pixelInputs.classList.toggle("is-hidden", state.mode !== "pixels");
      percentInputs.classList.toggle("is-hidden", state.mode !== "percent");
      renderResize();
    });
  });

  /* ---------------- Aspect ratio lock ---------------- */

  lockRatio.addEventListener("click", () => {
    state.ratioLocked = !state.ratioLocked;
    lockRatio.classList.toggle("is-locked", state.ratioLocked);
    lockRatio.setAttribute("aria-pressed", String(state.ratioLocked));
    lockRatio.setAttribute("aria-label", state.ratioLocked
      ? "Aspect ratio locked. Click to unlock."
      : "Aspect ratio unlocked. Click to lock.");
  });

  widthInput.addEventListener("input", () => {
    if (!state.image) return;
    presetSelect.value = "";
    if (state.ratioLocked) {
      const ratio = state.originalHeight / state.originalWidth;
      const w = parseInt(widthInput.value, 10) || 0;
      heightInput.value = Math.round(w * ratio);
    }
    scheduleRender();
  });

  heightInput.addEventListener("input", () => {
    if (!state.image) return;
    presetSelect.value = "";
    if (state.ratioLocked) {
      const ratio = state.originalWidth / state.originalHeight;
      const h = parseInt(heightInput.value, 10) || 0;
      widthInput.value = Math.round(h * ratio);
    }
    scheduleRender();
  });

  percentInput.addEventListener("input", () => {
    percentOutput.textContent = `${percentInput.value}%`;
    scheduleRender();
  });

  /* ---------------- Presets ---------------- */

  presetSelect.addEventListener("change", () => {
    if (!presetSelect.value) return;
    const [w, h] = presetSelect.value.split("x").map(Number);
    state.mode = "pixels";
    segButtons.forEach(b => {
      const active = b.dataset.mode === "pixels";
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
    pixelInputs.classList.remove("is-hidden");
    percentInputs.classList.add("is-hidden");
    state.ratioLocked = false;
    lockRatio.classList.remove("is-locked");
    lockRatio.setAttribute("aria-pressed", "false");
    widthInput.value = w;
    heightInput.value = h;
    renderResize();
  });

  /* ---------------- Quality / format / smoothing ---------------- */

  qualityInput.addEventListener("input", () => {
    qualityOutput.textContent = `${qualityInput.value}%`;
    scheduleRender();
  });
  formatSelect.addEventListener("change", () => {
    const showQuality = formatSelect.value !== "image/png";
    qualityInput.disabled = !showQuality;
    scheduleRender();
  });
  smoothingToggle.addEventListener("change", scheduleRender);

  /* ---------------- Core resize + render ---------------- */

  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderResize, 180);
  }

  function computeTargetDimensions() {
    if (state.mode === "percent") {
      const pct = (parseFloat(percentInput.value) || 100) / 100;
      return {
        w: Math.max(1, Math.round(state.originalWidth * pct)),
        h: Math.max(1, Math.round(state.originalHeight * pct)),
      };
    }
    const w = Math.max(1, parseInt(widthInput.value, 10) || state.originalWidth);
    const h = Math.max(1, parseInt(heightInput.value, 10) || state.originalHeight);
    return { w, h };
  }

  function renderResize() {
    if (!state.image) return;
    const { w, h } = computeTargetDimensions();

    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = smoothingToggle.checked;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(state.image, 0, 0, w, h);

    const format = formatSelect.value;
    const quality = (parseInt(qualityInput.value, 10) || 90) / 100;

    canvas.toBlob((blob) => {
      if (!blob) { setStatus("Could not render this image.", true); return; }
      if (state.renderedUrl) URL.revokeObjectURL(state.renderedUrl);
      state.renderedBlob = blob;
      state.renderedUrl = URL.createObjectURL(blob);

      afterImg.src = state.renderedUrl;
      afterImg.alt = `Resized image, ${w} by ${h} pixels`;
      afterMeta.textContent = `${w} × ${h} · ${bytesToLabel(blob.size)}`;

      statOriginal.textContent = `${state.originalWidth} × ${state.originalHeight}`;
      statNew.textContent = `${w} × ${h}`;
      statEstimate.textContent = bytesToLabel(blob.size);

      downloadBtn.disabled = false;
    }, format, format === "image/png" ? undefined : quality);
  }

  /* ---------------- Actions ---------------- */

  downloadBtn.addEventListener("click", () => {
    if (!state.renderedBlob) return;
    const ext = formatSelect.value.split("/")[1].replace("jpeg", "jpg");
    const a = document.createElement("a");
    a.href = state.renderedUrl;
    a.download = `${state.originalFileName}-resized.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus("Image downloaded.");
  });

  copyDimBtn.addEventListener("click", async () => {
    const { w, h } = computeTargetDimensions();
    const text = `${w}x${h}`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copied "${text}" to clipboard.`);
    } catch {
      setStatus("Could not copy to clipboard.", true);
    }
  });

  resetBtn.addEventListener("click", () => {
    if (!state.image) return;
    widthInput.value = state.originalWidth;
    heightInput.value = state.originalHeight;
    percentInput.value = 100;
    percentOutput.textContent = "100%";
    presetSelect.value = "";
    qualityInput.value = 90;
    qualityOutput.textContent = "90%";
    formatSelect.value = "image/jpeg";
    smoothingToggle.checked = true;
    state.ratioLocked = true;
    lockRatio.classList.add("is-locked");
    lockRatio.setAttribute("aria-pressed", "true");
    renderResize();
    setStatus("Values reset to original.");
  });

  clearBtn.addEventListener("click", () => {
    state = {
      image: null, originalWidth: 0, originalHeight: 0, originalFileSize: 0,
      originalFileName: "image", mode: "pixels", ratioLocked: true,
      renderedBlob: null, renderedUrl: null,
    };
    fileInput.value = "";
    compareWrap.classList.add("is-hidden");
    enableControls(false);
    setStatus("");
    beforeImg.removeAttribute("src");
    afterImg.removeAttribute("src");
  });

  /* ---------------- Init ---------------- */
  enableControls(false);
})();
