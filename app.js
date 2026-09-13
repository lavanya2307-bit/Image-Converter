const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const KEYS = {
  profile: "image_converter_profile",
  theme: "image_converter_theme"
};

const S = {
  profile: JSON.parse(localStorage.getItem(KEYS.profile) || "null"),
  theme: localStorage.getItem(KEYS.theme) || "dark",
  view: "guide",
  files: [],
  pdfFiles: [],
  mergeFiles: [],
  zipEntries: [],
  zipName: "",
  selectedOutput: "PNG",
  selectedResolution: "1080p",
  selectedPage: "A4",
  orientation: "Auto",
  quality: 92,
  targetQuality: 82,
};

document.body.classList.toggle("light", S.theme === "light");

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
}[c]));

const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2300);
}

function saveTheme() {
  localStorage.setItem(KEYS.theme, S.theme);
}

function applyProfile() {
  if (!S.profile) {
    $("#onboarding").classList.remove("hidden");
    $("#app").classList.add("hidden");
    return;
  }

  $("#onboarding").classList.add("hidden");
  $("#app").classList.remove("hidden");

  const initial = (S.profile.name || "U").charAt(0).toUpperCase();
  $("#avatar").textContent = initial;
  $("#topAvatar").textContent = initial;
  $("#sideName").textContent = S.profile.name;
  $("#sideEmail").textContent = S.profile.email;
  $("#topName").textContent = S.profile.name;

  render();
}

$("#profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = $("#name").value.trim();
  const email = $("#email").value.trim().toLowerCase();
  const button = $("#profileForm button[type=submit]");

  if (!name) {
    toast("Please enter your name.");
    $("#name").focus();
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast("Please enter a valid email.");
    $("#email").focus();
    return;
  }

  button.disabled = true;
  button.innerHTML = 'Opening workspace <span>→</span>';

  // Save locally first so Continue always opens the app immediately.
  const localProfile = { name, email };
  S.profile = localProfile;
  localStorage.setItem(KEYS.profile, JSON.stringify(localProfile));
  applyProfile();

  // Sync the registration with the server in the background.
  try {
    const r = await fetch("/api/register", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, email })
    });

    const data = await r.json().catch(() => ({}));
    if (r.ok && data.user) {
      S.profile = data.user;
      localStorage.setItem(KEYS.profile, JSON.stringify(S.profile));
      applyProfile();
    } else if (!r.ok) {
      console.warn("Registration sync failed:", data.error || r.statusText);
    }
  } catch (error) {
    // The UI remains usable even if the local development server is unavailable.
    console.warn("Registration server unavailable:", error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Continue <span>→</span>';
  }
});

$("#themeBtn").addEventListener("click", () => {
  S.theme = S.theme === "dark" ? "light" : "dark";
  document.body.classList.toggle("light", S.theme === "light");
  saveTheme();
});

$("#profileBtn").addEventListener("click", () => {
  if (confirm("Sign out from this browser? Your saved workspace details remain available on this device.")) {
    localStorage.removeItem(KEYS.profile);
    location.reload();
  }
});

$$(".nav").forEach(btn => {
  btn.addEventListener("click", () => {
    S.view = btn.dataset.view;
    $$(".nav").forEach(x => x.classList.toggle("active", x === btn));
    render();
  });
});

function setTitle(title) {
  $("#pageTitle").textContent = title;
}

function render() {
  if (S.view === "guide") return renderGuide();
  if (S.view === "convert") return renderConvert();
  if (S.view === "image-pdf") return renderImagePdf();
  if (S.view === "merge") return renderPdfMerge();
  if (S.view === "hd") return renderHd();
  if (S.view === "zip") return renderZip();
}

function renderGuide() {
  setTitle("Guide");
  $("#content").innerHTML = `
    <section class="hero guide-hero">
      <div>
        <div class="eyebrow">WELCOME TO IMAGE CONVERTER</div>
        <h1>Your files.<br><span class="gradient">Your workflow.</span></h1>
        <p class="muted">Convert images, create PDFs, improve resolution, and inspect ZIP files in one clean workspace.</p>
      </div>
      <div class="hero-art" aria-hidden="true">✦</div>
    </section>

    <section class="guide-section">
      <div class="section-head"><div><div class="eyebrow">HOW TO USE</div><h2>Choose a tool from the left</h2></div></div>
      <div class="guide-grid">
        <article class="guide-card"><span class="guide-number">01</span><h3>Convert</h3><p>Convert supported images to JPG, JPEG, PNG, or WEBP. Multiple results can be downloaded together as a ZIP.</p></article>
        <article class="guide-card"><span class="guide-number">02</span><h3>Image to PDF</h3><p>Add multiple images, arrange their order, choose the page format, and create one PDF.</p></article>
        <article class="guide-card"><span class="guide-number">03</span><h3>PDF Merge</h3><p>Combine multiple PDF files, reorder them, and download one merged document.</p></article>
        <article class="guide-card"><span class="guide-number">04</span><h3>HD Quality</h3><p>Resize an image to 1080p, 2K, 4K, or a custom pixel size while keeping the original untouched.</p></article>
        <article class="guide-card"><span class="guide-number">05</span><h3>ZIP Viewer</h3><p>Open ZIP archives or inspect a folder, preview supported images, and download files individually.</p></article>
      </div>
    </section>

    <section class="guide-how panel">
      <div><div class="eyebrow">GOOD TO KNOW</div><h2>Why use this workspace?</h2></div>
      <div class="guide-points">
        <div><strong>Drag & drop</strong><span>Use drag-and-drop or Browse to add files.</span></div>
        <div><strong>Private processing</strong><span>Conversion and PDF processing happen in your browser.</span></div>
        <div><strong>Originals stay safe</strong><span>Your source files are kept untouched; results are new downloads.</span></div>
        <div><strong>Works everywhere</strong><span>The layout adapts to desktop, tablet, and mobile screens.</span></div>
      </div>
    </section>`;
}

