import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Preferences } from "../types";
import { DEFAULT_PREFERENCES } from "../settingsSchema";

interface PreferencesContextValue {
  prefs: Preferences;
  updatePrefs: (next: Preferences) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  prefs: DEFAULT_PREFERENCES,
  updatePrefs: async () => {},
  loading: true,
  error: null,
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<Preferences>("get_preferences")
      .then((p) => {
        setPrefs(p);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load preferences:", e);
        setLoading(false);
      });
  }, []);

  const updatePrefs = useCallback(
    async (next: Preferences) => {
      setError(null);
      try {
        await invoke("set_preferences", { newPrefs: next });
        setPrefs(next);
      } catch (e) {
        const msg = typeof e === "string" ? e : String(e);
        setError(msg);
        throw new Error(msg);
      }
    },
    [],
  );

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, loading, error }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
