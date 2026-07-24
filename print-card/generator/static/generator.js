'use strict';

(() => {
  const PAGE_W_MM = 61;
  const PAGE_H_MM = 97;
  const SAFE_TEXT_MARGIN_MM = 5;
  const CANVAS_W = 610;
  const CANVAS_H = 970;
  const PX_PER_MM = CANVAS_W / PAGE_W_MM;
  const FONT_PRESETS = {
    'noto-serif-jp': '"Noto Serif JP", "Yu Mincho", serif',
    'zen-maru-gothic': '"Zen Maru Gothic", sans-serif',
    'zen-kaku-gothic-new': '"Zen Kaku Gothic New", sans-serif',
    'kaisei-decol': '"Kaisei Decol", serif',
    'yuji-syuku': '"Yuji Syuku", cursive',
  };
  const DEFAULT_FONT_KEY = 'noto-serif-jp';
  const NAME_FONT_SIZE_MM = 4.23;
  const NAME_TEXT_HEIGHT_MM = 4.9;
  const HANDLE_FONT_SIZE_MM = 2.47;
  const HANDLE_GAP_MM = 5.5;
  const EXTRA_IMAGE_COUNT = 3;
  const EXTRA_BASE_MM = 22.0;
  const EXTRA_DEFAULT_POS_MM = [
    { x: 14, y: 14 },
    { x: 47, y: 14 },
    { x: 30.5, y: 88 },
  ];

  const DEFAULTS = {
    nameX: 39.9,
    nameY: 86.4,
    catchphraseTopLeftX: 24.5,
    catchphraseTopLeftY: 14.0,
  };

  const canvas = document.getElementById('cardPreview');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const logoImage = new Image();
  let logoLoaded = false;
  logoImage.onload = () => {
    logoLoaded = true;
    drawPreview();
  };
  logoImage.src = '/assets/card-logo.png';

  const inputs = {
    photo: document.getElementById('photoInput'),
    fontSelect: document.getElementById('fontSelect'),
    catchphrase: document.getElementById('catchphraseInput'),
    name: document.getElementById('nameInput'),
    xHandle: document.getElementById('xHandleInput'),
    photoOffsetX: document.getElementById('photoOffsetXInput'),
    photoOffsetY: document.getElementById('photoOffsetYInput'),
    photoScale: document.getElementById('photoScaleInput'),
    photoRotation: document.getElementById('photoRotationInput'),
    photoBrightness: document.getElementById('photoBrightnessInput'),
    fontKey: document.getElementById('fontKeyInput'),
    nameSizeFactor: document.getElementById('nameSizeFactorInput'),
    zoomSlider: document.getElementById('zoomSlider'),
    photoRotationSlider: document.getElementById('photoRotationSlider'),
    photoBrightnessSlider: document.getElementById('photoBrightnessSlider'),
    photoBrightnessValue: document.getElementById('photoBrightnessValue'),
    nameSizeSlider: document.getElementById('nameSizeSlider'),
    logoToggle: document.getElementById('logoToggle'),
    nameX: document.getElementById('nameXInput'),
    nameY: document.getElementById('nameYInput'),
    catchphraseX: document.getElementById('catchphraseXInput'),
    catchphraseY: document.getElementById('catchphraseYInput'),
    catchphraseOrientation: document.getElementById('catchphraseOrientationInput'),
    catchphraseRotation: document.getElementById('catchphraseRotationInput'),
    catchphraseSizeFactor: document.getElementById('catchphraseSizeFactorInput'),
    catchphraseStrokeFactor: document.getElementById('catchphraseStrokeFactorInput'),
    catchphraseFillColor: document.getElementById('catchphraseFillColorInput'),
    catchphraseOrientationControls: document.querySelectorAll('input[name="catchphrase_orientation_ui"]'),
    catchphraseFillControls: document.querySelectorAll('input[name="catchphrase_fill_color_ui"]'),
    catchphraseRotationSlider: document.getElementById('catchphraseRotationSlider'),
    catchphraseSizeSlider: document.getElementById('catchphraseSizeSlider'),
    catchphraseStrokeSlider: document.getElementById('catchphraseStrokeSlider'),
    extraImages: Array.from({ length: EXTRA_IMAGE_COUNT }, (_, i) => {
      const idx = i + 1;
      return {
        file: document.getElementById(`extra${idx}Input`),
        scaleSlider: document.getElementById(`extra${idx}ScaleSlider`),
        rotationSlider: document.getElementById(`extra${idx}RotationSlider`),
        clearBtn: document.getElementById(`extra${idx}ClearBtn`),
        x: document.getElementById(`extra${idx}XInput`),
        y: document.getElementById(`extra${idx}YInput`),
        scale: document.getElementById(`extra${idx}ScaleInput`),
        rotation: document.getElementById(`extra${idx}RotationInput`),
      };
    }),
  };

  const state = {
    photo: null,
    baseScale: 1,
    zoomFactor: 1,
    photoScale: 1,
    photoX: 0,
    photoY: 0,
    photoRotationDeg: 0,
    photoBrightness: 100,
    nameX: DEFAULTS.nameX,
    nameY: DEFAULTS.nameY,
    catchphraseX: DEFAULTS.catchphraseTopLeftX,
    catchphraseY: DEFAULTS.catchphraseTopLeftY,
    catchphraseOrientation: 'vertical',
    catchphraseRotationDeg: 0,
    catchphraseSizeFactor: 1,
    catchphraseStrokeFactor: 1,
    catchphraseFillColor: 'white',
    fontKey: DEFAULT_FONT_KEY,
    nameSizeFactor: 1,
    nameMoved: false,
    catchphraseMoved: false,
    extraImages: Array.from({ length: EXTRA_IMAGE_COUNT }, (_, i) => ({
      image: null,
      xMm: EXTRA_DEFAULT_POS_MM[i].x,
      yMm: EXTRA_DEFAULT_POS_MM[i].y,
      scalePercent: 100,
      rotationDeg: 0,
      moved: false,
    })),
    drag: null,
    bounds: {
      name: null,
      catchphrase: null,
      extraImages: Array.from({ length: EXTRA_IMAGE_COUNT }, () => null),
      photo: { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H },
    },
  };

  function mmToPx(value) {
    return value * PX_PER_MM;
  }

  function pxToMm(value) {
    return value / PX_PER_MM;
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.min(max, Math.max(min, value));
  }

  function requiredCoverSize(rotationDeg) {
    const theta = rotationDeg * Math.PI / 180;
    return {
      w: CANVAS_W * Math.abs(Math.cos(theta)) + CANVAS_H * Math.abs(Math.sin(theta)),
      h: CANVAS_W * Math.abs(Math.sin(theta)) + CANVAS_H * Math.abs(Math.cos(theta)),
    };
  }

  function normalizedHandle() {
    const value = inputs.xHandle?.value.trim() || '@example';
    return value.startsWith('@') ? value : `@${value}`;
  }

  function activeFontFamily() {
    return FONT_PRESETS[state.fontKey] || FONT_PRESETS[DEFAULT_FONT_KEY];
  }

  function selectedRadioValue(controls, fallback) {
    const selected = [...controls].find(input => input.checked);
    return selected?.value || fallback;
  }

  function splitCatchphrase(text) {
    const compact = text.replace(/\s+/g, '');
    if (!compact) return [];

    if (compact.includes('、') || compact.includes('。')) {
      const parts = compact.match(/[^、。]+[、。]?/g);
      return parts ? parts.filter(Boolean) : [];
    }

    const lines = [];
    for (let i = 0; i < compact.length; i += 6) {
      lines.push(compact.slice(i, i + 6));
    }
    return lines;
  }

  function catchphraseSettingsFromControls() {
    state.catchphraseOrientation = selectedRadioValue(inputs.catchphraseOrientationControls, 'vertical') === 'horizontal' ? 'horizontal' : 'vertical';
    state.catchphraseFillColor = selectedRadioValue(inputs.catchphraseFillControls, 'white') === 'black' ? 'black' : 'white';
    state.catchphraseRotationDeg = clamp(Number(inputs.catchphraseRotationSlider?.value || 0), -45, 45);
    state.catchphraseSizeFactor = clamp(Number(inputs.catchphraseSizeSlider?.value || 100) / 100, 0.6, 1.8);
    state.catchphraseStrokeFactor = clamp(Number(inputs.catchphraseStrokeSlider?.value || 100) / 100, 0, 2);
  }

  function measureLine(line, fontPx) {
    ctx.save();
    ctx.font = `bold ${fontPx}px ${activeFontFamily()}`;
    const width = ctx.measureText(line).width;
    ctx.restore();
    return width;
  }

  function applyRotationSafetyShrink(metrics, rotationDeg) {
    // Whatever size_factor/rotation/line length the user picks, the rotated
    // bounding box must still fit inside the 5mm safe area. centerClamp() can
    // only move the block, not resize it, so enforce the size limit here.
    const maxHalfWMm = (PAGE_W_MM - 2 * SAFE_TEXT_MARGIN_MM) / 2;
    const maxHalfHMm = (PAGE_H_MM - 2 * SAFE_TEXT_MARGIN_MM) / 2;
    const half = rotatedHalfSizeMm({ w: metrics.w, h: metrics.h }, rotationDeg);
    let shrink = 1;
    if (half.halfW > 0) shrink = Math.min(shrink, maxHalfWMm / half.halfW);
    if (half.halfH > 0) shrink = Math.min(shrink, maxHalfHMm / half.halfH);
    if (shrink < 1) {
      shrink *= 0.98;
      metrics.fontPx *= shrink;
      metrics.w *= shrink;
      metrics.h *= shrink;
      if (metrics.charStep !== undefined) metrics.charStep *= shrink;
      if (metrics.lineGap !== undefined) metrics.lineGap *= shrink;
      if (metrics.lineWidths) metrics.lineWidths = metrics.lineWidths.map(v => v * shrink);
    }
    return metrics;
  }

  function verticalCatchphraseMetrics(lines) {
    const maxChars = Math.max(...lines.map(line => line.length));
    const lineCount = lines.length;
    let fontPx = Math.min(mmToPx(7.2), Math.max(mmToPx(4.2), (CANVAS_H - mmToPx(12)) / Math.max(maxChars, 1) * 0.82));
    let lineGap = mmToPx(2.0);

    while (fontPx > mmToPx(4.0)) {
      const charStep = fontPx * 1.06;
      const totalW = lineCount * fontPx + (lineCount - 1) * lineGap;
      const totalH = maxChars * charStep;
      if (totalW <= (CANVAS_W - mmToPx(12)) * 0.48 && totalH <= CANVAS_H - mmToPx(12)) break;
      fontPx -= mmToPx(0.25);
    }

    fontPx *= state.catchphraseSizeFactor;
    lineGap = Math.max(mmToPx(1.5), fontPx * 0.36);
    let charStep = fontPx * 1.06;
    let metrics = {
      fontPx,
      charStep,
      lineGap,
      w: lineCount * fontPx + (lineCount - 1) * lineGap,
      h: maxChars * charStep,
    };
    metrics = applyRotationSafetyShrink(metrics, state.catchphraseRotationDeg);
    metrics.charStep = metrics.fontPx * 1.06;
    metrics.lineGap = Math.max(mmToPx(1.5), metrics.fontPx * 0.36);
    metrics.w = lineCount * metrics.fontPx + (lineCount - 1) * metrics.lineGap;
    metrics.h = maxChars * metrics.charStep;
    return metrics;
  }

  function horizontalCatchphraseMetrics(lines) {
    const lineCount = lines.length;
    let fontPx = mmToPx(7.2);
    let lineGap = Math.max(mmToPx(1.7), fontPx * 0.36);

    while (fontPx > mmToPx(4.0)) {
      lineGap = Math.max(mmToPx(1.5), fontPx * 0.36);
      const totalW = Math.max(...lines.map(line => measureLine(line, fontPx)));
      const totalH = lineCount * fontPx + (lineCount - 1) * lineGap;
      if (totalW <= (CANVAS_W - mmToPx(12)) * 0.82 && totalH <= (CANVAS_H - mmToPx(12)) * 0.45) break;
      fontPx -= mmToPx(0.25);
    }

    fontPx *= state.catchphraseSizeFactor;
    lineGap = Math.max(mmToPx(1.5), fontPx * 0.36);
    let metrics = {
      fontPx,
      lineGap,
      lineWidths: lines.map(line => measureLine(line, fontPx)),
      w: Math.max(...lines.map(line => measureLine(line, fontPx))),
      h: lineCount * fontPx + (lineCount - 1) * lineGap,
    };
    metrics = applyRotationSafetyShrink(metrics, state.catchphraseRotationDeg);
    metrics.lineGap = Math.max(mmToPx(1.5), metrics.fontPx * 0.36);
    metrics.lineWidths = lines.map(line => measureLine(line, metrics.fontPx));
    metrics.w = Math.max(...metrics.lineWidths);
    metrics.h = lineCount * metrics.fontPx + (lineCount - 1) * metrics.lineGap;
    return metrics;
  }

  function catchphraseMetrics() {
    catchphraseSettingsFromControls();
    const lines = splitCatchphrase(inputs.catchphrase?.value || '');
    if (!lines.length) return { lines, fontPx: mmToPx(7.2), charStep: mmToPx(7.63), lineGap: mmToPx(2), w: 0, h: 0 };

    return {
      lines,
      orientation: state.catchphraseOrientation,
      rotationDeg: state.catchphraseRotationDeg,
      strokeFactor: state.catchphraseStrokeFactor,
      fillColor: state.catchphraseFillColor,
      ...(state.catchphraseOrientation === 'horizontal' ? horizontalCatchphraseMetrics(lines) : verticalCatchphraseMetrics(lines)),
    };
  }

  function nameMetrics() {
    const text = inputs.name?.value || '';
    const fontPx = mmToPx(NAME_FONT_SIZE_MM * state.nameSizeFactor);
    ctx.save();
    ctx.font = `bold ${fontPx}px ${activeFontFamily()}`;
    const measured = ctx.measureText(text || '名前');
    ctx.restore();
    return {
      text,
      w: measured.width,
      h: mmToPx(NAME_TEXT_HEIGHT_MM * state.nameSizeFactor),
      fontPx,
    };
  }

  function textClamp(posMm, sizePx) {
    const margin = SAFE_TEXT_MARGIN_MM;
    const wMm = pxToMm(sizePx.w);
    const hMm = pxToMm(sizePx.h);
    return {
      x: clamp(posMm.x, margin, PAGE_W_MM - margin - wMm),
      y: clamp(posMm.y, margin, PAGE_H_MM - margin - hMm),
    };
  }

  function rotatedHalfSizeMm(sizePx, rotationDeg) {
    const theta = rotationDeg * Math.PI / 180;
    const w = pxToMm(sizePx.w);
    const h = pxToMm(sizePx.h);
    return {
      halfW: (w / 2) * Math.abs(Math.cos(theta)) + (h / 2) * Math.abs(Math.sin(theta)),
      halfH: (w / 2) * Math.abs(Math.sin(theta)) + (h / 2) * Math.abs(Math.cos(theta)),
    };
  }

  function centerClamp(posMm, sizePx, rotationDeg) {
    const margin = SAFE_TEXT_MARGIN_MM;
    const half = rotatedHalfSizeMm(sizePx, rotationDeg);
    const minX = margin + half.halfW;
    const maxX = PAGE_W_MM - margin - half.halfW;
    const minY = margin + half.halfH;
    const maxY = PAGE_H_MM - margin - half.halfH;
    return {
      x: maxX < minX ? PAGE_W_MM / 2 : clamp(posMm.x, minX, maxX),
      y: maxY < minY ? PAGE_H_MM / 2 : clamp(posMm.y, minY, maxY),
    };
  }

  function clampTextPositions() {
    const name = nameMetrics();
    if (!state.nameMoved) {
      state.nameX = PAGE_W_MM - 6 - pxToMm(name.w);
      state.nameY = PAGE_H_MM - 6 - pxToMm(name.h);
    }
    const namePos = textClamp({ x: state.nameX, y: state.nameY }, name);
    state.nameX = namePos.x;
    state.nameY = namePos.y;

    const catchphrase = catchphraseMetrics();
    if (catchphrase.w && catchphrase.h) {
      if (!state.catchphraseMoved) {
        const left = Math.max(6, Math.min(DEFAULTS.catchphraseTopLeftX, PAGE_W_MM - 6 - pxToMm(catchphrase.w)));
        state.catchphraseX = left + pxToMm(catchphrase.w) / 2;
        state.catchphraseY = DEFAULTS.catchphraseTopLeftY + pxToMm(catchphrase.h) / 2;
      }
      const catchPos = centerClamp({ x: state.catchphraseX, y: state.catchphraseY }, catchphrase, state.catchphraseRotationDeg);
      state.catchphraseX = catchPos.x;
      state.catchphraseY = catchPos.y;
    }
  }

  function updateHiddenInputs() {
    clampTextPositions();
    inputs.photoOffsetX.value = pxToMm(state.photoX).toFixed(3);
    inputs.photoOffsetY.value = pxToMm(state.photoY).toFixed(3);
    if (inputs.photoScale) inputs.photoScale.value = state.zoomFactor.toFixed(3);
    if (inputs.photoRotation) inputs.photoRotation.value = state.photoRotationDeg.toFixed(3);
    if (inputs.photoBrightness) inputs.photoBrightness.value = state.photoBrightness.toFixed(0);
    if (inputs.fontKey) inputs.fontKey.value = state.fontKey;
    if (inputs.nameSizeFactor) inputs.nameSizeFactor.value = state.nameSizeFactor.toFixed(3);
    inputs.nameX.value = state.nameX.toFixed(3);
    inputs.nameY.value = state.nameY.toFixed(3);
    inputs.catchphraseX.value = state.catchphraseX.toFixed(3);
    inputs.catchphraseY.value = state.catchphraseY.toFixed(3);
    inputs.catchphraseOrientation.value = state.catchphraseOrientation;
    inputs.catchphraseRotation.value = state.catchphraseRotationDeg.toFixed(3);
    inputs.catchphraseSizeFactor.value = state.catchphraseSizeFactor.toFixed(3);
    inputs.catchphraseStrokeFactor.value = state.catchphraseStrokeFactor.toFixed(3);
    inputs.catchphraseFillColor.value = state.catchphraseFillColor;
    state.extraImages.forEach((slot, i) => {
      const input = inputs.extraImages[i];
      if (!input) return;
      if (input.x) input.x.value = slot.xMm.toFixed(3);
      if (input.y) input.y.value = slot.yMm.toFixed(3);
      if (input.scale) input.scale.value = slot.scalePercent.toFixed(1);
      if (input.rotation) input.rotation.value = slot.rotationDeg.toFixed(3);
    });
  }

  function resetPhotoPosition() {
    state.photoRotationDeg = 0;
    state.photoBrightness = 100;
    if (inputs.photoRotationSlider) inputs.photoRotationSlider.value = 0;
    if (inputs.photoBrightnessSlider) inputs.photoBrightnessSlider.value = 100;
    if (inputs.photoBrightnessValue) inputs.photoBrightnessValue.textContent = '100%';

    if (!state.photo) {
      state.photoX = 0;
      state.photoY = 0;
      state.baseScale = 1;
      state.zoomFactor = 1;
      state.photoScale = 1;
      if (inputs.zoomSlider) inputs.zoomSlider.value = 100;
      return;
    }

    const req = requiredCoverSize(state.photoRotationDeg);
    state.baseScale = Math.max(req.w / state.photo.width, req.h / state.photo.height);
    state.zoomFactor = 1;
    if (inputs.zoomSlider) inputs.zoomSlider.value = 100;
    state.photoScale = state.baseScale * state.zoomFactor;
    const scaledW = state.photo.width * state.photoScale;
    const scaledH = state.photo.height * state.photoScale;
    const minX = CANVAS_W / 2 + req.w / 2 - scaledW;
    const maxX = CANVAS_W / 2 - req.w / 2;
    const minY = CANVAS_H / 2 + req.h / 2 - scaledH;
    const maxY = CANVAS_H / 2 - req.h / 2;
    state.photoX = maxX + (minX - maxX) * 0.5;
    state.photoY = maxY + (minY - maxY) * 0.3;
    clampPhotoPosition();
  }

  function clampPhotoPosition() {
    if (!state.photo) return;
    const scaledW = state.photo.width * state.photoScale;
    const scaledH = state.photo.height * state.photoScale;
    const req = requiredCoverSize(state.photoRotationDeg);
    const minX = CANVAS_W / 2 + req.w / 2 - scaledW;
    const maxX = CANVAS_W / 2 - req.w / 2;
    const minY = CANVAS_H / 2 + req.h / 2 - scaledH;
    const maxY = CANVAS_H / 2 - req.h / 2;
    state.photoX = maxX < minX ? (minX + maxX) / 2 : clamp(state.photoX, minX, maxX);
    state.photoY = maxY < minY ? (minY + maxY) / 2 : clamp(state.photoY, minY, maxY);
  }

  function applyZoom(zoomFactor) {
    if (!state.photo) return;
    const prevScale = state.photoScale;
    const nextScale = state.baseScale * zoomFactor;
    const centerX = CANVAS_W / 2;
    const centerY = CANVAS_H / 2;
    const ratio = nextScale / prevScale;
    state.photoX = centerX - (centerX - state.photoX) * ratio;
    state.photoY = centerY - (centerY - state.photoY) * ratio;
    state.zoomFactor = zoomFactor;
    state.photoScale = nextScale;
    clampPhotoPosition();
  }

  function drawBackground() {
    if (!state.photo) {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#4a332b');
      grad.addColorStop(1, '#140d0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      return;
    }

    clampPhotoPosition();
    const scaledW = state.photo.width * state.photoScale;
    const scaledH = state.photo.height * state.photoScale;
    state.bounds.photo = { x: state.photoX, y: state.photoY, w: scaledW, h: scaledH };
    ctx.save();
    ctx.filter = `brightness(${state.photoBrightness}%)`;
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.rotate(state.photoRotationDeg * Math.PI / 180);
    ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
    ctx.drawImage(state.photo, state.photoX, state.photoY, scaledW, scaledH);
    ctx.restore();
  }

  function drawScrim() {
    const top = CANVAS_H - mmToPx(19);
    const grad = ctx.createLinearGradient(0, top, 0, CANVAS_H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.70)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, CANVAS_W, CANVAS_H - top);
  }

  function drawExtraImages() {
    state.extraImages.forEach((slot, i) => {
      state.bounds.extraImages[i] = null;
      if (!slot.image) return;
      const containPx = mmToPx(EXTRA_BASE_MM * slot.scalePercent / 100);
      const ratio = Math.min(containPx / slot.image.width, containPx / slot.image.height);
      const w = slot.image.width * ratio;
      const h = slot.image.height * ratio;
      const cx = mmToPx(slot.xMm);
      const cy = mmToPx(slot.yMm);
      state.bounds.extraImages[i] = { cx, cy, w, h, rotationDeg: slot.rotationDeg };

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(slot.rotationDeg * Math.PI / 180);
      ctx.drawImage(slot.image, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }

  function drawCatchphrase() {
    const metrics = catchphraseMetrics();
    const cx = mmToPx(state.catchphraseX);
    const cy = mmToPx(state.catchphraseY);
    state.bounds.catchphrase = metrics.w && metrics.h ? {
      cx,
      cy,
      w: metrics.w,
      h: metrics.h,
      rotationDeg: state.catchphraseRotationDeg,
    } : null;
    if (!metrics.lines.length) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.catchphraseRotationDeg * Math.PI / 180);
    ctx.font = `bold ${metrics.fontPx}px ${activeFontFamily()}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.catchphraseFillColor === 'black' ? 'rgba(255,252,242,0.9)' : 'rgba(0,0,0,0.75)';
    ctx.fillStyle = state.catchphraseFillColor === 'black' ? 'rgba(0,0,0,0.94)' : 'rgba(255,252,242,0.96)';
    ctx.lineWidth = Math.max(0, mmToPx(0.26) * state.catchphraseStrokeFactor);

    if (metrics.orientation === 'horizontal') {
      const startY = -metrics.h / 2;
      metrics.lines.forEach((line, lineIndex) => {
        const lineY = startY + lineIndex * (metrics.fontPx + metrics.lineGap);
        if (state.catchphraseStrokeFactor > 0) ctx.strokeText(line, 0, lineY);
        ctx.fillText(line, 0, lineY);
      });
    } else {
      const startX = -metrics.w / 2;
      const startY = -metrics.h / 2;
      metrics.lines.forEach((line, lineIndex) => {
        const colX = startX + (metrics.lines.length - 1 - lineIndex) * (metrics.fontPx + metrics.lineGap) + metrics.fontPx / 2;
        [...line].forEach((char, charIndex) => {
          const charY = startY + charIndex * metrics.charStep;
          if (state.catchphraseStrokeFactor > 0) ctx.strokeText(char, colX, charY);
          ctx.fillText(char, colX, charY);
        });
      });
    }
    ctx.restore();
  }

  function drawLogo() {
    if (inputs.logoToggle && !inputs.logoToggle.checked) return;
    const size = mmToPx(14);
    const x = mmToPx(6);
    const y = CANVAS_H - mmToPx(6) - size;
    ctx.save();
    ctx.globalAlpha = 0.75;
    if (logoLoaded) {
      ctx.drawImage(logoImage, x, y, size, size);
    } else {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSignature() {
    const name = nameMetrics();
    const x = mmToPx(state.nameX);
    const y = mmToPx(state.nameY);
    state.bounds.name = { x, y, w: name.w, h: name.h };

    ctx.save();
    ctx.font = `bold ${name.fontPx}px ${activeFontFamily()}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.76)';
    ctx.fillStyle = 'rgba(255,252,242,0.98)';
    ctx.lineWidth = Math.max(2, mmToPx(0.22));
    ctx.strokeText(name.text || '名前', x, y);
    ctx.fillText(name.text || '名前', x, y);

    const handle = normalizedHandle();
    ctx.font = `bold ${mmToPx(HANDLE_FONT_SIZE_MM * state.nameSizeFactor)}px ${activeFontFamily()}`;
    const handleW = ctx.measureText(handle).width;
    const handleX = Math.max(mmToPx(5), x + name.w - handleW);
    const handleY = y - mmToPx(HANDLE_GAP_MM * state.nameSizeFactor);
    ctx.lineWidth = Math.max(1, mmToPx(0.14));
    ctx.strokeText(handle, handleX, handleY);
    ctx.fillText(handle, handleX, handleY);
    ctx.restore();
  }

  function drawSafetyGuide() {
    ctx.save();
    ctx.strokeStyle = 'rgba(230,230,230,0.58)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(mmToPx(5), mmToPx(5), mmToPx(51), mmToPx(87));
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.strokeRect(0.5, 0.5, CANVAS_W - 1, CANVAS_H - 1);
    ctx.restore();
  }

  function drawPreview() {
    updateHiddenInputs();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawScrim();
    drawExtraImages();
    drawCatchphrase();
    drawLogo();
    drawSignature();
    drawSafetyGuide();
  }

  function canvasPoint(event) {
    const source = event.touches ? event.touches[0] : event.changedTouches ? event.changedTouches[0] : event;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function contains(bounds, point) {
    if (!bounds) return false;
    if (typeof bounds.cx === 'number') {
      const theta = -(bounds.rotationDeg || 0) * Math.PI / 180;
      const dx = point.x - bounds.cx;
      const dy = point.y - bounds.cy;
      const localX = dx * Math.cos(theta) - dy * Math.sin(theta);
      const localY = dx * Math.sin(theta) + dy * Math.cos(theta);
      return Math.abs(localX) <= bounds.w / 2 && Math.abs(localY) <= bounds.h / 2;
    }
    return point.x >= bounds.x &&
      point.x <= bounds.x + bounds.w &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.h;
  }

  function pickTarget(point) {
    if (contains(state.bounds.name, point)) return 'name';
    if (contains(state.bounds.catchphrase, point)) return 'catchphrase';
    for (let i = state.bounds.extraImages.length - 1; i >= 0; i--) {
      if (contains(state.bounds.extraImages[i], point)) return `extra${i}`;
    }
    if (contains({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }, point)) return 'photo';
    return null;
  }

  function beginDrag(event) {
    const point = canvasPoint(event);
    const target = pickTarget(point);
    if (!target) return;
    event.preventDefault();
    canvas.classList.add('dragging');
    state.drag = {
      target,
      startX: point.x,
      startY: point.y,
      photoX: state.photoX,
      photoY: state.photoY,
      nameX: state.nameX,
      nameY: state.nameY,
      catchphraseX: state.catchphraseX,
      catchphraseY: state.catchphraseY,
    };
    if (target.startsWith('extra')) {
      const i = Number(target.slice(5));
      state.drag.extraXMm = state.extraImages[i].xMm;
      state.drag.extraYMm = state.extraImages[i].yMm;
    }
  }

  function moveDrag(event) {
    if (!state.drag) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const dxMm = pxToMm(point.x - state.drag.startX);
    const dyMm = pxToMm(point.y - state.drag.startY);

    if (state.drag.target === 'photo') {
      state.photoX = state.drag.photoX + point.x - state.drag.startX;
      state.photoY = state.drag.photoY + point.y - state.drag.startY;
      clampPhotoPosition();
    } else if (state.drag.target === 'name') {
      const metrics = nameMetrics();
      const pos = textClamp({ x: state.drag.nameX + dxMm, y: state.drag.nameY + dyMm }, metrics);
      state.nameMoved = true;
      state.nameX = pos.x;
      state.nameY = pos.y;
    } else if (state.drag.target === 'catchphrase') {
      const metrics = catchphraseMetrics();
      const pos = centerClamp(
        { x: state.drag.catchphraseX + dxMm, y: state.drag.catchphraseY + dyMm },
        metrics,
        state.catchphraseRotationDeg,
      );
      state.catchphraseMoved = true;
      state.catchphraseX = pos.x;
      state.catchphraseY = pos.y;
    } else if (state.drag.target.startsWith('extra')) {
      const i = Number(state.drag.target.slice(5));
      const slot = state.extraImages[i];
      slot.xMm = state.drag.extraXMm + dxMm;
      slot.yMm = state.drag.extraYMm + dyMm;
      slot.moved = true;
    }

    drawPreview();
  }

  function endDrag() {
    if (!state.drag) return;
    state.drag = null;
    canvas.classList.remove('dragging');
    updateHiddenInputs();
  }

  function loadPhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        state.photo = image;
        resetPhotoPosition();
        drawPreview();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function loadExtraImage(i, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        state.extraImages[i].image = image;
        drawPreview();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function clearExtraImage(i) {
    state.extraImages[i] = {
      image: null,
      xMm: EXTRA_DEFAULT_POS_MM[i].x,
      yMm: EXTRA_DEFAULT_POS_MM[i].y,
      scalePercent: 100,
      rotationDeg: 0,
      moved: false,
    };
    const input = inputs.extraImages[i];
    if (input?.file) input.file.value = '';
    if (input?.scaleSlider) input.scaleSlider.value = 100;
    if (input?.rotationSlider) input.rotationSlider.value = 0;
    updateHiddenInputs();
    drawPreview();
  }

  inputs.photo?.addEventListener('change', event => loadPhoto(event.target.files[0]));
  document.getElementById('photoResetBtn')?.addEventListener('click', () => {
    resetPhotoPosition();
    drawPreview();
  });
  inputs.fontSelect?.addEventListener('change', event => {
    state.fontKey = event.target.value;
    drawPreview();
    document.fonts?.load(`bold 24px ${activeFontFamily()}`).then(drawPreview).catch(() => {});
  });
  document.getElementById('fontResetBtn')?.addEventListener('click', () => {
    state.fontKey = DEFAULT_FONT_KEY;
    if (inputs.fontSelect) inputs.fontSelect.value = DEFAULT_FONT_KEY;
    drawPreview();
  });
  inputs.nameSizeSlider?.addEventListener('input', event => {
    state.nameSizeFactor = clamp(Number(event.target.value) / 100, 0.7, 1.5);
    drawPreview();
  });
  document.getElementById('nameResetBtn')?.addEventListener('click', () => {
    state.nameSizeFactor = 1;
    if (inputs.nameSizeSlider) inputs.nameSizeSlider.value = 100;
    state.nameMoved = false;
    drawPreview();
  });
  inputs.extraImages.forEach((input, i) => {
    input.file?.addEventListener('change', event => loadExtraImage(i, event.target.files[0]));
    input.scaleSlider?.addEventListener('input', event => {
      state.extraImages[i].scalePercent = Number(event.target.value);
      drawPreview();
    });
    input.rotationSlider?.addEventListener('input', event => {
      state.extraImages[i].rotationDeg = Number(event.target.value);
      drawPreview();
    });
    input.clearBtn?.addEventListener('click', () => clearExtraImage(i));
  });
  inputs.zoomSlider?.addEventListener('input', event => {
    applyZoom(Number(event.target.value) / 100);
    drawPreview();
  });
  inputs.photoRotationSlider?.addEventListener('input', event => {
    state.photoRotationDeg = clamp(Number(event.target.value), -15, 15);
    if (state.photo) {
      const req = requiredCoverSize(state.photoRotationDeg);
      state.baseScale = Math.max(req.w / state.photo.width, req.h / state.photo.height);
      applyZoom(state.zoomFactor);
    }
    drawPreview();
  });
  inputs.photoBrightnessSlider?.addEventListener('input', event => {
    state.photoBrightness = clamp(Number(event.target.value), 50, 150);
    if (inputs.photoBrightnessValue) inputs.photoBrightnessValue.textContent = `${state.photoBrightness}%`;
    drawPreview();
  });
  inputs.logoToggle?.addEventListener('change', drawPreview);
  document.getElementById('logoResetBtn')?.addEventListener('click', () => {
    if (inputs.logoToggle) inputs.logoToggle.checked = true;
    drawPreview();
  });
  inputs.catchphraseOrientationControls.forEach(input => input.addEventListener('change', drawPreview));
  inputs.catchphraseFillControls.forEach(input => input.addEventListener('change', drawPreview));
  [
    inputs.catchphraseRotationSlider,
    inputs.catchphraseSizeSlider,
    inputs.catchphraseStrokeSlider,
  ].forEach(input => {
    input?.addEventListener('input', drawPreview);
  });
  document.getElementById('catchphraseResetBtn')?.addEventListener('click', () => {
    const orientationDefault = document.querySelector('input[name="catchphrase_orientation_ui"][value="vertical"]');
    if (orientationDefault) orientationDefault.checked = true;
    const fillDefault = document.querySelector('input[name="catchphrase_fill_color_ui"][value="white"]');
    if (fillDefault) fillDefault.checked = true;
    if (inputs.catchphraseRotationSlider) inputs.catchphraseRotationSlider.value = 0;
    if (inputs.catchphraseSizeSlider) inputs.catchphraseSizeSlider.value = 100;
    if (inputs.catchphraseStrokeSlider) inputs.catchphraseStrokeSlider.value = 100;
    state.catchphraseMoved = false;
    drawPreview();
  });
  [inputs.catchphrase, inputs.name, inputs.xHandle].forEach(input => {
    input?.addEventListener('input', drawPreview);
  });

  canvas.addEventListener('mousedown', beginDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
  canvas.addEventListener('mouseleave', endDrag);
  canvas.addEventListener('touchstart', beginDrag, { passive: false });
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('touchend', endDrag);
  window.addEventListener('touchcancel', endDrag);

  if (document.fonts?.ready) {
    document.fonts.ready.then(drawPreview);
  } else {
    drawPreview();
  }
})();
