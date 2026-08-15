const state = { language: 'en', searchTimer: null, registryTimer: null };

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const categoryClass = (category = '') => `tag-${category.toLowerCase().replace(/[^a-z]+/g, '-')}`;

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadNationalPulse();
});

function bindEvents() {
  $('#assessment-form').addEventListener('submit', submitAssessment);
  $('#assessment-location').addEventListener('input', handleLocationInput);
  $('#registry-search').addEventListener('input', handleRegistryInput);
  $('#rwh-form').addEventListener('submit', calculateRainwater);
  $('#chat-form').addEventListener('submit', submitChat);
  $('#language-toggle').addEventListener('click', toggleLanguage);
  $('#use-location').addEventListener('click', useDeviceLocation);

  document.querySelectorAll('[data-example]').forEach((button) => button.addEventListener('click', () => {
    $('#assessment-location').value = button.dataset.example;
    requestAssessment();
  }));

  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
    $('#chat-input').value = button.dataset.prompt;
    $('#ask').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#chat-input').focus();
  }));

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.location-input-wrap')) hideLocationSuggestions();
  });
}

async function loadNationalPulse() {
  try {
    const response = await fetch('/api/stats/national');
    if (!response.ok) throw new Error('National data unavailable');
    const data = await response.json();
    $('#blocks-count').textContent = formatNumber(data.total_blocks);
    $('#registry-count').textContent = `${formatNumber(data.total_blocks)} units`;
    $('#national-soe').textContent = `${data.national_soe_pct}%`;
    $('#national-recharge').textContent = `${data.national_recharge_bcm} BCM`;
    $('#national-extraction').textContent = `${data.national_extraction_bcm} BCM`;
    requestAnimationFrame(() => { $('#resource-bar-fill').style.width = `${Math.min(Number(data.national_soe_pct), 100)}%`; });
  } catch (error) {
    console.warn(error);
  }
}

function handleLocationInput(event) {
  const query = event.target.value.trim();
  clearTimeout(state.searchTimer);
  if (query.length < 2) return hideLocationSuggestions();
  state.searchTimer = setTimeout(() => searchLocations(query), 250);
}

async function searchLocations(query) {
  try {
    const response = await fetch(`/api/blocks?query=${encodeURIComponent(query)}&limit=5`);
    if (!response.ok) throw new Error('Search unavailable');
    const matches = await response.json();
    renderLocationSuggestions(matches);
  } catch (error) {
    console.warn(error);
    hideLocationSuggestions();
  }
}

function renderLocationSuggestions(matches) {
  const container = $('#location-suggestions');
  if (!matches.length) return hideLocationSuggestions();
  container.innerHTML = matches.map((match) => `
    <button class="suggestion-option" type="button" data-location="${escapeHTML(`${match.block_name}, ${match.district_name}, ${match.state_name}`)}">
      <strong>${escapeHTML(match.block_name)}</strong><span>${escapeHTML(match.district_name)}, ${escapeHTML(match.state_name)}</span>
    </button>
  `).join('');
  container.classList.add('is-visible');
  container.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
    $('#assessment-location').value = button.dataset.location;
    hideLocationSuggestions();
    requestAssessment();
  }));
}

function hideLocationSuggestions() {
  const container = $('#location-suggestions');
  container.classList.remove('is-visible');
  container.innerHTML = '';
}

function submitAssessment(event) {
  event.preventDefault();
  requestAssessment();
}

async function requestAssessment() {
  const location = $('#assessment-location').value.trim();
  const audience = $('input[name="audience"]:checked').value;
  if (!location) return;

  const form = $('#assessment-form');
  const button = form.querySelector('[type="submit"]');
  form.classList.add('is-loading');
  button.innerHTML = 'Building brief <span>…</span>';
  hideLocationSuggestions();

  try {
    const response = await fetch('/api/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, audience })
    });
    let assessment = await response.json();
    if (response.status === 405) {
      assessment = await buildCompatibilityAssessment(location, audience);
    }
    if (!response.ok && response.status !== 405 || assessment.error) throw new Error(assessment.error || 'Unable to create this brief.');
    renderDecisionBrief(assessment);
  } catch (error) {
    renderAssessmentError(error.message);
  } finally {
    form.classList.remove('is-loading');
    button.innerHTML = 'Create brief <span>→</span>';
  }
}

