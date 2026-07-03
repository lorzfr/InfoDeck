#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/lorzfr/InfoDeck.git"
INSTALL_DIR="/opt/dashboard-server"

echo "=== InfoDeck Bootstrap ==="

if ! command -v git &>/dev/null; then
    echo "Installing git..."
    apt-get update -qq && apt-get install -y -qq git
fi

echo "Cloning repository..."
git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"

echo "Running setup script..."
exec bash "$INSTALL_DIR/setup.sh"
