export type ThemePalette = {
  id: string;
  name: string;
  // Light + dark accent and supporting tokens
  light: ThemeTokens;
  dark: ThemeTokens;
};

export type ThemeTokens = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  accentForeground: string;
  flowSpotting: string;
  flowLight: string;
  flowMedium: string;
  flowHeavy: string;
  fertile: string;
  fertileSoft: string;
  ovulation: string;
  phaseMenstrual: string;
  phaseFollicular: string;
  phaseOvulatory: string;
  phaseLuteal: string;
  phaseUnknown: string;
  shadow: string;
};

// Helper to build a balanced palette from an accent hue
function palette(opts: {
  id: string;
  name: string;
  lightHue: number;
  darkHue: number;
  lightSat?: number;
  darkSat?: number;
}): ThemePalette {
  const { id, name, lightHue, darkHue } = opts;
  const lightSat = opts.lightSat ?? 70;
  const darkSat = opts.darkSat ?? 60;
  return {
    id,
    name,
    light: {
      bg: `hsl(${lightHue}, 30%, 98%)`,
      bgElevated: `hsl(${lightHue}, 35%, 99%)`,
      surface: `hsl(0, 0%, 100%)`,
      surfaceHover: `hsl(${lightHue}, 25%, 96%)`,
      border: `hsl(${lightHue}, 18%, 90%)`,
      borderStrong: `hsl(${lightHue}, 22%, 82%)`,
      text: `hsl(${lightHue}, 20%, 14%)`,
      textMuted: `hsl(${lightHue}, 12%, 42%)`,
      textSubtle: `hsl(${lightHue}, 10%, 60%)`,
      accent: `hsl(${lightHue}, ${lightSat}%, 50%)`,
      accentSoft: `hsl(${lightHue}, ${lightSat}%, 92%)`,
      accentText: `hsl(${lightHue}, ${lightSat}%, 32%)`,
      accentForeground: `hsl(0, 0%, 100%)`,
      flowSpotting: `hsl(${lightHue}, 40%, 78%)`,
      flowLight: `hsl(${lightHue}, ${lightSat}%, 70%)`,
      flowMedium: `hsl(${lightHue}, ${lightSat}%, 55%)`,
      flowHeavy: `hsl(${lightHue}, ${lightSat}%, 40%)`,
      fertile: `hsl(190, 70%, 55%)`,
      fertileSoft: `hsl(190, 65%, 92%)`,
      ovulation: `hsl(265, 70%, 60%)`,
      phaseMenstrual: `hsl(${lightHue}, ${lightSat}%, 55%)`,
      phaseFollicular: `hsl(140, 50%, 55%)`,
      phaseOvulatory: `hsl(265, 70%, 60%)`,
      phaseLuteal: `hsl(40, 80%, 55%)`,
      phaseUnknown: `hsl(${lightHue}, 10%, 60%)`,
      shadow: `0 1px 2px hsl(${lightHue} 25% 50% / 0.05), 0 8px 24px hsl(${lightHue} 25% 50% / 0.06)`,
    },
    dark: {
      bg: `hsl(${darkHue}, 20%, 7%)`,
      bgElevated: `hsl(${darkHue}, 22%, 10%)`,
      surface: `hsl(${darkHue}, 22%, 13%)`,
      surfaceHover: `hsl(${darkHue}, 24%, 17%)`,
      border: `hsl(${darkHue}, 18%, 20%)`,
      borderStrong: `hsl(${darkHue}, 18%, 30%)`,
      text: `hsl(${darkHue}, 15%, 96%)`,
      textMuted: `hsl(${darkHue}, 10%, 70%)`,
      textSubtle: `hsl(${darkHue}, 10%, 55%)`,
      accent: `hsl(${darkHue}, ${darkSat}%, 65%)`,
      accentSoft: `hsl(${darkHue}, ${darkSat}%, 20%)`,
      accentText: `hsl(${darkHue}, ${darkSat}%, 82%)`,
      accentForeground: `hsl(${darkHue}, 20%, 10%)`,
      flowSpotting: `hsl(${darkHue}, 40%, 50%)`,
      flowLight: `hsl(${darkHue}, ${darkSat}%, 55%)`,
      flowMedium: `hsl(${darkHue}, ${darkSat}%, 62%)`,
      flowHeavy: `hsl(${darkHue}, ${darkSat}%, 72%)`,
      fertile: `hsl(190, 65%, 60%)`,
      fertileSoft: `hsl(190, 50%, 22%)`,
      ovulation: `hsl(265, 70%, 70%)`,
      phaseMenstrual: `hsl(${darkHue}, ${darkSat}%, 62%)`,
      phaseFollicular: `hsl(140, 50%, 60%)`,
      phaseOvulatory: `hsl(265, 70%, 70%)`,
      phaseLuteal: `hsl(40, 80%, 65%)`,
      phaseUnknown: `hsl(${darkHue}, 10%, 50%)`,
      shadow: `0 1px 2px hsl(0 0% 0% / 0.3), 0 8px 24px hsl(0 0% 0% / 0.4)`,
    },
  };
}

export const themes: ThemePalette[] = [
  palette({ id: "rose", name: "Rose", lightHue: 350, darkHue: 350, lightSat: 70, darkSat: 55 }),
  palette({ id: "berry", name: "Berry", lightHue: 320, darkHue: 320, lightSat: 60, darkSat: 50 }),
  palette({ id: "lavender", name: "Lavender", lightHue: 270, darkHue: 270, lightSat: 55, darkSat: 50 }),
  palette({ id: "ocean", name: "Ocean", lightHue: 200, darkHue: 210, lightSat: 65, darkSat: 55 }),
  palette({ id: "sage", name: "Sage", lightHue: 150, darkHue: 150, lightSat: 40, darkSat: 35 }),
  palette({ id: "sunset", name: "Sunset", lightHue: 20, darkHue: 20, lightSat: 70, darkSat: 60 }),
  palette({ id: "amber", name: "Amber", lightHue: 40, darkHue: 40, lightSat: 75, darkSat: 65 }),
  palette({ id: "graphite", name: "Graphite", lightHue: 230, darkHue: 230, lightSat: 12, darkSat: 10 }),
  palette({ id: "midnight", name: "Midnight", lightHue: 240, darkHue: 240, lightSat: 50, darkSat: 45 }),
  palette({ id: "moss", name: "Moss", lightHue: 100, darkHue: 100, lightSat: 35, darkSat: 30 }),
];

export const fontFamilies: Record<string, string> = {
  sans: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "'Iowan Old Style', 'Apple Garamond', Baskerville, 'Times New Roman', serif",
  mono: "var(--font-geist-mono), 'SF Mono', Menlo, monospace",
  rounded: "'SF Pro Rounded', 'Nunito', -apple-system, system-ui, sans-serif",
};

export const densityScale: Record<string, { unit: string; radius: string; gap: string; pad: string }> = {
  compact: { unit: "0.9", radius: "0.55rem", gap: "0.4rem", pad: "0.6rem" },
  comfortable: { unit: "1", radius: "0.75rem", gap: "0.6rem", pad: "0.8rem" },
  spacious: { unit: "1.15", radius: "1rem", gap: "0.85rem", pad: "1.1rem" },
};
