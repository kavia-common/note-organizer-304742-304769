import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { NotesApi } from "./api/notesApi";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useHotkeys } from "./hooks/useHotkeys";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import {
  createEmptyNote,
  filterNotes,
  formatDateTime,
  getNotePreview,
  sortNotesByUpdatedAtDesc,
  updateNoteTimestamps,
} from "./utils/notes";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { EditorPane } from "./components/EditorPane";
import { EmptyState } from "./components/EmptyState";
import { Toast } from "./components/Toast";

/**
 * A lightweight notes organizer app with an Ocean Professional theme.
 * - Uses API if available (REACT_APP_API_BASE/REACT_APP_BACKEND_URL), otherwise falls back to localStorage.
 * - Supports create/edit/delete, search, sort by updated time, tags, autosave, and keyboard shortcuts.
 */

// PUBLIC_INTERFACE
function App() {
  /** Theme: light/dark (Ocean Professional palette is consistent across both). */
  const [theme, setTheme] = useLocalStorageState("notes.theme", "light");

  /** Notes state (source of truth in the UI). */
  const [notes, setNotes] = useLocalStorageState("notes.data.v1", []);
  const [selectedId, setSelectedId] = useLocalStorageState("notes.selectedId", null);

  /** UI state */
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const [activeTag, setActiveTag] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /** Editor state */
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTagsText, setDraftTagsText] = useState("");

  /**
   * Save/sync state indicator.
   * 'dirty' is local draft != selectedNote; 'saving' means a sync attempt is in-flight for the current revision;
   * 'saved' means last sync attempt for current revision succeeded; 'error' means last sync attempt failed.
   */
  const [saveState, setSaveState] = useState("saved"); // 'saved' | 'dirty' | 'saving' | 'error'
  const lastSavedAtRef = useRef(null);

  /** Toasts (for shortcut feedback + errors) */
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const api = useMemo(() => new NotesApi(), []);

  /** Focus management refs */
  const focusSearchRef = useRef(null);
  const editorTitleRef = useRef(null);

  /** Used to make save-state transitions race-safe across rapid edits / note switches. */
  const saveAttemptSeqRef = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Keep draft fields in sync when the selected note changes.
  useEffect(() => {
    if (!selectedNote) {
      setDraftTitle("");
      setDraftBody("");
      setDraftTagsText("");
      setSaveState("saved");
      return;
    }
    setDraftTitle(selectedNote.title || "");
    setDraftBody(selectedNote.body || "");
    setDraftTagsText((selectedNote.tags || []).join(", "));
    setSaveState("saved");
  }, [selectedId]); // intentionally key off selection

  // Ensure there is always at least one note the first time.
  useEffect(() => {
    if (notes.length === 0) {
      const first = createEmptyNote();
      setNotes([first]);
      setSelectedId(first.id);
    } else if (!selectedId) {
      setSelectedId(notes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((message, tone = "info") => {
    setToast({ message, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const parsedDraftTags = useMemo(() => {
    const raw = (draftTagsText || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    // Unique tags, preserve order
    return Array.from(new Set(raw));
  }, [draftTagsText]);

  const visibleNotes = useMemo(() => {
    const filtered = filterNotes(notes, debouncedQuery, activeTag);
    return sortNotesByUpdatedAtDesc(filtered);
  }, [notes, debouncedQuery, activeTag]);

  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  // Mark dirty whenever user changes draft values.
  useEffect(() => {
    if (!selectedNote) return;
    const isDirty =
      (draftTitle || "") !== (selectedNote.title || "") ||
      (draftBody || "") !== (selectedNote.body || "") ||
      JSON.stringify(parsedDraftTags) !== JSON.stringify(selectedNote.tags || []);
    setSaveState(isDirty ? "dirty" : "saved");
  }, [draftTitle, draftBody, parsedDraftTags, selectedNote]);

  const applyDraftToSelectedNote = useCallback(() => {
    if (!selectedNote) return null;

    const updated = {
      ...selectedNote,
      title: draftTitle.trim() || "Untitled note",
      body: draftBody,
      tags: parsedDraftTags,
    };

    return updateNoteTimestamps(updated);
  }, [selectedNote, draftTitle, draftBody, parsedDraftTags]);

  const describeSyncFailure = useCallback((e) => {
    if (!e || typeof e !== "object") return "Saved locally, but failed to sync to API.";
    // notesApi normalizes errors into {kind,...}
    if (e.kind === "timeout") return "Saved locally, but API sync timed out.";
    if (e.kind === "http") return "Saved locally, but API returned an error.";
    if (e.kind === "network") return "Saved locally, but API is unreachable.";
    return "Saved locally, but failed to sync to API.";
  }, []);

  const persistNoteUpdate = useCallback(
    async (noteToPersist) => {
      // Local update is immediate for responsiveness.
      setNotes((prev) => prev.map((n) => (n.id === noteToPersist.id ? noteToPersist : n)));

      // Best-effort API persistence (non-blocking UX). Race-safe via sequence token.
      const attemptSeq = ++saveAttemptSeqRef.current;

      setSaveState((prev) => (prev === "dirty" || prev === "error" || prev === "saved" ? "saving" : prev));

      try {
        await api.upsertNote(noteToPersist);

        // Only accept result if it's the latest attempted save (prevents stale resolution).
        if (attemptSeq === saveAttemptSeqRef.current) {
          setSaveState("saved");
          lastSavedAtRef.current = new Date().toISOString();
        }
      } catch (e) {
        if (attemptSeq === saveAttemptSeqRef.current) {
          // Still saved locally; reflect API error only as indicator and toast.
          setSaveState("error");
          showToast(describeSyncFailure(e), "warning");
        }
      }
    },
    [api, setNotes, showToast, describeSyncFailure]
  );

  // Autosave behavior: debounce draft changes.
  const autosaveTimerRef = useRef(null);
  useEffect(() => {
    if (!selectedNote) return;
    if (saveState !== "dirty") return;

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      const updated = applyDraftToSelectedNote();
      if (updated) persistNoteUpdate(updated);
    }, 650);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [saveState, selectedNote, applyDraftToSelectedNote, persistNoteUpdate]);

  const createNote = useCallback(() => {
    const n = createEmptyNote();
    setNotes((prev) => [n, ...prev]);
    setSelectedId(n.id);
    setSidebarOpen(true);
    showToast("New note created", "success");

    // Focus the editor title once it renders.
    window.setTimeout(() => {
      if (editorTitleRef.current) editorTitleRef.current.focus();
    }, 0);

    // Best-effort API create; surface error non-intrusively.
    api.upsertNote(n).catch((e) => {
      showToast(describeSyncFailure(e), "warning");
    });
  }, [api, setNotes, setSelectedId, showToast, describeSyncFailure]);

  const deleteSelected = useCallback(() => {
    if (!selectedNote) return;
    const id = selectedNote.id;

    // Figure out next selection from the current notes list BEFORE state updates.
    const remaining = notes.filter((n) => n.id !== id);
    const nextId = remaining.length ? remaining[0].id : null;

    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId(nextId);

    // After delete, keep the user in a productive place:
    // - If a next note exists, focus editor title
    // - Otherwise, focus search (so they can create/find)
    window.setTimeout(() => {
      if (nextId && editorTitleRef.current) {
        editorTitleRef.current.focus();
      } else if (focusSearchRef.current) {
        focusSearchRef.current();
      }
    }, 0);

    api.deleteNote(id).catch((e) => {
      showToast(describeSyncFailure(e), "warning");
    });
    showToast("Note deleted", "info");
  }, [api, notes, selectedNote, setNotes, setSelectedId, showToast, describeSyncFailure]);

  const manualSave = useCallback(() => {
    if (!selectedNote) return;
    const updated = applyDraftToSelectedNote();
    if (!updated) return;
    persistNoteUpdate(updated);
    showToast("Saved", "success");
  }, [applyDraftToSelectedNote, persistNoteUpdate, selectedNote, showToast]);

  // Keyboard shortcuts: New (Cmd/Ctrl+N), Search (Cmd/Ctrl+K), Save (Cmd/Ctrl+S)
  useHotkeys(
    {
      "mod+n": () => createNote(),
      "mod+k": () => {
        setSidebarOpen(true);
        if (focusSearchRef.current) focusSearchRef.current();
        showToast("Search", "info");
      },
      "mod+s": () => manualSave(),
    },
    { enabled: true }
  );

  // Provide app-level help text for screen readers.
  const shortcutHelp = "Shortcuts: Ctrl/Cmd+N new note, Ctrl/Cmd+K search, Ctrl/Cmd+S save.";

  return (
    <div className="App">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        saveState={saveState}
        lastSavedAt={lastSavedAtRef.current}
        onNewNote={createNote}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        shortcutHelp={shortcutHelp}
      />

      <div className="AppShell" role="application" aria-label="Notes organizer">
        <Sidebar
          open={sidebarOpen}
          notes={visibleNotes}
          allTags={allTags}
          activeTag={activeTag}
          onActiveTagChange={setActiveTag}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          query={query}
          onQueryChange={setQuery}
          registerSearchFocus={(fn) => (focusSearchRef.current = fn)}
        />

        <main className="MainPane" aria-label="Editor pane">
          {!selectedNote ? (
            <EmptyState
              title="No note selected"
              description="Create a new note to get started."
              primaryActionLabel="New note"
              onPrimaryAction={createNote}
            />
          ) : (
            <EditorPane
              noteMeta={{
                id: selectedNote.id,
                updatedAt: selectedNote.updatedAt,
                createdAt: selectedNote.createdAt,
                preview: getNotePreview(selectedNote),
              }}
              title={draftTitle}
              body={draftBody}
              tagsText={draftTagsText}
              onTitleChange={setDraftTitle}
              onBodyChange={setDraftBody}
              onTagsTextChange={setDraftTagsText}
              onDelete={deleteSelected}
              onSave={manualSave}
              saveState={saveState}
              formatDateTime={formatDateTime}
              registerTitleFocusRef={(el) => {
                editorTitleRef.current = el;
              }}
            />
          )}
        </main>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default App;
