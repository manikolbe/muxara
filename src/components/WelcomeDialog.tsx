import { useState } from "react";
import type { Preferences } from "../types";

export function WelcomeDialog({
  prefs,
  updatePrefs,
  onComplete,
}: {
  prefs: Preferences;
  updatePrefs: (next: Preferences) => Promise<void>;
  onComplete: () => void;
}) {
  const [terminalApp, setTerminalApp] = useState(prefs.terminalApp);
  const [saving, setSaving] = useState(false);

  async function handleGetStarted() {
    setSaving(true);
    try {
      await updatePrefs({
        ...prefs,
        terminalApp,
        firstRunComplete: true,
      });
      onComplete();
    } catch {
      // Prefs provider already surfaces errors — still dismiss
      onComplete();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[420px] p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-100">
            Welcome to Muxara
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            A quick setup before you get started.
          </p>
        </div>

        {/* Terminal selection */}
        <div>
          <p className="text-sm text-gray-300 mb-2">
            Which terminal app do you use?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTerminalApp("terminal")}
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-3 transition-colors ${
                terminalApp === "terminal"
                  ? "border-blue-500 bg-blue-950/30 text-blue-300"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
              }`}
            >
              <span className="text-2xl">&#xF8FF;</span>
              <span className="text-sm font-medium">Terminal.app</span>
              <span className="text-[10px] text-gray-500">Built-in</span>
            </button>
            <button
              onClick={() => setTerminalApp("iterm2")}
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-3 transition-colors ${
                terminalApp === "iterm2"
                  ? "border-blue-500 bg-blue-950/30 text-blue-300"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
              }`}
            >
              <span className="text-2xl">&gt;_</span>
              <span className="text-sm font-medium">iTerm2</span>
              <span className="text-[10px] text-gray-500">iterm2.com</span>
            </button>
          </div>
        </div>

        {/* Worktree info */}
        <div className="bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700/50">
          <p className="text-sm text-gray-300">
            <span className="text-violet-400 font-medium">Git worktrees</span>{" "}
            are enabled by default. Each new session gets an isolated copy of
            your repo so parallel sessions don't conflict.
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5">
            You can change this and other options in{" "}
            <span className="text-gray-400">Settings</span> at any time.
          </p>
        </div>

        {/* Get started */}
        <button
          onClick={handleGetStarted}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
        >
          {saving ? "Saving..." : "Get Started"}
        </button>
      </div>
    </div>
  );
}
