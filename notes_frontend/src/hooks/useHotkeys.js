import { useEffect } from "react";

function isMac() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function normalizeCombo(combo) {
  return combo
    .toLowerCase()
    .replace("cmd", "meta")
    .replace("command", "meta")
    .replace("ctrl", "control")
    .replace("mod", isMac() ? "meta" : "control");
}

function eventToKey(e) {
  const parts = [];
  if (e.metaKey) parts.push("meta");
  if (e.ctrlKey) parts.push("control");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push((e.key || "").toLowerCase());
  return parts.join("+");
}

// PUBLIC_INTERFACE
export function useHotkeys(map, options = {}) {
  /** Registers key combos like "mod+s" and invokes callbacks. */
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const normalized = new Map();
    Object.entries(map || {}).forEach(([combo, fn]) => {
      normalized.set(normalizeCombo(combo), fn);
    });

    const handler = (e) => {
      // Avoid stealing keystrokes from typical inputs unless it's a known app shortcut.
      const tag = (e.target && e.target.tagName) || "";
      const isTypingContext =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable);

      const key = eventToKey(e);
      const fn = normalized.get(key);

      if (!fn) return;

      // Always prevent default for app shortcuts (notably Ctrl/Cmd+S).
      e.preventDefault();

      // Allow shortcuts even when typing.
      fn(e, { isTypingContext });
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [map, enabled]);
}
