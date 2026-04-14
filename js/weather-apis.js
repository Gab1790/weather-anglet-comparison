/**
 * weather-apis.js
 * Intégrations pour chacune des 10 sources météo.
 * Chaque fonction retourne une Promise résolvant en { data } ou rejetant en { error }.
 *
 * Données normalisées :
 *  {
 *    temp         : number  (°C)
 *    feelsLike    : number  (°C)
 *    humidity     : number  (%)
 *    windSpeed    : number  (km/h)
 *    windDir      : string  (optionnel)
 *    pressure     : number  (hPa)
 *    uvIndex      : number|null
 *    description  : string
 *    weatherIcon  : string  (emoji)
 *    visibility   : number|null (km)
 *    cloudCover   : number|null (%)
 *    dewPoint     : number|null (°C)
 *  }
 */

// ============================================================
// Helpers partagés
// ============================================================

/**
 * Retourne un emoji météo à partir d'un code WMO (Open-Meteo).
 * @param {number} code
 * @returns {string}
 */
function wmoToEmoji(code) {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55].includes(code)) return '🌦️';
  if ([56, 57].includes(code)) return '🌧️';
  if ([61, 63, 65].includes(code)) return '🌧️';
  if ([66, 67].includes(code)) return '🌨️';
  if ([71, 73, 75, 77].includes(code)) return '❄️';
  if ([80, 81, 82].includes(code)) return '🌦️';
  if ([85, 86].includes(code)) return '🌨️';
  if ([95].includes(code)) return '⛈️';
  if ([96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

/**
 * Description textuelle d'un code WMO.
 */
function wmoToDesc(code) {
  const map = {
    0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux',
    3: 'Couvert', 45: 'Brouillard', 48: 'Brouillard givrant',
    51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
    56: 'Bruine verglaçante légère', 57: 'Bruine verglaçante dense',
    61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
    66: 'Pluie verglaçante légère', 67: 'Pluie verglaçante forte',
    71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
    77: 'Grains de neige', 80: 'Averses légères', 81: 'Averses modérées',
    82: 'Averses violentes', 85: 'Averses de neige', 86: 'Averses de neige forte',
    95: 'Orage', 96: 'Orage avec grêle légère', 99: 'Orage avec grêle forte',
  };
  return map[code] || 'Inconnu';
}

/**
 * Degré vers direction cardinale.
 * @param {number} deg
 * @returns {string}
 */
function degToCardinal(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Fait une requête fetch avec timeout.
 * @param {string} url
 * @param {number} timeoutMs
 */
async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ============================================================
// 1. Open-Meteo (gratuit, sans clé)
// ============================================================
async function fetchOpenMeteo() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ANGLET.lat}&longitude=${ANGLET.lon}`
    + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,`
    + `wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover`
    + `&wind_speed_unit=kmh&timezone=Europe%2FParis`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current;

  return {
    temp: Math.round(c.temperature_2m * 10) / 10,
    feelsLike: Math.round(c.apparent_temperature * 10) / 10,
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    windDir: degToCardinal(c.wind_direction_10m),
    pressure: Math.round(c.surface_pressure),
    uvIndex: null,
    description: wmoToDesc(c.weather_code),
    weatherIcon: wmoToEmoji(c.weather_code),
    visibility: null,
    cloudCover: c.cloud_cover,
    dewPoint: null,
  };
}

/**
 * Prévisions 7 jours Open-Meteo.
 */
async function fetchOpenMeteoForecast() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ANGLET.lat}&longitude=${ANGLET.lon}`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max`
    + `&wind_speed_unit=kmh&timezone=Europe%2FParis`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.daily;
}

