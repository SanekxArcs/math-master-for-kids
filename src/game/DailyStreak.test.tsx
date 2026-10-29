// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NEW_STABLE, dayKey } from "@/engine";
import { I18nProvider } from "@/i18n/useI18n";
import { DailyStreak } from "./DailyStreak";

it("shows a pending daily bonus and opens seven-day reward details", () => {
  localStorage.setItem("math_master_lang", "en");
  const now = new Date(2026, 9, 29, 12).getTime();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const yesterday = new Date(2026, 9, 28, 12).getTime();
  try {
    render(<I18nProvider><DailyStreak stable={{ ...NEW_STABLE, dailyStreak: 3, lastBonusDay: dayKey(yesterday) }} /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Daily streak: 3\/7. First round today: \+20/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText("+35")).toBeInTheDocument();
    expect(screen.getByText(/Miss a day and start again/)).toBeInTheDocument();
  } finally { clock.mockRestore(); }
});

it("marks today's capped bonus as collected", () => {
  localStorage.setItem("math_master_lang", "en");
  render(<I18nProvider><DailyStreak stable={{ ...NEW_STABLE, dailyStreak: 7, lastBonusDay: dayKey(Date.now()) }} /></I18nProvider>);
  expect(screen.getByRole("button", { name: /Daily streak: 7\/7. Today: \+35.*collected/ })).toBeInTheDocument();
});