async function buildCompatibilityAssessment(location, audience) {
  const searchTerm = location.split(',')[0].trim();
  const blockResponse = await fetch(`/api/blocks?query=${encodeURIComponent(searchTerm)}&limit=1`);
  const matches = await blockResponse.json();
  if (!matches.length) throw new Error('No assessment unit matched that location. Try the block name, district, and state together.');
  const block = matches[0];
  const stateResponse = await fetch(`/api/states/${encodeURIComponent(block.state_name)}`);
  const stateData = await stateResponse.json();
  const profiles = {
    'Safe': ['Proceed with safeguards', 'low', 'This assessment unit is classified as Safe in GWRA-2025. Keep extraction efficient so the aquifer remains within sustainable limits.', 'Measure pumping hours and fix leaks before adding capacity.', 'Capture rooftop runoff to replenish the local aquifer.'],
    'Semi-Critical': ['Proceed cautiously', 'medium', 'This assessment unit is Semi-Critical. Groundwater demand is approaching the sustainable limit and any expansion should reduce demand and add recharge first.', 'Prefer drip or sprinkler irrigation over flood irrigation.', 'Add recharge pits or trenches before increasing pumping capacity.'],
    'Critical': ['Protect first, expand later', 'high', 'This assessment unit is Critical. Extraction is near the sustainable limit, so new groundwater dependence carries material risk.', 'Avoid increasing extraction until a recharge and demand-reduction plan is in place.', 'Use alternative sources, treated reuse, or stored rainwater where feasible.'],
    'Over-Exploited': ['Do not expand extraction', 'critical', 'This assessment unit is Over-Exploited: groundwater use exceeds the replenishable resource. Prioritise conservation, recharge, and alternative sources over a new borewell.', 'Do not plan new non-essential extraction without checking the applicable CGWA and local requirements.', 'Shift irrigation to low-water crops and micro-irrigation; avoid flood irrigation.']
  };
  const profile = profiles[block.category] || profiles.Safe;
  const audienceAction = {
    farmer: 'Match irrigation to soil moisture and rainfall; a larger pump does not create more sustainable water.',
    resident: 'Use a certified laboratory test for drinking water and keep roof runoff separate from potable storage unless treated.',
    business: 'Prepare a water balance showing reduction, reuse, recharge, and source alternatives before seeking approvals.',
    officer: 'Prioritise demand management and recharge works in the most stressed units; track outcomes before the next assessment cycle.'
  };
  return {
    location: { block: block.block_name, district: block.district_name, state: block.state_name }, classification: block.category, verdict: profile[0], severity: profile[1], summary: profile[2],
    actions: [profile[3], profile[4], 'Test drinking water before consumption; quantity status does not certify quality.', audienceAction[audience]], audience,
    state_metrics: { stage_of_extraction_pct: stateData.stage_of_extraction_pct, annual_recharge_bcm: stateData.total_annual_recharge, annual_extraction_bcm: stateData.total_annual_extraction },
    quality_alerts: (stateData.water_quality || []).filter((item) => Number(item.pct_above_limit) > 0).slice(0, 3).map((item) => ({ parameter: item.parameter, above_limit_pct: item.pct_above_limit, limit: item.permissible_limit })),
    depth_trends: (stateData.depth_trends || []).slice(0, 2),
    evidence: { assessment: 'CGWB Ground Water Resource Assessment 2025 (GEC-2015)', quality_note: 'Water-quality signals are state-level indicators and must not be treated as an exact well-level test.', decision_note: 'This is a screening brief, not a statutory clearance or a substitute for a local hydrogeological survey.' }
  };
}

