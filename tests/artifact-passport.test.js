const assert = require('node:assert/strict');
const memoryCore = require('../memory-index-core.js');
const { VERSION, validatePassport, summarizePassport } = require('../passport-core.js');
const recipe = memoryCore.validateRecipe({
  schemaVersion: 1,
  controls: [
    { id: 'grainControl', type: 'range', value: '12' },
    { id: 'stampNameControl', type: 'text', value: 'Private name' },
    { id: 'customTimestamp', type: 'datetime-local', value: '2026-06-04T12:00' },
  ],
  active: { effect: 'glitch' }, effectOrder: [], renderSeed: 99,
});
const passport = {
  type: 'alams-dump-artifact-passport', schemaVersion: VERSION,
  application: { name: 'Alam’s Dump', version: '1.0.0' },
  image: { width: 720, height: 960, format: 'jpg', mimeType: 'image/jpeg', byteLength: 12000, sha256: 'a'.repeat(64) },
  export: { quality: 0.9 }, recipe, summary: { treatment: 'glitch' },
};
const valid = validatePassport(JSON.parse(JSON.stringify(passport)), memoryCore);
assert.deepEqual(valid.recipe.controls.map((item) => item.id), ['grainControl'], 'passports omit custom stamp text and custom date values');
assert.match(summarizePassport(valid), /glitch.*720 × 960 JPG/);
assert.equal(validatePassport({ ...passport, image: { ...passport.image, sha256: null } }, memoryCore).image.sha256, null);
assert.throws(() => validatePassport({ ...passport, schemaVersion: 2 }, memoryCore), /not supported/);
assert.throws(() => validatePassport({ ...passport, image: { ...passport.image, width: 0 } }, memoryCore), /dimensions/);
assert.throws(() => validatePassport({ ...passport, image: { ...passport.image, width: 15000, height: 15000 } }, memoryCore), /dimensions/);
assert.throws(() => validatePassport({ ...passport, image: { ...passport.image, sha256: 'not-a-hash' } }, memoryCore), /checksum/);
assert.throws(() => validatePassport({ ...passport, image: { ...passport.image, format: 'exe', mimeType: 'application/octet-stream' } }, memoryCore), /format/);
assert.throws(() => validatePassport({ ...passport, export: { quality: 1.5 } }, memoryCore), /quality/);
assert.throws(() => validatePassport({ ...passport, image: { ...passport.image, format: 'png', mimeType: 'image/png' }, export: { quality: 0.9 } }, memoryCore), /PNG/);
assert.throws(() => validatePassport({ ...passport, exportedAt: 'yesterday' }, memoryCore), /time/);
console.log('artifact-passport tests passed');
