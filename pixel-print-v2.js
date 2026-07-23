/* ==========================================================================
   Alam's Dump — Pixel & Digital + Print & Analog effects
   Additive module. Loads after effects-v2.js, before cards-v2.js, so its
   entries are present in window.AlamsDumpEffectDefs before the card system
   wires up enable/disable, stacking, favorites, and thumbnails — nothing
   in cards-v2.js needs to change for these to work.
   ========================================================================== */

(function () {
  'use strict';

  function num(id, fallback) {
    const el = document.getElementById(id);
    return el ? Number(el.value) : fallback;
  }

  function withImageData(canvas, mutate) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    mutate(imageData.data, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
    return ctx;
  }

  function pixelate(canvas, blockSize) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const w = Math.max(1, Math.round(width / Math.max(2, blockSize)));
    const h = Math.max(1, Math.round(height / Math.max(2, blockSize)));
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    small.getContext('2d').drawImage(canvas, 0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(small, 0, 0, w, h, 0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
  }

  function quantizeStep(value, levels) {
    const step = 255 / Math.max(1, levels - 1);
    return clamp255(Math.round(value / step) * step);
  }

  /* --------------------------- Pixel & Digital --------------------------- */

  function apply8BitSprite(canvas, blockSize, paletteSize) {
    pixelate(canvas, blockSize);
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = quantizeStep(data[i], paletteSize);
        data[i + 1] = quantizeStep(data[i + 1], paletteSize);
        data[i + 2] = quantizeStep(data[i + 2], paletteSize);
      }
    });
  }

  function apply16BitSprite(canvas, blockSize, paletteSize) {
    pixelate(canvas, blockSize);
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = quantizeStep(data[i], paletteSize);
        data[i + 1] = quantizeStep(data[i + 1], paletteSize);
        data[i + 2] = quantizeStep(data[i + 2], paletteSize);
      }
    });
  }

  function applyFatPixel(canvas, blockSize) {
    pixelate(canvas, blockSize);
  }

  function applyBootlegPixel(canvas, blockSize, paletteSize, hueShift) {
    pixelate(canvas, blockSize);
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const l = luma(r, g, b);
        data[i] = quantizeStep(clamp255((r + hueShift * 0.3) * 255), paletteSize);
        data[i + 1] = quantizeStep(clamp255(g * 255), paletteSize);
        data[i + 2] = quantizeStep(clamp255((b - hueShift * 0.2) * 255), paletteSize);
        if (l < 0.06) { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; }
      }
    });
  }

  function applyPixelMosaic(canvas, blockSize, gapStrength) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    pixelate(canvas, blockSize);
    if (gapStrength <= 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(5, 7, 13, ${clamp01(gapStrength)})`;
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += blockSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += blockSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function applyLcdPixel(canvas, blockSize, gridStrength) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    pixelate(canvas, blockSize);
    if (gridStrength <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let y = 0; y < height; y += Math.max(2, blockSize)) {
      for (let x = 0; x < width; x += Math.max(2, blockSize)) {
        const cell = Math.max(2, blockSize);
        const third = cell / 3;
        ctx.fillStyle = `rgba(255, 90, 90, ${1 - clamp01(gridStrength) * 0.5})`;
        ctx.fillRect(x, y, third, cell);
        ctx.fillStyle = `rgba(90, 255, 90, ${1 - clamp01(gridStrength) * 0.5})`;
        ctx.fillRect(x + third, y, third, cell);
        ctx.fillStyle = `rgba(90, 90, 255, ${1 - clamp01(gridStrength) * 0.5})`;
        ctx.fillRect(x + third * 2, y, third, cell);
      }
    }
    ctx.restore();
  }

  function applyPixelStretch(canvas, intensity, seed) {
    if (intensity <= 0) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    const rand = seededRandom(seed);
    const rows = Math.max(1, Math.round(intensity * 12));
    for (let i = 0; i < rows; i += 1) {
      const y = Math.floor(rand() * height);
      const rowH = Math.max(1, Math.floor(rand() * 3) + 1);
      const stretchTo = Math.floor(rowH + rand() * height * 0.12 * intensity);
      ctx.drawImage(copy, 0, y, width, rowH, 0, y, width, stretchTo);
    }
  }

  function applyNearestNeighborUpscale(canvas, downscaleFactor) {
    pixelate(canvas, downscaleFactor);
  }

  /* --------------------------- Print & Analog --------------------------- */

  function halftoneDots(canvas, cell, angleDeg, ink) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const source = ctx.getImageData(0, 0, width, height).data;
    const angle = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.save();
    ctx.fillStyle = `rgb(${ink[0]}, ${ink[1]}, ${ink[2]})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const sx = clamp(Math.round(x + cell / 2), 0, width - 1);
        const sy = clamp(Math.round(y + cell / 2), 0, height - 1);
        const idx = (sy * width + sx) * 4;
        const l = luma(source[idx] / 255, source[idx + 1] / 255, source[idx + 2] / 255);
        const radius = (1 - l) * cell * 0.62;
        if (radius <= 0.3) continue;
        const cx = x + cell / 2 + (cos - sin) * 0;
        const cy = y + cell / 2 + (sin + cos) * 0;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function applyHalftonePrint(canvas, cell, angle) {
    halftoneDots(canvas, cell, angle, [8, 10, 14]);
  }

  function applyNewspaperPrint(canvas, cell, tint) {
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const l = luma(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255) * 255;
        data[i] = l;
        data[i + 1] = l;
        data[i + 2] = l;
      }
    });
    halftoneDots(canvas, cell, 45, [20, 16, 12]);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(233, 221, 194, ${1 - clamp01(tint)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function applyComicPrint(canvas, cell, posterizeLevels) {
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = quantizeStep(data[i], posterizeLevels);
        data[i + 1] = quantizeStep(data[i + 1], posterizeLevels);
        data[i + 2] = quantizeStep(data[i + 2], posterizeLevels);
      }
    });
    halftoneDots(canvas, cell, 15, [255, 250, 240]);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }

  function applyCmykPrint(canvas, misregistration, inkStrength) {
    const ctx = canvas.getContext('2d');
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    const offset = misregistration * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = clamp01(inkStrength);
    ctx.drawImage(copy, -offset, 0);
    ctx.drawImage(copy, offset, offset * 0.6);
    ctx.drawImage(copy, 0, -offset);
    ctx.restore();
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = quantizeStep(data[i], 6);
        data[i + 1] = quantizeStep(data[i + 1], 6);
        data[i + 2] = quantizeStep(data[i + 2], 6);
      }
    });
  }

  function applyRisograph(canvas, misregistration, tintStrength) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const l = luma(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
        data[i] = clamp255(lerp(20, 255, l));
        data[i + 1] = clamp255(lerp(20, 90, l));
        data[i + 2] = clamp255(lerp(60, 140, l));
      }
    });
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = clamp01(tintStrength);
    ctx.drawImage(copy, misregistration * 4, misregistration * 2);
    ctx.restore();
  }

  function applyScreenPrint(canvas, cell, posterizeLevels) {
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = quantizeStep(data[i], posterizeLevels);
        data[i + 1] = quantizeStep(data[i + 1], posterizeLevels);
        data[i + 2] = quantizeStep(data[i + 2], posterizeLevels);
      }
    });
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.filter = `blur(${Math.max(0.4, cell * 0.05)}px)`;
    ctx.globalAlpha = 0.3;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }

  function applyOffsetPrint(canvas, cell, misregistration) {
    applyCmykPrint(canvas, misregistration, 0.7);
    halftoneDots(canvas, cell, 22, [10, 10, 10]);
  }

  function applyInkBleed(canvas, spread, strength) {
    const ctx = canvas.getContext('2d');
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'darken';
    ctx.filter = `blur(${Math.max(0.5, spread)}px)`;
    ctx.globalAlpha = clamp01(strength);
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
  }

  /* ------------------------------ Registry ------------------------------ */

  const NEW_DEFS = {
    sprite8: { enabledId: 'sprite8Enable', run: (canvas) => apply8BitSprite(canvas, num('sprite8Block', 10), num('sprite8Palette', 4)) },
    sprite16: { enabledId: 'sprite16Enable', run: (canvas) => apply16BitSprite(canvas, num('sprite16Block', 6), num('sprite16Palette', 8)) },
    fatPixel: { enabledId: 'fatPixelEnable', run: (canvas) => applyFatPixel(canvas, num('fatPixelBlock', 16)) },
    bootlegPixel: { enabledId: 'bootlegPixelEnable', run: (canvas) => applyBootlegPixel(canvas, num('bootlegPixelBlock', 10), num('bootlegPixelPalette', 5), num('bootlegPixelHue', 0.4)) },
    pixelMosaic: { enabledId: 'pixelMosaicEnable', run: (canvas) => applyPixelMosaic(canvas, num('pixelMosaicBlock', 12), num('pixelMosaicGap', 0.4)) },
    lcdPixel: { enabledId: 'lcdPixelEnable', run: (canvas) => applyLcdPixel(canvas, num('lcdPixelBlock', 8), num('lcdPixelGrid', 0.5)) },
    pixelStretch: { enabledId: 'pixelStretchEnable', run: (canvas, seed) => applyPixelStretch(canvas, num('pixelStretchIntensity', 0.4), seed + 11) },
    nnUpscale: { enabledId: 'nnUpscaleEnable', run: (canvas) => applyNearestNeighborUpscale(canvas, num('nnUpscaleBlock', 8)) },

    halftonePrint: { enabledId: 'halftonePrintEnable', run: (canvas) => applyHalftonePrint(canvas, num('halftonePrintCell', 6), num('halftonePrintAngle', 45)) },
    newspaperPrint: { enabledId: 'newspaperPrintEnable', run: (canvas) => applyNewspaperPrint(canvas, num('newspaperPrintCell', 5), num('newspaperPrintTint', 0.25)) },
    comicPrint: { enabledId: 'comicPrintEnable', run: (canvas) => applyComicPrint(canvas, num('comicPrintCell', 6), num('comicPrintLevels', 5)) },
    cmykPrint: { enabledId: 'cmykPrintEnable', run: (canvas) => applyCmykPrint(canvas, num('cmykPrintMisreg', 0.5), num('cmykPrintInk', 0.6)) },
    risograph: { enabledId: 'risographEnable', run: (canvas) => applyRisograph(canvas, num('risographMisreg', 0.5), num('risographTint', 0.6)) },
    screenPrint: { enabledId: 'screenPrintEnable', run: (canvas) => applyScreenPrint(canvas, num('screenPrintCell', 8), num('screenPrintLevels', 5)) },
    offsetPrint: { enabledId: 'offsetPrintEnable', run: (canvas) => applyOffsetPrint(canvas, num('offsetPrintCell', 6), num('offsetPrintMisreg', 0.4)) },
    inkBleed: { enabledId: 'inkBleedEnable', run: (canvas) => applyInkBleed(canvas, num('inkBleedSpread', 2), num('inkBleedStrength', 0.5)) },
  };

  window.AlamsDumpEffectDefs = Object.assign(window.AlamsDumpEffectDefs || {}, NEW_DEFS);

  document.addEventListener('DOMContentLoaded', () => {
    const rangeIds = [
      'sprite8Block', 'sprite8Palette', 'sprite16Block', 'sprite16Palette',
      'fatPixelBlock', 'bootlegPixelBlock', 'bootlegPixelPalette', 'bootlegPixelHue',
      'pixelMosaicBlock', 'pixelMosaicGap', 'lcdPixelBlock', 'lcdPixelGrid',
      'pixelStretchIntensity', 'nnUpscaleBlock',
      'halftonePrintCell', 'halftonePrintAngle', 'newspaperPrintCell', 'newspaperPrintTint',
      'comicPrintCell', 'comicPrintLevels', 'cmykPrintMisreg', 'cmykPrintInk',
      'risographMisreg', 'risographTint', 'screenPrintCell', 'screenPrintLevels',
      'offsetPrintCell', 'offsetPrintMisreg', 'inkBleedSpread', 'inkBleedStrength',
    ];
    const rerender = () => window.alamsDumpRerender?.();
    rangeIds.forEach((id) => document.getElementById(id)?.addEventListener('input', rerender));
  });
})();
