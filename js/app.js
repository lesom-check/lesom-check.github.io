const App = (() => {
  let _abort = null;
  let _cooldownTimer = null;

  function getDataFromResults(raw) {
    return CONFIG.servers.map(server => {
      const entry = raw[server.id] || null;
      const nodeData = (entry && entry.data) ? entry.data : null;
      return { server, entry, nodeData };
    });
  }

  async function loadAndRender() {
    try {
      const raw = await API.fetchResults();
      Render.renderAll(getDataFromResults(raw));
    } catch (e) {
      Render.renderAll(CONFIG.servers.map(s => ({ server: s, entry: null, nodeData: null })));
    }
  }

  function getTimestamps(raw) {
    const ts = {};
    CONFIG.servers.forEach(s => {
      const e = raw[s.id];
      ts[s.id] = e ? e.timestamp || '' : '';
    });
    return ts;
  }

  function startCooldown(seconds) {
    let left = seconds;
    Render.setCooldown(true, left);
    _cooldownTimer = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(_cooldownTimer);
        _cooldownTimer = null;
        Render.setCooldown(false);
      } else {
        Render.setCooldown(true, left);
      }
    }, 1000);
  }

  async function doCheck() {
    if (_abort) _abort.abort();
    _abort = new AbortController();
    const signal = _abort.signal;

    try {
      let currentRaw = {};
      try { currentRaw = await API.fetchResults(); } catch (e) {}

      Render.setLoading(true, '<span class="spinner"></span> Запуск...');
      Render.setStatus('Отправка запроса...');

      await API.triggerWorkflow(CONFIG.ghToken);
      Render.setStatus('Ожидание результатов (~40 сек)...');

      const prev = getTimestamps(currentRaw);
      const newRaw = await API.waitForNewResults(prev, signal);

      Render.renderAll(getDataFromResults(newRaw));
      Render.setStatus('');
      startCooldown(60);
    } catch (err) {
      if (err.message === 'Aborted') { Render.setStatus(''); return; }
      Render.showError(err.message);
      Render.setStatus('');
      await loadAndRender();
      if (!_abort) startCooldown(30);
    } finally {
      Render.setLoading(false);
      _abort = null;
    }
  }

  async function init() {
    await loadAndRender();
    document.getElementById('check-btn').addEventListener('click', doCheck);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
