# Ocean Notes (React Frontend)

A modern notes organizer UI with an “Ocean Professional” theme (blue + amber accents). Users can create, edit, delete, search, filter, and autosave notes.

## Features

- Responsive layout: header + sidebar notes list + main editor pane
- Create / edit / delete notes
- Search + tag filter
- Sort by last updated time
- Autosave + clear save state indicator (Saved / Unsaved / Saving / Sync error)
- Keyboard shortcuts:
  - New note: **Ctrl/Cmd + N**
  - Search: **Ctrl/Cmd + K**
  - Save: **Ctrl/Cmd + S**
- Persistence fallback via **localStorage**
- Optional API wiring via environment variables

## Getting started

From this folder:

```bash
npm install
npm start
```

Open http://localhost:3000

## Environment variables

This frontend reads (if present):

- `REACT_APP_API_BASE` – Base URL for a notes API (preferred)
- `REACT_APP_BACKEND_URL` – Fallback base URL if `REACT_APP_API_BASE` is not set

If neither is set (or if requests fail), the app **still works fully** using localStorage persistence.

### API expectations (best-effort)

If an API is provided, the frontend will *attempt*:

- `PUT {BASE}/notes/:id` (upsert)
- `DELETE {BASE}/notes/:id`
- `GET {BASE}/notes` (not required for functionality; UI uses local state)

If your backend uses different paths, update `src/api/notesApi.js`.

## Notes storage

- Notes are stored under `localStorage` key: `notes.data.v1`
- Selected note under: `notes.selectedId`
- Theme under: `notes.theme`

## Scripts

- `npm start` – dev server
- `npm test` – unit tests
- `npm run build` – production build
