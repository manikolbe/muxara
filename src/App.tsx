import { useState, useCallback, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useSessions } from "./hooks/useSessions";
import { PreferencesProvider, usePreferences } from "./hooks/usePreferences";
import { SessionGrid } from "./components/SessionGrid";
import { NewSessionButton } from "./components/NewSessionButton";
import { SettingsPanel } from "./components/SettingsPanel";

function Dashboard() {
  const { sessions, loading, error, onScrollActivity } = useSessions();
  const { prefs } = usePreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Keyboard navigation for session cards
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (sessions.length === 0) return;
      // Don't capture keys when typing in inputs or when settings is open
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || settingsOpen) return;

      const cols = prefs.gridColumns;
      let nextIndex = selectedIndex;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIndex = selectedIndex < 0 ? 0 : Math.min(selectedIndex + 1, sessions.length - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = selectedIndex < 0 ? 0 : Math.max(selectedIndex - 1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          nextIndex = selectedIndex < 0 ? 0 : Math.min(selectedIndex + cols, sessions.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex = selectedIndex < 0 ? 0 : Math.max(selectedIndex - cols, 0);
          break;
        case "Enter": {
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < sessions.length) {
            const session = sessions[selectedIndex];
            setFocusedSessionId(session.id);
            invoke("focus_session", { sessionId: session.id }).catch((err) =>
              console.error("Failed to focus session:", err)
            );
          }
          return;
        }
        default:
          return;
      }

      setSelectedIndex(nextIndex);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions, selectedIndex, prefs.gridColumns, settingsOpen]);

  // Reset selection when sessions change and index is out of bounds
  useEffect(() => {
    if (selectedIndex >= sessions.length) {
      setSelectedIndex(sessions.length > 0 ? sessions.length - 1 : -1);
    }
  }, [sessions.length, selectedIndex]);

  const handleTitleBarDrag = useCallback((e: React.MouseEvent) => {
    // Only initiate drag if the mousedown target is the drag region itself,
    // not an interactive child (button, input, etc.)
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, select")) return;
    e.preventDefault();
    getCurrentWindow().startDragging();
  }, []);

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      {/* Custom title bar — draggable, sits in the overlay zone */}
      <div
        data-tauri-drag-region
        onMouseDown={handleTitleBarDrag}
        className="flex items-center justify-between pl-[78px] pr-4 pt-2 pb-1 shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-blue-400"
          >
            <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.9" />
            <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.5" />
            <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.5" />
            <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.3" />
          </svg>
          <span className="text-sm font-semibold text-gray-300 uppercase tracking-[0.2em]">Muxara</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NewSessionButton />
          <button
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6.5 1.5h3l.4 1.6.9.4 1.5-.7 2.1 2.1-.7 1.5.4.9 1.6.4v3l-1.6.4-.4.9.7 1.5-2.1 2.1-1.5-.7-.9.4-.4 1.6h-3l-.4-1.6-.9-.4-1.5.7-2.1-2.1.7-1.5-.4-.9L1.3 9.5v-3l1.6-.4.4-.9-.7-1.5 2.1-2.1 1.5.7.9-.4.4-1.6z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <SessionGrid sessions={sessions} loading={loading} error={error} onScrollActivity={onScrollActivity} focusedSessionId={focusedSessionId} onFocusSession={setFocusedSessionId} selectedIndex={selectedIndex} />
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function App() {
  return (
    <PreferencesProvider>
      <Dashboard />
    </PreferencesProvider>
  );
}

export default App;
