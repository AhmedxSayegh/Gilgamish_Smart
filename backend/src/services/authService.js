import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { AppError } from "../utils/errors.js";
export const tokenHash = (value) =>
  createHash("sha256").update(value).digest("hex");
export function createAuthService(repository, config) {
  const dummyHash = bcrypt.hashSync("not-a-real-user-password", 12);
  async function session(user) {
    const token = randomBytes(32).toString("hex"),
      csrfToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + config.sessionDays * 86400000);
    await repository.createSession({
      tokenHash: tokenHash(token),
      userId: user.id,
      csrfToken,
      expiresAt,
    });
    return { user, token, csrfToken, expiresAt };
  }
  return {
    async register(input) {
      try {
        const user = await repository.createUser({
          ...input,
          passwordHash: await bcrypt.hash(input.password, 12),
        });
        return session(user);
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY")
          throw new AppError(
            409,
            "EMAIL_IN_USE",
            "An account with that email already exists.",
          );
        throw error;
      }
    },
    async login(input) {
      const user = await repository.getUserByEmail(input.email);
      const valid = await bcrypt.compare(
        input.password,
        user?.passwordHash || dummyHash,
      );
      if (!user || !valid)
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      const { passwordHash, ...safe } = user;
      return session(safe);
    },
    async authenticate(token) {
      if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
      const saved = await repository.getSession(tokenHash(token));
      if (!saved) return null;
      const user = await repository.getUser(saved.userId);
      return user ? { ...saved, user } : null;
    },
    async logout(token) {
      if (token) await repository.deleteSession(tokenHash(token));
    },
  };
}