function mountUpload(container, onFiles, options = {}) {
  const accept = options.accept || "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif";
  const title = options.title || "Drop your files here";
  const subtitle = options.subtitle || "or choose files from your device";
  const browseLabel = options.browseLabel || "Browse files";
  const badges = options.badges || ["JPG", "PNG", "WEBP", "GIF", "BMP", "SVG", "AVIF"];
  const multiple = options.multiple !== false;
  const allowFolder = options.allowFolder === true;
  const folderLabel = options.folderLabel || "Choose folder";
  const inputId = `upload-${Math.random().toString(36).slice(2)}`;
  const folderInputId = `${inputId}-folder`;

  container.innerHTML = `
    <div class="upload-zone" id="${inputId}-zone">
      <div class="upload-inner">
        <div class="upload-icon">☁</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
        <input id="${inputId}" type="file" hidden ${multiple ? "multiple" : ""} accept="${escapeHtml(accept)}" />
        ${allowFolder ? `<input id="${folderInputId}" type="file" hidden webkitdirectory directory />` : ""}
        <div class="upload-actions">
          <button class="primary" type="button" id="${inputId}-browse">${escapeHtml(browseLabel)}</button>
          ${allowFolder ? `<button class="ghost" type="button" id="${inputId}-folder">${escapeHtml(folderLabel)}</button>` : ""}
        </div>
        <div class="format-row">${badges.map(x => `<span class="badge">${escapeHtml(x)}</span>`).join("")}</div>
        ${options.helper ? `<div class="upload-helper">${escapeHtml(options.helper)}</div>` : ""}
      </div>
    </div>`;

  const zone = container.querySelector(`#${inputId}-zone`);
  const input = container.querySelector(`#${inputId}`);
  const browse = container.querySelector(`#${inputId}-browse`);
  const folderInput = allowFolder ? container.querySelector(`#${folderInputId}`) : null;
  const folderButton = allowFolder ? container.querySelector(`#${inputId}-folder`) : null;

  const handleFiles = (fileList, source = "file") => {
    const files = [...fileList];
    // Folder selection intentionally bypasses the normal file-type filter.
    const filtered = source === "folder"
      ? files.filter(file => file && !file.name.endsWith("/"))
      : (options.filter ? options.filter(files) : normalizeImageFiles(files));
    if (!filtered.length) {
      toast(options.emptyMessage || "No supported files were found.");
      return;
    }
    if (filtered.length < files.length && options.rejectMessage) {
      const rejected = files.filter(f => !filtered.includes(f));
      toast(`${options.rejectMessage} Rejected: ${rejected.slice(0,3).map(f => f.name).join(", ")}${rejected.length > 3 ? "…" : ""}`);
    }
    onFiles(multiple ? filtered : filtered.slice(0, 1), source);
  };

  browse.addEventListener("click", e => { e.stopPropagation(); input.click(); });
  if (folderButton) folderButton.addEventListener("click", e => { e.stopPropagation(); folderInput.click(); });
  zone.addEventListener("click", e => { if (!e.target.closest("button")) input.click(); });
  ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, e => {
    e.preventDefault(); e.stopPropagation(); zone.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach(type => zone.addEventListener(type, e => {
    e.preventDefault(); e.stopPropagation(); zone.classList.remove("drag");
  }));
  zone.addEventListener("drop", e => handleFiles(e.dataTransfer.files, "drop"));
  input.addEventListener("change", () => { handleFiles(input.files, "file"); input.value = ""; });
  if (folderInput) folderInput.addEventListener("change", () => { handleFiles(folderInput.files, "folder"); folderInput.value = ""; });
}

function chooseFiles({multiple = true, accept = "*/*", filter = normalizeImageFiles, onAccepted, onRejected, emptyMessage = "No supported files were selected."} = {}) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;
  input.accept = accept;
  input.style.display = "none";
  document.body.appendChild(input);

  input.addEventListener("change", () => {
    const selected = [...input.files];
    const accepted = filter(selected);
    const rejected = selected.filter(file => !accepted.includes(file));

    input.remove();

    if (!accepted.length) {
      const message = rejected.length
        ? (onRejected ? onRejected(rejected) : emptyMessage)
        : emptyMessage;
      toast(message);
      return;
    }

    if (rejected.length && onRejected) toast(onRejected(rejected));
    onAccepted(accepted);
  }, {once: true});

  input.click();
}

function normalizePdfFiles(files) {
  return files.filter(file => file.type === "application/pdf" || /\.pdf$/i.test(file.name));
}

