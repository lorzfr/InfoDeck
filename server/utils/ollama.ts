import { getConfig } from './config';

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export async function ollamaChat(prompt: string, system?: string): Promise<string | null> {
  const config = getConfig();
  const { apiUrl, model } = config.ollama;

  try {
    const body: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
    };
    if (system) {
      body.system = system;
    }

    const res = await fetch(`${apiUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Ollama API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as OllamaResponse;
    return data.response;
  } catch (err) {
    console.error('Ollama request failed:', err);
    return null;
  }
}

export async function testConnection(apiUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/api/tags`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
