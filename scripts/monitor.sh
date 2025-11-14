#!/bin/bash

# Performance Monitoring Script for Zikr API
# Monitors app health, memory usage, and response times

set -e

# Configuration
APP_PORT="${APP_PORT:-1111}"
API_URL="http://localhost:$APP_PORT/api"
LOG_FILE="/var/log/zikr-api/monitor.log"
ALERT_THRESHOLD_MEMORY=80  # Alert if memory usage > 80%
ALERT_THRESHOLD_CPU=90     # Alert if CPU usage > 90%
ALERT_THRESHOLD_RESPONSE=2000  # Alert if response time > 2000ms

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create log directory
mkdir -p /var/log/zikr-api

echo "🔍 Starting performance monitoring..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to log with timestamp
log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# 1. Check if PM2 process is running
echo -e "\n${BLUE}📊 PM2 Process Status${NC}"
if pm2 describe zikr-api > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PM2 process 'zikr-api' is running${NC}"
  pm2 describe zikr-api | grep -E "status|uptime|restarts|memory|cpu"
else
  echo -e "${RED}❌ PM2 process 'zikr-api' is NOT running!${NC}"
  log_message "ERROR: PM2 process not running"
  exit 1
fi

# 2. Memory Usage Check
echo -e "\n${BLUE}💾 Memory Usage${NC}"
MEMORY_INFO=$(pm2 jlist | jq -r '.[] | select(.name=="zikr-api") | "\(.monit.memory) \(.monit.cpu)"' 2>/dev/null || echo "0 0")
MEMORY_BYTES=$(echo $MEMORY_INFO | awk '{print $1}')
CPU_PERCENT=$(echo $MEMORY_INFO | awk '{print $2}')

if [ "$MEMORY_BYTES" != "0" ]; then
  MEMORY_MB=$((MEMORY_BYTES / 1024 / 1024))
  TOTAL_MEMORY=$(free -m | awk 'NR==2{print $2}')
  MEMORY_PERCENT=$((MEMORY_MB * 100 / TOTAL_MEMORY))

  echo "App Memory: ${MEMORY_MB}MB / ${TOTAL_MEMORY}MB (${MEMORY_PERCENT}%)"
  echo "CPU Usage: ${CPU_PERCENT}%"

  if [ $MEMORY_PERCENT -gt $ALERT_THRESHOLD_MEMORY ]; then
    echo -e "${RED}⚠️  WARNING: High memory usage detected!${NC}"
    log_message "WARNING: Memory usage at ${MEMORY_PERCENT}%"
  else
    echo -e "${GREEN}✅ Memory usage normal${NC}"
  fi

  if (( $(echo "$CPU_PERCENT > $ALERT_THRESHOLD_CPU" | bc -l) )); then
    echo -e "${RED}⚠️  WARNING: High CPU usage detected!${NC}"
    log_message "WARNING: CPU usage at ${CPU_PERCENT}%"
  else
    echo -e "${GREEN}✅ CPU usage normal${NC}"
  fi
fi

# 3. System Memory Overview
echo -e "\n${BLUE}💻 System Memory Overview${NC}"
free -h | grep -E "Mem|Swap"

# 4. Health Check Endpoint
echo -e "\n${BLUE}🏥 Health Check${NC}"
HEALTH_START=$(date +%s%3N)
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health || echo "000")
HEALTH_END=$(date +%s%3N)
HEALTH_TIME=$((HEALTH_END - HEALTH_START))

if [ "$HEALTH_RESPONSE" == "200" ]; then
  echo -e "${GREEN}✅ Health check passed (${HEALTH_TIME}ms)${NC}"
else
  echo -e "${RED}❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
  log_message "ERROR: Health check failed with status $HEALTH_RESPONSE"
fi

# 5. API Response Time Test
echo -e "\n${BLUE}⚡ API Response Time Test${NC}"

# Test multiple endpoints
declare -a ENDPOINTS=("/health" "/api/auth/login" "/api/group")
declare -a METHODS=("GET" "POST" "GET")

