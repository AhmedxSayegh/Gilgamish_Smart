-- Schema snapshot only. No user records.
CREATE TABLE `budget_items` (
  `id` char(36) NOT NULL,
  `budget_id` char(36) NOT NULL,
  `category` varchar(40) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `source_type` varchar(30) NOT NULL,
  `is_estimated` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `budget_id` (`budget_id`),
  CONSTRAINT `budget_items_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `budgets` (
  `id` char(36) NOT NULL,
  `travel_plan_id` char(36) NOT NULL,
  `total_budget` decimal(14,2) NOT NULL,
  `estimated_total` decimal(14,2) NOT NULL,
  `remaining_budget` decimal(14,2) NOT NULL,
  `currency` char(3) NOT NULL,
  `unknown_activity_count` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_plan_id` (`travel_plan_id`),
  CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`travel_plan_id`) REFERENCES `travel_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `contact_messages` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(254) NOT NULL,
  `subject` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `favorites` (
  `user_id` char(36) NOT NULL,
  `travel_plan_id` char(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`travel_plan_id`),
  KEY `travel_plan_id` (`travel_plan_id`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`travel_plan_id`) REFERENCES `travel_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `itinerary_days` (
  `id` char(36) NOT NULL,
  `travel_plan_id` char(36) NOT NULL,
  `day_number` smallint NOT NULL,
  `travel_date` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_plan_id` (`travel_plan_id`,`day_number`),
  CONSTRAINT `itinerary_days_ibfk_1` FOREIGN KEY (`travel_plan_id`) REFERENCES `travel_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `itinerary_items` (
  `id` char(36) NOT NULL,
  `itinerary_day_id` char(36) NOT NULL,
  `external_place_id` varchar(255) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `notes` text NOT NULL,
  `order_index` smallint NOT NULL,
  `fixture_snapshot_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `itinerary_day_id` (`itinerary_day_id`),
  CONSTRAINT `itinerary_items_ibfk_1` FOREIGN KEY (`itinerary_day_id`) REFERENCES `itinerary_days` (`id`) ON DELETE CASCADE,
  CONSTRAINT `itinerary_items_chk_1` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `selected_flights` (
  `travel_plan_id` char(36) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `provider_offer_id` varchar(100) NOT NULL,
  `price` decimal(14,2) NOT NULL,
  `currency` char(3) NOT NULL,
  `snapshot_json` json NOT NULL,
  PRIMARY KEY (`travel_plan_id`),
  CONSTRAINT `selected_flights_ibfk_1` FOREIGN KEY (`travel_plan_id`) REFERENCES `travel_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `selected_hotels` (
  `travel_plan_id` char(36) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `provider_hotel_id` varchar(100) NOT NULL,
  `price` decimal(14,2) NOT NULL,
  `currency` char(3) NOT NULL,
  `snapshot_json` json NOT NULL,
  PRIMARY KEY (`travel_plan_id`),
  CONSTRAINT `selected_hotels_ibfk_1` FOREIGN KEY (`travel_plan_id`) REFERENCES `travel_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sessions` (
  `token_hash` char(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  `csrf_token` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_hash`),
  KEY `expires_at` (`expires_at`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `travel_plans` (
  `id` char(36) NOT NULL,
  `trip_id` char(36) NOT NULL,
  `version` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `is_selected` tinyint(1) NOT NULL DEFAULT '1',
  `is_saved` tinyint(1) NOT NULL DEFAULT '1',
  `provider_mode` varchar(10) NOT NULL,
  `input_snapshot_json` json NOT NULL,
  `warnings_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_id` (`trip_id`,`version`),
  CONSTRAINT `travel_plans_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `trip_interests` (
  `trip_id` char(36) NOT NULL,
  `interest` varchar(40) NOT NULL,
  PRIMARY KEY (`trip_id`,`interest`),
  CONSTRAINT `trip_interests_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `trip_preferences` (
  `trip_id` char(36) NOT NULL,
  `flight_option` varchar(20) NOT NULL,
  `direct_preferred` tinyint(1) NOT NULL,
  `hotel_stars` tinyint NOT NULL,
  `trip_pace` varchar(20) NOT NULL,
  `food_daily` decimal(14,2) NOT NULL,
  `transport_daily` decimal(14,2) NOT NULL,
  `other_costs` decimal(14,2) NOT NULL,
  PRIMARY KEY (`trip_id`),
  CONSTRAINT `trip_preferences_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `trips` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `origin` varchar(120) NOT NULL,
  `destination` varchar(120) NOT NULL,
  `origin_code` char(3) NOT NULL,
  `destination_code` char(3) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `adults` tinyint NOT NULL,
  `children` tinyint NOT NULL DEFAULT '0',
  `total_budget` decimal(14,2) NOT NULL,
  `currency` char(3) NOT NULL,
  `language` char(2) NOT NULL DEFAULT 'en',
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `next_version` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`,`created_at`),
  CONSTRAINT `trips_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trips_chk_1` CHECK ((`end_date` > `start_date`)),
  CONSTRAINT `trips_chk_2` CHECK (((`adults` >= 1) and ((`adults` + `children`) <= 9))),
  CONSTRAINT `trips_chk_3` CHECK ((`total_budget` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_interests` (
  `user_id` char(36) NOT NULL,
  `interest` varchar(40) NOT NULL,
  PRIMARY KEY (`user_id`,`interest`),
  CONSTRAINT `user_interests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_preferences` (
  `user_id` char(36) NOT NULL,
  `hotel_stars` tinyint NOT NULL DEFAULT '3',
  `flight_option` varchar(20) NOT NULL DEFAULT 'cheapest',
  `trip_pace` varchar(20) NOT NULL DEFAULT 'balanced',
  `default_currency` char(3) NOT NULL DEFAULT 'SAR',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(254) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `preferred_language` varchar(2) NOT NULL DEFAULT 'en',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

