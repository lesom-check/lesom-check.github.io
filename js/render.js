const Render = (() => {
  function formatTime(date) {
    if (!date) return 'никогда';
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function formatTimeShort(iso) {
    if (!iso) return '—';
    return formatTime(iso);
  }

  function nodeStatusClass(result) {
    if (result === undefined || result === null) return 'checking';
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0];
      if (first && typeof first.time === 'number') return 'available';
      if (first && first.error) return 'unavailable';
    }
    return 'checking';
  }

  function nodeStatusText(result) {
    if (result === undefined || result === null) return '...';
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0];
      if (first && typeof first.time === 'number') return 'доступен';
      if (first && first.error) return 'нет';
    }
    return '...';
  }

  function nodeAvailable(result) {
    if (result === undefined || result === null) return false;
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0];
      return first && typeof first.time === 'number';
    }
    return false;
  }

  function countAvailable(nodesData) {
    let available = 0;
    let total = 0;
    CONFIG.checkNodes.forEach(n => {
      if (nodesData[n.id] !== undefined && nodesData[n.id] !== null) {
        total++;
        if (nodeAvailable(nodesData[n.id])) available++;
      }
    });
    return { available, total };
  }

  function countAvailableRussia(nodesData) {
    let available = 0;
    let total = 0;
    CONFIG.checkNodes.forEach(n => {
      if (n.code === 'RU' && nodesData[n.id] !== undefined && nodesData[n.id] !== null) {
        total++;
        if (nodeAvailable(nodesData[n.id])) available++;
      }
    });
    return { available, total };
  }

  function countAvailableNonRussia(nodesData) {
    let available = 0;
    let total = 0;
    CONFIG.checkNodes.forEach(n => {
      if (n.code !== 'RU' && nodesData[n.id] !== undefined && nodesData[n.id] !== null) {
        total++;
        if (nodeAvailable(nodesData[n.id])) available++;
      }
    });
    return { available, total };
  }

  function getServerVerdict(nodesData) {
    const ru = countAvailableRussia(nodesData);
    const nonRu = countAvailableNonRussia(nodesData);
    const all = countAvailable(nodesData);

    if (all.total === 0) return { cls: '', text: 'нет данных' };

    if (ru.total > 0 && nonRu.total > 0) {
      if (ru.available === 0 && nonRu.available >= nonRu.total * 0.5) {
        return { cls: 'warn-rkn', text: 'Вероятна блокировка РКН' };
      }
    }

    if (all.available >= all.total * 0.9) {
      return { cls: 'good', text: 'Доступен' };
    }

    if (all.available <= all.total * 0.3) {
      return { cls: 'warn', text: 'Недоступен' };
    }

    return { cls: '', text: 'Частично доступен' };
  }

  function getGlobalVerdict(serverResults) {
    let anyRkn = false;
    let allGood = true;
    let anyDown = false;

    serverResults.forEach(({ nodesData }) => {
      if (!nodesData) return;
      const ru = countAvailableRussia(nodesData);
      const nonRu = countAvailableNonRussia(nodesData);
      if (ru.total > 0 && nonRu.total > 0) {
        if (ru.available === 0 && nonRu.available >= nonRu.total * 0.5) {
          anyRkn = true;
          allGood = false;
        }
      }
      const ac = countAvailable(nodesData);
      if (ac.total > 0 && ac.available <= ac.total * 0.3) {
        anyDown = true;
        allGood = false;
      }
      if (ac.total > 0 && ac.available < ac.total * 0.9) {
        allGood = false;
      }
    });

    const noData = serverResults.every(sr => !sr.nodesData);

    return { anyRkn, allGood, anyDown, noData };
  }

  function renderNodeBadge(node, result) {
    const cls = nodeStatusClass(result);
    const text = nodeStatusText(result);
    return `
      <div class="node-badge ${cls}">
        <span class="node-code">${node.code}</span>
        <span class="node-status">${text}</span>
      </div>`;
  }

  function renderServerCard(server, nodesData, lastTime) {
    const verdict = getServerVerdict(nodesData || {});
    return `
      <div class="card" id="card-${server.id}">
        <div class="card-header">
          <h3>${server.label}</h3>
          <div class="card-ip">${server.ip}:${server.port}</div>
        </div>
        <div class="card-nodes">
          ${CONFIG.checkNodes.map(n => renderNodeBadge(n, nodesData ? nodesData[n.id] : undefined)).join('')}
        </div>
        <div class="card-footer">
          <span class="card-time">Проверено: ${formatTime(lastTime)}</span>
          <span class="card-server-verdict ${verdict.cls}">${verdict.text}</span>
        </div>
      </div>`;
  }

  function renderAll(serverResults) {
    const cardsEl = document.getElementById('server-cards');
    cardsEl.innerHTML = serverResults.map(sr =>
      renderServerCard(sr.server, sr.nodesData, sr.lastTime)
    ).join('');

    const verdictEl = document.getElementById('verdict');
    const { anyRkn, allGood, anyDown, noData } = getGlobalVerdict(serverResults);

    if (noData) {
      verdictEl.className = 'verdict empty';
      verdictEl.textContent = 'Нет данных проверки. Нажмите кнопку ниже.';
    } else if (anyRkn) {
      verdictEl.className = 'verdict rkn-block';
      verdictEl.textContent = 'Внимание: обнаружена вероятная блокировка РКН — сервер недоступен из России, но доступен из других стран';
    } else if (anyDown) {
      verdictEl.className = 'verdict server-down';
      verdictEl.textContent = 'Один из серверов недоступен из большинства стран — вероятно, сервер не работает';
    } else if (allGood) {
      verdictEl.className = 'verdict all-good';
      verdictEl.textContent = 'Все серверы доступны из всех проверенных стран. Блокировка не обнаружена.';
    } else {
      verdictEl.className = 'verdict partial';
      verdictEl.textContent = 'Частичная доступность. Рекомендуется повторить проверку.';
    }
  }

  function showError(msg) {
    const banner = document.getElementById('error-banner');
    banner.textContent = msg;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 6000);
  }

  function setLoading(loading) {
    const btn = document.getElementById('check-all-btn');
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Проверка...';
    } else {
      btn.disabled = false;
      btn.textContent = 'Проверить оба сервера';
    }
  }

  function setGlobalStatus(text) {
    document.getElementById('global-status').textContent = text;
  }

  return {
    formatTime, formatTimeShort, countAvailable, countAvailableRussia,
    countAvailableNonRussia, getServerVerdict, getGlobalVerdict,
    renderAll, showError, setLoading, setGlobalStatus,
    nodeAvailable
  };
})();