function renderDecisionBrief(data) {
  const brief = $('#decision-brief');
  const metrics = data.state_metrics || {};
  const quality = data.quality_alerts || [];
  const depth = data.depth_trends || [];
  const qualityMarkup = quality.length
    ? quality.map((alert) => `<li><strong>${escapeHTML(alert.parameter)}</strong><span>${escapeHTML(alert.above_limit_pct)}% samples above ${escapeHTML(alert.limit)}</span></li>`).join('')
    : '<li><span>No state-level exceedance signal was returned for the indexed parameters.</span></li>';
  const depthMarkup = depth.length
    ? depth.map((trend) => `<li><strong>${escapeHTML(trend.season)}</strong><span>${escapeHTML(trend.depth_summary)}</span></li>`).join('')
    : '';

  brief.innerHTML = `
    <header class="brief-header">
      <div><p class="brief-kicker">GROUNDWATER DECISION BRIEF · ${escapeHTML(data.evidence.assessment)}</p><h3>${escapeHTML(data.location.block)}</h3><p class="brief-place">${escapeHTML(data.location.district)}, ${escapeHTML(data.location.state)} · Assessment unit</p></div>
      <span class="verdict severity-${escapeHTML(data.severity)}">${escapeHTML(data.verdict)}</span>
    </header>
    <div class="brief-content">
      <div class="brief-main"><p>${escapeHTML(data.summary)}</p><ol class="action-list">${data.actions.map((action) => `<li>${escapeHTML(action)}</li>`).join('')}</ol></div>
      <aside class="brief-context">
        <p class="context-title">WHAT THIS BRIEF USED</p>
        <div class="context-metrics"><div><span>Official classification</span><strong>${escapeHTML(data.classification)}</strong></div><div><span>State stage of extraction</span><strong>${metrics.stage_of_extraction_pct ?? '—'}%</strong></div><div><span>State annual recharge</span><strong>${metrics.annual_recharge_bcm ?? '—'} BCM</strong></div><div><span>State annual extraction</span><strong>${metrics.annual_extraction_bcm ?? '—'} BCM</strong></div></div>
        <div class="quality-card"><p class="context-title">STATE-LEVEL QUALITY SIGNALS</p><ul>${qualityMarkup}</ul>${depthMarkup ? `<p class="context-title depth-title">SEASONAL DEPTH CONTEXT</p><ul>${depthMarkup}</ul>` : ''}</div>
        <p class="context-note">${escapeHTML(data.evidence.quality_note)}</p>
      </aside>
    </div>
    <footer class="brief-footer"><span>${escapeHTML(data.evidence.decision_note)}</span><span>Audience: ${escapeHTML(data.audience)}</span></footer>
  `;
  $('#assessment-empty').hidden = true;
  brief.hidden = false;
  brief.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAssessmentError(message) {
  const brief = $('#decision-brief');
  brief.innerHTML = `<div class="brief-header"><div><p class="brief-kicker">LOCATION NOT FOUND</p><h3>Try a more specific place.</h3><p class="brief-place">${escapeHTML(message)}</p></div></div>`;
  $('#assessment-empty').hidden = true;
  brief.hidden = false;
}

function handleRegistryInput(event) {
  const query = event.target.value.trim();
  clearTimeout(state.registryTimer);
  if (query.length < 2) {
    $('#registry-results').innerHTML = '<p class="registry-placeholder">Start typing to search official assessment units.</p>';
    return;
  }
  state.registryTimer = setTimeout(() => searchRegistry(query), 250);
}

async function searchRegistry(query) {
  const resultBox = $('#registry-results');
  resultBox.innerHTML = '<p class="registry-placeholder">Searching the registry…</p>';
  try {
    const response = await fetch(`/api/blocks?query=${encodeURIComponent(query)}&limit=6`);
    if (!response.ok) throw new Error('Registry search unavailable');
    const matches = await response.json();
    if (!matches.length) {
      resultBox.innerHTML = '<p class="registry-placeholder">No units matched. Try a district name or add the state.</p>';
      return;
    }
    resultBox.innerHTML = matches.map((match) => `
      <button class="registry-item" type="button" data-location="${escapeHTML(`${match.block_name}, ${match.district_name}, ${match.state_name}`)}">
        <strong>${escapeHTML(match.block_name)}</strong><span>${escapeHTML(match.district_name)}, ${escapeHTML(match.state_name)}</span><i class="category-tag ${categoryClass(match.category)}">${escapeHTML(match.category)}</i>
      </button>
    `).join('');
    resultBox.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
      $('#assessment-location').value = button.dataset.location;
      $('#assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAssessment();
    }));
  } catch (error) {
    resultBox.innerHTML = '<p class="registry-placeholder">The registry is unavailable. Check that the server is running.</p>';
  }
}

