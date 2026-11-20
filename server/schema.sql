CREATE TABLE IF NOT EXISTS schools (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS majors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  UNIQUE KEY school_major (school_id, name)
);

CREATE TABLE IF NOT EXISTS classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id BIGINT UNSIGNED NOT NULL,
  major_id BIGINT UNSIGNED NOT NULL,
  cohort VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  UNIQUE KEY school_class (school_id, major_id, cohort, name)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  nickname VARCHAR(80) NOT NULL,
  real_name_cipher TEXT NOT NULL,
  password_hash VARCHAR(220) NOT NULL,
  role ENUM('student','school_admin','system_admin') NOT NULL DEFAULT 'student',
  school_id BIGINT UNSIGNED NULL,
  school_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
  avatar_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY school_review (school_id, school_status, id)
);

CREATE TABLE IF NOT EXISTS class_members (
  class_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL,
  origin ENUM('application','precreated') NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  PRIMARY KEY (class_id, user_id),
  KEY user_classes (user_id, status, class_id)
);

CREATE TABLE IF NOT EXISTS class_admins (
  class_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (class_id, user_id),
  KEY admin_classes (user_id, class_id)
);

CREATE TABLE IF NOT EXISTS review_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  school_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NULL,
  decision VARCHAR(24) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY user_reviews (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS files (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  school_id BIGINT UNSIGNED NULL,
  class_id BIGINT UNSIGNED NULL,
  kind ENUM('avatar','material') NOT NULL,
  object_path VARCHAR(160) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(160) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY school_files (school_id, kind, created_at)
);

CREATE TABLE IF NOT EXISTS student_state (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