// ============================================================
// 2. Météo Concept (clé gratuite)
// ============================================================
async function fetchMeteoConcept(apiKey) {
  const url = `https://api.meteo-concept.com/api/ephemeride/0?token=${apiKey}&insee=64024`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const d = json.forecast;

  const weatherIconMap = {
    0: '☀️', 1: '🌤️', 2: '🌤️', 3: '⛅', 4: '⛅', 5: '🌥️',
    6: '☁️', 7: '☁️', 8: '☁️', 9: '🌧️', 10: '🌦️', 11: '🌦️',
    12: '🌧️', 13: '🌧️', 14: '🌧️', 15: '🌨️', 16: '❄️',
    100: '⛈️', 101: '⛈️', 102: '⛈️',
  };
  const descMap = {
    0: 'Ensoleillé', 1: 'Peu nuageux', 2: 'Peu nuageux', 3: 'Partiellement nuageux',
    4: 'Partiellement nuageux', 5: 'Nuageux', 6: 'Très nuageux', 7: 'Couvert',
    8: 'Couvert', 9: 'Pluie légère', 10: 'Averses', 11: 'Averses',
    12: 'Pluie', 13: 'Pluie forte', 14: 'Pluie forte', 15: 'Pluie verglaçante',
    16: 'Neige', 100: 'Orage', 101: 'Orage', 102: 'Orage avec grêle',
  };

  return {
    temp: d.tmax != null ? Math.round((d.tmax + d.tmin) / 2 * 10) / 10 : null,
    feelsLike: null,
    humidity: d.rh2m != null ? d.rh2m : null,
    windSpeed: d.wind10m != null ? Math.round(d.wind10m * 3.6) : null,
    windDir: d.dirwind10m != null ? degToCardinal(d.dirwind10m) : null,
    pressure: null,
    uvIndex: null,
    description: descMap[d.weather] != null ? descMap[d.weather] : 'Inconnu',
    weatherIcon: weatherIconMap[d.weather] != null ? weatherIconMap[d.weather] : '🌡️',
    visibility: null,
    cloudCover: null,
    dewPoint: null,
  };
}

// ============================================================
// 3. OpenWeatherMap
// ============================================================
async function fetchOpenWeatherMap(apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ANGLET.lat}&lon=${ANGLET.lon}`
    + `&appid=${apiKey}&units=metric&lang=fr`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();

  const iconMap = {
    '01': '☀️', '02': '🌤️', '03': '☁️', '04': '☁️',
    '09': '🌦️', '10': '🌧️', '11': '⛈️', '13': '❄️', '50': '🌫️',
  };
  const prefix = d.weather[0].icon.slice(0, 2);

  return {
    temp: Math.round(d.main.temp * 10) / 10,
    feelsLike: Math.round(d.main.feels_like * 10) / 10,
    humidity: d.main.humidity,
    windSpeed: Math.round(d.wind.speed * 3.6),
    windDir: d.wind.deg != null ? degToCardinal(d.wind.deg) : null,
    pressure: d.main.pressure,
    uvIndex: null,
    description: d.weather[0].description.charAt(0).toUpperCase() + d.weather[0].description.slice(1),
    weatherIcon: iconMap[prefix] != null ? iconMap[prefix] : '🌡️',
    visibility: d.visibility != null ? Math.round(d.visibility / 1000) : null,
    cloudCover: d.clouds && d.clouds.all != null ? d.clouds.all : null,
    dewPoint: null,
  };
}

// ============================================================
// 4. WeatherAPI
// ============================================================
async function fetchWeatherAPI(apiKey) {
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${ANGLET.lat},${ANGLET.lon}&lang=fr`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const c = d.current;

  const isDay = c.is_day === 1;
  const condCode = c.condition.code;
  function wapiIcon(code, day) {
    if (code === 1000) return day ? '☀️' : '🌙';
    if ([1003, 1006].includes(code)) return day ? '🌤️' : '🌥️';
    if (code === 1009) return '☁️';
    if ([1030, 1135, 1147].includes(code)) return '🌫️';
    if ([1063, 1150, 1153, 1168, 1171, 1180, 1183].includes(code)) return '🌦️';
    if ([1186, 1189, 1192, 1195, 1198, 1201].includes(code)) return '🌧️';
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return '❄️';
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '⛈️';
    return '🌡️';
  }

  return {
    temp: Math.round(c.temp_c * 10) / 10,
    feelsLike: Math.round(c.feelslike_c * 10) / 10,
    humidity: c.humidity,
    windSpeed: Math.round(c.wind_kph),
    windDir: c.wind_dir != null ? c.wind_dir : null,
    pressure: Math.round(c.pressure_mb),
    uvIndex: c.uv != null ? c.uv : null,
    description: c.condition.text,
    weatherIcon: wapiIcon(condCode, isDay),
    visibility: c.vis_km != null ? Math.round(c.vis_km) : null,
    cloudCover: c.cloud != null ? c.cloud : null,
    dewPoint: c.dewpoint_c != null ? Math.round(c.dewpoint_c * 10) / 10 : null,
  };
}

