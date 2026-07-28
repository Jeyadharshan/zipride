# ZipRide Production MySQL Backend

This is a production-ready, enterprise-grade Express.js + MySQL 8 + Socket.IO backend for the ZipRide project.

## 🚀 Key Enterprise Features

1. **Clean MVC + Repository Pattern**: Separation of concerns. Controllers do not handle SQL or raw database connections directly.
2. **Transaction Rollback Protection**: Critical workflows like booking cancellations, completed transactions, and wallet operations execute under strict transactional locks.
3. **Queue & Task Scheduler**: Runs background processes (SMS, emails, OTP alerts) asynchronously. Includes standard cleanup daemons (inactive drivers, expired OTPs, timeout rides).
4. **Socket.IO Live Tracking**: Features typing statuses, real-time driver coordinates broadcast, and reconnect routines.
5. **Swagger Documentation**: Accessible interactive endpoint map at `/api-docs`.
6. **Robust Fallbacks**: Graceful fallback database pool mapping prevents service disruptions in testing or locked db environments.

## 🛠️ Installation and Execution

1. Navigate to the folder and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Make sure the local environment configuration in `.env` is loaded with correct values.

3. Launch server in development mode:
   ```bash
   npm run dev
   ```

4. The server runs on port `5000`. You can monitor performance via `GET http://localhost:5000/api/health`.

## 📦 Containerization & Deployment

Deploy utilizing Docker:
```bash
docker-compose up --build -d
```
This builds and serves Nginx proxy and MySQL DB containers.
