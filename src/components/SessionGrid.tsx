import type { Session } from "../types";
import { SessionCard } from "./SessionCard";
import { usePreferences } from "../hooks/usePreferences";

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6",
};

interface SessionGridProps {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  onScrollActivity: () => void;
  focusedSessionId: string | null;
  onFocusSession: (id: string) => void;
}

export function SessionGrid({ sessions, loading, error, onScrollActivity, focusedSessionId, onFocusSession }: SessionGridProps) {
  const { prefs } = usePreferences();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <p>Failed to load sessions: {error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No active sessions</p>
      </div>
    );
  }

  return (
    <div className={`grid ${GRID_COLS[prefs.gridColumns] || GRID_COLS[2]} gap-4`}>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onScrollActivity={onScrollActivity} focused={session.id === focusedSessionId} onFocus={onFocusSession} />
      ))}
    </div>
  );
}
