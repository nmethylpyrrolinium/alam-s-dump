/* ==========================================================================
   Alam's Dump — Extras v2
   Toy Camera/Lomo, Infrared Simulation, VHS/Analog Video (standalone),
   Posterize + Solarize. Same additive registry-merge pattern as the other
   v2 effect files.
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
  }

  function applyToyCameraLomo(canvas, vignette, saturationBoost, leak) {
    const { width, height } = canvas;
    withImageData(canvas, (data) => {
      const cx = width / 2;
      const cy = height / 2;
      const maxDist = Math.hypot(cx, cy);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const dist = Math.hypot(x - cx, y - cy) / maxDist;
          const dark = 1 - smoothstep(0.45, 1.1, dist) * vignette;
          const [h, s, l] = rgbToHslLocal(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
          const [r2, g2, b2] = hslToRgbLocal(h, clamp01(s * (1 + saturationBoost)), l);
          data[i] = clamp255(r2 * 255 * dark);
          data[i + 1] = clamp255(g2 * 255 * dark);
          data[i + 2] = clamp255(b2 * 255 * dark);
        }
      }
    });
    if (leak > 0) {
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(width * 0.85, height * 0.1, 0, width * 0.85, height * 0.1, Math.max(width, height) * 0.6);
      gradient.addColorStop(0, `rgba(255, 150, 60, ${clamp01(leak)})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  function rgbToHslLocal(r, g, b) {
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

  function hueToRgbLocal(p, q, t) {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  }

  function hslToRgbLocal(h, s, l) {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hueToRgbLocal(p, q, h + 1 / 3), hueToRgbLocal(p, q, h), hueToRgbLocal(p, q, h - 1 / 3)];
  }

  function applyInfrared(canvas, glow, strength) {
    const { width, height } = canvas;
    withImageData(canvas, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        // Foliage/greens push bright (classic IR "white trees"); skies go dark.
        const irLuma = clamp01(g * 1.3 - b * 0.5 + r * 0.1);
        const mixed = lerp(luma(r, g, b), irLuma, strength);
        const boosted = clamp01(0.5 + (mixed - 0.5) * 1.3);
        data[i] = boosted * 255;
        data[i + 1] = boosted * 255;
        data[i + 2] = boosted * 255;
      }
    });
    if (glow > 0) {
      const ctx = canvas.getContext('2d');
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      copy.getContext('2d').drawImage(canvas, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp01(glow) * 0.5;
      ctx.filter = 'blur(6px)';
      ctx.drawImage(copy, 0, 0);
      ctx.restore();
    }
  }

  function applyVhsAnalog(canvas, trackingStrength, bleedStrength, noiseStrength, seed) {
    const { width, height } = canvas;
    const ctx = canvas.getContext('2d');
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    const rand = seededRandom(seed);

    // Color bleed: per-row horizontal chroma shift.
    if (bleedStrength > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      const shift = Math.max(1, Math.round(bleedStrength * 6));
      ctx.drawImage(copy, shift, 0);
      ctx.drawImage(copy, -shift, 0);
      ctx.restore();
    }

    // Tracking lines: occasional bright/dark horizontal jitter bands.
    if (trackingStrength > 0) {
      const bands = Math.max(1, Math.round(trackingStrength * 8));
      ctx.save();
      for (let i = 0; i < bands; i += 1) {
        const y = Math.floor(rand() * height);
        const bandH = Math.max(1, Math.floor(rand() * 4));
        const offset = Math.round((rand() - 0.5) * width * 0.05 * trackingStrength);
        ctx.drawImage(copy, 0, y, width, bandH, offset, y, width, bandH);
      }
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < bands; i += 1) {
        const y = Math.floor(rand() * height);
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    }

    // Static noise speckle.
    if (noiseStrength > 0) {
      withImageData(canvas, (data) => {
        for (let i = 0; i < data.length; i += 4) {
          if (rand() > 0.985) {
            const speck = rand() * 255 * noiseStrength;
            data[i] = clamp255(data[i] + speck);
            data[i + 1] = clamp255(data[i + 1] + speck);
            data[i + 2] = clamp255(data[i + 2] + speck);
          }
        }
      });
    }
  }

  function applyPosterizeSolarize(canvas, levels, solarizeThreshold) {
    withImageData(canvas, (data) => {
      const step = 255 / Math.max(1, levels - 1);
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c += 1) {
          let v = data[i + c];
          if (solarizeThreshold < 1 && v / 255 > solarizeThreshold) v = 255 - v;
          data[i + c] = clamp255(Math.round(v / step) * step);
        }
      }
    });
  }

  const NEW_DEFS = {
    toyCamera: {
      enabledId: 'toyCameraEnable',
      run: (canvas) => applyToyCameraLomo(canvas, num('toyCameraVignette', 0.6), num('toyCameraSaturation', 0.4), num('toyCameraLeak', 0.3)),
    },
    infrared: {
      enabledId: 'infraredEnable',
      run: (canvas) => applyInfrared(canvas, num('infraredGlow', 0.3), num('infraredStrength', 0.8)),
    },
    vhsAnalog: {
      enabledId: 'vhsAnalogEnable',
      run: (canvas, seed) => applyVhsAnalog(canvas, num('vhsAnalogTracking', 0.4), num('vhsAnalogBleed', 0.4), num('vhsAnalogNoise', 0.3), seed + 13),
    },
    posterizeSolarize: {
      enabledId: 'posterizeSolarizeEnable',
      run: (canvas) => applyPosterizeSolarize(canvas, num('posterizeSolarizeLevels', 5), num('posterizeSolarizeThreshold', 0.7)),
    },
  };

  window.AlamsDumpEffectDefs = Object.assign(window.AlamsDumpEffectDefs || {}, NEW_DEFS);

  document.addEventListener('DOMContentLoaded', () => {
    const rangeIds = [
      'toyCameraVignette', 'toyCameraSaturation', 'toyCameraLeak',
      'infraredGlow', 'infraredStrength',
      'vhsAnalogTracking', 'vhsAnalogBleed', 'vhsAnalogNoise',
      'posterizeSolarizeLevels', 'posterizeSolarizeThreshold',
    ];
    const rerender = () => window.alamsDumpRerender?.();
    rangeIds.forEach((id) => document.getElementById(id)?.addEventListener('input', rerender));
  });
})();