function normalizeImageFiles(files) {
  const browserImageExts = new Set(["jpg","jpeg","png","webp","gif","bmp","svg","avif"]);
  const browserImageMimes = new Set(["image/jpeg","image/png","image/webp","image/gif","image/bmp","image/svg+xml","image/avif"]);
  return files.filter(file => {
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    return browserImageExts.has(ext) || browserImageMimes.has(file.type);
  });
}

function renderConvert() {
  setTitle("Convert");

  $("#content").innerHTML = `
    <div class="eyebrow">FORMAT CONVERSION</div>
    <h1>Convert images</h1>
    <p class="muted">Convert as many JPG, JPEG, PNG and WEBP images as you need.</p>
    <div id="convertArea"></div>
  `;

  const area = $("#convertArea");

  if (!S.files.length) {
    mountUpload(area, files => {
      S.files = files;
      renderConvert();
    });
    return;
  }

  area.innerHTML = `
    <div class="workspace">
      <div class="panel">
        <div class="section-head" style="margin-top:0">
          <h2>${S.files.length} image${S.files.length === 1 ? "" : "s"} selected</h2>
          <button class="ghost" id="replaceFiles">Choose different files</button>
        </div>
        <div class="file-list" id="convertFileList"></div>
      </div>

      <div class="panel">
        <div class="eyebrow">OUTPUT</div>
        <h2>Choose format</h2>

        <div class="setting">
          <label>Convert to</label>
          <div class="chips" id="formatChips">
            ${["JPG","JPEG","PNG","WEBP"].map(x =>
              `<button class="chip ${S.selectedOutput === x ? "selected" : ""}" data-format="${x}">${x}</button>`
            ).join("")}
          </div>
        </div>

        <div class="setting">
          <label>Quality <span id="qualityValue">${S.quality}%</span></label>
          <input class="range" id="qualityRange" type="range" min="10" max="100" value="${S.quality}">
        </div>

        <div class="notice">Original files are not overwritten. Every converted file is created as a new download.</div>

        <button class="primary wide" id="convertAll">Convert all →</button>
        <div id="convertResult"></div>
      </div>
    </div>
  `;

  renderFileRows($("#convertFileList"), S.files, "convert");
  bindRenameButtons($("#convertFileList"), S.files);

  $("#replaceFiles").addEventListener("click", () => {
    chooseFiles({
      multiple: true,
      accept: "*/*",
      filter: normalizeImageFiles,
      emptyMessage: "No image files were selected. Supported: JPG, JPEG, PNG, WEBP, GIF, BMP, SVG and AVIF.",
      onRejected: rejected => `Image Converter rejected ${rejected.length} unsupported file${rejected.length === 1 ? "" : "s"}. Supported image types only.`,
      onAccepted: files => { S.files = files; renderConvert(); }
    });
  });

  $$("#formatChips .chip").forEach(btn => {
    btn.addEventListener("click", () => {
      S.selectedOutput = btn.dataset.format;
      $$("#formatChips .chip").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  $("#qualityRange").addEventListener("input", (e) => {
    S.quality = Number(e.target.value);
    $("#qualityValue").textContent = `${S.quality}%`;
  });

  $("#convertAll").addEventListener("click", () => convertAll());
}

function renderFileRows(container, files, mode) {
  container.innerHTML = files.map((file, index) => `
    <div class="file-row" data-index="${index}">
      <div class="file-thumb" id="${mode}-thumb-${index}">⌁</div>
      <div class="file-info">
        <strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong>
        <small>${formatBytes(file.size)}</small>
      </div>
      <div class="file-actions">
        <button class="mini-btn rename-btn" data-index="${index}">Rename</button>
        <button class="mini-btn remove-btn" data-index="${index}">Remove</button>
      </div>
    </div>
  `).join("");

  files.forEach((file, index) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const thumb = container.querySelector(`#${mode}-thumb-${index}`);
      thumb.innerHTML = `<img src="${url}" alt="">`;
    }
  });

  $$(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      files.splice(Number(btn.dataset.index), 1);
      if (mode === "convert") S.files = files;
      if (mode === "pdf") S.pdfFiles = files;
      render();
    });
  });
}

function bindRenameButtons(container, files) {
  container.querySelectorAll(".rename-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      const row = container.querySelector(`.file-row[data-index="${index}"]`);
      const info = row.querySelector(".file-info");
      const oldName = files[index].name;
      const ext = oldName.includes(".") ? "." + oldName.split(".").pop() : "";
      const base = oldName.replace(/\.[^.]+$/, "");

      info.innerHTML = `
        <input class="rename-input" value="${escapeHtml(base)}" />
        <small>Extension ${escapeHtml(ext || "none")} stays automatically.</small>
      `;

      const input = info.querySelector("input");
      input.focus();
      input.select();

      btn.textContent = "Save";
      btn.onclick = () => {
        const newBase = input.value.trim().replace(/[\\/:*?"<>|]/g, "_");
        if (!newBase) return toast("Enter a filename.");
        const newName = newBase + ext;
        files[index] = new File([files[index]], newName, {type: files[index].type});
        render();
      };
    });
  });
}

