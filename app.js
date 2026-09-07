/**
 * SkyPulse Weather Dashboard - Core Application Engine
 * Real-time Australian Bureau of Meteorology (BOM) & Open-Meteo Integration
 */

(function () {
  'use strict';

  const storage = typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage : { getItem: () => null, setItem: () => {} };
  const state = {
    unit: storage.getItem('skypulse_unit') || 'c',
    currentLocation: null,
    weatherData: null,
    favorites: [],
    activeTab: 'cards',
    selectedDayIndex: 0,
    searchDebounceTimer: null,
    activeDayHours: null,
  };

  const DEFAULT_FAVORITES = [
    { name: 'Sydney', state: 'NSW', country: 'Australia', countryCode: 'NSW', geohash: 'r3gx2s', lat: -33.8688, lon: 151.2093, source: 'bom' },
    { name: 'Melbourne', state: 'VIC', country: 'Australia', countryCode: 'VIC', geohash: 'r1r0fu', lat: -37.8136, lon: 144.9631, source: 'bom' },
    { name: 'Brisbane', state: 'QLD', country: 'Australia', countryCode: 'QLD', geohash: 'r7hgdm', lat: -27.4698, lon: 153.0251, source: 'bom' },
    { name: 'Perth', state: 'WA', country: 'Australia', countryCode: 'WA', geohash: 'qd66hr', lat: -31.9505, lon: 115.8605, source: 'bom' },
    { name: 'Adelaide', state: 'SA', country: 'Australia', countryCode: 'SA', geohash: 'r1f93c', lat: -34.9285, lon: 138.6007, source: 'bom' },
    { name: 'Hobart', state: 'TAS', country: 'Australia', countryCode: 'TAS', geohash: 'r22u08', lat: -42.8821, lon: 147.3272, source: 'bom' },
    { name: 'Canberra', state: 'ACT', country: 'Australia', countryCode: 'ACT', geohash: 'r3dp5h', lat: -35.2809, lon: 149.1300, source: 'bom' },
  ];

  // DOM Elements Mapping
  const elIds = [
    'sourceBadge', 'cityName', 'countryBadge', 'bomWarningBanner', 'bomWarningTitle', 'bomWarningText',
    'bomStationPill', 'bomStationName', 'bomSynopticBox', 'bomSynopticText', 'localTime', 'conditionBadge',
    'conditionText', 'currentTemp', 'displayUnit', 'heroWeatherIcon', 'apparentTemp', 'tempRange',
    'precipitationCurrent', 'precipPillLabel', 'windSpeed', 'windUnit', 'windDirText', 'compassNeedle',
    'humidityVal', 'humidityProgress', 'humidityState', 'uvVal', 'uvIndicator', 'uvBadge', 'uvAdvice',
    'sunriseTime', 'sunsetTime', 'rainChanceVal', 'rainProgress', 'rainAdvice', 'pressureVal', 'pressureState',
    'dailyForecastList', 'dailyForecastTitle', 'hourlyTitle', 'hourlySubtitle', 'hourlyStrip',
    'hourlyChartContainer', 'hourlyCardsView', 'hourlyTrendCanvas', 'uvMiniCanvas', 'weatherParticles',
    'favoritesList', 'statusBanner', 'statusMessage', 'citySearchInput', 'searchResultsDropdown',
    'clearSearchBtn', 'geoBtn', 'celsiusBtn', 'fahrenheitBtn', 'tabCardsView', 'tabChartView', 'tabUvView',
    'pinCurrentBtn', 'resetLiveBtn', 'chartLegend'
  ];
  const elements = {};
  elIds.forEach(id => { elements[id] = typeof document !== 'undefined' ? document.getElementById(id) : null; });
  if (typeof document !== 'undefined') {
    elements.searchWrapper = document.querySelector('.search-wrapper');
    elements.hourlyCanvas = elements.hourlyTrendCanvas;
    elements.cardsTabBtn = elements.tabCardsView;
    elements.chartTabBtn = elements.tabChartView;
    elements.uvTabBtn = elements.tabUvView;
    elements.cardsView = elements.hourlyCardsView;
    elements.chartView = elements.hourlyChartContainer;
    elements.pinBtn = elements.pinCurrentBtn;
  }

  // Weather Code Interpretation
  const WMO_CODES = {
    0: { desc: 'Clear Sky', icon: 'clear', theme: 'clear' },
    1: { desc: 'Mainly Clear', icon: 'mostly-clear', theme: 'clear' },
    2: { desc: 'Partly Cloudy', icon: 'partly-cloudy', theme: 'cloudy' },
    3: { desc: 'Overcast', icon: 'cloudy', theme: 'cloudy' },
    45: { desc: 'Fog', icon: 'fog', theme: 'cloudy' },
    48: { desc: 'Depositing Rime Fog', icon: 'fog', theme: 'cloudy' },
    51: { desc: 'Light Drizzle', icon: 'drizzle', theme: 'rain' },
    53: { desc: 'Moderate Drizzle', icon: 'drizzle', theme: 'rain' },
    55: { desc: 'Dense Drizzle', icon: 'drizzle', theme: 'rain' },
    61: { desc: 'Slight Rain', icon: 'rain', theme: 'rain' },
    63: { desc: 'Moderate Rain', icon: 'rain', theme: 'rain' },
    65: { desc: 'Heavy Rain', icon: 'heavy-rain', theme: 'rain' },
    71: { desc: 'Slight Snow', icon: 'snow', theme: 'snow' },
    73: { desc: 'Moderate Snow', icon: 'snow', theme: 'snow' },
    75: { desc: 'Heavy Snow', icon: 'heavy-snow', theme: 'snow' },
    80: { desc: 'Slight Rain Showers', icon: 'rain', theme: 'rain' },
    81: { desc: 'Moderate Showers', icon: 'rain', theme: 'rain' },
    82: { desc: 'Violent Rain Showers', icon: 'heavy-rain', theme: 'rain' },
    95: { desc: 'Thunderstorm', icon: 'thunder', theme: 'thunder' },
    96: { desc: 'Thunderstorm with Hail', icon: 'thunder', theme: 'thunder' },
    99: { desc: 'Severe Thunderstorm', icon: 'thunder', theme: 'thunder' },
  };

  const BOM_ICON_MAP = {
    sunny: { desc: 'Sunny', icon: 'clear', theme: 'clear' },
    clear: { desc: 'Clear', icon: 'clear', theme: 'clear' },
    mostly_sunny: { desc: 'Mostly Sunny', icon: 'mostly-clear', theme: 'clear' },
    partly_cloudy: { desc: 'Partly Cloudy', icon: 'partly-cloudy', theme: 'cloudy' },
    cloudy: { desc: 'Cloudy', icon: 'cloudy', theme: 'cloudy' },
    overcast: { desc: 'Overcast', icon: 'cloudy', theme: 'cloudy' },
    shower: { desc: 'Showers', icon: 'rain', theme: 'rain' },
    showers: { desc: 'Showers', icon: 'rain', theme: 'rain' },
    light_shower: { desc: 'Light Showers', icon: 'drizzle', theme: 'rain' },
    light_showers: { desc: 'Light Showers', icon: 'drizzle', theme: 'rain' },
    heavy_shower: { desc: 'Heavy Showers', icon: 'heavy-rain', theme: 'rain' },
    heavy_showers: { desc: 'Heavy Showers', icon: 'heavy-rain', theme: 'rain' },
    drizzle: { desc: 'Drizzle', icon: 'drizzle', theme: 'rain' },
    rain: { desc: 'Rain', icon: 'rain', theme: 'rain' },
    storm: { desc: 'Thunderstorm', icon: 'thunder', theme: 'thunder' },
    storms: { desc: 'Thunderstorms', icon: 'thunder', theme: 'thunder' },
    thunderstorm: { desc: 'Thunderstorm', icon: 'thunder', theme: 'thunder' },
    snow: { desc: 'Snow', icon: 'snow', theme: 'snow' },
    light_snow: { desc: 'Light Snow', icon: 'snow', theme: 'snow' },
    heavy_snow: { desc: 'Heavy Snow', icon: 'heavy-snow', theme: 'snow' },
    fog: { desc: 'Fog', icon: 'fog', theme: 'cloudy' },
    mist: { desc: 'Mist', icon: 'fog', theme: 'cloudy' },
    haze: { desc: 'Haze', icon: 'fog', theme: 'cloudy' },
    smoke: { desc: 'Smoke Haze', icon: 'fog', theme: 'cloudy' },
    dust: { desc: 'Dust', icon: 'fog', theme: 'cloudy' },
    wind: { desc: 'Windy', icon: 'mostly-clear', theme: 'clear' },
    windy: { desc: 'Windy', icon: 'mostly-clear', theme: 'clear' },
    frost: { desc: 'Frost', icon: 'snow', theme: 'snow' },
  };

  function resolveThemeClass(theme, isDay) {
    if (theme === 'cloudy') return isDay ? 'theme-day-cloudy' : 'theme-night-cloudy';
    if (theme === 'rain') return 'theme-rain';
    if (theme === 'snow') return 'theme-snow';
    if (theme === 'thunder') return 'theme-thunder';
    return isDay ? 'theme-day-clear' : 'theme-night-clear';
  }

  function getBomWeatherMeta(descriptor, isDay = 1) {
    const key = (descriptor || '').toLowerCase().replace(/[\s-]/g, '_');
    const matched = BOM_ICON_MAP[key] || { desc: descriptor ? descriptor.replace(/_/g, ' ') : 'Fair', icon: 'clear', theme: 'clear' };
    return {
      description: matched.desc,
      iconType: matched.icon,
      themeClass: resolveThemeClass(matched.theme, isDay),
      category: matched.theme,
    };
  }

  function getWeatherMeta(code, isDay = 1) {
    const info = WMO_CODES[code] || { desc: 'Clear', icon: 'clear', theme: 'clear' };
    return {
      description: info.desc,
      iconType: info.icon,
      themeClass: resolveThemeClass(info.theme, isDay),
      category: info.theme,
    };
  }

  // Weather SVG Icons Generator
  function createWeatherSvg(iconType, isDay = 1) {
    const wrap = inner => `<svg viewBox="0 0 64 64" fill="none">${inner}</svg>`;
    const sun = (cx = 32, cy = 32, r = 13) => `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
      <g stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round">
        <line x1="${cx}" y1="${cy-r-7}" x2="${cx}" y2="${cy-r-3}"/>
        <line x1="${cx}" y1="${cy+r+3}" x2="${cx}" y2="${cy+r+7}"/>
        <line x1="${cx-r-7}" y1="${cy}" x2="${cx-r-3}" y2="${cy}"/>
        <line x1="${cx+r+3}" y1="${cy}" x2="${cx+r+7}" y2="${cy}"/>
        <line x1="${cx-r+2}" y1="${cy-r+2}" x2="${cx-r+5}" y2="${cy-r+5}"/>
        <line x1="${cx+r-5}" y1="${cy+r-5}" x2="${cx+r-2}" y2="${cy+r-2}"/>
        <line x1="${cx-r+2}" y1="${cy+r-2}" x2="${cx-r+5}" y2="${cy+r-5}"/>
        <line x1="${cx+r-5}" y1="${cy-r+5}" x2="${cx+r-2}" y2="${cy-r-2}"/>
      </g>`;
    const moon = `<path d="M38 18a14 14 0 1 1-16 18 16 16 0 0 0 16-18z" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5"/>`;
    const cloud = (d, fill = '#cbd5e1', stroke = '#94a3b8', op = '1') => `<path d="${d}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="2"/>`;
    const baseCloudPath = 'M18 48h28a11 11 0 0 0 2-21.8 14 14 0 0 0-26.8-2A11.5 11.5 0 0 0 18 48z';

    switch (iconType) {
      case 'clear':
        return wrap(isDay ? sun() : moon);
      case 'mostly-clear':
      case 'partly-cloudy':
        return wrap(isDay
          ? `<circle cx="26" cy="24" r="11" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>` + cloud('M22 46h24a10 10 0 0 0 1.5-19.9 13 13 0 0 0-24.8-1.7A10.5 10.5 0 0 0 22 46z', '#e2e8f0', '#94a3b8', '0.9')
          : `<path d="M30 18a12 12 0 1 1-14 16 14 14 0 0 0 14-16z" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>` + cloud('M22 48h24a10 10 0 0 0 1.5-19.9 13 13 0 0 0-24.8-1.7A10.5 10.5 0 0 0 22 48z', '#94a3b8', '#64748b', '0.85'));
      case 'cloudy':
        return wrap(isDay
          ? `<circle cx="23" cy="22" r="10" fill="#fde047" stroke="#f59e0b" stroke-width="2"/>` + cloud(baseCloudPath) + cloud('M14 42h22a9 9 0 0 0 1.5-17.8 11.5 11.5 0 0 0-21.8-1.6A9.5 9.5 0 0 0 14 42z', '#94a3b8', '#64748b', '0.6')
          : `<path d="M28 15a10 10 0 1 1-11 13 11 11 0 0 0 11-13z" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5"/>` + cloud(baseCloudPath) + cloud('M14 42h22a9 9 0 0 0 1.5-17.8 11.5 11.5 0 0 0-21.8-1.6A9.5 9.5 0 0 0 14 42z', '#94a3b8', '#64748b', '0.6'));
      case 'fog':
        return wrap(`<g stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"><line x1="16" y1="22" x2="48" y2="22"/><line x1="12" y1="30" x2="52" y2="30"/><line x1="18" y1="38" x2="46" y2="38"/><line x1="14" y1="46" x2="50" y2="46"/></g>`);
      case 'drizzle':
        return wrap(cloud('M18 36h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 36z') + `<g stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"><line x1="24" y1="44" x2="22" y2="50"/><line x1="34" y1="44" x2="32" y2="50"/><line x1="44" y1="44" x2="42" y2="50"/></g>`);
      case 'rain':
      case 'heavy-rain':
        return wrap(cloud('M18 34h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 34z', '#94a3b8', '#64748b') + `<g stroke="#38bdf8" stroke-width="3" stroke-linecap="round"><line x1="22" y1="42" x2="18" y2="54"/><line x1="32" y1="42" x2="28" y2="54"/><line x1="42" y1="42" x2="38" y2="54"/></g>`);
      case 'snow':
      case 'heavy-snow':
        return wrap(cloud('M18 34h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 34z') + `<g fill="#fff"><circle cx="22" cy="46" r="2.5"/><circle cx="33" cy="48" r="2.5"/><circle cx="43" cy="46" r="2.5"/><circle cx="28" cy="56" r="2"/><circle cx="38" cy="56" r="2"/></g>`);
      case 'thunder':
        return wrap(cloud('M18 32h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 32z', '#475569', '#334155') + `<polygon points="31 34 24 45 31 45 28 58 40 43 33 43" fill="#facc15" stroke="#eab308" stroke-width="1.5" stroke-linejoin="round"/>`);
      default:
        return createWeatherSvg('clear', isDay);
    }
  }

  // Geohash & Cardinal Conversions
  function encodeGeohash(latitude, longitude, precision = 6) {
    const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let isEven = true, latMin = -90, latMax = 90, lonMin = -180, lonMax = 180, bit = 0, ch = 0, geohash = '';
    while (geohash.length < precision) {
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if (longitude > mid) { ch |= 1 << (4 - bit); lonMin = mid; } else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (latitude > mid) { ch |= 1 << (4 - bit); latMin = mid; } else latMax = mid;
      }
      isEven = !isEven;
      if (bit < 4) bit++;
      else { geohash += B32[ch]; bit = 0; ch = 0; }
    }
    return geohash;
  }

  const CARDINAL_TO_DEG = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
  };

  function getDegreesFromCardinal(cardinal) {
    if (typeof cardinal === 'number') return cardinal;
    return cardinal ? (CARDINAL_TO_DEG[cardinal.toString().toUpperCase()] || 0) : 0;
  }

  function getWindDirectionCardinal(degrees) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round((degrees % 360) / 22.5) % 16];
  }

  // Formatters & Converters
  function convertTemp(tempC) {
    if (tempC === null || tempC === undefined) return '--';
    return Math.round(state.unit === 'f' ? (tempC * 9) / 5 + 32 : tempC);
  }

  function convertSpeed(speedKmh) {
    if (speedKmh === null || speedKmh === undefined) return { val: '--', unit: 'km/h' };
    return state.unit === 'f'
      ? { val: Math.round(speedKmh * 0.621371), unit: 'mph' }
      : { val: Math.round(speedKmh), unit: 'km/h' };
  }

  function formatTime(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? '--:--' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function parseDate(dateString) {
    if (!dateString) return new Date();
    if (dateString instanceof Date) return isNaN(dateString.getTime()) ? new Date() : dateString;
    const str = String(dateString).trim();
    const parsed = str.includes('T') ? new Date(str) : new Date(str + 'T00:00:00');
    if (isNaN(parsed.getTime())) {
      const fallback = new Date(str);
      return isNaN(fallback.getTime()) ? new Date() : fallback;
    }
    return parsed;
  }

  function getWeekdayName(dateString) {
    const date = parseDate(dateString);
    return date.toDateString() === new Date().toDateString() ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
  }

  function formatDateShort(dateString) {
    return dateString ? parseDate(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
  }

  function getUvCategory(uv) {
    const val = typeof uv === 'number' ? uv : 0;
    if (val <= 2) return { label: 'Low', advice: 'No protection needed' };
    if (val <= 5) return { label: 'Moderate', advice: 'Sunscreen recommended' };
    if (val <= 7) return { label: 'High', advice: 'Hat & SPF 30+ advised' };
    if (val <= 10) return { label: 'Very High', advice: 'Seek shade midday' };
    return { label: 'Extreme', advice: 'Avoid outdoor exposure' };
  }

  // Dynamic Background & Particles
  function updateAtmosphere(meta, isDay) {
    document.body.className = meta.themeClass;
    if (!elements.weatherParticles) return;
    elements.weatherParticles.innerHTML = '';

    const spawn = (className, count, styleFn) => {
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = `particle ${className}`;
        styleFn(p);
        elements.weatherParticles.appendChild(p);
      }
    };

    if (meta.category === 'rain') {
      spawn('particle-rain', 35, p => {
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
        p.style.animationDelay = Math.random() * 2 + 's';
      });
    } else if (meta.category === 'snow') {
      spawn('particle-snow', 30, p => {
        p.style.left = Math.random() * 100 + 'vw';
        p.style.width = p.style.height = (3 + Math.random() * 5) + 'px';
        p.style.animationDuration = (3 + Math.random() * 4) + 's';
        p.style.animationDelay = Math.random() * 3 + 's';
      });
    } else if (meta.category === 'cloudy') {
      spawn('particle-cloud', 8, p => {
        p.style.left = Math.random() * 95 + 'vw';
        p.style.top = (5 + Math.random() * 55) + 'vh';
        p.style.width = (180 + Math.random() * 220) + 'px';
        p.style.height = (45 + Math.random() * 55) + 'px';
        p.style.animationDuration = (24 + Math.random() * 18) + 's';
        p.style.animationDelay = (Math.random() * -20) + 's';
      });
    } else if (!isDay && meta.category === 'clear') {
      spawn('particle-star', 40, p => {
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh';
        p.style.animationDelay = Math.random() * 3 + 's';
      });
    }
  }

  // =========================================================================
  // API Fetching & Normalization
  // =========================================================================

  async function fetchForecast(lat, lon, locationInfo) {
    showStatus('Connecting to Bureau of Meteorology telemetry...', false);
    try {
      let gh = locationInfo?.geohash;
      if (!gh && lat !== undefined && lon !== undefined) {
        if (lat >= -45 && lat <= -9 && lon >= 110 && lon <= 155) gh = encodeGeohash(lat, lon, 6);
      }

      if (gh) {
        const gh6 = gh.slice(0, 6);
        const [obsRes, dailyRes, hourlyRes, warnRes] = await Promise.allSettled([
          fetch(`https://api.weather.bom.gov.au/v1/locations/${gh6}/observations`),
          fetch(`https://api.weather.bom.gov.au/v1/locations/${gh6}/forecasts/daily`),
          fetch(`https://api.weather.bom.gov.au/v1/locations/${gh6}/forecasts/hourly`),
          fetch(`https://api.weather.bom.gov.au/v1/locations/${gh6}/warnings`),
        ]);

        const obsData = obsRes.status === 'fulfilled' && obsRes.value.ok ? await obsRes.value.json() : null;
        const dailyData = dailyRes.status === 'fulfilled' && dailyRes.value.ok ? await dailyRes.value.json() : null;
        const hourlyData = hourlyRes.status === 'fulfilled' && hourlyRes.value.ok ? await hourlyRes.value.json() : null;
        const warnData = warnRes.status === 'fulfilled' && warnRes.value.ok ? await warnRes.value.json() : null;

        if (dailyData && dailyData.data && dailyData.data.length > 0) {
          state.weatherData = {
            source: 'bom',
            observations: obsData ? obsData.data : null,
            daily: dailyData.data,
            hourly: hourlyData ? hourlyData.data : [],
            warnings: warnData ? warnData.data : [],
            geohash: gh6,
          };
          state.currentLocation = locationInfo || {
            name: obsData?.data?.station?.name || 'Australian Location',
            state: 'AU',
            geohash: gh6,
            lat,
            lon,
            source: 'bom',
          };
          state.selectedDayIndex = 0;
          renderDashboard();
          hideStatus();
          return;
        }
      }

      await fetchOpenMeteoForecast(lat, lon, locationInfo);
    } catch (err) {
      console.error('Forecast error:', err);
      showStatus('Unable to retrieve weather data. Please check connection and try again.', true);
    }
  }

  async function fetchOpenMeteoForecast(lat, lon, locationInfo) {
    const safeLat = lat || -33.8688;
    const safeLon = lon || 151.2093;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code,uv_index,is_day,relative_humidity_2m,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant&forecast_days=10&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather service error: ${response.status}`);
    const data = await response.json();

    state.weatherData = { source: 'open-meteo', ...data };
    state.currentLocation = locationInfo || { name: 'Global Location', country: '', countryCode: 'OM', lat: safeLat, lon: safeLon };
    state.selectedDayIndex = 0;

    renderDashboard();
    hideStatus();
  }

  async function searchCities(query) {
    if (!query || query.trim().length < 2) {
      elements.searchResultsDropdown.classList.add('hidden');
      elements.searchResultsDropdown.innerHTML = '';
      return;
    }

    try {
      const bomRes = await fetch(`https://api.weather.bom.gov.au/v1/locations?search=${encodeURIComponent(query.trim())}`);
      if (bomRes.ok) {
        const bomJson = await bomRes.json();
        if (bomJson.data && bomJson.data.length > 0) {
          renderSearchResults(bomJson.data.slice(0, 8), 'bom');
          return;
        }
      }

      const omRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`);
      if (omRes.ok) {
        const omJson = await omRes.json();
        renderSearchResults(omJson.results || [], 'open-meteo');
        return;
      }

      renderSearchResults([], 'bom');
    } catch (err) {
      console.error('Location search failed:', err);
    }
  }

  async function reverseGeocode(lat, lon) {
    try {
      const bomRes = await fetch(`https://api.weather.bom.gov.au/v1/locations?search=${lat},${lon}`);
      if (bomRes.ok) {
        const bomJson = await bomRes.json();
        if (bomJson.data && bomJson.data.length > 0) {
          const loc = bomJson.data[0];
          return { name: loc.name, state: loc.state || 'AU', country: 'Australia', countryCode: loc.state || 'AU', geohash: loc.geohash, lat, lon, source: 'bom' };
        }
      }
      if (lat >= -45 && lat <= -9 && lon >= 110 && lon <= 155) {
        return { name: 'My Location', state: 'AU', country: 'Australia', countryCode: 'AU', geohash: encodeGeohash(lat, lon, 6), lat, lon, source: 'bom' };
      }
      const omRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${lat},${lon}&count=1&language=en&format=json`);
      if (omRes.ok) {
        const omJson = await omRes.json();
        if (omJson.results && omJson.results.length > 0) {
          const r = omJson.results[0];
          return { name: r.name, country: r.country, countryCode: r.country_code, lat, lon, source: 'open-meteo' };
        }
      }
    } catch (e) {
      console.warn('Reverse geocode fallback:', e);
    }
    return { name: 'Current Location', country: '', countryCode: 'GPS', lat, lon, source: 'open-meteo' };
  }

  // =========================================================================
  // Unified View Model Builder & Renderer
  // =========================================================================

  function selectDay(dayIndex) {
    state.selectedDayIndex = dayIndex;
    renderDashboard();
  }

  function buildViewModel() {
    const isBom = state.weatherData.source === 'bom';
    const isToday = state.selectedDayIndex === 0;
    const loc = state.currentLocation;
    const now = new Date();
    const currentHour = now.getHours();
    const isNightNow = currentHour < 6 || currentHour >= 18;

    let vm = {
      isToday,
      isBom,
      cityName: loc.name || 'Australia',
      countryBadge: loc.state || loc.countryCode || loc.country || 'AU',
      sourceBadge: isBom ? 'BOM Australia' : 'Global Satellite',
      warning: null,
      station: null,
      synopticText: null,
      active24Hours: [],
      dailyList: [],
    };

    if (isBom) {
      const { observations, daily, hourly, warnings } = state.weatherData;
      const validDays = daily.filter(d => d.temp_max !== null || d.temp_min !== null || d.icon_descriptor !== null);
      const dIdx = Math.min(state.selectedDayIndex, validDays.length - 1);
      const dayItem = validDays[dIdx];

      if (warnings && warnings.length > 0) {
        const w = warnings[0];
        vm.warning = {
          title: w.title || w.short_title || 'BOM Weather Warning',
          text: `${w.state || ''} ${w.type ? w.type.replace(/_/g, ' ').toUpperCase() : ''} — ${w.phase || 'Active'}`.trim()
        };
      }

      if (observations?.station) {
        const distStr = observations.station.distance ? ` (${(observations.station.distance / 1000).toFixed(1)} km)` : '';
        vm.station = `Observed at ${observations.station.name}${distStr}`;
      } else {
        vm.station = 'Bureau of Meteorology Ground Station';
      }

      const synText = dayItem.extended_text || dayItem.short_text || '';
      if (synText) vm.synopticText = `"${synText}"`;

      const rainChanceVal = dayItem.rain?.chance || 0;
      const uvVal = dayItem.uv?.max_index || 0;
      const sunriseVal = dayItem.astronomical?.sunrise_time;
      const sunsetVal = dayItem.astronomical?.sunset_time;

      if (isToday) {
        vm.localTimeText = `Local time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' })}`;
        const desc = dayItem.icon_descriptor || (isNightNow ? 'clear' : 'sunny');
        vm.weatherMeta = getBomWeatherMeta(desc, isNightNow ? 0 : 1);
        vm.heroTemp = observations?.temp ?? dayItem.temp_max ?? 20;
        vm.apparentTemp = observations?.temp_feels_like ?? vm.heroTemp;
        vm.highTemp = dayItem.temp_max ?? observations?.max_temp?.value ?? vm.heroTemp;
        vm.lowTemp = dayItem.temp_min ?? observations?.min_temp?.value ?? vm.heroTemp;
        vm.precipPillLabel = 'Rain (9 AM)';
        const rain9 = observations?.rain_since_9am ?? 0;
        vm.precipText = `${rain9} mm`;
        vm.windSpeedVal = observations?.wind?.speed_kilometre ?? 15;
        vm.windDirDeg = getDegreesFromCardinal(observations?.wind?.direction ?? 'S');
        vm.humidityVal = observations?.humidity ?? 65;
        vm.hourlyTitle = 'BOM Hourly Forecast';
        vm.hourlySubtitle = 'Next 24 Hours';

        for (let i = 0; i < Math.min(24, hourly.length); i++) {
          const h = hourly[i];
          vm.active24Hours.push({
            time: h.time, temp: h.temp, code: h.icon_descriptor || 'sunny',
            pop: h.rain?.chance || 0, uv: typeof h.uv === 'number' ? h.uv : 0,
            isDay: !h.is_night, humidity: h.relative_humidity || 50
          });
        }
      } else {
        const targetDateStr = dayItem.date;
        const weekday = getWeekdayName(targetDateStr);
        const shortDate = formatDateShort(targetDateStr);
        vm.localTimeText = `Forecast for ${weekday}, ${shortDate}`;
        vm.weatherMeta = getBomWeatherMeta(dayItem.icon_descriptor || 'sunny', 1);
        vm.heroTemp = dayItem.temp_max ?? dayItem.temp_min ?? 20;
        vm.apparentTemp = vm.heroTemp;
        vm.highTemp = dayItem.temp_max ?? vm.heroTemp;
        vm.lowTemp = dayItem.temp_min ?? vm.heroTemp;
        vm.precipPillLabel = 'Precipitation';
        const rainMin = dayItem.rain?.amount?.min || 0;
        const rainMax = dayItem.rain?.amount?.max || 0;
        vm.precipText = rainMax > 0 ? `${rainMin}-${rainMax} mm` : `${rainChanceVal}% chance`;
        vm.windSpeedVal = 16;
        vm.windDirDeg = 180;
        vm.humidityVal = 55;
        vm.hourlyTitle = `${weekday}'s Hourly Forecast`;
        vm.hourlySubtitle = `24-Hour Timeline (${shortDate})`;

        const targetLocalDay = parseDate(targetDateStr).toLocaleDateString();
        const matched = hourly.filter(h => parseDate(h.time).toLocaleDateString() === targetLocalDay);
        if (matched.length >= 8) {
          matched.forEach(h => vm.active24Hours.push({
            time: h.time, temp: h.temp, code: h.icon_descriptor || 'sunny',
            pop: h.rain?.chance || 0, uv: typeof h.uv === 'number' ? h.uv : 0,
            isDay: !h.is_night, humidity: h.relative_humidity || 50
          }));
        } else {
          const baseMin = vm.lowTemp ?? 12, baseMax = vm.highTemp ?? 22, peakUv = uvVal || 5;
          const targetMidnight = parseDate(targetDateStr);
          targetMidnight.setHours(0, 0, 0, 0);
          for (let h = 0; h < 24; h++) {
            const hDate = new Date(targetMidnight.getTime() + h * 3600000);
            const solarFactor = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
            const tFactor = (Math.sin(((h - 8) / 12) * Math.PI) + 1) / 2;
            vm.active24Hours.push({
              time: hDate.toISOString(),
              temp: Math.round(baseMin + (baseMax - baseMin) * tFactor),
              code: dayItem.icon_descriptor || 'sunny',
              pop: rainChanceVal,
              uv: h >= 7 && h <= 17 ? +(peakUv * solarFactor).toFixed(1) : 0,
              isDay: h >= 6 && h < 18,
              humidity: Math.round(65 - 20 * solarFactor),
            });
          }
        }
      }

      vm.conditionText = dayItem.short_text || vm.weatherMeta.description;
      vm.uvVal = uvVal;
      vm.sunriseVal = sunriseVal;
      vm.sunsetVal = sunsetVal;
      vm.rainChanceVal = rainChanceVal;
      vm.rainMaxAmt = dayItem.rain?.amount?.max || 0;
      vm.pressureVal = 1013;
      vm.pressureState = 'Standard Australian ground station pressure';

      vm.dailyList = validDays.map((d, i) => ({
        index: i,
        date: d.date,
        dayLabel: i === 0 ? 'Today' : getWeekdayName(d.date),
        shortDate: formatDateShort(d.date),
        iconType: getBomWeatherMeta(d.icon_descriptor || 'sunny', 1).iconType,
        minTemp: d.temp_min ?? d.temp_max,
        maxTemp: d.temp_max ?? d.temp_min,
        rainProb: d.rain?.chance || 0,
        isSelected: i === state.selectedDayIndex,
      }));
    } else {
      // Open-Meteo fallback
      const { current, hourly, daily, timezone } = state.weatherData;
      const dIdx = Math.min(state.selectedDayIndex, daily.time.length - 1);
      const rainChanceVal = daily.precipitation_probability_max[dIdx] || 0;
      const uvVal = daily.uv_index_max[dIdx] || 0;

      vm.highTemp = daily.temperature_2m_max[dIdx];
      vm.lowTemp = daily.temperature_2m_min[dIdx];
      vm.sunriseVal = daily.sunrise[dIdx];
      vm.sunsetVal = daily.sunset[dIdx];
      vm.rainChanceVal = rainChanceVal;
      vm.precipPillLabel = 'Precipitation';

      if (isToday) {
        try {
          vm.localTimeText = `Local time: ${now.toLocaleTimeString([], { timeZone: timezone, hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' })}`;
        } catch (e) {
          vm.localTimeText = `Timezone: ${timezone}`;
        }
        const isDayVal = current.is_day !== undefined ? current.is_day : 1;
        vm.weatherMeta = getWeatherMeta(current.weather_code, isDayVal);
        vm.heroTemp = current.temperature_2m;
        vm.apparentTemp = current.apparent_temperature;
        vm.precipText = `${current.precipitation || 0} mm`;
        vm.windSpeedVal = current.wind_speed_10m;
        vm.windDirDeg = current.wind_direction_10m;
        vm.humidityVal = current.relative_humidity_2m;
        vm.pressureVal = Math.round(current.surface_pressure || 1013);
        vm.hourlyTitle = 'Hourly Forecast';
        vm.hourlySubtitle = 'Next 24 Hours';

        const nowIso = new Date().toISOString().slice(0, 13);
        let sIdx = hourly.time.findIndex(t => t.startsWith(nowIso));
        if (sIdx === -1) sIdx = 0;
        for (let i = sIdx; i < Math.min(sIdx + 24, hourly.time.length); i++) {
          vm.active24Hours.push({
            time: hourly.time[i], temp: hourly.temperature_2m[i], code: hourly.weather_code[i],
            pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
            uv: hourly.uv_index ? hourly.uv_index[i] : 0, isDay: hourly.is_day ? hourly.is_day[i] : 1
          });
        }
      } else {
        const targetDate = daily.time[dIdx];
        const weekday = getWeekdayName(targetDate);
        const shortDate = formatDateShort(targetDate);
        vm.localTimeText = `Forecast for ${weekday}, ${shortDate}`;
        vm.weatherMeta = getWeatherMeta(daily.weather_code[dIdx], 1);
        vm.heroTemp = daily.temperature_2m_max[dIdx];
        vm.apparentTemp = vm.heroTemp;
        vm.precipText = `Max ${rainChanceVal}% chance`;
        vm.windSpeedVal = daily.wind_speed_10m_max ? daily.wind_speed_10m_max[dIdx] : 14;
        vm.windDirDeg = daily.wind_direction_10m_dominant ? daily.wind_direction_10m_dominant[dIdx] : 180;
        vm.hourlyTitle = `${weekday}'s Hourly Forecast`;
        vm.hourlySubtitle = `24-Hour Timeline (${shortDate})`;

        for (let i = 0; i < hourly.time.length; i++) {
          if (hourly.time[i].startsWith(targetDate)) {
            vm.active24Hours.push({
              time: hourly.time[i], temp: hourly.temperature_2m[i], code: hourly.weather_code[i],
              pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
              uv: hourly.uv_index ? hourly.uv_index[i] : 0, isDay: hourly.is_day ? hourly.is_day[i] : 1,
              humidity: hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : 50,
              pressure: hourly.surface_pressure ? hourly.surface_pressure[i] : 1013
            });
          }
        }
        const midHour = vm.active24Hours[12] || vm.active24Hours[0] || {};
        vm.humidityVal = midHour.humidity || 50;
        vm.pressureVal = Math.round(midHour.pressure || 1013);
      }

      vm.conditionText = vm.weatherMeta.description;
      vm.uvVal = uvVal;
      vm.pressureState = vm.pressureVal < 1005 ? 'Low pressure system (storms)' : (vm.pressureVal > 1020 ? 'High pressure (fair weather)' : 'Normal atmospheric pressure');
      const count = Math.min(daily.time.length, 10);
      for (let i = 0; i < count; i++) {
        vm.dailyList.push({
          index: i,
          date: daily.time[i],
          dayLabel: i === 0 ? 'Today' : getWeekdayName(daily.time[i]),
          shortDate: formatDateShort(daily.time[i]),
          iconType: getWeatherMeta(daily.weather_code[i], 1).iconType,
          minTemp: daily.temperature_2m_min[i],
          maxTemp: daily.temperature_2m_max[i],
          rainProb: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0,
          isSelected: i === state.selectedDayIndex,
        });
      }
    }

    return vm;
  }

  function renderDashboard() {
    if (!state.weatherData || !state.currentLocation) return;
    const vm = buildViewModel();
    state.activeDayHours = vm.active24Hours;

    // Header & Badges
    if (elements.sourceBadge) elements.sourceBadge.textContent = vm.sourceBadge;
    elements.cityName.textContent = vm.cityName;
    elements.countryBadge.textContent = vm.countryBadge;

    // Warning Banner
    if (elements.bomWarningBanner) {
      if (vm.warning) {
        elements.bomWarningTitle.textContent = vm.warning.title;
        elements.bomWarningText.textContent = vm.warning.text;
        elements.bomWarningBanner.classList.remove('hidden');
      } else {
        elements.bomWarningBanner.classList.add('hidden');
      }
    }

    // Observation Station Pill
    if (elements.bomStationPill && elements.bomStationName) {
      if (vm.station) {
        elements.bomStationName.textContent = vm.station;
        elements.bomStationPill.classList.remove('hidden');
      } else {
        elements.bomStationPill.classList.add('hidden');
      }
    }

    // Synoptic Box
    if (elements.bomSynopticBox && elements.bomSynopticText) {
      if (vm.synopticText) {
        elements.bomSynopticText.textContent = vm.synopticText;
        elements.bomSynopticBox.classList.remove('hidden');
      } else {
        elements.bomSynopticBox.classList.add('hidden');
      }
    }

    // Live button & Local time
    if (elements.resetLiveBtn) elements.resetLiveBtn.classList.toggle('hidden', vm.isToday);
    elements.localTime.textContent = vm.localTimeText;

    // Atmosphere
    const nowH = new Date().getHours();
    updateAtmosphere(vm.weatherMeta, vm.isToday ? (nowH >= 6 && nowH < 18 ? 1 : 0) : 1);

    // Hero Card
    elements.conditionBadge.className = 'weather-badge';
    elements.conditionText.textContent = vm.conditionText;
    elements.currentTemp.textContent = convertTemp(vm.heroTemp);
    elements.displayUnit.textContent = `°${state.unit.toUpperCase()}`;
    elements.heroWeatherIcon.innerHTML = createWeatherSvg(vm.weatherMeta.iconType, vm.isToday ? (nowH >= 6 && nowH < 18 ? 1 : 0) : 1);
    elements.apparentTemp.textContent = `${convertTemp(vm.apparentTemp)}°${state.unit.toUpperCase()}`;
    elements.tempRange.textContent = `${convertTemp(vm.highTemp)}° / ${convertTemp(vm.lowTemp)}°`;
    if (elements.precipPillLabel) elements.precipPillLabel.textContent = vm.precipPillLabel;
    elements.precipitationCurrent.textContent = vm.precipText;

    // Highlights: Wind
    const wind = convertSpeed(vm.windSpeedVal);
    elements.windSpeed.textContent = wind.val;
    elements.windUnit.textContent = wind.unit;
    elements.windDirText.textContent = `${getWindDirectionCardinal(vm.windDirDeg)} (${vm.windDirDeg}°)`;
    elements.compassNeedle.style.transform = `rotate(${vm.windDirDeg}deg)`;

    // Highlights: Humidity
    elements.humidityVal.textContent = vm.humidityVal;
    elements.humidityProgress.style.width = `${Math.min(vm.humidityVal, 100)}%`;
    elements.humidityState.textContent = vm.humidityVal < 30 ? 'Dry air' : (vm.humidityVal <= 60 ? 'Comfortable moisture' : 'High humidity / sticky');

    // Highlights: UV Index
    elements.uvVal.textContent = vm.uvVal.toFixed(1);
    elements.uvIndicator.style.left = `${Math.min((vm.uvVal / 12) * 100, 100)}%`;
    const uvCat = getUvCategory(vm.uvVal);
    elements.uvBadge.textContent = uvCat.label;
    elements.uvAdvice.textContent = uvCat.advice;

    // Highlights: Sun Times
    elements.sunriseTime.textContent = formatTime(vm.sunriseVal);
    elements.sunsetTime.textContent = formatTime(vm.sunsetVal);

    // Highlights: Rain Chance
    elements.rainChanceVal.textContent = vm.rainChanceVal;
    elements.rainProgress.style.width = `${vm.rainChanceVal}%`;
    if (vm.rainChanceVal === 0) elements.rainAdvice.textContent = 'Zero chance of precipitation';
    else if (vm.rainChanceVal < 40) elements.rainAdvice.textContent = vm.rainMaxAmt ? `Possible shower (up to ${vm.rainMaxAmt} mm)` : 'Unlikely, but possible drizzle';
    else if (vm.rainChanceVal < 70) elements.rainAdvice.textContent = vm.rainMaxAmt ? `Rain likely (up to ${vm.rainMaxAmt} mm)` : 'Bring an umbrella';
    else elements.rainAdvice.textContent = vm.rainMaxAmt ? `High chance of rain (${vm.rainMaxAmt} mm)` : 'High probability of rain / storm';

    // Highlights: Pressure
    elements.pressureVal.textContent = vm.pressureVal;
    elements.pressureState.textContent = vm.pressureState;

    // Lists & Charts
    renderDailyForecast(vm.dailyList, vm.isBom);
    if (elements.hourlyTitle) elements.hourlyTitle.textContent = vm.hourlyTitle;
    if (elements.hourlySubtitle) elements.hourlySubtitle.textContent = vm.hourlySubtitle;
    renderHourlyForecast(vm.active24Hours, vm.isToday);
    drawMiniUvChart(vm.active24Hours);
    renderFavorites();
  }

  function renderDailyForecast(dailyList, isBom) {
    elements.dailyForecastList.innerHTML = '';
    if (elements.dailyForecastTitle) {
      elements.dailyForecastTitle.textContent = isBom ? `BOM ${dailyList.length}-Day Forecast` : `${dailyList.length}-Day Forecast`;
    }

    const minTemps = dailyList.map(d => d.minTemp ?? 10);
    const maxTemps = dailyList.map(d => d.maxTemp ?? 20);
    const absMin = Math.min(...minTemps);
    const absMax = Math.max(...maxTemps);
    const rangeSpan = Math.max(absMax - absMin, 1);

    dailyList.forEach(d => {
      const leftPct = ((d.minTemp - absMin) / rangeSpan) * 100;
      const widthPct = Math.max(((d.maxTemp - d.minTemp) / rangeSpan) * 100, 8);
      const item = document.createElement('div');
      item.className = `daily-item ${d.isSelected ? 'active-day' : ''}`;
      item.setAttribute('data-day-index', d.index);
      item.setAttribute('title', `Click to view ${d.dayLabel} (${d.shortDate}) forecast details`);
      item.innerHTML = `
        <div class="daily-day-col">
          <span class="daily-day">${d.dayLabel}</span>
          <span class="daily-date-sub">${d.shortDate}</span>
        </div>
        <div class="daily-condition">
          <div class="daily-icon">${createWeatherSvg(d.iconType, 1)}</div>
          ${d.rainProb > 0 ? `<span class="daily-rain-chance">${d.rainProb}%</span>` : ''}
        </div>
        <div class="daily-temp-bar-wrap">
          <span class="daily-temp-min">${convertTemp(d.minTemp)}°</span>
          <div class="daily-bar"><div class="daily-bar-inner" style="left: ${leftPct}%; width: ${widthPct}%;"></div></div>
          <span class="daily-temp-max">${convertTemp(d.maxTemp)}°</span>
        </div>
      `;
      item.addEventListener('click', () => selectDay(d.index));
      elements.dailyForecastList.appendChild(item);
    });
  }

  function renderHourlyForecast(hourlyData, isToday) {
    elements.hourlyStrip.innerHTML = '';
    const hours = hourlyData || state.activeDayHours;
    if (!hours || hours.length === 0) return;

    hours.forEach((h, idx) => {
      const meta = typeof h.code === 'string' ? getBomWeatherMeta(h.code, h.isDay) : getWeatherMeta(h.code, h.isDay);
      const isNow = isToday && idx === 0;
      const el = document.createElement('div');
      el.className = `hourly-item ${isNow ? 'now' : ''}`;
      el.innerHTML = `
        <span class="hourly-time">${isNow ? 'Now' : formatTime(h.time)}</span>
        <div class="hourly-icon">${createWeatherSvg(meta.iconType, h.isDay)}</div>
        <span class="hourly-temp">${convertTemp(h.temp)}°</span>
        <span class="hourly-pop">${h.pop > 0 ? `💧${h.pop}%` : ''}</span>
        ${h.uv > 0 ? `<span class="hourly-uv-tag" style="font-size:0.68rem; color:#facc15; font-weight:700;">☀️ ${h.uv.toFixed(0)}</span>` : ''}
      `;
      elements.hourlyStrip.appendChild(el);
    });

    if (state.activeTab === 'chart') drawHourlyChart(hours);
    else if (state.activeTab === 'uv') drawHourlyUvChart(hours);
  }

  // =========================================================================
  // Canvas Chart Helpers & Renderers
  // =========================================================================

  function setupCanvas(canvas, container, height) {
    if (!canvas) return null;
    const cWidth = container ? container.clientWidth : 0;
    const rWidth = canvas.getBoundingClientRect().width;
    const width = Math.floor(cWidth > 40 ? cWidth : (rWidth > 40 ? rWidth : 600));
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function drawSmoothLine(ctx, points, strokeColor, fillColor, bottomY) {
    if (!points || points.length < 2) return;
    if (fillColor) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, bottomY);
      ctx.lineTo(points[0].x, bottomY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawHourlyChart(hourlyData) {
    const data = hourlyData || state.activeDayHours;
    if (!data || data.length < 2) return;
    const c = setupCanvas(elements.hourlyCanvas, elements.hourlyChartContainer, 180);
    if (!c) return;

    const { ctx, width, height } = c;
    const padX = 35, padTop = 25, padBtm = 35;
    const chartW = width - padX * 2, chartH = height - padTop - padBtm;
    const temps = data.map(d => convertTemp(d.temp));
    const minT = Math.min(...temps) - 1, maxT = Math.max(...temps) + 1;
    const tRange = Math.max(maxT - minT, 2);
    const stepX = chartW / (data.length - 1);

    // Rain bars
    data.forEach((d, i) => {
      const pop = d.pop || 0;
      if (pop > 0) {
        const bH = (pop / 100) * (chartH * 0.55);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fillRect(padX + i * stepX - 6, height - padBtm - bH, 12, bH);
      }
    });

    const points = data.map((d, i) => ({
      x: padX + i * stepX,
      y: height - padBtm - ((convertTemp(d.temp) - minT) / tRange) * chartH,
      temp: convertTemp(d.temp),
      time: d.time
    }));

    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBtm);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    drawSmoothLine(ctx, points, '#38bdf8', grad, height - padBtm);

    // Points & Labels
    const labelStep = Math.max(1, Math.floor(data.length / 8));
    points.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#0b132b';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (i % labelStep === 0 || i === points.length - 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${pt.temp}°`, pt.x, pt.y - 10);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(formatTime(pt.time), pt.x, height - 12);
      }
    });

    if (elements.chartLegend) {
      elements.chartLegend.innerHTML = `
        <span class="legend-item"><span class="legend-dot temp-dot"></span> Temperature</span>
        <span class="legend-item"><span class="legend-dot rain-dot"></span> Rain Chance %</span>
      `;
    }
  }

  function drawHourlyUvChart(hourlyData) {
    const data = hourlyData || state.activeDayHours;
    if (!data || data.length < 2) return;
    const c = setupCanvas(elements.hourlyCanvas, elements.hourlyChartContainer, 210);
    if (!c) return;

    const { ctx, width, height } = c;
    const padX = 35, padTop = 30, padBtm = 40;
    const chartW = width - padX * 2, chartH = height - padTop - padBtm;
    const maxUv = Math.max(...data.map(d => typeof d.uv === 'number' ? d.uv : 0), 1);
    const yMax = Math.max(12, Math.ceil(maxUv + 1));
    const stepX = chartW / (data.length - 1);

    // WHO UV Color bands
    const bands = [
      { max: 2, color: 'rgba(16, 185, 129, 0.12)' },
      { max: 5, color: 'rgba(250, 204, 21, 0.12)' },
      { max: 7, color: 'rgba(249, 115, 22, 0.12)' },
      { max: 10, color: 'rgba(239, 68, 68, 0.12)' },
      { max: 12, color: 'rgba(168, 85, 247, 0.12)' }
    ];
    let prev = 0;
    bands.forEach(b => {
      const yBottom = height - padBtm - (prev / yMax) * chartH;
      const yTop = height - padBtm - (Math.min(b.max, yMax) / yMax) * chartH;
      ctx.fillStyle = b.color;
      ctx.fillRect(padX, yTop, chartW, yBottom - yTop);
      prev = b.max;
    });

    const points = data.map((d, i) => {
      const uv = typeof d.uv === 'number' ? d.uv : 0;
      return { x: padX + i * stepX, y: height - padBtm - (uv / yMax) * chartH, uv, time: d.time };
    });

    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBtm);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
    grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    drawSmoothLine(ctx, points, '#facc15', grad, height - padBtm);

    const labelStep = Math.max(1, Math.floor(data.length / 8));
    points.forEach((pt, i) => {
      if (pt.uv > 0) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = pt.uv > 7 ? '#ef4444' : (pt.uv > 5 ? '#f97316' : (pt.uv > 2 ? '#facc15' : '#10b981'));
        ctx.fill();
        ctx.strokeStyle = '#0b132b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (i % labelStep === 0 || i === points.length - 1) {
        if (pt.uv > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pt.uv.toFixed(1), pt.x, pt.y - 8);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatTime(pt.time), pt.x, height - 12);
      }
    });

    if (elements.chartLegend) {
      elements.chartLegend.innerHTML = `
        <span class="legend-item"><span class="legend-dot uv-low"></span> Low (0-2)</span>
        <span class="legend-item"><span class="legend-dot uv-mod"></span> Mod (3-5)</span>
        <span class="legend-item"><span class="legend-dot uv-high"></span> High (6-7)</span>
        <span class="legend-item"><span class="legend-dot uv-veryhigh"></span> Very High (8-10)</span>
        <span class="legend-item"><span class="legend-dot uv-extreme"></span> Extreme (11+)</span>
      `;
    }
  }

  function drawMiniUvChart(hourlyData) {
    const data = hourlyData || state.activeDayHours;
    if (!data || data.length < 2) return;
    const c = setupCanvas(elements.uvMiniCanvas, null, 42);
    if (!c) return;

    const { ctx, width, height } = c;
    const daylight = data.filter(d => {
      const h = new Date(d.time).getHours();
      return h >= 5 && h <= 20;
    });
    const pts = daylight.length >= 4 ? daylight : data;
    const maxUv = Math.max(...pts.map(d => typeof d.uv === 'number' ? d.uv : 0), 0);
    const yMax = Math.max(12, Math.ceil(maxUv + 1));
    const padX = 8, padY = 6, chartW = width - padX * 2, chartH = height - padY * 2;
    const stepX = chartW / (pts.length - 1);

    const points = pts.map((d, i) => ({
      x: padX + i * stepX,
      y: height - padY - ((typeof d.uv === 'number' ? d.uv : 0) / yMax) * chartH,
      uv: typeof d.uv === 'number' ? d.uv : 0,
      time: d.time
    }));

    const grad = ctx.createLinearGradient(0, padY, 0, height - padY);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    drawSmoothLine(ctx, points, '#facc15', grad, height - padY);

    const curHour = new Date().getHours();
    const curPt = points.find(d => new Date(d.time).getHours() === curHour);
    if (curPt) {
      ctx.beginPath();
      ctx.arc(curPt.x, curPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // =========================================================================
  // Search Autocomplete & Favorites
  // =========================================================================

  function renderSearchResults(results, source = 'bom') {
    elements.searchResultsDropdown.innerHTML = '';
    if (!results || results.length === 0) {
      elements.searchResultsDropdown.innerHTML = `<div class="dropdown-item no-results">No locations found.</div>`;
      elements.searchResultsDropdown.classList.remove('hidden');
      return;
    }

    results.forEach(loc => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      if (source === 'bom') {
        const stateBadge = loc.state ? `<span class="res-state-badge">${loc.state}</span>` : '';
        const postCode = loc.postcode ? `<span class="res-postcode">${loc.postcode}</span>` : '';
        item.innerHTML = `
          <div class="dropdown-city-info">
            <span class="dropdown-city-name">${loc.name}</span>
            <div class="dropdown-sub-row">${stateBadge} ${postCode}</div>
          </div>
          <span class="source-tag">BOM</span>
        `;
        item.addEventListener('click', () => {
          elements.citySearchInput.value = `${loc.name}${loc.state ? `, ${loc.state}` : ''}`;
          elements.searchResultsDropdown.classList.add('hidden');
          fetchForecast(null, null, { name: loc.name, state: loc.state, country: 'Australia', geohash: loc.geohash, source: 'bom' });
        });
      } else {
        const country = loc.country || '';
        const admin1 = loc.admin1 ? `${loc.admin1}, ` : '';
        item.innerHTML = `
          <div class="dropdown-city-info">
            <span class="dropdown-city-name">${loc.name}</span>
            <span class="dropdown-country">${admin1}${country}</span>
          </div>
          <span class="source-tag om-tag">Global</span>
        `;
        item.addEventListener('click', () => {
          elements.citySearchInput.value = `${loc.name}, ${country}`;
          elements.searchResultsDropdown.classList.add('hidden');
          fetchForecast(loc.latitude, loc.longitude, { name: loc.name, country, countryCode: loc.country_code, lat: loc.latitude, lon: loc.longitude, source: 'open-meteo' });
        });
      }
      elements.searchResultsDropdown.appendChild(item);
    });

    elements.searchResultsDropdown.classList.remove('hidden');
  }

  function loadFavorites() {
    const saved = storage.getItem('skypulse_favorites_bom_v2');
    if (saved) {
      try {
        state.favorites = JSON.parse(saved);
        if (!Array.isArray(state.favorites) || state.favorites.length === 0) state.favorites = [...DEFAULT_FAVORITES];
      } catch (e) {
        state.favorites = [...DEFAULT_FAVORITES];
      }
    } else {
      state.favorites = [...DEFAULT_FAVORITES];
    }
    renderFavorites();
  }

  function saveFavorites() {
    storage.setItem('skypulse_favorites_bom_v2', JSON.stringify(state.favorites));
    renderFavorites();
  }

  function renderFavorites() {
    elements.favoritesList.innerHTML = '';
    state.favorites.forEach((fav, index) => {
      const pill = document.createElement('div');
      const isActive = state.currentLocation && state.currentLocation.name.toLowerCase() === fav.name.toLowerCase();
      pill.className = `fav-pill ${isActive ? 'active' : ''}`;
      pill.innerHTML = `<span>${fav.name}</span><span class="fav-remove" title="Remove" data-idx="${index}">&times;</span>`;

      pill.addEventListener('click', e => {
        if (e.target.classList.contains('fav-remove')) {
          e.stopPropagation();
          state.favorites.splice(index, 1);
          saveFavorites();
          return;
        }
        fetchForecast(fav.lat, fav.lon, fav);
      });

      elements.favoritesList.appendChild(pill);
    });
  }

  function pinCurrentLocation() {
    if (!state.currentLocation) return;
    const exists = state.favorites.some(f => f.name.toLowerCase() === state.currentLocation.name.toLowerCase());
    if (exists) {
      showStatus(`${state.currentLocation.name} is already pinned!`, false);
      setTimeout(hideStatus, 2000);
      return;
    }
    state.favorites.push({ ...state.currentLocation });
    saveFavorites();
    showStatus(`Pinned ${state.currentLocation.name} to favorites!`, false);
    setTimeout(hideStatus, 2000);
  }

  function showStatus(msg, isError = false) {
    elements.statusMessage.textContent = msg;
    elements.statusBanner.className = `status-banner ${isError ? 'error' : ''}`;
    elements.statusBanner.classList.remove('hidden');
  }

  function hideStatus() {
    elements.statusBanner.classList.add('hidden');
  }

  // =========================================================================
  // Event Listeners & Bootstrapping
  // =========================================================================

  function setupEventListeners() {
    if (elements.celsiusBtn) {
      elements.celsiusBtn.addEventListener('click', () => {
        if (state.unit === 'c') return;
        state.unit = 'c';
        storage.setItem('skypulse_unit', 'c');
        elements.celsiusBtn.classList.add('active');
        if (elements.fahrenheitBtn) elements.fahrenheitBtn.classList.remove('active');
        renderDashboard();
      });
    }

    if (elements.fahrenheitBtn) {
      elements.fahrenheitBtn.addEventListener('click', () => {
        if (state.unit === 'f') return;
        state.unit = 'f';
        storage.setItem('skypulse_unit', 'f');
        elements.fahrenheitBtn.classList.add('active');
        if (elements.celsiusBtn) elements.celsiusBtn.classList.remove('active');
        renderDashboard();
      });
    }

    const setTab = (tabName, btnActive) => {
      state.activeTab = tabName;
      [elements.tabCardsView, elements.tabChartView, elements.tabUvView].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (btnActive) btnActive.classList.add('active');
      if (tabName === 'cards') {
        if (elements.hourlyCardsView) elements.hourlyCardsView.classList.remove('hidden');
        if (elements.hourlyChartContainer) elements.hourlyChartContainer.classList.add('hidden');
      } else {
        if (elements.hourlyCardsView) elements.hourlyCardsView.classList.add('hidden');
        if (elements.hourlyChartContainer) elements.hourlyChartContainer.classList.remove('hidden');
        if (state.activeDayHours) {
          if (tabName === 'chart') drawHourlyChart(state.activeDayHours);
          else drawHourlyUvChart(state.activeDayHours);
        }
      }
    };

    if (elements.tabCardsView) elements.tabCardsView.addEventListener('click', () => setTab('cards', elements.tabCardsView));
    if (elements.tabChartView) elements.tabChartView.addEventListener('click', () => setTab('chart', elements.tabChartView));
    if (elements.tabUvView) elements.tabUvView.addEventListener('click', () => setTab('uv', elements.tabUvView));

    if (elements.resetLiveBtn) {
      elements.resetLiveBtn.addEventListener('click', () => selectDay(0));
    }

    if (elements.citySearchInput) {
      elements.citySearchInput.addEventListener('input', e => {
        const q = e.target.value;
        if (elements.searchWrapper) {
          elements.searchWrapper.classList.toggle('has-text', q.length > 0);
        }
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => searchCities(q), 300);
      });
    }

    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.addEventListener('click', () => {
        if (elements.citySearchInput) {
          elements.citySearchInput.value = '';
          elements.citySearchInput.focus();
        }
        if (elements.searchWrapper) {
          elements.searchWrapper.classList.remove('has-text');
        }
        if (elements.searchResultsDropdown) {
          elements.searchResultsDropdown.classList.add('hidden');
          elements.searchResultsDropdown.innerHTML = '';
        }
      });
    }

    document.addEventListener('click', e => {
      if (elements.searchResultsDropdown && !elements.searchResultsDropdown.contains(e.target) && e.target !== elements.citySearchInput) {
        elements.searchResultsDropdown.classList.add('hidden');
      }
    });

    if (elements.geoBtn) {
      elements.geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          showStatus('Geolocation is not supported by your browser.', true);
          return;
        }
        showStatus('Acquiring your GPS coordinates...', false);
        navigator.geolocation.getCurrentPosition(
          async pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const loc = await reverseGeocode(lat, lon);
            fetchForecast(lat, lon, loc);
          },
          err => {
            console.warn('Geolocation denied or error:', err);
            showStatus('Location access was denied or unavailable.', true);
            setTimeout(hideStatus, 3000);
          }
        );
      });
    }

    if (elements.pinCurrentBtn) {
      elements.pinCurrentBtn.addEventListener('click', pinCurrentLocation);
    }
  }

  function handleResize() {
    if (state.activeDayHours) {
      drawMiniUvChart(state.activeDayHours);
      if (state.activeTab === 'chart') drawHourlyChart(state.activeDayHours);
      else if (state.activeTab === 'uv') drawHourlyUvChart(state.activeDayHours);
    }
  }

  function init() {
    if (state.unit === 'f') {
      if (elements.fahrenheitBtn) elements.fahrenheitBtn.classList.add('active');
      if (elements.celsiusBtn) elements.celsiusBtn.classList.remove('active');
    }
    setupEventListeners();
    loadFavorites();

    const def = DEFAULT_FAVORITES[0];
    fetchForecast(def.lat, def.lon, def);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    });

    if (window.ResizeObserver && elements.hourlyChartContainer) {
      const ro = new window.ResizeObserver(() => handleResize());
      ro.observe(elements.hourlyChartContainer);
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      state, WMO_CODES, BOM_ICON_MAP, getBomWeatherMeta, getWeatherMeta,
      createWeatherSvg, encodeGeohash, getDegreesFromCardinal, getWindDirectionCardinal,
      convertTemp, convertSpeed, formatTime, parseDate, getWeekdayName, formatDateShort,
      getUvCategory, buildViewModel, setupCanvas, drawSmoothLine,
      fetchForecast, selectDay, renderDashboard
    };
  }
})();
