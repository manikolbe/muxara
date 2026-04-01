import { useSessions } from "./hooks/useSessions";
import { SessionGrid } from "./components/SessionGrid";
import { NewSessionButton } from "./components/NewSessionButton";

function App() {
  const { sessions, loading, error, onScrollActivity } = useSessions();

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      {/* Custom title bar — draggable, sits in the overlay zone */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between pl-[78px] pr-4 pt-2 pb-1 shrink-0"
      >
        <div data-tauri-drag-region className="flex items-center gap-1.5">
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
          <span className="text-base font-semibold text-gray-300">Muxara</span>
        </div>
        <NewSessionButton />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <SessionGrid sessions={sessions} loading={loading} error={error} onScrollActivity={onScrollActivity} />
      </div>
    </div>
  );
}

export default App;
