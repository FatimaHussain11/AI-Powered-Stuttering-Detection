/* ============================================================
   SpeakFlow AI – script.js
   Complete frontend logic for speech stuttering detection
   ============================================================ */
// Auto-detect the backend URL so this works both locally and when deployed
// (e.g. Hugging Face Spaces). Locally it still points at the Flask dev
// server on 127.0.0.1:5000, exactly like before. Everywhere else, it calls
// the same origin the page was loaded from (no hardcoded localhost).
const API_BASE = (['localhost', '127.0.0.1'].includes(window.location.hostname))
  ? "http://127.0.0.1:5000"
  : window.location.origin; // Flask backend
'use strict';

/* ─── GLOBAL STATE ─────────────────────────────────────────── */
let currentFile    = null;   // Uploaded File object
let currentResult  = null;   // Last analysis result object
let mediaRecorder  = null;   // MediaRecorder instance
let recordedChunks = [];     // Collected audio chunks
let recordingTimer = null;   // Interval for timer
let recordingSeconds = 0;    // Seconds elapsed
let recBlob        = null;   // Blob from recorded audio
let liveWaveformAnim = null; // rAF handle for live waveform
let heroWaveformAnim = null; // rAF handle for hero waveform
let pieChartInst   = null;
let barChartInst   = null;
let gaugeChartInst = null;
let qualityChartInst = null;

/* ─── DOM HELPERS ──────────────────────────────────────────── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ─── DARK MODE ─────────────────────────────────────────────── */
(function initDarkMode() {
  const saved = localStorage.getItem('speakflow-theme') || 'light';
  setTheme(saved);
})();

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = $('#darkModeIcon');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('speakflow-theme', theme);
}

