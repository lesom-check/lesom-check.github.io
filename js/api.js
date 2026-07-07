const API = (() => {
  function fetchResults() {
    return fetch('results/results.json?t=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  }

  return { fetchResults };
})();
