// ==========================================================================
// I.G.R.I.S. ENTERPRISE APPLICATION CONTROLLER
// ==========================================================================

let currentLanguage = 'en';
let mapInstance = null;
let mapMarkers = [];
let allStatesData = [];
let allQualityData = [];
let allDepthData = [];
let chartInstances = {};

// Key hotspot locations across India with exact coordinates
const HOTSPOTS = [
  { name: 'Sangrur', district: 'Sangrur', state: 'Punjab', lat: 30.2458, lng: 75.8421, category: 'Over-Exploited', soe: 168.5, quality: 'Fluoride, Uranium', advice: 'Annual extraction is 168% of recharge! Avoid paddy crops. Mandatory 100% artificial recharge for industrial clearances.' },
  { name: 'Jaipur (Amber)', district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, category: 'Over-Exploited', soe: 154.2, quality: 'Nitrate, Salinity', advice: 'Severe groundwater stress. CGWA NOC required; compulsory rooftop rainwater harvesting and percolation shafts.' },
  { name: 'Jodhpur (Mandore)', district: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, category: 'Over-Exploited', soe: 142.1, quality: 'Fluoride, Salinity', advice: 'Arid climate aquifer. Rely on IGNP canal conjunctive usage and decentralized farm ponds.' },
  { name: 'Kurukshetra (Thanesar)', district: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, category: 'Over-Exploited', soe: 139.8, quality: 'Iron, Nitrate', advice: 'Tubewell density high. Adopt DSR (Direct Seeded Rice) and micro-sprinkler systems.' },
  { name: 'Chennai Central', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, category: 'Critical', soe: 98.4, quality: 'Salinity (Sea Intrusion)', advice: 'Coastal aquifer over-drafting risks saline ingress. Strict mandate for storm water recharge sumps.' },
  { name: 'Bengaluru Urban', district: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, category: 'Over-Exploited', soe: 141.2, quality: 'Nitrate, Heavy Metals', advice: 'Hard rock granite aquifer. Desilt lake cascade systems to recharge shallow weathered zones.' },
  { name: 'Ahmedabad (Daskroi)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, category: 'Semi-Critical', soe: 86.4, quality: 'Salinity, Fluoride', advice: 'Alluvial deep aquifer. SAUNI Yojana pipeline recharge check dams deployed.' },
  { name: 'Pune (Haveli)', district: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, category: 'Safe', soe: 54.8, quality: 'Normal', advice: 'Deccan basalt basaltic aquifers. Permissible for domestic tubewells.' },
  { name: 'Nagpur (Rural)', district: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, category: 'Safe', soe: 62.1, quality: 'Normal', advice: 'Central India basaltic plateau. Sustainable recharge.' },
  { name: 'Patna Sadar', district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, category: 'Safe', soe: 48.6, quality: 'Arsenic (>0.01 mg/L)', advice: 'Gangetic alluvium. Safe quantity, but test deep wells for Arsenic contamination.' },
  { name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, category: 'Semi-Critical', soe: 76.2, quality: 'Normal', advice: 'High urban abstraction. Implement percolation wells along ghat catchment.' },
  { name: 'Kolkata', district: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, category: 'Safe', soe: 58.2, quality: 'Arsenic', advice: 'Deltaic alluvium. High recharge, arsenic filtration filters advised.' },
  { name: 'Hyderabad (Serilingampally)', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, category: 'Semi-Critical', soe: 78.9, quality: 'Fluoride', advice: 'Crystalline granite aquifer with high fluoride. Rooftop recharge compulsory.' },
  { name: 'Bhopal (Huzur)', district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, category: 'Safe', soe: 61.4, quality: 'Normal', advice: 'Vindhyan sandstone & basalt. Safe water balance.' },
  { name: 'Guwahati', district: 'Kamrup', state: 'Assam', lat: 26.1445, lng: 91.7362, category: 'Safe', soe: 24.1, quality: 'Iron (>1.0 mg/L)', advice: 'Brahmaputra alluvium. Abundant water resource (SoE 24%). Iron removal plants recommended.' },
  { name: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, category: 'Safe', soe: 51.3, quality: 'Normal', advice: 'Coastal & laterite aquifer. High annual monsoon recharge.' }
];

document.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth();
  calculateRWH();
  fetchCropAdvice();
  fetchGovGrid();
  loadNationalDashboard();
  loadWaterQualityData();
  loadDepthTrendsData();
});