for i in "${!ENDPOINTS[@]}"; do
  ENDPOINT="${ENDPOINTS[$i]}"
  METHOD="${METHODS[$i]}"

  START=$(date +%s%3N)

  if [ "$METHOD" == "POST" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL${ENDPOINT} -H "Content-Type: application/json" -d '{}' || echo "000")
  else
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL${ENDPOINT} || echo "000")
  fi

  END=$(date +%s%3N)
  RESPONSE_TIME=$((END - START))

  if [ $RESPONSE_TIME -gt $ALERT_THRESHOLD_RESPONSE ]; then
    echo -e "${YELLOW}⚠️  $METHOD $ENDPOINT: ${RESPONSE_TIME}ms (HTTP $RESPONSE)${NC}"
    log_message "WARNING: Slow response on $ENDPOINT: ${RESPONSE_TIME}ms"
  else
    echo -e "${GREEN}✅ $METHOD $ENDPOINT: ${RESPONSE_TIME}ms (HTTP $RESPONSE)${NC}"
  fi
done

# 6. WebSocket Connection Test
echo -e "\n${BLUE}🔌 WebSocket Status${NC}"
WS_CONNECTIONS=$(pm2 jlist | jq -r '.[] | select(.name=="zikr-api") | .pm2_env.axm_monitor."Active connections".value' 2>/dev/null || echo "N/A")
echo "Active WebSocket connections: $WS_CONNECTIONS"

# 7. Database Connection Test
echo -e "\n${BLUE}🗄️  Database Connection${NC}"
DB_START=$(date +%s%3N)
DB_TEST=$(cd /var/www/zikr-api && npx prisma db execute --stdin <<< "SELECT 1;" 2>&1 || echo "FAILED")
DB_END=$(date +%s%3N)
DB_TIME=$((DB_END - DB_START))

if [[ "$DB_TEST" != *"FAILED"* ]]; then
  echo -e "${GREEN}✅ Database connection OK (${DB_TIME}ms)${NC}"
else
  echo -e "${RED}❌ Database connection failed${NC}"
  log_message "ERROR: Database connection failed"
fi

# 8. Disk Space Check
echo -e "\n${BLUE}💿 Disk Space${NC}"
DISK_USAGE=$(df -h /var/www/zikr-api | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAIL=$(df -h /var/www/zikr-api | awk 'NR==2 {print $4}')

echo "Disk usage: ${DISK_USAGE}% (${DISK_AVAIL} available)"

if [ $DISK_USAGE -gt 80 ]; then
  echo -e "${RED}⚠️  WARNING: Low disk space!${NC}"
  log_message "WARNING: Disk usage at ${DISK_USAGE}%"
else
  echo -e "${GREEN}✅ Disk space OK${NC}"
fi

# 9. Recent Logs Check
echo -e "\n${BLUE}📋 Recent PM2 Logs (last 10 lines)${NC}"
pm2 logs zikr-api --lines 10 --nostream 2>/dev/null || echo "No logs available"

# 10. Error Rate Check
echo -e "\n${BLUE}🚨 Error Rate (last hour)${NC}"
ERROR_COUNT=$(grep -c "ERROR" $LOG_FILE 2>/dev/null || echo "0")
echo "Logged errors: $ERROR_COUNT"

if [ $ERROR_COUNT -gt 10 ]; then
  echo -e "${RED}⚠️  WARNING: High error rate detected!${NC}"
  log_message "WARNING: ${ERROR_COUNT} errors in last hour"
else
  echo -e "${GREEN}✅ Error rate normal${NC}"
fi

# 11. PM2 Restart Count
echo -e "\n${BLUE}🔄 PM2 Restart Count${NC}"
RESTART_COUNT=$(pm2 jlist | jq -r '.[] | select(.name=="zikr-api") | .pm2_env.restart_time' 2>/dev/null || echo "0")
echo "Restarts since last PM2 save: $RESTART_COUNT"

if [ $RESTART_COUNT -gt 5 ]; then
  echo -e "${YELLOW}⚠️  WARNING: App has restarted $RESTART_COUNT times${NC}"
  log_message "WARNING: High restart count: $RESTART_COUNT"
else
  echo -e "${GREEN}✅ Restart count normal${NC}"
fi

# Summary
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Performance monitoring completed${NC}"
echo -e "Full logs available at: $LOG_FILE"

log_message "Performance monitoring completed"
