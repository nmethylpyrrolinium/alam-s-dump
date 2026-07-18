/* ==========================================================================
   Alam's Dump — Layout v2 behavior
   Loaded AFTER app.js (defer, so still after DOMContentLoaded order is
   preserved). This file never reads or writes app.js's internal state —
   it only toggles visibility/classes on the new wrapper elements added in
   index.html, plus fires synthetic events on inputs that already exist so
   app.js's own listeners keep working unchanged.
   ========================================================================== */

(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function initLayoutV2() {
    const sidebar = document.querySelector('.lab-sidebar');
    const context = document.getElementById('labContext');
    if (!sidebar || !context) return; // layout markup not present, do nothing

    const navButtons = [...sidebar.querySelectorAll('[data-category-nav]')];
    const panels = [...context.querySelectorAll('[data-category]')];

    /* ---------------- Category switching ---------------- */
    function setActiveCategory(key) {
      navButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.categoryNav === key);
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.category !== key;
      });
      try {
        sessionStorage.setItem('alams_dump_last_category', key);
      } catch (error) {
        /* sessionStorage may be unavailable; category switching still works */
      }
    }

    navButtons.forEach((button) => {
      button.addEventListener('click', () => setActiveCategory(button.dataset.categoryNav));
    });

    let initialCategory = navButtons[0]?.dataset.categoryNav || 'essentials';
    try {
      const stored = sessionStorage.getItem('alams_dump_last_category');
      if (stored && navButtons.some((button) => button.dataset.categoryNav === stored)) {
        initialCategory = stored;
      }
    } catch (error) {
      /* ignore */
    }
    setActiveCategory(initialCategory);

    /* ---------------- Search ---------------- */
    const searchInput = document.getElementById('labSearchInput');
    if (searchInput) {
      const searchTargets = () => [...context.querySelectorAll('[data-search-label]')];

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
          searchTargets().forEach((el) => el.removeAttribute('data-search-match'));
          return;
        }

        // Jump to the first category that has a match, so the search feels global.
        let matchedCategory = null;
        panels.forEach((panel) => {
          const targets = [...panel.querySelectorAll('[data-search-label]')];
          const anyMatch = targets.some((el) => el.dataset.searchLabel.toLowerCase().includes(query));
          targets.forEach((el) => {
            const label = el.dataset.searchLabel.toLowerCase();
            el.setAttribute('data-search-match', String(label.includes(query)));
          });
          if (anyMatch && !matchedCategory) matchedCategory = panel.dataset.category;
        });
        if (matchedCategory) setActiveCategory(matchedCategory);
      });
    }

    /* ---------------- New Photo button ---------------- */
    document.getElementById('newPhotoButton')?.addEventListener('click', () => {
      document.getElementById('imageInput')?.click();
    });

    /* ---------------- Before / After toggle ---------------- */
    const canvasCompare = document.querySelector('.canvas-compare');
    document.getElementById('compareToggleButton')?.addEventListener('click', (event) => {
      const isCompare = canvasCompare?.classList.toggle('is-compare');
      event.currentTarget.classList.toggle('active', !!isCompare);
      event.currentTarget.textContent = isCompare ? 'Single view' : 'Before / after';
    });

    /* ---------------- Zoom + pan ---------------- */
    const viewport = document.querySelector('.preview-viewport');
    const outputCanvas = document.getElementById('outputCanvas');
    let zoom = 1;
    let panX = 0;
    let panY = 0;

    function applyTransform() {
      if (!outputCanvas) return;
      outputCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }

    function resetView() {
      zoom = 1;
      panX = 0;
      panY = 0;
      applyTransform();
      document.querySelectorAll('[data-zoom]').forEach((button) => {
        button.classList.toggle('active', button.dataset.zoom === 'fit');
      });
    }

    document.querySelectorAll('[data-zoom]').forEach((button) => {
      button.addEventListener('click', () => {
        zoom = button.dataset.zoom === '100' ? 1 : 1;
        // "Fit" and "100%" both resolve to a 1:1 transform since the canvas
        // is already sized to its container by app.js; this control exists
        // so users can reset an accidental drag/scroll zoom below.
        panX = 0;
        panY = 0;
        applyTransform();
        document.querySelectorAll('[data-zoom]').forEach((item) => item.classList.toggle('active', item === button));
      });
    });

    document.getElementById('resetViewButton')?.addEventListener('click', resetView);

    if (viewport && outputCanvas) {
      let dragging = false;
      let startX = 0;
      let startY = 0;

      viewport.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoom = Math.min(4, Math.max(1, zoom - event.deltaY * 0.0015));
        applyTransform();
      }, { passive: false });

      viewport.addEventListener('pointerdown', (event) => {
        if (zoom <= 1) return;
        dragging = true;
        startX = event.clientX - panX;
        startY = event.clientY - panY;
        viewport.classList.add('is-panning');
        viewport.setPointerCapture(event.pointerId);
      });
      viewport.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        panX = event.clientX - startX;
        panY = event.clientY - startY;
        applyTransform();
      });
      viewport.addEventListener('pointerup', (event) => {
        dragging = false;
        viewport.classList.remove('is-panning');
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      });
    }
  });
})();
