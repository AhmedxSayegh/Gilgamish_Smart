CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  preferred_language VARCHAR(2) NOT NULL DEFAULT 'en',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  csrf_token CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE TABLE IF NOT EXISTS user_preferences (
  user_id CHAR(36) PRIMARY KEY,
  hotel_stars TINYINT NOT NULL DEFAULT 3,
  flight_option VARCHAR(20) NOT NULL DEFAULT 'cheapest',
  trip_pace VARCHAR(20) NOT NULL DEFAULT 'balanced',
  default_currency CHAR(3) NOT NULL DEFAULT 'SAR',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_interests (
  user_id CHAR(36) NOT NULL,
  interest VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, interest),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trips (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  origin VARCHAR(120) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  origin_code CHAR(3) NOT NULL,
  destination_code CHAR(3) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  adults TINYINT NOT NULL,
  children TINYINT NOT NULL DEFAULT 0,
  total_budget DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  language CHAR(2) NOT NULL DEFAULT 'en',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  next_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (end_date > start_date),
  CHECK (adults >= 1 AND adults + children <= 9),
  CHECK (total_budget > 0),
  INDEX (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trip_preferences (
  trip_id CHAR(36) PRIMARY KEY,
  flight_option VARCHAR(20) NOT NULL,
  direct_preferred BOOLEAN NOT NULL,
  hotel_stars TINYINT NOT NULL,
  trip_pace VARCHAR(20) NOT NULL,
  food_daily DECIMAL(14,2) NOT NULL,
  transport_daily DECIMAL(14,2) NOT NULL,
  other_costs DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trip_interests (
  trip_id CHAR(36) NOT NULL,
  interest VARCHAR(40) NOT NULL,
  PRIMARY KEY (trip_id, interest),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS travel_plans (
  id CHAR(36) PRIMARY KEY,
  trip_id CHAR(36) NOT NULL,
  version INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT TRUE,
  is_saved BOOLEAN NOT NULL DEFAULT TRUE,
  provider_mode VARCHAR(10) NOT NULL,
  input_snapshot_json JSON NOT NULL,
  warnings_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trip_id, version),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS itinerary_days (
  id CHAR(36) PRIMARY KEY,
  travel_plan_id CHAR(36) NOT NULL,
  day_number SMALLINT NOT NULL,
  travel_date DATE NOT NULL,
  UNIQUE (travel_plan_id, day_number),
  FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS itinerary_items (
  id CHAR(36) PRIMARY KEY,
  itinerary_day_id CHAR(36) NOT NULL,
  external_place_id VARCHAR(255) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT NOT NULL,
  order_index SMALLINT NOT NULL,
  fixture_snapshot_json JSON NULL,
  FOREIGN KEY (itinerary_day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE,
  CHECK (end_time > start_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS selected_flights (
  travel_plan_id CHAR(36) PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  provider_offer_id VARCHAR(100) NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  snapshot_json JSON NOT NULL,
  FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS selected_hotels (
  travel_plan_id CHAR(36) PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  provider_hotel_id VARCHAR(100) NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  snapshot_json JSON NOT NULL,
  FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budgets (
  id CHAR(36) PRIMARY KEY,
  travel_plan_id CHAR(36) NOT NULL UNIQUE,
  total_budget DECIMAL(14,2) NOT NULL,
  estimated_total DECIMAL(14,2) NOT NULL,
  remaining_budget DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  unknown_activity_count INT NOT NULL,
  FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_items (
  id CHAR(36) PRIMARY KEY,
  budget_id CHAR(36) NOT NULL,
  category VARCHAR(40) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  is_estimated BOOLEAN NOT NULL,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  user_id CHAR(36) NOT NULL,
  travel_plan_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, travel_plan_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (travel_plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_messages (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  subject VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
