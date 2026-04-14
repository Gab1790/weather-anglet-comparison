/**
 * config.js
 * Configuration centrale : coordonnées d'Anglet et définition des 10 sources météo.
 * Les clés API sont stockées dans localStorage (jamais envoyées à un tiers).
 */

// Coordonnées d'Anglet, France
const ANGLET = {
  lat: 43.4863,
  lon: -1.5402,
  city: 'Anglet',
  country: 'FR',
};

/**
 * Définition des 10 sources météo.
 * - id         : identifiant unique
 * - name       : nom affiché
 * - icon       : emoji représentatif
 * - type       : catégorie (gratuit, freemium, payant)
 * - requiresKey: si true, une clé API est requise
 * - keyName    : nom de la clé dans localStorage / config
 * - signupUrl  : URL pour obtenir une clé
 * - keyHint    : texte d'aide pour l'utilisateur
 */
const WEATHER_SOURCES = [
  {
    id: 'open_meteo',
    name: 'Open-Meteo',
    icon: '🌍',
    type: 'Gratuit (sans clé)',
    requiresKey: false,
    keyName: null,
    signupUrl: 'https://open-meteo.com',
    keyHint: 'Aucune clé requise — API ouverte',
  },
  {
    id: 'meteo_concept',
    name: 'Météo Concept',
    icon: '🇫🇷',
    type: 'Gratuit (clé gratuite)',
    requiresKey: true,
    keyName: 'METEO_CONCEPT_KEY',
    signupUrl: 'https://api.meteo-concept.com/',
    keyHint: 'Clé gratuite disponible sur api.meteo-concept.com',
  },
  {
    id: 'openweathermap',
    name: 'OpenWeatherMap',
    icon: '🌦️',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'OWM_KEY',
    signupUrl: 'https://openweathermap.org/appid',
    keyHint: 'Niveau gratuit disponible — openweathermap.org',
  },
  {
    id: 'weatherapi',
    name: 'WeatherAPI',
    icon: '⛅',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'WEATHERAPI_KEY',
    signupUrl: 'https://www.weatherapi.com/signup.aspx',
    keyHint: 'Plan gratuit disponible — weatherapi.com',
  },
  {
    id: 'visualcrossing',
    name: 'Visual Crossing',
    icon: '📈',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'VISUALCROSSING_KEY',
    signupUrl: 'https://www.visualcrossing.com/sign-up',
    keyHint: '1 000 requêtes/jour gratuites',
  },
  {
    id: 'tomorrow_io',
    name: 'Tomorrow.io',
    icon: '🔭',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'TOMORROW_KEY',
    signupUrl: 'https://app.tomorrow.io/signup',
    keyHint: 'Plan gratuit disponible — tomorrow.io',
  },
  {
    id: 'weatherstack',
    name: 'Weatherstack',
    icon: '🌐',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'WEATHERSTACK_KEY',
    signupUrl: 'https://weatherstack.com/signup/free',
    keyHint: 'Plan gratuit 1 000 req/mois — weatherstack.com',
  },
  {
    id: 'accuweather',
    name: 'AccuWeather',
    icon: '🌡️',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'ACCUWEATHER_KEY',
    signupUrl: 'https://developer.accuweather.com/',
    keyHint: '50 req/jour gratuits — developer.accuweather.com',
  },
  {
    id: 'pirateweather',
    name: 'Pirate Weather',
    icon: '🏴‍☠️',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'PIRATEWEATHER_KEY',
    signupUrl: 'https://pirateweather.net/getting-started',
    keyHint: 'Alternative open source à Dark Sky',
  },
  {
    id: 'meteosource',
    name: 'Meteosource',
    icon: '🛰️',
    type: 'Freemium',
    requiresKey: true,
    keyName: 'METEOSOURCE_KEY',
    signupUrl: 'https://www.meteosource.com/client/register',
    keyHint: 'Plan gratuit disponible — meteosource.com',
  },
];

// ----------------------------------------------------------------
// Gestion du stockage des clés API (localStorage uniquement)
// ----------------------------------------------------------------

/**
 * Retourne la valeur d'une clé API stockée dans localStorage.
 * @param {string} keyName - ex: 'OWM_KEY'
 * @returns {string|null}
 */
function getApiKey(keyName) {
  if (!keyName) return null;
  return localStorage.getItem('wac_' + keyName) || null;
}

/**
 * Sauvegarde une clé API dans localStorage.
 * @param {string} keyName
 * @param {string} value
 */
function setApiKey(keyName, value) {
  if (!keyName) return;
  const trimmed = (value || '').trim();
  if (trimmed) {
    localStorage.setItem('wac_' + keyName, trimmed);
  } else {
    localStorage.removeItem('wac_' + keyName);
  }
}

/**
 * Efface toutes les clés API du localStorage.
 */
function clearAllApiKeys() {
  WEATHER_SOURCES.forEach(src => {
    if (src.keyName) localStorage.removeItem('wac_' + src.keyName);
  });
}

/**
 * Vérifie si une source a sa clé API configurée.
 * @param {Object} source - un objet de WEATHER_SOURCES
 * @returns {boolean}
 */
function sourceHasKey(source) {
  if (!source.requiresKey) return true;
  const key = getApiKey(source.keyName);
  return !!(key && key.length > 0);
}
