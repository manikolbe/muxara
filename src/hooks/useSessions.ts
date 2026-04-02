import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../types";
import { usePreferences } from "./usePreferences";

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  onScrollActivity: () => void;
}

export function useSessions(): UseSessionsResult {
  const { prefs } = usePreferences();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const pausedUntil = useRef(0);

  const scrollPauseMs = prefs.scrollPauseSecs * 1000;

  const onScrollActivity = useCallback(() => {
    pausedUntil.current = Date.now() + scrollPauseMs;
  }, [scrollPauseMs]);

  const pollIntervalMs = prefs.pollIntervalSecs * 1000;

  useEffect(() => {
    let active = true;

    const fetchSessions = async () => {
      if (Date.now() < pausedUntil.current) return;
      try {
        const data = await invoke<Session[]>("get_sessions");
        if (!active) return;
        setSessions(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active && !hasFetched.current) {
          hasFetched.current = true;
          setLoading(false);
        }
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, pollIntervalMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return { sessions, loading, error, onScrollActivity };
}
