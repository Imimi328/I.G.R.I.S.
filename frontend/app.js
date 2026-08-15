// ==========================================================================
// I.G.R.I.S. ENTERPRISE APPLICATION CONTROLLER
// High-Tech GIS Aquifer Navigator & Auto-GPS Hydrological Engine
// ==========================================================================

let currentLanguage = 'en';
let mapInstance = null;
let mapLayersGroup = {
  oe: null,
  crit: null,
  safe: null,
  quality: null
};
let userLocationMarker = null;
let inspectionMarker = null;
let userDetectedLocation = null;

let allStatesData = [];
let allQualityData = [];
let allDepthData = [];
let chartInstances = {};

// 30+ Key Hotspots across India with full hydrogeological data
const HOTSPOTS = [
  { name: 'Sangrur', district: 'Sangrur', state: 'Punjab', lat: 30.2458, lng: 75.8421, category: 'Over-Exploited', soe: 168.5, recharge: '1.24 BCM', extraction: '2.09 BCM', quality: 'Fluoride, Uranium', depth: '24.5 mbgl', advice: 'Severe over-extraction (168% SoE). Prohibited for new non-drinking tubewells without CGWA NOC.' },
  { name: 'Ludhiana (Central)', district: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573, category: 'Over-Exploited', soe: 158.2, recharge: '1.85 BCM', extraction: '2.93 BCM', quality: 'Heavy Metals, Nitrate', depth: '28.2 mbgl', advice: 'Critical urban-industrial over-draft. Mandatory 100% industrial artificial recharge.' },
  { name: 'Amritsar (Rural)', district: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, category: 'Over-Exploited', soe: 147.6, recharge: '1.10 BCM', extraction: '1.62 BCM', quality: 'Arsenic, Nitrate', depth: '22.0 mbgl', advice: 'Paddy water intensive zone. DSR and canal conjunctive usage mandatory.' },
  { name: 'Jaipur (Amber)', district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, category: 'Over-Exploited', soe: 154.2, recharge: '0.84 BCM', extraction: '1.30 BCM', quality: 'Nitrate, Salinity', depth: '45.8 mbgl', advice: 'Severe groundwater stress in semi-arid terrain. Rooftop RWH compulsory for all buildings >100 sq.m.' },
  { name: 'Jodhpur (Mandore)', district: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, category: 'Over-Exploited', soe: 142.1, recharge: '0.52 BCM', extraction: '0.74 BCM', quality: 'Fluoride, Salinity', depth: '52.1 mbgl', advice: 'Rely on IGNP canal network and farm ponds.' },
  { name: 'Bikaner Sadar', district: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119, category: 'Over-Exploited', soe: 138.4, recharge: '0.41 BCM', extraction: '0.57 BCM', quality: 'High Salinity, Fluoride', depth: '65.0 mbgl', advice: 'Deep desert aquifer with slow replenishability.' },
  { name: 'Kurukshetra (Thanesar)', district: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, category: 'Over-Exploited', soe: 139.8, recharge: '0.62 BCM', extraction: '0.87 BCM', quality: 'Iron, Nitrate', depth: '31.4 mbgl', advice: 'High tubewell density. Micro-irrigation required.' },
  { name: 'Gurugram (Sohna)', district: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, category: 'Over-Exploited', soe: 161.4, recharge: '0.35 BCM', extraction: '0.56 BCM', quality: 'Salinity, Nitrate', depth: '38.6 mbgl', advice: 'Commercial extraction strictly regulated under CGWA.' },
  { name: 'Chennai Central', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, category: 'Critical', soe: 98.4, recharge: '0.28 BCM', extraction: '0.27 BCM', quality: 'Salinity (Sea Intrusion)', depth: '8.4 mbgl', advice: 'Coastal aquifer over-drafting risks saline ingress. Stormwater recharge sumps mandatory.' },
  { name: 'Coimbatore (North)', district: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, category: 'Over-Exploited', soe: 128.6, recharge: '0.74 BCM', extraction: '0.95 BCM', quality: 'Fluoride', depth: '34.2 mbgl', advice: 'Hard rock granite fractures. Check dam percolation encouraged.' },
  { name: 'Bengaluru Urban', district: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, category: 'Over-Exploited', soe: 141.2, recharge: '0.42 BCM', extraction: '0.59 BCM', quality: 'Nitrate, Heavy Metals', depth: '42.0 mbgl', advice: 'Hard rock granite aquifer. Desilt lake cascade systems to recharge shallow weathered zones.' },
  { name: 'Kolar Sadar', district: 'Kolar', state: 'Karnataka', lat: 13.1378, lng: 78.1291, category: 'Over-Exploited', soe: 172.0, recharge: '0.31 BCM', extraction: '0.53 BCM', quality: 'Fluoride, Nitrate', depth: '55.0 mbgl', advice: 'Treated wastewater reuse (KC Valley project) deployed for aquifer recharge.' },
  { name: 'Ahmedabad (Daskroi)', district: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, category: 'Semi-Critical', soe: 86.4, recharge: '1.45 BCM', extraction: '1.25 BCM', quality: 'Salinity, Fluoride', depth: '28.0 mbgl', advice: 'Alluvial deep aquifer. SAUNI Yojana pipeline recharge check dams deployed.' },
  { name: 'Mehsana Sadar', district: 'Mehsana', state: 'Gujarat', lat: 23.5880, lng: 72.3693, category: 'Over-Exploited', soe: 136.5, recharge: '0.68 BCM', extraction: '0.93 BCM', quality: 'Fluoride (>1.5 mg/L)', depth: '62.0 mbgl', advice: 'Deep alluvial aquifer with high fluoride. Surface canal supply prioritized.' },
  { name: 'Pune (Haveli)', district: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, category: 'Safe', soe: 54.8, recharge: '33.03 BCM (State)', extraction: '16.50 BCM (State)', quality: 'Normal / Potable', depth: '7.8 mbgl', advice: 'Deccan basalt basaltic aquifers. Permissible for domestic tubewells within permissible limits.' },
  { name: 'Nagpur (Rural)', district: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, category: 'Safe', soe: 62.1, recharge: '1.92 BCM', extraction: '1.19 BCM', quality: 'Normal', depth: '9.2 mbgl', advice: 'Central India basaltic plateau. Sustainable recharge.' },
  { name: 'Aurangabad (Sambhaji)', district: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, category: 'Semi-Critical', soe: 78.4, recharge: '1.15 BCM', extraction: '0.90 BCM', quality: 'Nitrate', depth: '14.5 mbgl', advice: 'Marathwada hard rock terrain. Continuous contour trenches (CCT) advised.' },
  { name: 'Patna Sadar', district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, category: 'Safe', soe: 48.6, recharge: '32.18 BCM (State)', extraction: '14.62 BCM (State)', quality: 'Arsenic (>0.01 mg/L)', depth: '6.5 mbgl', advice: 'Gangetic alluvium. Safe quantity, but test deep wells for Arsenic contamination.' },
  { name: 'Gaya Sadar', district: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 85.0002, category: 'Safe', soe: 56.2, recharge: '1.24 BCM', extraction: '0.70 BCM', quality: 'Fluoride', depth: '11.0 mbgl', advice: 'Palar/Falgu riverbed recharge active.' },
  { name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, category: 'Semi-Critical', soe: 76.2, recharge: '71.50 BCM (State)', extraction: '49.12 BCM (State)', quality: 'Normal', depth: '12.8 mbgl', advice: 'High urban abstraction. Implement percolation wells along ghat catchment.' },
  { name: 'Agra (Achhnera)', district: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, category: 'Over-Exploited', soe: 122.4, recharge: '0.78 BCM', extraction: '0.95 BCM', quality: 'Salinity, Fluoride', depth: '26.4 mbgl', advice: 'Yamuna basin saline marginal zones.' },
  { name: 'Kolkata', district: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, category: 'Safe', soe: 58.2, recharge: '30.12 BCM (State)', extraction: '14.80 BCM (State)', quality: 'Arsenic, Salinity', depth: '5.2 mbgl', advice: 'Deltaic alluvium. High recharge, arsenic filtration filters advised.' },
  { name: 'Hyderabad (Serilingampally)', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, category: 'Semi-Critical', soe: 78.9, recharge: '18.45 BCM (State)', extraction: '8.50 BCM (State)', quality: 'Fluoride (>1.5 mg/L)', depth: '16.2 mbgl', advice: 'Crystalline granite aquifer with high fluoride. Rooftop recharge compulsory.' },
  { name: 'Bhopal (Huzur)', district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, category: 'Safe', soe: 61.4, recharge: '36.80 BCM (State)', extraction: '20.15 BCM (State)', quality: 'Normal', depth: '10.5 mbgl', advice: 'Vindhyan sandstone & basalt. Safe water balance.' },
  { name: 'Guwahati (Kamrup)', district: 'Kamrup', state: 'Assam', lat: 26.1445, lng: 91.7362, category: 'Safe', soe: 24.1, recharge: '25.80 BCM (State)', extraction: '3.42 BCM (State)', quality: 'Iron (>1.0 mg/L)', depth: '3.8 mbgl', advice: 'Brahmaputra alluvium. Abundant water resource (SoE 24%). Iron removal plants recommended.' },
  { name: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, category: 'Safe', soe: 51.3, recharge: '5.62 BCM (State)', extraction: '2.74 BCM (State)', quality: 'Normal', depth: '4.5 mbgl', advice: 'Coastal & laterite aquifer. High annual monsoon recharge.' }
];

