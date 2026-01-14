import {
  createEmptyNote,
  updateNoteTimestamps,
  sortNotesByUpdatedAtDesc,
  getNotePreview,
  filterNotes,
  formatDateTime,
} from "../utils/notes";

describe("notes utils", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-02T03:04:05.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("createEmptyNote returns a valid skeleton note with stable timestamps", () => {
    const n = createEmptyNote();
    expect(n).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: "Untitled note",
        body: "",
        tags: [],
        createdAt: "2025-01-02T03:04:05.000Z",
        updatedAt: "2025-01-02T03:04:05.000Z",
      })
    );
    // id should look uuid-ish (time-random)
    expect(n.id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/i);
  });

  test("updateNoteTimestamps preserves createdAt and bumps updatedAt", () => {
    const original = {
      id: "1",
      title: "A",
      body: "",
      tags: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    jest.setSystemTime(new Date("2025-01-05T10:00:00.000Z"));

    const updated = updateNoteTimestamps(original);
    expect(updated.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2025-01-05T10:00:00.000Z");
  });

  test("sortNotesByUpdatedAtDesc sorts by updatedAt (fallback to createdAt)", () => {
    const notes = [
      { id: "a", createdAt: "2025-01-02T00:00:00.000Z", updatedAt: "2025-01-02T00:00:00.000Z" },
      { id: "b", createdAt: "2025-01-03T00:00:00.000Z" }, // no updatedAt
      { id: "c", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-04T00:00:00.000Z" },
    ];

    const sorted = sortNotesByUpdatedAtDesc(notes);
    expect(sorted.map((n) => n.id)).toEqual(["c", "b", "a"]);

    // ensure non-mutating
    expect(notes.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  test("getNotePreview compacts whitespace and falls back when empty", () => {
    expect(getNotePreview({ body: " hello \n  world \t\t!" })).toBe("hello world !");
    expect(getNotePreview({ body: "   \n\t  " })).toBe("No content yet…");
    expect(getNotePreview({})).toBe("No content yet…");
  });

  test("filterNotes filters by query across title/body/tags and by activeTag", () => {
    const notes = [
      { id: "1", title: "Work plan", body: "Roadmap", tags: ["work"] },
      { id: "2", title: "Personal", body: "Gym", tags: ["health"] },
      { id: "3", title: "Misc", body: "Alpha", tags: ["work", "ideas"] },
    ];

    // Query only
    expect(filterNotes(notes, "road", "all").map((n) => n.id)).toEqual(["1"]);
    // Case-insensitive + tags searchable
    expect(filterNotes(notes, "IDEAS", "all").map((n) => n.id)).toEqual(["3"]);

    // Tag only
    expect(filterNotes(notes, "", "work").map((n) => n.id)).toEqual(["1", "3"]);

    // Both query + tag
    expect(filterNotes(notes, "alpha", "work").map((n) => n.id)).toEqual(["3"]);
    expect(filterNotes(notes, "alpha", "health").map((n) => n.id)).toEqual([]);
  });

  test("formatDateTime formats valid ISO and returns em dash for invalid inputs", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");

    // We can't assert exact locale output; just assert it returns a non-empty string for valid ISO.
    const s = formatDateTime("2025-01-02T03:04:05.000Z");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toBe("—");
  });
});
