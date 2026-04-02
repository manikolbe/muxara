# Architecture

This document covers the full architecture of Muxara — a Tauri v2 desktop app with a Rust backend and React frontend.

## Tech Stack

- **Desktop framework**: Tauri v2 (Rust backend + web frontend in a single binary)
- **Frontend**: React + TypeScript + Tailwind CSS (via Vite)
- **Backend**: Rust (Tauri commands invoked from the frontend via `@tauri-apps/api`)
- **Session layer**: tmux (managed by the backend, hidden from the user)

## Platform Support

macOS only. The terminal integration layer (`commands.rs: focus_session`) uses AppleScript (`osascript`) to control iTerm2 windows — there is no abstraction for other terminal emulators or platforms. Preferences persist to `~/Library/Application Support/com.muxara.app/` via Tauri's `app_config_dir()`. The tmux and process-detection layers (`tmux/client.rs`) use POSIX commands (`ps -ax`, process tree walking) that would work on Linux but have not been tested there.

## Project Structure

```
muxara/
├── src/                         Frontend (React + TypeScript)
│   ├── main.tsx                 React entry point, mounts App
│   ├── App.tsx                  Root component — uses useSessions hook, renders SessionGrid
│   ├── types.ts                 Shared TypeScript types (Session, SessionState, Preferences, SettingDefinition)
│   ├── settingsSchema.ts        Settings schema: definitions, defaults, categories for the settings UI
│   ├── styles.css               Tailwind base styles
│   ├── hooks/
│   │   ├── useSessions.ts       Polling hook — calls get_sessions at configurable interval
│   │   └── usePreferences.tsx   PreferencesContext + provider + hook for user-configurable settings
│   └── components/
│       ├── SessionGrid.tsx      Grid layout for session cards, handles loading/error/empty states
│       ├── SessionCard.tsx      Two-zone card: orientation (status, title, dir, recency) + context (output)
│       ├── StatusBadge.tsx      Colored status dot per session state
│       ├── NewSessionButton.tsx "+" button to create new Claude Code sessions
│       └── SettingsPanel.tsx    VS Code-style settings modal with category sidebar
├── src-tauri/                   Backend (Rust)
│   ├── src/
│   │   ├── main.rs              Entry point, delegates to lib.rs
│   │   ├── lib.rs               Tauri app builder, module registration, managed state
│   │   ├── commands.rs          Tauri command handlers (invoked from frontend)
│   │   ├── preferences.rs       User preferences — struct, validation, JSON persistence
│   │   ├── session.rs           Frontend-facing data model (Session, SessionState, RuntimeState)
│   │   ├── store.rs             In-memory session store with reconciliation logic
│   │   └── tmux/
│   │       ├── mod.rs           Module declaration
│   │       ├── classifier.rs    State classification: regex-based pattern matching on pane output
│   │       └── client.rs        tmux interaction: discovery, capture, ANSI stripping, process detection
│   └── tests/                   Integration tests (see tests/README.md)
├── docs/                        Project documentation
├── spike/                       Phase 0 spike code and fixtures
├── vite.config.ts               Vite config (Tauri plugin)
├── tailwind.config.js           Tailwind config
└── package.json                 Frontend dependencies
```

## Frontend (ticket #4)

The frontend is a React SPA bundled by Vite and rendered inside the Tauri webview.

### Polling hook (`src/hooks/useSessions.ts`)

`useSessions()` encapsulates the polling loop. It calls `invoke<Session[]>("get_sessions")` at the user-configured poll interval (default 1.5s) and returns `{ sessions, loading, error, onScrollActivity }`. Loading is `true` only until the first successful or failed fetch. The `active` flag and `clearInterval` cleanup prevent state updates after unmount. Both the poll interval and scroll pause duration are read from the `PreferencesContext` and trigger effect re-creation when changed. `App.tsx` consumes this hook and passes the result to `SessionGrid`.

### Components

