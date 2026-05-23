"use client";

import { useState } from "react";
import { useStore } from "./Store";
import { themes } from "@/lib/themes";
import { GOAL_MODES } from "@/lib/constants";
import { GoalMode } from "@/lib/schema";

export default function SettingsPanel() {
  const { settings, setSettings, vaultId, passphrase, resetVault, snapshot, forceSync, syncState, lastSyncedAt } = useStore();
  const [showPhrase, setShowPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newSymptom, setNewSymptom] = useState("");

  const update = (patch: Partial<typeof settings>) => setSettings({ ...settings, ...patch });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lune-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <Card title="Sync">
        <div className="flex items-center justify-between gap-3 mb-3">
          <SyncBadge state={syncState} lastSyncedAt={lastSyncedAt} />
          <button
            onClick={forceSync}
            className="text-sm px-3 py-1.5 rounded-full transition active:scale-95"
            style={{ background: "var(--surface-hover)" }}
          >
            Sync now
          </button>
        </div>
        {passphrase && (
          <div>
            <div className="text-xs uppercase tracking-wider text-subtle font-medium mb-1.5">
              Recovery passphrase
            </div>
            <div
              className="relative p-3 rounded-[var(--radius)]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
            >
              <div
                className="text-base font-medium tracking-wide select-all break-words"
                style={{
                  filter: showPhrase ? "none" : "blur(7px)",
                  transition: "filter 200ms",
                }}
              >
                {passphrase}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "var(--surface)" }}
                  onClick={() => setShowPhrase((v) => !v)}
                >
                  {showPhrase ? "Hide" : "Reveal"}
                </button>
                <button
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "var(--surface)" }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(passphrase);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-xs text-subtle mt-2">
              Enter this on another device to access the same data. Anyone with this phrase can read your data — keep it safe.
            </p>
          </div>
        )}
      </Card>

      <Card title="Goal">
        <select
          value={settings.goalMode}
          onChange={(e) => update({ goalMode: e.target.value as GoalMode })}
          className="w-full px-3 py-2.5 rounded-[var(--radius)] bg-surface"
          style={{ border: "1px solid var(--border-strong)" }}
        >
          {GOAL_MODES.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      </Card>

      <Card title="Defaults">
        <Range
          label={`Cycle length baseline · ${settings.defaultCycleLength}d`}
          min={21}
          max={45}
          value={settings.defaultCycleLength}
          onChange={(v) => update({ defaultCycleLength: v })}
        />
        <Range
          label={`Period length baseline · ${settings.defaultPeriodLength}d`}
          min={2}
          max={10}
          value={settings.defaultPeriodLength}
          onChange={(v) => update({ defaultPeriodLength: v })}
        />
      </Card>

      <Card title="Appearance">
        <Field label="Palette">
          <div className="grid grid-cols-5 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => update({ themeId: t.id })}
                className="aspect-square rounded-full transition"
                style={{
                  background: `linear-gradient(135deg, ${t.light.accent}, ${t.dark.accent})`,
                  outline: settings.themeId === t.id ? "2px solid var(--text)" : "none",
                  outlineOffset: 2,
                }}
                aria-label={t.name}
                title={t.name}
              />
            ))}
          </div>
        </Field>
        <Field label="Mode">
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((m) => (
              <button
                key={m}
                onClick={() => update({ themeMode: m })}
                className="py-2 rounded-[var(--radius)] text-sm capitalize transition"
                style={{
                  background: settings.themeMode === m ? "var(--accent-soft)" : "var(--surface-hover)",
                  color: settings.themeMode === m ? "var(--accent-text)" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontWeight: settings.themeMode === m ? 500 : 400,
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Custom accent">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={359}
              value={settings.customAccent?.hue ?? 350}
              onChange={(e) =>
                update({
                  customAccent: {
                    hue: parseInt(e.target.value),
                    saturation: settings.customAccent?.saturation ?? 65,
                  },
                })
              }
              className="flex-1 accent-[var(--accent)]"
              style={{
                background: "linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))",
                borderRadius: 999,
                appearance: "none",
                height: 8,
              }}
            />
            <button
              onClick={() => update({ customAccent: undefined })}
              className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--text-muted)" }}
            >
              Reset
            </button>
          </div>
          {settings.customAccent && (
            <input
              type="range"
              min={10}
              max={100}
              value={settings.customAccent.saturation}
              onChange={(e) =>
                update({
                  customAccent: {
                    hue: settings.customAccent!.hue,
                    saturation: parseInt(e.target.value),
                  },
                })
              }
              className="w-full mt-2 accent-[var(--accent)]"
            />
          )}
        </Field>
        <Field label="Font family">
          <div className="grid grid-cols-4 gap-2">
            {(["sans", "serif", "mono", "rounded"] as const).map((f) => (
              <button
                key={f}
                onClick={() => update({ fontFamily: f })}
                className="py-2 rounded-[var(--radius)] text-sm capitalize transition"
                style={{
                  background: settings.fontFamily === f ? "var(--accent-soft)" : "var(--surface-hover)",
                  color: settings.fontFamily === f ? "var(--accent-text)" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontFamily:
                    f === "serif"
                      ? "'Iowan Old Style', Baskerville, serif"
                      : f === "mono"
                      ? "var(--font-geist-mono), monospace"
                      : f === "rounded"
                      ? "'SF Pro Rounded', 'Nunito', sans-serif"
                      : undefined,
                  fontWeight: settings.fontFamily === f ? 500 : 400,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Density">
          <div className="grid grid-cols-3 gap-2">
            {(["compact", "comfortable", "spacious"] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  update({ density: d });
                  document.body.className = `min-h-full flex flex-col density-${d}`;
                }}
                className="py-2 rounded-[var(--radius)] text-sm capitalize transition"
                style={{
                  background: settings.density === d ? "var(--accent-soft)" : "var(--surface-hover)",
                  color: settings.density === d ? "var(--accent-text)" : "var(--text)",
                  border: "1px solid var(--border)",
                  fontWeight: settings.density === d ? 500 : 400,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card title="Calendar & Units">
        <Field label="Week starts on">
          <div className="grid grid-cols-2 gap-2">
            {(["sunday", "monday"] as const).map((d) => (
              <button
                key={d}
                onClick={() => update({ calendarStart: d })}
                className="py-2 rounded-[var(--radius)] text-sm capitalize transition"
                style={{
                  background: settings.calendarStart === d ? "var(--accent-soft)" : "var(--surface-hover)",
                  color: settings.calendarStart === d ? "var(--accent-text)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Units">
          <div className="grid grid-cols-2 gap-2">
            {(["imperial", "metric"] as const).map((u) => (
              <button
                key={u}
                onClick={() => update({ units: u })}
                className="py-2 rounded-[var(--radius)] text-sm capitalize transition"
                style={{
                  background: settings.units === u ? "var(--accent-soft)" : "var(--surface-hover)",
                  color: settings.units === u ? "var(--accent-text)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {u === "imperial" ? "°F / lb" : "°C / kg"}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card title="Customize">
        <Toggle
          label="Hide fertile window & ovulation"
          checked={settings.hideFertileWindow}
          onChange={(v) => update({ hideFertileWindow: v })}
          hint="Useful when on hormonal birth control or if you don’t want to see fertility predictions."
        />
        <Toggle
          label="Gender-neutral language"
          checked={settings.genderNeutral}
          onChange={(v) => update({ genderNeutral: v })}
        />
        <Field label="Custom symptoms">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              placeholder="Add a symptom..."
              className="flex-1 px-3 py-2 rounded-[var(--radius)] bg-surface text-sm"
              style={{ border: "1px solid var(--border-strong)" }}
            />
            <button
              onClick={() => {
                const s = newSymptom.trim();
                if (!s) return;
                update({ customSymptoms: [...settings.customSymptoms, s] });
                setNewSymptom("");
              }}
              className="px-4 rounded-[var(--radius)] text-sm"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Add
            </button>
          </div>
          {settings.customSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {settings.customSymptoms.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5"
                  style={{ background: "var(--surface-hover)" }}
                >
                  {s}
                  <button
                    onClick={() =>
                      update({
                        customSymptoms: settings.customSymptoms.filter((x) => x !== s),
                      })
                    }
                    className="text-subtle hover:text-[var(--accent)]"
                    aria-label={`Remove ${s}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </Card>

      <Card title="Data">
        <button
          onClick={exportJson}
          className="w-full py-2.5 rounded-[var(--radius)] text-sm font-medium transition"
          style={{ background: "var(--surface-hover)" }}
        >
          Export all data as JSON
        </button>
        <p className="text-xs text-subtle mt-2">
          Your data lives in a private blob keyed by your passphrase. Every change is merged with what’s on the server using last-write-wins per entry — no device can ever wipe another.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="mt-4 text-sm w-full py-2 rounded-[var(--radius)]"
            style={{ color: "var(--text-muted)" }}
          >
            Forget this device
          </button>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted">
              This clears local data. Your remote backup remains and can be restored on any device with your passphrase.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-[var(--radius)] text-sm"
                style={{ background: "var(--surface-hover)" }}
              >
                Cancel
              </button>
              <button
                onClick={resetVault}
                className="flex-1 py-2 rounded-[var(--radius)] text-sm"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                Forget
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="text-center text-[10px] text-subtle pb-6">
        Vault ID: <span className="font-mono">{vaultId?.slice(0, 12)}…</span>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-card space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="text-xs uppercase tracking-wider text-subtle font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-subtle mb-2 font-medium">{label}</div>
      {children}
    </div>
  );
}

function Range({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-subtle mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className="relative w-11 h-6 rounded-full transition shrink-0"
        style={{
          background: checked ? "var(--accent)" : "var(--surface-hover)",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
          style={{
            background: "white",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </div>
  );
}

function SyncBadge({ state, lastSyncedAt }: { state: string; lastSyncedAt: string | null }) {
  const colors: Record<string, { bg: string; dot: string; label: string }> = {
    idle: { bg: "var(--surface-hover)", dot: "var(--text-subtle)", label: "Idle" },
    syncing: { bg: "var(--accent-soft)", dot: "var(--accent)", label: "Syncing…" },
    synced: { bg: "var(--accent-soft)", dot: "var(--accent)", label: "Synced" },
    offline: { bg: "var(--surface-hover)", dot: "hsl(40, 80%, 55%)", label: "Offline" },
    error: { bg: "var(--surface-hover)", dot: "hsl(0, 70%, 55%)", label: "Sync error" },
  };
  const c = colors[state] || colors.idle;
  return (
    <div
      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
      style={{ background: c.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}` }}
      />
      <span>{c.label}</span>
      {lastSyncedAt && state === "synced" && (
        <span className="text-subtle">· {relTime(lastSyncedAt)}</span>
      )}
    </div>
  );
}

function relTime(iso: string) {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return `${h}h ago`;
}
