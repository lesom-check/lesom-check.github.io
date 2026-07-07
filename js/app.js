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
    try {
      const raw = await API.fetchResults();
      const data = getDataFromResults(raw);
      Render.renderAll(data);
      Render.renderTopology(data);
    } catch (e) {
      const empty = CONFIG.servers.map(s => ({ server: s, entry: null, nodeData: null }));
      Render.renderAll(empty);
      Render.renderTopology(empty);
    }
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
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
