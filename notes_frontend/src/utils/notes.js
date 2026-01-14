/** Notes utilities kept separate to keep components clean. */

function uuidLike() {
  // Simple ID: time + random (sufficient for local-only usage).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// PUBLIC_INTERFACE
export function createEmptyNote() {
  /** Create a new empty note object. */
  const now = new Date().toISOString();
  return {
    id: uuidLike(),
    title: "Untitled note",
    body: "",
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

// PUBLIC_INTERFACE
export function updateNoteTimestamps(note) {
  /** Update note updatedAt timestamp; preserves createdAt. */
  return {
    ...note,
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// PUBLIC_INTERFACE
export function sortNotesByUpdatedAtDesc(notes) {
  /** Sort notes by updatedAt descending (fallback to createdAt). */
  return [...notes].sort((a, b) => {
    const ta = Date.parse(a.updatedAt || a.createdAt || 0);
    const tb = Date.parse(b.updatedAt || b.createdAt || 0);
    return tb - ta;
  });
}

// PUBLIC_INTERFACE
export function getNotePreview(note) {
  /** Create a 1-line preview from the note body. */
  const body = (note.body || "").replace(/\s+/g, " ").trim();
  return body || "No content yet…";
}

// PUBLIC_INTERFACE
export function filterNotes(notes, query, activeTag) {
  /** Filter notes by search query and optional tag. */
  const q = (query || "").trim().toLowerCase();

  return notes.filter((n) => {
    const matchesTag =
      !activeTag || activeTag === "all" ? true : (n.tags || []).includes(activeTag);

    if (!q) return matchesTag;

    const hay = `${n.title || ""}\n${n.body || ""}\n${(n.tags || []).join(" ")}`.toLowerCase();
    return matchesTag && hay.includes(q);
  });
}

// PUBLIC_INTERFACE
export function formatDateTime(iso) {
  /** Format an ISO date for display. */
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
