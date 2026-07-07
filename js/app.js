const App = (() => {
  let _abortController = null;

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

  function getCurrentTimestamps(raw) {
    const ts = {};
    CONFIG.servers.forEach(s => {
      const e = raw[s.id];
      ts[s.id] = e ? e.timestamp || '' : '';
    });
    return ts;
  }

  async function doCheck() {
    const token = Storage.getToken();
    if (!token) {
      Render.showError('Сначала сохраните GitHub токен');
      return;
    }

    if (_abortController) _abortController.abort();
    _abortController = new AbortController();
    const signal = _abortController.signal;

    try {
      let currentRaw;
      try {
        currentRaw = await API.fetchResults();
      } catch (e) {
        currentRaw = {};
      }

      Render.setLoading(true, '<span class="spinner"></span> Запуск проверки...');
      Render.setGlobalStatus('Отправка запроса в GitHub Actions...');

      await API.triggerWorkflow(token);
      Render.setGlobalStatus('Проверка запущена, ожидание результатов...');

      const prevTimestamps = getCurrentTimestamps(currentRaw);
      const newRaw = await API.waitForNewResults(prevTimestamps, signal);

      Render.renderAll(getDataFromResults(newRaw));
      Render.setGlobalStatus('');
    } catch (err) {
      if (err.message === 'Aborted') {
        Render.setGlobalStatus('');
      } else {
        Render.showError(err.message);
        Render.setGlobalStatus('');
        await loadAndRender();
      }
    } finally {
      Render.setLoading(false);
      _abortController = null;
    }
  }

  function setupTokenHandlers() {
    const section = document.getElementById('token-section');
    if (!section) return;

    section.addEventListener('click', e => {
      if (e.target.id === 'btn-token-save') {
        const input = document.getElementById('token-input');
        if (input && input.value.trim()) {
          Storage.setToken(input.value.trim());
          Render.renderTokenInput(true);
        }
      }
      if (e.target.id === 'btn-token-reset') {
        Storage.clearToken();
        Render.renderTokenInput(false);
      }
    });

    section.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id === 'token-input') {
        const input = document.getElementById('token-input');
        if (input && input.value.trim()) {
          Storage.setToken(input.value.trim());
          Render.renderTokenInput(true);
        }
      }
    });
  }

  async function init() {
    setupTokenHandlers();
    Render.renderTokenInput(!!Storage.getToken());
    await loadAndRender();

    document.getElementById('check-all-btn').addEventListener('click', doCheck);
  }

  return { init, doCheck };
})();

document.addEventListener('DOMContentLoaded', App.init);
