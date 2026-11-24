# Parity Report — Original (localconvert.ai.studio) vs Localpixel rebuild

**Scope:** all 10 tools + shared shell behaviours.
**Method:** scripted Playwright flows against the live original using real fixtures
(`tests/fixtures/`, generated 2026-11-24) plus targeted exports and in-browser validation of downloaded artefacts.
**Status:** investigation complete. **No implementation changes were made during this audit.**

Evidence directory: `tests/parity/evidence/` (screenshots, aria snapshots, post-upload DOM dumps,
downloaded outputs).

---

## Method notes

- Original flows exercised: setInputFiles → wait → dump UI → perform export.
- Downloaded artefacts validated in Node with `jszip`, `pdf-lib`, `image-size`, `jsqr`, `pngjs`:
  DOCX zip integrity + text + page breaks, PDF page counts + page sizes, ZIP contents, PNG dimensions, QR decode.
- Synthetic drag/drop events via Playwright `dispatchEvent('drop', {dataTransfer})` were **not** effective in
  either app (no files added). Real-user drag-and-drop therefore remains unverified; the file-input path is verified.
- Mobile overflow checked at 390×844 on 4 original pages (no horizontal overflow) and desktop at 1440.
- Console errors observed on all original pages and tool flows: **none**.

---

## Tool-by-tool findings

### 01 Bulk Image Compressor — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | On upload the tool **auto-runs** compression (quality 80 default, range 10–100). Output format selectable: Original / WebP / JPG / PNG. Max dimensions: Original / 1920px / 1280px / 800px plus explicit Max Width & Max Height number inputs (16–10000). Per-file results with before/after bytes and % savings (sample-exif.jpg 350.7 KB → 134.3 KB = 59% smaller; sample.png 2.2 MB → 2.2 MB? shows 26% smaller). ZIP download, per-file download, “Files Ready” counter. |
| Our implementation | Requires explicit “Compress files” press; quality range 30–95 (default 82); only width presets (no explicit height); format fixed to source; max width only. Results, savings, ZIP present. |
| Status | **PARTIAL** |
| Evidence | `tests/parity/evidence/uploaded-compress-image.json`, `uploaded-compress-image.png`; original-compress.png. |
| Required fixes | Add output-format selector (WebP/JPG/PNG/Original) and max-height capability to match original settings surface. Behavioural choice: auto-run vs. manual run is a UX difference — flag for design decision. |

### 02 Universal Image Converter — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | Targets: PNG / JPG / WebP / GIF / SVG / BMP (auto-convert on upload; quality default 88, range 10–100, applied to JPG & WebP; background fill colour + hex for JPG / BMP). GIF inputs handled (first frame, 800×600). SVG input handled (320×180). Batch + ZIP (“Download All (.zip)”, per-file “Download PNG” regardless of target — naming quirk). PNG preserves transparency note. |
| Our implementation | Same six targets (+AVIF input handling), quality 40–100 (default 90), background fill for JPG/GIF/BMP; manual convert step. SVG wrapper approach matches. Quality floor differs (10 vs 40). |
| Status | **PARTIAL** |
| Required fixes | Lower quality slider floor to 10 (and apply 10–100) to match original. Auto-run vs manual is a design-level difference. |

### 03 PNG → WebP — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | PNG-only, quality 10–100 default 85, auto-convert on upload; transparency preserved; batch + ZIP; honest “+11% larger” for tiny icons. |
| Our implementation | Same core (quality 40–100 default 85, manual run, adds max-width). |
| Status | **PARTIAL** |
| Required fixes | Quality range floor 10. |

### 04 EXIF Remover — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | On upload: reads metadata, lists tags (GPSLatitude/Longitude/Altitude, Camera Make/Model/Software/Artist/Copyright, DateTimeOriginal, SerialNumber, LensModel — all labelled “(Sensitive)”), auto-generates clean copy, reports “15 tags found → 0 remaining”, provides “Download Clean Copy”. Clean copy validated: real JPEG, 1600×1067, no metadata claim. |
| Our implementation | Click-driven clean; tag list with sensitive flagging (original flags *all* tags sensitive); verifyClean after re-encode; clean exports list + ZIP. |
| Status | **PARTIAL** |
| Required fixes | Behaviour around auto-inspect/auto-clean is flow-level; tag sensitivity labelling differs. No functional gap on the cleaning path itself. |

### 05 QR Code Generator — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | Quick-fill presets: Website URL, Wi-Fi Credentials, Email Link; content default `https://purepixel.xyz`; size 256/512/1024/2048; ECC L/M/Q/H (H recommended with logo); foreground/background colour inputs; live contrast-ratio readout (17.9:1); centre-logo upload (auto-switches ECC to H); live preview; download `localconvert-qr-512px.png`. QR scanned and decoded content matched (`https://purepixel.xyz`). |
| Our implementation | Custom content input; colour pickers + hex; contrast readout; sizes 256–2048; ECC; logo → H; live preview; download localpixel-qr-<size>.png; verified scannability path. |
| Status | **PARTIAL** |
| Required fixes | Add Website URL / Wi-Fi Credentials / Email Link quick-fill presets. Default content should follow same default. |

### 06 Social Media & Meme Cropper — **MISSING** (primary feature gap)

