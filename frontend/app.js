const appState = { activeContext: null, chatLocation: null, chatHistory: [] };
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.brand > span:last-child').forEach((brandText) => { brandText.innerHTML = 'I.G.R.I.S. <small>for INGRES</small>'; });
  document.querySelectorAll('.brand-mark').forEach((brandMark) => { brandMark.textContent = 'I'; });
  initMenu();
  initChatNavigation();
  initLocationSuggestions();
  initHome();
  initArea();
  initFarm();
  initSafety();
  initRecharge();
  initChat();
});

function initChatNavigation() {
  document.querySelectorAll('.site-nav').forEach((nav) => {
    if (nav.querySelector('[href="/ask-igris.html"]')) return;
    const link = document.createElement('a');
    link.href = '/ask-igris.html';
    link.textContent = 'Ask I.G.R.I.S.';
    nav.append(link);
  });
}

function initMenu() {
  const button = $('.menu-button');
  const nav = $('.site-nav');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
  });
}

function initLocationSuggestions() {
  ['home-location', 'context-search', 'farm-search', 'safety-search'].forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const list = document.createElement('datalist');
    list.id = `${inputId}-suggestions`;
    document.body.append(list);
    input.setAttribute('list', list.id);
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();
      if (query.length < 4) { list.innerHTML = ''; return; }
      debounceTimer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/location/suggest?query=${encodeURIComponent(query)}`);
          if (!response.ok) return;
          const data = await response.json();
          const seen = new Set();
          list.innerHTML = (data.suggestions || []).map((item) => {
            const parts = [item.city, item.district, item.state].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index);
            const value = parts.join(', ') || item.display_name;
            if (!value || seen.has(value.toLowerCase())) return '';
            seen.add(value.toLowerCase());
            return `<option value="${escapeHTML(value)}">${escapeHTML(item.display_name)}</option>`;
          }).join('');
        } catch (error) {
          list.innerHTML = '';
        }
      }, 650);
    });
  });
}

function initHome() {
  const form = $('#home-location-form');
  if (!form) return;
  loadBlockCount();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const place = $('#home-location').value.trim();
    if (place) window.location.href = `/my-area.html?place=${encodeURIComponent(place)}`;
  });
  $('#home-gps').addEventListener('click', () => { window.location.href = '/my-area.html?gps=1'; });
}

async function loadBlockCount() {
  try {
    const response = await fetch('/api/stats/national');
    const data = await response.json();
    const target = $('#home-block-count');
    if (target) target.textContent = formatNumber(data.total_blocks);
  } catch (error) {
    console.warn('National summary unavailable', error);
  }
}

function initArea() {
  const form = $('#context-search-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadPageContext('area', { query: $('#context-search').value.trim() });
  });
  $('#context-gps').addEventListener('click', () => loadPageContext('area', { gps: true }));
  const parameters = new URLSearchParams(window.location.search);
  if (parameters.get('place')) {
    $('#context-search').value = parameters.get('place');
    loadPageContext('area', { query: parameters.get('place') });
  } else if (parameters.get('gps')) {
    loadPageContext('area', { gps: true });
  }
}

function initFarm() {
  const form = $('#farm-search-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadPageContext('farm', { query: $('#farm-search').value.trim() });
  });
  $('#farm-gps').addEventListener('click', () => loadPageContext('farm', { gps: true }));
}

function initSafety() {
  const form = $('#safety-search-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadPageContext('safety', { query: $('#safety-search').value.trim() });
  });
  $('#safety-gps').addEventListener('click', () => loadPageContext('safety', { gps: true }));
}

async function loadPageContext(page, options) {
  setLoading(page, true);
  try {
    const context = options.gps ? await fetchGpsContext() : await fetchSearchContext(options.query);
    if (context.error) throw new Error(context.error);
    appState.activeContext = context;
    if (page === 'area') await renderArea(context);
    if (page === 'farm') await renderFarm(context);
    if (page === 'safety') renderSafety(context);
  } catch (error) {
    showContextError(page, error.message);
  } finally {
    setLoading(page, false);
  }
}

async function fetchSearchContext(query) {
  if (!query) throw new Error('Enter a place to continue.');
  const response = await fetch(`/api/local-context/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('We could not find that place. Try a city, district, or state.');
  return response.json();
}

