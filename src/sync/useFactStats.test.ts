// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { EMPTY_FACT } from "@/engine";

vi.mock("./facts", async (original) => ({
  ...await original<typeof import("./facts")>(),
  loadFacts: async () => new Map(), persistFact: vi.fn(async () => {}),
}));
const { useFactStats } = await import("./useFactStats");

describe("practice history transfer", () => {
  it("restores the server's mastery and keeps offline answers that are ahead", () => {
    const hook = renderHook(() => useFactStats());
    const fact = { ...EMPTY_FACT, attempts: 12, correct: 10, strength: 0.8, lastSeenAt: 500 };
    act(() => hook.result.current.restoreFacts([{ id: "mul:7:8:medium", ...fact }]));
    expect(hook.result.current.getStats().get("mul:7:8:medium")).toEqual(fact);
    act(() => hook.result.current.restoreFacts([{ id: "mul:7:8:medium", ...fact, attempts: 10, lastSeenAt: 400 }]));
    expect(hook.result.current.getStats().get("mul:7:8:medium")).toEqual(fact);
  });
});
