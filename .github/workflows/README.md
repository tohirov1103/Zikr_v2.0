# GitHub Actions Workflows

## Available Workflows

### 🚀 Deploy to Production (`deploy.yml`)

Automatically deploys your application to production server when code is pushed to `main` branch.

**Triggers:**
- Push to `main` branch
- Manual trigger (workflow_dispatch)

**What it does:**
1. Builds your NestJS application on GitHub's servers (saves your server resources!)
2. Runs tests (optional)
3. Creates deployment package (dist + node_modules + prisma)
4. Transfers to your server via SSH
5. Backs up current deployment
6. Backs up database automatically
7. Runs Prisma migrations
8. Restarts application with PM2
9. Runs health check
10. Runs performance monitoring
11. Auto-rollback if health check fails

**Required GitHub Secrets:**
- `SERVER_HOST` - Your server IP or domain
- `SERVER_USER` - SSH username
- `SERVER_PORT` - SSH port (usually 22)
- `SERVER_SSH_KEY` - Private SSH key
- `DEPLOY_PATH` - Deployment directory (`/var/www/zikr-api`)
- `APP_PORT` - Application port (1111)

**Duration:** ~2-3 minutes

**Logs:** https://github.com/tohirov1103/Zikr_v2.0/actions

---

## Manual Deployment

1. Go to: https://github.com/tohirov1103/Zikr_v2.0/actions
2. Click "Deploy to Production"
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow" button

---

## Workflow Features

### ✅ Zero-Downtime Deployment
- PM2 reload instead of restart
- Health check before marking deployment successful
- Automatic rollback if health check fails

### 💾 Automatic Backups
- Database backup before every deployment
- Application backup before deployment
- Keeps last 5 deployment backups
- Keeps database backups for 7 days

### 📊 Performance Monitoring
- Memory usage tracking
- CPU usage tracking
- API response time testing
- WebSocket connection monitoring
- Database connection verification
- Disk space monitoring
- Error rate tracking

### 🔒 Security
- SSH key authentication
- Secrets encrypted in GitHub
- No sensitive data in logs
- Secure file transfer

### 🔄 Rollback Support
- Automatic rollback on health check failure
- Manual rollback via Git revert
- Backup restoration

---

## Monitoring Deployment

**GitHub Actions UI:**
- Real-time logs
- Step-by-step progress
- Success/failure notifications
- Deployment duration tracking

**On Server:**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs zikr-api

# Monitor performance
bash /var/www/zikr-api/scripts/monitor.sh
```

---

## Troubleshooting

**Deployment failed?**
1. Check workflow logs in GitHub Actions
2. Verify all GitHub Secrets are set correctly
3. Test SSH connection manually
4. Check server logs: `pm2 logs zikr-api`

**Need to rollback?**
```bash
# Option 1: Git revert (triggers new deployment)
git revert HEAD
git push origin main

# Option 2: Manual rollback on server
ssh user@server
cd /var/www/zikr-api
tar -xzf /var/backups/zikr-api/backup_TIMESTAMP.tar.gz
pm2 restart zikr-api
```

---

## Documentation

- **Quick Start:** [QUICK-START.md](../../QUICK-START.md)
- **Full Guide:** [DEPLOYMENT.md](../../DEPLOYMENT.md)
- **GitHub Repo:** https://github.com/tohirov1103/Zikr_v2.0

---

## Workflow Status Badge

Add to your README.md:

```markdown
[![Deploy to Production](https://github.com/tohirov1103/Zikr_v2.0/actions/workflows/deploy.yml/badge.svg)](https://github.com/tohirov1103/Zikr_v2.0/actions/workflows/deploy.yml)
```
