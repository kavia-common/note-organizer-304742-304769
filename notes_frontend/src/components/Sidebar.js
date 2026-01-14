import React, { useEffect, useMemo, useRef } from "react";
import { formatDateTime, getNotePreview } from "../utils/notes";

// PUBLIC_INTERFACE
export function Sidebar({
  open,
  notes,
  allTags,
  activeTag,
  onActiveTagChange,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  registerSearchFocus,
}) {
  /** Sidebar list of notes with search and tag filters. */
  const searchRef = useRef(null);

  useEffect(() => {
    if (registerSearchFocus) {
      registerSearchFocus(() => {
        if (searchRef.current) searchRef.current.focus();
      });
    }
  }, [registerSearchFocus]);

  const tagChips = useMemo(() => ["all", ...allTags], [allTags]);

  // Responsive behavior: hide sidebar on small screens if closed.
  if (!open) {
    return null;
  }

  return (
    <aside className="Panel Sidebar" aria-label="Notes sidebar">
      <div className="SidebarHeader">
        <div className="SidebarRow">
          <input
            ref={searchRef}
            className="Input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
            type="search"
          />
        </div>

        <div className="TagChips" aria-label="Tag filters">
          {tagChips.map((t) => (
            <button
              key={t}
              className={`TagChip ${activeTag === t ? "TagChipActive" : ""}`}
              onClick={() => onActiveTagChange(t)}
              aria-label={t === "all" ? "Show all notes" : `Filter by tag ${t}`}
              aria-pressed={activeTag === t}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="NotesList" role="listbox" aria-label="Notes list">
        {notes.length === 0 ? (
          <div style={{ padding: 12, color: "var(--ocean-muted)", fontWeight: 600 }} role="status" aria-live="polite">
            No notes match your filters.
          </div>
        ) : (
          notes.map((n) => {
            const active = n.id === selectedId;
            return (
              <button
                key={n.id}
                className={`NoteItem ${active ? "NoteItemActive" : ""}`}
                onClick={() => onSelect(n.id)}
                role="option"
                aria-selected={active}
                aria-label={`Open note ${n.title || "Untitled note"}`}
              >
                <div className="NoteTitleRow">
                  <div className="NoteTitle">{n.title || "Untitled note"}</div>
                  <div className="NoteMeta">{formatDateTime(n.updatedAt || n.createdAt)}</div>
                </div>
                <div className="NotePreview">{getNotePreview(n)}</div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
