-- ============================================================
-- APPOINTIFY — Premium Appointment Booking Platform
-- Normalized MySQL / MariaDB Schema
-- InnoDB · utf8mb4 · Foreign Keys · Constraints · Timestamps
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. users  (auth + role base)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(190) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('admin','provider','customer') NOT NULL DEFAULT 'customer',
  phone           VARCHAR(30)  DEFAULT NULL,
  avatar_url      VARCHAR(500) DEFAULT NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  email_verified  TINYINT(1)   NOT NULL DEFAULT 0,
  last_login_at   DATETIME     DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. customer_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_profiles (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  date_of_birth DATE DEFAULT NULL,
  gender        ENUM('female','male','other','prefer_not_to_say') DEFAULT NULL,
  address       VARCHAR(255) DEFAULT NULL,
  city          VARCHAR(100) DEFAULT NULL,
  country       VARCHAR(100) DEFAULT NULL,
  notes         TEXT DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_user (user_id),
  CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. service_categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  image_url   VARCHAR(500) DEFAULT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. provider_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_profiles (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  headline        VARCHAR(180) DEFAULT NULL,
  bio             TEXT DEFAULT NULL,
  specialization  VARCHAR(150) DEFAULT NULL,
  experience_years SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  rating_avg       DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count     INT UNSIGNED NOT NULL DEFAULT 0,
  hourly_rate      DECIMAL(10,2) DEFAULT NULL,
  approval_status  ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  is_featured      TINYINT(1) NOT NULL DEFAULT 0,
  license_number   VARCHAR(100) DEFAULT NULL,
  location         VARCHAR(190) DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider_user (user_id),
  KEY idx_provider_approval (approval_status),
  CONSTRAINT fk_provider_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. services
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id  INT UNSIGNED NOT NULL,
  provider_id  INT UNSIGNED DEFAULT NULL,   -- NULL = platform-wide service
  name         VARCHAR(160) NOT NULL,
  slug         VARCHAR(180) NOT NULL,
  description  TEXT DEFAULT NULL,
  duration_min SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image_url    VARCHAR(500) DEFAULT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_slug (slug),
  KEY idx_service_category (category_id),
  KEY idx_service_provider (provider_id),
  KEY idx_service_active (is_active),
  CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_service_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. provider_services  (many ↔ many)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_services (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id  INT UNSIGNED NOT NULL,
  service_id   INT UNSIGNED NOT NULL,
  custom_price DECIMAL(10,2) DEFAULT NULL,
  custom_duration SMALLINT UNSIGNED DEFAULT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider_service (provider_id, service_id),
  KEY idx_ps_service (service_id),
  CONSTRAINT fk_ps_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_service  FOREIGN KEY (service_id)  REFERENCES services(id)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. provider_availability  (weekly working hours)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_availability (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id  INT UNSIGNED NOT NULL,
  day_of_week  TINYINT UNSIGNED NOT NULL,   -- 0 = Sunday … 6 = Saturday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  slot_interval_min SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_availability_slot (provider_id, day_of_week, start_time),
  CONSTRAINT fk_availability_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_dow CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. unavailable_dates  (holidays / blocked days)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unavailable_dates (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id INT UNSIGNED NOT NULL,
  unavailable_date DATE NOT NULL,
  reason      VARCHAR(255) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unavailable (provider_id, unavailable_date),
  CONSTRAINT fk_unavailable_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. appointments
--    UNIQUE KEY blocks double-booking of the exact same slot.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference       VARCHAR(24)  NOT NULL,
  customer_id     INT UNSIGNED NOT NULL,
  provider_id     INT UNSIGNED NOT NULL,
  service_id      INT UNSIGNED NOT NULL,
  start_at        DATETIME     NOT NULL,
  end_at          DATETIME     NOT NULL,
  status          ENUM('pending','confirmed','completed','cancelled','rejected','no_show')
                  NOT NULL DEFAULT 'pending',
  status_reason   VARCHAR(255) DEFAULT NULL,
  notes           TEXT DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointment_reference (reference),
  -- prevents two active bookings occupying the identical slot
  UNIQUE KEY uq_provider_slot (provider_id, start_at, status),
  KEY idx_appt_customer (customer_id),
  KEY idx_appt_provider (provider_id),
  KEY idx_appt_service (service_id),
  KEY idx_appt_start (start_at),
  KEY idx_appt_status (status),
  CONSTRAINT fk_appt_customer FOREIGN KEY (customer_id) REFERENCES users(id)        ON DELETE CASCADE,
  CONSTRAINT fk_appt_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_service  FOREIGN KEY (service_id)  REFERENCES services(id)      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id  INT UNSIGNED NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(8) NOT NULL DEFAULT 'USD',
  method          ENUM('stripe','card','cash','wallet') NOT NULL DEFAULT 'card',
  status          ENUM('pending','paid','failed','refunded','partially_refunded')
                  NOT NULL DEFAULT 'pending',
  transaction_ref VARCHAR(120) DEFAULT NULL,
  stripe_payment_intent VARCHAR(120) DEFAULT NULL,
  paid_at         DATETIME DEFAULT NULL,
  refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payment_appointment (appointment_id),
  KEY idx_payment_status (status),
  KEY idx_payment_ref (transaction_ref),
  CONSTRAINT fk_payment_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. reviews
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id INT UNSIGNED NOT NULL,
  customer_id    INT UNSIGNED NOT NULL,
  provider_id    INT UNSIGNED NOT NULL,
  service_id     INT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  comment       TEXT DEFAULT NULL,
  response       TEXT DEFAULT NULL,
  is_visible     TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_appointment (appointment_id),
  KEY idx_review_provider (provider_id),
  KEY idx_review_rating (rating),
  CONSTRAINT fk_review_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_customer FOREIGN KEY (customer_id) REFERENCES users(id)            ON DELETE CASCADE,
  CONSTRAINT fk_review_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_service  FOREIGN KEY (service_id)  REFERENCES services(id)          ON DELETE CASCADE,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 12. notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(190) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  type       ENUM('info','success','warning','appointment','payment','system')
             NOT NULL DEFAULT 'info',
  link       VARCHAR(255) DEFAULT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
