#!/bin/bash

# Database Backup Script for Zikr API
# Automatically backs up PostgreSQL database before deployments

set -e

# Configuration
BACKUP_DIR="/var/backups/zikr-api/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

echo "📊 Starting database backup..."

# Load DATABASE_URL from .env
if [ -f "/var/www/zikr-api/.env" ]; then
  export $(grep -v '^#' /var/www/zikr-api/.env | grep DATABASE_URL | xargs)
else
  echo "❌ .env file not found at /var/www/zikr-api/.env"
  exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)(\?.*)?$ ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "❌ Failed to parse DATABASE_URL"
  exit 1
fi

# Backup filename
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Perform backup
echo "💾 Backing up database: $DB_NAME"
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

# Check backup success
if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Clean up old backups
echo "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lht $BACKUP_DIR | head -n 6

# Calculate total backup size
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo ""
echo "💿 Total backup size: $TOTAL_SIZE"

echo "✅ Database backup completed successfully!"
