/* Export formats plus optional, image-free Artifact Passport sidecars. */
(function () {
  'use strict';
  let cleanFrameCanvas = null;
  window.alamsDumpCaptureCleanFrame = function alamsDumpCaptureCleanFrame(canvas) {
    if (!cleanFrameCanvas) cleanFrameCanvas = document.createElement('canvas');
    cleanFrameCanvas.width = canvas.width;
    cleanFrameCanvas.height = canvas.height;
    cleanFrameCanvas.getContext('2d').drawImage(canvas, 0, 0);
  };

  const MIME_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  const EXTENSIONS = { png: 'png', jpg: 'jpg', webp: 'webp' };
  const MIME_FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const canvasBlob = (canvas, mime, quality) => new Promise((resolve, reject) => {
    try { canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode this image.')), mime, quality); }
    catch (error) { reject(error); }
  });
  function hexDigest(bytes) {
    return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  function validateControlBounds(recipe) {
    recipe.controls.forEach((saved) => {
      const el = document.getElementById(saved.id);
      if (!el || !document.getElementById('labContext')?.contains(el)) return;
      if (el.type === 'range' || el.type === 'number') {
        const value = Number(saved.value);
        if (!Number.isFinite(value) || (el.min !== '' && value < Number(el.min)) || (el.max !== '' && value > Number(el.max))) throw new RangeError(`Saved value for ${saved.id} is outside the control's range.`);
      }
      if (el.tagName === 'SELECT' && ![...el.options].some((option) => option.value === saved.value)) throw new RangeError(`Saved option for ${saved.id} is not available.`);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const formatSelect = document.getElementById('exportFormatSelect');
    const qualityInput = document.getElementById('exportQualityControl');
    const metadataToggle = document.getElementById('exportMetadataToggle');
    const exportButton = document.getElementById('exportV2Button');
    const statusEl = document.getElementById('exportV2Status');
    let importedPassport = null;

    exportButton?.addEventListener('click', async () => {
      const outputCanvas = document.getElementById('outputCanvas');
      if (!outputCanvas) return;
      const requestedFormat = formatSelect?.value || 'jpg';
      const includeMetadata = metadataToggle ? metadataToggle.checked : true;
      const quality = qualityInput ? Number(qualityInput.value) : 0.9;
      const source = includeMetadata || !cleanFrameCanvas ? outputCanvas : cleanFrameCanvas;
      exportButton.disabled = true;
      try {
        const blob = await canvasBlob(source, MIME_TYPES[requestedFormat] || MIME_TYPES.jpg, requestedFormat === 'png' ? undefined : quality);
        const format = MIME_FORMAT[blob.type] || requestedFormat;
        triggerDownload(blob, `alams-dump.${EXTENSIONS[format] || 'jpg'}`);
        try {
          const recipe = window.AlamsDumpPassport.sanitizeRecipeForPassport(window.alamsDumpCaptureRecipe(), window.AlamsDumpMemoryCore);
          const checksum = crypto.subtle?.digest ? hexDigest(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())) : null;
          const passport = {
            type: 'alams-dump-artifact-passport',
            schemaVersion: window.AlamsDumpPassport.VERSION,
            application: { name: 'Alam’s Dump', version: '1.0.0' },
            image: { width: outputCanvas.width, height: outputCanvas.height, format, mimeType: blob.type, byteLength: blob.size, sha256: checksum },
            export: { quality: format === 'png' ? null : quality, transparentBackground: !!document.getElementById('exportTransparentToggle')?.checked },
            recipe,
            summary: { treatment: recipe.active.effect || 'classic' },
            ...(document.getElementById('passportTimestampToggle')?.checked ? { exportedAt: new Date().toISOString() } : {}),
          };
          const validated = window.AlamsDumpPassport.validatePassport(passport);
          const json = JSON.stringify({ ...validated, readableSummary: window.AlamsDumpPassport.summarizePassport(validated) }, null, 2);
          triggerDownload(new Blob([json], { type: 'application/json' }), 'alams-dump-passport.json');
          statusEl.textContent = checksum
            ? `Image and Artifact Passport exported. SHA-256: ${checksum.slice(0, 12)}… (integrity check, not proof of origin).`
            : 'Image and passport exported. This browser does not support SHA-256 checksums.';
        } catch (error) {
          statusEl.textContent = `Image exported; passport could not be prepared: ${error.message || 'unsupported browser feature'}`;
        }
      } catch (error) {
        statusEl.textContent = `Export failed: ${error.message || 'try a smaller image or another format.'}`;
      } finally { exportButton.disabled = false; }
    });

    qualityInput?.addEventListener('input', () => {
      const label = document.getElementById('exportQualityValue');
      if (label) label.textContent = `${Math.round(Number(qualityInput.value) * 100)}%`;
    });
    formatSelect?.addEventListener('change', () => { if (qualityInput) qualityInput.disabled = formatSelect.value === 'png'; });

    document.getElementById('passportImportInput')?.addEventListener('change', async (event) => {
      importedPassport = null;
      const applyButton = document.getElementById('passportApplyButton');
      const status = document.getElementById('passportImportStatus');
      applyButton.disabled = true;
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (file.size > 1024 * 1024) { status.textContent = 'Passport is too large (limit 1 MB).'; status.dataset.state = 'error'; return; }
      try {
        const parsed = JSON.parse(await file.text());
        importedPassport = window.AlamsDumpPassport.validatePassport(parsed, window.AlamsDumpMemoryCore);
        validateControlBounds(importedPassport.recipe);
        status.textContent = `Valid passport: ${window.AlamsDumpPassport.summarizePassport(importedPassport)}. A checksum helps compare bytes; it does not prove provenance.`;
        status.dataset.state = '';
        applyButton.disabled = false;
      } catch (error) {
        status.textContent = `Passport could not be validated: ${error.message || 'invalid file.'}`;
        status.dataset.state = 'error';
      }
    });
    document.getElementById('passportApplyButton')?.addEventListener('click', async () => {
      const status = document.getElementById('passportImportStatus');
      if (!importedPassport) return;
      try {
        await window.alamsDumpApplyRecipe(importedPassport.recipe);
        status.textContent = 'Passport recipe applied to the current preview. Load the image separately; passports never contain photos.';
        status.dataset.state = '';
      } catch (error) {
        status.textContent = `Recipe could not be applied: ${error.message || 'unsupported controls.'}`;
        status.dataset.state = 'error';
      }
    });

    const quickSelect = document.getElementById('quickExportFormatSelect');
    const quickButton = document.getElementById('quickExportButton');
    quickButton?.addEventListener('click', async () => {
      const outputCanvas = document.getElementById('outputCanvas');
      if (!outputCanvas) return;
      const format = quickSelect?.value || 'jpg';
      try {
        const blob = await canvasBlob(outputCanvas, MIME_TYPES[format] || MIME_TYPES.jpg, format === 'png' ? undefined : 0.9);
        triggerDownload(blob, `alams-dump.${EXTENSIONS[MIME_FORMAT[blob.type] || format] || 'jpg'}`);
      } catch (error) {
        if (statusEl) statusEl.textContent = `Quick export failed: ${error.message || 'try again.'}`;
      }
    });
  });
})();
