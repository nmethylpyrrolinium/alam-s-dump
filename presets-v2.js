/* ==========================================================================
   Alam's Dump — Presets v2
   Creative combo presets + named film-stock/device presets. These are
   curated approximations of each look's character (color bias, contrast,
   grain, halation) built from the sliders and card effects that already
   exist — not scientifically-measured film-stock LUTs.
   ========================================================================== */

(function () {
  'use strict';

  function setControl(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = String(value);
  }

  function applyPreset(preset) {
    const targetKeys = new Set(preset.enable || []);

    document.querySelectorAll('.effect-enable').forEach((checkbox) => {
      const key = checkbox.closest('[data-effect-key]')?.dataset.effectKey;
      if (checkbox.checked && !targetKeys.has(key)) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    Object.entries(preset.values || {}).forEach(([id, value]) => setControl(id, value));

    targetKeys.forEach((key) => {
      const def = window.AlamsDumpEffectDefs?.[key];
      const checkbox = def && document.getElementById(def.enabledId);
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const firstValueId = Object.keys(preset.values || {})[0];
    document.getElementById(firstValueId)?.dispatchEvent(new Event('input', { bubbles: true }));
    window.alamsDumpRerender?.();
  }

  const CREATIVE_PRESETS = [
    {
      key: 'liminalDream', label: 'Liminal Dream',
      enable: ['fog', 'halo', 'diffuse'],
      values: { fogDensity: 0.4, fogTint: 0.35, haloStrength: 0.5, haloWarmth: 0.6, diffuseStrength: 0.4, diffuseBlur: 8 },
    },
    {
      key: 'etherealPortrait', label: 'Ethereal Portrait',
      enable: ['orton', 'diffuse', 'halo'],
      values: { ortonAmount: 0.45, ortonBlur: 10, diffuseHighlight: 0.65, haloStrength: 0.3, haloWarmth: 0.5 },
    },
    {
      key: 'glitchFracture', label: 'Glitch Fracture',
      enable: ['fracture', 'chromaBoost', 'tear'],
      values: { fractureIntensity: 0.5, fractureComplexity: 0.6, chromaBoostStrength: 0.45, tearIntensity: 0.3, tearBlock: 10 },
    },
  ];

  // Curated film-stock and device-era looks. Values reference sliders from
  // Essentials, Film Cameras, and Color & Tone; "enable" lists card effects
  // (each preset stays at or under 3, well inside the 5-slot stack cap).
  const FILM_STOCK_PRESETS = [
    { key: 'portra160', label: 'Portra 160', values: { contrastControl: 1.2, grainControl: 8, cyanControl: 0.02, whiteBalanceTempControl: 0.15, saturationControl: -0.1, vibranceControl: 0.15 } },
    { key: 'portra400', label: 'Portra 400', values: { contrastControl: 1.28, grainControl: 13, cyanControl: 0.02, whiteBalanceTempControl: 0.2, saturationControl: -0.05, vibranceControl: 0.2 }, enable: ['halo'], enableValues: { haloStrength: 0.15, haloWarmth: 0.6 } },
    { key: 'gold200', label: 'Gold 200', values: { contrastControl: 1.3, grainControl: 12, whiteBalanceTempControl: 0.3, saturationControl: 0.15, vibranceControl: 0.2 } },
    { key: 'ektar', label: 'Ektar', values: { contrastControl: 1.5, grainControl: 6, saturationControl: 0.35, vibranceControl: 0.3, whiteBalanceTempControl: 0.1 } },
    { key: 'ultramax', label: 'Ultramax', values: { contrastControl: 1.35, grainControl: 16, whiteBalanceTempControl: 0.2, saturationControl: 0.1 } },
    { key: 'triX', label: 'Tri-X', values: { contrastControl: 1.6, grainControl: 22, saturationControl: -1, sharpnessControl: 0.95 } },
    { key: 'proFuji400h', label: 'Fujifilm Pro 400H', values: { contrastControl: 1.15, grainControl: 9, whiteBalanceTempControl: -0.15, saturationControl: -0.1, vibranceControl: 0.15 } },
    { key: 'superia', label: 'Fujifilm Superia', values: { contrastControl: 1.3, grainControl: 14, whiteBalanceTempControl: -0.1, saturationControl: 0.1 } },
    { key: 'velvia', label: 'Fujifilm Velvia', values: { contrastControl: 1.55, grainControl: 5, saturationControl: 0.5, vibranceControl: 0.35, whiteBalanceTempControl: -0.1 } },
    { key: 'astia', label: 'Fujifilm Astia', values: { contrastControl: 1.1, grainControl: 6, saturationControl: -0.15, vibranceControl: 0.1 } },
    { key: 'classicChrome', label: 'Classic Chrome', values: { contrastControl: 1.35, grainControl: 10, saturationControl: -0.3, whiteBalanceTempControl: -0.1, curveShadowsControl: 0.05 } },
    { key: 'classicNeg', label: 'Classic Neg', values: { contrastControl: 1.4, grainControl: 15, saturationControl: -0.2, whiteBalanceTempControl: 0.1, curveHighlightsControl: -0.05 } },
    { key: 'acros', label: 'Acros', values: { contrastControl: 1.45, grainControl: 4, saturationControl: -1, sharpnessControl: 0.85 } },
    { key: 'ilfordHp5', label: 'Ilford HP5', values: { contrastControl: 1.5, grainControl: 20, saturationControl: -1, sharpnessControl: 0.7 } },
    { key: 'cinestill800t', label: 'Cinestill 800T', values: { contrastControl: 1.3, grainControl: 18, whiteBalanceTempControl: -0.35, leakControl: 0.12 }, enable: ['halo'], enableValues: { haloStrength: 0.55, haloWarmth: 0.85, haloRadius: 14 } },
    { key: 'agfaVista', label: 'Agfa Vista', values: { contrastControl: 1.2, grainControl: 14, saturationControl: 0.25, whiteBalanceTempControl: 0.25, hueControl: -8 }, enable: ['bleach'], enableValues: { bleachStrength: 0.15, bleachRecovery: 0.5 } },
    { key: 'polaroid', label: 'Polaroid', values: { contrastControl: 1.15, grainControl: 10, whiteBalanceTempControl: 0.3, saturationControl: -0.1, levelsBlackControl: 0.05, levelsWhiteControl: 0.92 }, enable: ['leak2'], enableValues: { leak2Strength: 0.35, leak2Angle: 30, leak2Warmth: 0.75 } },
    { key: 'disposable', label: 'Disposable Camera', values: { contrastControl: 1.35, grainControl: 20, dustControl: 0.04, whiteBalanceTempControl: 0.15 }, enable: ['leak2'], enableValues: { leak2Strength: 0.25, leak2Angle: 200 } },
    { key: 'digicam', label: 'Digicam', values: { contrastControl: 1.2, sharpnessControl: 1.1, grainControl: 3, dustControl: 0.01, saturationControl: 0.2 } },
    { key: 'ccdCamera', label: 'CCD Camera', values: { contrastControl: 1.25, sharpnessControl: 1.0, grainControl: 4, whiteBalanceTempControl: -0.05, saturationControl: 0.3, vibranceControl: 0.2 } },
    { key: 'earlyDslr', label: 'Early DSLR', values: { contrastControl: 1.3, sharpnessControl: 1.2, grainControl: 6, dustControl: 0.02, saturationControl: 0.15 } },
    { key: 'vhsCamcorder', label: 'VHS Camcorder', values: { contrastControl: 1.15, sharpnessControl: 0.4, saturationControl: -0.15, whiteBalanceTempControl: 0.1 }, enable: ['tear'], enableValues: { tearIntensity: 0.15, tearBlock: 14 } },
    { key: 'miniDv', label: 'MiniDV', values: { contrastControl: 1.2, sharpnessControl: 0.5, grainControl: 5, saturationControl: -0.05 } },
    { key: 'webcam2005', label: 'Webcam 2005', values: { contrastControl: 1.1, sharpnessControl: 0.3, grainControl: 8, whiteBalanceTempControl: 0.05, saturationControl: -0.1 } },
    { key: 'nokiaCamera', label: 'Nokia Camera', values: { contrastControl: 1.3, sharpnessControl: 0.6, grainControl: 12, saturationControl: 0.1, dustControl: 0.02 } },
    { key: 'motorolaRazr', label: 'Motorola Razr', values: { contrastControl: 1.25, sharpnessControl: 0.45, grainControl: 14, saturationControl: -0.05 } },
    { key: 'iphone4', label: 'iPhone 4', values: { contrastControl: 1.2, sharpnessControl: 0.9, grainControl: 5, saturationControl: 0.1, whiteBalanceTempControl: -0.05 } },
    { key: 'iphone6', label: 'iPhone 6', values: { contrastControl: 1.15, sharpnessControl: 1.0, grainControl: 3, saturationControl: 0.15, vibranceControl: 0.1 } },
    { key: 'earlyAndroid', label: 'Early Android', values: { contrastControl: 1.3, sharpnessControl: 0.7, grainControl: 10, saturationControl: 0.2, whiteBalanceTempControl: 0.1 } },
    { key: 'gameBoyCamera', label: 'GameBoy Camera', values: {}, enable: ['floydSteinberg'], enableValues: { floydSteinbergLevels: 2 } },
  ];

  function buildButton(preset) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'effect-chip';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      if (preset.enableValues) Object.assign(preset.values, preset.enableValues);
      applyPreset(preset);
    });
    return button;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const comboRow = document.getElementById('creativePresetRow');
    if (comboRow) CREATIVE_PRESETS.forEach((preset) => comboRow.append(buildButton(preset)));

    const filmStockRow = document.getElementById('filmStockPresetRow');
    if (filmStockRow) FILM_STOCK_PRESETS.forEach((preset) => filmStockRow.append(buildButton(preset)));
  });
})();