// ----------------- TAB SWITCHER -----------------
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  if (tabId === 'map') {
    setTimeout(initMap, 200);
  }
}

// ----------------- HEALTH CHECK -----------------
async function checkBackendHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const statusEl = document.getElementById('telemetry-status');
    if (statusEl && data.status === 'online') {
      statusEl.textContent = `LMStudio (${data.llm_provider}) Connected`;
    }
  } catch (e) {
    console.warn('Backend check:', e);
  }
}

// ----------------- AI CHAT & LANGUAGE -----------------
function toggleLanguage() {
  currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
  document.getElementById('lang-btn').textContent = currentLanguage === 'en' ? '🌐 English (EN)' : '🌐 हिंदी (HI)';
}

function clearChat() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="chat-bubble assistant">
      <div>
        <strong style="color: var(--cyan);">Namaste & Welcome!</strong> I am <strong>I.G.R.I.S.</strong>, your AI virtual assistant for the national <strong>INGRES</strong> groundwater information system.<br/><br/>
        I have access to the complete <strong>Ground Water Resource Assessment (GWRA-2025)</strong> dataset covering:
        <ul style="margin: 0.5rem 0 0.5rem 1.5rem; line-height: 1.6; color: var(--text-sub);">
          <li><strong>6,635 Assessment Blocks</strong> with official stage of extraction (SoE) categorizations.</li>
          <li><strong>141 State Water Quality Profiles</strong> (Arsenic, Fluoride, Salinity/EC, Uranium, Nitrate).</li>
          <li><strong>61 Seasonal Aquifer Depth Trends</strong> (Pre-monsoon vs Post-monsoon water tables).</li>
          <li><strong>CGWA Borewell NOC Compliance & Guidelines</strong>.</li>
        </ul>
        Ask me any question in <strong>English</strong> or <strong>हिंदी</strong> below!
      </div>
      <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.6rem;">
        Official CGWB / GEC-2015 Hydrological Engine
      </div>
    </div>
  `;
}

function sendPrompt(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

async function sendMessage() {
  const inputEl = document.getElementById('chat-input');
  const query = inputEl.value.trim();
  if (!query) return;

  // Auto-detect Hindi characters
  const isHindiQuery = /[\u0900-\u097F]/.test(query);
  const activeLang = isHindiQuery ? 'hi' : currentLanguage;

  appendMessage('user', query);
  inputEl.value = '';

  const loadingId = 'loading-' + Date.now();
  appendLoadingBubble(loadingId);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        language: activeLang
      })
    });

    const data = await res.json();
    removeLoadingBubble(loadingId);
    appendMessage('assistant', data.reply, data.visualization, data.source);
  } catch (err) {
    console.error(err);
    removeLoadingBubble(loadingId);
    appendMessage('assistant', '⚠️ Unable to connect to backend server. Please verify FastAPI is running on port 8000.');
  }
}

function appendMessage(sender, text, visualization = null, source = 'I.G.R.I.S. Core') {
  const container = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.className = `chat-bubble ${sender}`;

  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff;">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.25); padding: 2px 6px; border-radius: 4px; color: #00f0ff; font-weight: 600;">$1</code>')
    .replace(/\n/g, '<br/>');

  let html = `<div>${formattedText}</div>`;

  // Render Visual Component if present
  if (visualization) {
    const chartId = 'chart-' + Date.now();

    if (visualization.type === 'block_card') {
      const badgeClass = visualization.category === 'Safe' ? 'safe' : visualization.category === 'Semi-Critical' ? 'semi' : visualization.category === 'Critical' ? 'crit' : 'over';
      html += `
        <div style="margin-top: 1rem; padding: 1.1rem; border-radius: 12px; background: rgba(10, 20, 36, 0.95); border: 1px solid ${visualization.status_color};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <strong style="font-size: 1.05rem; color: #fff;">${visualization.title}</strong>
            <span class="badge badge-${badgeClass}">${visualization.category}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; font-size: 0.8rem;">
            <div class="glass-card" style="text-align: center;"><span style="color: var(--text-dim)">State:</span><br/><strong>${visualization.state_name}</strong></div>
            <div class="glass-card" style="text-align: center;"><span style="color: var(--text-dim)">District:</span><br/><strong>${visualization.district_name}</strong></div>
            <div class="glass-card" style="text-align: center;"><span style="color: var(--text-dim)">Borewell:</span><br/><strong style="color: ${visualization.status_color}">${visualization.category === 'Safe' ? 'Permitted' : 'NOC Mandatory'}</strong></div>
          </div>
        </div>
      `;
    } else if (visualization.type === 'state_analytics') {
      html += `
        <div style="margin-top: 1rem; padding: 1.1rem; border-radius: 12px; background: rgba(10, 20, 36, 0.95); border: 1px solid rgba(0, 240, 255, 0.35);">
          <strong style="color: var(--cyan); display: block; font-size: 1.05rem; margin-bottom: 0.85rem;">${visualization.title}</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; align-items: center;">
            <div style="height: 170px; position: relative;">
              <canvas id="${chartId}"></canvas>
            </div>
            <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.45rem;">
              <div class="glass-card" style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-sub)">Stage of Extraction:</span>
                <strong style="color: ${visualization.metrics.stage_of_extraction > 100 ? '#ef4444' : '#34d399'}">${visualization.metrics.stage_of_extraction}%</strong>
              </div>
              <div class="glass-card" style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-sub)">Annual Recharge:</span>
                <strong style="color: var(--cyan);">${visualization.metrics.total_recharge_bcm} BCM</strong>
              </div>
              <div class="glass-card" style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-sub)">Annual Extraction:</span>
                <strong style="color: #f59e0b;">${visualization.metrics.total_extraction_bcm} BCM</strong>
              </div>
            </div>
          </div>
        </div>
      `;
      setTimeout(() => {
        const ctx = document.getElementById(chartId);
        if (ctx) {
          chartInstances[chartId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: visualization.donut_chart.labels,
              datasets: [{
                data: visualization.donut_chart.data,
                backgroundColor: ['#0284c7', '#f59e0b', '#10b981'],
                borderWidth: 0
              }]
            },
            options: {
              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } },
              maintainAspectRatio: false
            }
          });
        }
      }, 100);
    }
  }

  html += `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.6rem; font-size: 0.72rem; color: var(--text-dim);">
      <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${source}</span>
      ${sender === 'assistant' ? `
        <div style="display: flex; gap: 0.3rem;">
          <button onclick="copyResponse(this)" data-text="${encodeURIComponent(text)}" class="btn-secondary" style="padding: 0.15rem 0.45rem; font-size: 0.7rem;">📋 Copy</button>
          <button onclick="speakResponse(this)" data-text="${encodeURIComponent(text)}" class="btn-secondary" style="padding: 0.15rem 0.45rem; font-size: 0.7rem;">🔊 Read</button>
        </div>
      ` : ''}
    </div>
  `;

  msgEl.innerHTML = html;
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingBubble(id) {
  const container = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.id = id;
  el.className = 'chat-bubble assistant';
  el.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-sub);">
      <span class="pulse-dot" style="background: var(--cyan); box-shadow: 0 0 10px var(--cyan);"></span>
      <span>Querying INGRES Master DB & Synthesizing via Gemma-4...</span>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function removeLoadingBubble(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function copyResponse(btn) {
  const text = decodeURIComponent(btn.getAttribute('data-text'));
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Copied';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
  });
}

function toggleVoiceInput() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Voice input is supported in Chrome, Edge, and modern browsers.');
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRecognition();
  rec.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  rec.start();

  const micBtn = document.getElementById('mic-btn');
  micBtn.textContent = '🔴 Listening...';
  micBtn.style.background = '#ef4444';

  rec.onresult = (e) => {
    document.getElementById('chat-input').value = e.results[0][0].transcript;
    micBtn.textContent = '🎤';
    micBtn.style.background = '';
    sendMessage();
  };
  rec.onerror = () => { micBtn.textContent = '🎤'; micBtn.style.background = ''; };
  rec.onend = () => { micBtn.textContent = '🎤'; micBtn.style.background = ''; };
}

function speakResponse(btn) {
  const text = decodeURIComponent(btn.getAttribute('data-text')).replace(/[*#`_]/g, '');
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN';
  window.speechSynthesis.speak(ut);
}

