"use client";

import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/components/Store";
import { ThemeProvider } from "@/components/ThemeProvider";
import Onboarding from "@/components/Onboarding";
import Calendar from "@/components/Calendar";
import DaySheet from "@/components/DaySheet";
import TodayCard from "@/components/TodayCard";
import Insights from "@/components/Insights";
import SettingsPanel from "@/components/Settings";
import { format } from "date-fns";

type Tab = "today" | "calendar" | "insights" | "settings";

export default function Page() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { ready, vaultId, settings, syncState } = useStore();
  const [showOnboard, setShowOnboard] = useState(false);

  useEffect(() => {
    if (ready && !vaultId) setShowOnboard(true);
  }, [ready, vaultId]);

  if (!ready) {
    return (
      <ThemeProvider settings={settings}>
        <div className="min-h-screen grid place-items-center">
          <div className="opacity-50">Loading…</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider settings={settings}>
      <div className={`min-h-screen density-${settings.density}`}>
        {showOnboard ? (
          <Onboarding onComplete={() => setShowOnboard(false)} />
        ) : (
          <App syncState={syncState} />
        )}
      </div>
    </ThemeProvider>
  );
}

function App({ syncState }: { syncState: string }) {
  const [tab, setTab] = useState<Tab>("today");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sheetOpen, setSheetOpen] = useState(false);

  const openDate = (d: string) => {
    setSelectedDate(d);
    setSheetOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28">
      <Header syncState={syncState} />

      <main className="space-y-5">
        {tab === "today" && (
          <>
            <TodayCard onLogToday={() => openDate(format(new Date(), "yyyy-MM-dd"))} />
            <Calendar selectedDate={selectedDate} onSelect={openDate} />
          </>
        )}
        {tab === "calendar" && (
          <Calendar selectedDate={selectedDate} onSelect={openDate} />
        )}
        {tab === "insights" && <Insights />}
        {tab === "settings" && <SettingsPanel />}
      </main>

      {sheetOpen && (
        <DaySheet date={selectedDate} onClose={() => setSheetOpen(false)} />
      )}

      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({ syncState }: { syncState: string }) {
  const dotColor =
    syncState === "synced" || syncState === "idle"
      ? "var(--accent)"
      : syncState === "syncing"
      ? "var(--accent)"
      : syncState === "offline"
      ? "hsl(40, 80%, 55%)"
      : "hsl(0, 70%, 55%)";
  return (
    <header className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full grid place-items-center"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          ☾
        </div>
        <div>
          <div className="text-lg font-medium tracking-tight leading-none">Lune</div>
          <div className="text-[10px] uppercase tracking-wider text-subtle font-medium mt-0.5">
            Cycle tracker
          </div>
        </div>
      </div>
      <div
        className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-full"
        style={{ background: "var(--bg-elevated)" }}
        title={syncState}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
          }}
        />
        <span className="text-muted">
          {syncState === "synced"
            ? "Synced"
            : syncState === "syncing"
            ? "Syncing"
            : syncState === "offline"
            ? "Offline"
            : syncState === "error"
            ? "Error"
            : "Idle"}
        </span>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "today", label: "Today", icon: "◐" },
    { id: "calendar", label: "Calendar", icon: "▦" },
    { id: "insights", label: "Insights", icon: "◊" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];
  return (
    <nav
      className="fixed bottom-3 left-1/2 -translate-x-1/2 px-2 py-2 rounded-full flex gap-1 z-40 glass"
      style={{
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-full text-sm transition flex items-center gap-1.5"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-foreground)" : "var(--text-muted)",
              fontWeight: active ? 500 : 400,
            }}
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
