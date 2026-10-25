// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/useI18n";
import { StartScreen } from "./StartScreen";
import { PlayRoute } from "./PlayRoute";
import { ParentRoute } from "@/parent/ParentRoute";

const actions = vi.hoisted(() => ({ claim: vi.fn(), link: vi.fn(), login: vi.fn() }));
vi.mock("@/lib/convex", () => ({ convex: {} }));
vi.mock("@/sync/BackupSync", () => ({ BackupSync: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/sync/useFactStats", () => ({ useFactStats: () => ({ getStats: () => new Map(), recordFacts: () => {} }) }));
vi.mock("@/pair/QrScanner", () => ({ ScanButton: ({ onCode }: { onCode: (code: string) => void }) =>
  <button type="button" onClick={() => onCode("ABC234")}>Scan test code</button> }));
vi.mock("@/sync/useSync", async () => {
  const { useState } = await import("react");
  const { DEFAULT_SETTINGS: settings } = await import("@/engine");
  return {
    useDeviceIdentity: () => {
      const [identity, setIdentity] = useState<null | { profileId: string; pairCode: string; deviceToken: string; name: string }>(null);
      const next = { profileId: "child-a", pairCode: "ABC234", deviceToken: "t1", name: "Ada" };
      return { identity, unlink: vi.fn(),
        claim: async (...args: unknown[]) => { actions.claim(...args); setIdentity(next); return next; },
        link: async (...args: unknown[]) => { actions.link(...args); setIdentity(next); return next; } };
    },
    useSyncedSettings: () => ({ settings, locale: "en", unlinked: false }),
    useOutboxSync: () => ({ record: vi.fn(), status: { pending: 0, online: true, syncing: false, lastError: null, unlinked: false } }),
  };
});
vi.mock("@/parent/useParentSession", async () => {
  const { useState } = await import("react");
  return { useParentSession: () => {
    const [session, setSession] = useState<null | { token: string; profileId: string; name: string; expiresAt: number }>(null);
    return { session, error: null, busy: false, logout: vi.fn(), login: async (code: string, pin: string) => {
      if ((await actions.login(code, pin)) === false) return false;
      setSession({ token: "parent", profileId: "child-a", name: "Ada", expiresAt: Date.now() + 60_000 });
      return true;
    } };
  } };
});
vi.mock("@/parent/Dashboard", () => ({ Dashboard: () => <h1>Parent dashboard reached</h1> }));

function open(path = "/") {
  localStorage.setItem("math_master_lang", "en");
  return render(<I18nProvider><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/" element={<StartScreen />} />
    <Route path="/play" element={<PlayRoute />} />
    <Route path="/parent" element={<ParentRoute />} />
  </Routes></MemoryRouter></I18nProvider>);
}

describe("child and parent entry paths", () => {
  beforeEach(() => { vi.clearAllMocks(); actions.login.mockReset(); });

  it("starts with the logo and two role choices, without registration fields", () => {
    open();
    expect(screen.getByText(/Math/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Child" })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: "Parent" })).toHaveAttribute("href", "/parent");
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("offers parent help and inline login to a child, then opens the child onboarding", async () => {
    const user = userEvent.setup(); open();
    await user.click(screen.getByRole("link", { name: "Child" }));
    expect(screen.getByText(/Ask a parent/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "I’m with my parent" })).toHaveAttribute("href", "/parent?new=1");
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.queryByLabelText("PIN")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Scan test code" }));
    expect(actions.link).toHaveBeenCalledWith("ABC234");
    // The play screen is loaded on demand; allow its first module load to finish.
    expect(await screen.findByRole("dialog", { name: "How to play" }, { timeout: 5000 })).toBeInTheDocument();
    expect(actions.claim).not.toHaveBeenCalled();
  });

  it("lets a child type their code and play without a PIN", async () => {
    const user = userEvent.setup(); open("/play");
    expect(screen.queryByLabelText("PIN")).toBeNull();
    await user.type(screen.getByLabelText("Pairing code"), "abc234");
    await user.click(screen.getByRole("button", { name: "Start playing" }));
    expect(actions.link).toHaveBeenCalledWith("ABC234");
    expect(await screen.findByRole("dialog", { name: "How to play" })).toBeInTheDocument();
    expect(actions.login).not.toHaveBeenCalled();
  });

  it("sends an existing parent through code and PIN straight to the dashboard", async () => {
    const user = userEvent.setup(); open();
    await user.click(screen.getByRole("link", { name: "Parent" }));
    await user.click(screen.getByRole("button", { name: "Sign in to an existing profile" }));
    await user.type(screen.getByLabelText("Pairing code"), "abc234");
    await user.type(screen.getByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(actions.login).toHaveBeenCalledWith("ABC234", "1234");
    expect(await screen.findByRole("heading", { name: "Parent dashboard reached" })).toBeInTheDocument();
    expect(actions.claim).not.toHaveBeenCalled();
  });

  it("creates a new child profile in the parent path and goes straight to the dashboard", async () => {
    const user = userEvent.setup(); open("/parent");
    await user.click(screen.getByRole("button", { name: "Create a child’s profile" }));
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText(/Parent PIN/), "1234");
    await user.type(screen.getByLabelText("Repeat"), "1234");
    await user.click(screen.getByRole("button", { name: "Create a child’s profile" }));
    expect(actions.claim).toHaveBeenCalledWith("Ada", "1234", "en", "🦊");
    expect(actions.login).toHaveBeenCalledWith("ABC234", "1234");
    expect(await screen.findByRole("heading", { name: "Parent dashboard reached" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "How to play" })).toBeNull();
  });

  it("retries sign-in rather than registration when login fails after account creation", async () => {
    actions.login.mockResolvedValueOnce(false);
    const user = userEvent.setup(); open("/parent?new=1");
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText(/Parent PIN/), "1234");
    await user.type(screen.getByLabelText("Repeat"), "1234");
    await user.click(screen.getByRole("button", { name: "Create a child’s profile" }));
    expect(await screen.findByLabelText("Pairing code")).toHaveValue("ABC234");
    expect(actions.claim).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Create a child’s profile" })).toBeNull();
  });

  it("preserves a legacy scanned game link", () => {
    open("/?restore=ABC234");
    expect(screen.getByLabelText("Pairing code")).toHaveValue("ABC234");
  });
});
