/**
 * app.js
 * Logique principale de l'application.
 * - Rendu des cartes météo
 * - Gestion des clés API (panneau de config)
 * - Actualisation des données
 * - Tableau comparatif
 * - Prévisions 7 jours
 * - Bascule °C / °F
 */

// ============================================================
// État global
// ============================================================
let currentUnit = 'C'; // 'C' ou 'F'
const sourceStates = {}; // { [sourceId]: { status, data, error } }

// ============================================================
// Utilitaires
// ============================================================

/**
 * Convertit une température (°C) selon l'unité courante.
 * @param {number|null} celsius
 * @returns {string}
 */
function displayTemp(celsius) {
  if (celsius == null || isNaN(celsius)) return '–';
  if (currentUnit === 'F') {
    return Math.round(celsius * 9 / 5 + 32) + '°F';
  }
  return celsius + '°C';
}

function formatOrDash(value, unit = '') {
  if (value == null || value === '' || isNaN(Number(value))) return '<span class="na">–</span>';
  return value + (unit ? ' ' + unit : '');
}

function now() {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ============================================================
// Bannière / Panneau de config
// ============================================================

function toggleConfigPanel() {
  const panel = document.getElementById('config-panel');
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) renderConfigGrid();
}

function dismissBanner() {
  document.getElementById('config-banner').hidden = true;
}

function renderConfigGrid() {
  const grid = document.getElementById('config-grid');
  grid.innerHTML = '';
  WEATHER_SOURCES.filter(s => s.requiresKey).forEach(s => {
    const current = getApiKey(s.keyName) || '';
    const field = document.createElement('div');
    field.className = 'config-field';
    field.innerHTML = `
      <label for="apikey-${s.id}">${s.icon} ${s.name}</label>
      <input
        type="password"
        id="apikey-${s.id}"
        data-key="${s.keyName}"
        placeholder="Entrez votre clé API…"
        value="${escapeHtml(current)}"
        autocomplete="off"
      />
      <span class="field-hint">
        ${escapeHtml(s.keyHint)}
        &nbsp;·&nbsp;<a href="${escapeHtml(s.signupUrl)}" target="_blank" rel="noopener">Obtenir une clé →</a>
        ${s.id === 'weatherstack' ? '<br/><strong style="color:var(--accent-orange)">⚠️ Le plan gratuit Weatherstack ne supporte que HTTP (non chiffré).</strong>' : ''}
      </span>
    `;
    grid.appendChild(field);
  });
}

function saveApiKeys() {
  const inputs = document.querySelectorAll('#config-grid input[data-key]');
  inputs.forEach(input => {
    setApiKey(input.dataset.key, input.value);
  });
  toggleConfigPanel();
  showToast('✅ Clés sauvegardées ! Actualisation en cours…');
  refreshAll();
}

function clearApiKeys() {
  if (!confirm('Supprimer toutes les clés API enregistrées ?')) return;
  clearAllApiKeys();
  document.querySelectorAll('#config-grid input[data-key]').forEach(i => (i.value = ''));
  showToast('🗑️ Clés API supprimées.');
  refreshAll();
}

// ============================================================
// Toast notification (simple)
// ============================================================
function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;background:#1e293b;
      color:#f1f5f9;padding:12px 20px;border-radius:12px;
      font-size:.875rem;font-weight:600;z-index:9999;
      box-shadow:0 4px 24px rgba(0,0,0,.5);opacity:0;
      transition:opacity .3s ease;pointer-events:none;max-width:340px;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

// ============================================================
// XSS prevention
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Rendu des cartes météo
// ============================================================

function renderAllCards() {
  const grid = document.getElementById('weather-grid');
  grid.innerHTML = '';
  WEATHER_SOURCES.forEach(source => {
    const card = buildCard(source);
    grid.appendChild(card);
  });
}

