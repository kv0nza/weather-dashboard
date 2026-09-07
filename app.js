/**
 * SkyPulse Weather Dashboard
 * High-performance, client-side meteorology intelligence powered by Open-Meteo
 */

(function () {
  'use strict';

  // State Management
  const state = {
    unit: localStorage.getItem('skypulse_unit') || 'c', // 'c' or 'f'
    currentLocation: null,
    weatherData: null,
    favorites: [],
    activeTab: 'cards', // 'cards', 'chart' (temp & rain), or 'uv' (solar curve)
    selectedDayIndex: 0, // 0 = live current / today, 1..6 = extended forecast days
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

  // DOM Elements
  const elements = {
    sourceBadge: document.getElementById('sourceBadge'),
    weatherBg: document.getElementById('weatherBg'),
    weatherParticles: document.getElementById('weatherParticles'),
    citySearchInput: document.getElementById('citySearchInput'),
    searchWrapper: document.querySelector('.search-wrapper'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchResultsDropdown: document.getElementById('searchResultsDropdown'),
    geoBtn: document.getElementById('geoBtn'),
    celsiusBtn: document.getElementById('celsiusBtn'),
    fahrenheitBtn: document.getElementById('fahrenheitBtn'),
    favoritesList: document.getElementById('favoritesList'),
    pinCurrentBtn: document.getElementById('pinCurrentBtn'),
    statusBanner: document.getElementById('statusBanner'),
    statusMessage: document.getElementById('statusMessage'),
    bomWarningBanner: document.getElementById('bomWarningBanner'),
    bomWarningTitle: document.getElementById('bomWarningTitle'),
    bomWarningText: document.getElementById('bomWarningText'),
    cityName: document.getElementById('cityName'),
    countryBadge: document.getElementById('countryBadge'),
    localTime: document.getElementById('localTime'),
    resetLiveBtn: document.getElementById('resetLiveBtn'),
    bomStationPill: document.getElementById('bomStationPill'),
    bomStationName: document.getElementById('bomStationName'),
    conditionBadge: document.getElementById('conditionBadge'),
    conditionText: document.getElementById('conditionText'),
    currentTemp: document.getElementById('currentTemp'),
    displayUnit: document.getElementById('displayUnit'),
    heroWeatherIcon: document.getElementById('heroWeatherIcon'),
    apparentTemp: document.getElementById('apparentTemp'),
    tempRange: document.getElementById('tempRange'),
    precipPillLabel: document.getElementById('precipPillLabel'),
    precipitationCurrent: document.getElementById('precipitationCurrent'),
    bomSynopticBox: document.getElementById('bomSynopticBox'),
    bomSynopticText: document.getElementById('bomSynopticText'),
    dailyForecastTitle: document.getElementById('dailyForecastTitle'),
    dailyForecastList: document.getElementById('dailyForecastList'),
    windSpeed: document.getElementById('windSpeed'),
    windUnit: document.getElementById('windUnit'),
    windDirText: document.getElementById('windDirText'),
    compassNeedle: document.getElementById('compassNeedle'),
    humidityVal: document.getElementById('humidityVal'),
    humidityProgress: document.getElementById('humidityProgress'),
    humidityState: document.getElementById('humidityState'),
    uvVal: document.getElementById('uvVal'),
    uvBadge: document.getElementById('uvBadge'),
    uvIndicator: document.getElementById('uvIndicator'),
    uvAdvice: document.getElementById('uvAdvice'),
    uvMiniCanvas: document.getElementById('uvMiniCanvas'),
    sunriseTime: document.getElementById('sunriseTime'),
    sunsetTime: document.getElementById('sunsetTime'),
    rainChanceVal: document.getElementById('rainChanceVal'),
    rainProgress: document.getElementById('rainProgress'),
    rainAdvice: document.getElementById('rainAdvice'),
    pressureVal: document.getElementById('pressureVal'),
    pressureState: document.getElementById('pressureState'),
    hourlyTitle: document.getElementById('hourlyTitle'),
    hourlySubtitle: document.getElementById('hourlySubtitle'),
    tabCardsView: document.getElementById('tabCardsView'),
    tabChartView: document.getElementById('tabChartView'),
    tabUvView: document.getElementById('tabUvView'),
    hourlyCardsView: document.getElementById('hourlyCardsView'),
    hourlyChartContainer: document.getElementById('hourlyChartContainer'),
    hourlyStrip: document.getElementById('hourlyStrip'),
    hourlyCanvas: document.getElementById('hourlyTrendCanvas'),
    chartLegend: document.getElementById('chartLegend'),
  };

  // =========================================================================
  // Weather Code Interpretation & SVG Icons
  // =========================================================================

  const WMO_CODES = {
    0: { desc: 'Clear Sky', icon: 'clear', theme: 'clear' },
    1: { desc: 'Mainly Clear', icon: 'mostly-clear', theme: 'clear' },
    2: { desc: 'Partly Cloudy', icon: 'partly-cloudy', theme: 'cloudy' },
    3: { desc: 'Overcast', icon: 'cloudy', theme: 'cloudy' },
    45: { desc: 'Foggy', icon: 'fog', theme: 'cloudy' },
    48: { desc: 'Depositing Rime Fog', icon: 'fog', theme: 'cloudy' },
    51: { desc: 'Light Drizzle', icon: 'drizzle', theme: 'rain' },
    53: { desc: 'Moderate Drizzle', icon: 'drizzle', theme: 'rain' },
    55: { desc: 'Heavy Drizzle', icon: 'drizzle', theme: 'rain' },
    56: { desc: 'Light Freezing Drizzle', icon: 'snow', theme: 'snow' },
    57: { desc: 'Dense Freezing Drizzle', icon: 'snow', theme: 'snow' },
    61: { desc: 'Slight Rain', icon: 'rain', theme: 'rain' },
    63: { desc: 'Moderate Rain', icon: 'rain', theme: 'rain' },
    65: { desc: 'Heavy Rain', icon: 'heavy-rain', theme: 'rain' },
    66: { desc: 'Freezing Rain', icon: 'snow', theme: 'snow' },
    67: { desc: 'Heavy Freezing Rain', icon: 'snow', theme: 'snow' },
    71: { desc: 'Slight Snowfall', icon: 'snow', theme: 'snow' },
    73: { desc: 'Moderate Snowfall', icon: 'snow', theme: 'snow' },
    75: { desc: 'Heavy Snowfall', icon: 'heavy-snow', theme: 'snow' },
    77: { desc: 'Snow Grains', icon: 'snow', theme: 'snow' },
    80: { desc: 'Slight Rain Showers', icon: 'rain', theme: 'rain' },
    81: { desc: 'Moderate Showers', icon: 'rain', theme: 'rain' },
    82: { desc: 'Violent Rain Showers', icon: 'heavy-rain', theme: 'rain' },
    85: { desc: 'Slight Snow Showers', icon: 'snow', theme: 'snow' },
    86: { desc: 'Heavy Snow Showers', icon: 'heavy-snow', theme: 'snow' },
    95: { desc: 'Thunderstorm', icon: 'thunder', theme: 'thunder' },
    96: { desc: 'Thunderstorm with Hail', icon: 'thunder', theme: 'thunder' },
    99: { desc: 'Severe Hailstorm', icon: 'thunder', theme: 'thunder' },
  };

  // Bureau of Meteorology (BOM) Descriptor Mapping
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

  function getBomWeatherMeta(descriptor, isDay = 1) {
    const key = (descriptor || '').toLowerCase().replace(/[\s-]/g, '_');
    const matched = BOM_ICON_MAP[key] || { desc: descriptor ? descriptor.replace(/_/g, ' ') : 'Fair', icon: 'clear', theme: 'clear' };
    let themeClass = isDay ? 'theme-day-clear' : 'theme-night-clear';
    if (matched.theme === 'cloudy') themeClass = isDay ? 'theme-day-cloudy' : 'theme-night-cloudy';
    else if (matched.theme === 'rain') themeClass = 'theme-rain';
    else if (matched.theme === 'snow') themeClass = 'theme-snow';
    else if (matched.theme === 'thunder') themeClass = 'theme-thunder';

    return {
      description: matched.desc,
      iconType: matched.icon,
      themeClass,
      category: matched.theme,
    };
  }

  // Base32 Geohash Encoder for BOM coordinates
  function encodeGeohash(latitude, longitude, precision = 6) {
    const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let isEven = true;
    let latMin = -90, latMax = 90;
    let lonMin = -180, lonMax = 180;
    let bit = 0;
    let ch = 0;
    let geohash = '';

    while (geohash.length < precision) {
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if (longitude >= mid) {
          ch |= (1 << (4 - bit));
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (latitude >= mid) {
          ch |= (1 << (4 - bit));
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
      if (bit < 4) {
        bit++;
      } else {
        geohash += B32[ch];
        bit = 0;
        ch = 0;
      }
    }
    return geohash;
  }

  // Cardinal Wind Direction to Degrees Map
  const CARDINAL_TO_DEG = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
    CALM: 0, VARIABLE: 0
  };

  function getDegreesFromCardinal(cardinal) {
    if (typeof cardinal === 'number') return cardinal;
    if (!cardinal) return 0;
    return CARDINAL_TO_DEG[cardinal.toString().toUpperCase()] || 0;
  }

  function getWeatherMeta(code, isDay = 1) {
    const info = WMO_CODES[code] || { desc: 'Clear', icon: 'clear', theme: 'clear' };
    let themeClass = isDay ? 'theme-day-clear' : 'theme-night-clear';
    if (info.theme === 'cloudy') themeClass = isDay ? 'theme-day-cloudy' : 'theme-night-cloudy';
    else if (info.theme === 'rain') themeClass = 'theme-rain';
    else if (info.theme === 'snow') themeClass = 'theme-snow';
    else if (info.theme === 'thunder') themeClass = 'theme-thunder';
    return {
      description: info.desc,
      iconType: info.icon,
      themeClass,
      category: info.theme,
    };
  }

  function createWeatherSvg(iconType, isDay = 1) {
    switch (iconType) {
      case 'clear':
        if (isDay) {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
              <g stroke="#f59e0b" stroke-width="3" stroke-linecap="round">
                <line x1="32" y1="8" x2="32" y2="2"/>
                <line x1="32" y1="62" x2="32" y2="56"/>
                <line x1="8" y1="32" x2="2" y2="32"/>
                <line x1="62" y1="32" x2="56" y2="32"/>
                <line x1="15" y1="15" x2="10" y2="10"/>
                <line x1="54" y1="54" x2="49" y2="49"/>
                <line x1="15" y1="49" x2="10" y2="54"/>
                <line x1="54" y1="10" x2="49" y2="15"/>
              </g>
            </svg>`;
        } else {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <path d="M42 16a18 18 0 1 1-22 26 20 20 0 0 0 22-26z" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
              <circle cx="48" cy="18" r="1.5" fill="#fef08a"/>
              <circle cx="52" cy="30" r="1" fill="#fef08a"/>
              <circle cx="20" cy="14" r="1" fill="#fef08a"/>
            </svg>`;
        }

      case 'mostly-clear':
      case 'partly-cloudy':
        if (isDay) {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="26" cy="24" r="11" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
              <path d="M22 46h24a10 10 0 0 0 1.5-19.9 13 13 0 0 0-24.8-1.7A10.5 10.5 0 0 0 22 46z" fill="#e2e8f0" fill-opacity="0.9" stroke="#94a3b8" stroke-width="2"/>
            </svg>`;
        } else {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <path d="M30 18a12 12 0 1 1-14 16 14 14 0 0 0 14-16z" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
              <path d="M22 48h24a10 10 0 0 0 1.5-19.9 13 13 0 0 0-24.8-1.7A10.5 10.5 0 0 0 22 48z" fill="#94a3b8" fill-opacity="0.85" stroke="#64748b" stroke-width="2"/>
            </svg>`;
        }

      case 'cloudy':
        if (isDay) {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="23" cy="22" r="10" fill="#fde047" stroke="#f59e0b" stroke-width="2"/>
              <path d="M18 48h28a11 11 0 0 0 2-21.8 14 14 0 0 0-26.8-2A11.5 11.5 0 0 0 18 48z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
              <path d="M14 42h22a9 9 0 0 0 1.5-17.8 11.5 11.5 0 0 0-21.8-1.6A9.5 9.5 0 0 0 14 42z" fill="#94a3b8" fill-opacity="0.6" stroke="#64748b" stroke-width="1.5"/>
            </svg>`;
        } else {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <path d="M28 15a10 10 0 1 1-11 13 11 11 0 0 0 11-13z" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5"/>
              <path d="M18 48h28a11 11 0 0 0 2-21.8 14 14 0 0 0-26.8-2A11.5 11.5 0 0 0 18 48z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
              <path d="M14 42h22a9 9 0 0 0 1.5-17.8 11.5 11.5 0 0 0-21.8-1.6A9.5 9.5 0 0 0 14 42z" fill="#94a3b8" fill-opacity="0.6" stroke="#64748b" stroke-width="1.5"/>
            </svg>`;
        }

      case 'fog':
        return `
          <svg viewBox="0 0 64 64" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round">
            <line x1="16" y1="22" x2="48" y2="22"/>
            <line x1="12" y1="30" x2="52" y2="30"/>
            <line x1="18" y1="38" x2="46" y2="38"/>
            <line x1="14" y1="46" x2="50" y2="46"/>
          </svg>`;

      case 'drizzle':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M18 36h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 36z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
            <g stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round">
              <line x1="24" y1="44" x2="22" y2="50"/>
              <line x1="34" y1="44" x2="32" y2="50"/>
              <line x1="44" y1="44" x2="42" y2="50"/>
            </g>
          </svg>`;

      case 'rain':
      case 'heavy-rain':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M18 34h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 34z" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
            <g stroke="#38bdf8" stroke-width="3" stroke-linecap="round">
              <line x1="22" y1="42" x2="18" y2="54"/>
              <line x1="32" y1="42" x2="28" y2="54"/>
              <line x1="42" y1="42" x2="38" y2="54"/>
            </g>
          </svg>`;

      case 'snow':
      case 'heavy-snow':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M18 34h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 34z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
            <g fill="#ffffff">
              <circle cx="22" cy="46" r="2.5"/>
              <circle cx="33" cy="48" r="2.5"/>
              <circle cx="43" cy="46" r="2.5"/>
              <circle cx="28" cy="56" r="2"/>
              <circle cx="38" cy="56" r="2"/>
            </g>
          </svg>`;

      case 'thunder':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M18 32h28a10 10 0 0 0 2-19.8 13 13 0 0 0-24.8-2A10.5 10.5 0 0 0 18 32z" fill="#475569" stroke="#334155" stroke-width="2"/>
            <polygon points="31 34 24 45 31 45 28 58 40 43 33 43" fill="#facc15" stroke="#eab308" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>`;

      default:
        return createWeatherSvg('clear', isDay);
    }
  }

  // =========================================================================
  // Temperature & Unit Conversion
  // =========================================================================

  function convertTemp(tempC) {
    if (tempC === null || tempC === undefined) return '--';
    if (state.unit === 'f') {
      return Math.round((tempC * 9) / 5 + 32);
    }
    return Math.round(tempC);
  }

  function convertSpeed(speedKmh) {
    if (speedKmh === null || speedKmh === undefined) return { val: '--', unit: 'km/h' };
    if (state.unit === 'f') {
      return { val: Math.round(speedKmh * 0.621371), unit: 'mph' };
    }
    return { val: Math.round(speedKmh), unit: 'km/h' };
  }

  function getWindDirectionCardinal(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((degrees % 360) / 22.5) % 16;
    return directions[index];
  }

  function formatTime(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  function formatDateShort(dateString) {
    if (!dateString) return '';
    const date = parseDate(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function getUvCategory(uv) {
    const val = typeof uv === 'number' ? uv : 0;
    if (val <= 2) return { label: 'Low', color: '#10b981', advice: 'No protection needed', dotClass: 'uv-low' };
    if (val <= 5) return { label: 'Moderate', color: '#facc15', advice: 'Sunscreen recommended', dotClass: 'uv-mod' };
    if (val <= 7) return { label: 'High', color: '#f97316', advice: 'Hat & SPF 30+ advised', dotClass: 'uv-high' };
    if (val <= 10) return { label: 'Very High', color: '#ef4444', advice: 'Seek shade midday', dotClass: 'uv-veryhigh' };
    return { label: 'Extreme', color: '#a855f7', advice: 'Avoid outdoor exposure', dotClass: 'uv-extreme' };
  }

  // =========================================================================
  // Ambient Weather Animations
  // =========================================================================

  function updateAtmosphere(meta, isDay) {
    // Update body class
    document.body.className = meta.themeClass;

    // Reset particles
    elements.weatherParticles.innerHTML = '';

    if (meta.category === 'rain') {
      // Generate rain streaks
      const count = 35;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle particle-rain';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = 0.5 + Math.random() * 0.5 + 's';
        p.style.animationDelay = Math.random() * 2 + 's';
        elements.weatherParticles.appendChild(p);
      }
    } else if (meta.category === 'snow') {
      // Generate snowflakes
      const count = 30;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle particle-snow';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.width = p.style.height = 3 + Math.random() * 5 + 'px';
        p.style.animationDuration = 3 + Math.random() * 4 + 's';
        p.style.animationDelay = Math.random() * 3 + 's';
        elements.weatherParticles.appendChild(p);
      }
    } else if (meta.category === 'cloudy') {
      // Generate floating atmospheric cloud mist puffs
      const count = 8;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle particle-cloud';
        p.style.left = (Math.random() * 95) + 'vw';
        p.style.top = (5 + Math.random() * 55) + 'vh';
        const sizeW = 180 + Math.random() * 220;
        const sizeH = 45 + Math.random() * 55;
        p.style.width = sizeW + 'px';
        p.style.height = sizeH + 'px';
        p.style.animationDuration = (24 + Math.random() * 18) + 's';
        p.style.animationDelay = (Math.random() * -20) + 's';
        elements.weatherParticles.appendChild(p);
      }
    } else if (!isDay && meta.category === 'clear') {
      // Generate stars
      const count = 40;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle particle-star';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh';
        p.style.animationDelay = Math.random() * 3 + 's';
        elements.weatherParticles.appendChild(p);
      }
    }
  }

  // =========================================================================
  // API Fetching: Forecast & Geocoding
  // =========================================================================

  // =========================================================================
  // API Fetching: Bureau of Meteorology (BOM) & Fallback
  // =========================================================================

  async function fetchForecast(lat, lon, locationInfo) {
    showStatus('Connecting to Bureau of Meteorology telemetry...', false);
    try {
      let gh = locationInfo?.geohash;

      // If coordinates in Australia and no geohash, generate 6-char geohash
      if (!gh && lat !== undefined && lon !== undefined) {
        if (lat >= -45 && lat <= -9 && lon >= 110 && lon <= 155) {
          gh = encodeGeohash(lat, lon, 6);
        }
      }

      // 1. Primary: If we have an Australian geohash, query official BOM endpoints
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

      // 2. Fallback to Open-Meteo for international cities outside Australia
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

    state.weatherData = {
      source: 'open-meteo',
      ...data,
    };
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
      // 1. Search BOM Australian suburbs, cities & postcodes
      const bomUrl = `https://api.weather.bom.gov.au/v1/locations?search=${encodeURIComponent(query.trim())}`;
      const bomRes = await fetch(bomUrl);
      if (bomRes.ok) {
        const bomJson = await bomRes.json();
        if (bomJson.data && bomJson.data.length > 0) {
          renderSearchResults(bomJson.data.slice(0, 8), 'bom');
          return;
        }
      }

      // 2. Fallback to Open-Meteo for international searches
      const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const omRes = await fetch(omUrl);
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
          return {
            name: loc.name,
            state: loc.state || 'AU',
            country: 'Australia',
            countryCode: loc.state || 'AU',
            geohash: loc.geohash,
            lat,
            lon,
            source: 'bom',
          };
        }
      }

      if (lat >= -45 && lat <= -9 && lon >= 110 && lon <= 155) {
        const gh = encodeGeohash(lat, lon, 6);
        return {
          name: 'My Location',
          state: 'AU',
          country: 'Australia',
          countryCode: 'AU',
          geohash: gh,
          lat,
          lon,
          source: 'bom',
        };
      }
    } catch (e) {
      console.warn('Reverse geocode fallback:', e);
    }

    return { name: 'Current Location', country: '', countryCode: 'GPS', lat, lon, source: 'open-meteo' };
  }

  // =========================================================================
  // Rendering Views
  // =========================================================================

  function selectDay(dayIndex) {
    state.selectedDayIndex = dayIndex;
    renderDashboard();
  }

  function renderDashboard() {
    if (!state.weatherData || !state.currentLocation) return;
    if (state.weatherData.source === 'bom') {
      renderBomDashboard();
    } else {
      renderOpenMeteoDashboard();
    }
  }

  function renderBomDashboard() {
    const { observations, daily, hourly, warnings } = state.weatherData;
    const loc = state.currentLocation;
    const isToday = state.selectedDayIndex === 0;
    const validDays = daily.filter(d => d.temp_max !== null || d.temp_min !== null || d.icon_descriptor !== null);
    const dIdx = Math.min(state.selectedDayIndex, validDays.length - 1);
    const dayItem = validDays[dIdx];

    // Source Badge
    if (elements.sourceBadge) elements.sourceBadge.textContent = 'BOM Australia';

    // Header City & State
    elements.cityName.textContent = loc.name || 'Australia';
    elements.countryBadge.textContent = loc.state || 'AU';

    // Active Bureau Warnings Banner
    if (elements.bomWarningBanner) {
      const activeWarn = warnings && warnings.length > 0 ? warnings[0] : null;
      if (activeWarn) {
        elements.bomWarningTitle.textContent = activeWarn.title || activeWarn.short_title || 'BOM Weather Warning';
        elements.bomWarningText.textContent = `${activeWarn.state || ''} ${activeWarn.type ? activeWarn.type.replace(/_/g, ' ').toUpperCase() : ''} — ${activeWarn.phase || 'Active'}`;
        elements.bomWarningBanner.classList.remove('hidden');
      } else {
        elements.bomWarningBanner.classList.add('hidden');
      }
    }

    // Observation Station Pill
    if (elements.bomStationPill && elements.bomStationName) {
      if (observations && observations.station) {
        const distStr = observations.station.distance ? ` (${(observations.station.distance / 1000).toFixed(1)} km)` : '';
        elements.bomStationName.textContent = `Observed at ${observations.station.name}${distStr}`;
        elements.bomStationPill.classList.remove('hidden');
      } else {
        elements.bomStationName.textContent = 'Bureau of Meteorology Ground Station';
        elements.bomStationPill.classList.remove('hidden');
      }
    }

    let weatherMeta;
    let heroTemp;
    let apparentTemp;
    let highTemp = dayItem.temp_max;
    let lowTemp = dayItem.temp_min;
    let precipText;
    let windSpeedVal;
    let windDirDeg;
    let humidityVal;
    let uvVal = dayItem.uv?.max_index || 0;
    let sunriseVal = dayItem.astronomical?.sunrise_time;
    let sunsetVal = dayItem.astronomical?.sunset_time;
    let rainChanceVal = dayItem.rain?.chance || 0;
    let pressureVal = 1013;

    // Synoptic text description
    if (elements.bomSynopticBox && elements.bomSynopticText) {
      const synText = dayItem.extended_text || dayItem.short_text || '';
      if (synText) {
        elements.bomSynopticText.textContent = `"${synText}"`;
        elements.bomSynopticBox.classList.remove('hidden');
      } else {
        elements.bomSynopticBox.classList.add('hidden');
      }
    }

    const active24Hours = [];

    if (isToday) {
      if (elements.resetLiveBtn) elements.resetLiveBtn.classList.add('hidden');

      const now = new Date();
      elements.localTime.textContent = `Local time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' })}`;

      const currentHour = now.getHours();
      const isNight = currentHour < 6 || currentHour >= 18;
      const desc = dayItem.icon_descriptor || (isNight ? 'clear' : 'sunny');
      weatherMeta = getBomWeatherMeta(desc, isNight ? 0 : 1);

      heroTemp = observations?.temp ?? dayItem.temp_max ?? 20;
      apparentTemp = observations?.temp_feels_like ?? heroTemp;
      highTemp = dayItem.temp_max ?? observations?.max_temp?.value ?? heroTemp;
      lowTemp = dayItem.temp_min ?? observations?.min_temp?.value ?? heroTemp;

      if (elements.precipPillLabel) elements.precipPillLabel.textContent = 'Rain (9 AM)';
      const rainSince9 = observations?.rain_since_9am !== null && observations?.rain_since_9am !== undefined ? observations.rain_since_9am : 0;
      precipText = `${rainSince9} mm`;

      windSpeedVal = observations?.wind?.speed_kilometre ?? 15;
      windDirDeg = getDegreesFromCardinal(observations?.wind?.direction ?? 'S');
      humidityVal = observations?.humidity ?? 65;

      if (elements.hourlyTitle) elements.hourlyTitle.textContent = 'BOM Hourly Forecast';
      if (elements.hourlySubtitle) elements.hourlySubtitle.textContent = 'Next 24 Hours';

      // Slicing next 24 hours from BOM hourly
      for (let i = 0; i < Math.min(24, hourly.length); i++) {
        const h = hourly[i];
        active24Hours.push({
          time: h.time,
          temp: h.temp,
          code: h.icon_descriptor || 'sunny',
          pop: h.rain?.chance || 0,
          uv: typeof h.uv === 'number' ? h.uv : 0,
          isDay: !h.is_night,
          humidity: h.relative_humidity || 50,
        });
      }
    } else {
      // Future day selected!
      if (elements.resetLiveBtn) elements.resetLiveBtn.classList.remove('hidden');

      const targetDateStr = dayItem.date;
      const weekday = getWeekdayName(targetDateStr);
      const shortDate = formatDateShort(targetDateStr);
      elements.localTime.textContent = `Forecast for ${weekday}, ${shortDate}`;

      weatherMeta = getBomWeatherMeta(dayItem.icon_descriptor || 'sunny', 1);
      heroTemp = dayItem.temp_max ?? dayItem.temp_min ?? 20;
      apparentTemp = heroTemp;
      highTemp = dayItem.temp_max ?? heroTemp;
      lowTemp = dayItem.temp_min ?? heroTemp;

      if (elements.precipPillLabel) elements.precipPillLabel.textContent = 'Precipitation';
      const rainMin = dayItem.rain?.amount?.min || 0;
      const rainMax = dayItem.rain?.amount?.max || 0;
      precipText = rainMax > 0 ? `${rainMin}-${rainMax} mm` : `${rainChanceVal}% chance`;

      windSpeedVal = 16;
      windDirDeg = 180;
      humidityVal = 55;

      if (elements.hourlyTitle) elements.hourlyTitle.textContent = `${weekday}'s Hourly Forecast`;
      if (elements.hourlySubtitle) elements.hourlySubtitle.textContent = `24-Hour Timeline (${shortDate})`;

      // Extract matching hours for selected day from BOM hourly
      const targetLocalDay = parseDate(targetDateStr).toLocaleDateString();
      const matched = hourly.filter(h => parseDate(h.time).toLocaleDateString() === targetLocalDay);

      if (matched.length >= 8) {
        matched.forEach(h => {
          active24Hours.push({
            time: h.time,
            temp: h.temp,
            code: h.icon_descriptor || 'sunny',
            pop: h.rain?.chance || 0,
            uv: typeof h.uv === 'number' ? h.uv : 0,
            isDay: !h.is_night,
            humidity: h.relative_humidity || 50,
          });
        });
      } else {
        // Synthesize smooth diurnal 24-hour curve for days beyond 72h window
        const baseMin = lowTemp ?? 12;
        const baseMax = highTemp ?? 22;
        const peakUv = uvVal || 5;
        const targetMidnight = parseDate(targetDateStr);
        targetMidnight.setHours(0, 0, 0, 0);

        for (let hour = 0; hour < 24; hour++) {
          const hourDate = new Date(targetMidnight.getTime() + hour * 3600000);
          const solarFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
          const tFactor = (Math.sin(((hour - 8) / 12) * Math.PI) + 1) / 2;
          const temp = Math.round(baseMin + (baseMax - baseMin) * tFactor);
          const uv = hour >= 7 && hour <= 17 ? +(peakUv * solarFactor).toFixed(1) : 0;
          const isDay = hour >= 6 && hour < 18;

          active24Hours.push({
            time: hourDate.toISOString(),
            temp,
            code: dayItem.icon_descriptor || 'sunny',
            pop: rainChanceVal,
            uv,
            isDay,
            humidity: Math.round(65 - 20 * solarFactor),
          });
        }
      }
    }

    state.activeDayHours = active24Hours;

    // Atmospheric dynamic background
    const nowH = new Date().getHours();
    updateAtmosphere(weatherMeta, isToday ? (nowH >= 6 && nowH < 18 ? 1 : 0) : 1);

    // Hero card content
    elements.conditionBadge.className = 'weather-badge';
    elements.conditionText.textContent = dayItem.short_text || weatherMeta.description;
    elements.currentTemp.textContent = convertTemp(heroTemp);
    elements.displayUnit.textContent = `°${state.unit.toUpperCase()}`;
    elements.heroWeatherIcon.innerHTML = createWeatherSvg(weatherMeta.iconType, isToday ? (nowH >= 6 && nowH < 18 ? 1 : 0) : 1);
    elements.apparentTemp.textContent = `${convertTemp(apparentTemp)}°${state.unit.toUpperCase()}`;
    elements.tempRange.textContent = `${convertTemp(highTemp)}° / ${convertTemp(lowTemp)}°`;
    elements.precipitationCurrent.textContent = precipText;

    // Highlights: Wind
    const wind = convertSpeed(windSpeedVal);
    elements.windSpeed.textContent = wind.val;
    elements.windUnit.textContent = wind.unit;
    elements.windDirText.textContent = `${getWindDirectionCardinal(windDirDeg)} (${windDirDeg}°)`;
    elements.compassNeedle.style.transform = `rotate(${windDirDeg}deg)`;

    // Highlights: Humidity
    elements.humidityVal.textContent = humidityVal;
    elements.humidityProgress.style.width = `${Math.min(humidityVal, 100)}%`;
    if (humidityVal < 30) elements.humidityState.textContent = 'Dry air';
    else if (humidityVal <= 60) elements.humidityState.textContent = 'Comfortable moisture';
    else elements.humidityState.textContent = 'High humidity / sticky';

    // Highlights: UV Index
    elements.uvVal.textContent = uvVal.toFixed(1);
    elements.uvIndicator.style.left = `${Math.min((uvVal / 12) * 100, 100)}%`;
    const uvCat = getUvCategory(uvVal);
    elements.uvBadge.textContent = uvCat.label;
    elements.uvAdvice.textContent = uvCat.advice;

    // Highlights: Sun times
    elements.sunriseTime.textContent = formatTime(sunriseVal);
    elements.sunsetTime.textContent = formatTime(sunsetVal);

    // Highlights: Rain chance
    elements.rainChanceVal.textContent = rainChanceVal;
    elements.rainProgress.style.width = `${rainChanceVal}%`;
    const rainMaxAmt = dayItem.rain?.amount?.max || 0;
    if (rainChanceVal === 0) elements.rainAdvice.textContent = 'Zero chance of precipitation';
    else if (rainChanceVal < 40) elements.rainAdvice.textContent = `Possible shower (up to ${rainMaxAmt} mm)`;
    else if (rainChanceVal < 70) elements.rainAdvice.textContent = `Rain likely (up to ${rainMaxAmt} mm)`;
    else elements.rainAdvice.textContent = `High chance of rain (${rainMaxAmt} mm)`;

    // Highlights: Pressure
    elements.pressureVal.textContent = pressureVal;
    elements.pressureState.textContent = 'Standard Australian ground station pressure';

    // Render Daily Forecast List
    renderBomDailyForecast(validDays);

    // Render Hourly Forecast Cards & Canvas Chart
    renderHourlyForecast(active24Hours, isToday);

    // Draw Mini UV Solar Curve
    drawMiniUvChart(active24Hours);

    // Update Favorites Active Pill
    renderFavorites();
  }

  function renderBomDailyForecast(validDays) {
    elements.dailyForecastList.innerHTML = '';
    if (elements.dailyForecastTitle) {
      elements.dailyForecastTitle.textContent = `BOM ${validDays.length}-Day Forecast`;
    }

    const minTemps = validDays.map(d => d.temp_min ?? d.temp_max ?? 10);
    const maxTemps = validDays.map(d => d.temp_max ?? d.temp_min ?? 20);
    const absoluteMin = Math.min(...minTemps);
    const absoluteMax = Math.max(...maxTemps);
    const rangeSpan = Math.max(absoluteMax - absoluteMin, 1);

    validDays.forEach((d, i) => {
      const dateStr = d.date;
      const dayLabel = i === 0 ? 'Today' : getWeekdayName(dateStr);
      const shortDate = formatDateShort(dateStr);
      const meta = getBomWeatherMeta(d.icon_descriptor || 'sunny', 1);
      const minTemp = d.temp_min ?? d.temp_max;
      const maxTemp = d.temp_max ?? d.temp_min;
      const rainProb = d.rain?.chance || 0;
      const isSelected = i === state.selectedDayIndex;

      const leftPercent = ((minTemp - absoluteMin) / rangeSpan) * 100;
      const widthPercent = Math.max(((maxTemp - minTemp) / rangeSpan) * 100, 8);

      const item = document.createElement('div');
      item.className = `daily-item ${isSelected ? 'active-day' : ''}`;
      item.setAttribute('data-day-index', i);
      item.setAttribute('title', `Click to view ${dayLabel} (${shortDate}) BOM forecast details`);
      item.innerHTML = `
        <div class="daily-day-col">
          <span class="daily-day">${dayLabel}</span>
          <span class="daily-date-sub">${shortDate}</span>
        </div>
        <div class="daily-condition">
          <div class="daily-icon">${createWeatherSvg(meta.iconType, 1)}</div>
          ${rainProb > 0 ? `<span class="daily-rain-chance">${rainProb}%</span>` : ''}
        </div>
        <div class="daily-temp-bar-wrap">
          <span class="daily-temp-min">${convertTemp(minTemp)}°</span>
          <div class="daily-bar">
            <div class="daily-bar-inner" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
          </div>
          <span class="daily-temp-max">${convertTemp(maxTemp)}°</span>
        </div>
      `;

      item.addEventListener('click', () => {
        selectDay(i);
      });

      elements.dailyForecastList.appendChild(item);
    });
  }

  function renderOpenMeteoDashboard() {
    const { current, hourly, daily, timezone } = state.weatherData;
    const loc = state.currentLocation;
    const isToday = state.selectedDayIndex === 0;
    const dIdx = Math.min(state.selectedDayIndex, daily.time.length - 1);

    if (elements.sourceBadge) elements.sourceBadge.textContent = 'Global Satellite';
    if (elements.bomWarningBanner) elements.bomWarningBanner.classList.add('hidden');
    if (elements.bomStationPill) elements.bomStationPill.classList.add('hidden');
    if (elements.bomSynopticBox) elements.bomSynopticBox.classList.add('hidden');
    if (elements.precipPillLabel) elements.precipPillLabel.textContent = 'Precipitation';

    elements.cityName.textContent = loc.name;
    elements.countryBadge.textContent = loc.countryCode || loc.country || '--';

    let weatherMeta;
    let heroTemp;
    let apparentTemp;
    let highTemp = daily.temperature_2m_max[dIdx];
    let lowTemp = daily.temperature_2m_min[dIdx];
    let precipText;
    let windSpeedVal;
    let windDirDeg;
    let humidityVal;
    let uvVal = daily.uv_index_max[dIdx] || 0;
    let sunriseVal = daily.sunrise[dIdx];
    let sunsetVal = daily.sunset[dIdx];
    let rainChanceVal = daily.precipitation_probability_max[dIdx] || 0;
    let pressureVal;

    const active24Hours = [];

    if (isToday) {
      if (elements.resetLiveBtn) elements.resetLiveBtn.classList.add('hidden');

      try {
        const now = new Date();
        const localString = now.toLocaleTimeString([], {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        elements.localTime.textContent = `Local time: ${localString}`;
      } catch (e) {
        elements.localTime.textContent = `Timezone: ${timezone}`;
      }

      const isDay = current.is_day !== undefined ? current.is_day : 1;
      weatherMeta = getWeatherMeta(current.weather_code, isDay);
      heroTemp = current.temperature_2m;
      apparentTemp = current.apparent_temperature;
      precipText = `${current.precipitation || 0} mm`;
      windSpeedVal = current.wind_speed_10m;
      windDirDeg = current.wind_direction_10m;
      humidityVal = current.relative_humidity_2m;
      pressureVal = Math.round(current.surface_pressure || 1013);

      if (elements.hourlyTitle) elements.hourlyTitle.textContent = 'Hourly Forecast';
      if (elements.hourlySubtitle) elements.hourlySubtitle.textContent = 'Next 24 Hours';

      const nowIso = new Date().toISOString().slice(0, 13);
      let startIndex = hourly.time.findIndex(t => t.startsWith(nowIso));
      if (startIndex === -1) startIndex = 0;

      for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
        active24Hours.push({
          time: hourly.time[i],
          temp: hourly.temperature_2m[i],
          code: hourly.weather_code[i],
          pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
          uv: hourly.uv_index ? hourly.uv_index[i] : 0,
          isDay: hourly.is_day ? hourly.is_day[i] : 1,
        });
      }
    } else {
      if (elements.resetLiveBtn) elements.resetLiveBtn.classList.remove('hidden');

      const targetDate = daily.time[dIdx];
      const weekday = getWeekdayName(targetDate);
      const shortDate = formatDateShort(targetDate);
      elements.localTime.textContent = `Forecast for ${weekday}, ${shortDate}`;

      weatherMeta = getWeatherMeta(daily.weather_code[dIdx], 1);
      heroTemp = daily.temperature_2m_max[dIdx];
      apparentTemp = daily.temperature_2m_max[dIdx];
      precipText = `Max ${rainChanceVal}% chance`;
      windSpeedVal = daily.wind_speed_10m_max ? daily.wind_speed_10m_max[dIdx] : 14;
      windDirDeg = daily.wind_direction_10m_dominant ? daily.wind_direction_10m_dominant[dIdx] : 180;

      if (elements.hourlyTitle) elements.hourlyTitle.textContent = `${weekday}'s Hourly Forecast`;
      if (elements.hourlySubtitle) elements.hourlySubtitle.textContent = `24-Hour Timeline (${shortDate})`;

      for (let i = 0; i < hourly.time.length; i++) {
        if (hourly.time[i].startsWith(targetDate)) {
          active24Hours.push({
            time: hourly.time[i],
            temp: hourly.temperature_2m[i],
            code: hourly.weather_code[i],
            pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
            uv: hourly.uv_index ? hourly.uv_index[i] : 0,
            isDay: hourly.is_day ? hourly.is_day[i] : 1,
            humidity: hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : 50,
            pressure: hourly.surface_pressure ? hourly.surface_pressure[i] : 1013,
          });
        }
      }

      if (active24Hours.length === 0) {
        const start = Math.min(dIdx * 24, hourly.time.length - 24);
        for (let i = start; i < start + 24; i++) {
          active24Hours.push({
            time: hourly.time[i],
            temp: hourly.temperature_2m[i],
            code: hourly.weather_code[i],
            pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
            uv: hourly.uv_index ? hourly.uv_index[i] : 0,
            isDay: hourly.is_day ? hourly.is_day[i] : 1,
          });
        }
      }

      const midHour = active24Hours[12] || active24Hours[0];
      humidityVal = midHour.humidity || 50;
      pressureVal = Math.round(midHour.pressure || 1013);
    }

    state.activeDayHours = active24Hours;
    updateAtmosphere(weatherMeta, isToday ? (current.is_day !== undefined ? current.is_day : 1) : 1);

    elements.conditionBadge.className = 'weather-badge';
    elements.conditionText.textContent = weatherMeta.description;
    elements.currentTemp.textContent = convertTemp(heroTemp);
    elements.displayUnit.textContent = `°${state.unit.toUpperCase()}`;
    elements.heroWeatherIcon.innerHTML = createWeatherSvg(weatherMeta.iconType, isToday ? (current.is_day !== undefined ? current.is_day : 1) : 1);
    elements.apparentTemp.textContent = `${convertTemp(apparentTemp)}°${state.unit.toUpperCase()}`;
    elements.tempRange.textContent = `${convertTemp(highTemp)}° / ${convertTemp(lowTemp)}°`;
    elements.precipitationCurrent.textContent = precipText;

    const wind = convertSpeed(windSpeedVal);
    elements.windSpeed.textContent = wind.val;
    elements.windUnit.textContent = wind.unit;
    elements.windDirText.textContent = `${getWindDirectionCardinal(windDirDeg)} (${windDirDeg}°)`;
    elements.compassNeedle.style.transform = `rotate(${windDirDeg}deg)`;

    elements.humidityVal.textContent = humidityVal;
    elements.humidityProgress.style.width = `${Math.min(humidityVal, 100)}%`;
    if (humidityVal < 30) elements.humidityState.textContent = 'Dry air';
    else if (humidityVal <= 60) elements.humidityState.textContent = 'Comfortable moisture';
    else elements.humidityState.textContent = 'High humidity / sticky';

    elements.uvVal.textContent = uvVal.toFixed(1);
    elements.uvIndicator.style.left = `${Math.min((uvVal / 12) * 100, 100)}%`;
    const uvCat = getUvCategory(uvVal);
    elements.uvBadge.textContent = uvCat.label;
    elements.uvAdvice.textContent = uvCat.advice;

    elements.sunriseTime.textContent = formatTime(sunriseVal);
    elements.sunsetTime.textContent = formatTime(sunsetVal);

    elements.rainChanceVal.textContent = rainChanceVal;
    elements.rainProgress.style.width = `${rainChanceVal}%`;
    if (rainChanceVal === 0) elements.rainAdvice.textContent = 'Zero chance of precipitation';
    else if (rainChanceVal < 40) elements.rainAdvice.textContent = 'Unlikely, but possible drizzle';
    else if (rainChanceVal < 70) elements.rainAdvice.textContent = 'Bring an umbrella';
    else elements.rainAdvice.textContent = 'High probability of rain / storm';

    elements.pressureVal.textContent = pressureVal;
    if (pressureVal < 1005) elements.pressureState.textContent = 'Low pressure system (storms)';
    else if (pressureVal > 1020) elements.pressureState.textContent = 'High pressure (fair weather)';
    else elements.pressureState.textContent = 'Normal atmospheric pressure';

    renderDailyForecast(daily);
    renderHourlyForecast(active24Hours, isToday);
    drawMiniUvChart(active24Hours);
    renderFavorites();
  }

  function renderDailyForecast(daily) {
    elements.dailyForecastList.innerHTML = '';
    const daysCount = Math.min(daily.time.length, 10);
    if (elements.dailyForecastTitle) {
      elements.dailyForecastTitle.textContent = `${daysCount}-Day Forecast`;
    }

    let absoluteMin = Math.min(...daily.temperature_2m_min.slice(0, daysCount));
    let absoluteMax = Math.max(...daily.temperature_2m_max.slice(0, daysCount));
    const rangeSpan = Math.max(absoluteMax - absoluteMin, 1);

    for (let i = 0; i < daysCount; i++) {
      const dateStr = daily.time[i];
      const dayLabel = i === 0 ? 'Today' : getWeekdayName(dateStr);
      const shortDate = formatDateShort(dateStr);
      const code = daily.weather_code[i];
      const meta = getWeatherMeta(code, 1);
      const minTemp = daily.temperature_2m_min[i];
      const maxTemp = daily.temperature_2m_max[i];
      const rainProb = daily.precipitation_probability_max[i];
      const isSelected = i === state.selectedDayIndex;

      const leftPercent = ((minTemp - absoluteMin) / rangeSpan) * 100;
      const widthPercent = Math.max(((maxTemp - minTemp) / rangeSpan) * 100, 8);

      const item = document.createElement('div');
      item.className = `daily-item ${isSelected ? 'active-day' : ''}`;
      item.setAttribute('data-day-index', i);
      item.setAttribute('title', `Click to display ${dayLabel} (${shortDate}) weather data`);
      item.innerHTML = `
        <div class="daily-day-col">
          <span class="daily-day">${dayLabel}</span>
          <span class="daily-date-sub">${shortDate}</span>
        </div>
        <div class="daily-condition">
          <div class="daily-icon">${createWeatherSvg(meta.iconType, 1)}</div>
          ${rainProb > 15 ? `<span class="daily-rain-chance">${rainProb}%</span>` : ''}
        </div>
        <div class="daily-temp-bar-wrap">
          <span class="daily-temp-min">${convertTemp(minTemp)}°</span>
          <div class="daily-bar">
            <div class="daily-bar-inner" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
          </div>
          <span class="daily-temp-max">${convertTemp(maxTemp)}°</span>
        </div>
      `;

      item.addEventListener('click', () => {
        selectDay(i);
      });

      elements.dailyForecastList.appendChild(item);
    }
  }

  function renderHourlyForecast(hourlyData, isToday) {
    elements.hourlyStrip.innerHTML = '';
    const hours = hourlyData || state.activeDayHours;
    if (!hours || hours.length === 0) return;

    // Populate Cards
    hours.forEach((h, idx) => {
      const meta = typeof h.code === 'string' ? getBomWeatherMeta(h.code, h.isDay) : getWeatherMeta(h.code, h.isDay);
      const isNow = isToday && idx === 0;
      const timeLabel = isNow ? 'Now' : formatTime(h.time);

      const el = document.createElement('div');
      el.className = `hourly-item ${isNow ? 'now' : ''}`;
      el.innerHTML = `
        <span class="hourly-time">${timeLabel}</span>
        <div class="hourly-icon">${createWeatherSvg(meta.iconType, h.isDay)}</div>
        <span class="hourly-temp">${convertTemp(h.temp)}°</span>
        <span class="hourly-pop">${h.pop > 0 ? `💧${h.pop}%` : ''}</span>
        ${h.uv > 0 ? `<span class="hourly-uv-tag" style="font-size:0.68rem; color:#facc15; font-weight:700;">☀️ ${h.uv.toFixed(0)}</span>` : ''}
      `;
      elements.hourlyStrip.appendChild(el);
    });

    // Render Canvas Interactive Chart based on active tab
    if (state.activeTab === 'chart') {
      drawHourlyChart(hours);
    } else if (state.activeTab === 'uv') {
      drawHourlyUvChart(hours);
    }
  }

  function drawHourlyChart(hourlyData) {
    const data = hourlyData || state.activeDayHours;
    const canvas = elements.hourlyCanvas;
    if (!canvas || !data || data.length < 2) return;

    const containerWidth = elements.hourlyChartContainer ? elements.hourlyChartContainer.clientWidth : 0;
    const rectWidth = canvas.getBoundingClientRect().width;
    const width = Math.floor(containerWidth > 40 ? containerWidth : (rectWidth > 40 ? rectWidth : 600));
    const height = 180;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const paddingX = 35;
    const paddingTop = 25;
    const paddingBottom = 35;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;

    // Data points
    const temps = data.map(d => convertTemp(d.temp));
    const minTemp = Math.min(...temps) - 1;
    const maxTemp = Math.max(...temps) + 1;
    const tempRange = Math.max(maxTemp - minTemp, 2);

    const stepX = chartWidth / (data.length - 1);

    // 1. Draw Precipitation Bars (Background)
    data.forEach((d, i) => {
      const x = paddingX + i * stepX;
      const pop = d.pop || 0;
      if (pop > 0) {
        const barHeight = (pop / 100) * (chartHeight * 0.55);
        const barY = height - paddingBottom - barHeight;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fillRect(x - 6, barY, 12, barHeight);
      }
    });

    // 2. Draw Temperature Curve
    const points = data.map((d, i) => {
      const t = convertTemp(d.temp);
      const x = paddingX + i * stepX;
      const y = height - paddingBottom - ((t - minTemp) / tempRange) * chartHeight;
      return { x, y, temp: t, time: d.time };
    });

    // Gradient fill under temperature line
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.lineTo(points[0].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw main temperature line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Draw Points, Temperature Labels & Time Markers (every 3 hours)
    ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';

    points.forEach((pt, i) => {
      if (i % 3 === 0 || i === points.length - 1) {
        // Dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Temp text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${pt.temp}°`, pt.x, pt.y - 10);

        // Time text
        const timeLabel = formatTime(pt.time);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText(timeLabel, pt.x, height - 10);
      }
    });

    // Update legend
    if (elements.chartLegend) {
      elements.chartLegend.innerHTML = `
        <span class="legend-item"><span class="legend-dot temp-dot"></span> Temperature</span>
        <span class="legend-item"><span class="legend-dot rain-dot"></span> Rain Chance %</span>
      `;
    }
  }

  function drawHourlyUvChart(hourlyData) {
    const data = hourlyData || state.activeDayHours;
    const canvas = elements.hourlyCanvas;
    if (!canvas || !data || data.length < 2) return;

    const containerWidth = elements.hourlyChartContainer ? elements.hourlyChartContainer.clientWidth : 0;
    const rectWidth = canvas.getBoundingClientRect().width;
    const width = Math.floor(containerWidth > 40 ? containerWidth : (rectWidth > 40 ? rectWidth : 600));
    const height = 180;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const paddingX = 40;
    const paddingTop = 32;
    const paddingBottom = 35;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;

    // UV values
    const uvValues = data.map(d => (typeof d.uv === 'number' ? d.uv : 0));
    const maxUv = Math.max(...uvValues, 0);
    const yMax = Math.max(12, Math.ceil(maxUv + 1));

    // 1. Draw horizontal hazard risk bands
    const bands = [
      { max: 2, color: 'rgba(16, 185, 129, 0.08)' }, // Low (0-2)
      { max: 5, color: 'rgba(250, 204, 21, 0.08)' }, // Moderate (3-5)
      { max: 7, color: 'rgba(249, 115, 22, 0.08)' }, // High (6-7)
      { max: 10, color: 'rgba(239, 68, 68, 0.08)' }, // Very High (8-10)
      { max: 13, color: 'rgba(168, 85, 247, 0.08)' }, // Extreme (11+)
    ];

    let prevY = height - paddingBottom;
    bands.forEach(b => {
      const bandTopY = height - paddingBottom - (Math.min(b.max, yMax) / yMax) * chartHeight;
      ctx.fillStyle = b.color;
      ctx.fillRect(paddingX, bandTopY, chartWidth, prevY - bandTopY);
      prevY = bandTopY;
    });

    const stepX = chartWidth / (data.length - 1);

    const points = data.map((d, i) => {
      const uv = typeof d.uv === 'number' ? d.uv : 0;
      const x = paddingX + i * stepX;
      const y = height - paddingBottom - (uv / yMax) * chartHeight;
      return { x, y, uv, time: d.time };
    });

    // 2. Gradient Fill under UV curve
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
    gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.lineTo(points[0].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. Draw UV line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 4. Find Peak UV Point
    let peakIndex = 0;
    let peakVal = 0;
    points.forEach((pt, i) => {
      if (pt.uv > peakVal) {
        peakVal = pt.uv;
        peakIndex = i;
      }
    });

    // 5. Draw Labels & Markers (every 3 hours)
    ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';

    points.forEach((pt, i) => {
      if (i % 3 === 0 || i === points.length - 1) {
        // Dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = pt.uv > 0 ? '#fbbf24' : 'rgba(255,255,255,0.4)';
        ctx.fill();

        // Time label
        const timeLabel = formatTime(pt.time);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText(timeLabel, pt.x, height - 10);
      }
    });

    // Highlight Peak UV
    if (peakVal > 0) {
      const peakPt = points[peakIndex];
      const cat = getUvCategory(peakVal);

      // Glowing outer ring
      ctx.beginPath();
      ctx.arc(peakPt.x, peakPt.y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = cat.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Callout text
      const timeStr = formatTime(peakPt.time);
      const calloutText = `Peak: ${peakVal.toFixed(1)} (${cat.label}) at ${timeStr}`;
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px Plus Jakarta Sans, sans-serif';
      ctx.fillText(calloutText, Math.min(Math.max(peakPt.x, 90), width - 90), peakPt.y - 12);
    }

    // Legend
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
    const canvas = elements.uvMiniCanvas;
    if (!canvas) return;

    const data = hourlyData || state.activeDayHours;
    if (!data || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.floor(rect.width || 180);
    const height = 42;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Filter daylight hours: 05:00 to 20:00
    const daylight = data.filter(d => {
      const hour = new Date(d.time).getHours();
      return hour >= 5 && hour <= 20;
    });

    const ptsData = daylight.length >= 4 ? daylight : data;
    const uvValues = ptsData.map(d => (typeof d.uv === 'number' ? d.uv : 0));
    const maxUv = Math.max(...uvValues, 0);
    const yMax = Math.max(12, Math.ceil(maxUv + 1));

    const paddingX = 8;
    const paddingY = 6;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;
    const stepX = chartW / (ptsData.length - 1);

    const points = ptsData.map((d, i) => {
      const uv = typeof d.uv === 'number' ? d.uv : 0;
      const x = paddingX + i * stepX;
      const y = height - paddingY - (uv / yMax) * chartH;
      return { x, y, uv, time: d.time };
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0, paddingY, 0, height - paddingY);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height - paddingY);
    ctx.lineTo(points[0].x, height - paddingY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mark current or peak hour
    let targetIndex = 0;
    if (state.selectedDayIndex === 0) {
      const currentHour = new Date().getHours();
      const idx = ptsData.findIndex(d => new Date(d.time).getHours() === currentHour);
      targetIndex = idx !== -1 ? idx : Math.floor(ptsData.length / 2);
    } else {
      let peakU = -1;
      points.forEach((p, i) => {
        if (p.uv > peakU) {
          peakU = p.uv;
          targetIndex = i;
        }
      });
    }

    if (points[targetIndex]) {
      const pt = points[targetIndex];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // =========================================================================
  // Search Autocomplete
  // =========================================================================

  function renderSearchResults(results, source = 'bom') {
    elements.searchResultsDropdown.innerHTML = '';
    if (!results || results.length === 0) {
      elements.searchResultsDropdown.innerHTML = `<div class="dropdown-empty">No locations matching "${elements.citySearchInput.value}"</div>`;
      elements.searchResultsDropdown.classList.remove('hidden');
      return;
    }

    results.forEach(item => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';

      if (source === 'bom') {
        const regionText = [item.postcode, item.state, 'Australia'].filter(Boolean).join(', ');
        div.innerHTML = `
          <div>
            <div class="dropdown-city">${item.name}</div>
            <div class="dropdown-region">${regionText}</div>
          </div>
          <span class="dropdown-country">${item.state || 'BOM'}</span>
        `;

        div.addEventListener('click', () => {
          elements.searchResultsDropdown.classList.add('hidden');
          elements.citySearchInput.value = '';
          elements.searchWrapper.classList.remove('has-text');
          fetchForecast(item.latitude, item.longitude, {
            name: item.name,
            state: item.state || '',
            postcode: item.postcode || '',
            country: 'Australia',
            countryCode: item.state || 'AU',
            geohash: item.geohash,
            source: 'bom',
          });
        });
      } else {
        const regionText = [item.admin1, item.country].filter(Boolean).join(', ');
        div.innerHTML = `
          <div>
            <div class="dropdown-city">${item.name}</div>
            <div class="dropdown-region">${regionText}</div>
          </div>
          <span class="dropdown-country">${item.country_code || 'Global'}</span>
        `;

        div.addEventListener('click', () => {
          elements.searchResultsDropdown.classList.add('hidden');
          elements.citySearchInput.value = '';
          elements.searchWrapper.classList.remove('has-text');
          fetchForecast(item.latitude, item.longitude, {
            name: item.name,
            country: item.country || '',
            countryCode: item.country_code || '',
            lat: item.latitude,
            lon: item.longitude,
            source: 'open-meteo',
          });
        });
      }

      elements.searchResultsDropdown.appendChild(div);
    });

    elements.searchResultsDropdown.classList.remove('hidden');
  }

  // =========================================================================
  // Favorites Management
  // =========================================================================

  function loadFavorites() {
    const saved = localStorage.getItem('skypulse_favorites_bom_v2');
    if (saved) {
      try {
        state.favorites = JSON.parse(saved);
      } catch (e) {
        state.favorites = [...DEFAULT_FAVORITES];
      }
    } else {
      state.favorites = [...DEFAULT_FAVORITES];
    }
    renderFavorites();
  }

  function saveFavorites() {
    localStorage.setItem('skypulse_favorites_bom_v2', JSON.stringify(state.favorites));
    renderFavorites();
  }

  function renderFavorites() {
    elements.favoritesList.innerHTML = '';
    state.favorites.forEach((fav, index) => {
      const pill = document.createElement('div');
      const isActive = state.currentLocation && state.currentLocation.name.toLowerCase() === fav.name.toLowerCase();
      pill.className = `fav-pill ${isActive ? 'active' : ''}`;
      pill.innerHTML = `
        <span>${fav.name}</span>
        <span class="fav-remove" title="Remove" data-idx="${index}">&times;</span>
      `;

      pill.addEventListener('click', (e) => {
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

  // =========================================================================
  // Status Banner Helpers
  // =========================================================================

  function showStatus(msg, isError = false) {
    elements.statusMessage.textContent = msg;
    elements.statusBanner.className = `status-banner ${isError ? 'error' : ''}`;
    elements.statusBanner.classList.remove('hidden');
  }

  function hideStatus() {
    elements.statusBanner.classList.add('hidden');
  }

  // =========================================================================
  // User Event Listeners
  // =========================================================================

  function setupEventListeners() {
    // Unit buttons
    elements.celsiusBtn.addEventListener('click', () => {
      if (state.unit === 'c') return;
      state.unit = 'c';
      localStorage.setItem('skypulse_unit', 'c');
      elements.celsiusBtn.classList.add('active');
      elements.fahrenheitBtn.classList.remove('active');
      renderDashboard();
    });

    elements.fahrenheitBtn.addEventListener('click', () => {
      if (state.unit === 'f') return;
      state.unit = 'f';
      localStorage.setItem('skypulse_unit', 'f');
      elements.fahrenheitBtn.classList.add('active');
      elements.celsiusBtn.classList.remove('active');
      renderDashboard();
    });

    // Search input
    elements.citySearchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.length > 0) {
        elements.searchWrapper.classList.add('has-text');
      } else {
        elements.searchWrapper.classList.remove('has-text');
      }

      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        searchCities(query);
      }, 250);
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.citySearchInput.value = '';
      elements.searchWrapper.classList.remove('has-text');
      elements.searchResultsDropdown.classList.add('hidden');
      elements.citySearchInput.focus();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!elements.searchWrapper.contains(e.target)) {
        elements.searchResultsDropdown.classList.add('hidden');
      }
    });

    // Pin current city
    elements.pinCurrentBtn.addEventListener('click', pinCurrentLocation);

    // Geolocation detection
    elements.geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showStatus('Geolocation is not supported by your browser.', true);
        return;
      }
      showStatus('Acquiring your GPS coordinates...', false);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const locInfo = await reverseGeocode(lat, lon);
          fetchForecast(lat, lon, locInfo);
        },
        (error) => {
          console.warn('Geolocation denied or failed:', error);
          showStatus('Location access was denied or unavailable.', true);
          setTimeout(hideStatus, 3000);
        },
        { timeout: 10000 }
      );
    });

    // Hourly tabs (Cards vs Chart vs UV Solar View)
    elements.tabCardsView.addEventListener('click', () => {
      elements.tabCardsView.classList.add('active');
      elements.tabChartView.classList.remove('active');
      if (elements.tabUvView) elements.tabUvView.classList.remove('active');
      elements.hourlyCardsView.classList.remove('hidden');
      elements.hourlyChartContainer.classList.add('hidden');
      state.activeTab = 'cards';
    });

    elements.tabChartView.addEventListener('click', () => {
      elements.tabChartView.classList.add('active');
      elements.tabCardsView.classList.remove('active');
      if (elements.tabUvView) elements.tabUvView.classList.remove('active');
      elements.hourlyCardsView.classList.add('hidden');
      elements.hourlyChartContainer.classList.remove('hidden');
      state.activeTab = 'chart';
      requestAnimationFrame(() => {
        drawHourlyChart();
      });
    });

    if (elements.tabUvView) {
      elements.tabUvView.addEventListener('click', () => {
        elements.tabUvView.classList.add('active');
        elements.tabCardsView.classList.remove('active');
        elements.tabChartView.classList.remove('active');
        elements.hourlyCardsView.classList.add('hidden');
        elements.hourlyChartContainer.classList.remove('hidden');
        state.activeTab = 'uv';
        requestAnimationFrame(() => {
          drawHourlyUvChart();
        });
      });
    }

    // Reset Live View button in Hero card
    if (elements.resetLiveBtn) {
      elements.resetLiveBtn.addEventListener('click', () => {
        selectDay(0);
      });
    }

    // Dynamic browser window resize handler with debounce & ResizeObserver
    let resizeTimer = null;
    function handleResize() {
      if (state.activeTab === 'chart') {
        drawHourlyChart();
      } else if (state.activeTab === 'uv') {
        drawHourlyUvChart();
      }
      drawMiniUvChart();
    }

    if (window.ResizeObserver && elements.hourlyChartContainer) {
      const ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(elements.hourlyChartContainer);
    }

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 80);
    });
  }

  // =========================================================================
  // Initial Bootstrapping
  // =========================================================================

  function init() {
    // Set initial unit toggle UI
    if (state.unit === 'f') {
      elements.fahrenheitBtn.classList.add('active');
      elements.celsiusBtn.classList.remove('active');
    } else {
      elements.celsiusBtn.classList.add('active');
      elements.fahrenheitBtn.classList.remove('active');
    }

    loadFavorites();
    setupEventListeners();

    // Default start city: Sydney or first favorite
    const initialCity = state.favorites[0] || DEFAULT_FAVORITES[0];
    fetchForecast(initialCity.lat, initialCity.lon, initialCity);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
