export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export const missing = () =>
  new AppError(404, "NOT_FOUND", "The requested resource was not found.");
export function requireCondition(condition, code, message, status = 422) {
  if (!condition) throw new AppError(status, code, message);
}
export const success = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });
