/* ==========================================================================
   Alam's Dump — Retro & CRT effect additions
   ASCII, ANSI, Terminal, Teletext, Floyd-Steinberg, Dot Matrix.
   Same additive registry-merge pattern as pixel-print-v2.js.
   ========================================================================== */

(function () {
  'use strict';

  function num(id, fallback) {
    const el = document.getElementById(id);
    return el ? Number(el.value) : fallback;
  }

  const ASCII_RAMP = ' .:-=+*#%@';

  function applyAscii(canvas, cell, color) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const source = ctx.getImageData(0, 0, width, height).data;
    ctx.save();
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${cell}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell * 0.6) {
        const sx = clamp(Math.round(x), 0, width - 1);
        const sy = clamp(Math.round(y), 0, height - 1);
        const idx = (sy * width + sx) * 4;
        const l = luma(source[idx] / 255, source[idx + 1] / 255, source[idx + 2] / 255);
        const char = ASCII_RAMP[Math.min(ASCII_RAMP.length - 1, Math.floor(l * ASCII_RAMP.length))];
        if (char !== ' ') ctx.fillText(char, x, y);
      }
    }
    ctx.restore();
  }

  const ANSI_PALETTE = [
    [0, 0, 0], [170, 0, 0], [0, 170, 0], [170, 85, 0],
    [0, 0, 170], [170, 0, 170], [0, 170, 170], [170, 170, 170],
  ];

  function nearestAnsi(r, g, b) {
    let best = ANSI_PALETTE[0];
    let bestDist = Infinity;
    ANSI_PALETTE.forEach((color) => {
      const dist = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (dist < bestDist) { bestDist = dist; best = color; }
    });
    return best;
  }

  function applyAnsi(canvas, cell) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const source = ctx.getImageData(0, 0, width, height).data;
    ctx.save();
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const sx = clamp(Math.round(x + cell / 2), 0, width - 1);
        const sy = clamp(Math.round(y + cell / 2), 0, height - 1);
        const idx = (sy * width + sx) * 4;
        const [r, g, b] = nearestAnsi(source[idx], source[idx + 1], source[idx + 2]);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.restore();
  }

  function applyTerminal(canvas, glow, phosphor) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    const tint = phosphor > 0.5 ? [255, 176, 0] : [64, 255, 120];
    for (let i = 0; i < data.length; i += 4) {
      const l = luma(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
      data[i] = clamp255(tint[0] * l);
      data[i + 1] = clamp255(tint[1] * l);
      data[i + 2] = clamp255(tint[2] * l);
    }
    ctx.putImageData(imageData, 0, 0);
    if (glow > 0) {
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      copy.getContext('2d').drawImage(canvas, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp01(glow) * 0.5;
      ctx.filter = 'blur(3px)';
      ctx.drawImage(copy, 0, 0);
      ctx.restore();
    }
  }

  function applyTeletext(canvas, cell) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const source = ctx.getImageData(0, 0, width, height).data;
    const palette = [
      [0, 0, 0], [255, 0, 0], [0, 255, 0], [255, 255, 0],
      [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255],
    ];
    ctx.save();
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const sx = clamp(Math.round(x + cell / 2), 0, width - 1);
        const sy = clamp(Math.round(y + cell / 2), 0, height - 1);
        const idx = (sy * width + sx) * 4;
        let best = palette[0];
        let bestDist = Infinity;
        palette.forEach((color) => {
          const dist = (source[idx] - color[0]) ** 2 + (source[idx + 1] - color[1]) ** 2 + (source[idx + 2] - color[2]) ** 2;
          if (dist < bestDist) { bestDist = dist; best = color; }
        });
        ctx.fillStyle = `rgb(${best[0]}, ${best[1]}, ${best[2]})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.restore();
  }

  function applyFloydSteinberg(canvas, levels) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    const gray = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      gray[p] = luma(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255) * 255;
    }
    const step = 255 / Math.max(1, levels - 1);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x;
        const old = gray[p];
        const quantized = clamp255(Math.round(old / step) * step);
        const error = old - quantized;
        gray[p] = quantized;
        if (x + 1 < width) gray[p + 1] += error * (7 / 16);
        if (x - 1 >= 0 && y + 1 < height) gray[p + width - 1] += error * (3 / 16);
        if (y + 1 < height) gray[p + width] += error * (5 / 16);
        if (x + 1 < width && y + 1 < height) gray[p + width + 1] += error * (1 / 16);
      }
    }
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const v = clamp255(gray[p]);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function applyDotMatrix(canvas, cell, strength) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const source = ctx.getImageData(0, 0, width, height).data;
    ctx.save();
    ctx.fillStyle = '#05070d';
    ctx.globalAlpha = 1;
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const sx = clamp(Math.round(x + cell / 2), 0, width - 1);
        const sy = clamp(Math.round(y + cell / 2), 0, height - 1);
        const idx = (sy * width + sx) * 4;
        const l = luma(source[idx] / 255, source[idx + 1] / 255, source[idx + 2] / 255);
        const radius = l * cell * 0.45 * clamp01(strength);
        if (radius <= 0.3) continue;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${source[idx]}, ${source[idx + 1]}, ${source[idx + 2]})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const NEW_DEFS = {
    ascii: { enabledId: 'asciiEnable', run: (canvas) => applyAscii(canvas, num('asciiCell', 9), '#54f3ff') },
    ansi: { enabledId: 'ansiEnable', run: (canvas) => applyAnsi(canvas, num('ansiCell', 8)) },
    terminal: { enabledId: 'terminalEnable', run: (canvas) => applyTerminal(canvas, num('terminalGlow', 0.4), num('terminalPhosphor', 0)) },
    teletext: { enabledId: 'teletextEnable', run: (canvas) => applyTeletext(canvas, num('teletextCell', 10)) },
    floydSteinberg: { enabledId: 'floydSteinbergEnable', run: (canvas) => applyFloydSteinberg(canvas, num('floydSteinbergLevels', 3)) },
    dotMatrix: { enabledId: 'dotMatrixEnable', run: (canvas) => applyDotMatrix(canvas, num('dotMatrixCell', 6), num('dotMatrixStrength', 0.7)) },
  };

  window.AlamsDumpEffectDefs = Object.assign(window.AlamsDumpEffectDefs || {}, NEW_DEFS);

  document.addEventListener('DOMContentLoaded', () => {
    const rangeIds = [
      'asciiCell', 'ansiCell', 'terminalGlow', 'terminalPhosphor',
      'teletextCell', 'floydSteinbergLevels', 'dotMatrixCell', 'dotMatrixStrength',
    ];
    const rerender = () => window.alamsDumpRerender?.();
    rangeIds.forEach((id) => document.getElementById(id)?.addEventListener('input', rerender));
  });
})();
