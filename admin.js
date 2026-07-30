/* ============================================================
   SpeakFlow AI – admin.js
   Full Admin Dashboard Logic
   ============================================================ */
'use strict';

/* ── Auth Guard ─────────────────────────────────────────────── */
const session = JSON.parse(localStorage.getItem('sf_session') || 'null');
if (!session || !session.loggedIn || !session.isAdmin) {
  window.location.href = 'login.html';
}

/* ── Seed demo data if empty ───────────────────────────────── */
(function seedDemoData() {
  const users = JSON.parse(localStorage.getItem('sf_users') || '[]');
  if (users.length === 0) {
    const demoUsers = [
      { id: 'usr_001', name: 'Alice Johnson',  email: 'alice@example.com',  password: 'pass123', createdAt: daysAgo(30) },
      { id: 'usr_002', name: 'Bob Martinez',   email: 'bob@example.com',    password: 'pass123', createdAt: daysAgo(25) },
      { id: 'usr_003', name: 'Carol Williams', email: 'carol@example.com',  password: 'pass123', createdAt: daysAgo(18) },
      { id: 'usr_004', name: 'David Chen',     email: 'david@example.com',  password: 'pass123', createdAt: daysAgo(10) },
      { id: 'usr_005', name: 'Eva Brown',      email: 'eva@example.com',    password: 'pass123', createdAt: daysAgo(4)  },
    ];
    localStorage.setItem('sf_users', JSON.stringify(demoUsers));
  }

  const history = JSON.parse(localStorage.getItem('sf_analysis_history') || '[]');
  if (history.length === 0) {
    const files  = ['speech_sample.wav','recording_01.mp3','audio_test.wav','voice_clip.mp3','session_audio.wav'];
    const results= ['Normal','Stutter Detected','Normal','Normal','Stutter Detected'];
    const confs  = [92, 87, 95, 78, 83];
    const stored = JSON.parse(localStorage.getItem('sf_users') || '[]');
    const demo   = stored.length ? stored : [{ id:'usr_001', name:'Alice Johnson', email:'alice@example.com' }];
    const entries = [];
    for (let i = 0; i < 12; i++) {
      const u = demo[i % demo.length];
      entries.push({
        id: 'ana_' + Date.now() + i,
        userId:     u.id,
        userName:   u.name,
        userEmail:  u.email,
        fileName:   files[i % files.length],
        date:       daysAgo(Math.floor(Math.random() * 28)),
        result:     results[i % results.length],
        confidence: confs[i % confs.length] + Math.floor(Math.random() * 5),
      });
    }
    localStorage.setItem('sf_analysis_history', JSON.stringify(entries));
  }
})();

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/* ── DOM helpers ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const users    = () => JSON.parse(localStorage.getItem('sf_users') || '[]');
const analyses = () => JSON.parse(localStorage.getItem('sf_analysis_history') || '[]');

/* ── Clock ───────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  $('topbarTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

/* ── Sidebar Toggle ──────────────────────────────────────── */
$('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ── Logout ──────────────────────────────────────────────── */
$('adminLogout').addEventListener('click', () => {
  localStorage.removeItem('sf_session');
  window.location.href = 'login.html';
});

/* ── Tab Navigation ──────────────────────────────────────── */
const tabTitles = {
  dashboard: 'Dashboard Overview',
  users:     'User Management',
  analyses:  'Analysis History',
  charts:    'Analytics Charts',
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    $('tab-' + tab).classList.add('active');
    $('topbarTitle').textContent = tabTitles[tab];
    if (tab === 'charts') renderChartsTab();
    if (tab === 'users')  renderUsersTable(users());
    if (tab === 'analyses') renderAnalysesTable(analyses());
  });
});

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function renderDashboard() {
  const u = users();
  const a = analyses();
  const normal  = a.filter(x => x.result === 'Normal').length;
  const stutter = a.filter(x => x.result !== 'Normal').length;

  animateCount('sc-users',    u.length);
  animateCount('sc-analyses', a.length);
  animateCount('sc-normal',   normal);
  animateCount('sc-stutter',  stutter);

  renderDashPie(normal, stutter);
  renderDashBar(a);
}

function animateCount(id, target) {
  const el = $(id);
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

/* Dash Pie */
let dashPieInst = null;
function renderDashPie(normal, stutter) {
  const ctx = $('dashPieChart').getContext('2d');
  if (dashPieInst) dashPieInst.destroy();
  dashPieInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Normal', 'Stutter'],
      datasets: [{ data: [normal || 1, stutter || 0], backgroundColor: ['#10B981','#F59E0B'], borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 12 }, padding: 16 } } }
    }
  });
}

