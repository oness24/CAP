#!/usr/bin/env bash
# ===========================================================
#  CAP_DASH — Server bootstrap script
#  Run this ONCE on a fresh Ubuntu/Debian VM to install
#  Docker + Docker Compose and deploy the app.
# ===========================================================
set -euo pipefail

echo "===== 1/6  Updating packages ====="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "===== 2/6  Installing Docker ====="
# Remove old versions if any
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

sudo apt-get install -y \
    ca-certificates curl gnupg lsb-release git

# Docker GPG key + repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker without sudo
sudo usermod -aG docker "$USER"

echo "===== 3/6  Verifying Docker ====="
sudo docker --version
sudo docker compose version

echo "===== 4/6  Cloning / updating CAP_DASH ====="
APP_DIR="$HOME/apps/capdash"
mkdir -p "$HOME/apps"

if [ -d "$APP_DIR" ]; then
    echo "Directory exists — pulling latest..."
    cd "$APP_DIR"
    git pull origin master
else
    echo "Cloning repo..."
    # OPTION A: clone from git (update the URL to your repo)
    # git clone https://github.com/YOUR_ORG/CAP_DASH.git "$APP_DIR"
    # OPTION B: if you copied files with scp, just cd
    echo "[!] Place the project files in $APP_DIR before continuing."
    echo "    Example: scp -r ./* contego@<VM_IP>:~/apps/capdash/"
    exit 0
fi

cd "$APP_DIR"

echo "===== 5/6  Building & starting containers ====="
sudo docker compose down --remove-orphans 2>/dev/null || true
sudo docker compose up --build -d

echo "===== 6/6  Checking health ====="
sleep 5
sudo docker compose ps
echo ""
echo "✅  CAP_DASH está rodando!"
echo "   Frontend: http://<VM_IP>"
echo "   Backend:  http://<VM_IP>/api/v1"
echo "   Docs:     http://<VM_IP>/docs"
