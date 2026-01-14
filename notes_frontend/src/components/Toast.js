import React, { useEffect } from "react";

// PUBLIC_INTERFACE
export function Toast({ toast, onDismiss }) {
  /** Floating toast message. Auto-dismiss is handled by the parent. */
  useEffect(() => {
    if (!toast) return;
    const handler = (e) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const toneClass =
    toast.tone === "success" ? "ToastSuccess" : toast.tone === "warning" ? "ToastWarning" : "ToastInfo";

  return (
    <div className={`Toast ${toneClass}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
