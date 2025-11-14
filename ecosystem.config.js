module.exports = {
  apps: [
    {
      name: 'zikr-api',
      script: './dist/main.js',
      instances: 1, // Single instance for 1GB RAM server
      exec_mode: 'cluster',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 1111,
      },

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '400M', // Restart if memory exceeds 400MB

      // Restart delays
      min_uptime: '10s', // Min uptime before considered stable
      max_restarts: 10, // Max restarts within 1 minute
      restart_delay: 4000, // Delay between restarts (ms)

      // Logging
      error_file: '/var/log/zikr-api/error.log',
      out_file: '/var/log/zikr-api/out.log',
      log_file: '/var/log/zikr-api/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Log rotation
      log_type: 'json',
      merge_logs: true,

      // Performance monitoring
      instance_var: 'INSTANCE_ID',

      // Graceful shutdown
      kill_timeout: 5000, // Time to wait before force kill
      listen_timeout: 3000, // Time to wait for app to listen

      // Process management
      wait_ready: true, // Wait for process.send('ready')
      shutdown_with_message: true,

      // Cron restart (optional - restart at 3 AM daily for maintenance)
      cron_restart: '0 3 * * *',

      // Advanced features
      treekill: true, // Kill entire child process tree
      pmx: true, // Enable PMX monitoring

      // Health check configuration
      health_check: {
        port: 1111,
        path: '/api/health',
        interval: 30000, // Check every 30 seconds
      },

      // Environment-specific configurations
      env_production: {
        NODE_ENV: 'production',
      },

      env_staging: {
        NODE_ENV: 'staging',
      },
    },
  ],

  // PM2 deploy configuration (optional)
  deploy: {
    production: {
      user: 'deploy-user',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:tohirov1103/Zikr_v2.0.git',
      path: '/var/www/zikr-api',
      'post-deploy': 'npm ci && npx prisma generate && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
