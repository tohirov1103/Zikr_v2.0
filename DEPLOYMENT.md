# Zikr API - GitHub Actions CI/CD Deployment Guide

Complete guide for deploying Zikr_v2.0 API to your server using GitHub Actions with automated database backups and performance monitoring.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [GitHub Setup](#github-setup)
4. [First Deployment](#first-deployment)
5. [Deployment Workflow](#deployment-workflow)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Local Machine
- Git installed
- GitHub account with repository: https://github.com/tohirov1103/Zikr_v2.0.git

### Server Requirements
- **OS:** Ubuntu 20.04+ / Debian 10+ (Linux)
- **RAM:** 1GB minimum
- **CPU:** 1 core minimum
- **Disk:** 20GB minimum
- **SSH Access:** Root or sudo user
- **Open Ports:** 1111 (API), 22 (SSH)

---

## Server Setup

### Step 1: Connect to Your Server

```bash
ssh your-username@your-server-ip
```

### Step 2: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install additional tools
sudo apt install -y git curl jq bc
```

### Step 3: Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE zikr_db;
CREATE USER zikr_user WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE zikr_db TO zikr_user;
\q
```

### Step 4: Create Deployment User (Optional but Recommended)

```bash
# Create user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

### Step 5: Setup Deployment Directory

```bash
# Create deployment directory
sudo mkdir -p /var/www/zikr-api
sudo chown -R $USER:$USER /var/www/zikr-api

# Create log directories
sudo mkdir -p /var/log/zikr-api
sudo chown -R $USER:$USER /var/log/zikr-api

# Create backup directory
sudo mkdir -p /var/backups/zikr-api/database
sudo chown -R $USER:$USER /var/backups/zikr-api
```

### Step 6: Setup Environment Variables on Server

```bash
# Create .env file
nano /var/www/zikr-api/.env
```

Add your environment variables:

```env
# APP
PORT=1111
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRATION=10d

# DATABASE (update with your credentials)
DATABASE_URL=postgresql://zikr_user:your-strong-password@localhost:5432/zikr_db?schema=public

# R2_CLOUDFLARE (optional)
R2_BUCKET=
R2_ENDPOINT=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_PUBLIC_URL=

# SWAGGER
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=your-swagger-password

# MAIL (optional)
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=

# WebSocket Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
SOCKET_ADMIN_USER=admin
SOCKET_ADMIN_PASS=your-socket-admin-password
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 7: Setup SSH Key for GitHub Actions

```bash
# On your LOCAL machine (not server)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# This creates two files:
# ~/.ssh/github_deploy_key (private key - for GitHub Secrets)
# ~/.ssh/github_deploy_key.pub (public key - for server)

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_deploy_key.pub your-username@your-server-ip

# OR manually:
cat ~/.ssh/github_deploy_key.pub
# Copy the output and add to server's ~/.ssh/authorized_keys
```

### Step 8: Test SSH Connection

```bash
# From local machine
ssh -i ~/.ssh/github_deploy_key your-username@your-server-ip

# If successful, you're connected!
```

---

## GitHub Setup

### Step 1: Add Repository Secrets

Go to your GitHub repository:
https://github.com/tohirov1103/Zikr_v2.0/settings/secrets/actions

Click **"New repository secret"** and add the following:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SERVER_HOST` | Your server IP or domain | e.g., `203.0.113.42` or `api.yoursite.com` |
| `SERVER_USER` | SSH username | e.g., `deploy` or `ubuntu` or `root` |
| `SERVER_PORT` | SSH port | Usually `22` |
| `SERVER_SSH_KEY` | Private key content | Content of `~/.ssh/github_deploy_key` (entire file) |
| `DEPLOY_PATH` | Deployment directory | `/var/www/zikr-api` |
| `APP_PORT` | Application port | `1111` |

#### How to Get Private Key Content:

```bash
# On your LOCAL machine
cat ~/.ssh/github_deploy_key

# Copy EVERYTHING including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... (all the content) ...
# -----END OPENSSH PRIVATE KEY-----
```

### Step 2: Verify Repository Settings

Ensure you have:
- ✅ Actions enabled (Settings → Actions → General → Allow all actions)
- ✅ Read and write permissions (Settings → Actions → General → Workflow permissions)

---

## First Deployment

### Step 1: Make Scripts Executable

On your **LOCAL machine**:

```bash
cd /home/hikmatillo/Documents/Hikmatillo/projects/Zikr_v2.0

chmod +x scripts/backup-db.sh
chmod +x scripts/monitor.sh
```

### Step 2: Initial Setup on Server (One-time)

```bash
# SSH to server
ssh your-username@your-server-ip

# Go to deployment directory
cd /var/www/zikr-api

# Create scripts directory
mkdir -p scripts
```

### Step 3: Copy Scripts to Server (First Time Only)

From your **LOCAL machine**:

```bash
scp scripts/backup-db.sh your-username@your-server-ip:/var/www/zikr-api/scripts/
scp scripts/monitor.sh your-username@your-server-ip:/var/www/zikr-api/scripts/
scp ecosystem.config.js your-username@your-server-ip:/var/www/zikr-api/

# Make scripts executable on server
ssh your-username@your-server-ip "chmod +x /var/www/zikr-api/scripts/*.sh"
```

### Step 4: Push Code to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "feat: add GitHub Actions CI/CD deployment"

# Push to main branch (this triggers deployment!)
git push origin main
```

### Step 5: Monitor Deployment

1. Go to: https://github.com/tohirov1103/Zikr_v2.0/actions
2. Click on the running workflow
3. Watch the deployment progress in real-time

### Step 6: Verify Deployment

```bash
# Check if PM2 process is running
ssh your-username@your-server-ip "pm2 status"

# Check health endpoint
curl http://your-server-ip:1111/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-09T...","uptime":123.45,"environment":"production"}
```

---

## Deployment Workflow

### Automatic Deployment

Every time you push to `main` branch, GitHub Actions will:

1. ✅ Install dependencies on GitHub's servers
2. ✅ Build TypeScript → JavaScript
3. ✅ Run tests (if available)
4. ✅ Create deployment package
5. ✅ **Backup database** (automatic)
6. ✅ Transfer files to server
7. ✅ Run Prisma migrations
8. ✅ Restart application with PM2
9. ✅ Run health check
10. ✅ **Run performance monitoring**
11. ✅ Rollback if health check fails

### Manual Deployment

You can also trigger deployment manually:

1. Go to: https://github.com/tohirov1103/Zikr_v2.0/actions
2. Click **"Deploy to Production"** workflow
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

### Deployment Time

Typical deployment takes **2-3 minutes**:
- Build: ~45 seconds
- Transfer: ~20 seconds
- Deploy: ~10 seconds
- Health check: ~5 seconds

---

## Monitoring & Maintenance

### Check Application Status

```bash
# PM2 status
pm2 status

# Detailed info
pm2 describe zikr-api

# View logs
pm2 logs zikr-api

# Last 50 lines
pm2 logs zikr-api --lines 50

# Monitor in real-time
pm2 monit
```

### Run Performance Monitoring Manually

```bash
ssh your-username@your-server-ip
cd /var/www/zikr-api
bash scripts/monitor.sh
```

**Output includes:**
- PM2 process status
- Memory usage (app & system)
- CPU usage
- Health check results
- API response times
- WebSocket connections
- Database connection status
- Disk space
- Recent errors
- Restart count

### Database Backups

**Automatic:** Backup runs before every deployment

**Manual backup:**
```bash
ssh your-username@your-server-ip
cd /var/www/zikr-api
bash scripts/backup-db.sh
```

**List backups:**
```bash
ls -lh /var/backups/zikr-api/database/
```

**Restore from backup:**
```bash
# List backups
ls /var/backups/zikr-api/database/

# Restore (replace TIMESTAMP with actual backup)
gunzip -c /var/backups/zikr-api/database/backup_zikr_db_TIMESTAMP.sql.gz | \
  psql -U zikr_user -d zikr_db
```

### PM2 Commands

```bash
# Restart app
pm2 restart zikr-api

# Stop app
pm2 stop zikr-api

# Start app
pm2 start zikr-api

# Reload (zero-downtime)
pm2 reload zikr-api

# Delete from PM2
pm2 delete zikr-api

# Save PM2 process list
pm2 save

# Resurrect saved processes on reboot
pm2 startup
```

### View Logs

```bash
# Application logs
tail -f /var/log/zikr-api/out.log
tail -f /var/log/zikr-api/error.log

# Monitoring logs
tail -f /var/log/zikr-api/monitor.log

# PM2 logs
pm2 logs zikr-api --lines 100
```

### Setup Auto-restart on Server Reboot

```bash
# Generate startup script
pm2 startup

# Copy and run the command it outputs (will look like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user

# Save current PM2 process list
pm2 save
```

### Clean Up Old Backups

Backups are automatically cleaned up after 7 days. To change retention:

Edit `/var/www/zikr-api/scripts/backup-db.sh`:
```bash
RETENTION_DAYS=14  # Keep for 14 days instead of 7
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check backup folder size
du -sh /var/backups/zikr-api

# Find large files
find /var/www/zikr-api -type f -size +100M
```

---

## Troubleshooting

### Deployment Failed

**Check GitHub Actions logs:**
1. Go to: https://github.com/tohirov1103/Zikr_v2.0/actions
2. Click on failed workflow
3. Review error messages

**Common issues:**

#### SSH Connection Failed
```bash
# Test SSH manually
ssh -i ~/.ssh/github_deploy_key your-username@your-server-ip

# Check if key is added to server
cat ~/.ssh/authorized_keys
```

#### Health Check Failed
```bash
# Check if app is running
pm2 status

# View error logs
pm2 logs zikr-api --err --lines 50

# Check database connection
psql -U zikr_user -d zikr_db -c "SELECT 1;"

# Check .env file
cat /var/www/zikr-api/.env
```

#### Database Migration Failed
```bash
# Run migrations manually
cd /var/www/zikr-api
npx prisma migrate deploy

# Check Prisma schema
npx prisma validate
```

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs zikr-api --err

# Try starting manually
cd /var/www/zikr-api
npm run start:prod

# Check if port is in use
sudo lsof -i :1111

# Kill process using port
sudo kill -9 <PID>
```

### High Memory Usage

```bash
# Check memory
free -h

# Check which process uses most memory
ps aux --sort=-%mem | head

# Restart app
pm2 restart zikr-api

# Adjust max memory in ecosystem.config.js:
max_memory_restart: '300M'  # Lower from 400M
```

### Rollback to Previous Version

**Automatic rollback:** If health check fails, workflow automatically rolls back.

**Manual rollback:**

```bash
ssh your-username@your-server-ip

# List backups
ls -lt /var/backups/zikr-api/ | head

# Restore previous deployment
cd /var/www/zikr-api
rm -rf dist node_modules prisma package*.json
tar -xzf /var/backups/zikr-api/backup_TIMESTAMP.tar.gz

# Restart
pm2 restart zikr-api
```

**Git rollback:**

```bash
# On local machine
git log --oneline  # Find commit to revert to

# Revert to previous commit
git revert HEAD

# Or reset to specific commit
git reset --hard <commit-hash>

# Push (triggers new deployment)
git push origin main
```

### Database Connection Error

```bash
# Test database connection
psql -U zikr_user -d zikr_db

# If fails, check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check DATABASE_URL in .env
cat /var/www/zikr-api/.env | grep DATABASE_URL
```

### Port Already in Use

```bash
# Find process on port 1111
sudo lsof -i :1111

# Kill process
sudo kill -9 <PID>

# Or change port in .env
nano /var/www/zikr-api/.env
# Update PORT=1112

# Restart app
pm2 restart zikr-api
```

### Script Permission Denied

```bash
# Make scripts executable
chmod +x /var/www/zikr-api/scripts/*.sh

# Or run with bash
bash /var/www/zikr-api/scripts/backup-db.sh
```

---

## Performance Optimization Tips

### 1. Enable PM2 Cluster Mode (if you upgrade server)

If you get more CPU cores:

```javascript
// ecosystem.config.js
instances: 2,  // Change from 1 to number of CPU cores
exec_mode: 'cluster',
```

### 2. Setup Nginx Reverse Proxy (Recommended)

```bash
# Install Nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/zikr-api
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:1111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/zikr-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Enable Gzip Compression

Add to Nginx config:
```nginx
gzip on;
gzip_types application/json;
```

### 4. Setup SSL Certificate (Free with Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## API Endpoints

After deployment, your API will be available at:

- **Base URL:** `http://your-server-ip:1111/api`
- **Health Check:** `http://your-server-ip:1111/api/health`
- **Detailed Health:** `http://your-server-ip:1111/api/health/detailed`
- **Swagger Docs:** `http://your-server-ip:1111/api/docs`
- **WebSocket:** `ws://your-server-ip:1111/zikr-app`

---

## Security Checklist

- [ ] Strong JWT secret
- [ ] Database password is strong
- [ ] SSH key authentication (not password)
- [ ] Firewall configured (only ports 22, 1111, 80, 443 open)
- [ ] Regular backups enabled
- [ ] .env file not committed to Git
- [ ] GitHub secrets properly configured
- [ ] Swagger protected with basic auth
- [ ] PostgreSQL only accessible from localhost
- [ ] Server OS regularly updated

---

## Support

**GitHub Repository:** https://github.com/tohirov1103/Zikr_v2.0

**Useful Links:**
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- GitHub Actions: https://docs.github.com/en/actions
- NestJS Deployment: https://docs.nestjs.com/faq/deployment
- Prisma Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

## Quick Reference

### Daily Operations

```bash
# Deploy new version
git add .
git commit -m "your message"
git push origin main

# Check status
pm2 status

# View logs
pm2 logs zikr-api

# Restart app
pm2 restart zikr-api

# Run monitoring
ssh user@server "bash /var/www/zikr-api/scripts/monitor.sh"
```

### Emergency Commands

```bash
# Stop app
pm2 stop zikr-api

# Hard restart PostgreSQL
sudo systemctl restart postgresql

# Clear PM2 logs
pm2 flush

# Free memory
sync; echo 3 | sudo tee /proc/sys/vm/drop_caches
```

---

**Congratulations! Your Zikr API is now deployed with automated CI/CD!** 🎉
