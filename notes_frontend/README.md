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

The development server uses Create React App defaults and serves the app on port 3000 unless you override it via standard CRA mechanisms.

## Environment & Modes

Ocean Notes has two operation modes. The UI and editing experience are the same in both; the difference is whether the app attempts best-effort API sync in the background.

### Mode 1: Local-only mode (default)

In local-only mode, the app never requires a backend. Notes are persisted in the browser via `localStorage`, and all operations (create/edit/delete/search/filter) work entirely offline.

Local-only mode is active when neither `REACT_APP_API_BASE` nor `REACT_APP_BACKEND_URL` is set, or when the provided API base is invalid/unreachable.

Caveats and reset behavior:

The data lives in the current browser profile. Clearing site data, using private browsing, or switching browsers/devices will result in a different local dataset. To reset the app to a clean state, clear the following keys from DevTools Application -> Local Storage, or clear the site storage entirely.

- Notes list: `notes.data.v1`
- Selected note: `notes.selectedId`
- Theme: `notes.theme`

### Mode 2: API-backed mode (optional, best-effort)

API-backed mode is enabled by setting `REACT_APP_API_BASE` (preferred) or `REACT_APP_BACKEND_URL` (fallback). When enabled, the UI still treats local state + `localStorage` as the source of truth, but will attempt to sync changes to the API.

The API client is intentionally non-blocking:

If API calls fail, local edits and autosave still succeed. The only user-visible impact is the save/sync indicator moving to a “sync error” state and a warning toast such as “Saved locally, but API is unreachable.”

#### API endpoints (current expectations)

When an API base is configured, the frontend will attempt these endpoints (see `src/api/notesApi.js`):

- `GET {BASE}/notes` (optional; the UI primarily uses local state)
- `PUT {BASE}/notes/:id` (upsert)
- `DELETE {BASE}/notes/:id`

If your backend uses different paths, update the `notesPath` logic in `src/api/notesApi.js`.

### Environment variables

This repository’s container `.env` includes several variables, but the current React code uses only the API base variables listed below. All other variables should be considered unused by the current code unless you add wiring for them.

#### Used today

- `REACT_APP_API_BASE`  
  Base URL for the Notes API. This is the preferred variable. The value must be a valid absolute URL including scheme, such as `http://localhost:8000` or `https://api.example.com`.

- `REACT_APP_BACKEND_URL`  
  Fallback base URL if `REACT_APP_API_BASE` is not set. It follows the same validation rules.

Implementation details:

The API client trims whitespace, removes a trailing slash, and treats invalid values (for example `localhost:8000` without `http://`) as “API unavailable” rather than as a fatal error.

Recommended values:

In local development, a typical value is `http://localhost:8000` (or whatever your backend uses). In deployment, set this to the publicly reachable base URL for your backend, for example `https://notes-api.yourdomain.com`.

Example:

```bash
# .env (local)
REACT_APP_API_BASE=http://localhost:8000
```

#### Present in container env, but unused by the current code

The following variables are not referenced anywhere in the current `notes_frontend/src/**` code. Setting them will not change runtime behavior unless you add explicit support.

- `REACT_APP_FRONTEND_URL`
- `REACT_APP_WS_URL`
- `REACT_APP_NODE_ENV`
- `REACT_APP_NEXT_TELEMETRY_DISABLED`
- `REACT_APP_ENABLE_SOURCE_MAPS`
- `REACT_APP_PORT`
- `REACT_APP_TRUST_PROXY`
- `REACT_APP_LOG_LEVEL`
- `REACT_APP_HEALTHCHECK_PATH`
- `REACT_APP_FEATURE_FLAGS`
- `REACT_APP_EXPERIMENTS_ENABLED`

## Preview system

The UI includes a user-controlled preview concept: the sidebar shows a one-line preview derived from each note’s body, and the editor shows metadata including note timestamps and ID. This is purely a UI feature; it does not require backend support and does not change how notes are saved.

## Accessibility and shortcuts

Keyboard shortcuts are available globally:

- New note: Ctrl/Cmd+N
- Search: Ctrl/Cmd+K
- Save: Ctrl/Cmd+S

Accessibility/landmark notes:

The app includes explicit landmarks and ARIA labels to support assistive technologies, including a top-level header (`aria-label="Application header"`), a sidebar region (`aria-label="Notes sidebar"`), and an editor pane main region (`aria-label="Editor pane"`). Save state and toast messages are announced using `aria-live="polite"`.

## Scripts

- `npm start` – dev server
- `npm test` – unit tests
- `npm run build` – production build
