# Quick Setup Guide for Zikr API Docker Deployment

## Prerequisites
Your server already has:
- ✅ SSL certificates at `/etc/ssl/admin/cert.pem` and `/etc/ssl/admin/key.pem`
- ✅ Nginx configured for api.uzyol.uz

## What You Need to Do

### 1. Prepare Environment File (Local Machine)
```bash
# Edit .env.production with your actual credentials
nano .env.production
```

**Required variables to update:**
- `DB_PASSWORD` - Choose a secure database password
- `JWT_SECRET` - Generate a secure secret (min 32 chars)
- `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_PUBLIC_URL` - Your Cloudflare R2 credentials
- `MAIL_USER`, `MAIL_PASS` - Your email SMTP credentials
- `SWAGGER_PASSWORD` - Password for API documentation access

### 2. Deploy to Server
```bash
# From your local machine, in the project directory
./deploy.sh
```

That's it! The script will:
- Create deployment package
- Upload to server
- Extract and setup Docker containers
- Run database migrations
- Start the application
- Verify it's running

### 3. Configure Nginx on Server
SSH to your server and add the new site:

```bash
ssh hikmatulloh@68.183.178.214

# Copy the nginx configuration
sudo nano /etc/nginx/sites-available/zikr.uzyol.uz
# Paste the contents from the nginx.conf file

# Enable the site
sudo ln -s /etc/nginx/sites-available/zikr.uzyol.uz /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

**Important**: Make sure you have SSL certificates for zikr.uzyol.uz at:
- `/etc/ssl/admin/cert.pem`
- `/etc/ssl/admin/key.pem`

If your zikr.uzyol.uz certificates are in a different location, update the paths in nginx.conf before copying.

### 4. Verify Deployment
```bash
# Check if it's running
curl https://zikr.uzyol.uz/api/health

# Access API documentation
# Visit: https://zikr.uzyol.uz/api/docs
```

## Server Requirements
If Docker is not installed on your server, run these commands first:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt update
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## After Deployment

### View Logs
```bash
ssh hikmatulloh@68.183.178.214
cd /home/hikmatulloh/zikr-api
docker compose logs -f app
```

### Restart Application
```bash
docker compose restart app
```

### Stop/Start
```bash
# Stop
docker compose down

# Start
docker compose up -d
```

### Database Backup
```bash
docker compose exec postgres pg_dump -U zikr zikr_db > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Port 4000 Already in Use
```bash
# Check what's using the port
sudo lsof -i :4000
# Kill it if needed
sudo kill -9 <PID>
```

### Database Connection Failed
Check your DATABASE_URL in .env.production uses `postgres` as hostname:
```
DATABASE_URL=postgresql://zikr:password@postgres:5432/zikr_db?schema=public
```

### Container Won't Start
```bash
# View logs
docker compose logs app

# Check container status
docker compose ps
```

## Files Overview

- **Dockerfile** - Container image definition
- **docker-compose.yml** - Multi-container orchestration
- **.env.production** - Production environment variables (EDIT THIS!)
- **deploy.sh** - Automated deployment script
- **nginx.conf** - Nginx reverse proxy configuration
- **DOCKER-DEPLOYMENT.md** - Detailed deployment guide

## Quick Commands

```bash
# Deploy from local machine
./deploy.sh

# SSH to server
ssh hikmatulloh@68.183.178.214

# View app logs
docker compose logs -f app

# Restart app
docker compose restart app

# Check health
curl https://zikr.uzyol.uz/api/health

# Backup database
docker compose exec postgres pg_dump -U zikr zikr_db > backup.sql
```

## Support

For detailed instructions, see [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md)
