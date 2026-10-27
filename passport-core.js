/* Validation and summaries for portable Alam’s Dump Artifact Passports. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const MAX_BYTES = 100 * 1024 * 1024;
  const MIME_BY_FORMAT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  function sanitizeRecipeForPassport(rawRecipe, recipeCore = root.AlamsDumpMemoryCore) {
    const recipe = recipeCore.validateRecipe(rawRecipe);
    const privateControlIds = new Set(['stampNameControl', 'timestampNow', 'customTimestamp']);
    return { ...recipe, controls: recipe.controls.filter((control) => !privateControlIds.has(control.id)) };
  }
  function validatePassport(value, recipeCore = root.AlamsDumpMemoryCore) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Passport must be a JSON object.');
    if (value.type !== 'alams-dump-artifact-passport' || value.schemaVersion !== VERSION) throw new RangeError('This passport version is not supported.');
    const image = value.image;
    if (!image || !Number.isInteger(image.width) || image.width < 1 || image.width > 20000 || !Number.isInteger(image.height) || image.height < 1 || image.height > 20000 || image.width * image.height > 200000000) throw new RangeError('Passport image dimensions are outside the supported range.');
    if (!['jpg', 'png', 'webp'].includes(image.format) || image.mimeType !== MIME_BY_FORMAT[image.format]) throw new TypeError('Passport export format is invalid.');
    if (!Number.isInteger(image.byteLength) || image.byteLength < 1 || image.byteLength > MAX_BYTES) throw new RangeError('Passport file size is outside the supported range.');
    if (image.sha256 != null && (typeof image.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(image.sha256))) throw new TypeError('Passport checksum is invalid.');
    if (!recipeCore?.validateRecipe) throw new Error('Recipe validation is unavailable.');
    const recipe = sanitizeRecipeForPassport(value.recipe, recipeCore);
    const exportedAt = value.exportedAt;
    if (exportedAt != null && (typeof exportedAt !== 'string' || !Number.isFinite(Date.parse(exportedAt)))) throw new TypeError('Passport export time is invalid.');
    const quality = value.export?.quality;
    if (image.format === 'png') {
      if (quality != null) throw new TypeError('PNG passports must not specify lossy export quality.');
    } else if (typeof quality !== 'number' || !Number.isFinite(quality) || quality < 0.3 || quality > 1) {
      throw new RangeError('Passport quality must be between 0.3 and 1.');
    }
    const treatment = value.summary?.treatment;
    if (treatment != null && !['classic', 'glitch', 'dispersion', 'neonNoir'].includes(treatment)) throw new TypeError('Passport treatment is invalid.');
    const appName = value.application?.name;
    const appVersion = value.application?.version;
    if (appName !== 'Alam’s Dump' || typeof appVersion !== 'string' || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(appVersion)) throw new TypeError('Passport application details are invalid.');
    return {
      type: 'alams-dump-artifact-passport', schemaVersion: VERSION,
      application: { name: appName, version: appVersion },
      image: { width: image.width, height: image.height, format: image.format, mimeType: image.mimeType, byteLength: image.byteLength, sha256: image.sha256 || null },
      export: { quality: quality ?? null, transparentBackground: !!value.export?.transparentBackground },
      recipe, summary: { treatment: treatment || recipe.active.effect || 'classic' },
      ...(exportedAt ? { exportedAt } : {}),
    };
  }
  function summarizePassport(passport) {
    const value = validatePassport(passport);
    const effects = value.recipe.controls.filter((control) => control.type === 'checkbox' && control.checked)
      .map((control) => control.id.replace(/Enable$/, ''));
    return `Alam’s Dump ${value.application?.version || ''} · ${value.summary.treatment} · ${effects.length ? effects.join(', ') : 'no effect cards'} · ${value.image.width} × ${value.image.height} ${value.image.format.toUpperCase()}`;
  }
  const api = { VERSION, MAX_BYTES, MIME_BY_FORMAT, sanitizeRecipeForPassport, validatePassport, summarizePassport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlamsDumpPassport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
