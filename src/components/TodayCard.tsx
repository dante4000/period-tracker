"use client";

import { useMemo } from "react";
import { useStore } from "./Store";
import {
  computeStats,
  deriveCycles,
  phaseDescription,
  predict,
} from "@/lib/cycle";
import { format, parseISO } from "date-fns";

export default function TodayCard({ onLogToday }: { onLogToday: () => void }) {
  const { snapshot, settings } = useStore();
  const entries = useMemo(
    () => Object.values(snapshot.entries).filter((e) => !e.deletedAt),
    [snapshot.entries]
  );
  const cycles = useMemo(() => deriveCycles(entries), [entries]);
  const stats = useMemo(() => computeStats(cycles, settings), [cycles, settings]);
  const prediction = useMemo(() => predict(cycles, stats), [cycles, stats]);

  const phase = phaseDescription[prediction.phase];
  const noData = !prediction.lastPeriodStart;

  const cycleDay = prediction.currentCycleDay;
  const cycleLen = stats.avgCycleLength;
  const progress = cycleDay && cycleLen ? Math.min(1, cycleDay / cycleLen) : 0;

  const daysUntil = prediction.daysUntilPeriod;
  const daysLabel =
    daysUntil === null
      ? null
      : daysUntil === 0
      ? "Period likely today"
      : daysUntil < 0
      ? `Period ${Math.abs(daysUntil)} days late`
      : daysUntil === 1
      ? "Period in 1 day"
      : `Period in ${daysUntil} days`;

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 shadow-card animate-scale-in"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Ring widget */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx={50}
              cy={50}
              r={44}
              fill="none"
              stroke="var(--surface-hover)"
              strokeWidth={7}
            />
            <circle
              cx={50}
              cy={50}
              r={44}
              fill="none"
              stroke={phase.color}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
              style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            {cycleDay ? (
              <div>
                <div className="text-3xl font-medium tabular-nums leading-none">{cycleDay}</div>
                <div className="text-[10px] uppercase tracking-wider text-subtle mt-1">Day</div>
              </div>
            ) : (
              <div className="text-2xl" style={{ color: "var(--accent)" }}>☾</div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-subtle font-medium mb-1">
            {format(new Date(), "EEEE, MMM d")}
          </div>
          <h2 className="text-lg sm:text-xl font-medium tracking-tight" style={{ color: phase.color }}>
            {phase.title}
          </h2>
          <p className="text-[13px] sm:text-sm text-muted mt-1 leading-snug">{phase.body}</p>
          {daysLabel && (
            <div
              className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-text)",
              }}
            >
              {daysLabel}
            </div>
          )}
        </div>
      </div>

      {!noData && (
        <div className="grid grid-cols-3 gap-2 mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <Stat label="Avg cycle" value={`${stats.avgCycleLength}d`} sub={stats.sampleSize > 0 ? `n=${stats.sampleSize}` : "default"} />
          <Stat
            label="Next period"
            value={prediction.predictedPeriodStart ? format(parseISO(prediction.predictedPeriodStart), "MMM d") : "—"}
            sub={prediction.confidence}
          />
          <Stat
            label={settings.hideFertileWindow ? "Period length" : "Ovulation"}
            value={
              settings.hideFertileWindow
                ? `${stats.avgPeriodLength}d`
                : prediction.predictedOvulation
                ? format(parseISO(prediction.predictedOvulation), "MMM d")
                : "—"
            }
          />
        </div>
      )}

      <button
        onClick={onLogToday}
        className="mt-5 w-full py-3 rounded-full font-medium transition active:scale-[0.99]"
        style={{
          background: "var(--accent)",
          color: "var(--accent-foreground)",
        }}
      >
        Log today
      </button>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className="text-lg font-medium tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-subtle mt-0.5 capitalize">{sub}</div>}
    </div>
  );
}