- **`SessionGrid`** — renders a responsive CSS grid (`1 / 2 / 3` columns at sm/lg breakpoints) of `SessionCard` components. Handles three non-data states: loading (shown during first fetch), error (shown when the backend call fails), and empty (no sessions exist). NeedsInput sessions appear first (sorting is handled by the backend).
- **`SessionCard`** — two-zone card layout, clickable to focus the session:
  - **Click handler**: calls `invoke("focus_session", { sessionId })` to open an iTerm2 window attached to the tmux session. Brief scale-down + brightness animation on click. The last-focused card is tracked in `Dashboard` state and displayed with a 3D "lifted" effect (translate, scale, emerald glow shadow) to distinguish it from other cards — separate from the state-colored left border which continues to indicate session state.
  - **Context menu** (right-click): shows a dropdown with Rename and Kill Session actions. Kill shows a confirmation dialog before calling `invoke("kill_session", { sessionId })`. Rename replaces the session title with an inline text input that submits on Enter/blur and cancels on Escape, calling `invoke("rename_session", { sessionId, newName })`.
  - **Orientation zone** (top): status dot (`StatusBadge`), session title (or inline rename input), abbreviated working directory, state label + recency (e.g. "Working · 2m ago"). NeedsInput cards additionally show the input type (Permission / Question).
  - **Context zone** (bottom, separated by a subtle divider): last terminal output lines in monospace.
  - State styling (left border color, background tint) is driven by a `stateConfig` record keyed by `SessionState`.
- **`StatusBadge`** — colored dot indicating session state. Working state pulses via `animate-pulse`.
- **`NewSessionButton`** — "+" button in the app header. Clicking it expands an inline form with an optional session name and a required working directory. The directory is selected via a native OS folder picker (`@tauri-apps/plugin-dialog`). The Create button is disabled until a directory is chosen. Auto-generates a timestamped name if none provided. The new session appears in the dashboard on the next poll cycle.

### Types (`src/types.ts`)

All types mirror the Rust `Session` struct with camelCase field names:
- `SessionState` — `"needs-input" | "working" | "idle" | "errored" | "unknown"`
- `NeedsInputType` — `"permission" | "question"`
- `RuntimeState` — `{ tmuxAlive: boolean, claudeAlive: boolean }`
- `Session` — the full session object received from the backend

## Backend (ticket #5)

### `tmux/client.rs` — tmux interaction layer

Shells out to tmux and system commands to gather raw session data. All tmux interaction is isolated here.

**Key functions:**
- `list_sessions()` / `list_panes()` — discover tmux sessions and panes via `tmux list-sessions -F` / `tmux list-panes -F` with tab-delimited format strings
- `capture_pane(target)` — capture the last 200 lines of a pane's output, strip ANSI codes, trim trailing blank lines (Claude Code's TUI pads panes with empty lines), hash the result
- `is_claude_running(ps_output, pane_pid)` — walk the process tree from a pane's shell PID to detect if a `claude` process is running as a descendant
- `ensure_server()` — start the tmux server if not already running (Muxara manages tmux on behalf of the user)
- `strip_ansi(input)` — remove ANSI escape sequences using a compiled regex
- `hash_output(normalized)` — SHA-256 hash (first 16 hex chars) for change detection

**Raw data structs** (`TmuxSessionInfo`, `TmuxPaneInfo`, `CapturedPane`) are internal and never serialized to the frontend.

**Error handling:** `TmuxError` enum with variants `NotInstalled`, `ServerNotRunning`, `CommandFailed`, `ParseError`. Functions that query tmux return `Ok(empty_vec)` when the server isn't running, rather than propagating the error.

**Testability:** Parsing logic is extracted into pure functions (`parse_sessions_output`, `parse_panes_output`, `find_claude_in_process_tree`) that accept string input, making them testable without a live tmux server.

### `store.rs` — in-memory session store

Maintains a `HashMap<String, TrackedSession>` keyed by pane target string (e.g., `sess1:0.0`). Registered as `Mutex<SessionStore>` in Tauri's managed state.

