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
    let ruAvail = 0, ruTotal = 0;
    let nonRuAvail = 0, nonRuTotal = 0;

    if (!data) return { ruAvail, ruTotal, nonRuAvail, nonRuTotal, totalOk: 0, totalAll: 0 };

    CONFIG.checkNodes.forEach(n => {
      const r = data[n.id];
      if (r !== undefined && r !== null) {
        if (n.code === 'RU') ruTotal++;
        else nonRuTotal++;
        if (nodeAvailable(r)) {
          if (n.code === 'RU') ruAvail++;
          else nonRuAvail++;
        }
      }
    });

    return {
      ruAvail, ruTotal, nonRuAvail, nonRuTotal,
      totalOk: ruAvail + nonRuAvail,
      totalAll: ruTotal + nonRuTotal,
    };
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
        if (stats.ruTotal > 0 && stats.nonRuTotal > 0 && stats.ruAvail === 0 && stats.nonRuAvail >= stats.nonRuTotal * 0.5) {
          anyRkn = true; allGood = false;
        }
        if (stats.totalOk <= stats.totalAll * 0.3) {
          anyDown = true; allGood = false;
        }
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
        <div class="card-ip">${server.ip}:${server.port}</div>
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
    const cardsEl = document.getElementById('server-cards');
    cardsEl.innerHTML = allResults.map(r => renderServerCard(r.server, r.entry)).join('');

    const verdictEl = document.getElementById('verdict');
    const { anyRkn, allGood, anyDown, noData } = globalVerdict(allResults);

    if (noData) {
      verdictEl.className = 'verdict empty';
      verdictEl.textContent = 'Нет данных проверки. Ожидание первого запуска...';
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
      verdictEl.textContent = 'Частичная доступность.';
    }
  }

  function renderTopology(allResults) {
    const el = document.getElementById('topology');
    if (!el) return;

    const byId = {};
    allResults.forEach(r => { byId[r.server.id] = r; });

    function nodeSummary(serverId) {
      const r = byId[serverId];
      if (!r || !r.nodeData) {
        const s = CONFIG.servers.find(s => s.id === serverId);
        return { totalOk: 0, totalAll: 0, cls: 'checking' };
      }
      const stats = countStats(r.nodeData);
      let cls = 'checking';
      if (stats.totalAll > 0) {
        if (stats.totalOk >= stats.totalAll * 0.9) cls = 'available';
        else if (stats.totalOk <= stats.totalAll * 0.3) cls = 'unavailable';
      }
      return { totalOk: stats.totalOk, totalAll: stats.totalAll, cls };
    }

    const internetNote = CONFIG.checkNodes.length;

    function nodeDot(cls) {
      if (cls === 'available') return '<span class="tdot d-ok"></span>';
      if (cls === 'unavailable') return '<span class="tdot d-no"></span>';
      return '<span class="tdot d-wait"></span>';
    }

    const fi = nodeSummary('fi-server');
    const ru = nodeSummary('ru-server');

    el.innerHTML = `
      <div class="tbox tbox-inet">
        <div class="tbox-icon">🌐</div>
        <div class="tbox-label">Интернет</div>
        <div class="tbox-sub">${internetNote} стран</div>
      </div>
      <div class="tarrow ${fi.cls === 'available' ? 'tarrow-ok' : 'tarrow-warn'}">
        <span class="tarr-line"></span>
        <span class="tarr-head"></span>
      </div>
      <div class="tbox tbox-server ${fi.cls}">
        <div class="tbox-icon">🇫🇮</div>
        <div class="tbox-label">Finland VPS</div>
        <div class="tbox-sub">91.211.114.182</div>
        <div class="tbox-stat">${nodeDot(fi.cls)} ${fi.totalOk}/${fi.totalAll}</div>
      </div>
      <div class="tarrow ${ru.cls === 'available' ? 'tarrow-ok' : 'tarrow-warn'}">
        <span class="tarr-line"></span>
        <span class="tarr-head"></span>
      </div>
      <div class="tbox tbox-server ${ru.cls}">
        <div class="tbox-icon">🇷🇺</div>
        <div class="tbox-label">Russia VPS</div>
        <div class="tbox-sub">185.228.235.125</div>
        <div class="tbox-stat">${nodeDot(ru.cls)} ${ru.totalOk}/${ru.totalAll}</div>
      </div>
    `;

    const tvEl = document.getElementById('topology-verdict');
    if (tvEl) {
      if (fi.cls === 'available' && ru.cls === 'available') {
        tvEl.className = 'topology-verdict tv-ok';
        tvEl.textContent = 'Каскад работает: оба сервера доступны';
      } else if (fi.cls === 'available' && ru.cls === 'unavailable') {
        tvEl.className = 'topology-verdict tv-warn';
        tvEl.textContent = 'Finland VPS доступен, Russia VPS недоступен — вероятно, упал';
      } else if (fi.cls === 'unavailable' && ru.cls === 'unavailable') {
        tvEl.className = 'topology-verdict tv-down';
        tvEl.textContent = 'Оба сервера недоступны — проверьте питание/сеть';
      } else if (fi.cls === 'unavailable' && ru.cls === 'available') {
        tvEl.className = 'topology-verdict tv-warn';
        tvEl.textContent = 'Finland VPS недоступен, Russia VPS доступен';
      } else {
        tvEl.className = 'topology-verdict';
        tvEl.textContent = 'Ожидание результатов проверки...';
      }
    }
  }

  function showError(msg) {
    const banner = document.getElementById('error-banner');
    banner.textContent = msg;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 8000);
  }

  return {
    formatTime, countStats, serverVerdict, globalVerdict,
    renderAll, renderTopology, showError,
    nodeAvailable
  };
})();
