"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { useStore } from "./Store";
import { deriveCycles, computeStats, predict, isoDate } from "@/lib/cycle";
import { DayEntry } from "@/lib/schema";

type Props = {
  selectedDate: string;
  onSelect: (d: string) => void;
};

export default function Calendar({ selectedDate, onSelect }: Props) {
  const { snapshot, settings } = useStore();
  const [cursor, setCursor] = useState(() => startOfMonth(parseISO(selectedDate)));

  const startsOnSunday = settings.calendarStart !== "monday";
  const weekStartsOn = startsOnSunday ? 0 : 1;

  const allEntries = useMemo(
    () => Object.values(snapshot.entries).filter((e) => !e.deletedAt),
    [snapshot.entries]
  );
  const entryByDate = useMemo(() => {
    const m = new Map<string, DayEntry>();
    for (const e of allEntries) m.set(e.date, e);
    return m;
  }, [allEntries]);

  const cycles = useMemo(() => deriveCycles(allEntries), [allEntries]);
  const stats = useMemo(() => computeStats(cycles, settings), [cycles, settings]);
  const prediction = useMemo(() => predict(cycles, stats), [cycles, stats]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const dayNames = startsOnSunday
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  const fertileStart = prediction.fertileWindowStart && parseISO(prediction.fertileWindowStart);
  const fertileEnd = prediction.fertileWindowEnd && parseISO(prediction.fertileWindowEnd);
  const predictedPeriodStart = prediction.predictedPeriodStart && parseISO(prediction.predictedPeriodStart);
  const predictedPeriodEnd = prediction.predictedPeriodEnd && parseISO(prediction.predictedPeriodEnd);
  const predictedOvulation = prediction.predictedOvulation && parseISO(prediction.predictedOvulation);

  const today = new Date();

  return (
    <div className="rounded-2xl shadow-card overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="w-9 h-9 rounded-full grid place-items-center transition hover:bg-[var(--surface-hover)]"
          aria-label="Previous month"
        >
          ‹
        </button>
        <button
          onClick={() => setCursor(startOfMonth(today))}
          className="text-base font-medium tracking-tight"
        >
          {format(cursor, "MMMM yyyy")}
        </button>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="w-9 h-9 rounded-full grid place-items-center transition hover:bg-[var(--surface-hover)]"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 px-2 pt-3 pb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-[10px] uppercase tracking-wider text-subtle text-center font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 p-2 pt-1">
        {days.map((day) => {
          const dateStr = isoDate(day);
          const entry = entryByDate.get(dateStr);
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const selected = dateStr === selectedDate;

          const isFertile =
            !settings.hideFertileWindow &&
            fertileStart &&
            fertileEnd &&
            isWithinInterval(day, { start: fertileStart, end: fertileEnd });
          const isPredictedOvulation =
            !settings.hideFertileWindow &&
            predictedOvulation &&
            isSameDay(day, predictedOvulation);
          const isPredictedPeriod =
            predictedPeriodStart &&
            predictedPeriodEnd &&
            isWithinInterval(day, { start: predictedPeriodStart, end: predictedPeriodEnd });

          const flow = entry?.flow;
          const isBleed = flow && flow !== "none";
          const hasNote =
            !!entry &&
            (entry.symptoms?.length ||
              entry.mood?.length ||
              entry.bbt ||
              entry.weight ||
              entry.notes ||
              entry.sex?.length);

          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className="relative aspect-square rounded-[calc(var(--radius)-2px)] transition group"
              style={{
                background: selected
                  ? "var(--accent-soft)"
                  : isPredictedPeriod
                  ? `repeating-linear-gradient(135deg, var(--flow-light) 0 4px, transparent 4px 8px)`
                  : isFertile
                  ? "var(--fertile-soft)"
                  : "transparent",
                opacity: inMonth ? 1 : 0.35,
                border: selected ? "1px solid var(--accent)" : "1px solid transparent",
              }}
            >
              {/* Bleed fill */}
              {isBleed && (
                <div
                  className="absolute inset-1 rounded-full"
                  style={{
                    background:
                      flow === "spotting"
                        ? "var(--flow-spotting)"
                        : flow === "light"
                        ? "var(--flow-light)"
                        : flow === "medium"
                        ? "var(--flow-medium)"
                        : "var(--flow-heavy)",
                    opacity: 0.85,
                  }}
                />
              )}
              {isPredictedOvulation && !isBleed && (
                <div
                  className="absolute inset-1 rounded-full border-2"
                  style={{ borderColor: "var(--ovulation)" }}
                />
              )}
              {isToday && (
                <div
                  className="absolute inset-0 rounded-[calc(var(--radius)-2px)] pointer-events-none"
                  style={{ outline: "1.5px solid var(--text)", outlineOffset: -1 }}
                />
              )}
              <div
                className="absolute inset-0 grid place-items-center text-sm tabular-nums"
                style={{
                  color:
                    isBleed && (flow === "medium" || flow === "heavy")
                      ? "white"
                      : "var(--text)",
                  fontWeight: isToday ? 600 : 400,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {format(day, "d")}
              </div>
              {hasNote && !isBleed && (
                <div
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: "var(--text-subtle)", zIndex: 2 }}
                />
              )}
            </button>
          );
        })}
      </div>
      <Legend hideFertile={settings.hideFertileWindow} />
    </div>
  );
}

function Legend({ hideFertile }: { hideFertile: boolean }) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 px-3 pb-3 pt-1 text-[10px] text-subtle uppercase tracking-wider">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--flow-medium)" }} />
        Period
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{
          background: "repeating-linear-gradient(135deg, var(--flow-light) 0 2px, transparent 2px 4px)"
        }} />
        Predicted
      </span>
      {!hideFertile && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--fertile-soft)" }} />
            Fertile
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "var(--ovulation)" }} />
            Ovulation
          </span>
        </>
      )}
    </div>
  );
}
