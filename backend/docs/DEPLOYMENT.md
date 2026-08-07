# ZipRide Backend Deployment Guide

## Pre-Deployment Checklist

- [ ] Set all required environment variables in `.env.production`
- [ ] Replace all `CHANGE_THIS_*` values
- [ ] Verify MySQL database is migrated and seeded
- [ ] Test health endpoint: `GET /api/health`
- [ ] Rotate JWT secrets
- [ ] Set CORS origins to your production domain

---

## Option 1: Docker Compose (Recommended)

```bash
# 1. Build and start all services
docker-compose up --build -d

# 2. Check logs
docker-compose logs -f backend

# 3. Verify running containers
docker-compose ps
```

The `docker-compose.yml` starts:
- `backend` — Node.js API on port 5000
- `mysql` — MySQL 8 on port 3307
- `nginx` — Reverse proxy on ports 80 / 443

---

## Option 2: PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start in production mode
cd backend
pm2 start ecosystem.config.cjs --env production

# Monitor
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

---

## Option 3: Railway / Render / Fly.io

1. Connect your GitHub repository.
2. Set environment variables in the dashboard (copy from `.env.production`).
3. Set start command: `node server.js`
4. Set health check path: `/api/health`

---

## Nginx Configuration

The included `nginx.conf` handles:
- HTTP → HTTPS redirect
- Reverse proxy to backend port 5000
- WebSocket proxy for Socket.IO (`/socket.io/`)
- Static file gzip compression

Place SSL certificates at:
```
/etc/nginx/ssl/zipride.crt
/etc/nginx/ssl/zipride.key
```

---

## Database Migration

Before first run, import your schema:
```bash
mysql -h 127.0.0.1 -P 3307 -u root -p zipride < schema.sql
```

Then seed defaults:
```bash
node scripts/seed.js
```

---

## Backup & Restore

```bash
# Create a backup
node scripts/backupDatabase.js

# Restore from backup
node scripts/restoreDatabase.js ./backups/zipride_backup_2026-xx-xx.sql

# Export users to JSON
node scripts/exportUsers.js

# Export drivers to JSON
node scripts/exportDrivers.js

# Export rides to JSON
node scripts/exportRides.js
```

---

## Running Tests

```bash
cd backend
npm test
```

Uses Jest with ESM (`--experimental-vm-modules`). Test database is `zipride_test` (see `.env.test`).

---

## Health Check Endpoint

```
GET /api/health
```
Returns:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-07-11T12:00:00.000Z",
  "db": "connected",
  "uptime": 3600
}
```

---

## Monitoring Recommendations

| Tool | Purpose |
|------|---------|
| PM2 | Process management, auto-restart |
| Morgan | HTTP request logging |
| backend/logs/ | Application logs (info/error/combined) |
| Sentry (optional) | Error tracking |
| Uptime Robot | Uptime monitoring via `/api/health` |
