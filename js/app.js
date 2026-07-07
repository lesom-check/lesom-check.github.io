const App = (() => {
  let _refreshTimer = null;

  function getDataFromResults(raw) {
    return CONFIG.servers.map(server => {
      const entry = raw[server.id] || null;
      const nodeData = (entry && entry.data) ? entry.data : null;
      return { server, entry, nodeData };
    });
  }

  async function loadAndRender() {
    const btn = document.getElementById('check-all-btn');
    if (btn) btn.textContent = 'Обновляется...';
    Render.setGlobalStatus('');

    try {
      const raw = await API.fetchResults();
      Render.renderAll(getDataFromResults(raw));
    } catch (e) {
      Render.renderAll(CONFIG.servers.map(s => ({ server: s, entry: null, nodeData: null })));
      Render.setGlobalStatus('Не удалось загрузить результаты');
    }
    if (btn) btn.textContent = 'Обновить данные';
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    _refreshTimer = setInterval(loadAndRender, CONFIG.refreshInterval);
  }

  function stopAutoRefresh() {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  async function init() {
    await loadAndRender();
    startAutoRefresh();

    document.getElementById('check-all-btn').addEventListener('click', () => {
      loadAndRender();
      Render.setGlobalStatus('Данные получены. Автопроверка каждые 5 мин.');
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
