const API = (() => {
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
      if (!r.ok) throw new Error(`GitHub API: ${r.status}`);
    });
  }

  function fetchResults() {
    return fetch('results/results.json?t=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  }

  function waitForNewResults(prevTimestamps, signal) {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      function poll() {
        if (signal && signal.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        if (attempts >= CONFIG.maxResultPolls) {
          reject(new Error('Таймаут ожидания результатов'));
          return;
        }
        attempts++;
        fetchResults()
          .then(data => {
            let updated = false;
            CONFIG.servers.forEach(s => {
              const entry = data[s.id];
              if (entry && entry.timestamp) {
                const prev = prevTimestamps[s.id];
                if (!prev || entry.timestamp > prev) {
                  updated = true;
                }
              }
            });
            if (updated) {
              resolve(data);
            } else {
              setTimeout(poll, CONFIG.pollResultsInterval);
            }
          })
          .catch(() => setTimeout(poll, CONFIG.pollResultsInterval));
      }

      poll();
    });
  }

  return { triggerWorkflow, fetchResults, waitForNewResults };
})();
