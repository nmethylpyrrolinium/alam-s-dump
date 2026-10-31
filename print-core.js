/* Pure halftone rasterizer shared by the print effects and Node regression tests. */
(function exposePrintCore(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlamsDumpPrintCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function makePrintCore() {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function luminance(data, index) {
    return (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
  }

  // Draw opaque ink dots over an opaque paper stock. The screen grid is
  // rotated in image space, so changing angle changes both sample positions
  // and the visible dot registration. White input leaves paper; black input
  // prints the largest dots. `paper` and `ink` are RGB triples.
  function renderHalftone(imageData, cellSize, angleDegrees, ink, paper) {
    const { width, height, data: source } = imageData || {};
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
      || !source || source.length !== width * height * 4) {
      throw new TypeError('A valid RGBA image is required.');
    }
    if (!Array.isArray(ink) || ink.length !== 3 || !Array.isArray(paper) || paper.length !== 3) {
      throw new TypeError('Ink and paper must be RGB triples.');
    }

    const cell = clamp(Math.round(Number(cellSize) || 1), 2, 128);
    const angle = (Number(angleDegrees) || 0) * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const output = new Uint8ClampedArray(source.length);
    // A pixel belongs to the nearest rotated lattice point. Use its dot's
    // center-sampled luminance to keep dot diameters stable within each cell.
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const u = x * cos + y * sin;
        const v = -x * sin + y * cos;
        const gx = Math.floor(u / cell);
        const gy = Math.floor(v / cell);
        const cx = (gx + 0.5) * cell * cos - (gy + 0.5) * cell * sin;
        const cy = (gx + 0.5) * cell * sin + (gy + 0.5) * cell * cos;
        const sx = clamp(Math.round(cx), 0, width - 1);
        const sy = clamp(Math.round(cy), 0, height - 1);
        const sampleIndex = (sy * width + sx) * 4;
        const isPureWhite = source[sampleIndex] === 255 && source[sampleIndex + 1] === 255 && source[sampleIndex + 2] === 255;
        const radius = isPureWhite ? 0 : Math.sqrt(1 - luminance(source, sampleIndex)) * cell * 0.48;
        const distance = Math.hypot(x - cx, y - cy);
        const coverage = radius <= 0 ? 0 : clamp(radius + 0.5 - distance, 0, 1);
        const index = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          output[index + channel] = paper[channel] * (1 - coverage) + ink[channel] * coverage;
        }
        output[index + 3] = 255;
      }
    }

    return { data: output, width, height };
  }

  return { renderHalftone };
});