| Field | Detail |
|---|---|
| Original behaviour | After upload: crop frame (drag move; resize via bottom-right corner handle — note: only 1 handle implemented by original), aspect presets 1:1 / 4:5 / 9:16 / 16:9 / Free; captions: top text, bottom text, text size slider (4–16, default 8%), outline stroke slider (4–28, default 14%), fill & outline colour pickers, “ALL CAPS” checkbox, final output preview; exports PNG and JPG (92%). Crop dimensions honoured in export (751×939 for 4:5; 939×939 initial for 1:1). Caption rendering confirmed via pixel scan of exported PNG. Watermark-free. |
| Our implementation | Crop frame with move + 4 corner handles; aspect presets Free/1:1/4:5/16:9/9:16/3:2; precision numeric inputs; export PNG/JPG; **no caption overlay**; drag-interaction method differs (original single corner handle + drag; ours move/4-handle). |
| Status | **MISSING** — caption overlay missing. |
| Required fixes | After approval: implement top/bottom caption text, size, outline stroke, colours, ALL CAPS, and output preview matching original behaviour. |

### 07 PDF → Word (.docx) — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | Upload → auto-extract; stats (pages, words, size); live **editable** text preview (textarea) where users trim text; separators “---” map to page breaks; “Scanned or Image-Only PDF Detected” style warning based on text volume; “Download Word (.docx)”. Generated DOCX validated: zip valid, contains heading + all page texts, structure ok. |
| Our implementation | Upload → extract → static text preview → build DOCX (real PageBreak). |
| Status | **PARTIAL** — editable preview missing. |

### 08 Images → PDF — **MATCH**

| Field | Detail |
|---|---|
| Original behaviour | A4 / Letter / Fit; orientation Auto/Portrait/Landscape; margin 0–64 step 4 (default 24); reorder via Up/Down; images JPG/PNG/WebP/GIF; build; output validated (3 pages with correct auto-orientation sizes: landscape for wide images, portrait for square). |
| Our implementation | Same capabilities (margin 0–72 step 2). |
| Status | **MATCH** |

### 09 Merge & Split PDF — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | Merge & download; Split tab: page range input (default “1-3”), per-page buttons, “Extract N Pages (.pdf)”, “Split All Pages to ZIP” (files named like `doc-3pages-page-1.pdf`). Validated: merged 5 pages from 3+2 pages; extracted 2 pages from range “2-3” with correct sizes; ZIP of 3 single-page PDFs valid. |
| Our implementation | Same operations incl. ZIP-all; naming differs slightly. |
| Status | **PARTIAL** (mostly aligned). |

### 10 PDF → Images — **PARTIAL**

| Field | Detail |
|---|---|
| Original behaviour | Output PNG/JPG; scale 1×/1.5×/2×/3×; JPG quality 30–100 (default 90); renders all pages; ZIP “Download All Pages (.zip)” + per-page Save. Validated at default: 1× PNG gave 1191×1684 px for A4 page (i.e., scale baseline ≈ 2× — original’s own mapping); ZIP 3 PNGs with correct per-page dims. |
| Our implementation | PNG/JPG/WebP; DPI presets 96/150/300; manual run; page range; PNG quality 0.92. |
| Status | **PARTIAL** (scale mapping & defaults differ). |

---

## Cross-cutting comparisons

| Area | Original | Ours | Status |
|---|---|---|---|
| Privacy claims | “0 uploads”, canvases, exifr re-scan | Same architecture | MATCH |
| Mobile layout (tested pages) | no horizontal overflow at 390px | — (audit) | Original OK; ours untested on mobile yet |
| Drag & drop | implemented (unverified via synthetic events) | implemented (unverified via synthetic events) | UNVERIFIED both |
| Error handling (broken.jpg on compress) | behaviour captured (file invalid) | — | UNVERIFIED ours |
| Loading states / real progress | real results after processing; no fake progress | real progress bars | MATCH (design) |

## Prioritised outstanding items (before implementation fixes)

1. Meme Cropper captions + adjusted interaction contract — **MISSING**.
2. Compress: output format + max height + default/auto-run parity.
3. Converter quality floor 10; PNG→WebP quality floor 10.
4. QR quick-fill presets; defaults.
5. PDF→Word: editable live preview.
6. PDF→Images: scale/DPI mapping alignment.

## Next steps requested

No code changes were made. After review, fixes should be applied only to the above gaps, then re-verified with the same scripted Playwright evidence passes.

---

# Delivery update — approved parity fixes implemented (2026-11-24)

All five approved gaps were implemented, then verified against real fixture files in the rebuilt app.

## Implemented fixes
1. **Meme Cropper**: caption overlays (top/bottom), ALL CAPS, text size, stroke, fill/outline; resize contract → move + bottom-right handle.
2. **Compress**: output format (Original/WebP/JPG/PNG) + max height; manual-run workflow retained.
3. **Quality**: PNG→WebP floor 10; Converter floor 10 / default 88.
4. **QR**: quick-fill presets (Website URL / Wi-Fi Credentials / Email Link).
5. **PDF→Word**: editable extracted-text preview before DOCX build.

## Verification (this session)
- `npx tsc -b`: PASS. `npm run build`: PASS. `npm run lint`: PASS (exit 0).
- Playwright + real files: meme caption export (751×939 + ink) PASS; compress WebP ZIP (RIFF) PASS; QR presets PASS; docx editable build (text + page break) PASS; quality sliders PASS; compress max-height PASS.
- App smoke post-changes: PASS, no console errors.

## Still unverified
Real drag-and-drop, mobile on rebuilt app, meme drag runtime, QR preset decode, error flows on edited tools.

## Next
Full rebuilt-app verification matrix across all 10 tools with real files, then final visual/design quality review and delivery report.