// ============================================================
// 5. Visual Crossing
// ============================================================
async function fetchVisualCrossing(apiKey) {
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/`
    + `${ANGLET.lat},${ANGLET.lon}/today?unitGroup=metric&key=${apiKey}&contentType=json&lang=fr&include=current`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const c = d.currentConditions;

  function vcIcon(icon) {
    const map = {
      'clear-day': '☀️', 'clear-night': '🌙', 'partly-cloudy-day': '🌤️',
      'partly-cloudy-night': '🌥️', 'cloudy': '☁️', 'fog': '🌫️',
      'rain': '🌧️', 'showers-day': '🌦️', 'showers-night': '🌦️',
      'thunder-rain': '⛈️', 'thunder-showers-day': '⛈️', 'thunder-showers-night': '⛈️',
      'snow': '❄️', 'snow-showers-day': '🌨️', 'snow-showers-night': '🌨️',
      'sleet': '🌨️', 'wind': '💨', 'hail': '🌩️',
    };
    return map[icon] || '🌡️';
  }

  return {
    temp: Math.round(c.temp * 10) / 10,
    feelsLike: Math.round(c.feelslike * 10) / 10,
    humidity: Math.round(c.humidity),
    windSpeed: Math.round(c.windspeed),
    windDir: c.winddir != null ? degToCardinal(c.winddir) : null,
    pressure: Math.round(c.pressure),
    uvIndex: c.uvindex != null ? c.uvindex : null,
    description: c.conditions,
    weatherIcon: vcIcon(c.icon),
    visibility: c.visibility != null ? Math.round(c.visibility) : null,
    cloudCover: c.cloudcover != null ? Math.round(c.cloudcover) : null,
    dewPoint: c.dew != null ? Math.round(c.dew * 10) / 10 : null,
  };
}

// ============================================================
// 6. Tomorrow.io
// ============================================================
async function fetchTomorrowIo(apiKey) {
  const url = `https://api.tomorrow.io/v4/weather/realtime?location=${ANGLET.lat},${ANGLET.lon}`
    + `&apikey=${apiKey}&units=metric`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const v = json.data.values;

  function tiIcon(code) {
    if ([1000, 1100].includes(code)) return '☀️';
    if ([1101, 1102].includes(code)) return '🌤️';
    if ([1001].includes(code)) return '☁️';
    if ([2000, 2100].includes(code)) return '🌫️';
    if ([4000, 4001, 4200, 4201].includes(code)) return '🌧️';
    if ([5000, 5001, 5100, 5101].includes(code)) return '❄️';
    if ([6000, 6001, 6200, 6201].includes(code)) return '🌨️';
    if ([7000, 7101, 7102].includes(code)) return '🌩️';
    if ([8000].includes(code)) return '⛈️';
    return '🌡️';
  }
  const descMap = {
    1000: 'Ciel dégagé', 1100: 'Principalement dégagé', 1101: 'Partiellement nuageux',
    1102: 'Principalement nuageux', 1001: 'Couvert', 2000: 'Brouillard', 2100: 'Brouillard léger',
    4000: 'Bruine', 4001: 'Pluie', 4200: 'Pluie légère', 4201: 'Pluie forte',
    5000: 'Neige', 5001: 'Averses de neige', 5100: 'Neige légère', 5101: 'Neige forte',
    6000: 'Bruine verglaçante', 6001: 'Pluie verglaçante', 6200: 'Pluie verglaçante légère', 6201: 'Pluie verglaçante forte',
    7000: 'Grêle', 7101: 'Grêle forte', 7102: 'Grêle légère',
    8000: 'Orage',
  };

  return {
    temp: Math.round(v.temperature * 10) / 10,
    feelsLike: Math.round(v.temperatureApparent * 10) / 10,
    humidity: Math.round(v.humidity),
    windSpeed: Math.round(v.windSpeed * 3.6),
    windDir: v.windDirection != null ? degToCardinal(v.windDirection) : null,
    pressure: Math.round(v.pressureSurfaceLevel),
    uvIndex: v.uvIndex != null ? v.uvIndex : null,
    description: descMap[v.weatherCode] || 'Inconnu',
    weatherIcon: tiIcon(v.weatherCode),
    visibility: v.visibility != null ? Math.round(v.visibility) : null,
    cloudCover: v.cloudCover != null ? Math.round(v.cloudCover) : null,
    dewPoint: v.dewPoint != null ? Math.round(v.dewPoint * 10) / 10 : null,
  };
}

