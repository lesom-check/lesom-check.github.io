const API = (() => {
  const CHECK_HOST = 'https://check-host.net';

  function proxyFetch(targetUrl, proxyIndex) {
    if (proxyIndex === undefined) proxyIndex = 0;
    if (proxyIndex >= CONFIG.corsProxies.length) {
      return Promise.reject(new Error('Все CORS-прокси недоступны'));
    }
    const proxy = CONFIG.corsProxies[proxyIndex];
    const url = proxy + encodeURIComponent(targetUrl);
    return fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Proxy HTTP ' + r.status);
        return r.json();
      })
      .catch(() => proxyFetch(targetUrl, proxyIndex + 1));
  }

  function initCheck(host, port, nodeIds) {
    const nodeParams = nodeIds.map(id => 'node=' + encodeURIComponent(id)).join('&');
    const url = `${CHECK_HOST}/check-tcp?host=${encodeURIComponent(host)}:${port}&${nodeParams}`;
    return proxyFetch(url);
  }

  function getResults(requestId) {
    const url = `${CHECK_HOST}/check-result/${encodeURIComponent(requestId)}`;
    return proxyFetch(url);
  }

  function pollResults(requestId, attempts, delay) {
    let tries = 0;
    return new Promise((resolve, reject) => {
      function poll() {
        tries++;
        getResults(requestId)
          .then(data => {
            const allDone = CONFIG.checkNodes.every(n => data[n.id] !== null && data[n.id] !== undefined);
            if (allDone) {
              resolve(data);
            } else if (tries >= attempts) {
              resolve(data);
            } else {
              setTimeout(poll, delay);
            }
          })
          .catch(reject);
      }
      poll();
    });
  }

  return { initCheck, getResults, pollResults };
})();
