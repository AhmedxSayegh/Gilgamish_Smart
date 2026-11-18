// Test double only. The application server always uses MysqlRepository.
import { randomUUID } from "node:crypto";
import { missing } from "../../src/utils/errors.js";
const copy = (x) => structuredClone(x);
export class MemoryRepository {
  users = new Map();
  sessions = new Map();
  trips = new Map();
  plans = new Map();
  preferences = new Map();
  contacts = [];
  socialIdentities = new Map();
  oauthAttempts = new Map();
  async saveOAuthAttempt(attempt) { this.oauthAttempts.set(attempt.stateHash, copy(attempt)); }
  async consumeOAuthAttempt(stateHash, provider, browserHash) {
    const attempt = this.oauthAttempts.get(stateHash);
    if (!attempt || attempt.provider !== provider || attempt.browserHash !== browserHash || new Date(attempt.expiresAt) <= new Date()) return null;
    this.oauthAttempts.delete(stateHash);
    return copy(attempt);
  }
  async getSocialUser(provider, subject) { return this.getUser(this.socialIdentities.get(`${provider}:${subject}`)); }
  async createSocialUser({ provider, subject, ...input }) {
    const user = await this.createUser({ ...input, passwordHash: "!social-login-only!" });
    this.socialIdentities.set(`${provider}:${subject}`, user.id);
    return user;
  }
  async ping() {}
  async createUser(input) {
    if ([...this.users.values()].some((u) => u.email === input.email)) {
      const e = new Error("duplicate");
      e.code = "ER_DUP_ENTRY";
      throw e;
    }
    const user = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.preferences.set(user.id, {
      hotelStars: 3,
      flightOption: "cheapest",
      pace: "balanced",
      currency: "SAR",
      interests: [],
    });
    return this.getUser(user.id);
  }
  async getUser(id) {
    const u = this.users.get(id);
    if (!u) return null;
    const { passwordHash, password, ...safe } = u;
    return copy(safe);
  }
  async getUserByEmail(email) {
    const u = [...this.users.values()].find((x) => x.email === email);
    return u ? copy(u) : null;
  }
  async updateUser(id, patch) {
    Object.assign(this.users.get(id), patch);
    return this.getUser(id);
  }
  async getPreferences(id) {
    return copy(this.preferences.get(id));
  }
  async setPreferences(id, p) {
    this.preferences.set(id, copy(p));
    return copy(p);
  }
  async createSession(s) {
    this.sessions.set(s.tokenHash, copy(s));
  }
  async getSession(hash) {
    const s = this.sessions.get(hash);
    return s && new Date(s.expiresAt) > new Date() ? copy(s) : null;
  }
  async deleteSession(hash) {
    this.sessions.delete(hash);
  }
  async createTrip(userId, input) {
    const t = {
      id: randomUUID(),
      userId,
      ...copy(input),
      createdAt: new Date().toISOString(),
      status: "draft",
      plans: [],
      nextVersion: 1,
    };
    this.trips.set(t.id, t);
    return this.getTrip(userId, t.id);
  }
  async getTrip(userId, id) {
    const t = this.trips.get(id);
    if (!t || t.userId !== userId) throw missing();
    const { userId: _, nextVersion, ...safe } = t;
    return copy(safe);
  }
  async listTrips(userId) {
    return Promise.all(
      [...this.trips.values()]
        .filter((t) => t.userId === userId)
        .map((t) => this.getTrip(userId, t.id)),
    );
  }
  async updateTrip(userId, id, t) {
    await this.getTrip(userId, id);
    Object.assign(this.trips.get(id), copy(t));
    return this.getTrip(userId, id);
  }
  async deleteTrip(userId, id) {
    await this.getTrip(userId, id);
    this.trips.delete(id);
    for (const p of this.plans.values())
      if (p.tripId === id) this.plans.delete(p.id);
  }
  async createPlan(userId, tripId, plan) {
    await this.getTrip(userId, tripId);
    const trip = this.trips.get(tripId);
    for (const p of this.plans.values())
      if (p.tripId === tripId) p.isSelected = false;
    const p = {
      id: randomUUID(),
      tripId,
      version: trip.nextVersion++,
      ...copy(plan),
      createdAt: new Date().toISOString(),
      isSelected: true,
      isSaved: true,
      isFavorite: false,
    };
    this.plans.set(p.id, p);
    trip.plans.push({ id: p.id, version: p.version });
    trip.status = "planned";
    return this.getPlan(userId, p.id);
  }
  async getPlan(userId, id) {
    const p = this.plans.get(id);
    if (!p) throw missing();
    await this.getTrip(userId, p.tripId);
    return copy(p);
  }
  async updatePlanFlags(userId, id, patch) {
    await this.getPlan(userId, id);
    Object.assign(this.plans.get(id), copy(patch));
    return this.getPlan(userId, id);
  }
  async deletePlan(userId, id) {
    await this.getPlan(userId, id);
    this.plans.delete(id);
  }
  async favorite(userId, id, value) {
    await this.getPlan(userId, id);
    this.plans.get(id).isFavorite = value;
  }
  async listFavorites(userId) {
    const result = [];
    for (const p of this.plans.values())
      if (p.isFavorite && this.trips.get(p.tripId)?.userId === userId)
        result.push(copy(p));
    return result;
  }
  async createContact(input) {
    const c = { id: randomUUID(), ...copy(input) };
    this.contacts.push(c);
    return { id: c.id, status: "stored" };
  }
}
