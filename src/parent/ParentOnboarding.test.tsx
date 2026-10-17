// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/i18n/useI18n";
import { ParentOnboarding, needsParentTour } from "./ParentOnboarding";

describe("separate parent guide", () => {
  it("walks through the dashboard and records completion independently for each profile", async () => {
    const user = userEvent.setup();
    const done = vi.fn();
    localStorage.setItem("math_master_lang", "en");
    render(<I18nProvider><ParentOnboarding profileId="child-a" pairCode="ABC234" onDone={done} /></I18nProvider>);
    for (let step = 0; step < 4; step++) await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("ABC234")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(done).toHaveBeenCalledOnce();
    expect(needsParentTour("child-a")).toBe(false);
    expect(needsParentTour("child-b")).toBe(true);
    expect(localStorage.getItem("math_master_onboarded")).toBeNull();
  });
});
