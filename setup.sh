#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Dashboard Server - Interactive Setup Script for Ubuntu 24.04
# ============================================================

APP_NAME="InfoDeck Dashboard Server"
INSTALL_DIR="/opt/dashboard-server"
LOG_DIR="$(cd "$(dirname "$0")" && pwd)/logs"
LOG_FILE="$LOG_DIR/install.log"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure log directory
mkdir -p "$LOG_DIR"

# Redirect all output to log (tee)
exec > >(tee -a "$LOG_FILE") 2>&1

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  $APP_NAME Setup${NC}"
echo -e "${BLUE}  Started: $(date)${NC}"
echo -e "${BLUE}  Log: $LOG_FILE${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check for whiptail
if ! command -v whiptail &> /dev/null; then
    echo -e "${YELLOW}Installing whiptail for interactive dialogs...${NC}"
    apt-get update -qq && apt-get install -y -qq whiptail
fi

# Check OS
OS_VERSION=$(lsb_release -rs 2>/dev/null || cat /etc/os-release 2>/dev/null | grep VERSION_ID | cut -d'"' -f2 || echo "unknown")
OS_NAME=$(lsb_release -ds 2>/dev/null || cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo "unknown")

echo -e "${BLUE}[$(date)] Step 0: Checking system...${NC}"

whiptail --title "$APP_NAME Setup" --yesno \
"This setup will install the Dashboard Server on your system.

Detected OS: $OS_NAME

The dashboard provides a touch-optimized web interface with:
- Live clock and date display
- Weather forecasts
- Service health monitoring
- Embedded FlightRadar24 map
- LLM-powered system summary (via Ollama)

Do you want to proceed with the installation?" 18 70 || {
    echo -e "${YELLOW}Setup cancelled by user.${NC}"
    exit 0
}

# --- Step 1: System dependencies ---
echo -e "\n${BLUE}[$(date)] Step 1: Installing system dependencies...${NC}"
echo -e "${YELLOW}Explanation: We need basic tools (curl, unzip, git, build tools) to download and compile packages.${NC}"

whiptail --title "System Dependencies" --yesno \
"We will now install system packages:
  • curl       - for downloading packages
  • unzip      - for extracting archives
  • git        - for version control
  • build-essential - for compiling native modules

These are standard tools required by most server applications.
Proceed?" 14 70 || {
    echo -e "${RED}Dependencies installation skipped by user. May cause issues later.${NC}"
}

if whiptail --title "System Dependencies" --yesno "Install system dependencies?" 8 50; then
    echo -e "${GREEN}Installing build-essential, curl, unzip, git...${NC}"
    apt-get update -qq
    apt-get install -y -qq build-essential curl unzip git
    echo -e "${GREEN}✓ System dependencies installed.${NC}"
fi

# --- Step 2: Install Bun ---
echo -e "\n${BLUE}[$(date)] Step 2: Installing Bun runtime...${NC}"
echo -e "${YELLOW}Explanation: Bun is a modern JavaScript runtime that is faster and more memory-efficient than Node.js. It runs our server code with native TypeScript support and fast startup times.${NC}"

INSTALL_BUN=true
if command -v bun &> /dev/null; then
    BUN_VER=$(bun --version 2>/dev/null || echo "unknown")
    if whiptail --title "Bun Runtime" --yesno \
"Bun is already installed (version: $BUN_VER).

Would you like to reinstall/upgrade to the latest version?
Choose 'No' to keep the current installation." 11 60; then
        INSTALL_BUN=true
    else
        INSTALL_BUN=false
        echo -e "${GREEN}✓ Using existing Bun installation (v$BUN_VER)${NC}"
    fi
fi

if [ "$INSTALL_BUN" = true ]; then
    echo -e "${GREEN}Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash

    # Source Bun for this session
    if [ -f "$HOME/.bashrc" ]; then
        set +euo pipefail
        source "$HOME/.bashrc" 2>/dev/null || true
        set -euo pipefail
    fi
    export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
    export PATH="$BUN_INSTALL/bin:$PATH"

    if command -v bun &> /dev/null; then
        echo -e "${GREEN}✓ Bun installed: $(bun --version)${NC}"
    else
        echo -e "${RED}Failed to install Bun. Trying Node.js fallback...${NC}"
        INSTALL_BUN=false
    fi