/* Dash Bar – last 7 days */
let dashBarInst = null;
function renderDashBar(a) {
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    days.push(label);
    const ds = d.toDateString();
    counts.push(a.filter(x => new Date(x.date).toDateString() === ds).length);
  }
  const ctx = $('dashBarChart').getContext('2d');
  if (dashBarInst) dashBarInst.destroy();
  dashBarInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{ label: 'Analyses', data: counts, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 8, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748B', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#64748B', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: true }
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   USERS TABLE
═══════════════════════════════════════════════════════════ */
function renderUsersTable(list) {
  const body  = $('usersBody');
  const empty = $('usersEmpty');
  const a     = analyses();
  body.innerHTML = '';
  $('userCount').textContent = list.length + ' user' + (list.length !== 1 ? 's' : '');

  if (!list.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.forEach((u, i) => {
    const userAna = a.filter(x => x.userEmail === u.email).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="color:var(--text-muted)">${i + 1}</span></td>
      <td><strong>${esc(u.name)}</strong></td>
      <td style="color:var(--text-muted)">${esc(u.email)}</td>
      <td style="color:var(--text-muted)">${new Date(u.createdAt).toLocaleDateString()}</td>
      <td><span class="badge badge-blue">${userAna}</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-tbl btn-view" data-id="${u.id}"><i class="fas fa-eye"></i> View</button>
        <button class="btn-tbl btn-delete" data-id="${u.id}"><i class="fas fa-trash"></i> Delete</button>
      </td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => openUserView(btn.dataset.id)));
  body.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteUser(btn.dataset.id)));
}

$('userSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderUsersTable(users().filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
});

function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  let u = users().filter(x => x.id !== id);
  localStorage.setItem('sf_users', JSON.stringify(u));
  // Also remove their analyses
  let a = analyses().filter(x => {
    const del = JSON.parse(localStorage.getItem('sf_users') || '[]');
    return x.userId !== id;
  });
  localStorage.setItem('sf_analysis_history', JSON.stringify(analyses().filter(x => x.userId !== id)));
  renderUsersTable(u);
  renderDashboard();
}

function openUserView(id) {
  const u  = users().find(x => x.id === id);
  if (!u) return;
  const a  = analyses().filter(x => x.userEmail === u.email);
  const nb = $('userViewBody');
  nb.innerHTML = `
    <div class="user-detail-row"><span><i class="fas fa-user" style="width:18px;text-align:center;"></i> Full Name</span><strong>${esc(u.name)}</strong></div>
    <div class="user-detail-row"><span><i class="fas fa-envelope" style="width:18px;text-align:center;"></i> Email</span><strong>${esc(u.email)}</strong></div>
    <div class="user-detail-row"><span><i class="fas fa-calendar" style="width:18px;text-align:center;"></i> Registered</span><strong>${new Date(u.createdAt).toLocaleString()}</strong></div>
    <div class="user-detail-row"><span><i class="fas fa-chart-bar" style="width:18px;text-align:center;"></i> Total Analyses</span><strong>${a.length}</strong></div>
    <div class="user-detail-row"><span><i class="fas fa-check-circle" style="width:18px;text-align:center;"></i> Normal Results</span><strong style="color:var(--green)">${a.filter(x=>x.result==='Normal').length}</strong></div>
    <div class="user-detail-row"><span><i class="fas fa-exclamation-triangle" style="width:18px;text-align:center;"></i> Stutter Results</span><strong style="color:var(--orange)">${a.filter(x=>x.result!=='Normal').length}</strong></div>
  `;
  $('userViewModal').style.display = 'flex';
}

$('userViewClose').addEventListener('click', () => { $('userViewModal').style.display = 'none'; });
$('userViewModal').addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });

/* ═══════════════════════════════════════════════════════════
   ANALYSES TABLE
═══════════════════════════════════════════════════════════ */
function renderAnalysesTable(list) {
  const body  = $('analysesBody');
  const empty = $('analysesEmpty');
  body.innerHTML = '';
  if (!list.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.forEach((a, i) => {
    const isNormal = a.result === 'Normal';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="color:var(--text-muted)">${i + 1}</span></td>
      <td><strong>${esc(a.userName || 'Unknown')}</strong></td>
      <td style="color:var(--text-muted);font-size:.83rem">${esc(a.fileName || 'N/A')}</td>
      <td style="color:var(--text-muted)">${new Date(a.date).toLocaleDateString()}</td>
      <td><span class="badge ${isNormal ? 'badge-green' : 'badge-orange'}"><i class="fas fa-${isNormal ? 'check-circle' : 'exclamation-triangle'}"></i> ${esc(a.result)}</span></td>
      <td><strong>${a.confidence || '--'}%</strong></td>
      <td><button class="btn-tbl btn-delete" data-id="${a.id}"><i class="fas fa-trash"></i> Delete</button></td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteAnalysis(btn.dataset.id)));
}

$('analysisSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderAnalysesTable(analyses().filter(a =>
    (a.userName || '').toLowerCase().includes(q) ||
    (a.fileName || '').toLowerCase().includes(q) ||
    (a.result   || '').toLowerCase().includes(q)
  ));
});