**`TrackedSession`** holds:
- tmux identity (session name, pane target, pane PID, working directory)
- App-level metadata (display name, created_at, last_seen_at, last_changed_at)
- Capture state (output hash, last N output lines, pane title)
- Runtime state (claude_alive, tmux_alive)
- Classification fields (state, needs_input_type, is_in_plan_mode, consecutive_idle_count) — defaulted to `Unknown`, populated by the classifier each reconcile cycle

**`reconcile()`** is called each poll cycle:
1. For each live tmux pane, upsert a `TrackedSession`
2. Update runtime fields from fresh data
3. Compare output hash — if changed, update `last_changed_at` and `last_output_lines`
4. Prune sessions whose pane target no longer appears in tmux

**`to_sessions()`** converts tracked sessions to frontend-ready `Session` structs with ISO 8601 timestamps. Sessions are sorted by state priority (NeedsInput > Errored > Working > Idle > Unknown), then alphabetically by name.

### `session.rs` — data model

Frontend-facing types serialized via serde:
- `SessionState` — `NeedsInput`, `Working`, `Idle`, `Errored`, `Unknown` (kebab-case)
- `NeedsInputType` — `Permission`, `Question` (camelCase)
- `RuntimeState` — `tmux_alive`, `claude_alive` (camelCase)
- `Session` — the full session object sent to the frontend

### `commands.rs` — Tauri commands

`create_session(name, working_dir, command)` creates a new tmux session and starts Claude Code in it. Requires a non-empty `working_dir`. Ensures the tmux server is running, checks for duplicate session names (returns an error if one exists), creates the session with `tmux new-session -d -s <name> -c <dir>`, then sends the bootstrap command via `tmux send-keys`. The command parameter defaults to `"claude"` if empty. The session auto-appears in the dashboard on the next poll cycle.

`resolve_bootstrap_command(working_dir)` returns the effective bootstrap command for a given working directory by checking project overrides first, then falling back to the global default.

`focus_session(session_id)` opens a new iTerm2 window attached to the tmux session. It extracts the session name from the pane target ID, verifies the session exists, then uses AppleScript (`osascript`) to launch iTerm2 with `tmux attach -t <session>`. Returns an error string if the session is not found or the terminal fails to open.

`kill_session(session_id)` kills a tmux session. Extracts the session name from the pane target ID, calls `tmux kill-session -t <name>`, and removes the session from the in-memory store so the UI updates immediately.

`rename_session(session_id, new_name)` renames a tmux session. Validates that the new name is non-empty and not a duplicate, calls `tmux rename-session -t <old> <new>`, and updates the in-memory store (session name, display name, and pane target key) so the UI reflects the change immediately.

`get_sessions()` is called by the frontend every 2 seconds:
1. Check if tmux is alive; start server if needed
2. List all panes
3. Fetch process table once (`ps -ax`), check each pane for a running `claude` process
4. Capture pane output for each pane
5. Reconcile with the session store
6. Return frontend-ready sessions

## Data Flow

```
Frontend (2s poll)
  │
  ▼
get_sessions (Tauri command)
  │
  ├── is_tmux_alive() / ensure_server()
  ├── list_panes(None) → Vec<TmuxPaneInfo>
  ├── get_process_table() → ps output (once per cycle)
  │   └── is_claude_running(ps_output, pane_pid) per pane
  ├── capture_pane(target) per pane → CapturedPane
  │   ├── strip_ansi()
  │   └── hash_output()
  │
  ▼
SessionStore::reconcile(panes, captures, claude_status, tmux_alive, output_lines, cooloff_secs)
  │
  ├── per pane: classifier::classify(output, hash, previous_state, timing)
  │   └── returns SessionState + NeedsInputType + isInPlanMode
  │
  ▼
SessionStore::to_sessions() → Vec<Session> → frontend
```

## Key Patterns

