function showTab(name) {
  document.querySelectorAll('main section').forEach(s => s.hidden = true);
  document.getElementById('tab-' + name).hidden = false;
  loadTab(name);
}

async function loadTab(name) {
  if (name === 'tasks') {
    const tasks = await fetch('/api/tasks').then(r => r.json());
    document.getElementById('tab-tasks').innerHTML =
      '<table><tr><th>ID</th><th>Goal</th><th>Status</th><th>Created</th></tr>' +
      tasks.map(t => `<tr><td>${t.id}</td><td>${t.goal}</td><td>${t.status}</td><td>${t.created_at}</td></tr>`).join('') +
      '</table>';
  } else if (name === 'workers') {
    const workers = await fetch('/api/workers').then(r => r.json());
    document.getElementById('tab-workers').innerHTML =
      '<table><tr><th>ID</th><th>Task</th><th>Type</th><th>Status</th><th>Last Output</th></tr>' +
      workers.map(w => `<tr><td>${w.id}</td><td>${w.task_id}</td><td>${w.type}</td><td>${w.status}</td><td>${(w.last_output || '').slice(0, 80)}</td></tr>`).join('') +
      '</table>';
  } else if (name === 'guardrails') {
    const gr = await fetch('/api/guardrails').then(r => r.json());
    document.getElementById('tab-guardrails').innerHTML =
      '<table><tr><th>Rule</th><th>Scope</th><th>Created by</th><th>Actions</th></tr>' +
      gr.map(g => `<tr><td>${g.rule}</td><td>${g.scope}</td><td>${g.created_by}</td><td><button onclick="deactivate(${g.id})">Deactivate</button></td></tr>`).join('') +
      '</table>';
  } else if (name === 'memory') {
    const mem = await fetch('/api/memory/global').then(r => r.json());
    document.getElementById('tab-memory').innerHTML =
      '<h3>Global Memory</h3><table><tr><th>Pattern</th><th>Confidence</th><th>Pending?</th><th>Actions</th></tr>' +
      mem.map(m => `<tr><td>${m.pattern}</td><td>${m.confidence.toFixed(2)}</td><td>${m.pending_classification ? 'Yes' : 'No'}</td><td>${m.pending_classification ? `<button onclick="confirmMemory(${m.id})">Confirm</button>` : ''}</td></tr>`).join('') +
      '</table>';
  } else if (name === 'judgment-calls') {
    const jc = await fetch('/api/judgment-calls?unreviewed=true').then(r => r.json());
    document.getElementById('tab-judgment-calls').innerHTML =
      '<table><tr><th>Decision</th><th>Source</th><th>Outcome</th><th>Actions</th></tr>' +
      jc.map(j => `<tr><td>${j.decision}</td><td>${j.source}</td><td>${j.outcome}</td><td><button onclick="reviewJc(${j.id})">Mark Reviewed</button></td></tr>`).join('') +
      '</table>';
  } else if (name === 'logs') {
    const evtSource = new EventSource('/api/logs/stream');
    evtSource.onmessage = e => {
      const lines = JSON.parse(e.data);
      document.getElementById('log-output').textContent = lines.join('\n');
    };
  }
}

async function deactivate(id) {
  await fetch('/api/guardrails/' + id + '/deactivate', { method: 'PUT' });
  loadTab('guardrails');
}

async function confirmMemory(id) {
  await fetch('/api/memory/global/' + id + '/confirm', { method: 'POST' });
  loadTab('memory');
}

async function reviewJc(id) {
  await fetch('/api/judgment-calls/' + id + '/review', { method: 'PUT' });
  loadTab('judgment-calls');
}

showTab('tasks');
