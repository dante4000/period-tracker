"use client";

import { useMemo } from "react";
import { useStore } from "./Store";
import { computeStats, deriveCycles } from "@/lib/cycle";
import { MOODS, SYMPTOMS } from "@/lib/constants";

export default function Insights() {
  const { snapshot, settings } = useStore();
  const entries = useMemo(
    () => Object.values(snapshot.entries).filter((e) => !e.deletedAt),
    [snapshot.entries]
  );
  const cycles = useMemo(() => deriveCycles(entries), [entries]);
  const stats = useMemo(() => computeStats(cycles, settings), [cycles, settings]);

  // Top symptoms
  const symptomCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) {
      for (const s of e.symptoms || []) c[s] = (c[s] || 0) + 1;
    }
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries]);

  const moodCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) for (const m of e.mood || []) c[m] = (c[m] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [entries]);

  const symptomLabel = (id: string) => {
    if (id.startsWith("custom:")) return id.slice(7);
    return SYMPTOMS.find((s) => s.id === id)?.label || id;
  };
  const moodLabel = (id: string) => MOODS.find((m) => m.id === id)?.label || id;

  const completed = cycles.filter((c) => typeof c.length === "number");
  const lengths = completed.map((c) => c.length!).slice(-12);

  const maxLen = lengths.length ? Math.max(...lengths) : 0;
  const minLen = lengths.length ? Math.min(...lengths) : 0;

  // BBT chart
  const bbtPoints = useMemo(() => {
    return entries
      .filter((e) => typeof e.bbt === "number")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((e) => ({ date: e.date, bbt: e.bbt as number }));
  }, [entries]);

  return (
    <div className="space-y-5">
      <Card title="Cycle averages">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Big label="Cycle length" value={`${stats.avgCycleLength}d`} sub={stats.sampleSize > 0 ? `from ${stats.sampleSize} cycle${stats.sampleSize === 1 ? "" : "s"}` : "default"} />
          <Big label="Period length" value={`${stats.avgPeriodLength}d`} />
          <Big label="Shortest" value={stats.shortest != null ? `${stats.shortest}d` : "—"} />
          <Big label="Longest" value={stats.longest != null ? `${stats.longest}d` : "—"} />
        </div>
        {stats.isIrregular && stats.sampleSize >= 2 && (
          <div
            className="mt-4 text-xs px-3 py-2 rounded-md"
            style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
          >
            Your cycles vary by more than a week. Predictions are widened to reflect this. Consider mentioning this to a healthcare provider if persistent.
          </div>
        )}
      </Card>

      {lengths.length > 0 && (
        <Card title="Recent cycles">
          <div className="flex items-end gap-2 h-32">
            {lengths.map((l, i) => {
              const pct = maxLen ? (l - Math.max(15, minLen - 3)) / (maxLen - Math.max(15, minLen - 3) + 1) : 0.5;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="flex-1 w-full relative">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t transition-all"
                      style={{
                        height: `${Math.max(20, pct * 100)}%`,
                        background: "var(--accent)",
                        opacity: 0.6 + 0.4 * (i / Math.max(1, lengths.length - 1)),
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-subtle tabular-nums">{l}d</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {bbtPoints.length >= 5 && (
        <Card title={`BBT (last ${bbtPoints.length} readings)`}>
          <BBTChart points={bbtPoints} units={settings.units} />
        </Card>
      )}

      {symptomCounts.length > 0 && (
        <Card title="Top symptoms">
          <div className="space-y-2">
            {symptomCounts.map(([id, count]) => {
              const max = symptomCounts[0][1];
              return (
                <div key={id} className="flex items-center gap-3">
                  <div className="text-sm flex-1 truncate">{symptomLabel(id)}</div>
                  <div className="flex-[2] h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / max) * 100}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted tabular-nums w-8 text-right">{count}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {moodCounts.length > 0 && (
        <Card title="Mood frequency">
          <div className="flex flex-wrap gap-2">
            {moodCounts.map(([id, n]) => (
              <span
                key={id}
                className="px-3 py-1.5 rounded-full text-sm"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-text)",
                }}
              >
                {moodLabel(id)} · {n}
              </span>
            ))}
          </div>
        </Card>
      )}

      {entries.length === 0 && (
        <Card title="No data yet">
          <p className="text-sm text-muted">
            Start logging your cycle and symptoms to see trends here.
          </p>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-card"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="text-xs uppercase tracking-wider text-subtle font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-[var(--radius)] p-3"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div className="text-[10px] uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className="text-2xl font-medium tabular-nums mt-1">{value}</div>
      {sub && <div className="text-[10px] text-subtle mt-0.5">{sub}</div>}
    </div>
  );
}

function BBTChart({ points, units }: { points: { date: string; bbt: number }[]; units: string }) {
  const w = 320;
  const h = 100;
  const ys = points.map((p) => p.bbt);
  const min = Math.min(...ys) - 0.2;
  const max = Math.max(...ys) + 0.2;
  const range = max - min || 1;
  const pad = 6;

  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.bbt - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const x = pad + (i / (points.length - 1)) * (w - pad * 2);
          const y = h - pad - ((p.bbt - min) / range) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r={1.8} fill="var(--accent)" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-subtle tabular-nums">
        <span>{min.toFixed(1)}{units === "imperial" ? "°F" : "°C"}</span>
        <span>{max.toFixed(1)}{units === "imperial" ? "°F" : "°C"}</span>
      </div>
    </div>
  );
}