function fetchGpsContext() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser does not support location services. Search for a place instead.'));
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`/api/local-context?lat=${latitude}&lng=${longitude}`);
        if (!response.ok) throw new Error('We could not build a local context from this location.');
        resolve(await response.json());
      } catch (error) { reject(error); }
    }, () => reject(new Error('Location access was not granted. Search for a place instead.')), { enableHighAccuracy: true, timeout: 10000 });
  });
}

function setLoading(page, visible) {
  const target = $(`#${page}-loading`) || $('#context-loading');
  if (target) target.hidden = !visible;
}

function showContextError(page, message) {
  const fallback = page === 'area' ? $('#area-context') : page === 'farm' ? $('#farm-context') : $('#safety-context');
  if (!fallback) return;
  fallback.hidden = false;
  fallback.innerHTML = `<div class="loading-panel">${escapeHTML(message)}</div>`;
}

async function renderArea(context) {
  const location = context.location;
  const weather = context.weather;
  const assessment = location.block_data ? await getAssessment(location, 'resident') : {
    classification: location.category,
    verdict: 'No exact official assessment unit is indexed for this locality.',
    summary: 'Weather is specific to the searched coordinates. Use the state evidence below and verify the nearest assessment unit before making a borewell decision.',
    actions: ['Search with the block or district name if you know it.', 'Do not treat this result as a borewell clearance.', 'Use the local CGWA/CGWB process before drilling or expanding extraction.']
  };
  $('#area-context').hidden = false;
  const searchedLabel = context.requested_place || location.selected_locality || context.searched_place?.city || context.searched_place?.district;
  $('#area-place').textContent = searchedLabel || `${location.nearest_block}, ${location.detected_district}`;
  $('#area-meta').textContent = location.match_method ? `${location.detected_state} · ${location.match_method}` : `${location.detected_state} · nearest official assessment unit`;
  $('#weather-icon').textContent = weatherIcon(weather.condition);
  $('#weather-temp').textContent = `${Math.round(weather.temperature_c)}°`;
  $('#weather-condition').textContent = `${weather.condition} · feels like ${Math.round(weather.apparent_temperature_c)}°C`;
  setStatusChip($('#area-category'), assessment.classification);
  $('#area-verdict').textContent = assessment.verdict;
  $('#area-summary').textContent = assessment.summary;
  $('#area-actions').innerHTML = assessment.actions.map((action) => `<li>${escapeHTML(action)}</li>`).join('');
  $('#weather-rain').textContent = `${weather.rain_next_7_days_mm} mm`;
  $('#weather-et0').textContent = `${weather.avg_evapotranspiration_mm_day} mm/day`;
  $('#weather-wind').textContent = `${weather.wind_speed_kmh} km/h`;
  renderWeatherDays($('#weather-days'), weather.daily_forecast);
  $('#irrigation-status').textContent = weather.smart_irrigation.status;
  $('#irrigation-action').textContent = weather.smart_irrigation.action;
  $('#irrigation-advice').textContent = weather.smart_irrigation.advice;
  $('#area-soe').textContent = `${location.state_data?.stage_of_extraction_pct ?? '—'}%`;
  $('#area-quality').innerHTML = renderQualityChips(location.water_quality);
  $('#area-sources').textContent = context.sources.join(' · ');
}

async function renderFarm(context) {
  const location = context.location;
  const weather = context.weather;
  const crops = await getCropAdvice(location.detected_state);
  $('#farm-context').hidden = false;
  $('#farm-place').textContent = context.requested_place || location.selected_locality || `${location.nearest_block}, ${location.detected_district}`;
  $('#farm-season').textContent = `${weather.season_context.season_name} · ${weather.season_context.phase}`;
  $('#farm-rain-value').textContent = `${weather.rain_next_7_days_mm} mm`;
  setStatusChip($('#farm-status'), weather.smart_irrigation.status);
  $('#farm-action-title').textContent = weather.smart_irrigation.action;
  $('#farm-advice').textContent = weather.smart_irrigation.advice;
  $('#farm-temp').textContent = `${Math.round(weather.temperature_c)}°C`;
  $('#farm-et0').textContent = `${weather.avg_evapotranspiration_mm_day} mm/day`;
  $('#farm-groundwater').textContent = location.category;
  $('#crop-risk').textContent = crops.is_water_stressed ? `Groundwater is stressed in ${location.detected_state}; prioritise crops that reduce demand.` : `Groundwater is relatively stable in ${location.detected_state}; protect that balance with efficient irrigation.`;
  $('#crop-options').innerHTML = crops.recommendations.slice(0, 3).map((item) => `<div class="crop-option"><strong>${escapeHTML(item.crop)}</strong><span>Up to ${escapeHTML(item.savings_vs_paddy_pct)} less water than paddy · ${escapeHTML(item.water_requirement_mm)}</span></div>`).join('');
  renderWeatherDays($('#farm-week'), weather.daily_forecast);
}

