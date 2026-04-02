import { useState, useEffect } from "react";
import { usePreferences } from "../hooks/usePreferences";
import { SETTINGS_SCHEMA, CATEGORIES, DEFAULT_PREFERENCES } from "../settingsSchema";
import type { Preferences, SettingDefinition } from "../types";

interface SettingsPanelProps {
  onClose: () => void;
}

function NumberField({
  def,
  value,
  onChange,
}: {
  def: SettingDefinition;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      />
      {def.unit && (
        <span className="text-xs text-gray-500">{def.unit}</span>
      )}
    </div>
  );
}

function BooleanField({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? "bg-blue-500" : "bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          value ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SelectField({
  def,
  value,
  onChange,
}: {
  def: SettingDefinition;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
    >
      {def.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SettingRow({
  def,
  value,
  onChange,
}: {
  def: SettingDefinition;
  value: number | boolean;
  onChange: (v: number | boolean) => void;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200">{def.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{def.description}</div>
        </div>
        <div className="shrink-0 pt-0.5">
          {def.type === "boolean" ? (
            <BooleanField
              value={value as boolean}
              onChange={onChange}
            />
          ) : def.type === "select" ? (
            <SelectField
              def={def}
              value={value as number}
              onChange={(v) => onChange(v)}
            />
          ) : (
            <NumberField
              def={def}
              value={value as number}
              onChange={(v) => onChange(v)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { prefs, updatePrefs } = usePreferences();
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [draft, setDraft] = useState<Preferences>({ ...prefs });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft({ ...prefs });
    setDirty(false);
  }, [prefs]);

  const categorySettings = SETTINGS_SCHEMA.filter(
    (s) => s.category === activeCategory,
  );

  const handleChange = (key: keyof Preferences, value: number | boolean) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    try {
      await updatePrefs(draft);
      setDirty(false);
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleReset = async () => {
    try {
      await updatePrefs({ ...DEFAULT_PREFERENCES });
      setDraft({ ...DEFAULT_PREFERENCES });
      setDirty(false);
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          <div className="w-36 border-r border-gray-700 py-2 shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
                  activeCategory === cat
                    ? "text-gray-200 bg-gray-800 font-medium"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Settings content */}
          <div className="flex-1 px-4 py-3 overflow-y-auto">
            <div className="divide-y divide-gray-800">
              {categorySettings.map((def) => (
                <SettingRow
                  key={def.key}
                  def={def}
                  value={draft[def.key]}
                  onChange={(v) => handleChange(def.key, v)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <div className="text-xs text-red-400 min-h-[1em]">
            {saveError || ""}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                dirty
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