document.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth();
  calculateRWH();
  fetchCropAdvice();
  fetchGovGrid();
  loadNationalDashboard();
  loadWaterQualityData();
  loadDepthTrendsData();

  // Attempt gentle GPS auto-detect on startup
  setTimeout(() => detectUserLocation(false), 800);
});

// ----------------- AUTO-GPS LOCATION RESOLVER -----------------
async function detectUserLocation(isUserInitiated = true) {
  const statusEl = document.getElementById('gps-status-text');
  if (statusEl) statusEl.textContent = 'Locating...';

  if (!navigator.geolocation) {
    if (isUserInitiated) alert('Geolocation is not supported by your browser.');
    if (statusEl) statusEl.textContent = 'GPS Unavailable';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      try {
        const res = await fetch(`/api/location/resolve?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        userDetectedLocation = data;

        // Update Top Banner
        const banner = document.getElementById('detected-loc-banner');
        if (banner) {
          banner.style.display = 'flex';
          document.getElementById('banner-loc-name').textContent = `${data.nearest_block} (${data.detected_district}, ${data.detected_state})`;
          
          const statusBadge = document.getElementById('banner-loc-status');
          statusBadge.textContent = data.category;
          statusBadge.className = `badge badge-${data.category === 'Safe' ? 'safe' : data.category === 'Semi-Critical' ? 'semi' : data.category === 'Critical' ? 'crit' : 'over'}`;
          
          document.getElementById('banner-loc-verdict').textContent = data.borewell_verdict.status;
        }

        if (statusEl) statusEl.textContent = `${data.detected_district}, ${data.detected_state}`;

        // If map is already initialized, fly to user location
        if (mapInstance) {
          showUserLocationOnMap(lat, lng, data);
        }
      } catch (err) {
        console.error('Location resolve error:', err);
        if (statusEl) statusEl.textContent = 'Location Error';
      }
    },
    (err) => {
      console.warn('Geolocation denied/unavailable:', err.message);
      // Fallback default: Pune, Maharashtra
      if (statusEl) statusEl.textContent = 'Detect My Location';
    },
    { timeout: 8000, enableHighAccuracy: true }
  );
}

function queryMyLocInChat() {
  if (!userDetectedLocation) {
    detectUserLocation(true);
    return;
  }
  switchTab('chat');
  const loc = userDetectedLocation;
  sendPrompt(`What is the official groundwater status, water table depth, quality issues, and borewell drilling feasibility in ${loc.nearest_block}, ${loc.detected_district}, ${loc.detected_state}?`);
}

function locateOnMap() {
  if (userDetectedLocation && mapInstance) {
    showUserLocationOnMap(userDetectedLocation.lat, userDetectedLocation.lng, userDetectedLocation);
  } else {
    detectUserLocation(true);
  }
}

function showUserLocationOnMap(lat, lng, locData) {
  mapInstance.flyTo([lat, lng], 11, { duration: 1.5 });

  if (userLocationMarker) userLocationMarker.remove();

  userLocationMarker = L.circleMarker([lat, lng], {
    radius: 12,
    fillColor: '#00f0ff',
    color: '#ffffff',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(mapInstance);

  userLocationMarker.bindPopup(`
    <div style="padding: 4px; min-width: 190px;">
      <div style="display: flex; align-items: center; gap: 4px; color: var(--cyan); font-weight: 800; font-size: 0.95rem;">
        <span>📍 You Are Here</span>
      </div>
      <div style="margin-top: 4px; font-size: 0.8rem; color: #fff;">
        <strong>${locData.nearest_block}</strong> (${locData.detected_district}, ${locData.detected_state})
      </div>
      <div style="margin-top: 4px; font-size: 0.75rem; color: #94a3b8;">
        <div><strong>Aquifer Status:</strong> <span class="badge badge-${locData.category === 'Safe' ? 'safe' : 'over'}">${locData.category}</span></div>
        <div><strong>Borewell:</strong> ${locData.borewell_verdict.status}</div>
      </div>
    </div>
  `).openPopup();

  showSelectedLocation({
    name: locData.nearest_block,
    district: locData.detected_district,
    state: locData.detected_state,
    category: locData.category,
    soe: locData.state_data ? locData.state_data.stage_of_extraction_pct : 55,
    recharge: locData.state_data ? `${locData.state_data.total_annual_recharge} BCM` : '',
    advice: locData.borewell_verdict.advice
  });
}

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
      const soe = visualization.metrics.stage_of_extraction;
      const recharge = visualization.metrics.total_recharge_bcm;
      const extraction = visualization.metrics.total_extraction_bcm;
      const future = visualization.metrics.future_available_bcm;

      html += `
        <div style="margin-top: 1rem; padding: 1.1rem; border-radius: 12px; background: rgba(10, 20, 36, 0.95); border: 1px solid rgba(0, 240, 255, 0.35);">
          <strong style="color: var(--cyan); display: block; font-size: 1.05rem; margin-bottom: 0.85rem;">${visualization.title}</strong>
          
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.25rem; align-items: center;">
            <div style="height: 180px; position: relative;">
              <canvas id="${chartId}"></canvas>
            </div>
            
            <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <!-- SoE Gauge Meter -->
              <div class="glass-card">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--text-sub)">Stage of Extraction (SoE):</span>
                  <strong style="color: ${soe > 100 ? '#ef4444' : soe > 70 ? '#f59e0b' : '#34d399'}; font-size: 0.95rem;">${soe}%</strong>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width: ${Math.min(soe, 100)}%; background: ${soe > 100 ? '#ef4444' : soe > 70 ? '#f59e0b' : '#10b981'};"></div>
                </div>
              </div>

              <!-- Key Metrics Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                <div class="glass-card" style="padding: 0.5rem 0.6rem;">
                  <span style="color: var(--text-dim); font-size: 0.72rem;">Annual Recharge:</span><br/>
                  <strong style="color: var(--cyan); font-size: 1rem;">${recharge} BCM</strong>
                </div>
                <div class="glass-card" style="padding: 0.5rem 0.6rem;">
                  <span style="color: var(--text-dim); font-size: 0.72rem;">Total Extraction:</span><br/>
                  <strong style="color: #f59e0b; font-size: 1rem;">${extraction} BCM</strong>
                </div>
              </div>

              <div class="glass-card" style="padding: 0.4rem 0.6rem; display: flex; justify-content: space-between;">
                <span style="color: var(--text-dim); font-size: 0.72rem;">Net Future Available:</span>
                <strong style="color: #34d399;">${future} BCM</strong>
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
              labels: visualization.donut_chart.labels.map((l, i) => `${l} (${visualization.donut_chart.data[i]} BCM)`),
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

// ----------------- LEAFLET GIS MAP OVERHAUL -----------------
function initMap() {
  if (mapInstance) {
    mapInstance.invalidateSize();
    return;
  }

  mapInstance = L.map('map-container').setView([22.5937, 78.9629], 5);

  // High-contrast base tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO & OpenStreetMap'
  }).addTo(mapInstance);

  // Initialize Layer Groups
  mapLayersGroup.oe = L.layerGroup().addTo(mapInstance);
  mapLayersGroup.crit = L.layerGroup().addTo(mapInstance);
  mapLayersGroup.safe = L.layerGroup().addTo(mapInstance);
  mapLayersGroup.quality = L.layerGroup().addTo(mapInstance);

  renderThematicMapLayers();

  // Click anywhere on map to inspect location
  mapInstance.on('click', async (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    if (inspectionMarker) inspectionMarker.remove();
    inspectionMarker = L.marker([lat, lng]).addTo(mapInstance);

    try {
      const res = await fetch(`/api/location/resolve?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      
      inspectionMarker.bindPopup(`
        <div style="padding: 4px; min-width: 190px;">
          <strong style="color: var(--cyan); font-size: 0.95rem;">${data.nearest_block}</strong>
          <div style="font-size: 0.78rem; color: #fff;">${data.detected_district}, ${data.detected_state}</div>
          <div style="margin-top: 4px; font-size: 0.75rem; color: #94a3b8;">
            <div><strong>Status:</strong> <span class="badge badge-${data.category === 'Safe' ? 'safe' : 'over'}">${data.category}</span></div>
            <div><strong>Verdict:</strong> ${data.borewell_verdict.status}</div>
          </div>
        </div>
      `).openPopup();

      showSelectedLocation({
        name: data.nearest_block,
        district: data.detected_district,
        state: data.detected_state,
        category: data.category,
        soe: data.state_data ? data.state_data.stage_of_extraction_pct : 60,
        recharge: data.state_data ? `${data.state_data.total_annual_recharge} BCM` : '',
        advice: data.borewell_verdict.advice
      });
    } catch (err) {
      console.error(err);
    }
  });
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

function renderThematicMapLayers() {
  mapLayersGroup.oe.clearLayers();
  mapLayersGroup.crit.clearLayers();
  mapLayersGroup.safe.clearLayers();
  mapLayersGroup.quality.clearLayers();

  HOTSPOTS.forEach(spot => {
    const color = getCategoryColor(spot.category);
    const radius = spot.category === 'Over-Exploited' ? 12 : spot.category === 'Critical' ? 10 : 8;

    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 0.95,
      fillOpacity: 0.8
    });

    marker.bindPopup(`
      <div style="padding: 4px; min-width: 190px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="font-size: 1rem; color: #fff;">${spot.name}</strong>
          <span class="badge badge-${spot.category === 'Safe' ? 'safe' : spot.category === 'Semi-Critical' ? 'semi' : spot.category === 'Critical' ? 'crit' : 'over'}">${spot.category}</span>
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.5;">
          <div><strong>District:</strong> ${spot.district}, ${spot.state}</div>
          <div><strong>Stage of Extraction:</strong> <span style="color: ${color}; font-weight: 700;">${spot.soe}%</span></div>
          <div><strong>Water Table Depth:</strong> ${spot.depth || '10-20 mbgl'}</div>
          ${spot.quality ? `<div><strong>Contaminants:</strong> <span style="color: #f87171;">${spot.quality}</span></div>` : ''}
        </div>
      </div>
    `);

    marker.on('click', () => showSelectedLocation(spot));

    if (spot.category === 'Over-Exploited') {
      mapLayersGroup.oe.addLayer(marker);
    } else if (spot.category === 'Critical' || spot.category === 'Semi-Critical') {
      mapLayersGroup.crit.addLayer(marker);
    } else {
      mapLayersGroup.safe.addLayer(marker);
    }
  });
}

function updateMapThematicLayers() {
  const showOE = document.getElementById('layer-oe').checked;
  const showCrit = document.getElementById('layer-crit').checked;
  const showSafe = document.getElementById('layer-safe').checked;

  if (showOE) mapInstance.addLayer(mapLayersGroup.oe); else mapInstance.removeLayer(mapLayersGroup.oe);
  if (showCrit) mapInstance.addLayer(mapLayersGroup.crit); else mapInstance.removeLayer(mapLayersGroup.crit);
  if (showSafe) mapInstance.addLayer(mapLayersGroup.safe); else mapInstance.removeLayer(mapLayersGroup.safe);
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
  document.getElementById('selected-recharge-val').textContent = spot.recharge ? `Total Recharge: ${spot.recharge}` : '';
  document.getElementById('selected-advice').textContent = spot.advice || (spot.category === 'Over-Exploited'
    ? 'Extraction exceeds replenishable recharge. Mandatory 100-200% artificial recharge required for any industrial NOC.'
    : 'Groundwater extraction within sustainable threshold. Construct percolation tanks to maintain levels.');
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
