const Render = (() => {
  function formatTime(iso) {
    if (!iso) return 'никогда';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function nodeStatus(result) {
    if (!result || !Array.isArray(result) || result.length === 0) return { cls: 'checking', text: '...' };
    const first = result[0];
    if (first && typeof first.time === 'number') return { cls: 'available', text: 'доступен' };
    if (first && first.error) return { cls: 'unavailable', text: 'нет' };
    return { cls: 'checking', text: '...' };
  }

  function nodeAvailable(result) {
    if (!result || !Array.isArray(result) || result.length === 0) return null;
    const first = result[0];
    if (first && typeof first.time === 'number') return true;
    if (first && first.error) return false;
    return null;
  }

  function countStats(data) {
    let ruAvail = 0, ruTotal = 0, nonRuAvail = 0, nonRuTotal = 0;
    if (!data) return { ruAvail, ruTotal, nonRuAvail, nonRuTotal, totalOk: 0, totalAll: 0 };
    CONFIG.checkNodes.forEach(n => {
      const r = data[n.id];
      if (r !== undefined && r !== null) {
        if (n.code === 'RU') ruTotal++; else nonRuTotal++;
        if (nodeAvailable(r)) { if (n.code === 'RU') ruAvail++; else nonRuAvail++; }
      }
    });
    return { ruAvail, ruTotal, nonRuAvail, nonRuTotal, totalOk: ruAvail + nonRuAvail, totalAll: ruTotal + nonRuTotal };
  }

  function serverVerdict(stats) {
    if (stats.totalAll === 0) return { cls: '', text: 'нет данных' };
    if (stats.ruTotal > 0 && stats.nonRuTotal > 0 && stats.ruAvail === 0 && stats.nonRuAvail >= stats.nonRuTotal * 0.5) {
      return { cls: 'warn-rkn', text: 'Вероятна блокировка РКН' };
    }
    if (stats.totalOk >= stats.totalAll * 0.9) return { cls: 'good', text: 'Доступен' };
    if (stats.totalOk <= stats.totalAll * 0.3) return { cls: 'warn', text: 'Недоступен' };
    return { cls: '', text: 'Частично доступен' };
  }

  function globalVerdict(allResults) {
    let anyRkn = false, allGood = true, anyDown = false, noData = true;
    allResults.forEach(({ nodeData }) => {
      const stats = countStats(nodeData);
      if (stats.totalAll > 0) {
        noData = false;
        if (stats.ruTotal > 0 && stats.nonRuTotal > 0 && stats.ruAvail === 0 && stats.nonRuAvail >= stats.nonRuTotal * 0.5) { anyRkn = true; allGood = false; }
        if (stats.totalOk <= stats.totalAll * 0.3) { anyDown = true; allGood = false; }
        if (stats.totalOk < stats.totalAll * 0.9) allGood = false;
      }
    });
    return { anyRkn, allGood, anyDown, noData };
  }

  function renderNodeBadge(node, result) {
    const { cls, text } = nodeStatus(result);
    return `<div class="node-badge ${cls}"><span class="node-code">${node.code}</span><span class="node-status">${text}</span></div>`;
  }

  function renderServerCard(server, entry) {
    const nodeData = (entry && entry.data) ? entry.data : null;
    const timestamp = entry ? entry.timestamp : null;
    const error = entry ? entry.error : null;
    const stats = countStats(nodeData);
    const verdict = serverVerdict(stats);
    return `<div class="card" id="card-${server.id}">
      <div class="card-header">
        <h3>${server.label}</h3>
        <div class="card-ip">порт ${server.port}</div>
      </div>
      <div class="card-nodes">
        ${CONFIG.checkNodes.map(n => renderNodeBadge(n, nodeData ? nodeData[n.id] : undefined)).join('')}
      </div>
      <div class="card-footer">
        <span class="card-time">Проверено: ${formatTime(timestamp)}</span>
        <span class="card-server-verdict ${verdict.cls}">${error ? 'Ошибка: ' + error : verdict.text}</span>
      </div>
    </div>`;
  }

  function renderAll(allResults) {
    document.getElementById('server-cards').innerHTML = allResults.map(r => renderServerCard(r.server, r.entry)).join('');
    const el = document.getElementById('verdict');
    const { anyRkn, allGood, anyDown, noData } = globalVerdict(allResults);
    if (noData) {
      el.className = 'verdict empty';
      el.textContent = 'Нет данных. Нажмите «Проверить».';
    } else if (anyRkn) {
      el.className = 'verdict rkn-block';
      el.textContent = 'Внимание: вероятная блокировка РКН — сервер недоступен из России, но доступен из других стран';
    } else if (anyDown) {
      el.className = 'verdict server-down';
      el.textContent = 'Сервер недоступен из большинства стран — вероятно, не работает';
    } else if (allGood) {
      el.className = 'verdict all-good';
      el.textContent = 'Все серверы доступны из всех стран. Блокировка не обнаружена.';
    } else {
      el.className = 'verdict partial';
      el.textContent = 'Частичная доступность.';
    }
  }

  function showError(msg) {
    const b = document.getElementById('error-banner');
    b.textContent = msg;
    b.classList.remove('hidden');
    setTimeout(() => b.classList.add('hidden'), 8000);
  }

  function setLoading(on, text) {
    const btn = document.getElementById('check-btn');
    if (on) {
      btn.disabled = true;
      btn.innerHTML = text || '<span class="spinner"></span> Проверка...';
    } else {
      btn.disabled = false;
      btn.textContent = 'Проверить';
    }
  }

  function setStatus(text) {
    document.getElementById('check-status').textContent = text;
  }

  function setCooldown(on, seconds) {
    const btn = document.getElementById('check-btn');
    if (on) {
      btn.disabled = true;
      btn.textContent = 'Подождите ' + seconds + ' сек...';
    } else {
      btn.disabled = false;
      btn.textContent = 'Проверить';
    }
  }

  return { formatTime, renderAll, showError, setLoading, setStatus, setCooldown };
})();
