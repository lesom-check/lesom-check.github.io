const API = (() => {
  function fetchResults() {
    return fetch('results/results.json?t=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  }

  function triggerWorkflow(token) {
    return fetch(
      `https://api.github.com/repos/${CONFIG.repo}/actions/workflows/check.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    ).then(r => {
      if (!r.ok) throw new Error(`GitHub API ${r.status}`);
    });
  }

  function waitForNewResults(prevTimestamps, signal) {
    let attempts = 0;
    return new Promise((resolve, reject) => {
      function poll() {
        if (signal && signal.aborted) { reject(new Error('Aborted')); return; }
        if (attempts >= CONFIG.maxPolls) { reject(new Error('Таймаут')); return; }
        attempts++;
        fetchResults()
          .then(data => {
            let done = true;
            CONFIG.servers.forEach(s => {
              const e = data[s.id];
              if (!e || !e.timestamp || e.timestamp <= (prevTimestamps[s.id] || '')) {
                done = false;
              }
            });
            if (done) { resolve(data); return; }
            setTimeout(poll, CONFIG.pollInterval);
          })
          .catch(() => setTimeout(poll, CONFIG.pollInterval));
      }
      poll();
    });
  }

  return { fetchResults, triggerWorkflow, waitForNewResults };
})();