// ----------------- LEAFLET GIS MAP -----------------
function initMap() {
  if (mapInstance) {
    mapInstance.invalidateSize();
    return;
  }

  mapInstance = L.map('map-container').setView([22.5937, 78.9629], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO & OpenStreetMap'
  }).addTo(mapInstance);

  renderMapMarkers(HOTSPOTS);
}

function getCategoryColor(cat) {
  switch (cat) {
    case 'Safe': return '#10b981';
    case 'Semi-Critical': return '#f59e0b';
    case 'Critical': return '#f97316';
    case 'Over-Exploited': return '#ef4444';
    default: return '#00f0ff';
  }
}

function renderMapMarkers(spots) {
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];

  spots.forEach(spot => {
    const color = getCategoryColor(spot.category);
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: spot.category === 'Over-Exploited' ? 12 : 9,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.75
    }).addTo(mapInstance);

    marker.bindPopup(`
      <div style="padding: 4px; min-width: 180px;">
        <strong style="font-size: 0.95rem; color: #fff;">${spot.name}</strong>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">
          <div><strong>District:</strong> ${spot.district}, ${spot.state}</div>
          <div><strong>Stage of Extraction:</strong> <span style="color: ${color}; font-weight: 700;">${spot.soe}%</span></div>
          ${spot.quality ? `<div><strong>Contaminants:</strong> ${spot.quality}</div>` : ''}
        </div>
      </div>
    `);

    marker.on('click', () => {
      showSelectedLocation(spot);
    });

    mapMarkers.push(marker);
  });
}

