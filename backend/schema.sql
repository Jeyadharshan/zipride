-- ZipRide MySQL 8.0 Complete Database Schema
-- Generated strictly for ZipRide project integration

CREATE DATABASE IF NOT EXISTS `zipride`;
USE `zipride`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------
-- 1. Table structure for table `profiles`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `id` CHAR(36) NOT NULL,
  `firebase_uid` VARCHAR(128) DEFAULT NULL,
  `username` VARCHAR(50) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `full_name` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `role` ENUM('rider', 'driver', 'admin') NOT NULL DEFAULT 'rider',
  `date_of_birth` DATE DEFAULT NULL,
  `gender` VARCHAR(20) DEFAULT NULL,
  `profile_image` VARCHAR(255) DEFAULT NULL,
  `referral_code` VARCHAR(20) DEFAULT NULL,
  `account_status` ENUM('active', 'inactive', 'suspended', 'banned') NOT NULL DEFAULT 'active',
  `phone_verified` TINYINT(1) DEFAULT 0,
  `address` VARCHAR(255) DEFAULT NULL,
  `last_login` DATETIME DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_profiles_username` (`username`),
  UNIQUE KEY `idx_profiles_phone` (`phone`),
  UNIQUE KEY `idx_profiles_email` (`email`),
  UNIQUE KEY `idx_profiles_firebase_uid` (`firebase_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 2. Table structure for table `admins`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `admin_role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `can_manage_users` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_drivers` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_rides` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_wallet` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_payments` TINYINT(1) NOT NULL DEFAULT 1,
  `can_view_reports` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admins_profile_id` (`profile_id`),
  CONSTRAINT `fk_admins_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 3. Table structure for table `api_logs`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `api_logs`;
CREATE TABLE `api_logs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `endpoint` VARCHAR(255) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `body` TEXT DEFAULT NULL,
  `response` TEXT DEFAULT NULL,
  `status_code` INT NOT NULL,
  `execution_time` INT NOT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_logs_user` (`user_id`),
  CONSTRAINT `fk_api_logs_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 4. Table structure for table `app_settings`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `app_settings`;
CREATE TABLE `app_settings` (
  `setting_key` VARCHAR(50) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 5. Table structure for table `audit_logs`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) DEFAULT NULL,
  `action` VARCHAR(50) NOT NULL,
  `table_name` VARCHAR(50) DEFAULT NULL,
  `record_id` VARCHAR(50) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_profile` (`profile_id`),
  CONSTRAINT `fk_audit_logs_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 6. Table structure for table `banners`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `banners`;
CREATE TABLE `banners` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `link_url` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 7. Table structure for table `driver_profiles`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_profiles`;
CREATE TABLE `driver_profiles` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `driver_code` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `license_number` VARCHAR(50) DEFAULT NULL,
  `license_expiry` DATE DEFAULT NULL,
  `experience_years` INT DEFAULT NULL,
  `vehicle_type` VARCHAR(50) DEFAULT NULL,
  `verification_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `verification_date` DATETIME DEFAULT NULL,
  `verified_by` CHAR(36) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `profile_photo` VARCHAR(255) DEFAULT NULL,
  `driving_licence_image` VARCHAR(255) DEFAULT NULL,
  `driving_licence_number` VARCHAR(100) DEFAULT NULL,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `is_banned` TINYINT(1) NOT NULL DEFAULT 0,
  `total_rides` INT NOT NULL DEFAULT 0,
  `completed_rides` INT NOT NULL DEFAULT 0,
  `cancelled_rides` INT NOT NULL DEFAULT 0,
  `total_earnings` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  `online_seconds` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_driver_profiles_profile_id` (`profile_id`),
  UNIQUE KEY `idx_driver_profiles_driver_code` (`driver_code`),
  CONSTRAINT `fk_driver_profiles_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 8. Table structure for table `blocked_drivers`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `blocked_drivers`;
CREATE TABLE `blocked_drivers` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `reason` TEXT NOT NULL,
  `blocked_by` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_blocked_drivers_driver` (`driver_id`),
  CONSTRAINT `fk_blocked_drivers_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blocked_drivers_admin` FOREIGN KEY (`blocked_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 9. Table structure for table `blocked_users`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `blocked_users`;
CREATE TABLE `blocked_users` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `reason` TEXT NOT NULL,
  `blocked_by` CHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_blocked_users_profile` (`profile_id`),
  CONSTRAINT `fk_blocked_users_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blocked_users_admin` FOREIGN KEY (`blocked_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 10. Table structure for table `cities`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `cities`;
