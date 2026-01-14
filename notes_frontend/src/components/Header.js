import React from "react";

// PUBLIC_INTERFACE
export function Header({
  theme,
  onToggleTheme,
  saveState,
  lastSavedAt,
  onNewNote,
  onToggleSidebar,
  onDuplicateNote,
  onExportMarkdown,
  onClearSearch,
  canDuplicate = true,
  canExport = true,
  canClearSearch = true,
  shortcutHelp,
}) {
  /** Top application header. */
  const dotClass =
    saveState === "dirty"
      ? "SaveDot SaveDotDirty"
      : saveState === "saving"
        ? "SaveDot SaveDotSaving"
        : saveState === "error"
          ? "SaveDot SaveDotError"
          : "SaveDot";

  const label =
    saveState === "dirty"
      ? "Unsaved changes"
      : saveState === "saving"
        ? "Saving…"
        : saveState === "error"
          ? "Sync error"
          : "Saved";

  return (
    <header className="TopBar" aria-label="Application header" title={shortcutHelp}>
      <div className="TopBarLeft">
        <div className="BrandMark" aria-hidden="true" />
        <div className="TitleBlock">
          <h1 className="AppTitle">Ocean Notes</h1>
          <p className="AppSubtitle">Fast, clean notes with autosave</p>
        </div>
      </div>

      <div className="TopBarActions">
        <div className="SavePill" aria-label={`Save state: ${label}`}>
          <span className={dotClass} aria-hidden="true" />
          <span>{label}</span>
          {lastSavedAt ? <span className="EditorMetaCode">· {new Date(lastSavedAt).toLocaleTimeString()}</span> : null}
        </div>

        <button className="Button" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          Sidebar
        </button>

        <button
          className="Button"
          onClick={onClearSearch}
          aria-label="Clear search"
          disabled={!canClearSearch}
          title="Clear search and filters"
        >
          Clear
        </button>

        <button
          className="Button"
          onClick={onDuplicateNote}
          aria-label="Duplicate note"
          disabled={!canDuplicate}
          title="Duplicate current note"
        >
          Duplicate
        </button>

        <button
          className="Button"
          onClick={onExportMarkdown}
          aria-label="Export note to Markdown"
          disabled={!canExport}
          title="Download as .md"
        >
          Export
        </button>

        <button className="Button ButtonPrimary" onClick={onNewNote} aria-label="Create new note">
          New
        </button>

        <button className="Button" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "light" ? "Dark" : "Light"}
        </button>
      </div>
    </header>
  );
}