async function convertAll() {
  const btn = $("#convertAll");
  btn.disabled = true;
  btn.textContent = "Converting…";

  try {
    const outputs = [];
    for (const file of S.files) {
      const out = await convertImage(file, S.selectedOutput, S.quality / 100);
      outputs.push(out);
    }

    const result = $("#convertResult");
    result.innerHTML = `
      <div class="result">
        <div class="result-grid">
          <div class="result-box"><small>Files</small><strong>${outputs.length}</strong></div>
          <div class="result-box"><small>Format</small><strong>${S.selectedOutput}</strong></div>
          <div class="result-box"><small>Output</small><strong>${formatBytes(outputs.reduce((n,x)=>n+x.blob.size,0))}</strong></div>
        </div>
        <button class="primary wide" id="downloadConverted">Download all</button>
      </div>
    `;

    $("#downloadConverted").addEventListener("click", async () => {
      const downloadButton = $("#downloadConverted");
      downloadButton.disabled = true;
      try {
        if (outputs.length === 1) {
          downloadBlob(outputs[0].blob, outputs[0].name);
          return;
        }
        if (!window.JSZip) throw new Error("ZIP engine is unavailable.");
        const archive = new JSZip();
        outputs.forEach(out => archive.file(out.name, out.blob));
        const zipBlob = await archive.generateAsync({type: "blob", compression: "DEFLATE", compressionOptions: {level: 6}});
        downloadBlob(zipBlob, "converted-images.zip");
      } catch (error) {
        console.error(error);
        toast("Could not prepare the download package.");
      } finally {
        downloadButton.disabled = false;
      }
    });

    const names = outputs.map(x => x.name).join(", ");
    await logActivity("Image conversion", S.files.map(x=>x.name).join(", "), names, outputs.length, outputs.reduce((n,x)=>n+x.blob.size,0));
    toast("Conversion completed.");
  } catch (error) {
    console.error(error);
    toast("Conversion failed. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Convert all →";
  }
}

async function convertImage(file, format, quality) {
  const image = await loadImage(file);
  const map = {
    JPG: ["image/jpeg", "jpg"],
    JPEG: ["image/jpeg", "jpeg"],
    PNG: ["image/png", "png"],
    WEBP: ["image/webp", "webp"]
  };

  const [mime, ext] = map[format];
  const blob = await canvasBlob(image, mime, quality);
  return {
    blob,
    name: file.name.replace(/\.[^.]+$/, "") + "." + ext
  };
}

function renderImagePdf() {
  setTitle("Image to PDF");

  $("#content").innerHTML = `
    <div class="eyebrow">PDF WORKSPACE</div>
    <h1>Image to PDF</h1>
    <p class="muted">Drop multiple images, arrange the page order, choose a page format and create one PDF.</p>
    <div id="pdfArea"></div>
  `;

  const area = $("#pdfArea");

  if (!S.pdfFiles.length) {
    mountUpload(area, files => {
      S.pdfFiles = files;
      renderImagePdf();
    }, {
      accept: "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif",
      title: "Drop images here",
      subtitle: "Add as many images as you need for one PDF",
      badges: ["JPG", "PNG", "WEBP", "GIF", "BMP", "SVG", "AVIF"],
      emptyMessage: "Please choose JPG, JPEG, PNG or WEBP images."
    });
    return;
  }

  area.innerHTML = `
    <div class="workspace">
      <div class="panel">
        <div class="section-head" style="margin-top:0">
          <h2>${S.pdfFiles.length} pages</h2>
          <button class="ghost" id="addPdfImages">Add more</button>
        </div>
        <div class="file-list" id="pdfFileList"></div>
        <div class="notice">Tip: use ↑ and ↓ to control the final PDF page order.</div>
      </div>

      <div class="panel">
        <div class="eyebrow">PDF SETTINGS</div>
        <h2>Create one PDF</h2>

        <div class="setting">
          <label>Page size</label>
          <div class="chips" id="pageSizeChips">
            ${["A4","A3","Letter","Original"].map(x =>
              `<button class="chip ${S.selectedPage === x ? "selected" : ""}" data-page="${x}">${x}</button>`
            ).join("")}
          </div>
        </div>

        <div class="setting">
          <label>Orientation</label>
          <div class="chips" id="orientationChips">
            ${["Auto","Portrait","Landscape"].map(x =>
              `<button class="chip ${S.orientation === x ? "selected" : ""}" data-orientation="${x}">${x}</button>`
            ).join("")}
          </div>
        </div>

        <button class="primary wide" id="createPdf">Create PDF →</button>
        <div id="pdfResult"></div>
      </div>
    </div>
  `;

  renderPdfRows($("#pdfFileList"));
  bindPdfControls();
}

function renderPdfRows(container) {
  container.innerHTML = S.pdfFiles.map((file, index) => `
    <div class="file-row" data-index="${index}">
      <div class="file-thumb" id="pdf-thumb-${index}">⌁</div>
      <div class="file-info">
        <strong>${escapeHtml(file.name)}</strong>
        <small>Page ${index + 1} • ${formatBytes(file.size)}</small>
      </div>
      <div class="file-actions">
        <button class="mini-btn up-btn" data-index="${index}">↑</button>
        <button class="mini-btn down-btn" data-index="${index}">↓</button>
        <button class="mini-btn rename-pdf-btn" data-index="${index}">Rename</button>
        <button class="mini-btn remove-pdf-btn" data-index="${index}">Remove</button>
      </div>
    </div>
  `).join("");

  S.pdfFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    container.querySelector(`#pdf-thumb-${index}`).innerHTML = `<img src="${url}" alt="">`;
  });

  container.querySelectorAll(".up-btn").forEach(btn => btn.onclick = () => movePdfFile(Number(btn.dataset.index), -1));
  container.querySelectorAll(".down-btn").forEach(btn => btn.onclick = () => movePdfFile(Number(btn.dataset.index), 1));

  container.querySelectorAll(".remove-pdf-btn").forEach(btn => btn.onclick = () => {
    S.pdfFiles.splice(Number(btn.dataset.index), 1);
    renderImagePdf();
  });

  bindRenameButtons(container, S.pdfFiles);
}

