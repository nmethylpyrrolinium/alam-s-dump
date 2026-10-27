/* Local-first named edit branches. Original image bytes live once in IndexedDB. */
(function () {
  'use strict';
  const DB_NAME = 'alams-dump-memory-index';
  const DB_VERSION = 1;
  const SOURCE_STORE = 'sources';
  const PROJECT_STORE = 'projects';
  const BRANCH_STORE = 'branches';
  let dbPromise;
  let currentSourceId = null;
  const core = window.AlamsDumpMemoryCore;

  const status = (message, error = false) => {
    const el = document.getElementById('memoryIndexStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.state = error ? 'error' : '';
  };
  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support local project storage.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SOURCE_STORE)) db.createObjectStore(SOURCE_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(BRANCH_STORE)) {
          const store = db.createObjectStore(BRANCH_STORE, { keyPath: 'id' });
          store.createIndex('sourceId', 'sourceId', { unique: false });
        }
      };
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); }
      request.onerror = () => reject(request.error || new Error('Could not open local project storage.'));
      request.onblocked = () => reject(new Error('Close another Alam’s Dump tab to update local project storage.'));
    }).catch((error) => { dbPromise = null; throw error; });
    return dbPromise;
  }
  async function request(storeName, mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let req;
      let result;
      let requestError = null;
      try { req = action(tx.objectStore(storeName)); } catch (error) { reject(error); return; }
      req.onsuccess = () => { result = req.result; };
      req.onerror = () => { requestError = req.error || new Error('Local project storage failed.'); };
      tx.oncomplete = () => requestError ? reject(requestError) : resolve(result);
      tx.onerror = () => reject(requestError || tx.error || new Error('Local project storage failed.'));
      tx.onabort = () => reject(requestError || tx.error || new Error('Local project storage could not finish.'));
    });
  }
  const allSources = () => request(PROJECT_STORE, 'readonly', (store) => store.getAll());
  const branchesFor = (sourceId) => request(BRANCH_STORE, 'readonly', (store) => store.index('sourceId').getAll(sourceId));
  async function getSource(id) {
    const [project, source] = await Promise.all([
      request(PROJECT_STORE, 'readonly', (store) => store.get(id)),
      request(SOURCE_STORE, 'readonly', (store) => store.get(id)),
    ]);
    return project ? { ...project, ...source } : undefined;
  }
  const getBranch = (id) => request(BRANCH_STORE, 'readonly', (store) => store.get(id));
  async function putSource(source) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PROJECT_STORE, SOURCE_STORE], 'readwrite');
      const { blob, ...metadata } = source;
      tx.objectStore(PROJECT_STORE).put(metadata);
      tx.objectStore(SOURCE_STORE).put({ id: source.id, blob, type: source.type || blob.type || '' });
      tx.oncomplete = () => resolve(source.id);
      tx.onerror = () => reject(tx.error || new Error('Could not save the original photo.'));
      tx.onabort = () => reject(tx.error || new Error('Could not save the original photo.'));
    });
  }
  const putBranch = (branch) => request(BRANCH_STORE, 'readwrite', (store) => store.put(branch));
  const deleteBranch = (id) => request(BRANCH_STORE, 'readwrite', (store) => store.delete(id));

  async function refreshSources() {
    const select = document.getElementById('memorySourceSelect');
    if (!select) return [];
    const sources = (await allSources()).sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    select.replaceChildren(new Option('Choose a saved original…', ''));
    sources.forEach((item) => {
      const option = new Option(`${item.name} · ${new Date(item.createdAt).toLocaleDateString()}`, item.id);
      select.append(option);
    });
    select.value = sources.some((item) => item.id === currentSourceId) ? currentSourceId : '';
    return sources;
  }
  async function refreshBranches(selectedId = '') {
    const select = document.getElementById('memoryBranchSelect');
    const rename = document.getElementById('memoryRenameButton');
    const remove = document.getElementById('memoryDeleteBranchButton');
    if (!select) return [];
    const branches = currentSourceId ? await branchesFor(currentSourceId) : [];
    branches.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    select.replaceChildren(new Option(branches.length ? 'Choose a saved version…' : 'No saved versions yet', ''));
    branches.forEach((branch) => select.append(new Option(branch.name, branch.id)));
    select.value = branches.some((branch) => branch.id === selectedId) ? selectedId : '';
    if (rename) rename.disabled = !select.value;
    if (remove) remove.disabled = !select.value;
    const save = document.getElementById('memorySaveBranchButton');
    const sourceOpen = document.getElementById('memoryOpenSourceButton');
    if (save) save.disabled = !currentSourceId;
    if (sourceOpen) sourceOpen.disabled = !select.value;
    return branches;
  }
  function id() { return window.crypto?.randomUUID?.() || `source-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  window.alamsDumpMemorySourceReady = async function (source) {
    currentSourceId = source.id;
    try {
      const existing = await getSource(source.id);
      await putSource({ id: source.id, name: source.name, blob: existing?.blob || source.blob, width: source.width, height: source.height, type: source.blob.type || '', createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
      await refreshSources();
      await refreshBranches();
      status('Original saved on this device. Edit branches stay here until you clear them.');
    } catch (error) {
      status(error?.name === 'QuotaExceededError' ? 'Local storage is full. Remove saved projects or free browser space, then try again.' : `Could not save this original locally: ${error.message || 'storage unavailable'}`, true);
    }
  };

  async function openSource(sourceId) {
    const source = await getSource(sourceId);
    if (!source?.blob) throw new Error('That saved original is missing or damaged.');
    const branches = await branchesFor(sourceId);
    await window.alamsDumpLoadMemorySource(new File([source.blob], source.name || 'saved-photo', { type: source.type || source.blob.type || 'image/jpeg' }), source.id);
    currentSourceId = source.id;
    await refreshSources();
    await refreshBranches();
    if (branches.length) {
      const latest = branches.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
      await window.alamsDumpApplyRecipe(core.migrateRecord(latest).recipe);
      document.getElementById('memoryBranchSelect').value = latest.id;
      await refreshBranches(latest.id);
      status(`Opened ${source.name} at “${latest.name}”.`);
    } else {
      window.alamsDumpResetRecipe();
      status(`Returned to the original ${source.name}.`);
    }
  }

  async function init() {
    const saveButton = document.getElementById('memorySaveBranchButton');
    if (!saveButton) return;
    document.getElementById('memorySaveBranchForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        if (!currentSourceId) throw new Error('Load an image before saving a version.');
        const input = document.getElementById('memoryBranchName');
        const existing = await branchesFor(currentSourceId);
        const branch = core.makeBranch({ sourceId: currentSourceId, name: input.value, recipe: window.alamsDumpCaptureRecipe(), existingNames: existing.map((item) => item.name) });
        await putBranch(branch);
        input.value = '';
        await refreshBranches(branch.id);
        status(`Saved “${branch.name}”. New names create separate branches; existing versions are never overwritten.`);
      } catch (error) { status(error.message || 'Could not save this version.', true); }
    });
    document.getElementById('memoryBranchSelect')?.addEventListener('change', async (event) => {
      const branchId = event.target.value;
      document.getElementById('memoryRenameButton').disabled = !branchId;
      document.getElementById('memoryDeleteBranchButton').disabled = !branchId;
      document.getElementById('memoryOpenSourceButton').disabled = !branchId;
      if (!branchId) return;
      try {
        const branch = core.migrateRecord(await getBranch(branchId));
        if (branch.sourceId !== currentSourceId) await openSource(branch.sourceId);
        await window.alamsDumpApplyRecipe(branch.recipe);
        await refreshBranches(branchId);
        status(`Switched to “${branch.name}”.`);
      } catch (error) { status(error.message || 'Could not open that version.', true); }
    });
    document.getElementById('memoryRenameButton')?.addEventListener('click', async () => {
      const select = document.getElementById('memoryBranchSelect');
      if (!select.value) return;
      try {
        const branch = await getBranch(select.value);
        const nextName = window.prompt('Rename this saved version:', branch?.name || '');
        if (nextName === null) return;
        const existing = await branchesFor(branch.sourceId);
        const clean = core.normalizeName(nextName);
        if (existing.some((item) => item.id !== branch.id && item.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) throw new Error('A version with that name already exists for this photo.');
        branch.name = clean;
        await putBranch(branch);
        await refreshBranches(branch.id);
        status(`Renamed version to “${clean}”.`);
      } catch (error) { status(error.message || 'Could not rename this version.', true); }
    });
    document.getElementById('memoryDeleteBranchButton')?.addEventListener('click', async () => {
      const select = document.getElementById('memoryBranchSelect');
      if (!select.value) return;
      try {
        const branch = await getBranch(select.value);
        if (!window.confirm(`Delete “${branch.name}”? This only removes the saved edit recipe.`)) return;
        await deleteBranch(branch.id);
        await refreshBranches();
        status(`Deleted “${branch.name}”.`);
      } catch (error) { status(error.message || 'Could not delete this version.', true); }
    });
    document.getElementById('memoryOpenSourceButton')?.addEventListener('click', async () => {
      const branch = await getBranch(document.getElementById('memoryBranchSelect').value);
      if (!branch) return;
      try { await openSource(branch.sourceId); } catch (error) { status(error.message || 'Could not open the original.', true); }
    });
    document.getElementById('memorySourceSelect')?.addEventListener('change', async (event) => {
      if (!event.target.value) return;
      try { await openSource(event.target.value); } catch (error) { status(error.message || 'Could not open that saved photo.', true); }
    });
    document.getElementById('memoryClearButton')?.addEventListener('click', async () => {
      if (!window.confirm('Remove all saved originals and edit versions from this browser? This cannot be undone.')) return;
      try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction([PROJECT_STORE, SOURCE_STORE, BRANCH_STORE], 'readwrite');
          tx.objectStore(PROJECT_STORE).clear();
          tx.objectStore(SOURCE_STORE).clear();
          tx.objectStore(BRANCH_STORE).clear();
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('Could not clear local project data.'));
          tx.onabort = () => reject(tx.error || new Error('Could not clear local project data.'));
        });
        currentSourceId = null;
        await refreshSources();
        await refreshBranches();
        status('All Memory Index data was removed from this browser.');
      } catch (error) { status(error.message || 'Could not clear local project data.', true); }
    });
    document.getElementById('memoryReturnOriginalButton')?.addEventListener('click', async () => {
      try {
        if (!currentSourceId) throw new Error('Load an image first.');
        window.alamsDumpResetRecipe();
        await refreshBranches();
        status('Returned to the original photo and default controls.');
      } catch (error) { status(error.message || 'Could not return to the original.', true); }
    });
    try { await refreshSources(); await refreshBranches(); }
    catch (error) { status(error.message || 'Local project storage is unavailable.', true); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
