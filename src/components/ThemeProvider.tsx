"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { themes, ThemePalette, fontFamilies, densityScale } from "@/lib/themes";
import { Settings } from "@/lib/schema";

type ThemeCtx = {
  resolvedMode: "light" | "dark";
};

const Ctx = createContext<ThemeCtx>({ resolvedMode: "light" });

export function applyTheme(settings: Settings) {
  const palette: ThemePalette = themes.find((t) => t.id === settings.themeId) ?? themes[0];
  let mode: "light" | "dark" = "light";
  if (settings.themeMode === "system") {
    mode =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  } else {
    mode = settings.themeMode;
  }
  const tokens = palette[mode];
  const root = document.documentElement;
  const map: Record<keyof typeof tokens, string> = {
    bg: "--bg",
    bgElevated: "--bg-elevated",
    surface: "--surface",
    surfaceHover: "--surface-hover",
    border: "--border",
    borderStrong: "--border-strong",
    text: "--text",
    textMuted: "--text-muted",
    textSubtle: "--text-subtle",
    accent: "--accent",
    accentSoft: "--accent-soft",
    accentText: "--accent-text",
    accentForeground: "--accent-foreground",
    flowSpotting: "--flow-spotting",
    flowLight: "--flow-light",
    flowMedium: "--flow-medium",
    flowHeavy: "--flow-heavy",
    fertile: "--fertile",
    fertileSoft: "--fertile-soft",
    ovulation: "--ovulation",
    phaseMenstrual: "--phase-menstrual",
    phaseFollicular: "--phase-follicular",
    phaseOvulatory: "--phase-ovulatory",
    phaseLuteal: "--phase-luteal",
    phaseUnknown: "--phase-unknown",
    shadow: "--shadow",
  };
  for (const [k, cssVar] of Object.entries(map)) {
    root.style.setProperty(cssVar, tokens[k as keyof typeof tokens]);
  }

  // Optional custom accent override
  if (settings.customAccent) {
    const { hue, saturation } = settings.customAccent;
    const light = mode === "light";
    root.style.setProperty(
      "--accent",
      `hsl(${hue}, ${saturation}%, ${light ? 50 : 65}%)`
    );
    root.style.setProperty(
      "--accent-soft",
      `hsl(${hue}, ${saturation}%, ${light ? 92 : 22}%)`
    );
    root.style.setProperty(
      "--accent-text",
      `hsl(${hue}, ${saturation}%, ${light ? 32 : 82}%)`
    );
  } else if (settings.accentColor) {
    root.style.setProperty("--accent", settings.accentColor);
  }

  // Font + density
  root.style.setProperty("--font-family", fontFamilies[settings.fontFamily] || fontFamilies.sans);
  const d = densityScale[settings.density] || densityScale.comfortable;
  root.style.setProperty("--density-unit", d.unit);
  root.style.setProperty("--radius", d.radius);
  root.style.setProperty("--gap", d.gap);
  root.style.setProperty("--pad", d.pad);

  // Color scheme hint for native UI (scrollbars, form controls)
  root.style.colorScheme = mode;
  document.body.dataset.themeMode = mode;
  document.body.dataset.themeId = settings.themeId;
}

export function ThemeProvider({
  settings,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    applyTheme(settings);
    if (settings.themeMode === "system" && typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        applyTheme(settings);
        setResolvedMode(mql.matches ? "dark" : "light");
      };
      mql.addEventListener("change", onChange);
      setResolvedMode(mql.matches ? "dark" : "light");
      return () => mql.removeEventListener("change", onChange);
    } else {
      setResolvedMode(settings.themeMode as "light" | "dark");
    }
  }, [settings]);

  const value = useMemo(() => ({ resolvedMode }), [resolvedMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
