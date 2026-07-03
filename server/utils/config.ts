import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const CONFIG_PATH = join(import.meta.dir, '..', 'config.json');
const BACKUP_DIR = join(import.meta.dir, '..', 'backups');

export interface ServiceEntry {
  name: string;
  publicUrl: string;
  lanUrl: string;
  icon: string;
}

export interface Config {
  general: {
    dashboardTitle: string;
    viewMode: 'boxes' | 'playlist';
    playlistSpeed: number;
    clockFormat: '24h' | '12h';
    dateFormat: string;
  };
  ollama: {
    apiUrl: string;
    model: string;
  };
  modules: {
    weather: {
      enabled: boolean;
      location: string;
      units: 'metric' | 'imperial';
      apiKey: string;
    };
    services: {
      enabled: boolean;
      entries: ServiceEntry[];
    };
    flightradar: {
      enabled: boolean;
      centerLat: number;
      centerLon: number;
      zoom: number;
    };
    llmSummary: {
      enabled: boolean;
      intervalMinutes: number;
    };
  };
}

const defaultConfig: Config = {
  general: {
    dashboardTitle: 'InfoDeck Dashboard',
    viewMode: 'boxes',
    playlistSpeed: 10,
    clockFormat: '24h',
    dateFormat: 'DD:MM:YYYY',
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    model: 'llama3',
  },
  modules: {
    weather: {
      enabled: true,
      location: 'Berlin,DE',
      units: 'metric',
      apiKey: '',
    },
    services: {
      enabled: true,
      entries: [],
    },
    flightradar: {
      enabled: true,
      centerLat: 52.52,
      centerLon: 13.405,
      zoom: 7,
    },
    llmSummary: {
      enabled: true,
      intervalMinutes: 60,
    },
  },
};

let config: Config | null = null;

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    config = { ...defaultConfig, ...parsed };
    if (parsed.general) config.general = { ...defaultConfig.general, ...parsed.general };
    if (parsed.ollama) config.ollama = { ...defaultConfig.ollama, ...parsed.ollama };
    if (parsed.modules) {
      config.modules = { ...defaultConfig.modules };
      if (parsed.modules.weather) config.modules.weather = { ...defaultConfig.modules.weather, ...parsed.modules.weather };
      if (parsed.modules.services) config.modules.services = { ...defaultConfig.modules.services, ...parsed.modules.services };
      if (parsed.modules.flightradar) config.modules.flightradar = { ...defaultConfig.modules.flightradar, ...parsed.modules.flightradar };
      if (parsed.modules.llmSummary) config.modules.llmSummary = { ...defaultConfig.modules.llmSummary, ...parsed.modules.llmSummary };
    }
    return config!;
  } catch {
    config = { ...defaultConfig };
    saveConfigRaw(config);
    return config;
  }
}

export function getConfig(): Config {
  if (!config) return loadConfig();
  return config;
}

function saveConfigRaw(cfg: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

export function saveConfig(cfg: Config): void {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    copyFileSync(CONFIG_PATH, join(BACKUP_DIR, `config.json.${timestamp}.bak`));
  } catch { }
  config = cfg;
  saveConfigRaw(cfg);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
