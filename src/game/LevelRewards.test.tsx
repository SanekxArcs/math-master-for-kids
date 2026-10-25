// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/useI18n";
import { LevelRewards } from "./LevelRewards";

function show(canPrestige = false, level = 1) {
  localStorage.setItem("math_master_lang", "en");
  const onPrestige = vi.fn();
  const onOpenChange = vi.fn();
  render(<I18nProvider><LevelRewards open onOpenChange={onOpenChange} level={level} baseGoal={100} prestigeLevels={20}
    earnedLevels={canPrestige ? level : level - 1} canPrestige={canPrestige} goalEnabled onPrestige={onPrestige} /></I18nProvider>);
  return { onPrestige, onOpenChange };
}

it("shows current and next rewards with the actual multiplier, and all twenty levels", () => {
  show();
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("13")).toBeInTheDocument();
  expect(within(dialog).getByText("34")).toBeInTheDocument();
  expect(within(dialog).getByText(/Coin multiplier:/)).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Prestige" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "See all 20 rewards" }));
  expect(within(dialog).getAllByRole("row")).toHaveLength(21);
  expect(within(dialog).getByRole("row", { name: "20 10000 1579" })).toBeInTheDocument();
});

it("requires a separate confirmation before prestige and supports cancellation", () => {
  const { onPrestige } = show(true, 20);
  fireEvent.click(screen.getByRole("button", { name: "Prestige" }));
  expect(onPrestige).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Keep playing" }));
  expect(screen.queryByRole("button", { name: "Confirm prestige" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Prestige" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm prestige" }));
  expect(onPrestige).toHaveBeenCalledTimes(1);
});