function renderSafety(context) {
  const location = context.location;
  const alerts = location.water_quality || [];
  $('#safety-context').hidden = false;
  $('#safety-place').textContent = context.requested_place ? `${context.requested_place} · ${location.detected_state}` : `${location.detected_state} · ${location.detected_district}`;
  const flagged = alerts.filter((item) => Number(item.pct_above_limit) > 0).slice(0, 6);
  $('#safety-alerts').innerHTML = flagged.length ? flagged.map((item) => `<article class="safety-alert"><p class="mono-label">REGIONAL SIGNAL</p><h3>${escapeHTML(item.parameter)}</h3><p>In the indexed state assessment, ${escapeHTML(item.pct_above_limit)}% of reported samples exceeded the listed limit.</p><strong>Listed limit: ${escapeHTML(item.permissible_limit)}</strong></article>`).join('') : '<article class="safety-alert"><h3>No flagged signal returned</h3><p>Still use a certified laboratory test for the source you drink from.</p></article>';
  const trends = location.depth_trends || [];
  $('#safety-depth').innerHTML = trends.length ? trends.map((trend) => `<div><strong>${escapeHTML(trend.season)}</strong><p>${escapeHTML(trend.depth_summary)}</p></div>`).join('') : '<div><strong>No depth trend indexed</strong><p>Use the local groundwater brief and field observations.</p></div>';
}