CREATE TABLE `cities` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 11. Table structure for table `rides`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `rides`;
CREATE TABLE `rides` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_code` VARCHAR(30) NOT NULL,
  `rider_id` CHAR(36) NOT NULL,
  `driver_id` INT DEFAULT NULL,
  `vehicle_id` INT DEFAULT NULL,
  `ride_type` ENUM('Bike', 'Auto', 'Mini', 'Sedan', 'SUV') NOT NULL DEFAULT 'Sedan',
  `ride_status` ENUM('Searching', 'Driver Assigned', 'Driver Accepted', 'Driver Arriving', 'Driver Arrived', 'OTP Verified', 'Ride Started', 'Ride Completed', 'Cancelled') DEFAULT 'Searching',
  `payment_method` ENUM('Cash', 'Wallet', 'UPI', 'Card') DEFAULT 'Cash',
  `payment_status` ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
  `estimated_distance` DECIMAL(10,2) DEFAULT NULL,
  `estimated_duration` INT DEFAULT NULL,
  `estimated_fare` DECIMAL(10,2) DEFAULT NULL,
  `actual_distance` DECIMAL(10,2) DEFAULT NULL,
  `actual_duration` INT DEFAULT NULL,
  `final_fare` DECIMAL(10,2) DEFAULT NULL,
  `booking_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_time` DATETIME DEFAULT NULL,
  `arrived_time` DATETIME DEFAULT NULL,
  `started_time` DATETIME DEFAULT NULL,
  `completed_time` DATETIME DEFAULT NULL,
  `cancelled_time` DATETIME DEFAULT NULL,
  `cancellation_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rides_ride_code` (`ride_code`),
  KEY `idx_rides_rider` (`rider_id`),
  KEY `idx_rides_driver` (`driver_id`),
  CONSTRAINT `fk_rides_rider` FOREIGN KEY (`rider_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rides_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 12. Table structure for table `company_earnings`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `company_earnings`;
