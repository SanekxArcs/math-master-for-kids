// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DEFAULT_SETTINGS, NEW_STABLE, newPet } from "@/engine";
import { I18nProvider } from "@/i18n/useI18n";
import { GameScreen } from "@/game/GameScreen";
import { BackupSync } from "./BackupSync";

const remote = vi.hoisted(() => ({ value: undefined as unknown }));
const save = vi.hoisted(() => vi.fn(async () => ({ status: "ok", applied: true })));
vi.mock("convex/react", () => ({ useQuery: () => remote.value, useMutation: () => save }));
vi.mock("@/lib/convex", () => ({ convex: {} }));

const identity = { profileId: "p1", deviceToken: "t1", pairCode: "ABC234", name: "Zosia" };
const settings = { ...DEFAULT_SETTINGS, timerEnabled: false, soundEnabled: false };

function app() {
  return <I18nProvider><MemoryRouter><BackupSync identity={identity}>
    <GameScreen settings={settings} />
  </BackupSync></MemoryRouter></I18nProvider>;
}

describe("saved game transfer", () => {
  beforeEach(() => { remote.value = undefined; save.mockClear(); localStorage.setItem("math_master_lang", "en"); });

  it("waits for the cloud, then opens the won board without paying its reward twice", () => {
    const view = render(app());
    expect(screen.getByText(/Restoring your saved game/)).toBeInTheDocument();
    expect(localStorage.getItem("math_master_session")).toBeNull();
    const now = Date.now();
    const session = { score: { rawPoints: 100, goodStreak: 5, badStreak: 0, bestStreak: 5, correct: 10, wrong: 0 },
      won: true, lost: false, stopped: false, question: null, halfHalfReadyAt: 0,
      usedHalfHalf: false, usedVisualHint: false, hidden: [], savedAt: now - 86_400_000 };
    remote.value = { status: "ok", progress: { ...NEW_STABLE, savedAt: now, level: 3,
      coins: 77, pets: [newPet("horse", "Bella", now)], activeId: "horse",
      session: JSON.stringify(session), onboarded: true } };
    act(() => view.rerender(app()));
    expect(screen.queryByText(/Restoring your saved game/)).toBeNull();
    expect(JSON.parse(localStorage.getItem("math_master_session")!).won).toBe(true);
    expect(JSON.parse(localStorage.getItem("math_master_session")!).score.correct).toBe(10);
    expect(JSON.parse(localStorage.getItem("math_master_stable")!).coins).toBe(77);
    expect(screen.getByRole("dialog", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
  });
});
