// Weather Module
async function updateWeather() {
  try {
    const res = await fetch('/api/modules/weather');
    const data = await res.json();

    if (!data.current) {
      document.querySelectorAll('#weather-content, #playlist-weather-content').forEach(el => {
        el.innerHTML = '<div class="text-gray-500 text-center">No weather data available</div>';
      });
      return;
    }

    const c = data.current;
    const temp = c.temperature_2m;
    const humidity = c.relative_humidity_2m;
    const feelsLike = c.apparent_temperature;
    const wind = c.wind_speed_10m;
    const emoji = getWeatherEmoji(c.weather_code);

    const forecastHtml = data.forecast && data.forecast.length > 0
      ? `<div class="mt-3"><div class="text-xs text-gray-500 mb-1 font-semibold tracking-wide">24-HOUR FORECAST</div>
         <div class="flex gap-2 overflow-x-auto pb-2" style="scrollbar-width:thin">${
           data.forecast.map(f => {
             const dt = new Date(f.time);
             const h = String(dt.getHours()).padStart(2, '0');
             const d = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
             const isNow = h === String(new Date().getHours()).padStart(2, '0');
             return `<div class="flex-shrink-0 w-20 text-center p-2 rounded-xl ${isNow ? 'bg-blue-900/40 ring-1 ring-blue-500/50' : 'bg-gray-800/40'}">
               <div class="text-xs font-bold text-gray-300">${h}:00</div>
               <div class="text-xs text-gray-500">${d.split(' ')[0]}</div>
               <div class="text-xl my-1">${getWeatherEmoji(f.weatherCode)}</div>
               <div class="text-sm font-bold">${Math.round(f.temperature)}°</div>
               <div class="text-xs text-gray-400">${Math.round(f.feelsLike)}°</div>
               <div class="flex items-center justify-center gap-0.5 mt-1">
                 <span class="text-xs text-blue-300">${f.precipitationProbability}%</span>
                 <span class="text-xs text-gray-500">💧</span>
               </div>
               <div class="text-xs text-gray-400">${Math.round(f.windSpeed)} km/h</div>
             </div>`;
           }).join('')
         }</div></div>`
      : '';

    const html = `
      <div class="flex flex-col h-full">
        <div class="text-center">
          <div class="text-5xl mb-1">${emoji}</div>
          <div class="weather-temp text-3xl">${Math.round(temp)}°</div>
          <div class="weather-condition">${weatherCodeToString(c.weather_code)}</div>
          <div class="weather-detail mt-2 mb-1">
            <div class="weather-detail-item">
              <div class="text-xs text-gray-400">Feels</div>
              <div class="text-base font-semibold">${Math.round(feelsLike)}°</div>
            </div>
            <div class="weather-detail-item">
              <div class="text-xs text-gray-400">Humidity</div>
              <div class="text-base font-semibold">${humidity}%</div>
            </div>
            <div class="weather-detail-item">
              <div class="text-xs text-gray-400">Wind</div>
              <div class="text-base font-semibold">${Math.round(wind)} km/h</div>
            </div>
          </div>
          ${data.summary ? `<div class="text-xs text-gray-500 italic mb-1">${data.summary}</div>` : ''}
        </div>
        ${forecastHtml}
      </div>
    `;

    document.getElementById('weather-content').innerHTML = html;
    document.getElementById('playlist-weather-content').innerHTML = html;
  } catch (err) {
    console.error('Weather update failed:', err);
    const msg = '<div class="text-red-400 text-center text-sm">Weather unavailable</div>';
    document.querySelectorAll('#weather-content, #playlist-weather-content').forEach(el => {
      el.innerHTML = msg;
    });
  }
}

function getWeatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function weatherCodeToString(code) {
  const map = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };
  return map[code] || 'Unknown';
}
