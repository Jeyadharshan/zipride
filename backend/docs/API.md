# ZipRide Backend API Reference

## Base URL
- **Development**: `http://localhost:5000/api/v1`
- **Production**: `https://api.yourdomain.com/api/v1`

## Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Standard Response Format

### Success
```json
{ "success": true, "message": "...", "data": {}, "errors": null }
```

### Error
```json
{ "success": false, "message": "...", "data": null, "errors": [{ "code": "ERROR_CODE", "message": "..." }] }
```

### Paginated
```json
{
  "success": true, "message": "...", "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10, "hasNext": true, "hasPrev": false }
}
```

---

## Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register rider |
| POST | `/auth/register/driver` | ❌ | Register driver (multipart) |
| POST | `/auth/login` | ❌ | Login (rider/driver/admin) |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| GET  | `/auth/me` | ✅ | Get current user |

### Register Rider — `POST /auth/register`
```json
{
  "email": "user@example.com",
  "passwordHash": "sha256_hashed_password",
  "fullName": "John Doe",
  "phone": "+919876543210",
  "username": "johndoe",
  "dob": "1995-01-15",
  "gender": "male"
}
```

### Login — `POST /auth/login`
```json
{ "username": "johndoe", "password": "sha256_hashed_password" }
```
Response includes `token` (15min) and `refreshToken` (7d).

---

## Rider Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rider/profile` | Get profile |
| PUT | `/rider/profile` | Update profile |
| GET | `/rider/favourites` | Saved places |
| POST | `/rider/favourites` | Save a place |
| GET | `/rider/recent-places` | Recent destinations |

---

## Driver Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/driver/profile` | Get driver profile + vehicle |
| PUT | `/driver/profile` | Update profile |
| GET | `/driver/vehicle` | Get active vehicle |
| POST | `/driver/location` | Update coordinates |
| POST | `/driver/upload-docs` | Upload documents (multipart) |

---

## Ride Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rides/request` | Book a ride |
| GET  | `/rides/:id` | Get ride details |
| POST | `/rides/:id/accept` | Driver accepts |
| POST | `/rides/:id/start` | Start ride (with OTP) |
| POST | `/rides/:id/complete` | Complete ride + wallet |
| POST | `/rides/:id/cancel` | Cancel ride |

### Book a Ride — `POST /rides/request`
```json
{
  "pickupAddress": "Marina Beach, Chennai",
  "pickupLatitude": 13.0500,
  "pickupLongitude": 80.2824,
  "dropoffAddress": "Chennai Airport",
  "dropoffLatitude": 12.9941,
  "dropoffLongitude": 80.1709,
  "paymentMethod": "wallet",
  "vehicleType": "Economy"
}
```

---

## Wallet Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/wallet/balance` | Get balance |
| POST | `/wallet/deposit` | Add funds |
| POST | `/wallet/withdraw` | Withdraw |
| GET  | `/wallet/transactions` | Transaction history |

---

## Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/order` | Create Razorpay order |
| POST | `/payments/verify` | Verify payment |
| POST | `/payments/webhook` | Razorpay webhook (no auth) |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | All notifications |
| PUT | `/notifications/:id/read` | Mark as read |

---

## Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard-stats` | Revenue + ride stats |
| GET | `/admin/users` | All accounts |
| POST | `/admin/driver/:id/approve` | Approve driver |
| POST | `/admin/driver/:id/reject` | Reject driver |
| POST | `/admin/user/:id/block` | Block user |

---

## Special Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/health` | System health check |
| GET  | `/api-docs` | Swagger documentation |
| POST | `/api/query` | Frontend proxy query endpoint |

---

## Query Parameters (Paginated Endpoints)

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `page` | int | `?page=2` | Page number |
| `limit` | int | `?limit=20` | Items per page (max 100) |
| `search` | string | `?search=john` | Search term |
| `sort` | string | `?sort=created_at` | Sort field |
| `order` | string | `?order=asc` | Sort direction |
| `status` | string | `?status=active` | Filter by status |
| `from` | date | `?from=2026-01-01` | Date range start |
| `to` | date | `?to=2026-12-31` | Date range end |