function buildCard(source) {
  const card = document.createElement('div');
  card.className = 'weather-card loading';
  card.id = `card-${source.id}`;

  // Accent color per source index
  const accentColors = [
    '#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444',
    '#06b6d4','#ec4899','#84cc16','#f97316','#a78bfa',
  ];
  const idx = WEATHER_SOURCES.findIndex(s => s.id === source.id);
  card.style.setProperty('--card-accent', accentColors[idx] || '#3b82f6');

  card.innerHTML = buildCardContent(source, { status: 'loading' });
  return card;
}

function updateCard(source) {
  const card = document.getElementById(`card-${source.id}`);
  if (!card) return;
  const state = sourceStates[source.id] || { status: 'loading' };
  card.className = `weather-card ${state.status === 'success' ? 'success' : state.status === 'error' ? 'error' : state.status === 'no-key' ? 'no-key' : 'loading'}`;
  card.innerHTML = buildCardContent(source, state);
}

function buildCardContent(source, state) {
  const statusBadge = {
    loading: `<span class="card-status-badge badge-loading">⏳ Chargement</span>`,
    success: `<span class="card-status-badge badge-ok">✅ OK</span>`,
    error:   `<span class="card-status-badge badge-error">❌ Erreur</span>`,
    'no-key':`<span class="card-status-badge badge-nokey">🔑 Clé requise</span>`,
  }[state.status] || '';

  const header = `
    <div class="card-header">
      <div class="card-source">
        <div class="source-logo">${escapeHtml(source.icon)}</div>
        <div class="source-info">
          <div class="source-name">${escapeHtml(source.name)}</div>
          <div class="source-type">${escapeHtml(source.type)}</div>
        </div>
      </div>
      ${statusBadge}
    </div>
  `;

  if (state.status === 'loading') {
    return header + `
      <div class="skeleton" style="width:60%;height:40px;margin-bottom:16px"></div>
      <div class="skeleton" style="width:40%"></div>
      <div class="skeleton" style="width:80%"></div>
      <div class="skeleton" style="width:50%"></div>
    `;
  }

  if (state.status === 'no-key') {
    return header + `
      <div class="card-message nokey-msg">
        Cette source nécessite une clé API.<br/>
        <a href="${escapeHtml(source.signupUrl)}" target="_blank" rel="noopener">Obtenir une clé gratuite →</a><br/>
        <small style="color:var(--text-muted)">${escapeHtml(source.keyHint)}</small>
      </div>
    `;
  }

  if (state.status === 'error') {
    return header + `
      <div class="card-message error-msg">
        Impossible de récupérer les données.<br/>
        <small style="color:var(--text-muted)">${escapeHtml(state.error || 'Erreur inconnue')}</small>
      </div>
    `;
  }

  // SUCCESS
  const d = state.data;
  return header + `
    <div class="card-main">
      <div class="card-temp">${displayTemp(d.temp)}</div>
      <div class="card-conditions">
        <div class="card-weather-icon">${escapeHtml(d.weatherIcon)}</div>
        <div class="card-desc">${escapeHtml(d.description)}</div>
        <div class="card-feels">Ressenti ${displayTemp(d.feelsLike)}</div>
      </div>
    </div>
    <div class="card-details">
      <div class="detail-item">
        <span class="detail-label">💧 Humidité</span>
        <span class="detail-value">${formatOrDash(d.humidity, '%')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">💨 Vent</span>
        <span class="detail-value">${formatOrDash(d.windSpeed, 'km/h')}${d.windDir ? ' ' + escapeHtml(d.windDir) : ''}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">🔵 Pression</span>
        <span class="detail-value">${formatOrDash(d.pressure, 'hPa')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">☀️ UV Index</span>
        <span class="detail-value">${d.uvIndex != null ? d.uvIndex : '<span class="na">–</span>'}</span>
      </div>
      ${d.visibility != null ? `
      <div class="detail-item">
        <span class="detail-label">👁️ Visibilité</span>
        <span class="detail-value">${formatOrDash(d.visibility, 'km')}</span>
      </div>` : ''}
      ${d.cloudCover != null ? `
      <div class="detail-item">
        <span class="detail-label">☁️ Couverture</span>
        <span class="detail-value">${formatOrDash(d.cloudCover, '%')}</span>
      </div>` : ''}
    </div>
  `;
}

