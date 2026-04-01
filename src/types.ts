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
