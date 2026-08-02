-- ZIPRIDE SQLITE DATABASE SCHEMA

-- 1. Users Table (replaces profiles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'rider', -- 'rider', 'driver', 'admin'
  phone TEXT UNIQUE,
  firebase_uid TEXT UNIQUE,
  date_of_birth TEXT,
  gender TEXT,
  referral_code TEXT,
  address TEXT,
  account_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'banned'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  password_hash TEXT,
  username TEXT UNIQUE
);

-- 2. Drivers Table (replaces driver_profiles)
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline', -- 'offline', 'online', 'busy'
  rating REAL DEFAULT 5.00,
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  current_latitude REAL,
  current_longitude REAL,
  last_active_at TEXT DEFAULT (datetime('now')),
  email TEXT,
  license_number TEXT,
  license_expiry TEXT,
  license_image_url TEXT,
  rc_book_url TEXT,
  insurance_url TEXT,
  profile_photo_url TEXT,
  selfie_url TEXT,
  vehicle_images TEXT, -- JSON/comma-separated text
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_banned INTEGER DEFAULT 0, -- 0=false, 1=true
  online_seconds INTEGER DEFAULT 0
);

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'Economy', 'Sedan', 'SUV', etc.
  is_active INTEGER DEFAULT 1, -- 0=false, 1=true
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Ride Locations Table (replaces driver_locations)
CREATE TABLE IF NOT EXISTS ride_locations (
  driver_id TEXT PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  heading REAL DEFAULT 0.00,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Rides Table
CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  rider_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'searching', -- 'searching', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled'
  pickup_address TEXT NOT NULL,
  pickup_latitude REAL NOT NULL,
  pickup_longitude REAL NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_latitude REAL NOT NULL,
  dropoff_longitude REAL NOT NULL,
  fare REAL NOT NULL,
  distance REAL NOT NULL,
  duration INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  otp TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance REAL DEFAULT 0.00,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'ride_payment', 'ride_earnings', 'refund'
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 9. Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER DEFAULT 0, -- 0=false, 1=true
  created_at TEXT DEFAULT (datetime('now'))
);

-- 11. Admin Settings Table (replaces platform_settings)
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed Default Settings
INSERT OR REPLACE INTO admin_settings (key, value, description) VALUES
  ('base_fare', '40', 'Base fare for ride requests'),
  ('per_km_rate', '12', 'Rate per kilometer'),
  ('commission', '20', 'ZipRide platform commission percentage'),
  ('cancellation_fee', '25', 'Cancellation fee'),
  ('surge_pricing', 'true', 'Enable/disable surge pricing'),
  ('auto_approve', 'false', 'Automatically approve drivers'),
  ('maintenance_mode', 'false', 'Put app in maintenance mode'),
  ('commission_percentage', '15.00', 'Percentage ZipRide takes from each completed trip'),
  ('base_cancellation_fee', '2.00', 'Cancellation fee charged to riders when driver accepted'),
  ('minimum_distance_miles', '0.50', 'Minimum distance required to book a ride');
