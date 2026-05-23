import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import { DayEntry, FlowLevel, Settings } from "./schema";

export const isoDate = (d: Date) => format(d, "yyyy-MM-dd");
export const parseDate = (s: string) => parseISO(s);

export type CyclePhase =
  | "menstrual"
  | "follicular"
  | "ovulatory"
  | "luteal"
  | "unknown";

export type Cycle = {
  startDate: string; // YYYY-MM-DD, first day of period
  endDate?: string; // last bleeding day if known
  length?: number; // length to next cycle start, undefined for the ongoing cycle
  periodLength?: number;
};

const isBleeding = (e?: DayEntry): boolean =>
  !!e &&
  !e.deletedAt &&
  !!e.flow &&
  e.flow !== "none" &&
  e.flow !== "spotting";

/**
 * Compute distinct cycles from entries.
 * A new cycle starts on a bleeding day that has no bleeding in the prior 3 days.
 */
export function deriveCycles(entries: DayEntry[]): Cycle[] {
  const byDate = new Map<string, DayEntry>();
  for (const e of entries) {
    if (!e.deletedAt) byDate.set(e.date, e);
  }
  const allBleedingDates = entries
    .filter(isBleeding)
    .map((e) => e.date)
    .sort();

  if (!allBleedingDates.length) return [];

  const cycleStarts: string[] = [];
  for (const d of allBleedingDates) {
    const date = parseDate(d);
    let hasRecent = false;
    for (let i = 1; i <= 3; i++) {
      const prev = isoDate(addDays(date, -i));
      const e = byDate.get(prev);
      if (isBleeding(e)) {
        hasRecent = true;
        break;
      }
    }
    if (!hasRecent) cycleStarts.push(d);
  }

  const cycles: Cycle[] = [];
  for (let i = 0; i < cycleStarts.length; i++) {
    const start = cycleStarts[i];
    const next = cycleStarts[i + 1];
    // find period end: continuous bleeding days from start
    let endDate = start;
    let cursor = parseDate(start);
    while (true) {
      const nextDay = addDays(cursor, 1);
      const e = byDate.get(isoDate(nextDay));
      if (isBleeding(e)) {
        endDate = isoDate(nextDay);
        cursor = nextDay;
      } else break;
    }
    const periodLength = differenceInCalendarDays(parseDate(endDate), parseDate(start)) + 1;
    const length = next ? differenceInCalendarDays(parseDate(next), parseDate(start)) : undefined;
    cycles.push({ startDate: start, endDate, periodLength, length });
  }
  return cycles;
}

export type Stats = {
  avgCycleLength: number;
  avgPeriodLength: number;
  stdDev: number;
  isIrregular: boolean;
  sampleSize: number;
  shortest: number | null;
  longest: number | null;
};

export function computeStats(cycles: Cycle[], settings: Settings): Stats {
  const completed = cycles.filter((c) => typeof c.length === "number") as Required<Cycle>[];
  const lengths = completed.map((c) => c.length).slice(-6);
  const periodLengths = completed.map((c) => c.periodLength).slice(-6);

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const std = (xs: number[]) => {
    if (xs.length < 2) return 0;
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  };

  const avgCycleLength = lengths.length ? Math.round(mean(lengths)) : settings.defaultCycleLength;
  const avgPeriodLength = periodLengths.length
    ? Math.round(mean(periodLengths))
    : settings.defaultPeriodLength;
  const stdDev = std(lengths);
  const isIrregular = stdDev > 7 || avgCycleLength < 21 || avgCycleLength > 35;

  return {
    avgCycleLength,
    avgPeriodLength,
    stdDev,
    isIrregular,
    sampleSize: lengths.length,
    shortest: lengths.length ? Math.min(...lengths) : null,
    longest: lengths.length ? Math.max(...lengths) : null,
  };
}

