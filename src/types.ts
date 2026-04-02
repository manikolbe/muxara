export interface Preferences {
  cooloffMinutes: number;
  pollIntervalSecs: number;
  outputLines: number;
  showIdleOutput: boolean;
  contextZoneMaxHeight: number;
  gridColumns: number;
  scrollPauseSecs: number;
}

export type SettingType = "number" | "boolean" | "select";

export interface SettingDefinition {
  key: keyof Preferences;
  label: string;
  description: string;
  category: string;
  type: SettingType;
  default: number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: number; label: string }[];
  unit?: string;
}

export type SessionState = "needs-input" | "working" | "idle" | "errored" | "unknown";
export type NeedsInputType = "permission" | "question";

export interface RuntimeState {
  tmuxAlive: boolean;
  claudeAlive: boolean;
}

export interface Session {
  id: string;
  name: string;
  state: SessionState;
  needsInputType: NeedsInputType | null;
  isInPlanMode: boolean | null;
  lastOutputLines: string[];
  workingDirectory: string;
  lastChangedAt: string;
  lastSeenAt: string;
  createdAt: string;
  previousState: string | null;
  paneTitle: string | null;
  runtimeState: RuntimeState;
}
