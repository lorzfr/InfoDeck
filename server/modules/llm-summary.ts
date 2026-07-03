import { getConfig } from '../utils/config';
import { ollamaChat } from '../utils/ollama';
import { getWeather } from './weather';
import { getServices } from './services';

interface SummaryCache {
  summary: string;
  score: number;
  color: string;
  generatedAt: number;
}

let cache: SummaryCache = {
  summary: 'No summary generated yet.',
  score: 5,
  color: '#eab308',
  generatedAt: 0,
};

function scoreToColor(score: number): string {
  if (score >= 9) return '#22c55e';
  if (score >= 7) return '#84cc16';
  if (score >= 5) return '#eab308';
  if (score >= 3) return '#f97316';
  return '#ef4444';
}

export async function generateSummary(): Promise<SummaryCache> {
  const config = getConfig();

  const weather = await getWeather();
  const services = await getServices();

  const weatherText = weather.summary || 'No weather data available.';
  const servicesText = services.length > 0
    ? services.map(s => `- ${s.name}: ${s.status} (public: ${s.publicHttpCode}, LAN: ${s.lanHttpCode})`).join('\n')
    : 'No services configured.';

  const systemPrompt = `You are a system administrator assistant. Given the weather summary and service statuses, provide a brief overall status report. Highlight any concerns, note what is working well, and conclude with a health score from 1 to 10. The border color should be red (1) to green (10).`;

    const prompt = `Weather: ${weatherText}\n\nService Statuses:\n${servicesText}\n\nProvide a brief status report with a health score out of 10. Use plain text only — no code blocks, no markdown formatting.`;

  try {
    const result = await ollamaChat(prompt, systemPrompt);
    if (result) {
      // Strip markdown code blocks
      let clean = result.replace(/```[\s\S]*?```/g, '').trim();
      clean = clean.replace(/`([^`]+)`/g, '$1');
      const scoreMatch = clean.match(/\b(\d{1,2})\s*\/\s*10\b/);
      const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5;

      cache = {
        summary: clean,
        score,
        color: scoreToColor(score),
        generatedAt: Date.now(),
      };
    }
  } catch (err) {
    console.error('Failed to generate LLM summary:', err);
  }

  return cache;
}

export async function getSummary(): Promise<SummaryCache> {
  const config = getConfig();
  const interval = config.modules.llmSummary.intervalMinutes * 60 * 1000;

  if (!cache.summary || Date.now() - cache.generatedAt > interval) {
    return generateSummary();
  }
  return cache;
}
