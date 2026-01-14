/**
 * Notes API client.
 * Uses env vars for base URL wiring, but intentionally degrades gracefully:
 * if requests fail, the UI continues using localStorage as the primary store.
 *
 * Production hardening goals:
 * - Treat missing/invalid base URLs as "API unavailable" (not a fatal error).
 * - Enforce timeouts so fetch never hangs.
 * - Normalize network/HTTP errors into a consistent shape for UI to surface via toast/indicator.
 */

const DEFAULT_TIMEOUT_MS = 8000;

function isValidHttpUrl(maybeUrl) {
  try {
    const url = new URL(maybeUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveApiBase() {
  // Prefer explicit API base, fall back to backend URL, otherwise empty string.
  const raw =
    (process.env.REACT_APP_API_BASE || "").trim() ||
    (process.env.REACT_APP_BACKEND_URL || "").trim();

  if (!raw) return "";

  // Allow values like "http://localhost:8000" or "https://example.com/api".
  const base = raw.replace(/\/+$/, "");

  // If misconfigured (e.g., "localhost:8000" without scheme), treat as unavailable.
  if (!isValidHttpUrl(base)) return "";

  return base;
}

async function safeJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toApiError(error, { kind = "network", status = null, url = "", method = "" } = {}) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    kind, // 'unavailable' | 'timeout' | 'network' | 'http'
    status,
    url,
    method,
    message,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const timeoutMs =
    typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    window.clearTimeout(id);
  }
}

export class NotesApi {
  constructor(options = {}) {
    this.base = resolveApiBase();

    // Default endpoint assumption (best-effort): /notes
    this.notesPath = "/notes";

    // Keep a tunable timeout without requiring env vars.
    this.timeoutMs =
      typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  }

  hasApi() {
    return Boolean(this.base);
  }

  async listNotes() {
    if (!this.hasApi()) return null;

    const url = `${this.base}${this.notesPath}`;
    try {
      const res = await fetchWithTimeout(url, {
        timeoutMs: this.timeoutMs,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw toApiError(new Error(`Failed to list notes: ${res.status}`), { kind: "http", status: res.status, url, method: "GET" });
      return safeJson(res);
    } catch (e) {
      if (e && typeof e === "object" && "kind" in e) throw e;
      if (e instanceof DOMException && e.name === "AbortError") throw toApiError(e, { kind: "timeout", url, method: "GET" });
      throw toApiError(e, { kind: "network", url, method: "GET" });
    }
  }

  async upsertNote(note) {
    if (!this.hasApi()) return null;

    // Best-effort REST assumption:
    // PUT /notes/:id
    const url = `${this.base}${this.notesPath}/${encodeURIComponent(note.id)}`;

    try {
      const res = await fetchWithTimeout(url, {
        timeoutMs: this.timeoutMs,
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(note),
      });
      if (!res.ok) throw toApiError(new Error(`Failed to upsert note: ${res.status}`), { kind: "http", status: res.status, url, method: "PUT" });
      return safeJson(res);
    } catch (e) {
      if (e && typeof e === "object" && "kind" in e) throw e;
      if (e instanceof DOMException && e.name === "AbortError") throw toApiError(e, { kind: "timeout", url, method: "PUT" });
      throw toApiError(e, { kind: "network", url, method: "PUT" });
    }
  }

  async deleteNote(id) {
    if (!this.hasApi()) return null;

    const url = `${this.base}${this.notesPath}/${encodeURIComponent(id)}`;

    try {
      const res = await fetchWithTimeout(url, {
        timeoutMs: this.timeoutMs,
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw toApiError(new Error(`Failed to delete note: ${res.status}`), { kind: "http", status: res.status, url, method: "DELETE" });
      return safeJson(res);
    } catch (e) {
      if (e && typeof e === "object" && "kind" in e) throw e;
      if (e instanceof DOMException && e.name === "AbortError") throw toApiError(e, { kind: "timeout", url, method: "DELETE" });
      throw toApiError(e, { kind: "network", url, method: "DELETE" });
    }
  }
}
