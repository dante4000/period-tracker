"use client";

import { useEffect, useState } from "react";
import { useStore } from "./Store";
import { applyTheme } from "./ThemeProvider";
import { generatePassphrase } from "@/lib/vault";
import { GOAL_MODES } from "@/lib/constants";
import { GoalMode, Settings, defaultSettings } from "@/lib/schema";
import { themes } from "@/lib/themes";
import { format, parseISO, addDays, differenceInCalendarDays } from "date-fns";

type Step = "welcome" | "passphrase" | "profile" | "first-period" | "theme" | "done";

export default function Onboarding({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { initVault, setSettings, setEntry, snapshot } = useStore();
  const [step, setStep] = useState<Step>("welcome");
  const [phrase, setPhrase] = useState(() => generatePassphrase());
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingPhrase, setExistingPhrase] = useState("");
  const [goal, setGoal] = useState<GoalMode>("track");
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);
  const [lastPeriod, setLastPeriod] = useState<string>(""); // YYYY-MM-DD
  const [themeId, setThemeId] = useState("rose");
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");

  // Live preview: re-apply theme tokens whenever the picker changes
  useEffect(() => {
    applyTheme({
      ...defaultSettings,
      themeId,
      themeMode,
      updatedAt: new Date().toISOString(),
    });
  }, [themeId, themeMode]);

  // Reset to the stored settings when onboarding closes
  useEffect(() => {
    return () => {
      // restore page-level applied theme after onboarding completes
      // (Shell's ThemeProvider will re-apply from saved settings)
    };
  }, []);
  const [showPhrase, setShowPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const next = () => {
    const order: Step[] = ["welcome", "passphrase", "profile", "first-period", "theme", "done"];
    const i = order.indexOf(step);
    setStep(order[Math.min(i + 1, order.length - 1)]);
  };
  const back = () => {
    const order: Step[] = ["welcome", "passphrase", "profile", "first-period", "theme", "done"];
    const i = order.indexOf(step);
    setStep(order[Math.max(i - 1, 0)]);
  };

  const finish = async () => {
    setBusy(true);
    try {
      const usePhrase = mode === "existing" ? existingPhrase.trim() : phrase;
      if (!usePhrase) {
        setBusy(false);
        return;
      }
      await initVault(usePhrase);

      // Only seed settings on NEW vaults. Existing vaults should keep their
      // remote settings (theme, custom accent, etc.) intact when joined.
      if (mode === "new") {
        const settings: Settings = {
          ...defaultSettings,
          goalMode: goal,
          defaultCycleLength: cycleLen,
          defaultPeriodLength: periodLen,
          themeId,
          themeMode,
          updatedAt: new Date().toISOString(),
        };
        setSettings(settings);
      }

      if (lastPeriod && mode === "new") {
        // Seed the first period: log bleeding for periodLen days starting at lastPeriod
        const start = parseISO(lastPeriod);
        const today = new Date();
        const lastDay = addDays(start, periodLen - 1);
        const lastLogged = lastDay > today ? today : lastDay;
        const days = differenceInCalendarDays(lastLogged, start);
        for (let i = 0; i <= days; i++) {
          const d = addDays(start, i);
          const dateStr = format(d, "yyyy-MM-dd");
          setEntry({
            id: `seed-${dateStr}`,
            date: dateStr,
            flow: i === 0 || i === days ? "light" : "medium",
            updatedAt: new Date().toISOString(),
          });
        }
      }
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md animate-slide-up">
        <Logo />
        <Card>
          {step === "welcome" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-medium tracking-tight">Welcome to Luna</h1>
              <p className="text-muted leading-relaxed">
                A calm, private period tracker that syncs across all your devices with a single passphrase.
                No accounts, no email, no ads — just your cycle, wherever you are.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Feature icon="◐" label="Cycle prediction" />
                <Feature icon="◆" label="Cross-device sync" />
                <Feature icon="✺" label="Local-first, private" />
              </div>
              <PrimaryButton onClick={next}>Get started</PrimaryButton>
            </div>
          )}

          {step === "passphrase" && (
            <div className="space-y-5">
              <Header back={back}>Your passphrase</Header>
              <p className="text-muted text-sm leading-relaxed">
                Your data is tied to a passphrase. The same passphrase on any device opens the same data.
                We never store your name, email, or anything that identifies you.
              </p>
              <div className="flex rounded-[var(--radius)] border-default p-1 text-sm">
                <SegBtn active={mode === "new"} onClick={() => setMode("new")}>
                  New passphrase
                </SegBtn>
                <SegBtn active={mode === "existing"} onClick={() => setMode("existing")}>
                  I have one
                </SegBtn>
              </div>

              {mode === "new" ? (
                <div className="space-y-3">
                  <div
                    className="relative p-4 rounded-[var(--radius)] border border-strong bg-elevated"
                    style={{ borderColor: "var(--border-strong)" }}
                  >
                    <div
                      className="text-xl font-medium tracking-wide select-all break-words"
                      style={{ filter: showPhrase ? "none" : "blur(8px)", transition: "filter 200ms" }}
                    >
                      {phrase}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <SecondaryButton onClick={() => setShowPhrase((v) => !v)}>
                        {showPhrase ? "Hide" : "Reveal"}
                      </SecondaryButton>
                      <SecondaryButton onClick={() => setPhrase(generatePassphrase())}>
                        Regenerate
                      </SecondaryButton>
                      <SecondaryButton onClick={copyPhrase}>
                        {copied ? "Copied!" : "Copy"}
                      </SecondaryButton>
                    </div>
                  </div>
                  <div
                    className="text-xs px-3 py-2 rounded-md"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                  >
                    ⚠️ Write this down. Losing it means losing your data.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    autoCapitalize="off"
                    autoComplete="off"
                    spellCheck={false}
                    value={existingPhrase}
                    onChange={(e) => setExistingPhrase(e.target.value)}
                    placeholder="four-words-with-dashes"
                    className="w-full px-4 py-3 rounded-[var(--radius)] border-default bg-surface text-base"
                    style={{ border: "1px solid var(--border-strong)" }}
                  />
                  <p className="text-xs text-subtle">
                    Type the passphrase from another device exactly as shown there.
                  </p>
                </div>
              )}

              {/* Existing vaults already hold their own settings (theme, cycle,
                  history) on the server. Re-asking the onboarding questions is
                  pointless — finish() throws those answers away for existing
                  vaults anyway. So jump straight to restoring. */}
              <PrimaryButton
                onClick={mode === "existing" ? finish : next}
                disabled={
                  busy || (mode === "existing" && existingPhrase.trim().length < 4)
                }
              >
                {mode === "existing"
                  ? busy
                    ? "Restoring…"
                    : "Restore my data"
                  : "Continue"}
              </PrimaryButton>
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-5">
              <Header back={back}>Your cycle</Header>
              <p className="text-muted text-sm">A starting point — Luna will personalize this as you log.</p>
              <div className="space-y-4">
                <Field label="Goal">
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as GoalMode)}
                    className="w-full px-3 py-2.5 rounded-[var(--radius)] bg-surface"
                    style={{ border: "1px solid var(--border-strong)" }}
                  >
                    {GOAL_MODES.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label={`Cycle length: ${cycleLen} days`}>
                  <input
                    type="range"
                    min={21}
                    max={45}
                    value={cycleLen}
                    onChange={(e) => setCycleLen(parseInt(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </Field>
                <Field label={`Period length: ${periodLen} days`}>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={periodLen}
                    onChange={(e) => setPeriodLen(parseInt(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </Field>
              </div>
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </div>
          )}

          {step === "first-period" && (
            <div className="space-y-5">
              <Header back={back}>Last period</Header>
              <p className="text-muted text-sm">When did your last period start? Skip if you’re not sure.</p>
              <input
                type="date"
                value={lastPeriod}
                onChange={(e) => setLastPeriod(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="w-full px-4 py-3 rounded-[var(--radius)] bg-surface text-base"
                style={{ border: "1px solid var(--border-strong)" }}
              />
              <div className="flex gap-2">
                <SecondaryButton onClick={next}>Skip</SecondaryButton>
                <PrimaryButton onClick={next}>Continue</PrimaryButton>
              </div>
            </div>
          )}

          {step === "theme" && (
            <div className="space-y-5">
              <Header back={back}>Make it yours</Header>
              <Field label="Palette">
                <div className="grid grid-cols-5 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className="aspect-square rounded-full ring-offset-2 transition"
                      style={{
                        background: `linear-gradient(135deg, ${t.light.accent}, ${t.dark.accent})`,
                        outline: themeId === t.id ? "2px solid var(--text)" : "none",
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
                      onClick={() => setThemeMode(m)}
                      className="py-2 rounded-[var(--radius)] text-sm capitalize transition"
                      style={{
                        background: themeMode === m ? "var(--accent-soft)" : "var(--surface)",
                        color: themeMode === m ? "var(--accent-text)" : "var(--text)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
              <PrimaryButton onClick={finish} disabled={busy}>
                {busy ? "Setting up..." : "Open Luna"}
              </PrimaryButton>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center justify-center mb-6">
      <div
        className="w-12 h-12 rounded-full grid place-items-center text-xl font-medium"
        style={{
          background: "var(--accent)",
          color: "var(--accent-foreground)",
          boxShadow: "var(--shadow)",
        }}
      >
        ☾
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-6 rounded-2xl shadow-card animate-fade-in"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function Header({ back, children }: { back?: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-medium tracking-tight">{children}</h2>
      {back && (
        <button
          onClick={back}
          className="text-sm text-muted hover:text-[var(--text)] transition"
        >
          Back
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-subtle mb-1.5 font-medium">
        {label}
      </div>
      {children}
    </label>
  );
}

function Feature({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      className="rounded-[var(--radius)] p-3 text-center"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      <div className="text-xl mb-1" style={{ color: "var(--accent)" }}>{icon}</div>
      <div className="text-xs text-muted leading-tight">{label}</div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-full font-medium text-base transition active:scale-[0.98] disabled:active:scale-100"
      style={{
        background: "var(--accent)",
        color: "var(--accent-foreground)",
        boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 px-3 rounded-[var(--radius)] text-sm transition active:scale-[0.98]"
      style={{ background: "var(--surface-hover)", color: "var(--text)" }}
    >
      {children}
    </button>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-[calc(var(--radius)-2px)] text-sm transition"
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--text-muted)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {children}
    </button>
  );
}
