import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const CONFIG_PATH = join(import.meta.dir, '..', 'config.json');
const BACKUP_DIR = join(import.meta.dir, '..', 'backups');

export interface ServiceEntry {
  name: string;
  publicUrl: string;
  lanUrl: string;
  icon: string;
  usePublic: boolean;
  useLan: boolean;
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
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    // Save a backup of the current config (in case we need to recover it)
    try { copyFileSync(CONFIG_PATH, join(BACKUP_DIR, `config.json.${timestamp}.bak`)); } catch { }

    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    config = { ...defaultConfig, ...parsed };
    return config!;
  } catch (err) {
    // CRITICAL FIX: Never silently overwrite user settings with defaults.
    // Preserve the original file so the user can fix it manually.
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Config error — did not replace config.json with defaults:\n  ${errMsg}\n\nTo recover, edit '${CONFIG_PATH}' and fix the JSON syntax.`);
    throw new Error(`Failed to load config: ${errMsg}`);
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
