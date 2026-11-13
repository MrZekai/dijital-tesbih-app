(() => {
  const root = document.getElementById('counter');
  if (!root) return;
  const key = 'zikirmatik-web:v1';
  const count = document.getElementById('count');
  const tap = document.getElementById('tap');
  const undo = document.getElementById('undo');
  const reset = document.getElementById('reset');
  const select = document.getElementById('dhikr');
  const targetSelect = document.getElementById('target');
  const feedback = document.getElementById('feedback');
  const format = new Intl.NumberFormat(root.dataset.locale, {useGrouping:false});
  let state = {counts:[0,0,0],active:0,target:33}, history = [], storageOK = true, conflict = false;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved.counts) || saved.counts.length !== 3 || !saved.counts.every(n=>Number.isSafeInteger(n)&&n>=0) || ![0,1,2].includes(saved.active) || ![33,99,100].includes(saved.target)) throw new Error('Invalid counter record');
      state = saved;
    }
  } catch { storageOK = false; }
  function render(message = '') {
    count.textContent = format.format(state.counts[state.active]);
    select.value = String(state.active);
    targetSelect.value = String(state.target);
    tap.setAttribute('aria-label', `${select.options[state.active].text}, ${count.textContent}`);
    tap.disabled = conflict;
    reset.disabled = conflict;
    undo.disabled = history.length === 0 || conflict;
    feedback.textContent = conflict ? root.dataset.storageConflict : !storageOK ? root.dataset.storageError : message;
  }
  function save(message = '') {
    if (storageOK) {
      try { localStorage.setItem(key, JSON.stringify(state)); }
      catch { storageOK = false; }
    }
    render(message);
  }
  tap.addEventListener('click', () => {
    if (conflict || state.counts[state.active] >= Number.MAX_SAFE_INTEGER) return;
    history.push(state.active); if (history.length > 200) history.shift();
    state.counts[state.active] += 1;
    save(state.counts[state.active] % state.target === 0 ? root.dataset.complete : '');
  });
  undo.addEventListener('click', () => {
    if (conflict || history.length === 0) return;
    const index = history.pop(); state.counts[index] = Math.max(0,state.counts[index]-1); save();
  });
  reset.addEventListener('click', () => {
    if (conflict || !window.confirm(root.dataset.confirm)) return;
    state.counts[state.active] = 0; history = history.filter(i=>i!==state.active); save();
  });
  select.addEventListener('change', () => { if (conflict) return; state.active = Number(select.value); save(); });
  targetSelect.addEventListener('change', () => { if (conflict) return; state.target = Number(targetSelect.value); save(); });
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) { conflict = true; select.disabled = true; targetSelect.disabled = true; render(); }
  });
  render();
})();