- **`LazyLock` for regex:** The ANSI stripping regex is compiled once and reused across all calls via `std::sync::LazyLock`.
- **Single `ps -ax` per poll:** The process table is fetched once per poll cycle, then each pane's `claude` status is checked from the parsed table. This is O(n) in process count, done once — not O(panes * processes).
- **`Mutex<SessionStore>` managed state:** The session store persists across poll cycles via Tauri's `.manage()`. A `Mutex` (not `RwLock`) is used because every access both reads and writes.
- **Graceful degradation:** If tmux is not installed or the server isn't running, the system returns an empty session list rather than erroring.
- **Schema-driven settings UI:** Settings are declared once in `settingsSchema.ts` as `SettingDefinition[]` entries. The `SettingsPanel` renders them generically from the schema — adding a new setting requires no component changes.

## Testing Strategy

- **Unit tests**: Inline `#[cfg(test)] mod tests` in each source file. These test pure functions (parsing, ANSI stripping, hashing, process tree walking, store reconciliation) with mock data — no live tmux required.
- **Integration tests**: `src-tauri/tests/` directory. Each `.rs` file compiles as a separate crate testing the public API across modules. See `tests/README.md` for conventions. Tests requiring a live tmux server should be gated with `#[ignore]`.

Run all tests with `cargo test`. Run only integration tests with `cargo test --test '*'`.

## State Classification (ticket #6)

### `tmux/classifier.rs` — state classifier

Determines a session's state from its pane output and temporal context. Ported from the Phase 0 spike (`spike/src/classifier.ts`).

**Input:** `ClassifierInput` containing:
- `normalized_output` — ANSI-stripped pane content
- `output_hash` / `previous_hash` — for delta detection
- `previous_state` — for debounce logic
- `seconds_since_last_change` — time since output last changed
- `consecutive_idle_count` — for Working→Idle debounce

**Output:** `ClassifierResult` with `state`, `needs_input_type`, `is_in_plan_mode`, and `debounce_applied` (true when Working state was held by debounce rather than an active working signal).

**Priority order:** NeedsInput > Errored > Working > Idle > Unknown

**Signal detection:**

| Signal type | Patterns | State |
|---|---|---|
| Permission prompt | `Do you want to proceed?`, `Do you want to create`, `This command requires approval`, `Esc to cancel · Tab to amend` | NeedsInput (Permission) |
| AskUserQuestion | `☐` marker, `Enter to select · ↑/↓ to navigate` | NeedsInput (Question) |
| Shell error | `^error:` at line start | Errored |
| Tool error | `⎿ Error:`, `Error: Exit code N` | Errored |
| Output delta | Hash changed + change within 5s threshold | Working |
| Plan mode | `Entered plan mode`, `✻` spinner (hard); `⏸ plan mode on` status bar (soft fallback) | isInPlanMode=true |
| Claude markers | `❯`, `▐▛███▜▌`, `⏺` present + no other signals | Idle |
| No markers | No recognizable Claude output | Unknown |

**Working→Idle debounce:** When previous state is Working and classifier would say Idle, require 2 consecutive idle readings before transitioning. This prevents flicker during brief pauses between tool calls. Hard signals (NeedsInput, Errored) bypass the debounce immediately. The classifier reports `debounce_applied = true` when it holds Working state this way, so the store can correctly increment `consecutive_idle_count` — the counter is driven by the debounce flag, not the final state, to avoid a circular dependency where the debounced Working result would prevent the counter from ever reaching the threshold.

**Classification focus:** Only the last 50 lines of output are checked for most patterns (the "tail"), since the most recent state is at the bottom. Shell-level errors and plan mode transitions are checked against full output.

**Integration:** The classifier runs during `SessionStore::reconcile()` for each pane that has captured output. The store tracks `consecutive_idle_count` per session to support debounce.

## User Preferences (ticket #25)

### `preferences.rs` — persistence and validation

The `Preferences` struct holds all user-configurable settings, serialized to/from a JSON file in the Tauri app config directory (`~/Library/Application Support/com.muxara.app/preferences.json` on macOS). On first launch, defaults are used in-memory; the file is created when the user first saves settings.