fi

# --- Step 3: Copy project files ---
echo -e "\n${BLUE}[$(date)] Step 3: Installing server files...${NC}"
echo -e "${YELLOW}Explanation: We will copy the server code to $INSTALL_DIR where it will run as a system service.${NC}"

whiptail --title "Install Location" --yesno \
"The server will be installed to:
  $INSTALL_DIR

This is the standard location for server applications on Linux.
Proceed?" 12 70 || {
    echo -e "${RED}Installation aborted by user.${NC}"
    exit 0
}

echo -e "${GREEN}Copying files to $INSTALL_DIR...${NC}"
mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR/server" "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/public" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/LICENSE" "$INSTALL_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Files copied.${NC}"

# --- Step 4: Install dependencies ---
echo -e "\n${BLUE}[$(date)] Step 4: Installing npm dependencies...${NC}"
echo -e "${YELLOW}Explanation: We will install the required JavaScript libraries (Express, etc.) that the server needs to run.${NC}"

whiptail --title "Install Dependencies" --yesno \
"We will now install the required Node.js packages using Bun.
This includes:
  • express     - web framework
  • cors        - cross-origin support
  • multer      - file upload handling

Proceed?" 14 60

echo -e "${GREEN}Running bun install...${NC}"
cd "$INSTALL_DIR/server"
bun install || {
    echo -e "${RED}bun install failed. Trying npm...${NC}"
    npm install
}
echo -e "${GREEN}✓ Dependencies installed.${NC}"

# --- Step 5: Initial Configuration ---
echo -e "\n${BLUE}[$(date)] Step 5: Initial configuration...${NC}"
echo -e "${YELLOW}Explanation: We will set up your dashboard preferences. These can be changed later from the web interface.${NC}"

CONFIG_FILE="$INSTALL_DIR/server/config.json"

DASHBOARD_TITLE=$(whiptail --title "Dashboard Title" --inputbox \
"Enter the title for your dashboard (displayed in the browser tab and header):" 9 70 "InfoDeck Dashboard" 3>&1 1>&2 2>&3)

