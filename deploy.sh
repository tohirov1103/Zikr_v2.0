#!/bin/bash

# Zikr API Deployment Script
# This script deploys the application to the production server using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="hikmatulloh"
SERVER_HOST="68.183.178.214"
SERVER_PATH="/home/hikmatulloh/zikr-api"
LOCAL_ENV_FILE=".env.production"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Zikr API Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env.production exists
if [ ! -f "$LOCAL_ENV_FILE" ]; then
    echo -e "${RED}Error: $LOCAL_ENV_FILE not found!${NC}"
    echo -e "${YELLOW}Please create $LOCAL_ENV_FILE with your production environment variables.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 1: Creating deployment package...${NC}"
# Create a temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "Temporary directory: $TEMP_DIR"

# Copy necessary files
cp -r . "$TEMP_DIR/zikr-api"
cd "$TEMP_DIR/zikr-api"

# Clean up unnecessary files
rm -rf node_modules dist .git coverage .github

# Create tarball
tar -czf ../zikr-api.tar.gz .
cd ..

echo -e "${GREEN}✓ Deployment package created${NC}"

echo -e "\n${YELLOW}Step 2: Uploading to server...${NC}"
# Upload the tarball to server
scp zikr-api.tar.gz ${SERVER_USER}@${SERVER_HOST}:/tmp/

echo -e "${GREEN}✓ Files uploaded${NC}"

echo -e "\n${YELLOW}Step 3: Deploying on server...${NC}"
# SSH into server and deploy
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e

SERVER_PATH="/home/hikmatulloh/zikr-api"
BACKUP_PATH="/home/hikmatulloh/zikr-api-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Creating directories..."
mkdir -p $SERVER_PATH
mkdir -p $BACKUP_PATH

# Backup current deployment if it exists
if [ -d "$SERVER_PATH" ] && [ "$(ls -A $SERVER_PATH)" ]; then
    echo "Backing up current deployment..."
    tar -czf $BACKUP_PATH/backup_$TIMESTAMP.tar.gz -C $SERVER_PATH . 2>/dev/null || true

    # Keep only last 5 backups
    cd $BACKUP_PATH
    ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
fi

# Extract new deployment
echo "Extracting new deployment..."
cd $SERVER_PATH
rm -rf * .dockerignore .env .gitignore 2>/dev/null || true
tar -xzf /tmp/zikr-api.tar.gz
rm /tmp/zikr-api.tar.gz

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

# Build and start containers
echo "Building and starting Docker containers..."
docker-compose up -d --build || docker compose up -d --build

# Wait for application to start
echo "Waiting for application to start..."
sleep 10

# Health check
echo "Running health check..."
for i in {1..30}; do
    if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
        echo "✓ Application is healthy!"

        # Show container status
        echo ""
        echo "Container status:"
        docker-compose ps || docker compose ps

        echo ""
        echo "✓ Deployment completed successfully!"
        echo "Application is running at: https://zikr.uzyol.uz"
        exit 0
    fi
    echo "Attempt $i/30: Waiting for application..."
    sleep 2
done

echo "❌ Health check failed!"
echo "Checking logs..."
docker-compose logs --tail=50 app || docker compose logs --tail=50 app

# Rollback
if [ -f "$BACKUP_PATH/backup_$TIMESTAMP.tar.gz" ]; then
    echo "Rolling back to previous version..."
    cd $SERVER_PATH
    rm -rf *
    tar -xzf $BACKUP_PATH/backup_$TIMESTAMP.tar.gz
    docker-compose up -d || docker compose up -d
    echo "⚠️ Rolled back to previous version"
    exit 1
else
    echo "❌ Rollback failed: no backup found"
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}   Deployment Successful! 🎉${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "\nYour application is now running at:"
    echo -e "${GREEN}https://zikr.uzyol.uz${NC}"
    echo -e "\nAPI Documentation:"
    echo -e "${GREEN}https://zikr.uzyol.uz/api/docs${NC}"
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}   Deployment Failed! ❌${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "\nPlease check the error messages above."
fi

# Cleanup
echo -e "\n${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✓ Cleanup complete${NC}"
