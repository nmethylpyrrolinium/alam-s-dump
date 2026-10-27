const assert = require('node:assert/strict');
const {
  SCHEMA_VERSION, normalizeName, validateRecipe, migrateRecord, makeBranch,
} = require('../memory-index-core.js');

const recipe = {
  schemaVersion: SCHEMA_VERSION,
  controls: [
    { id: 'grainControl', type: 'range', value: '17' },
    { id: 'haloEnable', type: 'checkbox', value: 'on', checked: true },
  ],
  active: { crop: '0.75', motion: 'still', effect: 'classic', preset: 'reference' },
  effectOrder: ['halo', 'halo', 'fracture', 'invalid/key'],
  renderSeed: 12345,
};

assert.equal(normalizeName('  drawer   scan  '), 'drawer scan');
assert.throws(() => normalizeName('  '), /name/i);
assert.throws(() => normalizeName('x'.repeat(65)), /64/);
const normalized = validateRecipe(recipe);
assert.deepEqual(normalized.controls, [
  { id: 'grainControl', type: 'range', value: '17', checked: undefined },
  { id: 'haloEnable', type: 'checkbox', value: 'on', checked: true },
]);
assert.deepEqual(normalized.effectOrder, ['halo', 'fracture']);
assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(normalized))), normalized, 'recipes round-trip through JSON');
assert.throws(() => validateRecipe({ ...recipe, controls: [...recipe.controls, recipe.controls[0]] }), /duplicate/);
assert.throws(() => validateRecipe({ ...recipe, controls: [{ id: 'bad id', type: 'range', value: '0' }] }), /invalid/);
assert.throws(() => validateRecipe({ ...recipe, controls: [{ id: 'token', type: 'password', value: 'secret' }] }), /Unsupported/);
assert.throws(() => validateRecipe({ ...recipe, controls: [{ id: 'caption', type: 'text', value: 'x'.repeat(501) }] }), /too long/);
assert.equal(validateRecipe({ ...recipe, effectOrder: ['a', 'b', 'c', 'd', 'e', 'f'] }).effectOrder.length, 5, 'effect stacks stay within the editor cap');
const migrated = migrateRecord({ id: 'branch-1', schemaVersion: 0, recipe: { ...recipe, schemaVersion: undefined } });
assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
assert.deepEqual(migrated.recipe, normalized);
assert.deepEqual(migrateRecord({ id: 'branch-2', schemaVersion: SCHEMA_VERSION, recipe: normalized }).recipe, normalized);
assert.throws(() => migrateRecord({ schemaVersion: 99, recipe }), /not supported/);
const branch = makeBranch({ sourceId: 'source-1', name: 'Night print', recipe: normalized, existingNames: [] , id: 'branch-1', createdAt: '2026-01-01T00:00:00.000Z' });
assert.equal(branch.name, 'Night print');
assert.equal(branch.recipe.renderSeed, 12345);
assert.throws(() => makeBranch({ sourceId: 'source-1', name: 'night PRINT', recipe: normalized, existingNames: ['Night Print'] }), /already exists/);
assert.throws(() => makeBranch({ sourceId: '', name: 'named', recipe: normalized }), /source/);
console.log('memory-index tests passed');

