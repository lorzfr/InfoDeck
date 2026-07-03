#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# InfoDeck Dashboard Server - CLI Installer
# ============================================================

APP_NAME="InfoDeck Dashboard Server"
REPO_URL="https://github.com/lorzfr/InfoDeck.git"
INSTALL_DIR="/opt/dashboard-server"
CLONE_DIR="/tmp/infodeck-clone"
LOG_DIR="/var/log/infodeck"
LOG_FILE="$LOG_DIR/install.log"

# Save tty fds BEFORE exec redirect (breaks /dev/tty on some systems)
exec 7>/dev/tty 6</dev/tty

# --- helpers ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
prompt_yn() {
  local msg="$1" default="${2:-Y}" ans
  while true; do
    echo -en "${YELLOW}${msg} [${default}] ${NC}" >&7
    read -r ans <&6
    ans="${ans:-$default}"
    case "$ans" in [Yy]*) return 0;; [Nn]*) return 1;; *) echo "Please answer y or n." >&7;; esac
  done
}
prompt_str() {
  local msg="$1" default="$2" ans
  echo -e "${YELLOW}${msg}${NC}" >&7
  echo -n "  [${default}]: " >&7
  read -r ans <&6
  echo "${ans:-$default}"
}

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
info() { echo -e "  ${YELLOW}i${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; }

# --- setup & logging ---
mkdir -p "$LOG_DIR" "$CLONE_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  $APP_NAME Installer${NC}"
echo -e "${BLUE}  Started: $(date)${NC}"
echo -e "${BLUE}  Log: $LOG_FILE${NC}"
echo -e "${BLUE}============================================${NC}"

OS_NAME=$(lsb_release -ds 2>/dev/null || grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d'"' -f2 || echo "unknown")
log "Detected OS: $OS_NAME"

prompt_yn "Proceed with installation?" || { info "Cancelled."; exit 0; }

# --- 1. System deps ---
log "Installing system dependencies (curl, unzip, git, build-essential)..."
if prompt_yn "Install system packages?" Y; then
  apt-get update -qq && apt-get install -y -qq curl unzip git build-essential
  ok "System packages installed"
fi

# --- 2. Bun ---
log "Installing Bun runtime..."
if prompt_yn "Install/upgrade Bun?" Y; then
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"
if command -v bun &>/dev/null; then
  ok "Bun $(bun --version)"
else
  fail "Bun not found — install may need a new shell. Re-run the script."
  exit 1
fi

# --- 3. Clone / copy ---
log "Downloading server files..."
rm -rf "$CLONE_DIR"
git clone --depth=1 "$REPO_URL" "$CLONE_DIR"
mkdir -p "$INSTALL_DIR"
cp -r "$CLONE_DIR/server" "$INSTALL_DIR/"
cp -r "$CLONE_DIR/public" "$INSTALL_DIR/"
cp "$CLONE_DIR/LICENSE" "$INSTALL_DIR/" 2>/dev/null || true
ok "Files installed to $INSTALL_DIR"

# --- 4. Dependencies ---
log "Installing npm dependencies..."
cd "$INSTALL_DIR/server"
bun install || { fail "bun install failed — trying npm"; npm install; }
ok "Dependencies installed"

# --- 5. Config ---
CONFIG_FILE="$INSTALL_DIR/server/config.json"
if [ -f "$CONFIG_FILE" ]; then
  # backup existing config
  cp "$CONFIG_FILE" "$CONFIG_FILE.install-$(date +%s).bak"
  ok "Existing config backed up (not overwritten)"
  info "Using your existing config at $CONFIG_FILE"
else
  log "Initial configuration (can be changed later from the web UI)"
  echo "" >&7

  TITLE=$(prompt_str "Dashboard title:" "InfoDeck Dashboard")
  OLLAMA_URL=$(prompt_str "Ollama API URL (leave as-is if no Ollama yet):" "http://localhost:11434")
  OLLAMA_MODEL=$(prompt_str "Ollama model:" "llama3")
  WEATHER=$(prompt_str "Weather location (City,Country or lat,lon):" "Berlin,DE")
  WEATHER_KEY=$(prompt_str "OpenWeatherMap API key (leave blank for free Open-Meteo):" "")
  FR_LAT=$(prompt_str "FlightRadar24 center latitude:" "52.52")
  FR_LON=$(prompt_str "FlightRadar24 center longitude:" "13.405")

  cat > "$CONFIG_FILE" <<JSONEOF
{
  "general": {
    "dashboardTitle": "${TITLE}",
    "viewMode": "boxes",
    "playlistSpeed": 10,
    "clockFormat": "24h",
    "dateFormat": "DD:MM:YYYY"
  },
  "ollama": {
    "apiUrl": "${OLLAMA_URL}",
    "model": "${OLLAMA_MODEL}"
  },
  "modules": {
    "weather": {
      "enabled": true,
      "location": "${WEATHER}",
      "units": "metric",
      "apiKey": "${WEATHER_KEY}"
    },
    "services": {
      "enabled": true,
      "entries": [
        {
          "name": "My Service",
          "publicUrl": "https://example.com",
          "lanUrl": "",
          "usePublic": true,
          "useLan": false,
          "icon": ""
        }
      ]
    },
    "flightradar": {
      "enabled": true,
      "centerLat": ${FR_LAT},
      "centerLon": ${FR_LON},
      "zoom": 7
    },
    "llmSummary": {
      "enabled": true,
      "intervalMinutes": 60
    }
  }
}
JSONEOF
  ok "Configuration saved"
fi

# --- 6. Systemd ---
log "Systemd service"
if prompt_yn "Install dashboard as a systemd service (auto-start on boot)?" Y; then
  BUN_PATH=$(command -v bun || echo "$HOME/.bun/bin/bun")
  cat > /etc/systemd/system/dashboard.service <<UNIT
[Unit]
Description=InfoDeck Dashboard Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/server
ExecStart=${BUN_PATH} run index.ts
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable dashboard.service
  ok "Service created and enabled"
  log "Starting dashboard..."
  systemctl start dashboard.service || fail "Check: systemctl status dashboard"
  sleep 2
  if systemctl is-active --quiet dashboard.service; then
    ok "Dashboard is running"
  else
    fail "May not have started — run: systemctl status dashboard"
  fi
else
  info "Skipping systemd. Start manually: bun run ${INSTALL_DIR}/server/index.ts"
fi

# --- Done ---
IP_ADDR=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Dashboard URL:  http://${IP_ADDR}:3000"
echo "  Install dir:    ${INSTALL_DIR}"
echo "  Config file:    ${CONFIG_FILE}"
echo "  Log file:       ${LOG_FILE}"
echo ""
if systemctl is-active --quiet dashboard.service 2>/dev/null; then
  echo "  Status: systemctl status dashboard"
  echo "  Logs:   journalctl -u dashboard -f"
fi
echo ""
log "Finished at $(date)"
