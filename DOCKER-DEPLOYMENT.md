# Docker Deployment Guide for Zikr API

This guide provides complete instructions for deploying the Zikr API application using Docker to the production server.

## Server Information
- **Server IP**: 68.183.178.214
- **User**: hikmatulloh
- **Domain**: zikr.uzyol.uz
- **Application Port**: 4000
- **Database**: PostgreSQL (in Docker container)

## Prerequisites

### On Your Local Machine
- SSH access to the server (hikmatulloh@68.183.178.214)
- Git (for cloning the repository)

### On the Server
- Docker Engine (v20.10 or higher)
- Docker Compose (v2.0 or higher)
- Nginx (for reverse proxy)
- SSL certificates (already configured at /etc/ssl/admin/)

## Initial Server Setup

### 1. Connect to Server
```bash
ssh hikmatulloh@68.183.178.214
```

### 2. Install Docker
```bash
# Update package index
sudo apt update

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 3. Install Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx
```

### 4. Configure Nginx
```bash
# Copy nginx configuration to server
sudo cp nginx.conf /etc/nginx/sites-available/zikr.uzyol.uz

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/zikr.uzyol.uz /etc/nginx/sites-enabled/

# Remove default configuration if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Verify SSL certificates exist
ls -la /etc/ssl/admin/cert.pem
ls -la /etc/ssl/admin/key.pem

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**Note**: Make sure your SSL certificates for zikr.uzyol.uz are placed at:
- Certificate: `/etc/ssl/admin/cert.pem`
- Private Key: `/etc/ssl/admin/key.pem`

If your certificates are for zikr.uzyol.uz and located elsewhere, update the paths in the nginx.conf file accordingly.

### 5. Configure Firewall
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

## Deployment

### Method 1: Using Deployment Script (Recommended)

1. **On your local machine**, navigate to the project directory:
```bash
cd /path/to/Zikr_v2.0
```

2. **Create and configure** `.env.production` file:
```bash
cp .env.example .env.production
nano .env.production
```

Update the following variables:
```env
# Database
DB_PASSWORD=your_secure_database_password

# JWT
JWT_SECRET=your_very_secure_jwt_secret_min_32_chars
JWT_EXPIRATION=7d

# Cloudflare R2 (if using)
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_PUBLIC_URL=https://your-public-url.r2.dev

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-email-app-password

# Swagger
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=your_secure_password
```

3. **Make deployment script executable**:
```bash
chmod +x deploy.sh
```

4. **Run deployment**:
```bash
./deploy.sh
```

The script will:
- Create a deployment package
- Upload it to the server
- Extract and deploy the application
- Run database migrations
- Start Docker containers
- Perform health checks
- Rollback automatically if deployment fails

### Method 2: Manual Deployment

1. **On the server**, create project directory:
```bash
mkdir -p /home/hikmatulloh/zikr-api
cd /home/hikmatulloh/zikr-api
```

2. **Clone or upload the repository**:
```bash
# Option 1: Clone from Git
git clone <your-repository-url> .

