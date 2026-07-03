import { getConfig } from '../utils/config';
import { ollamaChat } from '../utils/ollama';

interface WeatherCache {
  current: Record<string, unknown> | null;
  forecast: Record<string, unknown>[] | null;
  summary: string;
  fetchedAt: number;
  summaryGeneratedAt: number;
}

let cache: WeatherCache = {
  current: null,
  forecast: null,
  summary: '',
  fetchedAt: 0,
  summaryGeneratedAt: 0,
};

const FETCH_INTERVAL = 10 * 60 * 1000;
const SUMMARY_INTERVAL = 60 * 60 * 1000;

async function fetchWeather(): Promise<{ current: Record<string, unknown>; forecast: Record<string, unknown>[] } | null> {
  const config = getConfig();
  const { location, units } = config.modules.weather;

  let lat: number, lon: number;

  if (location.includes(',')) {
    const parts = location.split(',');
    const city = parts[0].trim();
    const country = parts[1]?.trim() || '';

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    try {
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json() as { results?: { latitude: number; longitude: number }[] };
      if (!geoData.results || geoData.results.length === 0) return null;
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
    } catch {
      return null;
    }
  } else {
    const coords = location.split(',').map(Number);
    if (coords.length < 2 || isNaN(coords[0]) || isNaN(coords[1])) return null;
    [lat, lon] = coords;
  }

  const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=2&temperature_unit=${tempUnit}`;

  try {
    const res = await fetch(weatherUrl);
    const data = await res.json() as {
      current: Record<string, unknown>;
      hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: number[] };
    };

    const now = new Date();
    const currentHour = now.getHours();
    const hourlyTimes = data.hourly.time;
    const next12Indices: number[] = [];
    for (let i = 0; i < hourlyTimes.length; i++) {
      const h = new Date(hourlyTimes[i]).getHours();
      if (h >= currentHour && next12Indices.length < 12) {
        next12Indices.push(i);
      }
    }

    const forecast = next12Indices.map(i => ({
      time: data.hourly.time[i],
      temperature: data.hourly.temperature_2m[i],
      weatherCode: data.hourly.weather_code[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
    }));

    return {
      current: data.current,
      forecast,
    };
  } catch {
    return null;
  }
}

function weatherCodeToString(code: number): string {
  const map: Record<number, string> = {
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

async function generateSummary(current: Record<string, unknown>, forecast: Record<string, unknown>[]): Promise<string> {
  const temp = current.temperature_2m;
  const condition = weatherCodeToString(current.weather_code as number);
  const wind = current.wind_speed_10m;

  const highTemp = Math.max(...forecast.map(f => f.temperature as number));
  const lowTemp = Math.min(...forecast.map(f => f.temperature as number));

  const prompt = `Current weather: ${condition}, ${temp}°C, wind ${wind} km/h. Forecast: high ${highTemp}°C, low ${lowTemp}°C. Summarise the current weather and upcoming forecast in one friendly sentence.`;
  const result = await ollamaChat(prompt);
  return result || `${condition}, ${temp}°C`;
}

export async function getWeather(): Promise<{
  current: Record<string, unknown> | null;
  forecast: Record<string, unknown>[] | null;
  summary: string;
}> {
  const now = Date.now();

  if (!cache.current || now - cache.fetchedAt > FETCH_INTERVAL) {
    const data = await fetchWeather();
    if (data) {
      cache.current = data.current;
      cache.forecast = data.forecast;
      cache.fetchedAt = now;
    }
  }

  if (!cache.summary || now - cache.summaryGeneratedAt > SUMMARY_INTERVAL) {
    if (cache.current && cache.forecast) {
      cache.summary = await generateSummary(cache.current, cache.forecast);
      cache.summaryGeneratedAt = now;
    }
  }

  return {
    current: cache.current,
    forecast: cache.forecast,
    summary: cache.summary,
  };
}