function movePdfFile(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= S.pdfFiles.length) return;
  [S.pdfFiles[index], S.pdfFiles[target]] = [S.pdfFiles[target], S.pdfFiles[index]];
  renderImagePdf();
}

function bindPdfControls() {
  $("#addPdfImages").onclick = () => {
    chooseFiles({
      multiple: true,
      accept: "*/*",
      filter: normalizeImageFiles,
      emptyMessage: "No image files were selected. Supported: JPG, JPEG, PNG, WEBP, GIF, BMP, SVG and AVIF.",
      onRejected: rejected => `Image to PDF rejected ${rejected.length} unsupported file${rejected.length === 1 ? "" : "s"}. Please choose supported images.`,
      onAccepted: files => { S.pdfFiles.push(...files); renderImagePdf(); }
    });
  };

  $$("#pageSizeChips .chip").forEach(btn => {
    btn.onclick = () => {
      S.selectedPage = btn.dataset.page;
      $$("#pageSizeChips .chip").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
    };
  });

  $$("#orientationChips .chip").forEach(btn => {
    btn.onclick = () => {
      S.orientation = btn.dataset.orientation;
      $$("#orientationChips .chip").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
    };
  });

  $("#createPdf").onclick = createImagePdf;
}

async function createImagePdf() {
  const btn = $("#createPdf");
  btn.disabled = true;
  btn.textContent = "Creating PDF…";

  try {
    const { jsPDF } = window.jspdf;
    const orientation = (S.orientation || "Auto").toLowerCase();

    const pdf = new jsPDF({
      unit: "pt",
      format: S.selectedPage === "Original" ? "a4" : S.selectedPage.toLowerCase(),
      orientation: orientation === "auto" ? "portrait" : orientation
    });

    for (let i = 0; i < S.pdfFiles.length; i++) {
      if (i > 0) pdf.addPage(
        S.selectedPage === "Original" ? "a4" : S.selectedPage.toLowerCase(),
        orientation === "auto" ? "portrait" : orientation
      );

      const file = S.pdfFiles[i];
      const image = await loadImage(file);
      // Rasterize every browser-supported image to PNG/JPEG before handing it to jsPDF.
      // This makes WEBP/GIF/BMP/SVG/AVIF inputs reliable too.
      const useJpeg = /\.(jpe?g)$/i.test(file.name) || file.type === "image/jpeg";
      const dataUrl = imageToDataUrl(image, useJpeg ? "image/jpeg" : "image/png", useJpeg ? 0.95 : undefined);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const ratio = Math.min(
        (pageW - margin * 2) / image.naturalWidth,
        (pageH - margin * 2) / image.naturalHeight
      );
      const width = image.naturalWidth * ratio;
      const height = image.naturalHeight * ratio;
      const type = useJpeg ? "JPEG" : "PNG";

      pdf.addImage(dataUrl, type, (pageW - width) / 2, (pageH - height) / 2, width, height);
    }

    const blob = pdf.output("blob");
    const outputName = "images.pdf";

    $("#pdfResult").innerHTML = `
      <div class="result">
        <div class="result-grid">
          <div class="result-box"><small>Pages</small><strong>${S.pdfFiles.length}</strong></div>
          <div class="result-box"><small>PDF size</small><strong>${formatBytes(blob.size)}</strong></div>
          <div class="result-box"><small>Page</small><strong>${S.selectedPage}</strong></div>
        </div>
        <button class="primary wide" id="downloadPdf">Download ${outputName}</button>
      </div>
    `;

    $("#downloadPdf").onclick = () => downloadBlob(blob, outputName);

    await logActivity(
      "Image to PDF",
      S.pdfFiles.map(x=>x.name).join(", "),
      outputName,
      S.pdfFiles.length,
      blob.size
    );

    toast("PDF created successfully.");
  } catch (error) {
    console.error(error);
    toast("Could not create the PDF.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create PDF →";
  }
}


function renderPdfMerge() {
  setTitle("PDF Merge");
  $("#content").innerHTML = `
    <div class="eyebrow">PDF WORKSPACE</div>
    <h1>Merge PDF files</h1>
    <p class="muted">Combine multiple PDFs into one document. Files are processed in your browser.</p>
    <div id="mergeArea"></div>
  `;
  const area = $("#mergeArea");
  if (!S.mergeFiles.length) {
    mountUpload(area, files => {
      S.mergeFiles = files;
      renderPdfMerge();
    }, {
      accept: "*/*",
      title: "Drop PDF files here",
      subtitle: "Only PDF documents are accepted",
      browseLabel: "Choose PDF files",
      badges: ["PDF"],
      emptyMessage: "No PDF files selected. Please choose .pdf files only.",
      filter: normalizePdfFiles,
      rejectMessage: "PDF Merge accepts PDF files only."
    });
    return;
  }

  area.innerHTML = `
    <div class="workspace">
      <div class="panel">
        <div class="section-head" style="margin-top:0">
          <h2>${S.mergeFiles.length} PDF${S.mergeFiles.length === 1 ? "" : "s"}</h2>
          <button class="ghost" id="addMergePdfs">Add more</button>
        </div>
        <div class="file-list" id="mergeFileList"></div>
        <div class="notice">The order below becomes the order of the merged PDF. Use ↑ and ↓ to rearrange files.</div>
      </div>
      <div class="panel">
        <div class="eyebrow">OUTPUT</div>
        <h2>One combined PDF</h2>
        <p class="muted">Original PDFs stay unchanged.</p>
        <div class="setting">
          <label for="mergeName">Output filename</label>
          <input id="mergeName" class="rename-input" value="merged-document.pdf" maxlength="120" />
        </div>
        <button class="primary wide" id="mergePdfs">Merge PDFs →</button>
        <div id="mergeResult"></div>
      </div>
    </div>`;

  renderMergeRows($("#mergeFileList"));
  $("#addMergePdfs").onclick = () => chooseFiles({
    multiple: true,
    accept: "*/*",
    filter: normalizePdfFiles,
    emptyMessage: "No PDF files were selected.",
    onRejected: rejected => `PDF Merge rejected ${rejected.length} non-PDF file${rejected.length === 1 ? "" : "s"}. Please choose PDF files only.`,
    onAccepted: files => { S.mergeFiles.push(...files); renderPdfMerge(); }
  });
  $("#mergePdfs").onclick = mergePdfs;
}

function renderMergeRows(container) {
  container.innerHTML = S.mergeFiles.map((file, index) => `
    <div class="file-row" data-index="${index}">
      <div class="file-thumb">PDF</div>
      <div class="file-info"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)} • File ${index + 1}</small></div>
      <div class="file-actions">
        <button class="mini-btn merge-up" data-index="${index}">↑</button>
        <button class="mini-btn merge-down" data-index="${index}">↓</button>
        <button class="mini-btn merge-remove" data-index="${index}">Remove</button>
      </div>
    </div>`).join("");
  container.querySelectorAll(".merge-up").forEach(btn => btn.onclick = () => moveMergeFile(Number(btn.dataset.index), -1));
  container.querySelectorAll(".merge-down").forEach(btn => btn.onclick = () => moveMergeFile(Number(btn.dataset.index), 1));
  container.querySelectorAll(".merge-remove").forEach(btn => btn.onclick = () => { S.mergeFiles.splice(Number(btn.dataset.index), 1); renderPdfMerge(); });
}

function moveMergeFile(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= S.mergeFiles.length) return;
  [S.mergeFiles[index], S.mergeFiles[target]] = [S.mergeFiles[target], S.mergeFiles[index]];
  renderPdfMerge();
}

