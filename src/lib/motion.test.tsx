// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { I18nProvider } from "@/i18n/useI18n";
import { MotionSetting } from "@/components/MotionSetting";
import { motion, stillTarget } from "./motion";
import { isMotionReduced, setMotionReduced } from "./motionPreference";
import { TimerBar } from "@/game/TimerBar";

afterEach(() => { vi.useRealTimers(); document.documentElement.classList.remove("reduce-motion"); });

it("switches motion on this device without remounting or losing an answer", async () => {
  localStorage.setItem("math_master_lang", "en");
  function Answer() {
    const [answer, setAnswer] = useState("");
    return <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity }}>
      <input aria-label="Answer" value={answer} onChange={(event) => setAnswer(event.target.value)} />
    </motion.div>;
  }
  render(<I18nProvider><MotionSetting /><Answer /></I18nProvider>);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "42" } });
  fireEvent.click(screen.getByRole("button", { name: "No animations" }));
  expect(localStorage.getItem("math_master_reduce_motion")).toBe("true");
  expect(document.documentElement).toHaveClass("reduce-motion");
  expect(screen.getByRole("textbox")).toBe(input);
  expect(input).toHaveValue("42");
  await waitFor(() => expect(input.parentElement).toHaveStyle({ opacity: "0.5" }));
  fireEvent.click(screen.getByRole("button", { name: "No animations" }));
  expect(isMotionReduced()).toBe(false);
  expect(input).toHaveValue("42");
});

it("reads a persisted preference and follows cross-tab storage changes", () => {
  localStorage.setItem("math_master_reduce_motion", "true");
  localStorage.setItem("math_master_lang", "en");
  render(<I18nProvider><MotionSetting /></I18nProvider>);
  expect(screen.getByRole("button", { name: "No animations" })).toHaveAttribute("aria-pressed", "true");
  act(() => {
    localStorage.setItem("math_master_reduce_motion", "false");
    window.dispatchEvent(new Event("storage"));
  });
  expect(screen.getByRole("button", { name: "No animations" })).toHaveAttribute("aria-pressed", "false");
});

it("resolves looping keyframes and discards delays and repeats", () => {
  expect(stillTarget({ opacity: [null, 1], x: [0, 10, 0], transition: { delay: 8, repeat: Infinity } })).toEqual({
    opacity: 1, x: 0, transition: { duration: 0, delay: 0, repeat: 0 },
  });
});

it("still switches motion when storage is readable but the tablet has no space to save", () => {
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  setMotionReduced(true);
  expect(isMotionReduced()).toBe(true);
  setMotionReduced(false);
  expect(isMotionReduced()).toBe(false);
  write.mockRestore();
  setMotionReduced(false);
});

it("keeps the countdown functional without animation and stops ticking at the deadline", () => {
  vi.useFakeTimers();
  setMotionReduced(true);
  const frame = vi.spyOn(window, "requestAnimationFrame");
  const askedAt = Date.now();
  const view = render(<TimerBar askedAt={askedAt} seconds={10} running />);
  act(() => { vi.advanceTimersByTime(5000); });
  expect(screen.getByRole("timer").firstElementChild).toHaveStyle({ transform: "scaleX(0.5)" });
  view.rerender(<TimerBar askedAt={askedAt} seconds={10} running={false} />);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByRole("timer").firstElementChild).toHaveStyle({ transform: "scaleX(0.5)" });
  view.rerender(<TimerBar askedAt={askedAt + 1000} seconds={10} running />);
  act(() => { vi.advanceTimersByTime(5000); });
  expect(screen.getByRole("timer").firstElementChild).toHaveStyle({ transform: "scaleX(0)" });
  expect(vi.getTimerCount()).toBe(0);
  expect(frame).not.toHaveBeenCalled();
  frame.mockRestore();
});
