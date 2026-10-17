// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/i18n/useI18n";
import { SetupScreen } from "./SetupScreen";

function renderSetup(onRestore: (pairCode: string) => Promise<unknown>) {
  localStorage.setItem("math_master_lang", "en");
  return render(
    <I18nProvider>
      <MemoryRouter>
        <SetupScreen onCreate={vi.fn()} onRestore={onRestore} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("SetupScreen restore", () => {
  it("links this device with the game code without asking for a parent PIN", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn(async () => undefined);
    renderSetup(onRestore);

    await user.click(screen.getByRole("button", { name: /Already have a profile/ }));
    await user.type(screen.getByLabelText("Pairing code"), "abc234");
    expect(screen.queryByLabelText("PIN")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(onRestore).toHaveBeenCalledWith("ABC234");
  });

  it("reports an unknown game code without mentioning a PIN", async () => {
    const user = userEvent.setup();
    renderSetup(async () => {
      throw new Error("That game code was not found");
    });

    await user.click(screen.getByRole("button", { name: /Already have a profile/ }));
    await user.type(screen.getByLabelText("Pairing code"), "ABC234");
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("game code was not found");
  });
});
