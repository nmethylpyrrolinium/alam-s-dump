/* ==========================================================================
   Alam's Dump — Effects v2: Film & Light + Glitch & Fracture
   Additive module. Loaded AFTER app.js (defer). Reuses app.js's existing
   global helpers (clamp, clamp01, clamp255, luma, smoothstep, lerp,
   seededRandom) — classic <script> tags on one page share a single global
   lexical scope, so these are available here without re-declaring them
   (re-declaring a const with the same name would throw).

   Hooks into the pipeline via exactly one call site app.js exposes:
   window.applyAlamsDumpExtraEffects(canvas, seed) — invoked once per
   render, right after the existing optics/damage stages and before the
   timestamp is drawn. Re-renders are triggered through the single
   window.alamsDumpRerender() app.js also exposes. Neither of these two
   hooks touches any existing app.js behavior when this file is absent.
   ========================================================================== */

(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function num(id, fallback) {
    const el = document.getElementById(id);
    return el ? Number(el.value) : fallback;
  }

  function bool(id) {
    return !!document.getElementById(id)?.checked;
  }

  function getImageData(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return { ctx, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
  }

  function snapshot(canvas) {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    return copy;
  }

  /* ------------------------- Film & Light ------------------------- */

  function applyHalation(canvas, strength, radius, warmth) {
    if (strength <= 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const source = ctx.getImageData(0, 0, width, height);
    const brightCanvas = document.createElement('canvas');
    brightCanvas.width = width;
    brightCanvas.height = height;
    const brightCtx = brightCanvas.getContext('2d');
    const bright = brightCtx.createImageData(width, height);
    const warmR = 255;
    const warmG = lerp(255, 130, warmth);
    const warmB = lerp(255, 60, warmth);

    for (let i = 0; i < source.data.length; i += 4) {
      const lum = luma(source.data[i] / 255, source.data[i + 1] / 255, source.data[i + 2] / 255);
      const mask = smoothstep(0.72, 1, lum);
      bright.data[i] = warmR * mask;
      bright.data[i + 1] = warmG * mask;
      bright.data[i + 2] = warmB * mask;
      bright.data[i + 3] = 255 * mask;
    }

    brightCtx.putImageData(bright, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = clamp01(strength);
    ctx.filter = `blur(${Math.max(1, radius)}px)`;
    ctx.drawImage(brightCanvas, 0, 0);
    ctx.restore();
  }

  function applyDirectionalLightLeak(canvas, strength, angleDeg, warmth, fade) {
    if (strength <= 0) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const angle = (angleDeg * Math.PI) / 180;
    const cx = width / 2 + Math.cos(angle) * width * 0.65;
    const cy = height / 2 + Math.sin(angle) * height * 0.65;
    const radius = Math.max(width, height) * (0.55 + fade * 0.5);
    const warm = [255, 130, 60];
    const cool = [90, 150, 255];
    const color = warm.map((v, i) => Math.round(lerp(cool[i], v, warmth)));
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clamp01(strength)})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function applyBleachBypass(canvas, strength, recovery) {
    if (strength <= 0) return;
    const { ctx, imageData } = getImageData(canvas);
    const { data } = imageData;
    const amount = clamp01(strength);
    const rec = clamp01(recovery);

    for (let i = 0; i < data.length; i += 4) {
      const lum = luma(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
      for (let c = 0; c < 3; c += 1) {
        const channel = data[i + c] / 255;
        const desaturated = lerp(channel, lum, amount * 0.6);
        const contrasted = clamp01(0.5 + (desaturated - 0.5) * (1 + amount * 1.4));
        const protectedHighlight = lerp(contrasted, channel, rec * smoothstep(0.75, 1, lum));
        data[i + c] = clamp255(protectedHighlight * 255);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function applyOrtonGlow(canvas, amount, blurRadius) {
    if (amount <= 0) return;
    const ctx = canvas.getContext('2d');
    const copy = snapshot(canvas);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = clamp01(amount);
    ctx.filter = `blur(${Math.max(1, blurRadius)}px) brightness(1.1)`;
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
  }

  function applyEtherealDiffusion(canvas, strength, blurRadius, highlightBias) {
    if (strength <= 0) return;
    const ctx = canvas.getContext('2d');
    const copy = snapshot(canvas);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp01(strength) * 0.5;
    ctx.filter = `blur(${Math.max(1, blurRadius)}px)`;
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = clamp01(strength) * clamp01(highlightBias) * 0.4;
    ctx.filter = `blur(${Math.max(2, blurRadius * 2)}px) brightness(1.3)`;
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
  }

  function applyGodRays(canvas, strength, angleDeg, length) {
    if (strength <= 0) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const angle = (angleDeg * Math.PI) / 180;
    const originX = width / 2 + Math.cos(angle) * width * 0.7;
    const originY = height / 2 + Math.sin(angle) * height * 0.7;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rayCount = 6;
    for (let i = 0; i < rayCount; i += 1) {
      const spread = (i - rayCount / 2) * 0.09;
      const rayAngle = angle + Math.PI + spread;
      const endX = originX + Math.cos(rayAngle) * Math.max(width, height) * length;
      const endY = originY + Math.sin(rayAngle) * Math.max(width, height) * length;
      const gradient = ctx.createLinearGradient(originX, originY, endX, endY);
      gradient.addColorStop(0, `rgba(255, 244, 214, ${clamp01(strength) * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 244, 214, 0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(width, height) * 0.09;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function applyLiminalFog(canvas, density, tint, falloff) {
    if (density <= 0) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const cool = [150, 165, 180];
    const warm = [210, 195, 170];
    const color = cool.map((v, i) => Math.round(lerp(v, warm[i], tint)));
    const gradient = ctx.createLinearGradient(0, height * (1 - clamp01(falloff)), 0, height);
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clamp01(density)})`);
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /* ------------------------ Glitch & Fracture ------------------------ */

  function applyPrismShatter(canvas, intensity, complexity, seed) {
    if (intensity <= 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const copy = snapshot(canvas);
    const rand = seededRandom(seed);
    const shardCount = Math.max(3, Math.round(clamp01(complexity) * 24));
    ctx.save();
    for (let i = 0; i < shardCount; i += 1) {
      const sx = Math.floor(rand() * width);
      const sy = Math.floor(rand() * height);
      const sw = Math.max(6, Math.floor((width / shardCount) * (0.6 + rand())));
      const sh = Math.max(6, Math.floor(height * (0.03 + rand() * 0.1)));
      const dx = sx + Math.round((rand() - 0.5) * intensity * width * 0.08);
      const dy = sy + Math.round((rand() - 0.5) * intensity * height * 0.02);
      ctx.globalCompositeOperation = rand() > 0.5 ? 'lighter' : 'source-over';
      ctx.globalAlpha = 0.85;
      ctx.drawImage(copy, sx, sy, sw, sh, dx, dy, sw, sh);
    }
    ctx.restore();
  }

  function applyChromaBoost(canvas, strength, flicker, seed) {
    if (strength <= 0) return;
    const { ctx, imageData } = getImageData(canvas);
    const { data, width, height } = imageData;
    const source = new Uint8ClampedArray(data);
    const rand = seededRandom(seed);
    const jitter = flicker ? (rand() - 0.5) * 2 : 0;
    const shift = Math.max(1, Math.round(strength * 6 * (1 + jitter * 0.4)));

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const edge = Math.hypot(x / width - 0.5, y / height - 0.5) / 0.7071;
        const localShift = Math.round(shift * smoothstep(0.1, 1, edge));
        const rX = clamp(x + localShift, 0, width - 1);
        const bX = clamp(x - localShift, 0, width - 1);
        data[index] = source[(y * width + rX) * 4];
        data[index + 2] = source[(y * width + bX) * 4 + 2];
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function applySignalTear(canvas, intensity, blockSize, seed) {
    if (intensity <= 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const copy = snapshot(canvas);
    const rand = seededRandom(seed);
    const block = Math.max(2, Math.round(blockSize));
    const bandCount = Math.max(1, Math.round(intensity * 14));
    ctx.save();
    for (let i = 0; i < bandCount; i += 1) {
      const bandY = Math.floor(rand() * height);
      const bandH = Math.max(block, Math.floor(rand() * height * 0.06));
      const offset = Math.round((rand() - 0.5) * width * 0.16 * intensity);
      const pixelated = document.createElement('canvas');
      pixelated.width = Math.max(1, Math.floor(width / block));
      pixelated.height = Math.max(1, Math.floor(bandH / block));
      const pixelatedCtx = pixelated.getContext('2d');
      pixelatedCtx.imageSmoothingEnabled = false;
      pixelatedCtx.drawImage(copy, 0, bandY, width, bandH, 0, 0, pixelated.width, pixelated.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixelated, 0, 0, pixelated.width, pixelated.height, offset, bandY, width, bandH);
      ctx.imageSmoothingEnabled = true;
    }
    ctx.restore();
  }

  function applySpectralShift(canvas, amount, bleed, angleDeg) {
    if (amount <= 0) return;
    const ctx = canvas.getContext('2d');
    const copy = snapshot(canvas);
    const angle = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(angle) * amount * canvas.width * 0.03;
    const dy = Math.sin(angle) * amount * canvas.height * 0.03;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${Math.max(0.5, bleed)}px)`;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(copy, dx, dy);
    ctx.drawImage(copy, -dx, -dy);
    ctx.restore();
  }

  /* ------------------------------ Wiring ------------------------------ */

  window.applyAlamsDumpExtraEffects = function applyAlamsDumpExtraEffects(canvas, seed) {
    if (bool('haloEnable')) applyHalation(canvas, num('haloStrength', 0), num('haloRadius', 10), num('haloWarmth', 0.7));
    if (bool('leak2Enable')) applyDirectionalLightLeak(canvas, num('leak2Strength', 0), num('leak2Angle', 45), num('leak2Warmth', 0.7), num('leak2Fade', 0.5));
    if (bool('bleachEnable')) applyBleachBypass(canvas, num('bleachStrength', 0), num('bleachRecovery', 0.3));
    if (bool('ortonEnable')) applyOrtonGlow(canvas, num('ortonAmount', 0), num('ortonBlur', 8));
    if (bool('diffuseEnable')) applyEtherealDiffusion(canvas, num('diffuseStrength', 0), num('diffuseBlur', 6), num('diffuseHighlight', 0.5));
    if (bool('godrayEnable')) applyGodRays(canvas, num('godrayStrength', 0), num('godrayAngle', 200), num('godrayLength', 0.6));
    if (bool('fogEnable')) applyLiminalFog(canvas, num('fogDensity', 0), num('fogTint', 0.5), num('fogFalloff', 0.5));

    if (bool('fractureEnable')) applyPrismShatter(canvas, num('fractureIntensity', 0), num('fractureComplexity', 0.5), seed + 3);
    if (bool('chromaBoostEnable')) applyChromaBoost(canvas, num('chromaBoostStrength', 0), bool('chromaBoostFlicker'), seed + 5);
    if (bool('tearEnable')) applySignalTear(canvas, num('tearIntensity', 0), num('tearBlock', 8), seed + 7);
    if (bool('spectralEnable')) applySpectralShift(canvas, num('spectralAmount', 0), num('spectralBleed', 2), num('spectralAngle', 0));
  };

  ready(function wireExtraEffectControls() {
    const rangeIds = [
      'haloStrength', 'haloRadius', 'haloWarmth',
      'leak2Strength', 'leak2Angle', 'leak2Warmth', 'leak2Fade',
      'bleachStrength', 'bleachRecovery',
      'ortonAmount', 'ortonBlur',
      'diffuseStrength', 'diffuseBlur', 'diffuseHighlight',
      'godrayStrength', 'godrayAngle', 'godrayLength',
      'fogDensity', 'fogTint', 'fogFalloff',
      'fractureIntensity', 'fractureComplexity',
      'chromaBoostStrength',
      'tearIntensity', 'tearBlock',
      'spectralAmount', 'spectralBleed', 'spectralAngle',
    ];
    const toggleIds = [
      'haloEnable', 'leak2Enable', 'bleachEnable', 'ortonEnable', 'diffuseEnable',
      'godrayEnable', 'fogEnable', 'fractureEnable', 'chromaBoostEnable',
      'chromaBoostFlicker', 'tearEnable', 'spectralEnable',
    ];
    const rerender = () => window.alamsDumpRerender?.();
    rangeIds.forEach((id) => document.getElementById(id)?.addEventListener('input', rerender));
    toggleIds.forEach((id) => document.getElementById(id)?.addEventListener('change', rerender));
  });
})();
