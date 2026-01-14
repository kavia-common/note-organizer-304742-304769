import React, { useEffect, useRef } from "react";

// PUBLIC_INTERFACE
export function EditorPane({
  noteMeta,
  title,
  body,
  tagsText,
  onTitleChange,
  onBodyChange,
  onTagsTextChange,
  onDelete,
  onSave,
  saveState,
  formatDateTime,
  registerTitleFocusRef,
}) {
  /** Note editor view with autosave indicator and manual save action. */
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (!registerTitleFocusRef) return;
    registerTitleFocusRef(titleInputRef.current);
    // We intentionally do not "cleanup" by nulling; App overwrites on next render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerTitleFocusRef]);

  const saveHint =
    saveState === "dirty"
      ? "Autosaving…"
      : saveState === "saving"
        ? "Saving…"
        : saveState === "error"
          ? "Saved locally · API sync failed"
          : "Saved";

  return (
    <section className="Panel Editor" aria-label="Note editor">
      <div className="EditorHeader">
        <div className="EditorHeaderTop">
          <div className="EditorMeta" aria-label="Note metadata">
            <span>Updated: {formatDateTime(noteMeta.updatedAt)}</span>
            <span>Created: {formatDateTime(noteMeta.createdAt)}</span>
            <span className="EditorMetaCode" title="Note ID">
              {noteMeta.id}
            </span>
          </div>

          <div className="EditorActions" aria-label="Editor actions">
            <button className="Button" onClick={onSave} aria-label="Save note">
              Save <span className="Kbd">Ctrl/Cmd+S</span>
            </button>
            <button className="Button ButtonDanger" onClick={onDelete} aria-label="Delete note">
              Delete
            </button>
          </div>
        </div>

        <div className="FooterHint" aria-label="Save hint and shortcuts">
          <span aria-live="polite">{saveHint}</span>
          <span>
            Search <span className="Kbd">Ctrl/Cmd+K</span> · New <span className="Kbd">Ctrl/Cmd+N</span>
          </span>
        </div>
      </div>

      <div className="EditorBody">
        <input
          ref={titleInputRef}
          className="Input TitleInput"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Note title"
          aria-label="Note title"
        />

        <textarea
          className="Input Textarea"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Write your note…"
          aria-label="Note body"
        />

        <input
          className="Input"
          value={tagsText}
          onChange={(e) => onTagsTextChange(e.target.value)}
          placeholder="Tags (comma separated), e.g. work, ideas"
          aria-label="Note tags"
        />
      </div>
    </section>
  );
}