CREATE TABLE `company_earnings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `commission_amount` DECIMAL(12,2) NOT NULL,
  `tax_amount` DECIMAL(12,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_earnings_ride` (`ride_id`),
  CONSTRAINT `fk_company_earnings_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 13. Table structure for table `complaints`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `complaints`;
CREATE TABLE `complaints` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `complainant_id` CHAR(36) NOT NULL,
  `against_type` ENUM('Driver', 'Rider', 'Ride') DEFAULT NULL,
  `against_id` VARCHAR(50) DEFAULT NULL,
  `complaint` TEXT NOT NULL,
  `status` ENUM('Pending', 'Investigating', 'Resolved', 'Rejected') DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaints_complainant` (`complainant_id`),
  CONSTRAINT `fk_complaints_complainant` FOREIGN KEY (`complainant_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 14. Table structure for table `coupons`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `discount_type` ENUM('Percentage', 'Flat') NOT NULL DEFAULT 'Flat',
  `discount_value` DECIMAL(10,2) NOT NULL,
  `max_discount` DECIMAL(10,2) DEFAULT NULL,
  `min_ride_amount` DECIMAL(10,2) DEFAULT NULL,
  `expiry_date` DATETIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 15. Table structure for table `dashboard_statistics`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `dashboard_statistics`;
CREATE TABLE `dashboard_statistics` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `stat_key` VARCHAR(50) NOT NULL,
  `stat_value` DECIMAL(12,2) NOT NULL,
  `calculated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 16. Table structure for table `device_tokens`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `device_tokens`;
CREATE TABLE `device_tokens` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `platform` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device_tokens_profile` (`profile_id`),
  CONSTRAINT `fk_device_tokens_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 17. Table structure for table `driver_bank_accounts`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_bank_accounts`;
CREATE TABLE `driver_bank_accounts` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `ifsc_code` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_driver_bank_accounts_driver` (`driver_id`),
  CONSTRAINT `fk_driver_bank_accounts_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 18. Table structure for table `driver_documents`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_documents`;
CREATE TABLE `driver_documents` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `profile_photo` VARCHAR(255) DEFAULT NULL,
  `selfie_photo` VARCHAR(255) DEFAULT NULL,
  `license_photo` VARCHAR(255) DEFAULT NULL,
  `rc_book_photo` VARCHAR(255) DEFAULT NULL,
  `insurance_photo` VARCHAR(255) DEFAULT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_driver_documents_driver` (`driver_id`),
  CONSTRAINT `fk_driver_documents_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 19. Table structure for table `driver_earnings`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_earnings`;
CREATE TABLE `driver_earnings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `tax_deducted` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_driver_earnings_driver` (`driver_id`),
  KEY `idx_driver_earnings_ride` (`ride_id`),
  CONSTRAINT `fk_driver_earnings_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_driver_earnings_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 20. Table structure for table `driver_live_location`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_live_location`;
CREATE TABLE `driver_live_location` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `latitude` DECIMAL(10,7) NOT NULL,
  `longitude` DECIMAL(10,7) NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_driver_live_location_driver` (`driver_id`),
  CONSTRAINT `fk_driver_live_location_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 21. Table structure for table `driver_online_history`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_online_history`;
CREATE TABLE `driver_online_history` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `status` ENUM('Online', 'Offline', 'Break', 'Busy') NOT NULL DEFAULT 'Offline',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_driver_online_history_driver` (`driver_id`),
  CONSTRAINT `fk_driver_online_history_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 22. Table structure for table `driver_reviews`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_reviews`;
CREATE TABLE `driver_reviews` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `rider_id` CHAR(36) NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_driver_reviews_driver` (`driver_id`),
  KEY `idx_driver_reviews_rider` (`rider_id`),
  CONSTRAINT `fk_driver_reviews_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_driver_reviews_rider` FOREIGN KEY (`rider_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 23. Table structure for table `driver_shifts`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `driver_shifts`;
CREATE TABLE `driver_shifts` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `status` ENUM('Active', 'Completed') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_driver_shifts_driver` (`driver_id`),
  CONSTRAINT `fk_driver_shifts_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 24. Table structure for table `favourite_locations`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `favourite_locations`;
CREATE TABLE `favourite_locations` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `rider_id` CHAR(36) NOT NULL,
  `location_name` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `latitude` DECIMAL(10,7) DEFAULT NULL,
  `longitude` DECIMAL(10,7) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_favourite_locations_rider` (`rider_id`),
  CONSTRAINT `fk_favourite_locations_rider` FOREIGN KEY (`rider_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 25. Table structure for table `invoices`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL,
  `pdf_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_invoices_invoice_number` (`invoice_number`),
  KEY `idx_invoices_ride` (`ride_id`),
  CONSTRAINT `fk_invoices_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 26. Table structure for table `login_history`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `login_history`;
CREATE TABLE `login_history` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `login_time` DATETIME NOT NULL,
  `logout_time` DATETIME DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `device_info` VARCHAR(255) DEFAULT NULL,
  `browser` VARCHAR(50) DEFAULT NULL,
  `location` VARCHAR(100) DEFAULT NULL,
  `platform` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_history_profile` (`profile_id`),
  CONSTRAINT `fk_login_history_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 27. Table structure for table `notifications`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_profile` (`profile_id`),
  CONSTRAINT `fk_notifications_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 28. Table structure for table `otp_history`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `otp_history`;
CREATE TABLE `otp_history` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `otp` VARCHAR(6) NOT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 29. Table structure for table `payments`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('Pending', 'Success', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
  `payment_method` ENUM('Cash', 'Wallet', 'UPI', 'Card') NOT NULL DEFAULT 'Cash',
  `gateway` VARCHAR(50) DEFAULT NULL,
  `gateway_order_id` VARCHAR(100) DEFAULT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `response_json` TEXT DEFAULT NULL,
  `created_time` DATETIME DEFAULT NULL,
  `completed_time` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_ride` (`ride_id`),
  CONSTRAINT `fk_payments_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 30. Table structure for table `promo_codes`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `promo_codes`;
CREATE TABLE `promo_codes` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `discount_percent` DECIMAL(5,2) NOT NULL,
  `max_discount` DECIMAL(10,2) NOT NULL,
  `min_amount` DECIMAL(10,2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_promo_codes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 31. Table structure for table `ratings`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `rider_id` CHAR(36) NOT NULL,
  `driver_id` INT NOT NULL,
  `rating` INT NOT NULL,
  `review` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ratings_ride` (`ride_id`),
  KEY `idx_ratings_rider` (`rider_id`),
  KEY `idx_ratings_driver` (`driver_id`),
  CONSTRAINT `fk_ratings_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_rider` FOREIGN KEY (`rider_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 32. Table structure for table `recent_locations`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `recent_locations`;
CREATE TABLE `recent_locations` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `rider_id` CHAR(36) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `latitude` DECIMAL(10,7) DEFAULT NULL,
  `longitude` DECIMAL(10,7) DEFAULT NULL,
  `searched_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recent_locations_rider` (`rider_id`),
  CONSTRAINT `fk_recent_locations_rider` FOREIGN KEY (`rider_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 33. Table structure for table `referrals`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `referrals`;
CREATE TABLE `referrals` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `referrer_id` CHAR(36) DEFAULT NULL,
  `referred_id` CHAR(36) DEFAULT NULL,
  `reward_amount` DECIMAL(10,2) DEFAULT NULL,
  `referral_status` ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_referrals_referrer` (`referrer_id`),
  KEY `idx_referrals_referred` (`referred_id`),
  CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_referrals_referred` FOREIGN KEY (`referred_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 34. Table structure for table `referral_rewards`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `referral_rewards`;
CREATE TABLE `referral_rewards` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `referral_id` BIGINT DEFAULT NULL,
  `reward_amount` DECIMAL(10,2) DEFAULT NULL,
  `reward_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_referral_rewards_referral` (`referral_id`),
  CONSTRAINT `fk_referral_rewards_referral` FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 35. Table structure for table `ride_cancellations`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ride_cancellations`;
CREATE TABLE `ride_cancellations` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `cancelled_by` ENUM('Rider', 'Driver', 'Admin') NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `cancellation_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ride_cancellations_ride` (`ride_id`),
  CONSTRAINT `fk_ride_cancellations_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 36. Table structure for table `ride_fare_breakdown`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ride_fare_breakdown`;
CREATE TABLE `ride_fare_breakdown` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `base_fare` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `distance_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `time_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `waiting_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `surge_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ride_fare_breakdown_ride` (`ride_id`),
  CONSTRAINT `fk_ride_fare_breakdown_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 37. Table structure for table `ride_locations`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ride_locations`;
CREATE TABLE `ride_locations` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `pickup_address` TEXT NOT NULL,
  `pickup_lat` DECIMAL(10,7) NOT NULL,
  `pickup_lng` DECIMAL(10,7) NOT NULL,
  `drop_address` TEXT NOT NULL,
  `drop_lat` DECIMAL(10,7) NOT NULL,
  `drop_lng` DECIMAL(10,7) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ride_locations_ride` (`ride_id`),
  CONSTRAINT `fk_ride_locations_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 38. Table structure for table `ride_otp`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ride_otp`;
CREATE TABLE `ride_otp` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `otp` VARCHAR(6) NOT NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `verified_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ride_otp_ride_id` (`ride_id`),
  CONSTRAINT `fk_ride_otp_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 39. Table structure for table `ride_status_history`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ride_status_history`;
CREATE TABLE `ride_status_history` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `ride_status` ENUM('Searching', 'Driver Assigned', 'Driver Accepted', 'Driver Arriving', 'Driver Arrived', 'OTP Verified', 'Ride Started', 'Ride Completed', 'Cancelled') NOT NULL,
  `updated_by` ENUM('Rider', 'Driver', 'Admin', 'System') NOT NULL DEFAULT 'System',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ride_status_history_ride` (`ride_id`),
  CONSTRAINT `fk_ride_status_history_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 40. Table structure for table `ride_tracking`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `ride_tracking`;
CREATE TABLE `ride_tracking` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT NOT NULL,
  `driver_id` INT NOT NULL,
  `latitude` DECIMAL(10,7) NOT NULL,
  `longitude` DECIMAL(10,7) NOT NULL,
  `speed` DECIMAL(5,2) DEFAULT NULL,
  `heading` DECIMAL(5,2) DEFAULT NULL,
  `accuracy` DECIMAL(5,2) DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ride_tracking_ride` (`ride_id`),
  KEY `idx_ride_tracking_driver` (`driver_id`),
  CONSTRAINT `fk_ride_tracking_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ride_tracking_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 41. Table structure for table `service_zones`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `service_zones`;
CREATE TABLE `service_zones` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `city_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `boundary` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_zones_city` (`city_id`),
  CONSTRAINT `fk_service_zones_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 42. Table structure for table `sos_requests`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `sos_requests`;
CREATE TABLE `sos_requests` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `ride_id` BIGINT DEFAULT NULL,
  `rider_id` CHAR(36) NOT NULL,
  `driver_id` INT DEFAULT NULL,
  `latitude` DECIMAL(10,7) NOT NULL,
  `longitude` DECIMAL(10,7) NOT NULL,
  `emergency_message` TEXT DEFAULT NULL,
  `status` ENUM('Pending', 'Resolved') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sos_requests_ride` (`ride_id`),
  KEY `idx_sos_requests_rider` (`rider_id`),
  KEY `idx_sos_requests_driver` (`driver_id`),
  CONSTRAINT `fk_sos_requests_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sos_requests_rider` FOREIGN KEY (`rider_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sos_requests_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 43. Table structure for table `support_tickets`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('Open', 'Pending', 'Closed') NOT NULL DEFAULT 'Open',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_tickets_profile` (`profile_id`),
  CONSTRAINT `fk_support_tickets_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 44. Table structure for table `surge_pricing`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `surge_pricing`;
CREATE TABLE `surge_pricing` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `zone_id` INT NOT NULL,
  `multiplier` DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_surge_pricing_zone` (`zone_id`),
  CONSTRAINT `fk_surge_pricing_zone` FOREIGN KEY (`zone_id`) REFERENCES `service_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 45. Table structure for table `tax_settings`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `tax_settings`;
CREATE TABLE `tax_settings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 46. Table structure for table `vehicles`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `vehicle_brand` VARCHAR(50) NOT NULL,
  `vehicle_model` VARCHAR(50) NOT NULL,
  `manufacturing_year` YEAR NOT NULL,
  `vehicle_color` VARCHAR(30) DEFAULT NULL,
  `vehicle_number` VARCHAR(20) NOT NULL,
  `seating_capacity` INT DEFAULT 4,
  `fuel_type` VARCHAR(20) DEFAULT 'Petrol',
  `rc_number` VARCHAR(50) DEFAULT NULL,
  `verification_status` ENUM('Pending', 'Approved', 'Rejected', 'Resubmit Documents') NOT NULL DEFAULT 'Pending',
  `vehicle_type_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_vehicles_number` (`vehicle_number`),
  KEY `idx_vehicles_driver` (`driver_id`),
  CONSTRAINT `fk_vehicles_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 47. Table structure for table `vehicle_documents`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `vehicle_documents`;
CREATE TABLE `vehicle_documents` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `vehicle_id` INT NOT NULL,
  `rc_book_photo` VARCHAR(255) DEFAULT NULL,
  `insurance_photo` VARCHAR(255) DEFAULT NULL,
  `permit_photo` VARCHAR(255) DEFAULT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_documents_vehicle` (`vehicle_id`),
  CONSTRAINT `fk_vehicle_documents_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 48. Table structure for table `vehicle_images`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `vehicle_images`;
CREATE TABLE `vehicle_images` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `vehicle_id` INT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_images_vehicle` (`vehicle_id`),
  CONSTRAINT `fk_vehicle_images_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 49. Table structure for table `vehicle_maintenance`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `vehicle_maintenance`;
CREATE TABLE `vehicle_maintenance` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `vehicle_id` INT NOT NULL,
  `description` TEXT NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `maintenance_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_maintenance_vehicle` (`vehicle_id`),
  CONSTRAINT `fk_vehicle_maintenance_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 50. Table structure for table `vehicle_types`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `vehicle_types`;
CREATE TABLE `vehicle_types` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `base_fare` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `per_km_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `per_min_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 51. Table structure for table `wallets`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `profile_id` CHAR(36) NOT NULL,
  `wallet_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `wallet_status` ENUM('Active', 'Blocked') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wallets_profile_id` (`profile_id`),
  CONSTRAINT `fk_wallets_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 52. Table structure for table `wallet_transactions`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `wallet_transactions`;
CREATE TABLE `wallet_transactions` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `wallet_id` BIGINT NOT NULL,
  `ride_id` BIGINT DEFAULT NULL,
  `transaction_type` ENUM('Credit', 'Debit') NOT NULL DEFAULT 'Credit',
  `amount` DECIMAL(12,2) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_transactions_wallet` (`wallet_id`),
  KEY `idx_wallet_transactions_ride` (`ride_id`),
  CONSTRAINT `fk_wallet_transactions_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transactions_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- 53. Table structure for table `withdrawal_requests`
-- ------------------------------------------------------
DROP TABLE IF EXISTS `withdrawal_requests`;
CREATE TABLE `withdrawal_requests` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `driver_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_withdrawal_requests_driver` (`driver_id`),
  CONSTRAINT `fk_withdrawal_requests_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------
-- Triggers for automatic generation of driver_code
-- ------------------------------------------------------
DROP TRIGGER IF EXISTS `before_driver_profile_insert`;
DELIMITER $$
CREATE TRIGGER `before_driver_profile_insert`
BEFORE INSERT ON `driver_profiles`
FOR EACH ROW
BEGIN
    IF NEW.`driver_code` IS NULL OR NEW.`driver_code` = '' THEN
        SET NEW.`driver_code` = CONCAT('DRV-', UPPER(SUBSTRING(MD5(RAND()), 1, 9)));
    END IF;
END$$
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
