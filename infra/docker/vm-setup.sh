#!/usr/bin/env bash
# Run once on a fresh Ubuntu Vultr VM (2 vCPU / 4 GB).
# Usage: sudo bash infra/docker/vm-setup.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash infra/docker/vm-setup.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing Docker and Compose"
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

if id ubuntu &>/dev/null; then
  usermod -aG docker ubuntu
fi

echo "==> Enabling 4G swap (needed on 4GB RAM)"
if [[ ! -f /swapfile ]]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall: SSH + app ports (not Postgres/Redis)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 3001/tcp
ufw allow 3002/tcp
ufw allow 4000/tcp
ufw --force enable

echo
echo "VM ready. Next (from /opt/jersey):"
echo "  1. cp infra/docker/.env.production.example infra/docker/.env.production"
echo "  2. Set PUBLIC_IP and secrets in that file"
echo "  3. bash infra/docker/prod-up.sh"
echo "Build one image at a time on 4GB. First start can take 15–30 minutes."
