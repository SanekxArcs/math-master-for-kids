// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/useI18n";
import { setMotionReduced } from "@/lib/motionPreference";
import { PetEncouragement, messageKind } from "./PetEncouragement";
import { PET_MESSAGES } from "./petMessages";
import type { Outcome } from "./useGame";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); document.documentElement.classList.remove("reduce-motion"); });

const outcome = (isCorrect = true): Outcome => ({ isCorrect, given: 5, delta: 5, multiplier: 1, tierUp: false, tierDown: false, timedOut: false });
function setup(initial: Outcome | null = null, random = 0) {
  localStorage.setItem("math_master_lang", "en");
  setMotionReduced(true);
  vi.spyOn(Math, "random").mockReturnValue(random);
  const tree = (result: Outcome | null, helped = false, hidden = false) => <I18nProvider><PetEncouragement outcome={result} helped={helped} hidden={hidden} /></I18nProvider>;
  const view = render(tree(initial));
  return { update: (result: Outcome | null, helped = false, hidden = false) => view.rerender(tree(result, helped, hidden)) };
}

it("selects encouragement matching correct, incorrect and assisted answers", () => {
  expect(messageKind(outcome(), false)).toBe("good");
  expect(messageKind(outcome(), true)).toBe("help");
  expect(messageKind(outcome(false), false)).toBe("bad");
  expect(messageKind(outcome(false), true)).toBe("bad");
  const view = setup();
  view.update(outcome());
  expect(PET_MESSAGES.en.good).toContain(screen.getByRole("status").textContent);
  view.update(outcome(false));
  expect(PET_MESSAGES.en.bad).toContain(screen.getByRole("status").textContent);
  view.update(outcome(), true);
  expect(PET_MESSAGES.en.help).toContain(screen.getByRole("status").textContent);
});

it("replaces praise with support on every mistake/help despite the success cooldown", () => {
  const view = setup(null, 0.99);
  view.update(outcome());
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  view.update(outcome());
  view.update(outcome());
  expect(PET_MESSAGES.en.good).toContain(screen.getByRole("status").textContent);
  view.update(outcome(false));
  expect(PET_MESSAGES.en.bad).toContain(screen.getByRole("status").textContent);
  view.update(outcome());
  view.update(outcome(false));
  expect(PET_MESSAGES.en.bad).toContain(screen.getByRole("status").textContent);
  view.update(outcome(), true);
  expect(PET_MESSAGES.en.help).toContain(screen.getByRole("status").textContent);
});

it("does not replay a restored result or an unchanged result on rerender", () => {
  const restored = outcome();
  const view = setup(restored);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  const next = outcome();
  view.update(next);
  const text = screen.getByRole("status").textContent;
  view.update(next);
  expect(screen.getByRole("status")).toHaveTextContent(text ?? "");
});

it("hides for dialogs and expires without changing game progress", () => {
  vi.useFakeTimers();
  const view = setup();
  const next = outcome();
  view.update(next);
  expect(screen.getByRole("status")).not.toBeEmptyDOMElement();
  act(() => { vi.advanceTimersByTime(7000); });
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  view.update(outcome());
  view.update(outcome(), false, true);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(localStorage.getItem("math_master_level")).toBeNull();
  expect(localStorage.getItem("math_master_stable")).toBeNull();
});
