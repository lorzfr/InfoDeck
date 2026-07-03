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
const RETRY_INTERVAL = 60 * 1000;
const SUMMARY_INTERVAL = 60 * 60 * 1000;

async function fetchWeather(): Promise<{ current: Record<string, unknown>; forecast: Record<string, unknown>[] } | null> {
  const config = getConfig();
  const { location, units } = config.modules.weather;

  let lat: number, lon: number;

  // Try numeric coords first (lat,lon)
  const parts = location.split(',').map(s => s.trim());
  if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
    lat = Number(parts[0]);
    lon = Number(parts[1]);
  } else if (location.includes(',')) {
    const city = parts[0];
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=3&language=en&format=json`;
    try {
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
      if (!geoRes.ok) return null;
      const geoData = await geoRes.json() as { results?: { latitude: number; longitude: number }[] };
      if (!geoData.results || geoData.results.length === 0) {
        console.error('Weather: geocoding returned no results for', city);
        return null;
      }
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
    } catch {
      console.error('Weather: geocoding fetch failed for', city);
      return null;
    }
  } else {
    return null;
  }

  const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=2&temperature_unit=${tempUnit}`;

  try {
    const res = await fetch(weatherUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error('Weather: API returned', res.status);
      return null;
    }
    const data = await res.json() as {
      current: Record<string, unknown>;
      hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: number[] };
    };

    const now = new Date();
    const hourlyTimes = data.hourly.time;
    const next12Indices: number[] = [];
    for (let i = 0; i < hourlyTimes.length && next12Indices.length < 12; i++) {
      const dt = new Date(hourlyTimes[i]);
      if (dt > now) {
        next12Indices.push(i);
      }
    }

    // Fallback: if no future hours found, take last 6 entries
    if (next12Indices.length === 0 && hourlyTimes.length > 0) {
      const start = Math.max(0, hourlyTimes.length - 6);
      for (let i = start; i < hourlyTimes.length; i++) next12Indices.push(i);
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
  const stale = !cache.current;
  const interval = stale ? RETRY_INTERVAL : FETCH_INTERVAL;

  if (!cache.current || now - cache.fetchedAt > interval) {
    const data = await fetchWeather();
    if (data) {
      cache.current = data.current;
      cache.forecast = data.forecast;
      cache.fetchedAt = now;
    } else if (!cache.current) {
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