// ============================================================
// 7. Weatherstack
// NOTE: The free plan only allows HTTP (not HTTPS).
// A security warning is displayed in the config panel for this source.
// ============================================================
async function fetchWeatherstack(apiKey) {
  // The free Weatherstack plan only supports HTTP.
  // We attempt HTTPS first; if blocked, fall back to HTTP.
  // Users are warned about this limitation in the config panel.
  const httpsUrl = `https://api.weatherstack.com/current?access_key=${apiKey}`
    + `&query=${ANGLET.lat},${ANGLET.lon}&units=m`;
  const httpUrl = `http://api.weatherstack.com/current?access_key=${apiKey}`
    + `&query=${ANGLET.lat},${ANGLET.lon}&units=m`;

  let json;
  try {
    const res = await fetchWithTimeout(httpsUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (_httpsErr) {
    // HTTPS failed (common on free plan) — try HTTP
    const res = await fetchWithTimeout(httpUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  }

  if (json.error) throw new Error(json.error.info || 'Erreur Weatherstack');
  const c = json.current;

  function wsIcon(code) {
    if ([113].includes(code)) return '☀️';
    if ([116].includes(code)) return '⛅';
    if ([119, 122].includes(code)) return '☁️';
    if ([143, 248, 260].includes(code)) return '🌫️';
    if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359].includes(code)) return '🌧️';
    if ([179, 182, 185, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return '❄️';
    if ([200, 386, 389, 392, 395].includes(code)) return '⛈️';
    return '🌡️';
  }

  return {
    temp: Math.round(c.temperature * 10) / 10,
    feelsLike: Math.round(c.feelslike * 10) / 10,
    humidity: c.humidity,
    windSpeed: c.wind_speed,
    windDir: c.wind_dir != null ? c.wind_dir : null,
    pressure: c.pressure,
    uvIndex: c.uv_index != null ? c.uv_index : null,
    description: c.weather_descriptions && c.weather_descriptions[0] != null ? c.weather_descriptions[0] : 'Inconnu',
    weatherIcon: wsIcon(c.weather_code),
    visibility: c.visibility != null ? c.visibility : null,
    cloudCover: c.cloudcover != null ? c.cloudcover : null,
    dewPoint: null,
  };
}

// ============================================================
// 8. AccuWeather
// ============================================================
async function fetchAccuWeather(apiKey) {
  // Étape 1 : obtenir le location key
  const locUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search`
    + `?apikey=${apiKey}&q=${ANGLET.lat},${ANGLET.lon}&details=false`;

  const locRes = await fetchWithTimeout(locUrl);
  if (!locRes.ok) throw new Error(`HTTP ${locRes.status}`);
  const locJson = await locRes.json();
  const locationKey = locJson.Key;
  if (!locationKey) throw new Error('Location key introuvable');

  // Étape 2 : conditions actuelles
  const curUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}`
    + `?apikey=${apiKey}&details=true`;

  const curRes = await fetchWithTimeout(curUrl);
  if (!curRes.ok) throw new Error(`HTTP ${curRes.status}`);
  const curJson = await curRes.json();
  const c = curJson[0];

  const iconNum = c.WeatherIcon;
  function awIcon(n) {
    if ([1, 2].includes(n)) return '☀️';
    if ([3, 4, 5, 6].includes(n)) return '🌤️';
    if ([7, 8, 38].includes(n)) return '☁️';
    if ([11].includes(n)) return '🌫️';
    if ([12, 13, 14, 18, 39, 40].includes(n)) return '🌦️';
    if ([15, 16, 17, 41, 42].includes(n)) return '⛈️';
    if ([19, 20, 21, 22, 23, 24, 25, 26, 29, 43, 44].includes(n)) return '❄️';
    return '🌡️';
  }

  const tempC = c.Temperature && c.Temperature.Metric && c.Temperature.Metric.Value != null ? c.Temperature.Metric.Value : null;
  const feelsC = c.RealFeelTemperature && c.RealFeelTemperature.Metric && c.RealFeelTemperature.Metric.Value != null ? c.RealFeelTemperature.Metric.Value : null;
  const windMs = c.Wind && c.Wind.Speed && c.Wind.Speed.Metric && c.Wind.Speed.Metric.Value != null ? c.Wind.Speed.Metric.Value : null;

  return {
    temp: tempC != null ? Math.round(tempC * 10) / 10 : null,
    feelsLike: feelsC != null ? Math.round(feelsC * 10) / 10 : null,
    humidity: c.RelativeHumidity != null ? c.RelativeHumidity : null,
    windSpeed: windMs != null ? Math.round(windMs) : null,
    windDir: c.Wind && c.Wind.Direction && c.Wind.Direction.Localized != null ? c.Wind.Direction.Localized : null,
    pressure: c.Pressure && c.Pressure.Metric && c.Pressure.Metric.Value != null ? Math.round(c.Pressure.Metric.Value) : null,
    uvIndex: c.UVIndex != null ? c.UVIndex : null,
    description: c.WeatherText != null ? c.WeatherText : 'Inconnu',
    weatherIcon: awIcon(iconNum),
    visibility: c.Visibility && c.Visibility.Metric && c.Visibility.Metric.Value != null ? Math.round(c.Visibility.Metric.Value) : null,
    cloudCover: c.CloudCover != null ? c.CloudCover : null,
    dewPoint: c.DewPoint && c.DewPoint.Metric && c.DewPoint.Metric.Value != null ? Math.round(c.DewPoint.Metric.Value * 10) / 10 : null,
  };
}

// ============================================================
// 9. Pirate Weather (alternative open-source à Dark Sky)
// ============================================================
async function fetchPirateWeather(apiKey) {
  const url = `https://api.pirateweather.net/forecast/${apiKey}/${ANGLET.lat},${ANGLET.lon}`
    + `?units=ca&lang=fr`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const c = json.currently;

  function pwIcon(icon) {
    const map = {
      'clear-day': '☀️', 'clear-night': '🌙', 'rain': '🌧️',
      'snow': '❄️', 'sleet': '🌨️', 'wind': '💨', 'fog': '🌫️',
      'cloudy': '☁️', 'partly-cloudy-day': '🌤️', 'partly-cloudy-night': '🌥️',
      'hail': '🌩️', 'thunderstorm': '⛈️', 'tornado': '🌪️',
    };
    return map[icon] || '🌡️';
  }

  const descMap = {
    'clear-day': 'Ciel dégagé', 'clear-night': 'Ciel dégagé',
    'rain': 'Pluie', 'snow': 'Neige', 'sleet': 'Pluie verglaçante',
    'wind': 'Venteux', 'fog': 'Brouillard', 'cloudy': 'Couvert',
    'partly-cloudy-day': 'Partiellement nuageux', 'partly-cloudy-night': 'Partiellement nuageux',
    'hail': 'Grêle', 'thunderstorm': 'Orage', 'tornado': 'Tornade',
  };

  return {
    temp: Math.round(c.temperature * 10) / 10,
    feelsLike: Math.round(c.apparentTemperature * 10) / 10,
    humidity: Math.round(c.humidity * 100),
    windSpeed: Math.round(c.windSpeed),
    windDir: c.windBearing != null ? degToCardinal(c.windBearing) : null,
    pressure: Math.round(c.pressure),
    uvIndex: c.uvIndex != null ? c.uvIndex : null,
    description: c.summary != null ? c.summary : (descMap[c.icon] != null ? descMap[c.icon] : 'Inconnu'),
    weatherIcon: pwIcon(c.icon),
    visibility: c.visibility != null ? Math.round(c.visibility) : null,
    cloudCover: c.cloudCover != null ? Math.round(c.cloudCover * 100) : null,
    dewPoint: c.dewPoint != null ? Math.round(c.dewPoint * 10) / 10 : null,
  };
}

// ============================================================
// 10. Meteosource
// ============================================================
async function fetchMeteosource(apiKey) {
  const url = `https://www.meteosource.com/api/v1/free/point?lat=${ANGLET.lat}&lon=${ANGLET.lon}`
    + `&sections=current&timezone=Europe/Paris&language=fr&units=metric&key=${apiKey}`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current;

  function msIcon(icon) {
    if (!icon) return '🌡️';
    const map = {
      'sunny': '☀️', 'mostly_sunny': '🌤️', 'partly_sunny': '🌤️',
      'mostly_cloudy': '🌥️', 'cloudy': '☁️', 'overcast': '☁️',
      'foggy': '🌫️', 'light_rain': '🌦️', 'rain': '🌧️', 'heavy_rain': '🌧️',
      'light_snow': '🌨️', 'snow': '❄️', 'heavy_snow': '❄️',
      'mixed_rain_and_snow': '🌨️', 'thunderstorms': '⛈️',
      'light_showers': '🌦️', 'showers': '🌦️', 'heavy_showers': '🌧️',
    };
    return map[icon] || '🌡️';
  }

  return {
    temp: c.temperature != null ? Math.round(c.temperature * 10) / 10 : null,
    feelsLike: c.feels_like != null ? Math.round(c.feels_like * 10) / 10 : null,
    humidity: c.relative_humidity != null ? c.relative_humidity : null,
    windSpeed: c.wind && c.wind.speed != null ? Math.round(c.wind.speed) : null,
    windDir: c.wind && c.wind.angle != null ? degToCardinal(c.wind.angle) : null,
    pressure: c.pressure != null ? Math.round(c.pressure) : null,
    uvIndex: c.uv_index != null ? c.uv_index : null,
    description: c.summary != null ? c.summary : 'Inconnu',
    weatherIcon: msIcon(c.icon),
    visibility: null,
    cloudCover: c.cloud_cover && c.cloud_cover.total != null ? c.cloud_cover.total : null,
    dewPoint: null,
  };
}

// ============================================================
// Dispatch — appelle la bonne fonction selon l'id
// ============================================================
async function fetchWeatherForSource(source) {
  const key = source.requiresKey ? getApiKey(source.keyName) : null;

  switch (source.id) {
    case 'open_meteo':
      return fetchOpenMeteo();
    case 'meteo_concept':
      return fetchMeteoConcept(key);
    case 'openweathermap':
      return fetchOpenWeatherMap(key);
    case 'weatherapi':
      return fetchWeatherAPI(key);
    case 'visualcrossing':
      return fetchVisualCrossing(key);
    case 'tomorrow_io':
      return fetchTomorrowIo(key);
    case 'weatherstack':
      return fetchWeatherstack(key);
    case 'accuweather':
      return fetchAccuWeather(key);
    case 'pirateweather':
      return fetchPirateWeather(key);
    case 'meteosource':
      return fetchMeteosource(key);
    default:
      throw new Error('Source inconnue');
  }
}
