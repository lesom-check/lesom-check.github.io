const SERVERS = [
  { id: 'fi-server', label: 'Сервер в Финляндии', ip: '91.211.114.182', port: 443 },
  { id: 'ru-server', label: 'Сервер в России',    ip: '185.228.235.125', port: 443 },
];

const NODES = [
  'ru1.node.check-host.net',
  'fi1.node.check-host.net',
  'nl1.node.check-host.net',
  'de1.node.check-host.net',
  'us1.node.check-host.net',
  'ch1.node.check-host.net',
];

const API = 'https://check-host.net';
const MAX_POLLS = 12;
const POLL_DELAY = 2000;

async function fetchJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function checkServer(server) {
  console.log(`Starting check for ${server.label} (${server.ip}:${server.port})`);
  const nodeParams = NODES.map(id => 'node=' + encodeURIComponent(id)).join('&');
  const initUrl = `${API}/check-tcp?host=${encodeURIComponent(server.ip)}:${server.port}&${nodeParams}`;

  const init = await fetchJson(initUrl);
  if (!init.ok) throw new Error(`Init failed: ${JSON.stringify(init)}`);

  const requestId = init.request_id;
  console.log(`  request_id: ${requestId}`);

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_DELAY));
    const data = await fetchJson(`${API}/check-result/${requestId}`);
    const allDone = NODES.every(n => data[n] !== null && data[n] !== undefined);
    if (allDone) {
      console.log(`  All nodes done after ${i + 1} poll(s)`);
      return data;
    }
    const pending = NODES.filter(n => data[n] === null || data[n] === undefined).length;
    console.log(`  Poll ${i + 1}: ${pending} pending`);
  }

  console.log(`  Returning partial results after max polls`);
  return await fetchJson(`${API}/check-result/${requestId}`);
}

(async () => {
  const results = {};

  for (let i = 0; i < SERVERS.length; i++) {
    const server = SERVERS[i];
    if (i > 0) {
      console.log('Waiting 8s before next server to avoid rate limit...');
      await new Promise(r => setTimeout(r, 8000));
    }
    try {
      const data = await checkServer(server);
      results[server.id] = {
        timestamp: new Date().toISOString(),
        host: `${server.ip}:${server.port}`,
        label: server.label,
        data: data,
        error: null,
      };
      console.log(`Done: ${server.label}`);
    } catch (err) {
      console.error(`Failed: ${server.label} — ${err.message}`);
      results[server.id] = {
        timestamp: new Date().toISOString(),
        host: `${server.ip}:${server.port}`,
        label: server.label,
        data: null,
        error: err.message,
      };
    }
  }

  require('fs').mkdirSync('results', { recursive: true });
  require('fs').writeFileSync('results/results.json', JSON.stringify(results, null, 2));
  console.log('Saved results/results.json');
})();
