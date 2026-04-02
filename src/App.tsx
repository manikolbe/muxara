import { useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSessions } from "./hooks/useSessions";
import { PreferencesProvider } from "./hooks/usePreferences";
import { SessionGrid } from "./components/SessionGrid";
import { NewSessionButton } from "./components/NewSessionButton";
import { SettingsPanel } from "./components/SettingsPanel";

function Dashboard() {
  const { sessions, loading, error, onScrollActivity } = useSessions();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);

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
        <SessionGrid sessions={sessions} loading={loading} error={error} onScrollActivity={onScrollActivity} focusedSessionId={focusedSessionId} onFocusSession={setFocusedSessionId} />
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
