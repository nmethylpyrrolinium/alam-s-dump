/* ==========================================================================
   Alam's Dump — Color & Tone expansion
   HSL, tone curve, Levels, White Balance, Vibrance, Shadows/Highlights.
   These are base adjustments, not stackable "effects" — same treatment as
   the existing Cyan shadow slider: always read live and applied directly,
   no Enable checkbox, no card, no favorites/stack slot consumed.
   ========================================================================== */

(function () {
  'use strict';

  function num(id, fallback) {
    const el = document.getElementById(id);
    return el ? Number(el.value) : fallback;
  }

  function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    return [h, s, l];
  }

  function hueToRgb(p, q, t) {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
  }

  function applyColorGrade(canvas) {
    const hueShift = num('hueControl', 0) / 360;
    const satMul = 1 + num('saturationControl', 0);
    const lightAdd = num('lightnessControl', 0);
    const shadowLift = num('curveShadowsControl', 0);
    const midShift = num('curveMidsControl', 0);
    const highlightPull = num('curveHighlightsControl', 0);
    const blackPoint = num('levelsBlackControl', 0);
    const whitePoint = num('levelsWhiteControl', 1);
    const gamma = num('levelsGammaControl', 1);
    const temperature = num('whiteBalanceTempControl', 0);
    const tint = num('whiteBalanceTintControl', 0);
    const vibrance = num('vibranceControl', 0);
    const shadowsAdj = num('shadowsControl', 0);
    const highlightsAdj = num('highlightsControl', 0);

    const active = hueShift !== 0 || satMul !== 1 || lightAdd !== 0 || shadowLift !== 0
      || midShift !== 0 || highlightPull !== 0 || blackPoint !== 0 || whitePoint !== 1
      || gamma !== 1 || temperature !== 0 || tint !== 0 || vibrance !== 0
      || shadowsAdj !== 0 || highlightsAdj !== 0;
    if (!active) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const whiteRange = Math.max(0.01, whitePoint - blackPoint);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      // White balance: warm/cool temperature + green/magenta tint.
      r = clamp01(r + temperature * 0.12);
      b = clamp01(b - temperature * 0.12);
      g = clamp01(g + tint * 0.1);

      // HSL hue/saturation/lightness.
      if (hueShift !== 0 || satMul !== 1 || lightAdd !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b);
        const newH = (h + hueShift + 1) % 1;
        const newS = clamp01(s * satMul);
        const newL = clamp01(l + lightAdd);
        [r, g, b] = hslToRgb(newH, newS, newL);
      }

      // Vibrance: boosts low-saturation colors more than already-vivid ones.
      if (vibrance !== 0) {
        const [, s] = rgbToHsl(r, g, b);
        const [h2, , l2] = rgbToHsl(r, g, b);
        const boost = vibrance * (1 - s);
        [r, g, b] = hslToRgb(h2, clamp01(s + boost), l2);
      }

      // Levels: black/white point + gamma.
      r = clamp01((r - blackPoint) / whiteRange);
      g = clamp01((g - blackPoint) / whiteRange);
      b = clamp01((b - blackPoint) / whiteRange);
      if (gamma !== 1) {
        const invGamma = 1 / Math.max(0.1, gamma);
        r = Math.pow(r, invGamma);
        g = Math.pow(g, invGamma);
        b = Math.pow(b, invGamma);
      }

      // Simplified 3-point tone curve: shadows / mids / highlights.
      const l3 = luma(r, g, b);
      const shadowWeight = smoothstep(0.5, 0, l3);
      const midWeight = 1 - Math.abs(l3 - 0.5) * 2;
      const highlightWeight = smoothstep(0.5, 1, l3);
      const curveDelta = shadowLift * shadowWeight + midShift * Math.max(0, midWeight) + highlightPull * highlightWeight;
      r = clamp01(r + curveDelta);
      g = clamp01(g + curveDelta);
      b = clamp01(b + curveDelta);

      // Shadows/Highlights: region-targeted brightness.
      const l4 = luma(r, g, b);
      const shadowMask = smoothstep(0.55, 0, l4);
      const highlightMask = smoothstep(0.45, 1, l4);
      r = clamp01(r + shadowsAdj * shadowMask - highlightsAdj * highlightMask);
      g = clamp01(g + shadowsAdj * shadowMask - highlightsAdj * highlightMask);
      b = clamp01(b + shadowsAdj * shadowMask - highlightsAdj * highlightMask);

      data[i] = r * 255;
      data[i + 1] = g * 255;
      data[i + 2] = b * 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  window.alamsDumpApplyColorGrade = applyColorGrade;

  document.addEventListener('DOMContentLoaded', () => {
    const rangeIds = [
      'hueControl', 'saturationControl', 'lightnessControl',
      'curveShadowsControl', 'curveMidsControl', 'curveHighlightsControl',
      'levelsBlackControl', 'levelsWhiteControl', 'levelsGammaControl',
      'whiteBalanceTempControl', 'whiteBalanceTintControl',
      'vibranceControl', 'shadowsControl', 'highlightsControl',
    ];
    const rerender = () => window.alamsDumpRerender?.();
    rangeIds.forEach((id) => document.getElementById(id)?.addEventListener('input', rerender));
  });
})();
