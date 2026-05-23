export const SCHEMA_VERSION = 1;

export type FlowLevel = "none" | "spotting" | "light" | "medium" | "heavy";
export type CervicalMucus =
  | "dry"
  | "sticky"
  | "creamy"
  | "watery"
  | "egg-white";
export type CervicalAmount = "none" | "little" | "medium" | "lots";
export type OvulationTest = "negative" | "positive" | "peak";
export type PregnancyTest = "negative" | "positive";
export type SexEntry =
  | "none"
  | "protected"
  | "unprotected"
  | "withdrawal"
  | "solo";

export type GoalMode = "track" | "ttc" | "avoid" | "pregnancy" | "perimenopause";

export type DayEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  flow?: FlowLevel;
  symptoms?: string[];
  mood?: string[];
  bbt?: number; // user-units (°F or °C)
  weight?: number;
  notes?: string;
  sex?: SexEntry[];
  ovulationTest?: OvulationTest;
  pregnancyTest?: PregnancyTest;
  cervicalMucus?: CervicalMucus;
  cervicalAmount?: CervicalAmount;
  sleepHours?: number;
  waterCups?: number;
  exercise?: string;
  medications?: string[];
  updatedAt: string; // ISO timestamp
  deletedAt?: string | null; // tombstone
  deviceId?: string;
};

export type Settings = {
  goalMode: GoalMode;
  defaultCycleLength: number; // user-stated baseline
  defaultPeriodLength: number;
  units: "imperial" | "metric";
  calendarStart: "sunday" | "monday";
  themeId: string; // preset palette id
  themeMode: "light" | "dark" | "system";
  accentColor?: string; // optional hex override
  customAccent?: { hue: number; saturation: number };
  fontFamily: "sans" | "serif" | "mono" | "rounded";
  density: "comfortable" | "compact" | "spacious";
  genderNeutral: boolean;
  customSymptoms: string[];
  customMoods: string[];
  hideFertileWindow: boolean;
  showLuteralEstimate: boolean;
  notifications: {
    periodSoon: boolean;
    ovulationSoon: boolean;
    logReminder: boolean;
  };
  updatedAt: string;
};

export const defaultSettings: Settings = {
  goalMode: "track",
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  units: "imperial",
  calendarStart: "sunday",
  themeId: "rose",
  themeMode: "system",
  fontFamily: "sans",
  density: "comfortable",
  genderNeutral: false,
  customSymptoms: [],
  customMoods: [],
  hideFertileWindow: false,
  showLuteralEstimate: true,
  notifications: {
    periodSoon: true,
    ovulationSoon: true,
    logReminder: false,
  },
  updatedAt: new Date(0).toISOString(),
};

export type Snapshot = {
  version: number;
  vaultId: string;
  writtenAt: string;
  deviceId: string;
  entries: Record<string, DayEntry>;
  settings: Settings;
  // Hash of a known canary string for vault key verification — optional
  vaultCanary?: string;
};

export const emptySnapshot = (vaultId: string, deviceId: string): Snapshot => ({
  version: SCHEMA_VERSION,
  vaultId,
  writtenAt: new Date().toISOString(),
  deviceId,
  entries: {},
  settings: { ...defaultSettings },
});