// ============================================================
// Tableau comparatif
// ============================================================

function renderComparisonTable() {
  const tbody = document.getElementById('comparison-tbody');
  tbody.innerHTML = '';

  WEATHER_SOURCES.forEach((source, idx) => {
    const state = sourceStates[source.id] || { status: 'loading' };
    const tr = document.createElement('tr');

    const accentColors = [
      '#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444',
      '#06b6d4','#ec4899','#84cc16','#f97316','#a78bfa',
    ];
    const color = accentColors[idx] || '#3b82f6';

    const srcCell = `
      <td>
        <div class="table-source-cell">
          <div class="table-source-logo" style="border-top:3px solid ${color}">${escapeHtml(source.icon)}</div>
          ${escapeHtml(source.name)}
        </div>
      </td>
    `;

    if (state.status === 'loading') {
      tr.innerHTML = srcCell + `<td colspan="8" class="status-loading">⏳ Chargement…</td>`;
    } else if (state.status === 'no-key') {
      tr.innerHTML = srcCell + `<td colspan="8" class="status-nokey">🔑 Clé API requise — <a href="${escapeHtml(source.signupUrl)}" target="_blank" rel="noopener">Obtenir une clé</a></td>`;
    } else if (state.status === 'error') {
      tr.innerHTML = srcCell + `<td colspan="8" class="status-err">❌ ${escapeHtml(state.error || 'Erreur')}</td>`;
    } else {
      const d = state.data;
      tr.innerHTML = srcCell + `
        <td>${d.temp != null ? displayTemp(d.temp) : '<span class="na">–</span>'}</td>
        <td>${d.feelsLike != null ? displayTemp(d.feelsLike) : '<span class="na">–</span>'}</td>
        <td>${d.humidity != null ? d.humidity + ' %' : '<span class="na">–</span>'}</td>
        <td>${d.windSpeed != null ? d.windSpeed + ' km/h' : '<span class="na">–</span>'}${d.windDir ? ' ' + escapeHtml(d.windDir) : ''}</td>
        <td>${d.pressure != null ? d.pressure + ' hPa' : '<span class="na">–</span>'}</td>
        <td>${d.uvIndex != null ? d.uvIndex : '<span class="na">–</span>'}</td>
        <td>${escapeHtml(d.description)} ${escapeHtml(d.weatherIcon)}</td>
        <td class="status-ok">✅</td>
      `;
    }
    tbody.appendChild(tr);
  });
}

// ============================================================
// Résumé (moyenne / min / max)
// ============================================================

function updateSummary() {
  const temps = WEATHER_SOURCES
    .map(s => sourceStates[s.id])
    .filter(st => st && st.status === 'success' && st.data && st.data.temp != null)
    .map(st => st.data.temp);

  const successCount = WEATHER_SOURCES.filter(s => sourceStates[s.id]?.status === 'success').length;
  const totalLoaded = WEATHER_SOURCES.filter(s => sourceStates[s.id] && sourceStates[s.id].status !== 'loading').length;

  document.getElementById('active-sources').textContent = `${successCount} / ${WEATHER_SOURCES.length}`;

  if (temps.length === 0) {
    document.getElementById('avg-temp').textContent = '–';
    document.getElementById('min-temp').textContent = '–';
    document.getElementById('max-temp').textContent = '–';
    return;
  }

  const avg = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10;
  const min = Math.min(...temps);
  const max = Math.max(...temps);

  document.getElementById('avg-temp').textContent = displayTemp(avg);
  document.getElementById('min-temp').textContent = displayTemp(min);
  document.getElementById('max-temp').textContent = displayTemp(max);
}

