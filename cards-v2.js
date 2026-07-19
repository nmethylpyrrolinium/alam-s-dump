/* ==========================================================================
   Alam's Dump — Cards v2 behavior
   Additive. Loaded AFTER effects-v2.js (defer). Builds the card catalog,
   favorites, recent, and active-effects stack entirely from the
   [data-effect-key] cards already in index.html and the
   window.AlamsDumpEffectDefs registry effects-v2.js exposes. Talks back to
   the render pipeline only through the two hooks app.js exposes
   (window.alamsDumpRerender) and the one effects-v2.js exposes
   (window.alamsDumpEffectOrder, read by applyAlamsDumpExtraEffects).
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'alamsDumpCardsV2';
  const MAX_ACTIVE = 5;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
        recent: Array.isArray(raw.recent) ? raw.recent : [],
        order: Array.isArray(raw.order) ? raw.order : [],
      };
    } catch (error) {
      return { favorites: [], recent: [], order: [] };
    }
  }

  const state = loadState();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* localStorage may be unavailable (private mode); UI still works for this session */
    }
  }

  function defs() {
    return window.AlamsDumpEffectDefs || {};
  }

  function cardFor(key) {
    return document.querySelector(`[data-effect-key="${key}"]`);
  }

  function labelFor(key) {
    return cardFor(key)?.querySelector('strong')?.textContent?.trim() || key;
  }

  function isEnabled(key) {
    const def = defs()[key];
    return !!(def && document.getElementById(def.enabledId)?.checked);
  }

  function activeKeys() {
    return Object.keys(defs()).filter(isEnabled);
  }

  function safeEscape(value) {
    // Reuses app.js's global escapeHtml when present (same page, same
    // global scope); falls back locally so this file never hard-depends
    // on app.js's internals being unchanged.
    return typeof window.escapeHtml === 'function' || typeof escapeHtml === 'function'
      ? escapeHtml(value)
      : String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function syncOrderWithEnabled() {
    const enabled = activeKeys();
    state.order = state.order.filter((key) => enabled.includes(key));
    enabled.forEach((key) => { if (!state.order.includes(key)) state.order.push(key); });
  }

  function updateCardStates(activeList) {
    const activeSet = new Set(activeList);
    const maxed = activeList.length >= MAX_ACTIVE;
    document.querySelectorAll('[data-effect-key]').forEach((card) => {
      const key = card.dataset.effectKey;
      const active = activeSet.has(key);
      card.classList.toggle('is-active', active);
      card.classList.toggle('is-maxed', maxed && !active);
    });
  }

  function renderStack() {
    syncOrderWithEnabled();
    window.alamsDumpEffectOrder = state.order.slice();
    persist();

    const list = document.getElementById('effectsStackList');
    const empty = document.getElementById('effectsStackEmpty');
    const count = document.getElementById('stackCount');
    if (!list || !empty || !count) return;

    const active = state.order.filter(isEnabled);
    count.textContent = `(${active.length}/${MAX_ACTIVE})`;
    empty.hidden = active.length > 0;
    list.replaceChildren();

    active.forEach((key, index) => {
      const label = safeEscape(labelFor(key));
      const li = document.createElement('li');
      li.innerHTML = `<span>${label}</span>`
        + `<button type="button" data-stack-action="up" data-key="${key}" ${index === 0 ? 'disabled' : ''} aria-label="Move ${label} up">&uarr;</button>`
        + `<button type="button" data-stack-action="down" data-key="${key}" ${index === active.length - 1 ? 'disabled' : ''} aria-label="Move ${label} down">&darr;</button>`
        + `<button type="button" data-stack-action="remove" data-key="${key}" aria-label="Remove ${label}">&times;</button>`;
      list.append(li);
    });

    updateCardStates(active);
  }

  function renderChips() {
    const favoritesRow = document.getElementById('favoritesRow');
    const favoritesChips = document.getElementById('favoritesChips');
    const recentRow = document.getElementById('recentRow');
    const recentChips = document.getElementById('recentChips');
    if (!favoritesRow || !recentRow) return;

    const knownKeys = new Set(Object.keys(defs()));
    const favorites = state.favorites.filter((key) => knownKeys.has(key));
    const recent = state.recent.filter((key) => knownKeys.has(key));

    favoritesRow.hidden = favorites.length === 0;
    favoritesChips.replaceChildren();
    favorites.forEach((key) => favoritesChips.append(buildChip(key)));

    recentRow.hidden = recent.length === 0;
    recentChips.replaceChildren();
    recent.forEach((key) => recentChips.append(buildChip(key)));
  }

  function buildChip(key) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'effect-chip';
    chip.dataset.chipKey = key;
    chip.textContent = labelFor(key);
    chip.classList.toggle('is-active', isEnabled(key));
    chip.addEventListener('click', () => enableEffect(key));
    return chip;
  }

  function enableEffect(key) {
    const def = defs()[key];
    if (!def) return;
    const checkbox = document.getElementById(def.enabledId);
    if (!checkbox || checkbox.checked) return;
    if (activeKeys().length >= MAX_ACTIVE) {
      flashStackHeader('Stack is full — remove one first.');
      return;
    }
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let flashTimer = 0;
  function flashStackHeader(message) {
    const header = document.querySelector('#effectsStackPanel .effects-stack-header .tool-label');
    if (!header) return;
    const original = header.dataset.original || header.textContent;
    header.dataset.original = original;
    header.textContent = message;
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => { header.textContent = original; }, 1600);
  }

  function pushRecent(key) {
    state.recent = state.recent.filter((item) => item !== key);
    state.recent.unshift(key);
    state.recent = state.recent.slice(0, 10);
  }

  /* ------------------------------ Events ------------------------------ */

  ready(function initCards() {
    // Card thumbnail click = quick enable/disable without expanding the card.
    document.querySelectorAll('[data-effect-key]').forEach((card) => {
      const key = card.dataset.effectKey;
      const thumb = card.querySelector('.effect-card-thumb');
      thumb?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const def = defs()[key];
        const checkbox = def && document.getElementById(def.enabledId);
        if (!checkbox) return;
        if (!checkbox.checked && activeKeys().length >= MAX_ACTIVE) {
          flashStackHeader('Stack is full — remove one first.');
          return;
        }
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // Enforce the 5-effect cap and keep the stack/chips in sync whenever
    // any Enable checkbox changes (from a card, a chip, or the checkbox itself).
    document.querySelectorAll('.effect-enable').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const key = checkbox.closest('[data-effect-key]')?.dataset.effectKey;
        if (!key) return;
        if (checkbox.checked && activeKeys().length > MAX_ACTIVE) {
          checkbox.checked = false;
          flashStackHeader('Stack is full — remove one first.');
          return;
        }
        if (checkbox.checked) pushRecent(key);
        renderStack();
        renderChips();
        persist();
      });
    });

    // Favorite star.
    document.querySelectorAll('.effect-card-star').forEach((star) => {
      star.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = star.dataset.favoriteKey;
        const isFavorite = state.favorites.includes(key);
        state.favorites = isFavorite ? state.favorites.filter((item) => item !== key) : [...state.favorites, key];
        star.setAttribute('aria-pressed', String(!isFavorite));
        persist();
        renderChips();
      });
    });

    // Stack list actions (event delegation).
    document.getElementById('effectsStackList')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-stack-action]');
      if (!button) return;
      const { stackAction, key } = button.dataset;
      const active = state.order.filter(isEnabled);
      const index = active.indexOf(key);
      if (index === -1) return;

      if (stackAction === 'remove') {
        const def = defs()[key];
        const checkbox = def && document.getElementById(def.enabledId);
        if (checkbox) {
          checkbox.checked = false;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }

      const swapWith = stackAction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= active.length) return;
      const fullIndexA = state.order.indexOf(active[index]);
      const fullIndexB = state.order.indexOf(active[swapWith]);
      [state.order[fullIndexA], state.order[fullIndexB]] = [state.order[fullIndexB], state.order[fullIndexA]];
      renderStack();
      window.alamsDumpRerender?.();
    });

    // Randomize: jitter every slider belonging to a currently-active effect.
    document.getElementById('randomizeStackButton')?.addEventListener('click', () => {
      const active = state.order.filter(isEnabled);
      active.forEach((key) => {
        const card = cardFor(key);
        card?.querySelectorAll('.control-grid input[type="range"]').forEach((input) => {
          const min = Number(input.min);
          const max = Number(input.max);
          const step = Number(input.step) || 1;
          const steps = Math.round((max - min) / step);
          const value = min + Math.round(Math.random() * steps) * step;
          input.value = String(value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      if (!active.length) flashStackHeader('Enable an effect first.');
    });

    renderStack();
    renderChips();

    /* --------------------------- Thumbnails --------------------------- */

    function regenerateThumbnails() {
      const output = document.getElementById('outputCanvas');
      const registry = defs();
      if (!output || !output.width || !output.height) return;
      document.querySelectorAll('[data-thumb-for]').forEach((thumbCanvas) => {
        const def = registry[thumbCanvas.dataset.thumbFor];
        if (!def) return;
        const work = document.createElement('canvas');
        work.width = output.width;
        work.height = output.height;
        work.getContext('2d').drawImage(output, 0, 0);
        try {
          def.run(work, 1);
        } catch (error) {
          return; // best-effort preview; a failed thumbnail just stays blank
        }
        const ctx = thumbCanvas.getContext('2d');
        ctx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
        ctx.drawImage(work, 0, 0, thumbCanvas.width, thumbCanvas.height);
      });
    }

    let thumbTimer = 0;
    const scheduleThumbs = () => {
      window.clearTimeout(thumbTimer);
      thumbTimer = window.setTimeout(regenerateThumbnails, 260);
    };
    document.addEventListener('input', scheduleThumbs);
    document.addEventListener('change', scheduleThumbs);
    window.setInterval(regenerateThumbnails, 1500);
    window.setTimeout(regenerateThumbnails, 900);
  });
})();
