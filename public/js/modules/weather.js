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

    const current = data.current;
    const temp = current.temperature_2m;
    const humidity = current.relative_humidity_2m;
    const feelsLike = current.apparent_temperature;
    const wind = current.wind_speed_10m;

    const weatherEmoji = getWeatherEmoji(current.weather_code);

    const html = `
      <div class="text-center">
        <div class="text-6xl mb-2">${weatherEmoji}</div>
        <div class="weather-temp">${temp}°</div>
        <div class="weather-condition">${weatherCodeToString(current.weather_code)}</div>
        <div class="weather-detail mt-4">
          <div class="weather-detail-item">
            <div class="text-sm text-gray-400">Feels Like</div>
            <div class="text-xl font-semibold">${feelsLike}°</div>
          </div>
          <div class="weather-detail-item">
            <div class="text-sm text-gray-400">Humidity</div>
            <div class="text-xl font-semibold">${humidity}%</div>
          </div>
          <div class="weather-detail-item">
            <div class="text-sm text-gray-400">Wind</div>
            <div class="text-xl font-semibold">${wind} km/h</div>
          </div>
        </div>
        ${data.summary ? `<div class="mt-4 text-sm text-gray-400 italic">${data.summary}</div>` : ''}
        ${data.forecast ? `<div class="mt-4"><div class="text-sm text-gray-400 mb-2">Next 12 hours</div><div class="flex gap-2 overflow-x-auto justify-center">${data.forecast.slice(0, 6).map(f => `
          <div class="text-center min-w-[60px] p-2 bg-gray-800/50 rounded-lg">
            <div class="text-xs text-gray-400">${new Date(f.time).getHours()}:00</div>
            <div class="text-lg">${getWeatherEmoji(f.weatherCode)}</div>
            <div class="text-sm font-semibold">${f.temperature}°</div>
          </div>
        `).join('')}</div></div>` : ''}
      </div>
    `;

    document.getElementById('weather-content').innerHTML = html;
    document.getElementById('playlist-weather-content').innerHTML = html;
  } catch (err) {
    console.error('Weather update failed:', err);
    const msg = `<div class="text-red-400 text-center text-sm">Weather unavailable</div>`;
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
