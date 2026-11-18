let csrfToken = null;
export function setCsrf(value) {
  csrfToken = value;
}
export class ApiError extends Error {
  constructor(error, status) {
    super(error?.message || "Request failed");
    this.code = error?.code || "NETWORK_ERROR";
    this.details = error?.details;
    this.status = status;
  }
}
export async function api(path, { method = "GET", body, signal, raw = false } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken && method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      {
        code: "NETWORK_ERROR",
        message: "Cannot reach the server. Please try again.",
      },
      0,
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      {
        code: "SERVER_UNAVAILABLE",
        message: "The server is unavailable. Please try again.",
      },
      response.status,
    );
  }
  if (raw && !response.ok && result.reason) return result;
  if (!response.ok || (!raw && !result.success))
    throw new ApiError(result.error, response.status);
  return raw ? result : result.data;
}
export const mutation = (path, method, body = {}) =>
  api(path, { method, body });
