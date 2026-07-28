# ZipRide Environment Variables Reference

## How to Set Up

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Fill in all `CHANGE_THIS_*` placeholder values.
3. Never commit `.env` to version control.

---

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Active environment (loaded by server) |
| `.env.example` | Template with descriptions |
| `.env.development` | Development defaults |
| `.env.production` | Production template (placeholders only) |
| `.env.test` | Isolated test environment |

---

## Required Variables (Server will not start without these)

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Express server port |
| `MYSQL_HOST` | `127.0.0.1` | MySQL server host |
| `MYSQL_PORT` | `3307` | MySQL server port |
| `MYSQL_DATABASE` | `zipride` | Database name |
| `MYSQL_USER` | `root` | MySQL user |
| `MYSQL_PASSWORD` | `Abirami@27` | MySQL password |
| `JWT_SECRET` | `random_64_chars` | JWT signing secret |

---

## Optional Variables (Features degrade gracefully)

| Variable | Description |
|----------|-------------|
| `FIREBASE_API_KEY` | Firebase auth — OTP falls back to mock mode |
| `GEOAPIFY_API_KEY` | Maps/routing — falls back to OSRM public API |
| `CLOUDINARY_*` | File storage — falls back to local disk upload |
| `RAZORPAY_KEY_ID/SECRET` | Payments — falls back to mock order IDs |
| `SMTP_USER/PASS` | Email — falls back to console logging |
| `SMS_PROVIDER` | SMS — `console` mode logs to terminal |

---

## Security Notes

- Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` on every deployment.
- Use AWS Secrets Manager, HashiCorp Vault, or Railway/Render secret injection in production.
- Never log environment variables to console or files.