# Option 2: Upload via SCP from local machine
scp -r /path/to/Zikr_v2.0/* hikmatulloh@68.183.178.214:/home/hikmatulloh/zikr-api/
```

3. **Create `.env` file**:
```bash
nano .env
```
Copy contents from `.env.production` template and update values.

4. **Build and start containers**:
```bash
# Build and start in detached mode
docker compose up -d --build

# View logs
docker compose logs -f

# Check container status
docker compose ps
```

5. **Run database migrations**:
```bash
docker compose exec app npx prisma migrate deploy
```

## Post-Deployment

### 1. Verify Application
```bash
# Check if containers are running
docker compose ps

# Check application health
curl http://localhost:4000/api/health

# Check via domain
curl https://zikr.uzyol.uz/api/health
```

### 2. View Logs
```bash
# All logs
docker compose logs

# Application logs only
docker compose logs app

# Follow logs in real-time
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100 app
```

### 3. Access Swagger Documentation
Visit: https://zikr.uzyol.uz/api/docs
- Username: (from SWAGGER_USERNAME)
- Password: (from SWAGGER_PASSWORD)

## Management Commands

### Start/Stop Application
```bash
# Stop containers
docker compose down

# Start containers
docker compose up -d

# Restart containers
docker compose restart

# Rebuild and restart
docker compose up -d --build
```

### Database Management
```bash
# Access PostgreSQL
docker compose exec postgres psql -U zikr -d zikr_db

# Backup database
docker compose exec postgres pg_dump -U zikr zikr_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker compose exec -T postgres psql -U zikr -d zikr_db < backup_file.sql

# Run migrations
docker compose exec app npx prisma migrate deploy

# Generate Prisma client
docker compose exec app npx prisma generate
```

### Application Management
```bash
# View application logs
docker compose logs app

# Execute commands in app container
docker compose exec app sh

# Restart only the app
docker compose restart app

# Update application
git pull
docker compose up -d --build
```

### System Monitoring
```bash
# Check resource usage
docker stats

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Troubleshooting

### Application Won't Start
1. Check logs:
```bash
docker compose logs app
```

2. Verify environment variables:
```bash
docker compose exec app env
```

3. Check database connection:
```bash
docker compose exec postgres pg_isready -U zikr
```

### Database Connection Issues
1. Verify database is running:
```bash
docker compose ps postgres
```

2. Check DATABASE_URL in .env file
3. Ensure DATABASE_URL uses `postgres` as hostname (container name)

### Port Already in Use
```bash
# Check what's using port 4000
sudo lsof -i :4000

# Kill the process if needed
sudo kill -9 <PID>
```

### SSL Certificate Issues
```bash
# Check certificate files exist and are readable
ls -la /etc/ssl/admin/cert.pem
ls -la /etc/ssl/admin/key.pem

# Check certificate expiration
openssl x509 -in /etc/ssl/admin/cert.pem -noout -dates

# Verify certificate is for correct domain
openssl x509 -in /etc/ssl/admin/cert.pem -noout -text | grep "DNS:"
```

### Memory/Performance Issues
```bash
# Check system resources
free -h
df -h

# Monitor Docker resources
docker stats

# Restart containers to free memory
docker compose restart
```

## Backup Strategy

### Automated Backups
Create a cron job for daily backups:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /home/hikmatulloh/zikr-api && docker compose exec -T postgres pg_dump -U zikr zikr_db > /home/hikmatulloh/backups/db_backup_$(date +\%Y\%m\%d).sql
```

### Manual Backup
```bash
# Create backup directory
mkdir -p /home/hikmatulloh/backups

# Backup database
docker compose exec postgres pg_dump -U zikr zikr_db > /home/hikmatulloh/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Backup application data and .env
tar -czf /home/hikmatulloh/backups/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz .env docker-compose.yml
```

## Security Recommendations

1. **Change Default Passwords**: Update all passwords in `.env` file
2. **Firewall**: Keep firewall enabled with minimal open ports
3. **SSL**: Keep SSL certificates updated (Certbot auto-renewal)
4. **Regular Updates**: Keep Docker and system packages updated
5. **Monitoring**: Set up monitoring and alerts
6. **Backups**: Maintain regular database and application backups
7. **Secrets**: Never commit `.env` file to version control

## Updates and Maintenance

### Update Application
```bash
# On server
cd /home/hikmatulloh/zikr-api

# Pull latest changes (if using Git)
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Run migrations if needed
docker compose exec app npx prisma migrate deploy
```

### Update Dependencies
```bash
# Rebuild without cache
docker compose build --no-cache

# Restart containers
docker compose up -d
```

## Support

For issues or questions:
- Check application logs: `docker compose logs app`
- Check nginx logs: `sudo tail -f /var/log/nginx/zikr.uzyol.uz.error.log`
- Review Docker logs: `docker compose logs`

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Application port | No | 4000 |
| DB_USER | Database username | No | zikr |
| DB_PASSWORD | Database password | Yes | - |
| DB_NAME | Database name | No | zikr_db |
| DATABASE_URL | Full database connection URL | Yes | - |
| JWT_SECRET | Secret for JWT tokens | Yes | - |
| JWT_EXPIRATION | JWT expiration time | No | 7d |
| R2_BUCKET | Cloudflare R2 bucket name | Yes | - |
| R2_ENDPOINT | R2 endpoint URL | Yes | - |
| R2_ACCESS_KEY | R2 access key | Yes | - |
| R2_SECRET_KEY | R2 secret key | Yes | - |
| R2_PUBLIC_URL | Public URL for R2 files | Yes | - |
| SWAGGER_USERNAME | Swagger UI username | No | admin |
| SWAGGER_PASSWORD | Swagger UI password | Yes | - |
| MAIL_HOST | SMTP host | Yes | - |
| MAIL_PORT | SMTP port | No | 587 |
| MAIL_USER | SMTP username | Yes | - |
| MAIL_PASS | SMTP password | Yes | - |
| ALLOWED_ORIGINS | CORS allowed origins | Yes | - |
| SOCKET_ADMIN_USER | Socket.IO admin user | No | admin |
| SOCKET_ADMIN_PASS | Socket.IO admin password | Yes | - |

## Quick Reference

```bash
# Deploy from local machine
./deploy.sh

# View logs on server
docker compose logs -f app

# Restart application
docker compose restart app

# Backup database
docker compose exec postgres pg_dump -U zikr zikr_db > backup.sql

# Update application
git pull && docker compose up -d --build

# Check health
curl https://zikr.uzyol.uz/api/health
```
