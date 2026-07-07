const Storage = (() => {
  const KEY = 'geoav_check_results';
  const TIME_KEY = 'geoav_last_check';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      localStorage.setItem(TIME_KEY, new Date().toISOString());
    } catch (e) {}
  }

  function getLastCheckTime() {
    try {
      const ts = localStorage.getItem(TIME_KEY);
      return ts ? new Date(ts) : null;
    } catch (e) {
      return null;
    }
  }

  function getServerResults(serverId) {
    const all = load();
    return all[serverId] || null;
  }

  function setServerResults(serverId, results) {
    const all = load();
    all[serverId] = {
      timestamp: new Date().toISOString(),
      results: results,
    };
    save(all);
  }

  return { load, save, getLastCheckTime, getServerResults, setServerResults };
})();
