(() => {
  const form = document.getElementById('veyra-character-sheet');
  if (!form) return;

  const STORAGE_KEY = 'veyra-character-sheet-v1';
  const status = document.getElementById('save-status');
  const giftType = document.getElementById('gift-type');
  const characterName = form.elements['character-name'];
  const nameDisplays = document.querySelectorAll('[data-character-name-display]');
  let saveTimer = null;

  const setStatus = (message) => {
    if (!status) return;
    status.textContent = message;
  };

  const numberValue = (name) => {
    const field = form.elements[name];
    const value = Number(field?.value);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const updateNameDisplays = () => {
    const value = characterName?.value.trim() || 'Unnamed Adventurer';
    nameDisplays.forEach((node) => { node.textContent = value; });
  };

  const updateResource = (resource, nextMax) => {
    const maxField = form.querySelector(`[data-max-resource="${resource}"]`);
    const currentField = form.querySelector(`[data-current-for="${resource}"]`);
    if (!maxField || !currentField) return;

    const previousMax = Number(maxField.dataset.lastMax || maxField.value || 0);
    const current = Number(currentField.value);
    const shouldFillCurrent = currentField.value === '' || (previousMax > 0 && current === previousMax);

    maxField.value = nextMax > 0 ? String(nextMax) : '';
    maxField.dataset.lastMax = nextMax > 0 ? String(nextMax) : '';

    if (shouldFillCurrent) currentField.value = nextMax > 0 ? String(nextMax) : '';
    if (nextMax > 0 && Number(currentField.value) > nextMax) currentField.value = String(nextMax);
  };

  const updateDeathPool = () => {
    const vigor = numberValue('attr-vigor');
    const field = form.elements['death-dice-current'];
    if (!field) return;
    const oldVigor = Number(field.dataset.lastVigor || 0);
    const current = Number(field.value);
    if (field.value === '' || (oldVigor > 0 && current === oldVigor)) field.value = vigor > 0 ? String(vigor) : '';
    field.dataset.lastVigor = vigor > 0 ? String(vigor) : '';
  };

  const updateDerivedResources = () => {
    const brawn = numberValue('attr-brawn');
    const agility = numberValue('attr-agility');
    const intellect = numberValue('attr-intellect');
    const vigor = numberValue('attr-vigor');

    updateResource('health', brawn && vigor ? (brawn + vigor) * 2 : 0);
    updateResource('stamina', agility && vigor ? (agility + vigor) * 2 : 0);

    const isOpen = giftType?.value === 'open';
    updateResource('mana', isOpen && intellect && vigor ? (intellect + vigor) * 2 : 0);
    updateDeathPool();
  };

  const updateGiftSections = () => {
    const type = giftType?.value || '';
    document.querySelectorAll('.fixed-gift-only').forEach((node) => { node.hidden = type !== 'fixed'; });
    document.querySelectorAll('.open-gift-only').forEach((node) => { node.hidden = type !== 'open'; });
    document.querySelectorAll('.no-gift-selected').forEach((node) => { node.hidden = type === 'fixed' || type === 'open'; });

    const manaCard = document.getElementById('mana-card');
    if (manaCard) {
      const active = type === 'open';
      manaCard.classList.toggle('is-disabled', !active);
      manaCard.setAttribute('aria-disabled', String(!active));
      if (!active) {
        const manaCurrent = form.elements['mana-current'];
        const manaMax = form.elements['mana-max'];
        if (manaCurrent) manaCurrent.value = '';
        if (manaMax) {
          manaMax.value = '';
          manaMax.dataset.lastMax = '';
        }
      }
    }
    updateDerivedResources();
  };

  const serialize = () => {
    const data = {};
    form.querySelectorAll('[name]').forEach((field) => {
      if (field.type === 'checkbox') data[field.name] = field.checked;
      else data[field.name] = field.value;
    });
    return data;
  };

  const applyData = (data) => {
    if (!data || typeof data !== 'object') return;
    form.querySelectorAll('[name]').forEach((field) => {
      if (!(field.name in data)) return;
      if (field.type === 'checkbox') field.checked = Boolean(data[field.name]);
      else field.value = data[field.name] ?? '';
    });
    updateGiftSections();
    updateNameDisplays();
    updateDerivedResources();
  };

  const save = (manual = false) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), character: serialize() }));
      const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setStatus(manual ? `Saved · ${time}` : `Autosaved · ${time}`);
    } catch (error) {
      console.error('Unable to save Veyra character sheet:', error);
      setStatus('Browser save unavailable');
    }
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        updateGiftSections();
        updateNameDisplays();
        updateDerivedResources();
        return;
      }
      const parsed = JSON.parse(raw);
      applyData(parsed.character || parsed);
      setStatus('Saved character restored');
    } catch (error) {
      console.error('Unable to load Veyra character sheet:', error);
      setStatus('Saved character could not be restored');
    }
  };

  const queueSave = () => {
    clearTimeout(saveTimer);
    setStatus('Editing…');
    saveTimer = window.setTimeout(() => save(false), 500);
  };

  form.addEventListener('input', (event) => {
    if (event.target.matches('[data-attribute]')) updateDerivedResources();
    if (event.target === characterName) updateNameDisplays();
    queueSave();
  });

  form.addEventListener('change', (event) => {
    if (event.target === giftType) updateGiftSections();
    if (event.target.matches('[data-attribute]')) updateDerivedResources();
    queueSave();
  });

  document.getElementById('save-button')?.addEventListener('click', () => save(true));
  document.getElementById('print-button')?.addEventListener('click', () => {
    save(true);
    window.print();
  });

  document.getElementById('export-button')?.addEventListener('click', () => {
    const payload = {
      format: 'Veyra Character Sheet',
      version: 1,
      exportedAt: new Date().toISOString(),
      character: serialize()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = (characterName?.value || 'veyra-character').trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'veyra-character';
    anchor.href = url;
    anchor.download = `${safeName}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus('Character exported');
  });

  document.getElementById('import-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      applyData(parsed.character || parsed);
      save(true);
      setStatus('Character imported');
    } catch (error) {
      console.error('Unable to import Veyra character:', error);
      setStatus('Import failed');
      window.alert('That file could not be read as a Veyra character export.');
    } finally {
      event.target.value = '';
    }
  });

  document.getElementById('clear-button')?.addEventListener('click', () => {
    const confirmed = window.confirm('Clear every field on this character sheet? This also replaces the locally saved copy.');
    if (!confirmed) return;
    form.reset();
    form.querySelectorAll('[data-last-max]').forEach((field) => { field.dataset.lastMax = ''; });
    updateGiftSections();
    updateNameDisplays();
    updateDerivedResources();
    save(true);
    setStatus('Sheet cleared');
  });

  window.addEventListener('beforeprint', () => {
    updateNameDisplays();
    updateDerivedResources();
  });

  load();
})();
