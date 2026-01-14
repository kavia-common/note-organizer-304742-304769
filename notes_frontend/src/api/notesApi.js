/**
 * Notes API client.
 * Uses env vars for base URL wiring, but intentionally degrades gracefully:
 * if requests fail, the UI continues using localStorage as the primary store.
 */

function resolveApiBase() {
  // Prefer explicit API base, fall back to backend URL, otherwise empty string.
  const base =
    (process.env.REACT_APP_API_BASE || "").trim() ||
    (process.env.REACT_APP_BACKEND_URL || "").trim();

  // Allow values like "http://localhost:8000" or "https://example.com/api".
  return base.replace(/\/+$/, "");
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

export class NotesApi {
  constructor() {
    this.base = resolveApiBase();
    // Default endpoint assumption (best-effort): /notes
    this.notesPath = "/notes";
  }

  hasApi() {
    return Boolean(this.base);
  }

  async listNotes() {
    if (!this.hasApi()) return null;
    const res = await fetch(`${this.base}${this.notesPath}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Failed to list notes: ${res.status}`);
    return safeJson(res);
  }

  async upsertNote(note) {
    if (!this.hasApi()) return null;

    // Best-effort REST assumption:
    // PUT /notes/:id
    const res = await fetch(`${this.base}${this.notesPath}/${encodeURIComponent(note.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error(`Failed to upsert note: ${res.status}`);
    return safeJson(res);
  }

  async deleteNote(id) {
    if (!this.hasApi()) return null;

    const res = await fetch(`${this.base}${this.notesPath}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Failed to delete note: ${res.status}`);
    return safeJson(res);
  }
}