const darkToggle = $('#darkModeToggle');
if (darkToggle) {
  darkToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

/* ─── MOBILE MENU ───────────────────────────────────────────── */
$('#hamburger').addEventListener('click', () => {
  $('#navLinks').classList.toggle('open');
});
// Close menu on link click
$$('#navLinks a').forEach(a => a.addEventListener('click', () => {
  $('#navLinks').classList.remove('open');
}));

/* ─── NAVBAR SCROLL ─────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const navbar = $('#navbar');
  if (window.scrollY > 40) {
    navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)';
  } else {
    navbar.style.boxShadow = 'none';
  }
  // Show/hide scroll-to-top button
  const scrollBtn = $('#scrollTop');
  if (window.scrollY > 400) {
    scrollBtn.classList.add('visible');
  } else {
    scrollBtn.classList.remove('visible');
  }
});

$('#scrollTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── FLOATING PARTICLES ────────────────────────────────────── */
(function createParticles() {
  const container = $('#particles');
  const count = 28;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    const left = Math.random() * 100;
    const delay = Math.random() * 15;
    const duration = Math.random() * 20 + 15;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      bottom: -${size}px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      opacity: ${Math.random() * 0.5 + 0.1};
    `;
    container.appendChild(p);
  }
})();

/* ─── HERO WAVEFORM ANIMATION ───────────────────────────────── */
(function initHeroWaveform() {
  const canvas = $('#heroWaveform');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59,130,246,0.8)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x++) {
      const freq1 = Math.sin((x / W) * Math.PI * 6 + t);
      const freq2 = Math.sin((x / W) * Math.PI * 12 + t * 1.5) * 0.4;
      const y = H / 2 + (freq1 + freq2) * (H / 2 - 8);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary wave
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(20,184,166,0.5)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < W; x++) {
      const freq1 = Math.sin((x / W) * Math.PI * 8 + t * 1.2);
      const y = H / 2 + freq1 * (H / 2 - 12);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    t += 0.04;
    heroWaveformAnim = requestAnimationFrame(draw);
  }
  draw();
})();

/* ─── FILE UPLOAD ────────────────────────────────────────────── */
const dropZone  = $('#dropZone');
const fileInput = $('#fileInput');
const browseBtn = $('#browseBtn');

browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Drag & Drop events
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

/**
 * Validate and display file preview.
 */
function handleFile(file) {
  const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/wave'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(file.type) && !['wav','mp3'].includes(ext)) {
    showToast('❌ Invalid file type. Please upload WAV or MP3.', 'error');
    return;
  }

  currentFile = file;
  const url = URL.createObjectURL(file);
  const player = $('#audioPlayer');
  player.src = url;

  // File name & size
  $('#fileName').textContent = file.name;
  $('#fileSize').textContent = formatBytes(file.size);

  // Get duration
  const tempAudio = new Audio(url);
  tempAudio.onloadedmetadata = () => {
    $('#fileDuration').textContent = formatDuration(tempAudio.duration);
  };

  dropZone.style.display = 'none';
  $('#filePreview').style.display = 'flex';
  $('#filePreview').style.flexDirection = 'column';

  showToast('✅ Audio file loaded successfully!', 'success');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Clear file
$('#clearFileBtn').addEventListener('click', clearFile);
$('#clearBtn').addEventListener('click', clearFile);

function clearFile() {
  currentFile = null;
  fileInput.value = '';
  $('#audioPlayer').src = '';
  $('#filePreview').style.display = 'none';
  dropZone.style.display = 'block';
}

/* ─── ANALYZE BUTTON ─────────────────────────────────────────── */
$('#analyzeBtn').addEventListener('click', () => {
  if (!currentFile) { showToast('Please upload an audio file first.', 'error'); return; }
  startAnalysis(currentFile.name);
});

/* ─── LIVE RECORDER ──────────────────────────────────────────── */
const startRecBtn   = $('#startRecBtn');
const stopRecBtn    = $('#stopRecBtn');
const playRecBtn    = $('#playRecBtn');
const deleteRecBtn  = $('#deleteRecBtn');
const analyzeRecBtn = $('#analyzeRecBtn');
const timerDisplay  = $('#timerDisplay');
const recIndicator  = $('#recIndicator');
const recPlayer     = $('#recPlayer');
const liveCanvas    = $('#liveWaveform');
const liveCtx       = liveCanvas.getContext('2d');

let audioCtx, analyserNode, sourceNode, liveStream;

startRecBtn.addEventListener('click', async () => {
  try {
    liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showToast('Microphone access denied. Please allow microphone permission.', 'error');
    return;
  }

  // Audio analyser for live waveform
  audioCtx    = new (window.AudioContext || window.webkitAudioContext)();
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 256;
  sourceNode  = audioCtx.createMediaStreamSource(liveStream);
  sourceNode.connect(analyserNode);
  drawLiveWaveform();

  recordedChunks = [];
  mediaRecorder  = new MediaRecorder(liveStream);
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    recBlob = new Blob(recordedChunks, { type: 'audio/webm' });
    recPlayer.src = URL.createObjectURL(recBlob);
    playRecBtn.disabled   = false;
    deleteRecBtn.disabled = false;
    analyzeRecBtn.disabled = false;
    analyzeRecBtn.style.display = 'inline-flex';
    stopLiveWaveform();
    audioCtx.close();
    liveStream.getTracks().forEach(t => t.stop());
  };
  mediaRecorder.start();

  // Timer
  recordingSeconds = 0;
  timerDisplay.textContent = '00:00';
  recordingTimer = setInterval(() => {
    recordingSeconds++;
    const m = Math.floor(recordingSeconds / 60);
    const s = recordingSeconds % 60;
    timerDisplay.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }, 1000);

  recIndicator.classList.add('recording');
  startRecBtn.disabled = true;
  stopRecBtn.disabled  = false;
  playRecBtn.disabled  = true;
  deleteRecBtn.disabled = true;
});

stopRecBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  clearInterval(recordingTimer);
  recIndicator.classList.remove('recording');
  startRecBtn.disabled = false;
  stopRecBtn.disabled  = true;
});

playRecBtn.addEventListener('click', () => { recPlayer.play(); });

deleteRecBtn.addEventListener('click', () => {
  recBlob = null;
  recPlayer.src = '';
  recordingSeconds = 0;
  timerDisplay.textContent = '00:00';
  playRecBtn.disabled   = true;
  deleteRecBtn.disabled = true;
  analyzeRecBtn.disabled = true;
  analyzeRecBtn.style.display = 'none';
  clearLiveWaveform();
  showToast('Recording deleted.', 'info');
});

analyzeRecBtn.addEventListener('click', () => {
  if (!recBlob) return;
  startAnalysis('live-recording.webm');
});

/* Live waveform drawing */
function drawLiveWaveform() {
  const W = liveCanvas.width;
  const H = liveCanvas.height;
  const bufferLen = analyserNode.frequencyBinCount;
  const dataArr   = new Uint8Array(bufferLen);

  function render() {
    liveWaveformAnim = requestAnimationFrame(render);
    analyserNode.getByteTimeDomainData(dataArr);

    liveCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#fff';
    liveCtx.fillRect(0, 0, W, H);
    liveCtx.lineWidth   = 2;
    liveCtx.strokeStyle = '#2563EB';
    liveCtx.beginPath();
    const sliceW = W / bufferLen;
    let x = 0;
    for (let i = 0; i < bufferLen; i++) {
      const v = dataArr[i] / 128.0;
      const y = v * H / 2;
      i === 0 ? liveCtx.moveTo(x, y) : liveCtx.lineTo(x, y);
      x += sliceW;
    }
    liveCtx.lineTo(W, H / 2);
    liveCtx.stroke();
  }
  render();
}

function stopLiveWaveform() {
  if (liveWaveformAnim) cancelAnimationFrame(liveWaveformAnim);
}

function clearLiveWaveform() {
  liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
}

/* ─── ANALYSIS SIMULATION ────────────────────────────────────── */
/**
 * Simulates the AI processing pipeline.
 * In production this would POST to /api/predict and receive real results.
 */
function startAnalysis(fileName) {
  if (!currentFile && !recBlob) return;

  const fileToSend = currentFile || recBlob;
  sendToBackend(fileToSend, fileName);
}

/**
 * Generate a simulated AI result and render the dashboard.
 */
function generateResult(fileName) {
  // Randomize result for demo purposes
  const isNormal      = Math.random() > 0.45;
  const confidence    = (Math.random() * 20 + 78).toFixed(1);  // 78–98%
  const fluency       = isNormal
    ? (Math.random() * 15 + 82).toFixed(1)
    : (Math.random() * 30 + 30).toFixed(1);
  const processingMs  = Math.floor(Math.random() * 600 + 800);
  const normalProb    = isNormal
    ? parseFloat(confidence)
    : (100 - parseFloat(confidence)).toFixed(1);
  const stutterProb   = (100 - parseFloat(normalProb)).toFixed(1);

  currentResult = {
    fileName,
    isNormal,
    confidence: parseFloat(confidence),
    fluency: parseFloat(fluency),
    processingMs,
    normalProb: parseFloat(normalProb),
    stutterProb: parseFloat(stutterProb),
    date: new Date().toLocaleString(),
  };

  renderResults(currentResult);
  saveToHistory(currentResult);
  renderHistory();

  // Scroll to results
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
  showToast('✅ Analysis complete!', 'success');
}

/* ─── RENDER RESULTS ─────────────────────────────────────────── */
function renderResults(r) {
  $('#resultsPlaceholder').style.display = 'none';
  const content = $('#resultsContent');
  content.style.display = 'flex';

  // Prediction card
  const card = $('#predictionCard');
  card.className = 'prediction-card ' + (r.isNormal ? 'normal' : 'stutter');
  $('#predIcon').textContent = r.isNormal ? '✅' : '⚠️';
  $('#predLabel').textContent = r.isNormal ? 'Normal Speech Detected' : 'Speech Stuttering Detected';
  $('#predLabel').style.color = r.isNormal ? 'var(--green)' : 'var(--red)';
  $('#predSublabel').textContent = r.isNormal
    ? 'Your speech shows normal fluency characteristics.'
    : 'Stuttering patterns were identified in your speech.';

  // Score cards
  $('#confidenceScore').textContent = r.confidence + '%';
  $('#fluencyScore').textContent    = r.fluency + '%';
  $('#processingTime').textContent  = r.processingMs + 'ms';
  $('#predProbability').textContent = (r.isNormal ? r.normalProb : r.stutterProb) + '%';

  // Charts
  renderPieChart(r);
  renderBarChart();
  renderGaugeChart(r);
  renderQualityChart(r);
  renderResultWaveform(r);
}

function renderPieChart(r) {
  if (pieChartInst) pieChartInst.destroy();
  const ctx = $('#pieChart').getContext('2d');
  pieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Normal', 'Stutter'],
      datasets: [{
        data: [r.normalProb, r.stutterProb],
        backgroundColor: ['rgba(16,185,129,0.80)', 'rgba(239,68,68,0.80)'],
        borderColor: ['#10B981', '#EF4444'],
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 14, font: { size: 12 } } },
        tooltip: { callbacks: { label: (i) => ` ${i.label}: ${i.raw}%` } }
      }
    }
  });
}

function renderBarChart() {
  if (barChartInst) barChartInst.destroy();
  const ctx = $('#barChart').getContext('2d');
  const features = ['MFCC 1','MFCC 2','MFCC 3','MFCC 4','MFCC 5','Energy','ZCR'];
  const values   = features.map(() => +(Math.random() * 0.6 + 0.2).toFixed(2));
  barChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: features,
      datasets: [{
        label: 'Importance',
        data: values,
        backgroundColor: 'rgba(37,99,235,0.75)',
        borderColor: '#2563EB',
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 1, ticks: { font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderGaugeChart(r) {
  if (gaugeChartInst) gaugeChartInst.destroy();
  const ctx = $('#gaugeChart').getContext('2d');
  const val = r.confidence;
  gaugeChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [val, 100 - val],
        backgroundColor: [
          val >= 85 ? 'rgba(16,185,129,0.80)' : val >= 70 ? 'rgba(245,158,11,0.80)' : 'rgba(239,68,68,0.80)',
          'rgba(226,232,240,0.40)'
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      }]
    },
    options: {
      responsive: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        afterDraw: (chart) => {
          const { ctx: c, chartArea: { left, right, bottom } } = chart;
          c.fillStyle = '#1E293B';
          c.font = 'bold 22px Space Grotesk, sans-serif';
          c.textAlign = 'center';
          c.fillText(val + '%', (left + right) / 2, bottom - 8);
        }
      }
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        const { ctx: c, chartArea: { left, right, bottom } } = chart;
        c.save();
        c.font = 'bold 20px Inter, sans-serif';
        c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#1E293B';
        c.textAlign = 'center';
        c.fillText(val + '%', (left + right) / 2, bottom - 10);
        c.restore();
      }
    }]
  });
}

function renderQualityChart(r) {
  if (qualityChartInst) qualityChartInst.destroy();
  const ctx = $('#qualityChart').getContext('2d');
  qualityChartInst = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Fluency', 'Clarity', 'Rhythm', 'Pace', 'Pitch'],
      datasets: [{
        label: 'Speech Quality',
        data: [
          r.fluency,
          +(Math.random() * 20 + 70).toFixed(1),
          +(Math.random() * 20 + 65).toFixed(1),
          +(Math.random() * 20 + 68).toFixed(1),
          +(Math.random() * 20 + 72).toFixed(1),
        ],
        backgroundColor: 'rgba(20,184,166,0.20)',
        borderColor: 'rgba(20,184,166,0.90)',
        borderWidth: 2,
        pointBackgroundColor: '#14B8A6',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, font: { size: 10 } }, pointLabels: { font: { size: 11 } } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderResultWaveform(r) {
  const canvas = $('#resultWaveform');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const color = r.isNormal ? '#10B981' : '#EF4444';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const base  = Math.sin((x / W) * Math.PI * 10) * 0.6;
    const noise = r.isNormal
      ? Math.sin((x / W) * Math.PI * 20) * 0.2
      : Math.sin((x / W) * Math.PI * 30) * 0.5 + (Math.random() - 0.5) * 0.4;
    const y = H / 2 + (base + noise) * (H / 2 - 6);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/* ─── LOCAL STORAGE HISTORY ──────────────────────────────────── */
function getHistory() {
  return JSON.parse(localStorage.getItem('sf_analysis_history') || '[]');
}

function saveToHistory(result) {
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    date: result.date,
    fileName: result.fileName,
    isNormal: result.isNormal,
    confidence: result.confidence,
  });
  // Keep max 50 records
  localStorage.setItem('sf_analysis_history', JSON.stringify(history.slice(0, 50)));
}

function deleteHistoryItem(id) {
  const history = getHistory().filter(item => item.id !== id);
  localStorage.setItem('sf_analysis_history', JSON.stringify(history));
  renderHistory();
}

function clearAllHistory() {
  localStorage.removeItem('sf_analysis_history');
  renderHistory();
}

/**
 * Render the history table, optionally filtered by a query string.
 */
function renderHistory(filter = '') {
  const tbody = $('#historyBody');
  const emptyEl = $('#historyEmpty');
  const history = getHistory();
  const filtered = filter
    ? history.filter(item =>
        item.fileName.toLowerCase().includes(filter.toLowerCase()) ||
        (item.isNormal ? 'normal' : 'stutter').includes(filter.toLowerCase())
      )
    : history;

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  filtered.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.date}</td>
      <td title="${item.fileName}">${item.fileName.length > 30 ? item.fileName.slice(0, 30) + '…' : item.fileName}</td>
      <td><span class="badge ${item.isNormal ? 'badge-normal' : 'badge-stutter'}">${item.isNormal ? 'Normal' : 'Stutter'}</span></td>
      <td>${item.confidence}%</td>
      <td><button class="delete-row-btn" data-id="${item.id}"><i class="fas fa-trash"></i> Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Bind delete buttons
  $$('.delete-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteHistoryItem(parseInt(btn.dataset.id));
    });
  });
}

// Search
$('#historySearch').addEventListener('input', e => renderHistory(e.target.value));

// Clear all
$('#clearAllBtn').addEventListener('click', () => {
  if (confirm('Clear all detection history? This cannot be undone.')) clearAllHistory();
});

// Render on load
renderHistory();

/* ─── NEW ANALYSIS & RESET ───────────────────────────────────── */
$('#newAnalysisBtn').addEventListener('click', () => {
  currentResult = null;
  currentFile   = null;
  clearFile();
  $('#resultsContent').style.display = 'none';
  $('#resultsPlaceholder').style.display = 'block';
  document.getElementById('analysis').scrollIntoView({ behavior: 'smooth' });
});

/* ─── PDF REPORT ─────────────────────────────────────────────── */
$('#downloadReportBtn').addEventListener('click', () => {
  if (!currentResult) { showToast('No result to export.', 'error'); return; }
  generatePDFReport(currentResult);
});

function generatePDFReport(r) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const blue   = [37, 99, 235];
  const teal   = [20, 184, 166];
  const dark   = [30, 41, 59];
  const gray   = [100, 116, 139];
  const light  = [241, 245, 249];
  const green  = [16, 185, 129];
  const red    = [239, 68, 68];
  const W = 210, H = 297;

  // Header background
  doc.setFillColor(...blue);
  doc.rect(0, 0, W, 50, 'F');

  // Logo / title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SpeakFlow AI', 16, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Speech Stuttering Detection System', 16, 32);
  doc.setFontSize(9);
  doc.text('The University of Faisalabad  ·  BS Software Engineering', 16, 41);

  // Report label
  doc.setFillColor(...teal);
  doc.roundedRect(W - 60, 16, 50, 16, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ANALYSIS REPORT', W - 35, 26, { align: 'center' });

  // Section: File Information
  let y = 62;
  sectionHeader(doc, 'File Information', 14, y, W, dark, light);
  y += 14;
  infoRow(doc, 'File Name',     r.fileName,    16, y, gray, dark); y += 9;
  infoRow(doc, 'Analysis Date', r.date,        16, y, gray, dark); y += 9;
  infoRow(doc, 'Processing',    r.processingMs + ' ms', 16, y, gray, dark); y += 16;

  // Section: Prediction Result
  sectionHeader(doc, 'Prediction Result', 14, y, W, dark, light);
  y += 14;

  const resColor = r.isNormal ? green : red;
  doc.setFillColor(...resColor);
  doc.roundedRect(16, y, W - 32, 22, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(r.isNormal ? '✓  Normal Speech Detected' : '✗  Speech Stuttering Detected', W / 2, y + 14, { align: 'center' });
  y += 32;

  // Section: Scores
  sectionHeader(doc, 'Analysis Scores', 14, y, W, dark, light);
  y += 16;

  const scores = [
    ['Confidence Score',     r.confidence + '%'],
    ['Speech Fluency Score', r.fluency + '%'],
    ['Prediction Probability', (r.isNormal ? r.normalProb : r.stutterProb) + '%'],
    ['Processing Time',      r.processingMs + ' ms'],
  ];

  const colW = (W - 32) / 2;
  scores.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx  = 16 + col * (colW + 4);
    const by  = y + row * 28;
    doc.setFillColor(...light);
    doc.roundedRect(bx, by, colW, 22, 4, 4, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(s[0].toUpperCase(), bx + 8, by + 9);
    doc.setTextColor(...blue);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(s[1], bx + 8, by + 18);
  });
  y += 70;

  // Section: Model Information
  sectionHeader(doc, 'Model Information', 14, y, W, dark, light);
  y += 14;
  infoRow(doc, 'Algorithm',       'Random Forest Classifier',       16, y, gray, dark); y += 9;
  infoRow(doc, 'Feature Extraction', 'MFCC (40 Coefficients) via Librosa', 16, y, gray, dark); y += 9;
  infoRow(doc, 'Dataset',         '8,000+ Labeled Audio Samples',  16, y, gray, dark); y += 9;
  infoRow(doc, 'Classes',         'Normal Speech / Stuttered Speech', 16, y, gray, dark); y += 16;

  // Disclaimer
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(16, y, W - 32, 18, 4, 4, 'F');
  doc.setTextColor(180, 100, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This report is generated by an AI system for educational/research purposes only. It does not constitute a medical diagnosis.', W / 2, y + 7, { align: 'center', maxWidth: W - 40 });
  doc.text('Consult a qualified speech-language pathologist for clinical evaluation.', W / 2, y + 13, { align: 'center' });
  y += 26;

  // Footer
  doc.setFillColor(...dark);
  doc.rect(0, H - 18, W, 18, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SpeakFlow AI  ·  The University of Faisalabad  ·  BS Software Engineering', W / 2, H - 7, { align: 'center' });

  doc.save(`SpeakFlow_Report_${Date.now()}.pdf`);
  showToast('📄 PDF report downloaded!', 'success');
}

function sectionHeader(doc, title, fontSize, y, W, dark, light) {
  doc.setFillColor(...light);
  doc.rect(0, y, W, 12, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(fontSize - 2);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 16, y + 8);
}

function infoRow(doc, label, value, x, y, gray, dark) {
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(label + ':', x, y);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 56, y);
}

/* ─── ANIMATED COUNTERS ─────────────────────────────────────── */
(function initCounters() {
  const statCards = $$('.stat-card');
  const observer  = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  statCards.forEach(card => observer.observe(card));
})();

function animateCounter(card) {
  const target = parseInt(card.dataset.count);
  const suffix = card.dataset.suffix || '';
  const el     = card.querySelector('.stat-number');
  const duration = 1800;
  const start    = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const current  = Math.round(ease * target);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ─── TOAST NOTIFICATIONS ────────────────────────────────────── */
function showToast(message, type = 'info') {
  // Remove existing toasts
  $$('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast';
  const colors = { success: '#10B981', error: '#EF4444', info: '#2563EB' };
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 24px;
    background: var(--surface);
    border: 1px solid ${colors[type] || colors.info};
    border-left: 4px solid ${colors[type] || colors.info};
    color: var(--text);
    padding: 14px 20px;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 99999;
    max-width: 320px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
  `;
  if (!document.getElementById('toastStyle')) {
    style.id = 'toastStyle';
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ─── SMOOTH SCROLL FOR ANCHOR LINKS ────────────────────────── */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80; // navbar height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ─── SCROLL REVEAL ─────────────────────────────────────────── */
(function initScrollReveal() {
  const elements = $$('.overview-card, .timeline-item, .stat-card, .score-card, .chart-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity  = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  elements.forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
    observer.observe(el);
  });
})();

/* ─── INIT ──────────────────────────────────────────────────── */
console.log('%cSpeakFlow AI Initialized ✓', 'color: #2563EB; font-weight: bold; font-size: 14px;');

/* ============================================================
   SpeakFlow AI – Analysis History Storage (Auth Integration)
   ============================================================ */
(function patchAnalysisStorage() {
  const observer = new MutationObserver(() => {
    const resultSection =
      document.getElementById('resultSection') ||
      document.querySelector('.result-section') ||
      document.querySelector('[id*="result"]');

    if (!resultSection) return;

    const innerObs = new MutationObserver(() => {
      saveAnalysisToHistory();
    });

    innerObs.observe(resultSection, {
      childList: true,
      subtree: true
    });

    observer.disconnect();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  function saveAnalysisToHistory() {
    try {
      const session = JSON.parse(localStorage.getItem('sf_session') || 'null');
      if (!session || !session.loggedIn) return;

      const resultEl = document.querySelector('.result-label, .detection-result, [class*="result"]');
      const confEl   = document.querySelector('.confidence-score, [class*="confidence"]');
      const fileEl   = document.querySelector('.file-name, [class*="filename"]');

      const resultText = resultEl ? resultEl.textContent.trim() : null;
      if (!resultText || resultText.length < 3) return;

      if (resultEl.dataset.saved === '1') return;
      resultEl.dataset.saved = '1';

      const history = JSON.parse(localStorage.getItem('sf_analysis_history') || '[]');

      history.push({
        id: 'ana_' + Date.now(),
        userId: session.id || '',
        userName: session.name || 'Unknown',
        userEmail: session.email || '',
        fileName: fileEl ? fileEl.textContent.trim() : ('recording_' + Date.now() + '.wav'),
        date: new Date().toISOString(),
        result: resultText.includes('Normal') ? 'Normal' : 'Stutter Detected',
        confidence: confEl ? parseInt(confEl.textContent) || 85 : 85,
      });

      localStorage.setItem('sf_analysis_history', JSON.stringify(history));
    } catch (err) {
      console.warn('SpeakFlow: could not save analysis to history', err);
    }
  }
})();

/* ============================================================
   BACKEND INTEGRATION
   ============================================================ */

async function sendToBackend(file, fileName = "audio.wav") {
  const overlay = $('#loadingOverlay');
  const bar = $('#progressBar');
  const pct = $('#progressPct');

  if (overlay) overlay.style.display = 'flex';
  if (bar) bar.style.width = '30%';
  if (pct) pct.textContent = '30%';

  try {
    const formData = new FormData();

    if (file instanceof Blob) {
      formData.append("file", file, fileName);
    } else {
      formData.append("file", file);
    }

    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Server error");

    if (bar) bar.style.width = '80%';
    if (pct) pct.textContent = '80%';

    const data = await res.json();

    const result = {
      fileName: fileName || currentFile?.name || "recording",
      date: new Date().toLocaleString(),
      isNormal: data.isNormal,
      confidence: data.confidence,
      fluency: data.fluency,
      processingMs: data.processingMs,
      normalProb: data.normalProb,
      stutterProb: data.stutterProb
    };

    currentResult = result;

    renderResults(result);
    saveToHistory(result);
    renderHistory();

    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100%';

    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 400);

    showToast("Analysis complete!", "success");

  } catch (err) {
    console.error(err);
    if (overlay) overlay.style.display = 'none';
    showToast("Flask backend not running or API error", "error");
  }
}