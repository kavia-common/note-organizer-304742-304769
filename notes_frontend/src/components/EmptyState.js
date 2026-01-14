import React from "react";

// PUBLIC_INTERFACE
export function EmptyState({ title, description, primaryActionLabel, onPrimaryAction }) {
  /** Simple empty state panel. */
  return (
    <div className="EmptyState" role="region" aria-label="Empty state">
      <div className="EmptyCard">
        <h2 className="EmptyTitle">{title}</h2>
        <p className="EmptyDesc">{description}</p>
        <button className="Button ButtonPrimary" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </button>
      </div>
    </div>
  );
}
