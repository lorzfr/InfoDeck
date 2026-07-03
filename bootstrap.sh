#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/lorzfr/InfoDeck.git"
INSTALL_DIR="/opt/dashboard-server"

echo "=== InfoDeck Dashboard Server ==="

if ! command -v git &>/dev/null; then
  echo "Installing git..."
  apt-get update -qq && apt-get install -y -qq git
fi

if [ ! -d "$INSTALL_DIR" ]; then
  echo "Cloning repository..."
  git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
else
  echo "Updating repository..."
  cd "$INSTALL_DIR" && git pull
fi

echo "Starting interactive installer..."
exec bash "$INSTALL_DIR/setup.sh"
