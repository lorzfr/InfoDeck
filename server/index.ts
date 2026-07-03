import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, getConfig, saveConfig } from './utils/config';
import { testConnection } from './utils/ollama';
import { getWeather } from './modules/weather';
import { getServices, refreshServices } from './modules/services';
import { getFlightradarConfig, getIframeUrl } from './modules/flightradar';
import { getSummary, generateSummary } from './modules/llm-summary';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const publicDir = join(import.meta.dir, '..', 'public');
const iconsDir = join(publicDir, 'icons');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(publicDir));

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const upload = multer({ dest: iconsDir });

// Initialize config
loadConfig();

// Config API
app.get('/api/config', (_req, res) => {
  const cfg = getConfig();
  const safe = JSON.parse(JSON.stringify(cfg));
  if (safe.modules?.weather?.apiKey) {
    safe.modules.weather.apiKey = safe.modules.weather.apiKey ? '***' : '';
  }
  res.json(safe);
});

app.put('/api/config', (req, res) => {
  try {
    const newConfig = req.body;

    // Preserve API key if masked
    const current = getConfig();
    if (newConfig.modules?.weather?.apiKey === '***') {
      newConfig.modules.weather.apiKey = current.modules.weather.apiKey;
    }

    saveConfig(newConfig);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// Ollama test
app.post('/api/ollama/test', async (req, res) => {
  const { apiUrl } = req.body;
  const ok = await testConnection(apiUrl || getConfig().ollama.apiUrl);
  res.json({ success: ok });
});

// Modules
app.get('/api/modules/weather', async (_req, res) => {
  try {
    const data = await getWeather();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Weather fetch failed' });
  }
});

app.get('/api/modules/services', async (_req, res) => {
  try {
    const data = await getServices();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Services fetch failed' });
  }
});

app.post('/api/modules/services/refresh', async (_req, res) => {
  try {
    const data = await refreshServices();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Services refresh failed' });
  }
});

app.get('/api/modules/flightradar', (_req, res) => {
  const cfg = getFlightradarConfig();
  res.json({
    ...cfg,
    iframeUrl: getIframeUrl(cfg.centerLat, cfg.centerLon, cfg.zoom),
  });
});

app.get('/api/modules/flightradar/iframe', async (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 52.52;
  const lon = parseFloat(req.query.lon as string) || 13.405;
  const zoom = parseInt(req.query.zoom as string) || 7;
  const url = getIframeUrl(lat, lon, zoom);
  try {
    const resp = await fetch(url);
    const html = await resp.text();
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch {
    res.redirect(url);
  }
});

app.get('/api/modules/llm-summary', async (_req, res) => {
  try {
    const data = await getSummary();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'LLM summary fetch failed' });
  }
});

app.post('/api/modules/llm-summary/generate', async (_req, res) => {
  try {
    const data = await generateSummary();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'LLM summary generation failed' });
  }
});

// Icon upload
app.post('/api/upload-icon', upload.single('icon'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const iconUrl = `/icons/${req.file.filename}`;
  res.json({ success: true, url: iconUrl });
});

// Start server
app.listen(PORT, () => {
  console.log(`Dashboard server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from ${publicDir}`);
});