function showSelectedLocation(spot) {
  const panel = document.getElementById('map-selected-panel');
  panel.style.display = 'block';
  document.getElementById('selected-name').textContent = spot.name;
  document.getElementById('selected-loc').textContent = `${spot.district}, ${spot.state}`;
  
  const badge = document.getElementById('selected-badge');
  badge.textContent = spot.category;
  badge.className = `badge badge-${spot.category === 'Safe' ? 'safe' : spot.category === 'Semi-Critical' ? 'semi' : spot.category === 'Critical' ? 'crit' : 'over'}`;
  
  document.getElementById('selected-soe-val').textContent = spot.soe ? `Stage of Extraction: ${spot.soe}%` : '';
  document.getElementById('selected-advice').textContent = spot.advice || (spot.category === 'Over-Exploited'
    ? 'Extraction exceeds replenishable recharge. Mandatory 100-200% rainwater harvesting required for any industrial NOC.'
    : 'Groundwater extraction within sustainable threshold. Construct percolation tanks to maintain levels.');
}

function filterMapCategory(cat) {
  const filtered = cat === 'All' ? HOTSPOTS : HOTSPOTS.filter(s => s.category === cat);
  renderMapMarkers(filtered);
}

async function searchMapLocations(query) {
  const resultsEl = document.getElementById('map-search-results');
  if (!query || query.length < 2) {
    resultsEl.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`/api/blocks?query=${encodeURIComponent(query)}&limit=6`);
    const data = await res.json();
    resultsEl.innerHTML = data.map(b => `
      <div onclick="selectSearchBlock('${b.block_name}', '${b.district_name}', '${b.state_name}', '${b.category}')" 
           style="padding: 0.45rem; background: rgba(15, 28, 48, 0.9); border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; font-size: 0.78rem; border: 1px solid rgba(255,255,255,0.05);">
        <div><strong>${b.block_name}</strong> <span style="color: var(--text-dim)">(${b.district_name})</span></div>
        <span class="badge badge-${b.category === 'Safe' ? 'safe' : b.category === 'Semi-Critical' ? 'semi' : b.category === 'Critical' ? 'crit' : 'over'}">${b.category}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

function selectSearchBlock(block, district, state, category) {
  document.getElementById('map-search-results').innerHTML = '';
  showSelectedLocation({ name: block, district, state, category });
}

// ----------------- 3. WATER QUALITY MATRIX -----------------
async function loadWaterQualityData(filterParam = '') {
  try {
    const res = await fetch(`/api/quality${filterParam ? `?parameter=${encodeURIComponent(filterParam)}` : ''}`);
    allQualityData = await res.json();
    renderWaterQualityCards(allQualityData);
  } catch (e) {
    console.error(e);
  }
}

function filterWaterQuality(param) {
  loadWaterQualityData(param);
}

function renderWaterQualityCards(items) {
  const container = document.getElementById('water-quality-grid');
  if (!container) return;

  const healthEffects = {
    'Fluoride': { risk: 'Dental & Skeletal Fluorosis, joint stiffness', tech: 'Activated Alumina / Nalgonda Technique / RO' },
    'Arsenic': { risk: 'Skin lesions, blackfoot disease, internal cancers', tech: 'Iron Coagulation / Adsorption Filtration' },
    'Salinity': { risk: 'Hypertension, soil salinity, non-potable taste', tech: 'Reverse Osmosis (RO) Desalination' },
    'EC': { risk: 'High mineral salinity, corrosion in pipes', tech: 'Reverse Osmosis (RO) Demineralization' },
    'Nitrate': { risk: 'Methemoglobinemia (Blue Baby Syndrome) in infants', tech: 'Ion Exchange / Electro-dialysis' },
    'Uranium': { risk: 'Kidney toxicity, nephrotoxicity, radiological risk', tech: 'Ion Exchange / Polyphosphate Filtration' }
  };

  container.innerHTML = items.slice(0, 30).map(q => {
    const info = healthEffects[q.parameter] || { risk: 'Digestive & metabolic risks', tech: 'Membrane Filtration' };
    const isExceeded = q.pct_above_limit > 0;

    return `
      <div class="glass-card" style="border-left: 4px solid ${isExceeded ? '#ef4444' : '#10b981'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <h4 style="font-size: 1rem; color: #fff;">${q.state_name}</h4>
            <span style="font-size: 0.72rem; color: var(--text-dim);">${q.num_samples} Laboratory Samples Tested</span>
          </div>
          <span style="font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(0, 240, 255, 0.15); color: var(--cyan);">
            ${q.parameter}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; font-size: 0.76rem; margin: 0.6rem 0;">
          <div class="glass-card" style="padding: 0.4rem 0.6rem;">
            <span style="color: var(--text-dim);">BIS Limit:</span><br/>
            <strong>${q.permissible_limit}</strong>
          </div>
          <div class="glass-card" style="padding: 0.4rem 0.6rem;">
            <span style="color: var(--text-dim);">Exceeding:</span><br/>
            <strong style="color: ${isExceeded ? '#ef4444' : '#34d399'};">${q.pct_above_limit}% (${q.samples_above_limit} samples)</strong>
          </div>
        </div>

        <div style="font-size: 0.74rem; color: var(--text-sub); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem;">
          <div>⚠️ <strong style="color: #fff;">Health Risk:</strong> ${info.risk}</div>
          <div style="margin-top: 2px;">💡 <strong style="color: var(--cyan);">Purification:</strong> ${info.tech}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------- 4. SEASONAL DEPTH TRENDS -----------------
async function loadDepthTrendsData() {
  try {
    const res = await fetch('/api/depth-trends');
    allDepthData = await res.json();
    renderDepthTrends();
  } catch (e) {
    console.error(e);
  }
}

function renderDepthTrends(filterState = '') {
  const container = document.getElementById('depth-trends-grid');
  if (!container) return;

  const filtered = allDepthData.filter(d => d.state_name.toLowerCase().includes(filterState.toLowerCase()));

  container.innerHTML = filtered.map(d => `
    <div class="glass-card" style="border-top: 3px solid #34d399;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
        <h4 style="font-size: 1rem; color: #fff;">${d.state_name}</h4>
        <span style="font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(52, 211, 153, 0.15); color: #34d399; font-weight: 700;">
          ${d.season}
        </span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-sub); line-height: 1.5;">
        ${d.depth_summary}
      </p>
    </div>
  `).join('');
}

// ----------------- 5. SMART SUGGESTOR -----------------
function switchSuggestorTab(subTab) {
  document.getElementById('suggestor-citizen-section').style.display = subTab === 'citizen' ? 'grid' : 'none';
  document.getElementById('suggestor-gov-section').style.display = subTab === 'gov' ? 'block' : 'none';

  document.getElementById('sub-citizen-btn').className = subTab === 'citizen' ? 'btn-primary' : 'btn-secondary';
  document.getElementById('sub-gov-btn').className = subTab === 'gov' ? 'btn-primary' : 'btn-secondary';
}

async function calculateRWH() {
  const area = document.getElementById('rwh-area').value || 1000;
  const state = document.getElementById('rwh-state').value;

  try {
    const res = await fetch('/api/suggestor/rwh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooftop_area_sqft: parseFloat(area), state_name: state })
    });
    const d = await res.json();
    
    document.getElementById('rwh-results').innerHTML = `
      <div class="glass-card" style="border-left: 3px solid var(--cyan);">
        <div style="font-size: 0.75rem; color: var(--text-dim);">Annual Water Harvested</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--cyan);">${d.annual_harvestable_liters.toLocaleString()} L</div>
        <div style="font-size: 0.72rem; color: var(--text-sub);">${d.annual_rainfall_mm} mm annual rainfall</div>
      </div>
      <div class="glass-card" style="border-left: 3px solid #10b981;">
        <div style="font-size: 0.75rem; color: var(--text-dim);">Annual Water Bill Savings</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: #10b981;">₹ ${d.estimated_annual_savings_inr.toLocaleString()}</div>
        <div style="font-size: 0.72rem; color: var(--text-sub);">${d.equivalent_family_days} days family supply</div>
      </div>
      <div class="glass-card" style="grid-column: span 2; background: rgba(10, 20, 36, 0.95);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #fff;">Recommended Sump Storage Tank</strong>
            <div style="font-size: 0.74rem; color: var(--text-dim);">25% peak intensity monsoon surge sizing</div>
          </div>
          <span style="font-size: 1.15rem; font-weight: 800; color: #f59e0b;">${d.recommended_tank_capacity_liters.toLocaleString()} Liters</span>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
  }
}

async function fetchCropAdvice() {
  const state = document.getElementById('crop-state').value;
  try {
    const res = await fetch('/api/suggestor/crops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state_name: state })
    });
    const d = await res.json();

    document.getElementById('crop-results').innerHTML = `
      <div style="padding: 0.65rem 0.85rem; border-radius: 8px; background: ${d.is_water_stressed ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; border: 1px solid ${d.is_water_stressed ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}; font-size: 0.78rem;">
        <strong style="color: ${d.is_water_stressed ? '#f87171' : '#34d399'}">${d.is_water_stressed ? '⚠️ High Groundwater Depletion Zone' : '🟢 Sustainable Aquifer Status'}</strong>
        <div style="font-size: 0.74rem; color: var(--text-sub); margin-top: 2px;">${d.current_crop_water_drain}</div>
      </div>
      ${d.recommendations.map(r => `
        <div class="glass-card" style="font-size: 0.78rem;">
          <div style="display: flex; justify-content: space-between;">
            <strong style="color: var(--cyan);">${r.crop}</strong>
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(16,185,129,0.2); color: #34d399; font-weight: 700;">Save ${r.savings_vs_paddy_pct}</span>
          </div>
          <div style="color: var(--text-sub); margin-top: 2px;">${r.recommendation_reason}</div>
          <div style="color: #f59e0b; font-size: 0.72rem; margin-top: 4px;">🎯 Subsidy: ${r.subsidy_applicable}</div>
        </div>
      `).join('')}
    `;
  } catch (e) {
    console.error(e);
  }
}

async function fetchGovGrid() {
  try {
    const res = await fetch('/api/grid/balancing');
    const data = await res.json();
    document.getElementById('gov-grid-tbody').innerHTML = data.map(r => `
      <tr>
        <td style="font-weight: 700; color: #fff;">${r.state_name}</td>
        <td style="color: #f87171; font-weight: 600;">${r.over_exploited_blocks} Blocks</td>
        <td style="font-weight: 700; color: ${r.stage_of_extraction_pct > 100 ? '#ef4444' : '#f59e0b'};">${r.stage_of_extraction_pct}%</td>
        <td><span class="badge badge-${r.priority === 'CRITICAL' ? 'over' : 'semi'}">${r.priority}</span></td>
        <td style="color: var(--cyan); font-weight: 500;">${r.recommended_source}</td>
        <td style="color: #34d399; font-weight: 700;">${r.estimated_recharge_potential_mcm} MCM</td>
        <td style="color: var(--text-sub); font-size: 0.75rem; max-width: 280px;">${r.strategy}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

// ----------------- 6. NATIONAL DASHBOARD & EXPORT -----------------
async function loadNationalDashboard() {
  try {
    const [natRes, statesRes] = await Promise.all([
      fetch('/api/stats/national'),
      fetch('/api/states')
    ]);
    const nat = await natRes.json();
    allStatesData = await statesRes.json();

    // Render KPIs
    document.getElementById('national-kpi-row').innerHTML = `
      <div class="glass-card" style="border-left: 4px solid var(--cyan);">
        <div style="font-size: 0.74rem; color: var(--text-dim); text-transform: uppercase;">Total Annual Recharge</div>
        <div style="font-size: 1.55rem; font-weight: 800; color: var(--cyan); margin: 2px 0;">${nat.national_recharge_bcm} BCM</div>
        <div style="font-size: 0.72rem; color: var(--text-sub);">Natural Replenishable Inflow</div>
      </div>
      <div class="glass-card" style="border-left: 4px solid #f59e0b;">
        <div style="font-size: 0.74rem; color: var(--text-dim); text-transform: uppercase;">Total Annual Extraction</div>
        <div style="font-size: 1.55rem; font-weight: 800; color: #f59e0b; margin: 2px 0;">${nat.national_extraction_bcm} BCM</div>
        <div style="font-size: 0.72rem; color: var(--text-sub);">Irrigation (87%) + Domestic + Industry</div>
      </div>
      <div class="glass-card" style="border-left: 4px solid #10b981;">
        <div style="font-size: 0.74rem; color: var(--text-dim); text-transform: uppercase;">National Stage of Extraction</div>
        <div style="font-size: 1.55rem; font-weight: 800; color: #10b981; margin: 2px 0;">${nat.national_soe_pct}%</div>
        <div style="font-size: 0.72rem; color: #34d399;">Safe Band (&lt; 70%)</div>
      </div>
      <div class="glass-card" style="border-left: 4px solid #a855f7;">
        <div style="font-size: 0.74rem; color: var(--text-dim); text-transform: uppercase;">Monitored Units</div>
        <div style="font-size: 1.55rem; font-weight: 800; color: #c084fc; margin: 2px 0;">${nat.total_blocks.toLocaleString()} Blocks</div>
        <div style="font-size: 0.72rem; color: var(--text-sub);">74.5% Safe • 11% Over-Exploited</div>
      </div>
    `;

    // Sector Donut
    const donutCtx = document.getElementById('sector-donut-canvas');
    if (donutCtx) {
      new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: [
            `Irrigation (${nat.national_irrigation_bcm} BCM)`,
            `Domestic (${nat.national_domestic_bcm} BCM)`,
            `Industrial (${nat.national_industrial_bcm} BCM)`
          ],
          datasets: [{
            data: [nat.national_irrigation_bcm, nat.national_domestic_bcm, nat.national_industrial_bcm],
            backgroundColor: ['#0284c7', '#10b981', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } },
          maintainAspectRatio: false
        }
      });
    }

    // Stress Bar Chart
    const stressCtx = document.getElementById('stress-bar-canvas');
    const topStates = [...allStatesData].sort((a, b) => b.stage_of_extraction_pct - a.stage_of_extraction_pct).slice(0, 8);
    if (stressCtx) {
      new Chart(stressCtx, {
        type: 'bar',
        data: {
          labels: topStates.map(s => s.state_name),
          datasets: [{
            data: topStates.map(s => s.stage_of_extraction_pct),
            backgroundColor: topStates.map(s => s.stage_of_extraction_pct > 100 ? '#ef4444' : '#f59e0b'),
            borderRadius: 6
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          maintainAspectRatio: false
        }
      });
    }

    renderStatesTable();
  } catch (e) {
    console.error(e);
  }
}

function renderStatesTable(search = '') {
  const tbody = document.getElementById('states-table-tbody');
  const filtered = allStatesData.filter(s => s.state_name.toLowerCase().includes(search.toLowerCase()));

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td style="font-weight: 600; color: #fff;">${s.state_name}</td>
      <td style="color: var(--cyan);">${s.total_annual_recharge}</td>
      <td style="color: #f59e0b;">${s.total_annual_extraction}</td>
      <td style="color: var(--text-sub);">${s.irrigation_extraction}</td>
      <td style="color: var(--text-sub);">${s.domestic_extraction}</td>
      <td style="color: #34d399;">${s.net_availability_future}</td>
      <td>
        <span class="badge badge-${s.stage_of_extraction_pct <= 70 ? 'safe' : s.stage_of_extraction_pct <= 90 ? 'semi' : s.stage_of_extraction_pct <= 100 ? 'crit' : 'over'}">
          ${s.stage_of_extraction_pct}%
        </span>
      </td>
    </tr>
  `).join('');
}

function exportStatesCSV() {
  if (!allStatesData.length) return;
  const headers = ['State/UT', 'Annual Recharge (BCM)', 'Total Extraction (BCM)', 'Irrigation (BCM)', 'Domestic (BCM)', 'Future Available (BCM)', 'Stage of Extraction (%)'];
  const rows = allStatesData.map(s => [
    `"${s.state_name}"`,
    s.total_annual_recharge,
    s.total_annual_extraction,
    s.irrigation_extraction,
    s.domestic_extraction,
    s.net_availability_future,
    s.stage_of_extraction_pct
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'GWRA_2025_All_India_State_Groundwater_Registry.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
}
