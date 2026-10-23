// Purely presentational theme selector. No network access and no interaction with demo records.
const key = 'hiveledger-theme-v1';
const allowed = new Set(['harvest','studio']);
const select = document.querySelector('#theme-select');
let saved = 'harvest';
try { saved = localStorage.getItem(key) || 'harvest'; } catch {}
if (!allowed.has(saved)) saved = 'harvest';
document.documentElement.dataset.theme = saved;
if (select) {
  select.value = saved;
  select.addEventListener('change', () => {
    const next = allowed.has(select.value) ? select.value : 'harvest';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(key, next); } catch {}
  });
}