export type Prediction = {
  lastPeriodStart: string | null;
  currentCycleDay: number | null;
  predictedPeriodStart: string | null;
  predictedPeriodEnd: string | null;
  predictedOvulation: string | null;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  phase: CyclePhase;
  daysUntilPeriod: number | null;
  confidence: "low" | "medium" | "high";
};

export function predict(cycles: Cycle[], stats: Stats, today = new Date()): Prediction {
  if (!cycles.length) {
    return {
      lastPeriodStart: null,
      currentCycleDay: null,
      predictedPeriodStart: null,
      predictedPeriodEnd: null,
      predictedOvulation: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      phase: "unknown",
      daysUntilPeriod: null,
      confidence: "low",
    };
  }
  const last = cycles[cycles.length - 1];
  const lastStart = parseDate(last.startDate);
  const currentCycleDay = differenceInCalendarDays(today, lastStart) + 1;
  const predStart = addDays(lastStart, stats.avgCycleLength);
  const predEnd = addDays(predStart, stats.avgPeriodLength - 1);
  // Ovulation: cycle length minus 14 days luteal
  const ovulation = addDays(predStart, -14);
  // Widen fertile window if irregular
  const windowSize = stats.isIrregular ? 8 : 5;
  const fertileStart = addDays(ovulation, -windowSize);
  const fertileEnd = ovulation;

  const daysUntilPeriod = differenceInCalendarDays(predStart, today);

  // Phase calculation
  let phase: CyclePhase = "unknown";
  const periodEndOfCurrent = last.endDate ? parseDate(last.endDate) : addDays(lastStart, stats.avgPeriodLength - 1);
  if (today <= periodEndOfCurrent) phase = "menstrual";
  else if (today < fertileStart) phase = "follicular";
  else if (today >= fertileStart && today <= fertileEnd) phase = "ovulatory";
  else phase = "luteal";

  const confidence: Prediction["confidence"] =
    stats.sampleSize >= 3 && !stats.isIrregular
      ? "high"
      : stats.sampleSize >= 1
      ? "medium"
      : "low";

  return {
    lastPeriodStart: last.startDate,
    currentCycleDay,
    predictedPeriodStart: isoDate(predStart),
    predictedPeriodEnd: isoDate(predEnd),
    predictedOvulation: isoDate(ovulation),
    fertileWindowStart: isoDate(fertileStart),
    fertileWindowEnd: isoDate(fertileEnd),
    phase,
    daysUntilPeriod,
    confidence,
  };
}

export const phaseDescription: Record<CyclePhase, { title: string; body: string; color: string }> = {
  menstrual: {
    title: "Menstrual phase",
    body: "Estrogen and progesterone are low. Your body sheds the uterine lining. Energy is often low — rest, hydrate, gentle movement.",
    color: "var(--phase-menstrual)",
  },
  follicular: {
    title: "Follicular phase",
    body: "Estrogen rises as follicles mature. Energy, focus, and mood typically climb. A good window for new projects and strength training.",
    color: "var(--phase-follicular)",
  },
  ovulatory: {
    title: "Ovulatory phase",
    body: "Peak estrogen and LH surge release an egg. Libido and sociability often peak. Fertile window — highest chance of conception.",
    color: "var(--phase-ovulatory)",
  },
  luteal: {
    title: "Luteal phase",
    body: "Progesterone rises then falls. PMS symptoms can appear in the second half. Prioritize sleep, magnesium, and slow down.",
    color: "var(--phase-luteal)",
  },
  unknown: {
    title: "Not enough data yet",
    body: "Log at least one period to start seeing predictions and phase tracking.",
    color: "var(--phase-unknown)",
  },
};

export const flowLabel: Record<FlowLevel, string> = {
  none: "None",
  spotting: "Spotting",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

export const flowColor: Record<FlowLevel, string> = {
  none: "transparent",
  spotting: "var(--flow-spotting)",
  light: "var(--flow-light)",
  medium: "var(--flow-medium)",
  heavy: "var(--flow-heavy)",
};