function deleteAnalysis(id) {
  if (!confirm('Delete this analysis record?')) return;
  const updated = analyses().filter(x => x.id !== id);
  localStorage.setItem('sf_analysis_history', JSON.stringify(updated));
  renderAnalysesTable(updated);
  renderDashboard();
}

/* ── Export CSV ──────────────────────────────────────────── */
$('exportCsvBtn').addEventListener('click', () => {
  const a = analyses();
  if (!a.length) { alert('No analysis data to export.'); return; }
  const header = ['#','User Name','User Email','File Name','Date','Result','Confidence'];
  const rows   = a.map((x, i) => [
    i + 1, `"${x.userName || ''}"`, `"${x.userEmail || ''}"`,
    `"${x.fileName || ''}"`, new Date(x.date).toLocaleString(),
    x.result, x.confidence + '%'
  ]);
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'speakflow_analyses.csv';
  link.click(); URL.revokeObjectURL(url);
});

/* ═══════════════════════════════════════════════════════════
   CHARTS TAB
═══════════════════════════════════════════════════════════ */
let chartsRendered = false;
let growthInst = null, pieInst = null, activityInst = null;

function renderChartsTab() {
  if (chartsRendered) { chartsRendered = false; } // always re-render fresh
  const a = analyses();
  const u = users();

  // 1. User Growth Line Chart
  const growthCtx = $('userGrowthChart').getContext('2d');
  if (growthInst) growthInst.destroy();

  const months = getLast6Months();
  const growthData = months.map(m => u.filter(x => {
    const d = new Date(x.createdAt);
    return d.getFullYear() === m.year && d.getMonth() === m.month;
  }).length);

  growthInst = new Chart(growthCtx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'New Users', data: growthData,
        borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true, tension: 0.4, pointBackgroundColor: '#3B82F6', pointRadius: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94A3B8' } } },
      scales: {
        x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#64748B', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: true }
      }
    }
  });

  // 2. Detection Pie
  const normal  = a.filter(x => x.result === 'Normal').length;
  const stutter = a.filter(x => x.result !== 'Normal').length;
  const pieCtx = $('detectionPieChart').getContext('2d');
  if (pieInst) pieInst.destroy();
  pieInst = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: ['Normal', 'Stutter Detected'],
      datasets: [{ data: [normal || 1, stutter || 0], backgroundColor: ['#10B981','#F59E0B'], borderWidth: 0, hoverOffset: 10 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 16 } } }
    }
  });

  // 3. Activity Bar – last 7 days
  const days = [];
  const dayCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString([], { weekday: 'short' }));
    dayCounts.push(a.filter(x => new Date(x.date).toDateString() === d.toDateString()).length);
  }
  const actCtx = $('activityChart').getContext('2d');
  if (activityInst) activityInst.destroy();
  activityInst = new Chart(actCtx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        { label: 'Analyses', data: dayCounts, backgroundColor: 'rgba(20,184,166,0.75)', borderRadius: 8, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94A3B8' } } },
      scales: {
        x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#64748B', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: true }
      }
    }
  });

  // 4. System Stats
  const avg = a.length ? Math.round(a.reduce((s, x) => s + (x.confidence || 0), 0) / a.length) : 0;
  const sysGrid = $('sysStatsGrid');
  sysGrid.innerHTML = `
    <div class="sys-stat-item"><div class="sys-stat-val" style="color:var(--blue-light)">${u.length}</div><div class="sys-stat-lbl">Registered Users</div></div>
    <div class="sys-stat-item"><div class="sys-stat-val" style="color:var(--teal)">${a.length}</div><div class="sys-stat-lbl">Total Analyses</div></div>
    <div class="sys-stat-item"><div class="sys-stat-val" style="color:var(--green)">${avg}%</div><div class="sys-stat-lbl">Avg Confidence</div></div>
    <div class="sys-stat-item"><div class="sys-stat-val" style="color:var(--orange)">${stutter}</div><div class="sys-stat-lbl">Stutter Detections</div></div>
  `;

  chartsRendered = true;
}

function getLast6Months() {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    result.push({
      year: d.getFullYear(), month: d.getMonth(),
      label: d.toLocaleDateString([], { month: 'short', year: '2-digit' })
    });
  }
  return result;
}

/* ── Escape HTML ─────────────────────────────────────────── */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Init ────────────────────────────────────────────────── */
renderDashboard();
renderUsersTable(users());
renderAnalysesTable(analyses());
