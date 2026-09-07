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
    { name: 'Sydney', country: 'Australia', countryCode: 'AU', lat: -33.8688, lon: 151.2093 },
    { name: 'New York', country: 'United States', countryCode: 'US', lat: 40.7128, lon: -74.0060 },
    { name: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.5074, lon: -0.1278 },
    { name: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.6895, lon: 139.6917 },
    { name: 'Paris', country: 'France', countryCode: 'FR', lat: 48.8566, lon: 2.3522 },
  ];

  // DOM Elements
  const elements = {
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
    cityName: document.getElementById('cityName'),
    countryBadge: document.getElementById('countryBadge'),
    localTime: document.getElementById('localTime'),
    resetLiveBtn: document.getElementById('resetLiveBtn'),
    conditionBadge: document.getElementById('conditionBadge'),
    conditionText: document.getElementById('conditionText'),
    currentTemp: document.getElementById('currentTemp'),
    displayUnit: document.getElementById('displayUnit'),
    heroWeatherIcon: document.getElementById('heroWeatherIcon'),
    apparentTemp: document.getElementById('apparentTemp'),
    tempRange: document.getElementById('tempRange'),
    precipitationCurrent: document.getElementById('precipitationCurrent'),
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

  function getWeatherMeta(code, isDay = 1) {
    const info = WMO_CODES[code] || { desc: 'Clear', icon: 'clear', theme: 'clear' };
    let themeClass = 'theme-day-clear';
    if (!isDay) {
      if (info.theme === 'clear') themeClass = 'theme-night-clear';
      else if (info.theme === 'rain') themeClass = 'theme-rain';
      else if (info.theme === 'snow') themeClass = 'theme-snow';
      else if (info.theme === 'thunder') themeClass = 'theme-thunder';
      else themeClass = 'theme-cloudy';
    } else {
      if (info.theme === 'clear') themeClass = 'theme-day-clear';
      else if (info.theme === 'cloudy') themeClass = 'theme-cloudy';
      else if (info.theme === 'rain') themeClass = 'theme-rain';
      else if (info.theme === 'snow') themeClass = 'theme-snow';
      else if (info.theme === 'thunder') themeClass = 'theme-thunder';
    }
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
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M18 48h28a11 11 0 0 0 2-21.8 14 14 0 0 0-26.8-2A11.5 11.5 0 0 0 18 48z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
            <path d="M14 42h22a9 9 0 0 0 1.5-17.8 11.5 11.5 0 0 0-21.8-1.6A9.5 9.5 0 0 0 14 42z" fill="#94a3b8" fill-opacity="0.5" stroke="#64748b" stroke-width="1.5"/>
          </svg>`;

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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function getWeekdayName(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return date.toLocaleDateString([], { weekday: 'short' });
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

  async function fetchForecast(lat, lon, locationInfo) {
    showStatus('Updating weather forecast...', false);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather service error: ${response.status}`);
      const data = await response.json();

      state.weatherData = data;
      state.currentLocation = locationInfo;

      renderDashboard();
      hideStatus();
    } catch (err) {
      console.error('Forecast error:', err);
      showStatus('Unable to retrieve weather data. Please check connection and try again.', true);
    }
  }

  async function searchCities(query) {
    if (!query || query.trim().length < 2) {
      elements.searchResultsDropdown.classList.add('hidden');
      elements.searchResultsDropdown.innerHTML = '';
      return;
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      renderSearchResults(data.results || []);
    } catch (err) {
      console.error('Geocoding search failed:', err);
    }
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&format=json`;
      // Note: Open-Meteo geocoding search works by name; for reverse geocoding coordinates fallback cleanly
      return {
        name: 'My Location',
        country: '',
        countryCode: 'GPS',
        lat,
        lon,
      };
    } catch (e) {
      return { name: 'Current Location', country: '', countryCode: 'GPS', lat, lon };
    }
  }

  // =========================================================================
  // Rendering Views
  // =========================================================================

  function renderDashboard() {
    if (!state.weatherData || !state.currentLocation) return;

    const { current, hourly, daily, timezone } = state.weatherData;
    const loc = state.currentLocation;
    const isDay = current.is_day !== undefined ? current.is_day : 1;
    const weatherMeta = getWeatherMeta(current.weather_code, isDay);

    // Apply Dynamic Atmospheric Theme
    updateAtmosphere(weatherMeta, isDay);

    // Header & Location Info
    elements.cityName.textContent = loc.name;
    elements.countryBadge.textContent = loc.countryCode || loc.country || '--';
    
    // Local Time format
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

    // Hero Card
    elements.conditionBadge.className = `weather-badge`;
    elements.conditionText.textContent = weatherMeta.description;
    elements.currentTemp.textContent = convertTemp(current.temperature_2m);
    elements.displayUnit.textContent = `°${state.unit.toUpperCase()}`;
    elements.heroWeatherIcon.innerHTML = createWeatherSvg(weatherMeta.iconType, isDay);

    elements.apparentTemp.textContent = `${convertTemp(current.apparent_temperature)}°${state.unit.toUpperCase()}`;
    
    // High / Low for Today
    const todayHigh = daily.temperature_2m_max[0];
    const todayLow = daily.temperature_2m_min[0];
    elements.tempRange.textContent = `${convertTemp(todayHigh)}° / ${convertTemp(todayLow)}°`;

    // Precipitation current
    elements.precipitationCurrent.textContent = `${current.precipitation || 0} mm`;

    // Highlights: Wind
    const wind = convertSpeed(current.wind_speed_10m);
    elements.windSpeed.textContent = wind.val;
    elements.windUnit.textContent = wind.unit;
    elements.windDirText.textContent = `${getWindDirectionCardinal(current.wind_direction_10m)} (${current.wind_direction_10m}°)`;
    elements.compassNeedle.style.transform = `rotate(${current.wind_direction_10m}deg)`;

    // Highlights: Humidity
    const hum = current.relative_humidity_2m;
    elements.humidityVal.textContent = hum;
    elements.humidityProgress.style.width = `${Math.min(hum, 100)}%`;
    if (hum < 30) elements.humidityState.textContent = 'Dry air';
    else if (hum <= 60) elements.humidityState.textContent = 'Comfortable moisture';
    else elements.humidityState.textContent = 'High humidity / sticky';

    // Highlights: UV Index
    const uvMax = daily.uv_index_max[0] || 0;
    elements.uvVal.textContent = uvMax.toFixed(1);
    const uvPercent = Math.min((uvMax / 12) * 100, 100);
    elements.uvIndicator.style.left = `${uvPercent}%`;
    if (uvMax <= 2) {
      elements.uvBadge.textContent = 'Low';
      elements.uvAdvice.textContent = 'No protection needed';
    } else if (uvMax <= 5) {
      elements.uvBadge.textContent = 'Moderate';
      elements.uvAdvice.textContent = 'Sunscreen recommended';
    } else if (uvMax <= 7) {
      elements.uvBadge.textContent = 'High';
      elements.uvAdvice.textContent = 'Hat & SPF 30+ advised';
    } else if (uvMax <= 10) {
      elements.uvBadge.textContent = 'Very High';
      elements.uvAdvice.textContent = 'Seek shade midday';
    } else {
      elements.uvBadge.textContent = 'Extreme';
      elements.uvAdvice.textContent = 'Avoid outdoor exposure';
    }

    // Highlights: Sun times
    elements.sunriseTime.textContent = formatTime(daily.sunrise[0]);
    elements.sunsetTime.textContent = formatTime(daily.sunset[0]);

    // Highlights: Rain Chance
    const rainMax = daily.precipitation_probability_max[0] || 0;
    elements.rainChanceVal.textContent = rainMax;
    elements.rainProgress.style.width = `${rainMax}%`;
    if (rainMax === 0) elements.rainAdvice.textContent = 'Zero chance of precipitation';
    else if (rainMax < 40) elements.rainAdvice.textContent = 'Unlikely, but possible drizzle';
    else if (rainMax < 70) elements.rainAdvice.textContent = 'Bring an umbrella';
    else elements.rainAdvice.textContent = 'High probability of rain / storm';

    // Highlights: Pressure
    const press = Math.round(current.surface_pressure || 1013);
    elements.pressureVal.textContent = press;
    if (press < 1005) elements.pressureState.textContent = 'Low pressure system (storms)';
    else if (press > 1020) elements.pressureState.textContent = 'High pressure (fair weather)';
    else elements.pressureState.textContent = 'Normal atmospheric pressure';

    // Render 7-Day Forecast
    renderDailyForecast(daily);

    // Render Hourly Strip & Chart
    renderHourlyForecast(hourly);

    // Update Favorites active pill styling
    renderFavorites();
  }

  function renderDailyForecast(daily) {
    elements.dailyForecastList.innerHTML = '';
    const daysCount = Math.min(daily.time.length, 7);

    // Find min and max across the entire week to scale the visual temperature bars
    let absoluteMin = Math.min(...daily.temperature_2m_min.slice(0, daysCount));
    let absoluteMax = Math.max(...daily.temperature_2m_max.slice(0, daysCount));
    const rangeSpan = Math.max(absoluteMax - absoluteMin, 1);

    for (let i = 0; i < daysCount; i++) {
      const dateStr = daily.time[i];
      const dayLabel = i === 0 ? 'Today' : getWeekdayName(dateStr);
      const code = daily.weather_code[i];
      const meta = getWeatherMeta(code, 1);
      const minTemp = daily.temperature_2m_min[i];
      const maxTemp = daily.temperature_2m_max[i];
      const rainProb = daily.precipitation_probability_max[i];

      // Calculate bar offsets
      const leftPercent = ((minTemp - absoluteMin) / rangeSpan) * 100;
      const widthPercent = Math.max(((maxTemp - minTemp) / rangeSpan) * 100, 8);

      const item = document.createElement('div');
      item.className = 'daily-item';
      item.innerHTML = `
        <span class="daily-day">${dayLabel}</span>
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
      elements.dailyForecastList.appendChild(item);
    }
  }

  function renderHourlyForecast(hourly) {
    elements.hourlyStrip.innerHTML = '';
    if (!hourly || !hourly.time) return;

    // Find current hour index based on current time
    const nowIso = new Date().toISOString().slice(0, 13);
    let startIndex = hourly.time.findIndex(t => t.startsWith(nowIso));
    if (startIndex === -1) startIndex = 0;

    const next24 = [];
    for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
      next24.push({
        time: hourly.time[i],
        temp: hourly.temperature_2m[i],
        code: hourly.weather_code[i],
        pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
        isDay: hourly.is_day ? hourly.is_day[i] : 1,
      });
    }

    // Populate Cards
    next24.forEach((h, idx) => {
      const meta = getWeatherMeta(h.code, h.isDay);
      const isNow = idx === 0;
      const timeLabel = isNow ? 'Now' : formatTime(h.time);

      const el = document.createElement('div');
      el.className = `hourly-item ${isNow ? 'now' : ''}`;
      el.innerHTML = `
        <span class="hourly-time">${timeLabel}</span>
        <div class="hourly-icon">${createWeatherSvg(meta.iconType, h.isDay)}</div>
        <span class="hourly-temp">${convertTemp(h.temp)}°</span>
        <span class="hourly-pop">${h.pop > 0 ? `💧${h.pop}%` : ''}</span>
      `;
      elements.hourlyStrip.appendChild(el);
    });

    // Cache for quick redrawing on window resize
    state.next24Hours = next24;

    // Render Canvas Interactive Chart
    drawHourlyChart(next24);
  }

  function drawHourlyChart(hourlyData) {
    const data = hourlyData || state.next24Hours;
    const canvas = elements.hourlyCanvas;
    if (!canvas || !data || data.length < 2) return;

    // Calculate actual available pixel width from element or parent container
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

    if (data.length < 2) return;

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
  }

  // =========================================================================
  // Search Autocomplete
  // =========================================================================

  function renderSearchResults(results) {
    elements.searchResultsDropdown.innerHTML = '';
    if (!results || results.length === 0) {
      elements.searchResultsDropdown.innerHTML = `<div class="dropdown-empty">No cities matching "${elements.citySearchInput.value}"</div>`;
      elements.searchResultsDropdown.classList.remove('hidden');
      return;
    }

    results.forEach(item => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      const regionText = [item.admin1, item.country].filter(Boolean).join(', ');

      div.innerHTML = `
        <div>
          <div class="dropdown-city">${item.name}</div>
          <div class="dropdown-region">${regionText}</div>
        </div>
        <span class="dropdown-country">${item.country_code || ''}</span>
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
        });
      });

      elements.searchResultsDropdown.appendChild(div);
    });

    elements.searchResultsDropdown.classList.remove('hidden');
  }

  // =========================================================================
  // Favorites Management
  // =========================================================================

  function loadFavorites() {
    const saved = localStorage.getItem('skypulse_favorites');
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
    localStorage.setItem('skypulse_favorites', JSON.stringify(state.favorites));
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

    // Hourly tabs (Cards vs Chart View)
    elements.tabCardsView.addEventListener('click', () => {
      elements.tabCardsView.classList.add('active');
      elements.tabChartView.classList.remove('active');
      elements.hourlyCardsView.classList.remove('hidden');
      elements.hourlyChartContainer.classList.add('hidden');
      state.activeTab = 'cards';
    });

    elements.tabChartView.addEventListener('click', () => {
      elements.tabChartView.classList.add('active');
      elements.tabCardsView.classList.remove('active');
      elements.hourlyCardsView.classList.add('hidden');
      elements.hourlyChartContainer.classList.remove('hidden');
      state.activeTab = 'chart';
      // Redraw canvas with current container dimensions immediately
      requestAnimationFrame(() => {
        drawHourlyChart();
      });
    });

    // Dynamic browser window resize handler with debounce & ResizeObserver
    let resizeTimer = null;
    function handleResize() {
      if (state.activeTab === 'chart') {
        drawHourlyChart();
      }
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
