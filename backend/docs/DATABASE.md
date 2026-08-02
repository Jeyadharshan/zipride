# ZipRide Database Architecture

## Database: MySQL 8 (port 3307)

The database uses **soft-deletes** (`deleted_at` column) across all major tables. Hard-delete operations are never used in production. An audit trail is maintained via `admin_audit_logs` and `audit_trail` tables.

---

## Core Tables

### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `username` | VARCHAR(50) UNIQUE | Login username |
| `email` | VARCHAR(100) UNIQUE | Email |
| `full_name` | VARCHAR(100) | Full name |
| `phone` | VARCHAR(20) UNIQUE | Phone |
| `password_hash` | TEXT | bcrypt hash |
| `role` | ENUM | rider / driver / admin |
| `account_status` | ENUM | active / inactive / suspended |
| `profile_picture` | TEXT | Cloudinary URL |
| `referral_code` | VARCHAR(20) | Unique referral code |
| `referred_by` | VARCHAR(36) | FK → users.id |
| `deleted_at` | TIMESTAMP | Soft delete |
| `created_at` | TIMESTAMP | Auto |

### `drivers`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) FK PK | → users.id |
| `status` | ENUM | online / offline / on_ride |
| `rating` | DECIMAL(3,2) | 0.00 – 5.00 |
| `verification_status` | ENUM | pending / approved / rejected |
| `license_number` | VARCHAR(50) | Driving licence |
| `latitude` | DECIMAL(10,8) | Current lat |
| `longitude` | DECIMAL(11,8) | Current lng |
| `is_banned` | TINYINT | 0 / 1 |

### `vehicles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `driver_id` | VARCHAR(36) FK | → drivers.id |
| `make` | VARCHAR(50) | Manufacturer |
| `model` | VARCHAR(50) | Model |
| `year` | YEAR | Manufacturing year |
| `color` | VARCHAR(30) | Color |
| `license_plate` | VARCHAR(20) UNIQUE | Registration number |
| `vehicle_type` | ENUM | Economy / Sedan / SUV / Auto |
| `is_active` | TINYINT | 1 = current vehicle |

### `rides`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `rider_id` | VARCHAR(36) FK | → users.id |
| `driver_id` | VARCHAR(36) FK | → drivers.id (nullable) |
| `status` | ENUM | pending / accepted / started / completed / cancelled |
| `pickup_address` | TEXT | Pickup address string |
| `pickup_latitude` | DECIMAL(10,8) | |
| `pickup_longitude` | DECIMAL(11,8) | |
| `dropoff_address` | TEXT | Dropoff address |
| `dropoff_latitude` | DECIMAL(10,8) | |
| `dropoff_longitude` | DECIMAL(11,8) | |
| `fare` | DECIMAL(10,2) | Final fare |
| `distance` | DECIMAL(10,2) | km |
| `duration` | INT | Minutes |
| `payment_method` | ENUM | cash / wallet |
| `payment_status` | ENUM | pending / paid / refunded |
| `otp` | VARCHAR(10) | Ride start OTP |
| `created_at` | TIMESTAMP | |
| `completed_at` | TIMESTAMP | |

### `wallets`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK FK | → users.id |
| `balance` | DECIMAL(12,2) | Current balance |
| `updated_at` | TIMESTAMP | |

### `wallet_transactions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(36) FK | |
| `type` | ENUM | credit / debit |
| `amount` | DECIMAL(10,2) | |
| `description` | TEXT | |
| `reference_id` | VARCHAR(100) | Ride/payment ID |
| `created_at` | TIMESTAMP | |

### `payments`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | UUID |
| `ride_id` | VARCHAR(36) FK | → rides.id |
| `user_id` | VARCHAR(36) FK | → users.id |
| `amount` | DECIMAL(10,2) | |
| `method` | ENUM | cash / wallet / upi / card |
| `status` | ENUM | pending / completed / failed / refunded |
| `razorpay_order_id` | VARCHAR(100) | |
| `razorpay_payment_id` | VARCHAR(100) | |
| `created_at` | TIMESTAMP | |

### `notifications`
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) PK | |
| `user_id` | VARCHAR(36) FK | |
| `title` | VARCHAR(200) | |
| `body` | TEXT | |
| `type` | VARCHAR(50) | ride / payment / promo |
| `is_read` | TINYINT | 0 / 1 |
| `created_at` | TIMESTAMP | |

---

## Audit Tables

### `admin_audit_logs`
Tracks every admin action (driver approval, user bans, settings changes).
```sql
id, admin_id, action, affected_id, affected_table, details (JSON), ip_address, created_at
```

### `audit_trail`
Field-level change tracking (old value → new value).
```sql
id, table_name, record_id, field_name, old_value, new_value, updated_by, updated_at
```

---

## Indexes & Performance

- All FK columns are indexed.
- `drivers` table indexed on `(status, latitude, longitude)` for geospatial queries.
- `rides` indexed on `(status, created_at)` for admin dashboard.
- `wallet_transactions` indexed on `(user_id, created_at)`.

---

## Soft Delete Pattern

All destructive operations use:
```sql
UPDATE `table_name` SET deleted_at = NOW() WHERE id = ?
```
And all queries filter with:
```sql
WHERE deleted_at IS NULL
```