async function mergePdfs() {
  const btn = $("#mergePdfs");
  if (S.mergeFiles.length < 2) { toast("Choose at least two PDF files to merge."); return; }
  btn.disabled = true;
  btn.textContent = "Merging…";
  try {
    if (!window.PDFLib) throw new Error("PDF engine is unavailable.");
    const { PDFDocument } = window.PDFLib;
    const merged = await PDFDocument.create();
    let totalPages = 0;
    for (const file of S.mergeFiles) {
      const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach(page => merged.addPage(page));
      totalPages += pages.length;
    }
    const bytes = await merged.save({ useObjectStreams: true });
    const blob = new Blob([bytes], { type: "application/pdf" });
    let name = $("#mergeName").value.trim().replace(/[\\/:*?"<>|]/g, "_") || "merged-document.pdf";
    if (!/\.pdf$/i.test(name)) name += ".pdf";
    $("#mergeResult").innerHTML = `<div class="result"><div class="result-grid"><div class="result-box"><small>Files</small><strong>${S.mergeFiles.length}</strong></div><div class="result-box"><small>Pages</small><strong>${totalPages}</strong></div><div class="result-box"><small>Output</small><strong>${formatBytes(blob.size)}</strong></div></div><button class="primary wide" id="downloadMerged">Download ${escapeHtml(name)}</button></div>`;
    $("#downloadMerged").onclick = () => downloadBlob(blob, name);
    await logActivity("PDF merge", S.mergeFiles.map(x => x.name).join(", "), name, S.mergeFiles.length, blob.size);
    toast("PDFs merged successfully.");
  } catch (error) {
    console.error(error);
    toast(error?.message?.toLowerCase().includes("encrypt") ? "An encrypted PDF cannot be merged in the browser." : "Could not merge these PDFs. Please check that each file is a valid PDF.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Merge PDFs →";
  }
}

function renderZip() {
  setTitle("ZIP Viewer");
  $("#content").innerHTML = `
    <div class="eyebrow">ARCHIVE WORKSPACE</div>
    <h1>ZIP Viewer</h1>
    <p class="muted">Open a ZIP archive or inspect a folder, then preview supported images and download individual files.</p>
    <div id="zipArea"></div>`;
  const area = $("#zipArea");
  if (!S.zipEntries.length) {
    mountUpload(area, (files, source) => processZipOrFolder(files, source), {
      accept: "*/*",
      title: "Drop a ZIP file here",
      subtitle: "Or choose a ZIP archive from your device",
      browseLabel: "Choose ZIP",
      badges: ["ZIP"],
      allowFolder: true,
      folderLabel: "Choose folder",
      emptyMessage: "No ZIP file selected. Please choose a .zip archive or use Choose folder.",
      filter: files => files.filter(file => /\.zip$/i.test(file.name) || file.type === "application/zip"),
      rejectMessage: "ZIP Viewer accepts ZIP archives only. Use Choose folder for a normal folder."
    });
    return;
  }
  const canPreview = e => e.isImage ? `<button class="mini-btn zip-preview" data-index="${e.index}">Preview</button>` : "";
  area.innerHTML = `<div class="panel"><div class="section-head" style="margin-top:0"><div><div class="eyebrow">${escapeHtml(S.zipName)}</div><h2>${S.zipEntries.length} items</h2></div><button class="ghost" id="clearZip">Open another</button></div><div class="file-list" id="zipList"></div><div id="zipPreview"></div></div>`;
  const list = $("#zipList");
  list.innerHTML = S.zipEntries.map(e => `<div class="file-row"><div class="file-thumb">${e.isImage ? "IMG" : "FILE"}</div><div class="file-info"><strong title="${escapeHtml(e.name)}">${escapeHtml(e.name)}</strong><small>${formatBytes(e.size)}</small></div><div class="file-actions">${canPreview(e)}<button class="mini-btn zip-download" data-index="${e.index}">Download</button></div></div>`).join("");
  list.querySelectorAll(".zip-download").forEach(btn => btn.onclick = () => downloadZipEntry(Number(btn.dataset.index)));
  list.querySelectorAll(".zip-preview").forEach(btn => btn.onclick = () => previewZipEntry(Number(btn.dataset.index)));
  $("#clearZip").onclick = () => { S.zipEntries = []; S.zipName = ""; renderZip(); };
}

async function processZipOrFolder(files, source) {
  if (source === "folder") {
    const entries = files.filter(f => f && !f.name.endsWith("/")).map((file, index) => ({ index, name: file.webkitRelativePath || file.name, size: file.size, file, isImage: normalizeImageFiles([file]).length > 0 }));
    S.zipEntries = entries;
    S.zipName = files[0]?.webkitRelativePath?.split("/")[0] || "Selected folder";
    renderZip();
    return;
  }
  const file = files[0];
  try {
    if (!window.JSZip) throw new Error("ZIP engine is unavailable.");
    const archive = await JSZip.loadAsync(file);
    let index = 0;
    S.zipEntries = Object.values(archive.files).filter(e => !e.dir).map(e => ({ index: index++, name: e.name, size: e._data?.uncompressedSize || e._data?.compressedSize || 0, entry: e, isImage: normalizeImageFiles([new File([], e.name)]).length > 0 }));
    S.zipName = file.name;
    renderZip();
    toast("ZIP opened successfully.");
  } catch (error) {
    console.error(error);
    S.zipEntries = [];
    toast("Could not open this ZIP. Please choose a valid .zip archive.");
  }
}

async function getZipEntryBlob(entry) {
  if (entry.file) return entry.file;
  return entry.entry.async("blob");
}

async function downloadZipEntry(index) {
  const entry = S.zipEntries.find(e => e.index === index);
  if (!entry) return;
  try { downloadBlob(await getZipEntryBlob(entry), entry.name.split("/").pop() || "download"); }
  catch (error) { console.error(error); toast("Could not extract that ZIP item."); }
}

async function previewZipEntry(index) {
  const entry = S.zipEntries.find(e => e.index === index);
  if (!entry || !entry.isImage) return;
  try {
    const blob = await getZipEntryBlob(entry);
    const url = URL.createObjectURL(blob);
    $("#zipPreview").innerHTML = `<div class="panel" style="margin-top:16px"><div class="section-head" style="margin-top:0"><h3>${escapeHtml(entry.name)}</h3><button class="ghost" id="closeZipPreview">Close</button></div><img src="${url}" alt="ZIP image preview" style="max-width:100%;max-height:60vh;display:block;margin:auto;border-radius:16px"></div>`;
    $("#closeZipPreview").onclick = () => { URL.revokeObjectURL(url); $("#zipPreview").innerHTML = ""; };
  } catch (error) { console.error(error); toast("Could not preview that image."); }
}


function renderHd() {
  setTitle("HD Quality");

  $("#content").innerHTML = `
    <div class="eyebrow">HIGH RESOLUTION</div>
    <h1>Improve image resolution</h1>
    <p class="muted">Resize an image to 1080p, 2K, 4K or a custom size while keeping its proportions when possible.</p>
    <div id="hdArea"></div>
  `;

  const area = $("#hdArea");

  if (!S.files.length) {
    mountUpload(area, files => {
      S.files = [files[0]];
      renderHd();
    }, {
      multiple: false,
      title: "Drop one image here",
      subtitle: "Choose an image to resize for HD output",
      badges: ["JPG", "JPEG", "PNG", "WEBP"]
    });
    return;
  }

  const file = S.files[0];

  area.innerHTML = `
    <div class="workspace">
      <div class="panel preview-panel">
        <img id="hdPreview" alt="Preview">
      </div>

      <div class="panel">
        <div class="file-row">
          <div class="file-thumb" id="hdThumb">⌁</div>
          <div class="file-info">
            <strong>${escapeHtml(file.name)}</strong>
            <small>${formatBytes(file.size)}</small>
          </div>
          <button class="mini-btn" id="hdReplace">Replace</button>
        </div>

        <div class="setting">
          <label>Resolution</label>
          <div class="chips" id="resolutionChips">
            ${["1080p","2K","4K","Custom"].map(x =>
              `<button class="chip ${S.selectedResolution === x ? "selected" : ""}" data-resolution="${x}">${x}</button>`
            ).join("")}
          </div>
        </div>

        <div id="customSize" class="setting hidden">
          <label>Custom pixels</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="customWidth" class="rename-input" type="number" min="1" placeholder="Width">
            <input id="customHeight" class="rename-input" type="number" min="1" placeholder="Height">
          </div>
        </div>

        <div class="notice">HD resizing can increase dimensions, but it cannot recreate fine detail that was not present in the original image.</div>

        <button class="primary wide" id="enhanceHd">Enhance Quality →</button>
        <div id="hdResult"></div>
      </div>
    </div>
  `;

  const url = URL.createObjectURL(file);
  $("#hdPreview").src = url;
  $("#hdThumb").innerHTML = `<img src="${url}" alt="">`;

  $$("#resolutionChips .chip").forEach(btn => {
    btn.onclick = () => {
      S.selectedResolution = btn.dataset.resolution;
      $$("#resolutionChips .chip").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
      $("#customSize").classList.toggle("hidden", S.selectedResolution !== "Custom");
    };
  });

  $("#hdReplace").onclick = () => {
    chooseFiles({
      multiple: false,
      accept: "*/*",
      filter: normalizeImageFiles,
      emptyMessage: "No image file was selected. Supported: JPG, JPEG, PNG, WEBP, GIF, BMP, SVG and AVIF.",
      onRejected: () => "HD Quality accepts image files only. Please choose JPG, JPEG, PNG, WEBP, GIF, BMP, SVG or AVIF.",
      onAccepted: files => { S.files = [files[0]]; renderHd(); }
    });
  };

  $("#enhanceHd").onclick = () => processHd(file);
}

async function processHd(file) {
  const btn = $("#enhanceHd");
  btn.disabled = true;
  btn.textContent = "Processing…";

  try {
    const image = await loadImage(file);
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (S.selectedResolution === "1080p") {
      [width, height] = fitWithin(width, height, 1920);
    } else if (S.selectedResolution === "2K") {
      [width, height] = fitWithin(width, height, 2560);
    } else if (S.selectedResolution === "4K") {
      [width, height] = fitWithin(width, height, 3840);
    } else {
      const customW = Number($("#customWidth").value);
      const customH = Number($("#customHeight").value);
      if (!customW || !customH) {
        toast("Enter custom width and height.");
        return;
      }
      width = customW;
      height = customH;
    }

    const blob = await canvasBlob(image, "image/webp", .94, width, height);
    const outputName = file.name.replace(/\.[^.]+$/, "") + "_HD.webp";

    $("#hdResult").innerHTML = `
      <div class="result">
        <div class="result-grid">
          <div class="result-box"><small>Resolution</small><strong>${width} × ${height}</strong></div>
          <div class="result-box"><small>Original</small><strong>${formatBytes(file.size)}</strong></div>
          <div class="result-box"><small>Output</small><strong>${formatBytes(blob.size)}</strong></div>
        </div>
        <button class="primary wide" id="downloadHd">Download ${escapeHtml(outputName)}</button>
      </div>
    `;

    $("#downloadHd").onclick = () => downloadBlob(blob, outputName);

    await logActivity("HD quality", file.name, outputName, 1, blob.size);
    toast("HD image created.");
  } catch (error) {
    console.error(error);
    toast("HD processing failed.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enhance Quality →";
  }
}

function fitWithin(width, height, maxLongSide) {
  const longSide = Math.max(width, height);
  if (longSide === maxLongSide) return [width, height];
  const scale = maxLongSide / longSide;
  return [Math.round(width * scale), Math.round(height * scale)];
}

function loadImage(fileOrUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (typeof fileOrUrl !== "string" && fileOrUrl instanceof File) {
        URL.revokeObjectURL(image.src);
      }
      resolve(image);
    };
    image.onerror = reject;
    image.src = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  });
}

function canvasBlob(image, mime, quality, width = image.naturalWidth, height = image.naturalHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", {alpha:true});
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas export failed")), mime, quality);
  });
}

function imageToDataUrl(image, mime = "image/png", quality) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mime, quality);
}

function fileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function logActivity(action, inputName, outputName, fileCount, outputSize) {
  if (!S.profile) return;

  fetch("/api/activity", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action,
      input_name: inputName,
      output_name: outputName,
      file_count: fileCount,
      output_size: outputSize
    })
  }).catch(() => {});
}

applyProfile();
