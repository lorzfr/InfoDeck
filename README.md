# InfoDeck - Touch-Optimized Dashboard Server

A self-contained, touch-optimized dashboard web server targeting 1536x960+ screens. Features live clock, weather, service health monitoring, FlightRadar24 map, and LLM-powered system summary.

## Quick Start

```bash
# Run the interactive installer
sudo ./setup.sh
```

Or run manually with Bun:

```bash
cd server
bun install
bun run index.ts
```

Then open `http://<your-ip>:3000` in a browser.

## Features

- **Live Clock**: HH:MM:SS with configurable 12h/24h format
- **Weather**: Current conditions + hourly forecast + LLM summary
- **Service Health**: Monitor public/LAN endpoints with status indicators
- **FlightRadar24**: Embedded map with zoom controls
- **LLM Summary**: AI-powered system status report (requires Ollama)
- **View Modes**: Box Grid or Full-Size Playlist with auto-advance
- **Touch-Optimized**: 48px minimum touch targets, swipe-friendly
- **Fully Configurable**: Settings panel for all modules

## Configuration

All settings are server-side via the settings panel (gear icon) or by editing `server/config.json` directly. Changes are automatically backed up.

### Requirements

- Ubuntu 24.04 (or any Linux with systemd)
- Bun runtime (installed by setup script)
- Optional: Ollama for LLM summaries

## Directory Structure

```
dashboard-server/
├── setup.sh           # Interactive installer
├── server/            # Backend (TypeScript + Express)
│   ├── index.ts       # Entry point with API routes
│   ├── config.json    # Global configuration
│   ├── modules/       # Server module logic
│   └── utils/         # Config and Ollama utilities
├── public/            # Frontend (HTML/CSS/JS)
│   ├── index.html     # Main dashboard page
│   ├── css/style.css  # Touch-optimized styles
│   └── js/            # Alpine.js-powered frontend
└── logs/              # Installation logs
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Get current config |
| PUT | `/api/config` | Update config (auto-backup) |
| GET | `/api/modules/weather` | Weather + forecast + summary |
| GET | `/api/modules/services` | Service statuses with latency |
| POST | `/api/modules/services/refresh` | Force service check refresh |
| GET | `/api/modules/flightradar` | FlightRadar config + iframe URL |
| GET | `/api/modules/flightradar/iframe` | Proxied FlightRadar24 iframe |
| GET | `/api/modules/llm-summary` | Latest LLM summary |
| POST | `/api/modules/llm-summary/generate` | Force summary regeneration |
| POST | `/api/ollama/test` | Test Ollama connection |
| POST | `/api/upload-icon` | Upload service icon |

## License

MIT