**Settings:**

| Setting | Field | Default | Range | Project-compatible |
|---|---|---|---|---|
| Bootstrap command | `bootstrap_command` | `"claude"` | non-empty, max 500 chars | Yes |
| Working→Idle cool-off | `cooloff_minutes` | 5.0 | 0–60 min | No |
| Poll interval | `poll_interval_secs` | 1.5 | 0.5–30 s | No |
| Output lines per card | `output_lines` | 20 | 1–200 | No |
| Show idle/unknown output | `show_idle_output` | false | — | No |
| Context zone max height | `context_zone_max_height` | 192 | 48–800 px | No |
| Grid columns | `grid_columns` | 2 | 1–6 | No |
| Scroll pause duration | `scroll_pause_secs` | 5.0 | 0–60 s | No |

### Layered settings model

Settings follow a three-layer resolution model: **hardcoded defaults → user preferences (global) → project overrides (per working directory)**. All configuration lives in one centralized file (`preferences.json`).

Project overrides are stored in a `project_overrides` field keyed by directory path. Each override is a `ProjectOverrides` struct with optional fields for project-compatible settings. Not all settings are project-compatible — dashboard-wide settings (grid columns, poll interval, etc.) affect the whole window and cannot vary per-session. The schema marks each setting with a `projectCompatible` flag that controls which settings appear in the project overrides UI.

**Resolution:** `effective_bootstrap_command(working_dir)` checks project overrides for the given path first, then falls back to the global value. The new session form pre-fills the command from this resolved value and allows inline editing before session creation.

`validate()` checks ranges and returns a user-friendly error string. `load()` gracefully falls back to defaults on missing or corrupt files. `save()` creates the config directory if needed and writes pretty-printed JSON.

### Backend wiring

`Preferences` is registered as `Mutex<Preferences>` managed state in `lib.rs` via a `setup()` closure (since `app_config_dir()` requires the app handle). A `ConfigDir` newtype wraps the config directory path to avoid `State` ambiguity.

Two Tauri commands — `get_preferences` and `set_preferences` — expose read/write access. `set_preferences` validates before persisting. The `get_sessions` command reads `cooloff_minutes` and `output_lines` from preferences and passes them as parameters to `store.reconcile()`, which forwards `cooloff_secs` to the classifier via `ClassifierInput`.

### Frontend wiring

A `PreferencesContext` (in `usePreferences.tsx`) loads preferences on startup and exposes `prefs` + `updatePrefs`. `App.tsx` wraps the dashboard in `<PreferencesProvider>`. Consumer components read preferences via the `usePreferences()` hook:

- `useSessions.ts` — poll interval and scroll pause duration
- `SessionGrid.tsx` — grid column count (static Tailwind class lookup)
- `SessionCard.tsx` — context zone max height (inline style) and idle/unknown output visibility

### Settings UI

The settings panel (`SettingsPanel.tsx`) is a VS Code-style modal with a category sidebar and a schema-driven content area. Settings are declared in `settingsSchema.ts` as `SettingDefinition[]` entries with label, description, type, default, validation ranges, category, and project-compatibility flag. A generic renderer maps each definition to the appropriate input control (number, boolean toggle, select dropdown, or text). Adding a new setting requires only adding a field to the `Preferences` struct/type and a schema entry — no component changes.

Categories include Sessions (bootstrap command), Polling, Display, Classifier, and Projects. The Projects category renders a special view listing configured project directories with their overrides. Each project entry shows only project-compatible settings, with empty fields inheriting the global default. Projects can be added via an OS directory picker and removed individually.

## Spike Reference

The approach was validated in Phase 0 spikes — see `spike/findings.md` for details on:
- ANSI stripping requirements
- Process tree inspection reliability
- State classification patterns and signal taxonomy
- Debounce mechanics for Working→Idle transitions
- Fixture data in `spike/fixtures/` for testing
