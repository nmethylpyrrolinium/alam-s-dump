const assert = require('node:assert/strict');
const fs = require('node:fs');
const printCore = require('../print-core.js');

function image(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const color = pixel(x, y);
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3] ?? 255;
    }
  }
  return { width, height, data };
}

const paper = [248, 246, 240];
const ink = [8, 10, 14];
const bright = image(96, 64, () => [255, 255, 255]);
const dark = image(96, 64, () => [0, 0, 0]);
const brightPrint = printCore.renderHalftone(bright, 8, 0, ink, paper);
const darkPrint = printCore.renderHalftone(dark, 8, 0, ink, paper);
const meanLuma = ({ data }) => {
  let total = 0;
  for (let i = 0; i < data.length; i += 4) total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  return total / (data.length / 4);
};

assert.ok(meanLuma(brightPrint) > meanLuma(darkPrint) + 80, 'bright areas print as paper and dark areas carry more ink');
assert.ok([...brightPrint.data].filter((_, i) => i % 4 === 3).every((alpha) => alpha === 255), 'paper and ink output is fully opaque');
assert.deepEqual([...brightPrint.data.slice(0, 3)], paper, 'white source leaves the selected paper stock');

const gradient = image(96, 64, (x, y) => {
  const value = ((x * 13 + y * 7) % 96) / 95 * 255;
  return [value, value, value];
});
const unrotated = printCore.renderHalftone(gradient, 9, 0, ink, paper);
const angled = printCore.renderHalftone(gradient, 9, 37, ink, paper);
assert.notDeepEqual(angled.data, unrotated.data, 'screen angle changes the sampled dot registration');

assert.ok(meanLuma(brightPrint) > 0.55 * 255, 'white-dominant print remains above 0.55 mean luminance');
for (let i = 0; i < brightPrint.data.length; i += 4) {
  assert.equal(brightPrint.data[i], paper[0], 'pure-white samples do not receive an antialias ink fringe');
  assert.equal(brightPrint.data[i + 1], paper[1]);
  assert.equal(brightPrint.data[i + 2], paper[2]);
  assert.equal(brightPrint.data[i + 3], 255, 'paper output remains fully opaque');
}
assert.throws(() => printCore.renderHalftone(null, 8, 0, ink, paper), /valid RGBA/);

const cards = fs.readFileSync('cards-v2.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const pixel = fs.readFileSync('pixel-print-v2.js', 'utf8');
const registries = ['effects-v2.js', 'pixel-print-v2.js', 'extras-v2.js'].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.match(cards, /persist\(\);[\s\S]*window\.alamsDumpRerender\?\.\(\);/, 'every accepted card toggle persists and queues a render');
assert.match(pixel, /new ImageData\(new Uint8ClampedArray\(dots\.data\), dots\.width, dots\.height\)/, 'Canvas receives a native ImageData instance');
assert.doesNotMatch(fs.readFileSync('app.js', 'utf8'), /runLocalImageSafetyCheck/, 'the always-allow local moderation stub is removed');
assert.match(fs.readFileSync('app.js', 'utf8'), /p_filter_status: serverVerdict\.status \|\| 'hold'/, 'missing server moderation status fails closed');
assert.match(fs.readFileSync('app.js', 'utf8'), /Thanks — your photo is waiting for review and will appear on the wall if it’s accepted\./, 'held submissions use the required status message');
for (const effect of ['halo', 'toyCamera', 'sprite16', 'halftonePrint', 'vhsAnalog', 'posterizeSolarize', 'spectral']) {
  assert.match(html, new RegExp(`data-effect-key="${effect}"`), `${effect} is visible in the library`);
  assert.match(registries, new RegExp(`${effect}:\\s*\\{`), `${effect} has an effect registry entry`);
}
assert.match(html, /id="spectralAmount"[^>]*value="0\.18"/, 'Spectral Shift starts at a restrained intensity');
assert.match(html, /data-dev-only hidden/, 'comparison diagnostics are hidden from ordinary visitors');
assert.match(fs.readFileSync('app.js', 'utf8'), /new URLSearchParams\(window\.location\.search\)\.get\('debug'\) === '1'[\s\S]*data-dev-only/, 'diagnostics can be exposed in explicit development mode');
assert.match(html, /Post to Public Wall/, 'the public submission action states that the image will be posted');
assert.doesNotMatch(html, /Approve &amp; hang/, 'wall submission is not described as an approval action');
assert.ok(html.indexOf('src="print-core.js"') < html.indexOf('src="pixel-print-v2.js"'), 'pure print core loads before its effect module');
console.log('print effect tests passed');

