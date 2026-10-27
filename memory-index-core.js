/* Pure helpers for Memory Index records; safe to load in Node tests. */
(function (root) {
  'use strict';
  const SCHEMA_VERSION = 1;
  const MAX_NAME_LENGTH = 64;
  function normalizeName(value) {
    if (typeof value !== 'string') throw new TypeError('Give this version a name.');
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name || name.length > MAX_NAME_LENGTH) throw new RangeError(`Names must be 1–${MAX_NAME_LENGTH} characters.`);
    return name;
  }
  function validateRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) throw new TypeError('Edit recipe must be an object.');
    if (recipe.schemaVersion !== SCHEMA_VERSION) throw new RangeError('This edit recipe version is not supported.');
    if (!Array.isArray(recipe.controls) || recipe.controls.length > 500) throw new TypeError('Edit recipe controls are invalid.');
    const seen = new Set();
    const controls = recipe.controls.map((item) => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z][\w-]{0,79}$/.test(item.id) || seen.has(item.id)) throw new TypeError('Edit recipe contains an invalid or duplicate control.');
      if (!['checkbox', 'radio', 'range', 'number', 'text', 'datetime-local', 'select-one'].includes(item.type)) throw new TypeError(`Unsupported saved control: ${item.type}`);
      seen.add(item.id);
      const value = String(item.value ?? '');
      if (value.length > 500) throw new RangeError('A saved control value is too long.');
      return { id: item.id, type: item.type, value, checked: item.type === 'checkbox' || item.type === 'radio' ? !!item.checked : undefined };
    });
    const active = recipe.active && typeof recipe.active === 'object' ? recipe.active : {};
    const allowed = (value, options) => value == null ? null : (options.includes(value) ? value : null);
    const effectOrder = Array.isArray(recipe.effectOrder) ? [...new Set(recipe.effectOrder.filter((key) => typeof key === 'string' && /^[\w-]{1,48}$/.test(key)))].slice(0, 5) : [];
    const renderSeed = Number.isSafeInteger(recipe.renderSeed) && recipe.renderSeed > 0 ? recipe.renderSeed : 1;
    return { schemaVersion: SCHEMA_VERSION, controls,
      active: { crop: allowed(active.crop, ['0.75', '1', '0.5625', '1.333333', 'original']), motion: allowed(active.motion, ['still', 'shake', 'ghost', 'trails']), effect: allowed(active.effect, ['classic', 'glitch', 'dispersion', 'neonNoir']), preset: allowed(active.preset, ['reference', 'night', 'heat', 'hardSensor']) },
      effectOrder, renderSeed };
  }
  function migrateRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Saved version is corrupt.');
    if (record.schemaVersion === SCHEMA_VERSION) return { ...record, recipe: validateRecipe(record.recipe) };
    if (record.schemaVersion === 0 && record.recipe && Array.isArray(record.recipe.controls)) return { ...record, schemaVersion: SCHEMA_VERSION, recipe: validateRecipe({ ...record.recipe, schemaVersion: SCHEMA_VERSION }) };
    throw new RangeError('Saved version schema is not supported.');
  }
  function makeBranch({ sourceId, name, recipe, existingNames = [], id, createdAt }) {
    if (typeof sourceId !== 'string' || !sourceId) throw new TypeError('A source photo is required.');
    const normalizedName = normalizeName(name);
    if (existingNames.some((item) => String(item).trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) throw new Error('A version with that name already exists for this photo. Choose another name.');
    return { id: id || (root.crypto?.randomUUID ? root.crypto.randomUUID() : `branch-${Date.now()}-${Math.random().toString(16).slice(2)}`), sourceId, name: normalizedName, schemaVersion: SCHEMA_VERSION, recipe: validateRecipe(recipe), createdAt: createdAt || new Date().toISOString() };
  }
  const api = { SCHEMA_VERSION, MAX_NAME_LENGTH, normalizeName, validateRecipe, migrateRecord, makeBranch };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlamsDumpMemoryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
