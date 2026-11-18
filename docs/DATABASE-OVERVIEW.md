# قاعدة بيانات Gilgamish Smart

فحص مباشر لبنية قاعدة `gilgamish`. الأعداد تمثل وقت الفحص.

## budget_items

عدد السجلات: **66**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| budget_id | char(36) | MUL | NO |
| category | varchar(40) | — | NO |
| amount | decimal(14,2) | — | NO |
| source_type | varchar(30) | — | NO |
| is_estimated | tinyint(1) | — | NO |

## budgets

عدد السجلات: **11**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| travel_plan_id | char(36) | UNI | NO |
| total_budget | decimal(14,2) | — | NO |
| estimated_total | decimal(14,2) | — | NO |
| remaining_budget | decimal(14,2) | — | NO |
| currency | char(3) | — | NO |
| unknown_activity_count | int | — | NO |

## contact_messages

عدد السجلات: **0**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| name | varchar(100) | — | NO |
| email | varchar(254) | — | NO |
| subject | varchar(150) | — | NO |
| message | text | — | NO |
| created_at | timestamp | — | NO |

## favorites

عدد السجلات: **0**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| user_id | char(36) | PRI | NO |
| travel_plan_id | char(36) | PRI | NO |
| created_at | timestamp | — | NO |

## itinerary_days

عدد السجلات: **59**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| travel_plan_id | char(36) | MUL | NO |
| day_number | smallint | — | NO |
| travel_date | date | — | NO |

## itinerary_items

عدد السجلات: **178**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| itinerary_day_id | char(36) | MUL | NO |
| external_place_id | varchar(255) | — | NO |
| provider | varchar(20) | — | NO |
| start_time | time | — | NO |
| end_time | time | — | NO |
| notes | text | — | NO |
| order_index | smallint | — | NO |
| fixture_snapshot_json | json | — | YES |

## selected_flights

عدد السجلات: **11**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| travel_plan_id | char(36) | PRI | NO |
| provider | varchar(20) | — | NO |
| provider_offer_id | varchar(100) | — | NO |
| price | decimal(14,2) | — | NO |
| currency | char(3) | — | NO |
| snapshot_json | json | — | NO |

## selected_hotels

عدد السجلات: **11**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| travel_plan_id | char(36) | PRI | NO |
| provider | varchar(20) | — | NO |
| provider_hotel_id | varchar(100) | — | NO |
| price | decimal(14,2) | — | NO |
| currency | char(3) | — | NO |
| snapshot_json | json | — | NO |

## sessions

عدد السجلات: **1**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| token_hash | char(64) | PRI | NO |
| user_id | char(36) | MUL | NO |
| csrf_token | char(64) | — | NO |
| expires_at | datetime | MUL | NO |
| created_at | timestamp | — | NO |

## travel_plans

عدد السجلات: **11**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| trip_id | char(36) | MUL | NO |
| version | int | — | NO |
| title | varchar(200) | — | NO |
| is_selected | tinyint(1) | — | NO |
| is_saved | tinyint(1) | — | NO |
| provider_mode | varchar(10) | — | NO |
| input_snapshot_json | json | — | NO |
| warnings_json | json | — | NO |
| created_at | timestamp | — | NO |

## trip_interests

عدد السجلات: **16**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| trip_id | char(36) | PRI | NO |
| interest | varchar(40) | PRI | NO |

## trip_preferences

عدد السجلات: **4**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| trip_id | char(36) | PRI | NO |
| flight_option | varchar(20) | — | NO |
| direct_preferred | tinyint(1) | — | NO |
| hotel_stars | tinyint | — | NO |
| trip_pace | varchar(20) | — | NO |
| food_daily | decimal(14,2) | — | NO |
| transport_daily | decimal(14,2) | — | NO |
| other_costs | decimal(14,2) | — | NO |

## trips

عدد السجلات: **4**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| user_id | char(36) | MUL | NO |
| origin | varchar(120) | — | NO |
| destination | varchar(120) | — | NO |
| origin_code | char(3) | — | NO |
| destination_code | char(3) | — | NO |
| start_date | date | — | NO |
| end_date | date | — | NO |
| adults | tinyint | — | NO |
| children | tinyint | — | NO |
| total_budget | decimal(14,2) | — | NO |
| currency | char(3) | — | NO |
| language | char(2) | — | NO |
| status | varchar(20) | — | NO |
| next_version | int | — | NO |
| created_at | timestamp | — | NO |
| updated_at | timestamp | — | NO |

## user_interests

عدد السجلات: **0**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| user_id | char(36) | PRI | NO |
| interest | varchar(40) | PRI | NO |

## user_preferences

عدد السجلات: **1**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| user_id | char(36) | PRI | NO |
| hotel_stars | tinyint | — | NO |
| flight_option | varchar(20) | — | NO |
| trip_pace | varchar(20) | — | NO |
| default_currency | char(3) | — | NO |

## users

عدد السجلات: **1**

| العمود | النوع | المفتاح | يقبل قيمة فارغة |
|---|---|---|---|
| id | char(36) | PRI | NO |
| name | varchar(100) | — | NO |
| email | varchar(254) | UNI | NO |
| password_hash | varchar(255) | — | NO |
| preferred_language | varchar(2) | — | NO |
| created_at | timestamp | — | NO |
| updated_at | timestamp | — | NO |

## العلاقات

- `budget_items.budget_id` → `budgets.id`
- `budgets.travel_plan_id` → `travel_plans.id`
- `favorites.user_id` → `users.id`
- `favorites.travel_plan_id` → `travel_plans.id`
- `itinerary_days.travel_plan_id` → `travel_plans.id`
- `itinerary_items.itinerary_day_id` → `itinerary_days.id`
- `selected_flights.travel_plan_id` → `travel_plans.id`
- `selected_hotels.travel_plan_id` → `travel_plans.id`
- `sessions.user_id` → `users.id`
- `travel_plans.trip_id` → `trips.id`
- `trip_interests.trip_id` → `trips.id`
- `trip_preferences.trip_id` → `trips.id`
- `trips.user_id` → `users.id`
- `user_interests.user_id` → `users.id`
- `user_preferences.user_id` → `users.id`