// ============================================================
// Prévisions 7 jours
// ============================================================

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

async function renderForecast() {
  const grid = document.getElementById('forecast-grid');
  grid.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem">Chargement des prévisions…</p>';
  try {
    const daily = await fetchOpenMeteoForecast();
    grid.innerHTML = '';
    daily.time.forEach((dateStr, i) => {
      const date = new Date(dateStr + 'T12:00:00');
      const dayName = i === 0 ? "Auj." : DAY_NAMES_FR[date.getDay()];
      const div = document.createElement('div');
      div.className = 'forecast-day';
      div.innerHTML = `
        <div class="forecast-day-name">${dayName}</div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:8px">${date.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' })}</div>
        <div class="forecast-day-icon">${wmoToEmoji(daily.weather_code[i])}</div>
        <div class="forecast-temp-range">
          <span class="temp-max">${displayTemp(Math.round(daily.temperature_2m_max[i]))}</span>
          <span class="temp-min">${displayTemp(Math.round(daily.temperature_2m_min[i]))}</span>
        </div>
        <div class="forecast-rain">🌧️ ${daily.precipitation_probability_max[i] ?? 0}%</div>
        <div class="forecast-wind">💨 ${Math.round(daily.wind_speed_10m_max[i])} km/h</div>
      `;
      grid.appendChild(div);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--accent-red);font-size:.875rem">Erreur lors du chargement des prévisions.</p>`;
  }
}

// ============================================================
// Bascule °C / °F
// ============================================================

function setUnit(unit) {
  currentUnit = unit;
  document.getElementById('btn-celsius').classList.toggle('active', unit === 'C');
  document.getElementById('btn-fahrenheit').classList.toggle('active', unit === 'F');
  // Re-render toutes les cartes + tableau + résumé
  WEATHER_SOURCES.forEach(source => updateCard(source));
  renderComparisonTable();
  updateSummary();
  renderForecast();
}

// ============================================================
// Actualisation de toutes les sources
// ============================================================

async function refreshAll() {
  const btn = document.getElementById('btn-refresh');
  const icon = btn.querySelector('.refresh-icon');
  btn.disabled = true;
  icon.classList.add('spinning');

  document.getElementById('last-update').textContent = 'Actualisation en cours…';

  // Réinitialiser les états
  WEATHER_SOURCES.forEach(source => {
    sourceStates[source.id] = { status: 'loading' };
    updateCard(source);
  });
  renderComparisonTable();

  // Lancer toutes les requêtes en parallèle
  const promises = WEATHER_SOURCES.map(async source => {
    if (source.requiresKey && !sourceHasKey(source)) {
      sourceStates[source.id] = { status: 'no-key' };
      updateCard(source);
      renderComparisonTable();
      updateSummary();
      return;
    }
    try {
      const data = await fetchWeatherForSource(source);
      sourceStates[source.id] = { status: 'success', data };
    } catch (err) {
      let errMsg = err.message || 'Erreur inconnue';
      if (err.name === 'AbortError') errMsg = 'Délai dépassé (timeout)';
      sourceStates[source.id] = { status: 'error', error: errMsg };
    }
    updateCard(source);
    renderComparisonTable();
    updateSummary();
  });

  await Promise.allSettled(promises);

  btn.disabled = false;
  icon.classList.remove('spinning');
  document.getElementById('last-update').textContent = `Dernière MàJ : ${now()}`;
}

// ============================================================
// Initialisation
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Rendre les cartes vides (skeleton)
  renderAllCards();
  renderComparisonTable();

  // Démarrer le chargement
  refreshAll();
  renderForecast();

  // Auto-refresh toutes les 10 minutes
  setInterval(() => {
    refreshAll();
    renderForecast();
  }, 10 * 60 * 1000);
});