async function getAssessment(location, audience) {
  const place = `${location.nearest_block}, ${location.detected_district}, ${location.detected_state}`;
  const response = await fetch('/api/assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: place, audience }) });
  if (!response.ok) throw new Error('Groundwater assessment unavailable.');
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function getCropAdvice(stateName) {
  const response = await fetch('/api/suggestor/crops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state_name: stateName }) });
  if (!response.ok) throw new Error('Crop recommendations unavailable.');
  return response.json();
}

function renderWeatherDays(target, days = []) {
  target.innerHTML = days.slice(0, 7).map((day) => `<div><span>${shortDay(day.date)}</span><strong>${Math.round(day.temp_max_c)}°</strong><small>${day.rain_mm} mm</small></div>`).join('') || '<p>Forecast detail is temporarily unavailable.</p>';
}

function renderQualityChips(items = []) {
  const flagged = items.filter((item) => Number(item.pct_above_limit) > 0).slice(0, 4);
  return flagged.length ? `<div class="quality-inline">${flagged.map((item) => `<span>${escapeHTML(item.parameter)} · ${escapeHTML(item.pct_above_limit)}%</span>`).join('')}</div>` : '<p>No flagged state-level signal returned.</p>';
}

function setStatusChip(target, value) {
  if (!target) return;
  const label = String(value || 'Status pending');
  const normalized = label.toLowerCase();
  target.className = 'status-chip';
  if (normalized.includes('safe') || normalized.includes('balanced')) target.classList.add('status-safe');
  else if (normalized.includes('semi') || normalized.includes('moderate')) target.classList.add('status-semi');
  else if (normalized.includes('critical')) target.classList.add('status-critical');
  else if (normalized.includes('over') || normalized.includes('pause')) target.classList.add('status-over');
  target.textContent = label;
}

function shortDay(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));
}

function weatherIcon(condition = '') {
  const text = condition.toLowerCase();
  if (text.includes('thunder')) return 'ϟ';
  if (text.includes('rain') || text.includes('drizzle')) return '☂';
  if (text.includes('cloud') || text.includes('overcast')) return '☁';
  return '☀';
}

function initRecharge() {
  const form = $('#recharge-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const area = Number($('#recharge-area').value);
    const stateName = $('#recharge-state').value;
    const result = $('#recharge-result');
    if (!area) return;
    result.classList.add('is-loading');
    try {
      const response = await fetch('/api/suggestor/rwh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rooftop_area_sqft: area, state_name: stateName }) });
      const data = await response.json();
      if (!response.ok) throw new Error('Recharge estimate unavailable.');
      result.innerHTML = `<p class="result-label">ESTIMATED ANNUAL CAPTURE</p><p class="result-number">${formatNumber(data.annual_harvestable_liters)} <span>L</span></p><p class="result-detail">from a ${formatNumber(area)} sq ft roof in ${escapeHTML(stateName)}</p><div class="result-stats"><div><span>Suggested storage</span><strong>${formatNumber(data.recommended_tank_capacity_liters)} L</strong></div><div><span>Family supply equivalent</span><strong>${formatNumber(data.equivalent_family_days)} days</strong></div></div>`;
    } catch (error) {
      result.innerHTML = '<p>The estimate is unavailable. Check that the server is running.</p>';
    } finally { result.classList.remove('is-loading'); }
  });
}

function initChat() {
  const form = $('#chat-form');
  if (!form) return;
  const input = $('#chat-input');
  const submit = form.querySelector('button[type="submit"]');
  const messages = $('#chat-messages');
  const refreshLocation = $('#chat-location-refresh');
  initAtlasTabs();
  initVoiceInput(input);
  initFactsheetDialog();
  resolveChatLocation();
  refreshLocation.addEventListener('click', resolveChatLocation);
  $('#print-evidence').addEventListener('click', () => window.print());
  const ask = async (question) => {
    const message = String(question || input.value).trim();
    if (!message) return;
    appendChatMessage(messages, 'user', message);
    input.value = '';
    submit.disabled = true;
    const thinking = appendThinking(messages);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: appState.chatHistory.slice(-6),
          language: $('#chat-language').value,
          current_location: appState.chatLocation
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'I.G.R.I.S. could not answer that question right now.');
      thinking.remove();
      const reply = data.reply || 'I could not form an answer from the available data.';
      appendChatMessage(messages, 'assistant', reply);
      appState.chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
      renderVisualizationCanvas(data.visualization, data.source);
    } catch (error) {
      thinking.remove();
      appendChatMessage(messages, 'assistant', error.message || 'The chat service is unavailable. Please try again.');
    } finally {
      submit.disabled = false;
      input.focus();
    }
  };
  form.addEventListener('submit', (event) => { event.preventDefault(); ask(); });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(); } });
  document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => ask(button.dataset.question)));
  $('#chat-clear').addEventListener('click', () => {
    appState.chatHistory = [];
    messages.innerHTML = '<article class="chat-message assistant-message"><span class="message-avatar">I</span><div><p class="message-label">I.G.R.I.S.</p><p>New conversation started. What groundwater decision can I help with?</p></div></article>';
    $('#visualization-canvas').innerHTML = '<div class="canvas-empty"><div class="empty-orbit"><span></span><i></i><b></b></div><h3>Your visual answer appears here</h3><p>Ask about a state, district or location to explore extraction, recharge, water quality and weather together.</p></div>';
    $('#canvas-count').textContent = '128 visual recipes';
    $('#canvas-footnote').textContent = 'Visuals are generated from the data relevant to your question.';
    input.focus();
  });
}

function initVoiceInput(input) {
  const button = $('#chat-voice');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { button.hidden = true; return; }
  const recognition = new SpeechRecognition();
  recognition.interimResults = false;
  recognition.addEventListener('start', () => { button.textContent = 'Listening…'; button.classList.add('is-listening'); });
  recognition.addEventListener('end', () => { button.textContent = 'Speak'; button.classList.remove('is-listening'); });
  recognition.addEventListener('result', (event) => { input.value = event.results[0][0].transcript; input.focus(); });
  button.addEventListener('click', () => { recognition.lang = $('#chat-language').value === 'hi' ? 'hi-IN' : 'en-IN'; recognition.start(); });
}

