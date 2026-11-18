import { randomUUID } from "node:crypto";
import { placeSnapshot } from "./placeSnapshot.js";
import { missing } from "../utils/errors.js";
const json = (value) => (typeof value === "string" ? JSON.parse(value) : value);
const publicUser = (r) =>
  r && {
    id: r.id,
    name: r.name,
    email: r.email,
    language: r.preferred_language,
    createdAt: r.created_at,
  };

export class MysqlRepository {
  constructor(pool) {
    this.pool = pool;
  }
  async query(sql, args = [], db = this.pool) {
    const [rows] = await db.execute(sql, args);
    return rows;
  }
  async transaction(work) {
    const db = await this.pool.getConnection();
    try {
      await db.beginTransaction();
      const result = await work(db);
      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }
  async ping() {
    await this.query("SELECT 1");
  }
  async createUser({ name, email, passwordHash, language }) {
    const id = randomUUID();
    await this.transaction(async (db) => {
      await this.query(
        "INSERT INTO users(id,name,email,password_hash,preferred_language) VALUES(?,?,?,?,?)",
        [id, name, email, passwordHash, language],
        db,
      );
      await this.query(
        "INSERT INTO user_preferences(user_id) VALUES(?)",
        [id],
        db,
      );
    });
    return this.getUser(id);
  }
  async getUser(id) {
    return publicUser(
      (await this.query("SELECT * FROM users WHERE id=?", [id]))[0],
    );
  }
  async getUserByEmail(email) {
    const row = (
      await this.query("SELECT * FROM users WHERE email=?", [email])
    )[0];
    return row && { ...publicUser(row), passwordHash: row.password_hash };
  }
  async updateUser(id, patch) {
    const user = await this.getUser(id);
    await this.query(
      "UPDATE users SET name=?,preferred_language=? WHERE id=?",
      [patch.name ?? user.name, patch.language ?? user.language, id],
    );
    return this.getUser(id);
  }
  async getPreferences(userId) {
    const p = (
      await this.query("SELECT * FROM user_preferences WHERE user_id=?", [
        userId,
      ])
    )[0];
    return {
      hotelStars: p.hotel_stars,
      flightOption: p.flight_option,
      pace: p.trip_pace,
      currency: p.default_currency,
      interests: (
        await this.query(
          "SELECT interest FROM user_interests WHERE user_id=?",
          [userId],
        )
      ).map((r) => r.interest),
    };
  }
  async setPreferences(userId, p) {
    await this.transaction(async (db) => {
      await this.query(
        "UPDATE user_preferences SET hotel_stars=?,flight_option=?,trip_pace=?,default_currency=? WHERE user_id=?",
        [p.hotelStars, p.flightOption, p.pace, p.currency, userId],
        db,
      );
      await this.query(
        "DELETE FROM user_interests WHERE user_id=?",
        [userId],
        db,
      );
      for (const interest of new Set(p.interests))
        await this.query(
          "INSERT INTO user_interests(user_id,interest) VALUES(?,?)",
          [userId, interest],
          db,
        );
    });
    return this.getPreferences(userId);
  }
  async createSession(s) {
    await this.query("DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()");
    await this.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,?)",
      [s.tokenHash, s.userId, s.csrfToken, s.expiresAt],
    );
  }
  async getSession(hash) {
    const s = (
      await this.query(
        "SELECT * FROM sessions WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()",
        [hash],
      )
    )[0];
    return s && { userId: s.user_id, csrfToken: s.csrf_token };
  }
  async deleteSession(hash) {
    await this.query("DELETE FROM sessions WHERE token_hash=?", [hash]);
  }
  async createTrip(userId, t) {
    const id = randomUUID();
    await this.transaction(async (db) => {
      await this.query(
        "INSERT INTO trips(id,user_id,origin,destination,origin_code,destination_code,start_date,end_date,adults,children,total_budget,currency,language) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          userId,
          t.origin,
          t.destination,
          t.originCode,
          t.destinationCode,
          t.startDate,
          t.endDate,
          t.adults,
          t.children,
          t.totalBudget,
          t.currency,
          t.language,
        ],
        db,
      );
      await this.saveTripPreferences(db, id, t);
    });
    return this.getTrip(userId, id);
  }
  async saveTripPreferences(db, id, t) {
    const p = t.preferences;
    await this.query(
      "INSERT INTO trip_preferences(trip_id,flight_option,direct_preferred,hotel_stars,trip_pace,food_daily,transport_daily,other_costs) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE flight_option=VALUES(flight_option),direct_preferred=VALUES(direct_preferred),hotel_stars=VALUES(hotel_stars),trip_pace=VALUES(trip_pace),food_daily=VALUES(food_daily),transport_daily=VALUES(transport_daily),other_costs=VALUES(other_costs)",
      [
        id,
        p.flightOption,
        p.directPreferred,
        p.hotelStars,
        p.pace,
        p.foodDaily,
        p.transportDaily,
        p.otherCosts,
      ],
      db,
    );
    await this.query("DELETE FROM trip_interests WHERE trip_id=?", [id], db);
    for (const interest of t.interests)
      await this.query(
        "INSERT INTO trip_interests(trip_id,interest) VALUES(?,?)",
        [id, interest],
        db,
      );
  }
  async getTrip(userId, id) {
    const r = (
      await this.query(
        "SELECT t.*,p.* FROM trips t JOIN trip_preferences p ON p.trip_id=t.id WHERE t.id=? AND t.user_id=?",
        [id, userId],
      )
    )[0];
    if (!r) throw missing();
    return {
      id: r.id,
      origin: r.origin,
      destination: r.destination,
      originCode: r.origin_code,
      destinationCode: r.destination_code,
      startDate: r.start_date,
      endDate: r.end_date,
      adults: r.adults,
      children: r.children,
      totalBudget: r.total_budget,
      currency: r.currency,
      language: r.language,
      status: r.status,
      createdAt: r.created_at,
      interests: (
        await this.query(
          "SELECT interest FROM trip_interests WHERE trip_id=?",
          [id],
        )
      ).map((x) => x.interest),
      preferences: {
        flightOption: r.flight_option,
        directPreferred: !!r.direct_preferred,
        hotelStars: r.hotel_stars,
        pace: r.trip_pace,
        foodDaily: r.food_daily,
        transportDaily: r.transport_daily,
        otherCosts: r.other_costs,
      },
      plans: await this.query(
        "SELECT id,version,title,is_selected AS isSelected,is_saved AS isSaved,created_at AS createdAt FROM travel_plans WHERE trip_id=? ORDER BY version DESC",
        [id],
      ),
    };
  }
  async listTrips(userId) {
    const rows = await this.query(
      "SELECT id FROM trips WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      [userId],
    );
    return Promise.all(rows.map((r) => this.getTrip(userId, r.id)));
  }
  async updateTrip(userId, id, t) {
    await this.transaction(async (db) => {
      const rows = await this.query(
        "SELECT id FROM trips WHERE id=? AND user_id=? FOR UPDATE",
        [id, userId],
        db,
      );
      if (!rows.length) throw missing();
      await this.query(
        "UPDATE trips SET origin=?,destination=?,origin_code=?,destination_code=?,start_date=?,end_date=?,adults=?,children=?,total_budget=?,currency=?,language=?,status=? WHERE id=?",
        [
          t.origin,
          t.destination,
          t.originCode,
          t.destinationCode,
          t.startDate,
          t.endDate,
          t.adults,
          t.children,
          t.totalBudget,
          t.currency,
          t.language,
          "draft",
          id,
        ],
        db,
      );
      await this.saveTripPreferences(db, id, t);
    });
    return this.getTrip(userId, id);
  }
  async deleteTrip(userId, id) {
    const result = await this.query(
      "DELETE FROM trips WHERE id=? AND user_id=?",
      [id, userId],
    );
    if (!result.affectedRows) throw missing();
  }
  async createPlan(userId, tripId, plan) {
    const id = randomUUID();
    await this.transaction(async (db) => {
      const trip = (
        await this.query(
          "SELECT id,next_version FROM trips WHERE id=? AND user_id=? FOR UPDATE",
          [tripId, userId],
          db,
        )
      )[0];
      if (!trip) throw missing();
      await this.query(
        "UPDATE travel_plans SET is_selected=FALSE WHERE trip_id=?",
        [tripId],
        db,
      );
      await this.query(
        "INSERT INTO travel_plans(id,trip_id,version,title,provider_mode,input_snapshot_json,warnings_json) VALUES(?,?,?,?,?,?,?)",
        [
          id,
          tripId,
          trip.next_version,
          plan.title,
          plan.mode,
          JSON.stringify(plan.input),
          JSON.stringify(plan.agent ? { items: plan.warnings, agent: plan.agent } : plan.warnings),
        ],
        db,
      );
      for (const day of plan.days) {
        const dayId = randomUUID();
        await this.query(
          "INSERT INTO itinerary_days(id,travel_plan_id,day_number,travel_date) VALUES(?,?,?,?)",
          [dayId, id, day.dayNumber, day.date],
          db,
        );
        for (const [index, item] of day.items.entries()) {
          await this.query(
            "INSERT INTO itinerary_items(id,itinerary_day_id,external_place_id,provider,start_time,end_time,notes,order_index,fixture_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?)",
            [
              randomUUID(),
              dayId,
              item.placeId,
              item.place.provider,
              item.startTime,
              item.endTime,
              item.reason,
              index,
              placeSnapshot(item.place),
            ],
            db,
          );
        }
      }
      await this.query(
        "INSERT INTO selected_flights(travel_plan_id,provider,provider_offer_id,price,currency,snapshot_json) VALUES(?,?,?,?,?,?)",
        [
          id,
          plan.flight.provider,
          plan.flight.providerOfferId,
          plan.flight.price,
          plan.flight.currency,
          JSON.stringify(plan.flight),
        ],
        db,
      );
      await this.query(
        "INSERT INTO selected_hotels(travel_plan_id,provider,provider_hotel_id,price,currency,snapshot_json) VALUES(?,?,?,?,?,?)",
        [
          id,
          plan.hotel.provider,
          plan.hotel.providerHotelId,
          plan.hotel.price,
          plan.hotel.currency,
          JSON.stringify(plan.hotel),
        ],
        db,
      );
      const budgetId = randomUUID(),
        b = plan.budget;
      await this.query(
        "INSERT INTO budgets(id,travel_plan_id,total_budget,estimated_total,remaining_budget,currency,unknown_activity_count) VALUES(?,?,?,?,?,?,?)",
        [
          budgetId,
          id,
          b.totalBudget,
          b.totalCost,
          b.remainingBudget,
          b.currency,
          b.unknownActivityCount,
        ],
        db,
      );
      for (const item of b.items)
        await this.query(
          "INSERT INTO budget_items(id,budget_id,category,amount,source_type,is_estimated) VALUES(?,?,?,?,?,?)",
          [
            randomUUID(),
            budgetId,
            item.category,
            item.amount,
            item.sourceType,
            item.isEstimated,
          ],
          db,
        );
      await this.query(
        "UPDATE trips SET next_version=next_version+1,status=? WHERE id=?",
        ["planned", tripId],
        db,
      );
    });
    return this.getPlan(userId, id);
  }
  async getPlan(userId, id) {
    const r = (
      await this.query(
        "SELECT p.*,EXISTS(SELECT 1 FROM favorites f WHERE f.travel_plan_id=p.id AND f.user_id=?) AS favorite FROM travel_plans p JOIN trips t ON p.trip_id=t.id WHERE p.id=? AND t.user_id=?",
        [userId, id, userId],
      )
    )[0];
    if (!r) throw missing();
    const [flightRows, hotelRows, days, budgetRows] = await Promise.all([
      this.query(
        "SELECT snapshot_json FROM selected_flights WHERE travel_plan_id=?",
        [id],
      ),
      this.query(
        "SELECT snapshot_json FROM selected_hotels WHERE travel_plan_id=?",
        [id],
      ),
      this.query(
        "SELECT * FROM itinerary_days WHERE travel_plan_id=? ORDER BY day_number",
        [id],
      ),
      this.query("SELECT * FROM budgets WHERE travel_plan_id=?", [id]),
    ]);
    const b = budgetRows[0];
    return {
      id: r.id,
      tripId: r.trip_id,
      version: r.version,
      title: r.title,
      isSelected: !!r.is_selected,
      isSaved: !!r.is_saved,
      isFavorite: !!r.favorite,
      mode: r.provider_mode,
      createdAt: r.created_at,
      input: json(r.input_snapshot_json),
      warnings: Array.isArray(json(r.warnings_json)) ? json(r.warnings_json) : json(r.warnings_json).items || [],
      agent: Array.isArray(json(r.warnings_json)) ? null : json(r.warnings_json).agent || null,
      flight: json(flightRows[0].snapshot_json),
      hotel: json(hotelRows[0].snapshot_json),
      days: await Promise.all(
        days.map(async (d) => ({
          dayNumber: d.day_number,
          date: d.travel_date,
          items: (
            await this.query(
              "SELECT * FROM itinerary_items WHERE itinerary_day_id=? ORDER BY order_index",
              [d.id],
            )
          ).map((i) => ({
            placeId: i.external_place_id,
            startTime: i.start_time.slice(0, 5),
            endTime: i.end_time.slice(0, 5),
            reason: i.notes,
            place: json(i.fixture_snapshot_json) || {
              id: i.external_place_id,
              provider: i.provider,
              name: null,
              dataStatus: "requires_refresh",
            },
          })),
        })),
      ),
      budget: {
        totalBudget: b.total_budget,
        totalCost: b.estimated_total,
        remainingBudget: b.remaining_budget,
        overBudget: Number(b.remaining_budget) < 0,
        currency: b.currency,
        unknownActivityCount: b.unknown_activity_count,
        isComplete: b.unknown_activity_count === 0,
        items: (
          await this.query(
            "SELECT category,amount,source_type AS sourceType,is_estimated AS isEstimated FROM budget_items WHERE budget_id=?",
            [b.id],
          )
        ).map((x) => ({ ...x, isEstimated: !!x.isEstimated })),
      },
    };
  }
  async updatePlanFlags(userId, id, patch) {
    const p = await this.getPlan(userId, id);
    await this.transaction(async (db) => {
      await this.query(
        "SELECT id FROM trips WHERE id=? AND user_id=? FOR UPDATE",
        [p.tripId, userId],
        db,
      );
      if (patch.isSelected === true)
        await this.query(
          "UPDATE travel_plans SET is_selected=FALSE WHERE trip_id=?",
          [p.tripId],
          db,
        );
      await this.query(
        "UPDATE travel_plans SET title=?,is_saved=?,is_selected=? WHERE id=?",
        [
          patch.title ?? p.title,
          patch.isSaved ?? p.isSaved,
          patch.isSelected ?? p.isSelected,
          id,
        ],
        db,
      );
    });
    return this.getPlan(userId, id);
  }
  async deletePlan(userId, id) {
    const plan = await this.getPlan(userId, id);
    await this.transaction(async (db) => {
      await this.query(
        "SELECT id FROM trips WHERE id=? AND user_id=? FOR UPDATE",
        [plan.tripId, userId],
        db,
      );
      const current = (
        await this.query(
          "SELECT is_selected FROM travel_plans WHERE id=?",
          [id],
          db,
        )
      )[0];
      if (!current) throw missing();
      await this.query("DELETE FROM travel_plans WHERE id=?", [id], db);
      if (current.is_selected) {
        const next = (
          await this.query(
            "SELECT id FROM travel_plans WHERE trip_id=? ORDER BY version DESC LIMIT 1",
            [plan.tripId],
            db,
          )
        )[0];
        if (next)
          await this.query(
            "UPDATE travel_plans SET is_selected=TRUE WHERE id=?",
            [next.id],
            db,
          );
      }
    });
  }
  async favorite(userId, id, enabled) {
    await this.getPlan(userId, id);
    await this.query(
      enabled
        ? "INSERT IGNORE INTO favorites(user_id,travel_plan_id) VALUES(?,?)"
        : "DELETE FROM favorites WHERE user_id=? AND travel_plan_id=?",
      [userId, id],
    );
  }
  async listFavorites(userId) {
    const rows = await this.query(
      "SELECT travel_plan_id FROM favorites WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      [userId],
    );
    return Promise.all(rows.map((r) => this.getPlan(userId, r.travel_plan_id)));
  }
  async createContact(contact) {
    const id = randomUUID();
    await this.query(
      "INSERT INTO contact_messages(id,name,email,subject,message) VALUES(?,?,?,?,?)",
      [id, contact.name, contact.email, contact.subject, contact.message],
    );
    return { id, status: "stored" };
  }
}
