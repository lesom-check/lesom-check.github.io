const App = (() => {
  function loadFromStorage() {
    return CONFIG.servers.map(server => {
      const data = Storage.getServerResults(server.id);
      return {
        server,
        nodesData: data ? data.results : null,
        lastTime: data ? data.timestamp : null,
      };
    });
  }

  function renderFromStorage() {
    Render.renderAll(loadFromStorage());
  }

  function checkServer(server) {
    Render.setGlobalStatus(`Запуск проверки ${server.label.toLowerCase()}...`);
    const nodeIds = CONFIG.checkNodes.map(n => n.id);
    return API.initCheck(server.ip, server.port, nodeIds)
      .then(response => {
        if (!response.ok) throw new Error('Ошибка запуска проверки: ' + (response.error || 'неизвестно'));
        Render.setGlobalStatus(`Ожидание результатов для ${server.label.toLowerCase()}... (request_id: ${response.request_id})`);
        return API.pollResults(response.request_id, CONFIG.pollAttempts, CONFIG.pollDelay);
      })
      .then(data => {
        Storage.setServerResults(server.id, data);
        return data;
      });
  }

  async function checkAll() {
    Render.setLoading(true);
    Render.setGlobalStatus('Запуск проверок...');
    const results = [];

    for (const server of CONFIG.servers) {
      try {
        const data = await checkServer(server);
        results.push({ server, data, ok: true });
      } catch (err) {
        Render.showError(`Ошибка проверки ${server.label}: ${err.message}`);
        results.push({ server, data: null, ok: false });
      }
    }

    Render.renderAll(loadFromStorage());
    Render.setLoading(false);
    Render.setGlobalStatus('');
  }

  function init() {
    renderFromStorage();
    document.getElementById('check-all-btn').addEventListener('click', checkAll);
  }

  return { init, checkAll };
})();

document.addEventListener('DOMContentLoaded', App.init);