OLLAMA_URL=$(whiptail --title "Ollama API URL" --inputbox \
"Enter the URL of your Ollama server.
Ollama provides the LLM-powered system summary feature.
If you don't have Ollama yet, you can install it later.
Default: http://localhost:11434" 12 70 "http://localhost:11434" 3>&1 1>&2 2>&3)

OLLAMA_MODEL=$(whiptail --title "Ollama Model" --inputbox \
"Enter the Ollama model to use for generating summaries.
Common models: llama3, mistral, gemma, phi
Default: llama3" 10 70 "llama3" 3>&1 1>&2 2>&3)

WEATHER_LOCATION=$(whiptail --title "Weather Location" --inputbox \
"Enter your location for weather forecasts.
Format: City,Country (e.g., Berlin,DE) or lat,lon (e.g., 52.52,13.405)
Default: Berlin,DE" 10 70 "Berlin,DE" 3>&1 1>&2 2>&3)

WEATHER_API_KEY=$(whiptail --title "Weather API Key (Optional)" --inputbox \
"Enter an OpenWeatherMap API key if you want to use it.
If left empty, the server will use the free Open-Meteo API (no key needed).
Open-Meteo provides reliable weather data without registration." 12 70 "" 3>&1 1>&2 2>&3)

FR_LAT=$(whiptail --title "FlightRadar24 Center Latitude" --inputbox \
"Enter the center latitude for the FlightRadar24 map.
Default: 52.52 (Berlin)" 8 70 "52.52" 3>&1 1>&2 2>&3)

FR_LON=$(whiptail --title "FlightRadar24 Center Longitude" --inputbox \
"Enter the center longitude for the FlightRadar24 map.
Default: 13.405 (Berlin)" 8 70 "13.405" 3>&1 1>&2 2>&3)

# Write config
cat > "$CONFIG_FILE" <<EOF
{
  "general": {
    "dashboardTitle": "${DASHBOARD_TITLE:-InfoDeck Dashboard}",
    "viewMode": "boxes",
    "playlistSpeed": 10,
    "clockFormat": "24h",
    "dateFormat": "DD:MM:YYYY"
  },
  "ollama": {
    "apiUrl": "${OLLAMA_URL:-http://localhost:11434}",
    "model": "${OLLAMA_MODEL:-llama3}"
  },
  "modules": {
    "weather": {
      "enabled": true,
      "location": "${WEATHER_LOCATION:-Berlin,DE}",
      "units": "metric",
      "apiKey": "${WEATHER_API_KEY}"
    },
    "services": {
      "enabled": true,
      "entries": [
        {
          "name": "My Website",
          "publicUrl": "https://example.com",
          "lanUrl": "http://192.168.1.100",
          "icon": ""
        }
      ]
    },
    "flightradar": {
      "enabled": true,
      "centerLat": ${FR_LAT:-52.52},
      "centerLon": ${FR_LON:-13.405},
      "zoom": 7
    },
    "llmSummary": {
      "enabled": true,
      "intervalMinutes": 60
    }
  }
}
EOF

echo -e "${GREEN}✓ Configuration saved.${NC}"

# --- Step 6: Systemd service ---
echo -e "\n${BLUE}[$(date)] Step 6: Setting up systemd service...${NC}"
echo -e "${YELLOW}Explanation: This will create a systemd service to start the dashboard automatically when the system boots and keep it running.${NC}"

if whiptail --title "Systemd Service" --yesno \
"Would you like to set up the dashboard as a systemd service?
This will:
  • Create /etc/systemd/system/dashboard.service
  • Start the dashboard on system boot
  • Enable automatic restarts if the process crashes

Recommended: Yes" 14 70; then

    BUN_PATH=$(which bun || echo "/usr/local/bin/bun")
    if [ ! -f "$BUN_PATH" ]; then
        BUN_PATH="$HOME/.bun/bin/bun"
    fi

    cat > /etc/systemd/system/dashboard.service <<EOF
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
EOF

    systemctl daemon-reload
    systemctl enable dashboard.service
    echo -e "${GREEN}✓ Systemd service created and enabled.${NC}"

    # --- Step 7: Start server ---
    echo -e "\n${BLUE}[$(date)] Step 7: Starting server...${NC}"
    systemctl start dashboard.service || {
        echo -e "${RED}Failed to start dashboard service. Check 'systemctl status dashboard' for details.${NC}"
    }

    # Wait for server to start
    sleep 2
    if systemctl is-active --quiet dashboard.service; then
        echo -e "${GREEN}✓ Dashboard server is running.${NC}"
    else
        echo -e "${RED}Server may not have started. Check: systemctl status dashboard${NC}"
    fi
else
    echo -e "${YELLOW}Skipping systemd setup. Run manually: bun run ${INSTALL_DIR}/server/index.ts${NC}"
fi

# --- Done ---
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}')

echo -e "  ${BLUE}Dashboard URL:${NC}  http://$IP_ADDR:3000"
echo -e "  ${BLUE}Install dir:${NC}   $INSTALL_DIR"
echo -e "  ${BLUE}Config file:${NC}   $CONFIG_FILE"
echo -e "  ${BLUE}Log file:${NC}      $LOG_FILE"
echo ""

if systemctl is-active --quiet dashboard.service 2>/dev/null; then
    echo -e "  ${GREEN}✓ Service is running (dashboard.service)${NC}"
    echo -e "  ${BLUE}  Status:${NC} systemctl status dashboard"
    echo -e "  ${BLUE}  Logs:${NC}   journalctl -u dashboard -f"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Open the Dashboard URL in a browser"
echo -e "  2. Click the gear icon (⚙) to configure modules"
echo -e "  3. Add your services, set up weather, configure FlightRadar"
echo -e "  4. For LLM summaries, ensure Ollama is running"
echo ""
echo -e "${BLUE}Setup completed at $(date)${NC}"
