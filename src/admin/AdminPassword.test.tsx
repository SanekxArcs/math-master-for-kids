// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/useI18n";
import { AdminPassword } from "./AdminPassword";
const action = vi.hoisted(() => vi.fn(async () => ({ token: "new-session", expiresAt: Date.now() + 10000, mustChangePassword: false })));
vi.mock("@/lib/convex", () => ({ convex: { action } }));
it("requires matching new passwords before opening account management on first login", async () => {
  localStorage.setItem("math_master_lang", "en");
  const onSession = vi.fn();
  render(<I18nProvider><AdminPassword session={{ token: "setup", expiresAt: Date.now() + 10000, mustChangePassword: true }} onSession={onSession} onCancel={vi.fn()} /></I18nProvider>);
  expect(screen.queryByLabelText("Current password")).toBeNull();
  const save = screen.getByRole("button", { name: "Save password" });
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "My chosen password123" } });
  fireEvent.change(screen.getByLabelText("Repeat"), { target: { value: "wrong" } });
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Repeat"), { target: { value: "My chosen password123" } });
  fireEvent.click(save);
  await waitFor(() => expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: false })));
  expect(action).toHaveBeenCalledWith(expect.anything(), { token: "setup", currentPassword: "", newPassword: "My chosen password123" });
});
