#!/bin/bash

# Server Setup Script for Zikr API
# Run this script on your server to set up the environment

set -e

echo "🚀 Setting up Zikr API Server..."
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Warning: Running as root. Consider creating a deploy user.${NC}"
fi

# Update system
echo -e "\n${BLUE}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo -e "\n${BLUE}📦 Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo -e "${GREEN}✅ Node.js already installed: $(node --version)${NC}"
fi

# Install PM2
echo -e "\n${BLUE}📦 Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
else
  echo -e "${GREEN}✅ PM2 already installed: $(pm2 --version)${NC}"
fi

# Install PostgreSQL
echo -e "\n${BLUE}📦 Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  sudo apt install -y postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
else
  echo -e "${GREEN}✅ PostgreSQL already installed${NC}"
fi

# Install additional tools
echo -e "\n${BLUE}📦 Installing additional tools...${NC}"
sudo apt install -y git curl jq bc

# Create directories
echo -e "\n${BLUE}📁 Creating directories...${NC}"
sudo mkdir -p /var/www/zikr-api
sudo mkdir -p /var/log/zikr-api
sudo mkdir -p /var/backups/zikr-api/database

# Set permissions
sudo chown -R $USER:$USER /var/www/zikr-api
sudo chown -R $USER:$USER /var/log/zikr-api
sudo chown -R $USER:$USER /var/backups/zikr-api

echo -e "${GREEN}✅ Directories created${NC}"

# Setup database
echo -e "\n${BLUE}🗄️  Setting up database...${NC}"
echo -e "${YELLOW}Please provide database credentials:${NC}"
read -p "Database name (default: zikr_db): " DB_NAME
DB_NAME=${DB_NAME:-zikr_db}

read -p "Database user (default: zikr_user): " DB_USER
DB_USER=${DB_USER:-zikr_user}

read -sp "Database password: " DB_PASS
echo

# Create database
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo -e "${GREEN}✅ Database setup complete${NC}"

# Create .env file
echo -e "\n${BLUE}📝 Creating .env file...${NC}"
cat > /var/www/zikr-api/.env << EOF
# APP
PORT=1111
NODE_ENV=production

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=10d

# DATABASE
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public

# R2_CLOUDFLARE (optional - configure later)
R2_BUCKET=
R2_ENDPOINT=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_PUBLIC_URL=

# SWAGGER
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=$(openssl rand -base64 16)

# MAIL (optional - configure later)
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=

# WebSocket Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
SOCKET_ADMIN_USER=admin
SOCKET_ADMIN_PASS=$(openssl rand -base64 16)
EOF

echo -e "${GREEN}✅ .env file created${NC}"

# Setup PM2 startup
echo -e "\n${BLUE}🔄 Setting up PM2 startup...${NC}"
pm2 startup | tail -n 1 | sudo bash
pm2 save

echo -e "${GREEN}✅ PM2 startup configured${NC}"

# Setup firewall (optional)
read -p "Configure firewall (UFW)? (y/n): " SETUP_FIREWALL
if [ "$SETUP_FIREWALL" = "y" ]; then
  echo -e "\n${BLUE}🔒 Configuring firewall...${NC}"
  sudo ufw allow 22/tcp
  sudo ufw allow 1111/tcp
  sudo ufw --force enable
  echo -e "${GREEN}✅ Firewall configured${NC}"
fi

# Print summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Server setup complete!${NC}"
echo -e "${GREEN}================================${NC}"

echo -e "\n${BLUE}📋 Summary:${NC}"
echo "- Node.js: $(node --version)"
echo "- npm: $(npm --version)"
echo "- PM2: $(pm2 --version)"
echo "- PostgreSQL: Installed and running"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"
echo ""
echo "📁 Directories:"
echo "- App: /var/www/zikr-api"
echo "- Logs: /var/log/zikr-api"
echo "- Backups: /var/backups/zikr-api"
echo ""
echo "🔑 Generated credentials saved in: /var/www/zikr-api/.env"

echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo "1. Setup SSH key for GitHub Actions deployment"
echo "2. Add GitHub Secrets to your repository"
echo "3. Push code to trigger deployment"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"

echo -e "\n${GREEN}🎉 Server is ready for deployment!${NC}"