function initFactsheetDialog() {
  const dialog = $('#factsheet-dialog');
  const image = $('#factsheet-dialog-image');
  let zoom = 1;
  const applyZoom = () => { image.style.width = `${zoom * 100}%`; };
  $('#factsheet-dialog-close').addEventListener('click', () => dialog.close());
  $('#factsheet-zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom + .25); applyZoom(); });
  $('#factsheet-zoom-out').addEventListener('click', () => { zoom = Math.max(.5, zoom - .25); applyZoom(); });
  $('#factsheet-zoom-reset').addEventListener('click', () => { zoom = 1; applyZoom(); });
  dialog.addEventListener('close', () => { zoom = 1; applyZoom(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

async function resolveChatLocation() {
  const container = $('#chat-location-context');
  const label = $('#chat-location-label');
  container.className = 'location-context';
  label.textContent = 'Finding your current area…';
  try {
    const context = await fetchGpsContext();
    appState.chatLocation = context;
    const location = context.location || {};
    label.textContent = [location.selected_locality || location.nearest_block, location.detected_district, location.detected_state].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(', ');
    container.classList.add('is-ready');
  } catch (error) {
    appState.chatLocation = null;
    label.textContent = 'Location off — name a place in your question';
    container.classList.add('is-error');
  }
}

function initAtlasTabs() {
  document.querySelectorAll('[data-atlas-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-atlas-view]').forEach((item) => item.classList.toggle('active', item === button));
      $('#visualization-canvas').dataset.activeView = button.dataset.atlasView;
    });
  });
}

function appendChatMessage(container, role, message) {
  const article = document.createElement('article');
  article.className = `chat-message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  const body = role === 'assistant' ? formatAssistantMessage(message) : `<p>${escapeHTML(message)}</p>`;
  article.innerHTML = `<span class="message-avatar">${role === 'user' ? 'You' : 'I'}</span><div>${role === 'assistant' ? '<p class="message-label">I.G.R.I.S.</p>' : ''}${body}</div>`;
  container.append(article);
  container.scrollTop = container.scrollHeight;
}

function formatAssistantMessage(message) {
  const lines = escapeHTML(message).replace(/\r/g, '').split('\n');
  const output = [];
  let listOpen = false;
  const closeList = () => { if (listOpen) { output.push('</ul>'); listOpen = false; } };
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line === '---') { closeList(); return; }
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (heading) {
      closeList();
      output.push(`<h3>${formatInlineMarkdown(heading[1])}</h3>`);
    } else if (bullet) {
      if (!listOpen) { output.push('<ul>'); listOpen = true; }
      output.push(`<li>${formatInlineMarkdown(bullet[1])}</li>`);
    } else {
      closeList();
      output.push(`<p>${formatInlineMarkdown(line)}</p>`);
    }
  });
  closeList();
  return output.join('');
}

function formatInlineMarkdown(value) {
  return value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
}

function appendThinking(container) {
  const article = document.createElement('article');
  article.className = 'chat-message assistant-message chat-thinking';
  article.innerHTML = '<span class="message-avatar">I</span><div><i></i><i></i><i></i></div>';
  container.append(article);
  container.scrollTop = container.scrollHeight;
  return article;
}

function renderVisualizationCanvas(payload, source) {
  const canvas = $('#visualization-canvas');
  const count = $('#canvas-count');
  if (!payload) {
    canvas.innerHTML = '<div class="canvas-empty"><h3>No location-specific visual for this question</h3><p>Try naming a state, district, block or city so I.G.R.I.S. can bring the relevant evidence into view.</p></div>';
    count.textContent = '0 views';
    return;
  }
  const registry = { state_analytics: renderStateVisuals, block_card: renderBlockVisuals, national_summary: renderNationalVisuals };
  const cards = (registry[payload.type] || renderFallbackVisuals)(payload);
  canvas.dataset.activeView = 'overview';
  document.querySelectorAll('[data-atlas-view]').forEach((button) => button.classList.toggle('active', button.dataset.atlasView === 'overview'));
  canvas.innerHTML = cards.join('');
  bindFactsheetControls(canvas);
  const recipeCount = payload.visual_catalog?.recipe_count || 128;
  count.textContent = `${cards.length} views · ${recipeCount} recipes`;
  $('#canvas-footnote').textContent = String(source || '').toLowerCase().includes('lmstudio') ? 'Interpretation is generated with I.G.R.I.S.; visual evidence is grounded in the indexed source data.' : 'The response used I.G.R.I.S. grounded hydro-engine guidance; visual evidence remains source-backed.';
}

function bindFactsheetControls(canvas) {
  canvas.querySelectorAll('.source-sheet-card').forEach((card) => {
    const select = card.querySelector('.source-page-select');
    const image = card.querySelector('img');
    const loading = card.querySelector('.source-loading');
    const description = card.querySelector('.source-sheet-header p:last-child');
    const expand = card.querySelector('.source-expand');
    const finishLoading = () => { loading.hidden = true; };
    image.addEventListener('load', finishLoading);
    image.addEventListener('error', () => { loading.hidden = false; loading.textContent = 'The official page preview is unavailable.'; });
    select.addEventListener('change', () => {
      const option = select.options[select.selectedIndex];
      loading.hidden = false;
      loading.textContent = 'Loading official page…';
      description.textContent = option.dataset.label;
      image.src = select.value;
      image.alt = `${option.textContent} of the official CGWB groundwater fact sheet`;
    });
    expand.addEventListener('click', () => {
      $('#factsheet-dialog-title').textContent = `${card.querySelector('h3').textContent} · ${description.textContent}`;
      $('#factsheet-dialog-image').src = image.src;
      $('#factsheet-dialog-image').alt = image.alt;
      $('#factsheet-dialog').showModal();
    });
  });
}

function visualCard(kicker, title, body, view = 'overview', span = '') { return `<section class="visual-card" data-view="${escapeHTML(view)}"${span ? ` data-span="${escapeHTML(span)}"` : ''}><p class="visual-kicker">${escapeHTML(kicker)}</p><h3>${escapeHTML(title)}</h3>${body}</section>`; }
function statusClass(value = '') { const status = value.toLowerCase().replace(/\s+/g, '-'); return status.includes('safe') ? 'safe' : status.includes('critical') || status.includes('over') ? 'critical' : ''; }
function plural(value, word) { return `${formatNumber(value)} ${word}${Number(value) === 1 ? '' : 's'}`; }
function safeEntries(object = {}) { return Object.entries(object).filter(([, value]) => Number(value) >= 0); }

function renderStateVisuals(payload) {
  const metrics = payload.metrics || {};
  const stage = Number(metrics.stage_of_extraction || 0);
  const resourceMax = Math.max(Number(metrics.total_recharge_bcm || 0), Number(metrics.total_extraction_bcm || 0), 1);
  const sector = payload.donut_chart || { labels: [], data: [] };
  const sectorTotal = sector.data.reduce((total, value) => total + Number(value || 0), 0) || 1;
  const colors = ['#187f73', '#e0764e', '#e8b24d'];
  let cursor = 0;
  const stops = sector.data.map((value, index) => { const start = cursor; cursor += (Number(value || 0) / sectorTotal) * 100; return `${colors[index % colors.length]} ${start}% ${cursor}%`; }).join(', ');
  const category = safeEntries(payload.category_breakdown);
  const categoryMax = Math.max(...category.map(([, value]) => Number(value)), 1);
  const cards = [
    visualCard('OFFICIAL STATE PROFILE', payload.title, `<div class="metric-grid"><div class="metric-tile"><span>Stage of extraction</span><strong>${stage.toFixed(1)}%</strong></div><div class="metric-tile"><span>Future availability</span><strong>${Number(metrics.future_available_bcm || 0).toFixed(1)} BCM</strong></div><div class="metric-tile"><span>Annual recharge</span><strong>${Number(metrics.total_recharge_bcm || 0).toFixed(1)} BCM</strong></div><div class="metric-tile"><span>Annual extraction</span><strong>${Number(metrics.total_extraction_bcm || 0).toFixed(1)} BCM</strong></div></div>`, 'overview', 'wide'),
    visualCard('EXTRACTION PRESSURE', 'How hard is groundwater being used?', `<div class="gauge-wrap"><div class="liquid-gauge" style="--gauge:${Math.min(stage, 100)}"><strong>${stage.toFixed(0)}%</strong></div><div class="gauge-copy"><strong>${stage >= 100 ? 'Demand is above recharge' : stage >= 70 ? 'Use is approaching a caution zone' : 'Use remains comparatively balanced'}</strong><p>Stage of extraction compares annual groundwater extraction with available recharge.</p></div></div>`, 'resource'),
    visualCard('RESOURCE BALANCE', 'Recharge versus extraction', `<div class="comparison-bars"><div class="comparison-row"><span>Recharge</span><div class="comparison-track"><i class="comparison-fill" style="width:${(Number(metrics.total_recharge_bcm || 0) / resourceMax) * 100}%"></i></div><strong>${Number(metrics.total_recharge_bcm || 0).toFixed(1)}</strong></div><div class="comparison-row"><span>Extraction</span><div class="comparison-track"><i class="comparison-fill" style="width:${(Number(metrics.total_extraction_bcm || 0) / resourceMax) * 100}%"></i></div><strong>${Number(metrics.total_extraction_bcm || 0).toFixed(1)}</strong></div></div><p class="source-note">Values in BCM (billion cubic metres).</p>`, 'resource')
  ];
  if (sector.labels.length) cards.push(visualCard('WHERE WATER GOES', 'Extraction by use', `<div class="donut-layout"><div class="sector-donut" style="background:conic-gradient(${stops})"></div><ul class="legend-list">${sector.labels.map((label, index) => `<li><i class="legend-dot" style="background:${colors[index % colors.length]}"></i>${escapeHTML(label)} · ${Number(sector.data[index] || 0).toFixed(1)} BCM</li>`).join('')}</ul></div>`, 'resource'));
  if (category.length) cards.push(visualCard('ASSESSMENT UNITS', 'How blocks are classified', `<div class="distribution-list">${category.map(([label, value]) => `<div class="distribution-row"><span>${escapeHTML(label)}</span><div class="distribution-bar"><i style="width:${(Number(value) / categoryMax) * 100}%"></i></div><strong>${formatNumber(value)}</strong></div>`).join('')}</div>`, 'resource'));
  cards.push(...renderQualityAndTrends(payload));
  cards.push(...renderWeatherVisuals(payload.weather));
  cards.push(...renderFactsheetVisual(payload.factsheet));
  return cards;
}

function renderBlockVisuals(payload) {
  const cards = [visualCard('OFFICIAL ASSESSMENT UNIT', payload.title, `<div class="block-hero"><p class="visual-kicker">GROUNDWATER CATEGORY</p><h3>${escapeHTML(payload.block_name || 'Selected block')}</h3><span class="status-pill ${statusClass(payload.category)}">${escapeHTML(payload.category || 'Status pending')}</span><p class="source-note">${escapeHTML(payload.district_name || '')}, ${escapeHTML(payload.state_name || '')}</p></div>`, 'overview', 'wide')];
  cards.push(visualCard('DECISION PATHWAY', 'Before drilling or expanding extraction', '<div class="decision-path"><div class="decision-step"><b>1</b><span>Confirm the official assessment unit and its current category.</span></div><div class="decision-step"><b>2</b><span>Check the applicable CGWA or state permission process for the intended use.</span></div><div class="decision-step"><b>3</b><span>Complete a local yield and water-quality test before investment.</span></div><div class="decision-step"><b>4</b><span>Compare recharge obligations, energy cost and sustainable yield before deciding profitability.</span></div></div>', 'overview'));
  if (payload.state_profile) cards.push(...renderStateVisuals(payload.state_profile));
  cards.push(...renderWeatherVisuals(payload.weather));
  return cards;
}

function renderNationalVisuals(payload) {
  const metrics = payload.metrics || {};
  const pie = payload.category_pie || { labels: [], data: [] };
  const total = pie.data.reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const colors = ['#1b887b', '#e9b04d', '#e77a51', '#cf5142'];
  let cursor = 0;
  const stops = pie.data.map((value, index) => { const start = cursor; cursor += Number(value || 0) / total * 100; return `${colors[index] || '#8ba'} ${start}% ${cursor}%`; }).join(', ');
  return [
    visualCard('GWRA-2025 · INDIA', payload.title, `<div class="metric-grid"><div class="metric-tile"><span>Assessment units</span><strong>${formatNumber(metrics.total_blocks)}</strong></div><div class="metric-tile"><span>Safe units</span><strong>${formatNumber(metrics.safe_blocks)}</strong></div><div class="metric-tile"><span>Over-exploited</span><strong>${formatNumber(metrics.over_exploited_blocks)}</strong></div><div class="metric-tile"><span>Annual recharge</span><strong>${Number(metrics.total_recharge_bcm || 0).toFixed(0)} BCM</strong></div></div>`),
    visualCard('NATIONAL PATTERN', 'Assessment category mix', `<div class="donut-layout"><div class="sector-donut" style="background:conic-gradient(${stops})"></div><ul class="legend-list">${pie.labels.map((label, index) => `<li><i class="legend-dot" style="background:${colors[index]}"></i>${escapeHTML(label)} · ${formatNumber(pie.data[index])}</li>`).join('')}</ul></div>`)
  ];
}

function renderQualityAndTrends(payload) {
  const cards = [];
  const quality = (payload.water_quality || []).filter((item) => Number(item.pct_above_limit) > 0).slice(0, 4);
  if (quality.length) {
    const maxSignal = Math.max(...quality.map((item) => Number(item.pct_above_limit)), 1);
    cards.push(visualCard('GROUNDWATER QUALITY MATRIX', 'What the state samples flagged', `<table class="quality-matrix"><thead><tr><th>Parameter</th><th>Samples</th><th>Limit</th><th>Above</th></tr></thead><tbody>${quality.map((item) => `<tr><td>${escapeHTML(item.parameter)}</td><td>${formatNumber(item.num_samples)}</td><td>${escapeHTML(item.permissible_limit)}</td><td>${Number(item.pct_above_limit).toFixed(1)}%</td></tr>`).join('')}</tbody></table><p class="source-note">Regional screening signal only — test the individual source before drinking decisions.</p>`, 'quality', 'wide'));
    cards.push(visualCard('CONTAMINANT CONSTELLATION', 'Relative screening signals', `<div class="contaminant-cloud">${quality.map((item) => { const size = 54 + (Number(item.pct_above_limit) / maxSignal) * 48; return `<div class="contaminant-orb" style="--size:${size.toFixed(0)}px"><span>${escapeHTML(item.parameter)}<br>${Number(item.pct_above_limit).toFixed(1)}%</span></div>`; }).join('')}</div>`, 'quality'));
  }
  const trends = (payload.depth_trends || []).slice(0, 4);
  if (trends.length) cards.push(visualCard('DEPTH OBSERVATIONS', 'Seasonal groundwater context', `<div class="trend-list">${trends.map((trend) => `<div class="trend-item"><strong>${escapeHTML(trend.season)}</strong><span>${escapeHTML(trend.depth_summary)}</span></div>`).join('')}</div>`, 'depth', 'wide'));
  return cards;
}

function renderWeatherVisuals(weather) {
  if (!weather) return [];
  const days = (weather.daily_forecast || []).slice(0, 7);
  const cards = [visualCard('LIVE LOCAL CONDITIONS', `${Math.round(weather.temperature_c || 0)}°C · ${weather.condition || 'Current weather'}`, `<div class="metric-grid"><div class="metric-tile"><span>Rain, next 7 days</span><strong>${Number(weather.rain_next_7_days_mm || 0).toFixed(1)} mm</strong></div><div class="metric-tile"><span>Evapotranspiration</span><strong>${Number(weather.avg_evapotranspiration_mm_day || 0).toFixed(1)} mm/day</strong></div></div>${weather.smart_irrigation ? `<ul class="action-list"><li><strong>${escapeHTML(weather.smart_irrigation.status)}</strong> — ${escapeHTML(weather.smart_irrigation.action)}</li><li>${escapeHTML(weather.smart_irrigation.advice)}</li></ul>` : ''}`, 'resource')];
  if (days.length) cards.push(visualCard('7-DAY OUTLOOK', 'Rain and daytime temperature', `<div class="weather-strip">${days.map((day) => `<div class="weather-day"><span>${escapeHTML(shortDay(day.date))}</span><strong>${Math.round(day.temp_max_c)}°</strong><small>${Number(day.rain_mm || 0).toFixed(1)} mm</small></div>`).join('')}</div><p class="source-note">Forecast context from Open-Meteo; use it for planning, not hazard warnings.</p>`, 'resource', 'wide'));
  return cards;
}

function renderFactsheetVisual(factsheet) {
  if (!factsheet?.pages?.length) return [];
  const firstPage = factsheet.pages[0];
  return [`<section class="visual-card source-sheet-card" data-view="source" data-span="wide"><div class="source-sheet-header"><div><p class="visual-kicker">ORIGINAL CGWB FACT SHEET · 2025</p><h3>${escapeHTML(factsheet.state_name)}</h3><p>${escapeHTML(firstPage.label)}</p></div><div class="source-sheet-actions"><select class="source-page-select" aria-label="Choose fact sheet page">${factsheet.pages.map((page) => `<option value="${escapeHTML(page.image_url)}" data-label="${escapeHTML(page.label)}">Page ${page.number} · ${escapeHTML(page.label)}</option>`).join('')}</select><button class="source-expand" type="button">Open full sheet</button></div></div><div class="source-sheet-frame"><span class="source-loading">Loading official page…</span><img src="${escapeHTML(firstPage.image_url)}" alt="Page 1 of the ${escapeHTML(factsheet.state_name)} CGWB groundwater fact sheet" loading="lazy"></div></section>`];
}

function renderFallbackVisuals(payload) { return [visualCard('DATA VIEW', payload.title || 'Relevant evidence', '<p class="source-note">I.G.R.I.S. found supporting data, but this question does not yet have a specialised visual template.</p>')]; }
