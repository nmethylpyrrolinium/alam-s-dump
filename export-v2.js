/* ==========================================================================
   Alam's Dump — Export v2
   PNG/JPG/WEBP format, quality slider, metadata toggle, transparent-
   background option. Independent of the existing Download/Share buttons
   in the preview toolbar — this reads outputCanvas (and the clean
   pre-timestamp frame app.js now captures) directly, so nothing about the
   original download/share code needed to change.
   ========================================================================== */

(function () {
  'use strict';

  let cleanFrameCanvas = null;

  // Called by app.js right before it draws the timestamp — captures a
  // clean copy so "metadata off" exports can skip the stamp without
  // needing to reverse-engineer where it was drawn.
  window.alamsDumpCaptureCleanFrame = function alamsDumpCaptureCleanFrame(canvas) {
    if (!cleanFrameCanvas) cleanFrameCanvas = document.createElement('canvas');
    cleanFrameCanvas.width = canvas.width;
    cleanFrameCanvas.height = canvas.height;
    cleanFrameCanvas.getContext('2d').drawImage(canvas, 0, 0);
  };

  const MIME_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  const EXTENSIONS = { png: 'png', jpg: 'jpg', webp: 'webp' };

  function triggerDownload(blob, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alams-dump.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const formatSelect = document.getElementById('exportFormatSelect');
    const qualityInput = document.getElementById('exportQualityControl');
    const metadataToggle = document.getElementById('exportMetadataToggle');
    const exportButton = document.getElementById('exportV2Button');
    const statusEl = document.getElementById('exportV2Status');

    exportButton?.addEventListener('click', () => {
      const outputCanvas = document.getElementById('outputCanvas');
      if (!outputCanvas) return;
      const format = formatSelect?.value || 'jpg';
      const includeMetadata = metadataToggle ? metadataToggle.checked : true;
      const quality = qualityInput ? Number(qualityInput.value) : 0.9;
      const source = includeMetadata || !cleanFrameCanvas ? outputCanvas : cleanFrameCanvas;
      const mime = MIME_TYPES[format] || 'image/jpeg';

      source.toBlob((blob) => {
        if (!blob) {
          if (statusEl) statusEl.textContent = 'Export failed — try again.';
          return;
        }
        triggerDownload(blob, EXTENSIONS[format] || 'jpg');
        if (statusEl) statusEl.textContent = `Exported ${EXTENSIONS[format]} just now.`;
      }, mime, format === 'png' ? undefined : quality);
    });

    qualityInput?.addEventListener('input', () => {
      const label = document.getElementById('exportQualityValue');
      if (label) label.textContent = `${Math.round(Number(qualityInput.value) * 100)}%`;
    });

    formatSelect?.addEventListener('change', () => {
      if (qualityInput) qualityInput.disabled = formatSelect.value === 'png';
    });
  });
})();