async function calculateRainwater(event) {
  event.preventDefault();
  const area = Number($('#rwh-area').value);
  const stateName = $('#rwh-state').value;
  const result = $('#rwh-result');
  if (!area || area < 1) return;
  result.classList.add('is-loading');
  try {
    const response = await fetch('/api/suggestor/rwh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooftop_area_sqft: area, state_name: stateName })
    });
    if (!response.ok) throw new Error('Calculator unavailable');
    const data = await response.json();
    result.innerHTML = `<p class="result-label">ESTIMATED ANNUAL CAPTURE</p><p class="result-amount">${formatNumber(data.annual_harvestable_liters)} L</p><p class="result-detail">from a ${formatNumber(area)} sq ft roof in ${escapeHTML(stateName)}</p><div class="result-stats"><div><span>Suggested storage</span><strong>${formatNumber(data.recommended_tank_capacity_liters)} L</strong></div><div><span>Family supply</span><strong>${formatNumber(data.equivalent_family_days)} days</strong></div></div>`;
  } catch (error) {
    result.innerHTML = '<span class="water-symbol">!</span><p>The calculator is unavailable. Check that the server is running.</p>';
  } finally {
    result.classList.remove('is-loading');
  }
}

function toggleLanguage() {
  state.language = state.language === 'en' ? 'hi' : 'en';
  $('#language-toggle').textContent = state.language === 'en' ? 'हिंदी' : 'English';
  $('#chat-input').placeholder = state.language === 'en' ? 'Ask a groundwater question…' : 'भूजल से जुड़ा सवाल पूछें…';
}

async function useDeviceLocation() {
  if (!navigator.geolocation) return renderAssessmentError('Your browser does not support location services. Search a block or district instead.');
  const button = $('#use-location');
  button.textContent = 'Locating…';
  button.classList.add('is-loading');
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const response = await fetch(`/api/location/resolve?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
      if (!response.ok) throw new Error('Location resolution failed');
      const location = await response.json();
      $('#assessment-location').value = `${location.nearest_block}, ${location.detected_district}, ${location.detected_state}`;
      $('#assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAssessment();
    } catch (error) {
      renderAssessmentError('We could not match the GPS point. Search your block or district instead.');
    } finally {
      button.textContent = 'Use my location';
      button.classList.remove('is-loading');
    }
  }, () => {
    button.textContent = 'Use my location';
    button.classList.remove('is-loading');
    renderAssessmentError('Location access was not granted. Search your block or district instead.');
  }, { enableHighAccuracy: true, timeout: 8000 });
}

async function submitChat(event) {
  event.preventDefault();
  const input = $('#chat-input');
  const message = input.value.trim();
  if (!message) return;
  appendChatMessage('user', message);
  input.value = '';
  const loading = appendChatMessage('assistant', 'Reading the assessment data…');
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language: /[\u0900-\u097F]/.test(message) ? 'hi' : state.language })
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Chat unavailable');
    loading.querySelector('p').textContent = data.reply;
    loading.querySelector('span').textContent = data.source || 'IGRIS';
  } catch (error) {
    loading.querySelector('p').textContent = 'I can’t reach the response service right now. The local decision brief and recharge calculator still work when the server is available.';
  }
  $('#chat-feed').scrollTop = $('#chat-feed').scrollHeight;
}

function appendChatMessage(role, text) {
  const message = document.createElement('div');
  message.className = `chat-message ${role}`;
  const label = document.createElement('span');
  label.textContent = role === 'user' ? 'YOU' : 'IGRIS';
  const body = document.createElement('p');
  body.textContent = text;
  message.append(label, body);
  $('#chat-feed').append(message);
  $('#chat-feed').scrollTop = $('#chat-feed').scrollHeight;
  return message;
}
