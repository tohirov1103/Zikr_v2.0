# Quick Start - GitHub Actions Deployment

Fast setup guide for deploying Zikr API with GitHub Actions CI/CD.

---

## 🚀 5-Minute Setup

### 1. On Your Server

```bash
# Install requirements
sudo apt update && sudo apt install -y nodejs npm postgresql pm2

# Create directories
sudo mkdir -p /var/www/zikr-api /var/log/zikr-api /var/backups/zikr-api
sudo chown -R $USER:$USER /var/www/zikr-api /var/log/zikr-api /var/backups/zikr-api

# Create database
sudo -u postgres psql -c "CREATE DATABASE zikr_db;"
sudo -u postgres psql -c "CREATE USER zikr_user WITH ENCRYPTED PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE zikr_db TO zikr_user;"

# Create .env
nano /var/www/zikr-api/.env
# Add: DATABASE_URL, JWT_SECRET, PORT=1111, etc.
```

### 2. On Your Local Machine

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy_key

# Copy to server
ssh-copy-id -i ~/.ssh/github_deploy_key.pub your-user@your-server-ip

# Get private key (for GitHub Secrets)
cat ~/.ssh/github_deploy_key
```

### 3. On GitHub

Go to: `https://github.com/tohirov1103/Zikr_v2.0/settings/secrets/actions`

Add these secrets:

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Your server IP |
| `SERVER_USER` | SSH username |
| `SERVER_PORT` | `22` |
| `SERVER_SSH_KEY` | Content of `~/.ssh/github_deploy_key` |
| `DEPLOY_PATH` | `/var/www/zikr-api` |
| `APP_PORT` | `1111` |

### 4. Deploy!

```bash
git add .
git commit -m "feat: setup CI/CD"
git push origin main
```

Watch deployment: `https://github.com/tohirov1103/Zikr_v2.0/actions`

---

## ✅ Verify Deployment

```bash
# Check health
curl http://your-server-ip:1111/api/health

# Check PM2
ssh your-user@your-server-ip "pm2 status"

# View logs
ssh your-user@your-server-ip "pm2 logs zikr-api --lines 20"
```

---

## 📋 Common Commands

```bash
# Deploy
git push origin main

# Check status
ssh user@server "pm2 status"

# Restart app
ssh user@server "pm2 restart zikr-api"

# View logs
ssh user@server "pm2 logs zikr-api"

# Run monitoring
ssh user@server "bash /var/www/zikr-api/scripts/monitor.sh"

# Backup database
ssh user@server "bash /var/www/zikr-api/scripts/backup-db.sh"
```

---

## 🔗 Endpoints

- API: `http://your-server-ip:1111/api`
- Health: `http://your-server-ip:1111/api/health`
- Docs: `http://your-server-ip:1111/api/docs`
- WebSocket: `ws://your-server-ip:1111/zikr-app`

---

## 📚 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

---

## 🆘 Quick Troubleshooting

**Deployment fails?**
- Check GitHub Actions logs: https://github.com/tohirov1103/Zikr_v2.0/actions
- Verify GitHub Secrets are correct
- Test SSH: `ssh -i ~/.ssh/github_deploy_key user@server`

**App not starting?**
```bash
ssh user@server
cd /var/www/zikr-api
pm2 logs zikr-api --err --lines 50
```

**Database error?**
```bash
# Test connection
psql -U zikr_user -d zikr_db

# Check .env
cat /var/www/zikr-api/.env | grep DATABASE_URL
```

**Port in use?**
```bash
sudo lsof -i :1111
sudo kill -9 <PID>
pm2 restart zikr-api
```

---

Need help? Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions!
