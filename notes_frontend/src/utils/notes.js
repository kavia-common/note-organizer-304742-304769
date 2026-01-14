/** Notes utilities kept separate to keep components clean. */

function uuidLike() {
  // Simple ID: time + random (sufficient for local-only usage).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse a search query string into:
 * - `text`: the remaining free-text query (used across title/body/tags)
 * - `tag`: optional tag filter from `tag:<name>` syntax
 *
 * Rules:
 * - supports `tag:work` (case-insensitive key, value is trimmed)
 * - supports quoted tag values: `tag:"deep work"`
 * - leaves everything else as free-text
 */
// PUBLIC_INTERFACE
export function parseSearchQuery(query) {
  /** Parse free-text + `tag:` syntax from the user's search box input. */
  const raw = (query || "").trim();
  if (!raw) return { text: "", tag: null };

  // Match tag:"..." or tag:word (word can contain dashes/underscores)
  const re = /\btag:\s*(?:"([^"]+)"|([^\s]+))/i;
  const m = raw.match(re);

  const tagValue = m ? (m[1] || m[2] || "").trim() : "";
  const tag = tagValue ? tagValue : null;

  // Remove the first tag:... occurrence from free-text.
  const text = m ? raw.replace(m[0], " ").replace(/\s+/g, " ").trim() : raw;

  return { text, tag };
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

/**
 * Return an array of segments to render with optional highlight.
 * We intentionally return data, not JSX, so this stays framework-agnostic.
 *
 * Example:
 *   toHighlightedSegments("Hello world", "wor")
 *   => [{text:"Hello "},{text:"wor",highlight:true},{text:"ld"}]
 */
// PUBLIC_INTERFACE
export function toHighlightedSegments(text, needle) {
  /** Create safe highlight segments (case-insensitive) for UI rendering. */
  const s = String(text || "");
  const q = (needle || "").trim();
  if (!q) return [{ text: s, highlight: false }];

  const re = new RegExp(escapeRegex(q), "ig");
  const parts = [];
  let last = 0;

  for (const match of s.matchAll(re)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > last) parts.push({ text: s.slice(last, start), highlight: false });
    parts.push({ text: s.slice(start, end), highlight: true });
    last = end;
  }

  if (last < s.length) parts.push({ text: s.slice(last), highlight: false });
  return parts.length ? parts : [{ text: s, highlight: false }];
}

// PUBLIC_INTERFACE
export function filterNotes(notes, query, activeTag) {
  /**
   * Filter notes by:
   * - activeTag chip (legacy behavior)
   * - query free-text across title/body/tags
   * - optional `tag:` syntax inside query (in addition to chips)
   */
  const { text, tag: tagFromQuery } = parseSearchQuery(query);
  const q = (text || "").trim().toLowerCase();

  return notes.filter((n) => {
    const tags = n.tags || [];

    // Chips tag filter
    const matchesActiveTag = !activeTag || activeTag === "all" ? true : tags.includes(activeTag);

    // tag: syntax filter (additional AND constraint)
    const matchesQueryTag = !tagFromQuery ? true : tags.some((t) => String(t).toLowerCase() === tagFromQuery.toLowerCase());

    if (!q) return matchesActiveTag && matchesQueryTag;

    const hay = `${n.title || ""}\n${n.body || ""}\n${tags.join(" ")}`.toLowerCase();
    return matchesActiveTag && matchesQueryTag && hay.includes(q);
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
