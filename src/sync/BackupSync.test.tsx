// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/useI18n";
import { BackupButton } from "./BackupButton";

const sync = vi.hoisted(() => ({ fail: true, calls: 0, saveNow: vi.fn(async () => {}) }));

vi.mock("./useProgressSync", () => ({
  useProgressSync: () => {
    sync.calls++;
    if (sync.fail) {
      throw new Error("Could not find public function for 'progress:forDevice'");
    }
    return { ready: true, restoredVersion: 0, pending: false, failed: false, saving: false, saveNow: sync.saveNow };
  },
}));

const { BackupSync } = await import("./BackupSync");

const identity = { profileId: "p1", deviceToken: "t1", pairCode: "ABC234", name: "Zosia" };

describe("BackupSync", () => {
  it("starts a manual save from its dedicated button", () => {
    sync.fail = false;
    localStorage.setItem("math_master_lang", "en");
    render(<I18nProvider><BackupSync identity={identity}><BackupButton /></BackupSync></I18nProvider>);
    expect(screen.queryByText("Game saved to your profile")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save to server" }));
    expect(sync.saveNow).toHaveBeenCalledTimes(1);
  });

  it("retries a failed backup boundary immediately without remounting the game", () => {
    sync.fail = true;
    localStorage.setItem("math_master_lang", "en");
    localStorage.setItem("math_master_stable", JSON.stringify({ savedAt: 1, coins: 10 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<I18nProvider><BackupSync identity={identity}><input aria-label="Answer" defaultValue="42" /><BackupButton /></BackupSync></I18nProvider>);
    const input = screen.getByRole("textbox");
    sync.fail = false;
    const before = sync.calls;
    fireEvent.click(screen.getByRole("button", { name: "Save to server" }));
    expect(sync.calls).toBeGreaterThan(before);
    expect(screen.getByRole("textbox")).toBe(input);
    expect(input).toHaveValue("42");
    warn.mockRestore(); error.mockRestore();
  });

  it("keeps the game on screen when the backup fails, and tries again later", () => {
    sync.fail = true;
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <I18nProvider>
        <BackupSync identity={identity} />
        <p>the game</p>
      </I18nProvider>,
    );
    expect(screen.getByText("the game")).toBeInTheDocument();

    sync.fail = false;
    const before = sync.calls;
    act(() => vi.advanceTimersByTime(60_000));
    expect(sync.calls).toBeGreaterThan(before);

    warn.mockRestore();
    error.mockRestore();
    vi.useRealTimers();
  });
});
