"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useStore } from "./Store";
import {
  CM_OPTIONS,
  FLOW_OPTIONS,
  MOODS,
  SEX_OPTIONS,
  SYMPTOMS,
} from "@/lib/constants";
import { CervicalMucus, DayEntry, FlowLevel, OvulationTest, SexEntry } from "@/lib/schema";

export default function DaySheet({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const { snapshot, setEntry, removeEntry, settings } = useStore();

  const existing = useMemo(
    () =>
      Object.values(snapshot.entries).find(
        (e) => e.date === date && !e.deletedAt
      ),
    [snapshot.entries, date]
  );

  const [entry, setLocal] = useState<DayEntry>(() =>
    existing || {
      id: `e-${date}-${Math.random().toString(36).slice(2, 9)}`,
      date,
      updatedAt: new Date().toISOString(),
    }
  );

  useEffect(() => {
    setLocal(
      existing || {
        id: `e-${date}-${Math.random().toString(36).slice(2, 9)}`,
        date,
        updatedAt: new Date().toISOString(),
      }
    );
  }, [date, existing]);

  const update = (patch: Partial<DayEntry>) => {
    const next = { ...entry, ...patch, updatedAt: new Date().toISOString() };
    setLocal(next);
    setEntry(next);
  };

  const toggleArr = (key: "symptoms" | "mood" | "sex" | "medications", val: string) => {
    const arr = (entry[key] as string[]) || [];
    const has = arr.includes(val);
    update({ [key]: has ? arr.filter((x) => x !== val) : [...arr, val] } as Partial<DayEntry>);
  };

  const close = () => onClose();

  const groupedSymptoms = useMemo(() => {
    const groups: Record<string, typeof SYMPTOMS> = {};
    for (const s of SYMPTOMS) (groups[s.group] ||= []).push(s);
    return groups;
  }, []);

  const allCustom = settings.customSymptoms || [];

  const dateObj = parseISO(date);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in oklab, black 30%, transparent)" }}
        onClick={close}
      />
      <div
        className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-strong)" }} />
        </div>

        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 backdrop-blur"
          style={{
            background: "color-mix(in oklab, var(--surface) 85%, transparent)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-subtle font-medium">
              {format(dateObj, "EEEE")}
            </div>
            <div className="text-lg font-medium tracking-tight">
              {format(dateObj, "MMMM d, yyyy")}
            </div>
          </div>
          <div className="flex gap-2">
            {existing && (
              <button
                onClick={() => {
                  removeEntry(existing.id);
                  close();
                }}
                className="text-sm text-muted hover:text-[var(--accent)] transition px-2"
              >
                Clear
              </button>
            )}
            <button
              onClick={close}
              className="w-9 h-9 rounded-full grid place-items-center transition hover:bg-[var(--surface-hover)]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-7">
          <Section title="Flow">
            <ChipRow
              options={[
                { id: "none", label: "None" },
                ...FLOW_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
              ]}
              selected={entry.flow ? [entry.flow] : []}
              onToggle={(id) => update({ flow: (id as FlowLevel) === entry.flow ? "none" : (id as FlowLevel) })}
              colorize={(id) =>
                id === "spotting"
                  ? "var(--flow-spotting)"
                  : id === "light"
                  ? "var(--flow-light)"
                  : id === "medium"
                  ? "var(--flow-medium)"
                  : id === "heavy"
                  ? "var(--flow-heavy)"
                  : undefined
              }
            />
          </Section>

          <Section title="Mood">
            <ChipRow
              options={MOODS.map((m) => ({ id: m.id, label: m.label }))}
              selected={entry.mood || []}
              onToggle={(id) => toggleArr("mood", id)}
            />
          </Section>

          {Object.entries(groupedSymptoms).map(([group, items]) => (
            <Section key={group} title={group}>
              <ChipRow
                options={items.map((s) => ({ id: s.id, label: s.label }))}
                selected={entry.symptoms || []}
                onToggle={(id) => toggleArr("symptoms", id)}
              />
            </Section>
          ))}

          {allCustom.length > 0 && (
            <Section title="Custom">
              <ChipRow
                options={allCustom.map((s) => ({ id: `custom:${s}`, label: s }))}
                selected={entry.symptoms || []}
                onToggle={(id) => toggleArr("symptoms", id)}
              />
            </Section>
          )}

          <Section title="Sex">
            <ChipRow
              options={SEX_OPTIONS.map((s) => ({ id: s.id, label: s.label }))}
              selected={entry.sex || []}
              onToggle={(id) => toggleArr("sex", id as SexEntry)}
            />
          </Section>

          <Section title="Cervical mucus">
            <ChipRow
              options={CM_OPTIONS.map((s) => ({ id: s.id, label: s.label }))}
              selected={entry.cervicalMucus ? [entry.cervicalMucus] : []}
              onToggle={(id) => update({ cervicalMucus: id === entry.cervicalMucus ? undefined : (id as CervicalMucus) })}
            />
          </Section>

          <Section title="Ovulation test">
            <ChipRow
              options={[
                { id: "negative", label: "Negative" },
                { id: "positive", label: "Positive" },
                { id: "peak", label: "Peak" },
              ]}
              selected={entry.ovulationTest ? [entry.ovulationTest] : []}
              onToggle={(id) =>
                update({ ovulationTest: id === entry.ovulationTest ? undefined : (id as OvulationTest) })
              }
            />
          </Section>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={`BBT (${settings.units === "imperial" ? "°F" : "°C"})`}
              value={entry.bbt}
              step={0.1}
              onChange={(v) => update({ bbt: v })}
              placeholder={settings.units === "imperial" ? "98.4" : "36.6"}
            />
            <NumberField
              label={`Weight (${settings.units === "imperial" ? "lb" : "kg"})`}
              value={entry.weight}
              step={0.1}
              onChange={(v) => update({ weight: v })}
            />
            <NumberField
              label="Sleep (hours)"
              value={entry.sleepHours}
              step={0.25}
              onChange={(v) => update({ sleepHours: v })}
            />
            <NumberField
              label="Water (cups)"
              value={entry.waterCups}
              step={1}
              onChange={(v) => update({ waterCups: v })}
            />
          </div>

          <Section title="Notes">
            <textarea
              value={entry.notes || ""}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Anything you want to remember about today..."
              rows={4}
              className="w-full p-3 rounded-[var(--radius)] resize-y bg-surface"
              style={{ border: "1px solid var(--border)" }}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-subtle font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function ChipRow({
  options,
  selected,
  onToggle,
  colorize,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  colorize?: (id: string) => string | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.id);
        const color = colorize?.(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            className="px-3 py-1.5 rounded-full text-sm transition active:scale-95"
            style={{
              background: active
                ? color || "var(--accent-soft)"
                : "var(--surface-hover)",
              color: active
                ? color
                  ? "white"
                  : "var(--accent-text)"
                : "var(--text-muted)",
              border: `1px solid ${active && color ? color : "var(--border)"}`,
              fontWeight: active ? 500 : 400,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-subtle mb-1.5 font-medium">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : parseFloat(v));
        }}
        className="w-full px-3 py-2 rounded-[var(--radius)] bg-surface tabular-nums"
        style={{ border: "1px solid var(--border)" }}
      />
    </label>
  );
}
