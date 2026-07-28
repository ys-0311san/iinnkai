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
  const submission = {
    form: document.querySelector('form[action="/generate"]'),
    button: document.getElementById('generateSubmitBtn'),
    status: document.getElementById('generateStatus'),
    error: document.getElementById('generateError'),
  };
  let isGenerating = false;

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

  function setGenerateLoading(isLoading) {
    if (!submission.button) return;
    if (!submission.button.dataset.originalText) {
      submission.button.dataset.originalText = submission.button.textContent;
    }
    submission.button.disabled = isLoading;
    submission.button.textContent = isLoading ? '生成中...' : submission.button.dataset.originalText;
    if (submission.status) submission.status.hidden = !isLoading;
  }

  function setGenerateError(message) {
    if (!submission.error) return;
    submission.error.textContent = message || '';
    submission.error.hidden = !message;
  }

  function filenameFromDisposition(disposition) {
    if (!disposition) return 'meishi.pdf';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encoded) {
      try {
        return decodeURIComponent(encoded[1].replace(/"/g, ''));
      } catch (error) {
        return encoded[1].replace(/"/g, '') || 'meishi.pdf';
      }
    }
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    return plain?.[1] || 'meishi.pdf';
  }

  function downloadBlob(response, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFromDisposition(response.headers.get('Content-Disposition'));
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateSubmit(event) {
    event.preventDefault();
    if (isGenerating || !submission.form) return;

    isGenerating = true;
    setGenerateError('');
    setGenerateLoading(true);
    updateHiddenInputs();

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        body: new FormData(submission.form),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      downloadBlob(response, blob);
    } catch (error) {
      setGenerateError('生成に失敗しました。写真・名前・Xアカウントを確認してください。');
    } finally {
      isGenerating = false;
      setGenerateLoading(false);
    }
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
  submission.form?.addEventListener('submit', handleGenerateSubmit);

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

// ===== 横型ポップ（card_v5_pop）: デザイン切り替え＋簡易プレビュー =====
(() => {
  const templateRadios = Array.from(document.querySelectorAll('input[name="template"]'));
  const verticalFields = document.getElementById('verticalFields');
  const popFields = document.getElementById('popFields');
  const verticalPreview = document.getElementById('verticalPreviewWrap');
  const popPreview = document.getElementById('popPreviewWrap');
  const canvas = document.getElementById('popPreview');
  if (!templateRadios.length || !popFields || !canvas) return;

  const ctx = canvas.getContext('2d');
  const S = 10; // px / mm（canvas 970x610 = 97x61mm）
  const ptpx = (pt) => pt * 0.352778 * S; // ptあたりpx = pt * 0.352778mm * S
  const mm = (v) => v * S;

  const C = {
    bg: '#060a14', navy: '#0c152b', border: '#223052', silver: '#b8c7c1',
    off: '#ececE4', sub: '#96a2bc', white: '#eeeee7',
    phBg: '#141e37', phDash: '#465478', phIcon: '#5a688c', phLabel: '#7886a8',
  };
  const ACCENT = { mustard: '#dba02e', coral: '#e95b5c' };
  const FONT = 'Helvetica, Arial, "Helvetica Neue", sans-serif';
  const FONT_MAP = {
    'zen-kaku-gothic-new': '"Zen Kaku Gothic New"',
    'noto-serif-jp': '"Noto Serif JP"',
    'zen-maru-gothic': '"Zen Maru Gothic"',
    'kaisei-decol': '"Kaisei Decol"',
    'yuji-syuku': '"Yuji Syuku"',
  };
  const popFontSelect = document.getElementById('popFontSelect');
  const popSubtitleInput = document.getElementById('popSubtitleInput');
  const popPhotoScale = document.getElementById('popPhotoScale');
  const popPhotoRotation = document.getElementById('popPhotoRotation');
  const popPhotoBrightness = document.getElementById('popPhotoBrightness');
  const nameFontFamily = () => (FONT_MAP[popFontSelect?.value] || FONT_MAP['zen-kaku-gothic-new']) + ', ' + FONT;
  const subtitleLines = () => (popSubtitleInput?.value || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const photoOpts = () => ({
    scale: parseFloat(popPhotoScale?.value) || 100,
    rotation: parseFloat(popPhotoRotation?.value) || 0,
    brightness: parseFloat(popPhotoBrightness?.value) || 100,
  });

  function drawName(x, yb, name, maxMM, basePt, color) {
    const fam = nameFontFamily();
    let size = ptpx(basePt);
    ctx.font = `bold ${size}px ${fam}`;
    while (size > ptpx(basePt * 0.6) && ctx.measureText(name).width > mm(maxMM)) {
      size -= 1;
      ctx.font = `bold ${size}px ${fam}`;
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(name, mm(x), mm(yb));
  }

  const popNameInput = document.getElementById('popNameInput');
  const popXHandleInput = document.getElementById('popXHandleInput');
  const popUrlInput = document.getElementById('popUrlInput');
  const popUsePhoto = document.getElementById('popUsePhotoToggle');
  const popShowQr = document.getElementById('popShowQrToggle');
  const popPhotoInput = document.getElementById('popPhotoInput');
  let popPhotoImg = null;

  // パステルスタイル
  const PASTEL = { ink: '#342e48', ink2: '#786e78', gold: '#a8844a', white: '#faf6ee' };
  const popStyleRadios = Array.from(document.querySelectorAll('input[name="pop_style"]'));
  const popAccentRow = document.getElementById('popAccentRow');
  const popTransNote = document.getElementById('popTransNote');
  const bgImgs = {};
  ['pastel_slot', 'pastel_transparent'].forEach((k) => {
    const im = new Image();
    im.onload = () => { bgImgs[k] = im; drawPopPreview(); };
    im.src = k === 'pastel_slot' ? '/static/pop_bg_slot.png' : '/static/pop_bg_transparent.png';
  });
  const currentStyle = () => {
    const r = popStyleRadios.find((x) => x.checked);
    return r ? r.value : 'pop';
  };

  function accentColor() {
    const r = document.querySelector('input[name="accent"]:checked');
    return ACCENT[r ? r.value : 'mustard'] || ACCENT.mustard;
  }
  function urlLabel(u) {
    return (u || '').trim()
      .replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(mm(x), mm(y), mm(w), mm(h), mm(r));
  }

  // 四隅が内側に抉れた（凹コーナー）矩形パス。装飾額縁の開口部形状。
  function concavePath(x, y, w, h, r) {
    const x0 = mm(x), x1 = mm(x + w), y0 = mm(y), y1 = mm(y + h), R = mm(r);
    ctx.beginPath();
    ctx.moveTo(x0 + R, y0);
    ctx.lineTo(x1 - R, y0);
    ctx.arc(x1, y0, R, Math.PI, Math.PI / 2, true);
    ctx.lineTo(x1, y1 - R);
    ctx.arc(x1, y1, R, -Math.PI / 2, -Math.PI, true);
    ctx.lineTo(x0 + R, y1);
    ctx.arc(x0, y1, R, 0, -Math.PI / 2, true);
    ctx.lineTo(x0, y0 + R);
    ctx.arc(x0, y0, R, Math.PI / 2, 0, true);
    ctx.closePath();
  }

  function drawCover(img, x, y, w, h, xb, yb, opts) {
    opts = opts || {};
    const zoom = Math.max(1, (opts.scale || 100) / 100);
    const rot = ((opts.rotation || 0) * Math.PI) / 180;
    const bright = (opts.brightness || 100) / 100;
    const tw = mm(w), th = mm(h);
    const s = Math.max(tw / img.width, th / img.height) * zoom;
    const rw = img.width * s, rh = img.height * s;
    const dx = mm(x) - (rw - tw) * xb;
    const dy = mm(y) - (rh - th) * yb;
    const cx = mm(x) + tw / 2, cy = mm(y) + th / 2;
    ctx.save();
    if (bright !== 1) ctx.filter = `brightness(${bright})`;
    if (rot) { ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy); }
    ctx.drawImage(img, dx, dy, rw, rh);
    ctx.restore();
  }

  function drawFrame(accent) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.silver;
    ctx.lineWidth = mm(0.5);
    const seg = [[12, 6.5, 85, 6.5], [12, 54.5, 85, 54.5], [6.5, 12, 6.5, 49], [90.5, 12, 90.5, 49]];
    seg.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(mm(x1), mm(y1)); ctx.lineTo(mm(x2), mm(y2)); ctx.stroke();
    });
    ctx.fillStyle = accent;
    rr(6.5 - 1.5, 6.5 - 1.5, 3, 3, 0.9); ctx.fill();
    rr(90.5 - 1.5, 54.5 - 1.5, 3, 3, 0.9); ctx.fill();
    ctx.strokeStyle = C.silver; ctx.lineWidth = mm(0.45);
    [[90.5, 6.5], [6.5, 54.5]].forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(mm(cx), mm(cy), mm(1.6), 0, Math.PI * 2); ctx.stroke();
    });
  }

  function drawPlaceholder(x, y, w, h) {
    ctx.fillStyle = C.phBg; rr(x, y, w, h, 3.2); ctx.fill();
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.setLineDash([mm(1.6), mm(1.6)]);
    ctx.strokeStyle = C.phDash; ctx.lineWidth = mm(0.4);
    rr(x + 3.5, y + 3.5, w - 7, h - 7, 2.2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.phIcon;
    ctx.beginPath(); ctx.arc(mm(cx), mm(cy - 2.5), mm(3.6), 0, Math.PI * 2); ctx.fill();
    rr(cx - 5.5, cy + 1.5, 11, 7, 3.5); ctx.fill();
    ctx.fillStyle = C.phLabel;
    ctx.font = `bold ${ptpx(7.5)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('PHOTO', mm(cx), mm(cy + 17));
    ctx.textAlign = 'left';
  }

  function drawDark() {
    if (!ctx.roundRect) return;
    const accent = accentColor();
    const name = (popNameInput?.value || '').trim() || 'Yuuya';
    let handle = (popXHandleInput?.value || '').trim() || '@yuuya';
    if (!handle.startsWith('@')) handle = '@' + handle;
    const showQr = popShowQr?.checked;
    const usePhoto = popUsePhoto?.checked;
    let label = urlLabel(popUrlInput?.value) || 'mesukemo.uk';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 写真パネル
    const px = 9.5, py = 9.5, pw = 38, ph = 42, pr = 3.2;
    if (usePhoto && popPhotoImg) {
      ctx.save(); rr(px, py, pw, ph, pr); ctx.clip();
      drawCover(popPhotoImg, px, py, pw, ph, 0.52, 0.05, photoOpts());
      ctx.restore();
    } else {
      drawPlaceholder(px, py, pw, ph);
    }
    ctx.strokeStyle = C.border; ctx.lineWidth = mm(0.4);
    rr(px, py, pw, ph, pr); ctx.stroke();

    // インフォカード
    const cx = 50, cy = 19, cw = 38, ch = 33, cr = 3.5;
    ctx.fillStyle = C.navy; rr(cx, cy, cw, ch, cr); ctx.fill();
    ctx.save(); rr(cx, cy, cw, ch, cr); ctx.clip();
    ctx.strokeStyle = accent;
    [[8, 0.5, 0.55], [11, 0.4, 0.35]].forEach(([rad, lw, a]) => {
      ctx.globalAlpha = a; ctx.lineWidth = mm(lw);
      ctx.beginPath(); ctx.arc(mm(cx + cw), mm(cy), mm(rad), 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = C.border; ctx.lineWidth = mm(0.35);
    rr(cx, cy, cw, ch, cr); ctx.stroke();

    drawExtras();

    // テキスト
    const nameX = 55, subX = 58;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    drawName(nameX, 28, name, 29, 19, C.off);
    ctx.fillStyle = accent; rr(nameX, 30.5, 1.3, 9, 0.65); ctx.fill();
    ctx.fillStyle = C.sub;
    subtitleLines().forEach((ln, i) => {
      ctx.font = `${ptpx(7.5)}px ${nameFontFamily()}`;
      ctx.fillText(ln, mm(subX), mm(33.6 + i * 4.0));
    });
    ctx.fillStyle = accent; ctx.font = `bold ${ptpx(11)}px ${FONT}`;
    ctx.fillText(handle, mm(nameX), mm(44));
    const handleW = ctx.measureText(handle).width;

    const qx = 75, qy = 39.5, qs = 11;
    if (showQr) {
      ctx.strokeStyle = accent; ctx.lineWidth = mm(0.5);
      ctx.beginPath(); ctx.moveTo(mm(nameX) + handleW + mm(1.5), mm(43.2)); ctx.lineTo(mm(qx), mm(43.2)); ctx.stroke();
    }

    // URLラベル（幅に応じ縮小→ドメインのみ）
    const labelMax = mm((showQr ? qx - 1.5 : 90.5 - 3.0) - nameX);
    let size = ptpx(8);
    const fits = (t, s) => { ctx.font = `bold ${s}px ${FONT}`; return ctx.measureText(t).width <= labelMax; };
    if (!fits(label, size)) {
      while (size > ptpx(6) && !fits(label, size)) size -= 1;
      if (!fits(label, size)) { label = label.split('/')[0]; size = ptpx(8); while (size > ptpx(6) && !fits(label, size)) size -= 1; }
    }
    ctx.fillStyle = accent; ctx.font = `bold ${size}px ${FONT}`;
    ctx.fillText(label, mm(nameX), mm(49.2));

    // QRプレースホルダー
    if (showQr) {
      ctx.fillStyle = C.white; rr(qx, qy, qs, qs, 1.4); ctx.fill();
      ctx.fillStyle = '#8892a6'; ctx.textAlign = 'center';
      ctx.font = `bold ${ptpx(6)}px ${FONT}`;
      ctx.fillText('QR', mm(qx + qs / 2), mm(qy + qs / 2 + 1.2));
      ctx.textAlign = 'left';
    }

    drawFrame(accent);
  }

  function drawPastel(style) {
    if (!ctx.roundRect) return;
    const bg = bgImgs[style];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    else { ctx.fillStyle = '#e6ddec'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    if (popUsePhoto?.checked && popPhotoImg) {
      if (style === 'pastel_slot') {
        ctx.save(); concavePath(13.3, 12.0, 29.6, 38.6, 3); ctx.clip();
        drawCover(popPhotoImg, 13.3, 12.0, 29.6, 38.6, 0.52, 0.06, photoOpts()); ctx.restore();
      } else {
        const o = photoOpts();
        const zoom = Math.max(1, o.scale / 100);
        const s = Math.min(mm(44) / popPhotoImg.width, mm(55) / popPhotoImg.height) * zoom;
        const w = popPhotoImg.width * s, h = popPhotoImg.height * s;
        const bx = mm(26), by = mm(59) - h / 2;
        ctx.save();
        if (o.brightness !== 100) ctx.filter = `brightness(${o.brightness / 100})`;
        ctx.translate(bx, by); ctx.rotate((o.rotation * Math.PI) / 180);
        ctx.drawImage(popPhotoImg, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    drawExtras();

    const name = (popNameInput?.value || '').trim() || 'Yuuya';
    let handle = (popXHandleInput?.value || '').trim() || '@yuuya';
    if (!handle.startsWith('@')) handle = '@' + handle;
    const showQr = popShowQr?.checked;
    let label = urlLabel(popUrlInput?.value) || 'mesukemo.uk';
    const nx = 53;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    drawName(nx, 27.5, name, 35, 20, PASTEL.ink);
    ctx.fillStyle = PASTEL.gold; rr(nx, 30.5, 1.2, 8.5, 0.6); ctx.fill();
    ctx.fillStyle = PASTEL.ink2;
    subtitleLines().forEach((ln, i) => {
      ctx.font = `${ptpx(7.5)}px ${nameFontFamily()}`;
      ctx.fillText(ln, mm(nx + 3), mm(33.2 + i * 4.0));
    });
    ctx.fillStyle = PASTEL.gold; ctx.font = `bold ${ptpx(11)}px ${FONT}`;
    ctx.fillText(handle, mm(nx), mm(44));
    const labelMax = mm((showQr ? 74 - 1.5 : 90) - nx);
    let size = ptpx(8);
    const fits = (t, s) => { ctx.font = `bold ${s}px ${FONT}`; return ctx.measureText(t).width <= labelMax; };
    if (!fits(label, size)) {
      while (size > ptpx(6) && !fits(label, size)) size -= 1;
      if (!fits(label, size)) { label = label.split('/')[0]; size = ptpx(8); while (size > ptpx(6) && !fits(label, size)) size -= 1; }
    }
    ctx.fillStyle = PASTEL.gold; ctx.font = `bold ${size}px ${FONT}`;
    ctx.fillText(label, mm(nx), mm(49.2));
    if (showQr) {
      ctx.fillStyle = PASTEL.white; rr(74, 39, 11.5, 11.5, 1.5); ctx.fill();
      ctx.fillStyle = '#8892a6'; ctx.textAlign = 'center';
      ctx.font = `bold ${ptpx(6)}px ${FONT}`;
      ctx.fillText('QR', mm(74 + 5.75), mm(39 + 5.75 + 1.2)); ctx.textAlign = 'left';
    }
  }

  function drawPopPreview() {
    const s = currentStyle();
    if (s === 'pop') drawDark(); else drawPastel(s);
  }

  function applyPopStyle() {
    const s = currentStyle();
    if (popAccentRow) popAccentRow.hidden = (s !== 'pop');
    if (popTransNote) popTransNote.hidden = (s !== 'pastel_transparent');
    drawPopPreview();
  }

  function setGroupDisabled(container, disabled) {
    if (!container) return;
    container.querySelectorAll('input, select, textarea, button').forEach((el) => { el.disabled = disabled; });
  }

  function applyTemplate() {
    const checked = templateRadios.find((r) => r.checked);
    const isPop = checked && checked.value === 'pop';
    if (verticalFields) verticalFields.hidden = isPop;
    if (popFields) popFields.hidden = !isPop;
    if (verticalPreview) verticalPreview.hidden = isPop;
    if (popPreview) popPreview.hidden = !isPop;
    setGroupDisabled(verticalFields, isPop);
    setGroupDisabled(popFields, !isPop);
    if (isPop) drawPopPreview();
  }

  // 追加画像（任意位置・プレビュー上でドラッグ）
  const popExtras = [];
  for (let i = 1; i <= 3; i++) {
    const ex = {
      fileEl: document.getElementById(`popExtra${i}Input`),
      scaleEl: document.getElementById(`popExtra${i}Scale`),
      rotEl: document.getElementById(`popExtra${i}Rotation`),
      clearEl: document.getElementById(`popExtra${i}Clear`),
      xEl: document.getElementById(`popExtra${i}X`),
      yEl: document.getElementById(`popExtra${i}Y`),
      img: null, x_mm: 24, y_mm: 12 + i * 5,
    };
    popExtras.push(ex);
    if (ex.fileEl) ex.fileEl.addEventListener('change', () => {
      const f = ex.fileEl.files && ex.fileEl.files[0];
      if (!f) { ex.img = null; drawPopPreview(); return; }
      const im = new Image();
      im.onload = () => { ex.img = im; syncExtra(ex); drawPopPreview(); };
      im.src = URL.createObjectURL(f);
    });
    if (ex.scaleEl) ex.scaleEl.addEventListener('input', drawPopPreview);
    if (ex.rotEl) ex.rotEl.addEventListener('input', drawPopPreview);
    if (ex.clearEl) ex.clearEl.addEventListener('click', () => { if (ex.fileEl) ex.fileEl.value = ''; ex.img = null; drawPopPreview(); });
  }
  function syncExtra(ex) {
    if (ex.xEl) ex.xEl.value = ex.x_mm.toFixed(1);
    if (ex.yEl) ex.yEl.value = ex.y_mm.toFixed(1);
  }
  function drawExtras() {
    popExtras.forEach((ex) => {
      if (!ex.img) return;
      const baseMM = 22 * ((parseFloat(ex.scaleEl?.value) || 100) / 100);
      const r = Math.min(mm(baseMM) / ex.img.width, mm(baseMM) / ex.img.height);
      const w = ex.img.width * r, h = ex.img.height * r;
      const rot = ((parseFloat(ex.rotEl?.value) || 0) * Math.PI) / 180;
      ctx.save();
      ctx.translate(mm(ex.x_mm), mm(ex.y_mm)); ctx.rotate(rot);
      ctx.drawImage(ex.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    });
  }
  function canvasPointMM(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: (p.clientX - rect.left) * (canvas.width / rect.width) / S,
      y: (p.clientY - rect.top) * (canvas.height / rect.height) / S,
    };
  }
  let dragEx = null;
  const dragOff = { x: 0, y: 0 };
  function extraAt(mx, my) {
    for (let k = popExtras.length - 1; k >= 0; k--) {
      const ex = popExtras[k];
      if (!ex.img) continue;
      const baseMM = 22 * ((parseFloat(ex.scaleEl?.value) || 100) / 100);
      const r = Math.min(baseMM / ex.img.width, baseMM / ex.img.height);
      if (Math.abs(mx - ex.x_mm) <= ex.img.width * r / 2 && Math.abs(my - ex.y_mm) <= ex.img.height * r / 2) return ex;
    }
    return null;
  }
  function onExtraDown(e) {
    if (!popExtras.some((x) => x.img)) return;
    const p = canvasPointMM(e);
    const ex = extraAt(p.x, p.y);
    if (ex) { dragEx = ex; dragOff.x = p.x - ex.x_mm; dragOff.y = p.y - ex.y_mm; e.preventDefault(); }
  }
  function onExtraMove(e) {
    if (!dragEx) return;
    const p = canvasPointMM(e);
    dragEx.x_mm = Math.max(0, Math.min(97, p.x - dragOff.x));
    dragEx.y_mm = Math.max(0, Math.min(61, p.y - dragOff.y));
    syncExtra(dragEx); drawPopPreview(); e.preventDefault();
  }
  const onExtraUp = () => { dragEx = null; };
  canvas.addEventListener('mousedown', onExtraDown);
  window.addEventListener('mousemove', onExtraMove);
  window.addEventListener('mouseup', onExtraUp);
  canvas.addEventListener('touchstart', onExtraDown, { passive: false });
  window.addEventListener('touchmove', onExtraMove, { passive: false });
  window.addEventListener('touchend', onExtraUp);

  templateRadios.forEach((r) => r.addEventListener('change', applyTemplate));
  popStyleRadios.forEach((r) => r.addEventListener('change', applyPopStyle));
  [popNameInput, popXHandleInput, popUrlInput].forEach((el) => el && el.addEventListener('input', drawPopPreview));
  [popUsePhoto, popShowQr].forEach((el) => el && el.addEventListener('change', drawPopPreview));
  document.querySelectorAll('input[name="accent"]').forEach((el) => el.addEventListener('change', drawPopPreview));
  if (popFontSelect) popFontSelect.addEventListener('change', drawPopPreview);
  [popSubtitleInput, popPhotoScale, popPhotoRotation, popPhotoBrightness].forEach((el) => el && el.addEventListener('input', drawPopPreview));
  if (popPhotoInput) {
    popPhotoInput.addEventListener('change', () => {
      const file = popPhotoInput.files && popPhotoInput.files[0];
      if (!file) { popPhotoImg = null; drawPopPreview(); return; }
      const img = new Image();
      img.onload = () => { popPhotoImg = img; drawPopPreview(); };
      img.src = URL.createObjectURL(file);
    });
  }

  applyTemplate();
  applyPopStyle();
  if (document.fonts?.ready) document.fonts.ready.then(drawPopPreview);
})();
