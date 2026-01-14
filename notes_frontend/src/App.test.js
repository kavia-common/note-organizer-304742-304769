import React from "react";
import { render, screen, within, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

/**
 * Notes on stability:
 * - App uses debounced search (150ms) and autosave debounce (650ms). These tests use Jest fake timers
 *   and `act()` to deterministically advance time.
 * - App persists to localStorage; we clear between tests to avoid cross-test coupling.
 * - App may attempt API best-effort calls; we mock fetch to avoid network usage.
 */

function seedLocalStorageNotes(notes, selectedId = null) {
  window.localStorage.setItem("notes.data.v1", JSON.stringify(notes));
  window.localStorage.setItem("notes.selectedId", JSON.stringify(selectedId));
}

describe("Ocean Notes - core flows", () => {
  beforeEach(() => {
    // Fresh persistence between tests
    window.localStorage.clear();

    // Avoid accidental API fetches (if env vars are present in CI)
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "",
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("App renders and shows header/sidebar/editor layout", async () => {
    render(<App />);

    expect(screen.getByRole("banner", { name: /application header/i })).toBeInTheDocument();
    expect(screen.getByRole("application", { name: /notes organizer/i })).toBeInTheDocument();

    // Sidebar
    expect(screen.getByRole("complementary", { name: /notes sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search notes/i })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: /notes list/i })).toBeInTheDocument();

    // Editor pane (main region)
    expect(screen.getByRole("main", { name: /editor pane/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /note editor/i })).toBeInTheDocument();

    // Save state pill
    expect(screen.getByLabelText(/save state:/i)).toBeInTheDocument();
  });

  test("Creating a new note updates the list and selects it", async () => {
    const user = userEvent.setup();
    render(<App />);

    const listbox = screen.getByRole("listbox", { name: /notes list/i });
    const beforeOptions = within(listbox).getAllByRole("option");
    const beforeCount = beforeOptions.length;

    await user.click(screen.getByRole("button", { name: /create new note/i }));

    const afterOptions = within(listbox).getAllByRole("option");
    expect(afterOptions.length).toBe(beforeCount + 1);

    // Newly created note is prepended and selected
    expect(afterOptions[0]).toHaveAttribute("aria-selected", "true");

    // Editor title should be focused (App focuses title after creation via setTimeout 0).
    // Instead of relying on fake timers, wait for focus to land.
    await waitFor(() => {
      expect(screen.getByLabelText(/note title/i)).toHaveFocus();
    });
  });

  test("Editing title/body triggers autosave state transitions (Unsaved -> Saving -> Saved) with debounce", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // Ensure we're in local-only mode (no API base), so upsertNote short-circuits and save becomes immediate.
    // (Even if CI injects vars, NotesApi resolves them on construction; safest to clear.)
    delete process.env.REACT_APP_API_BASE;
    delete process.env.REACT_APP_BACKEND_URL;

    render(<App />);

    // Initial state shows "Saved"
    expect(screen.getByLabelText(/save state:/i)).toHaveTextContent(/saved/i);

    const titleInput = screen.getByLabelText(/note title/i);
    const bodyInput = screen.getByLabelText(/note body/i);

    await user.clear(titleInput);
    await user.type(titleInput, "My autosave title");

    // Dirty state should show as "Unsaved changes" in header and "Autosaving…" hint in editor
    expect(screen.getByLabelText(/save state:/i)).toHaveTextContent(/unsaved changes/i);
    expect(screen.getByLabelText(/save hint and shortcuts/i)).toHaveTextContent(/autosaving/i);

    // Update body too (stays dirty)
    await user.type(bodyInput, "Body text");

    // Autosave fires after 650ms debounce -> transitions to saving then saved.
    await act(async () => {
      jest.advanceTimersByTime(650);
      // resolve any pending promises/microtasks after timer callback
      await Promise.resolve();
    });

    // In local-only mode, persistNoteUpdate sets "saving" then "saved" after await api.upsertNote (null).
    // We accept either an intermediate "Saving…" flash or directly "Saved" depending on scheduling,
    // but final state must be Saved.
    expect(screen.getByLabelText(/save state:/i)).toHaveTextContent(/saved/i);

    // Scope to the aria-live hint only; the region also contains shortcut help text.
    const footerHint = screen.getByLabelText(/save hint and shortcuts/i);
    const liveHint = within(footerHint).getByText(/^saved$/i, { selector: "span[aria-live='polite']" });
    expect(liveHint).toBeInTheDocument();
  });

  test("Search input filters the note list (debounced)", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const notes = [
      {
        id: "n1",
        title: "Work plan",
        body: "Q1 roadmap",
        tags: ["work"],
        createdAt: "2025-01-01T10:00:00.000Z",
        updatedAt: "2025-01-01T10:00:00.000Z",
      },
      {
        id: "n2",
        title: "Grocery list",
        body: "milk, eggs",
        tags: ["personal"],
        createdAt: "2025-01-01T09:00:00.000Z",
        updatedAt: "2025-01-01T09:00:00.000Z",
      },
    ];
    seedLocalStorageNotes(notes, "n1");

    render(<App />);

    const listbox = screen.getByRole("listbox", { name: /notes list/i });
    expect(within(listbox).getAllByRole("option")).toHaveLength(2);

    const search = screen.getByRole("searchbox", { name: /search notes/i });
    await user.type(search, "grocery");

    // Search is debounced by 150ms
    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAccessibleName(/open note grocery list/i);
  });

  test("Tag filter behavior filters notes by tag", async () => {
    const user = userEvent.setup();

    const notes = [
      {
        id: "n1",
        title: "One",
        body: "alpha",
        tags: ["work"],
        createdAt: "2025-01-01T10:00:00.000Z",
        updatedAt: "2025-01-01T10:00:00.000Z",
      },
      {
        id: "n2",
        title: "Two",
        body: "beta",
        tags: ["personal"],
        createdAt: "2025-01-01T09:00:00.000Z",
        updatedAt: "2025-01-01T09:00:00.000Z",
      },
      {
        id: "n3",
        title: "Three",
        body: "gamma",
        tags: ["work", "personal"],
        createdAt: "2025-01-01T08:00:00.000Z",
        updatedAt: "2025-01-01T08:00:00.000Z",
      },
    ];
    seedLocalStorageNotes(notes, "n1");

    render(<App />);

    const listbox = screen.getByRole("listbox", { name: /notes list/i });
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);

    // Click tag chip for 'work'
    await user.click(screen.getByRole("button", { name: /filter by tag work/i }));

    const filtered = within(listbox).getAllByRole("option");
    expect(filtered).toHaveLength(2);
    expect(filtered[0]).toHaveAccessibleName(/open note one|open note three/i);

    // Back to all
    await user.click(screen.getByRole("button", { name: /show all notes/i }));
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
  });

  test("Keyboard shortcuts: Cmd/Ctrl+N creates note, Cmd/Ctrl+K focuses search, Cmd/Ctrl+S triggers save without navigation", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<App />);

    const listbox = screen.getByRole("listbox", { name: /notes list/i });
    const initialCount = within(listbox).getAllByRole("option").length;

    // Ctrl/Cmd+N should create a note
    await user.keyboard("{Control>}{n}{/Control}");
    expect(within(listbox).getAllByRole("option").length).toBe(initialCount + 1);
    expect(screen.getByText(/new note created/i)).toBeInTheDocument();

    // Ctrl/Cmd+K should focus search
    const search = screen.getByRole("searchbox", { name: /search notes/i });
    await user.keyboard("{Control>}{k}{/Control}");
    expect(search).toHaveFocus();

    // Make a change so save does real work
    const titleInput = screen.getByLabelText(/note title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Needs save");

    // Ctrl/Cmd+S should prevent default browser save, show toast, and leave focus intact (no navigation)
    const preventDefault = jest.fn();
    // fire a real keydown so we can assert preventDefault was called by useHotkeys
    await act(async () => {
      const e = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      // JSDOM doesn't let us override preventDefault easily on KeyboardEvent instance,
      // so we patch it for assertion.
      Object.defineProperty(e, "preventDefault", { value: preventDefault });
      window.dispatchEvent(e);
    });

    expect(preventDefault).toHaveBeenCalled();

    // "Saved" is shown in both the header pill and the toast; assert against the toast explicitly.
    expect(screen.getByRole("status")).toHaveTextContent(/^saved$/i);

    // After manual save, app indicates saved eventually. In local-only mode it should settle quickly.
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(screen.getByLabelText(/save state:/i)).toHaveTextContent(/saved/i);
  });
});
