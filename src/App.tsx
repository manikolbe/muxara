import { useSessions } from "./hooks/useSessions";
import { SessionGrid } from "./components/SessionGrid";

function App() {
  const { sessions, loading, error } = useSessions();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <h1 className="text-xl font-semibold mb-4">Muxara</h1>
      <SessionGrid sessions={sessions} loading={loading} error={error} />
    </div>
  );
}

export default App;
