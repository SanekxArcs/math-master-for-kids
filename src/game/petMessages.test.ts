import { expect, it } from "vitest";
import { seededRng } from "@/engine/rng";
import { PET_MESSAGES, PetMessageDeck, type MessageKind } from "./petMessages";

it("randomizes unassisted successes with gaps of no more than three answers", () => {
  for (let seed = 0; seed < 20; seed++) {
    const deck = new PetMessageDeck(seededRng(seed));
    let gap = 0;
    const gaps = new Set<number>();
    for (let i = 0; i < 300; i++) {
      gap++;
      const kind = "good";
      const next = deck.next(kind);
      expect(gap).toBeLessThanOrEqual(3);
      if (next) { expect(next.kind).toBe(kind); gaps.add(gap); gap = 0; }
    }
    expect(gaps.size).toBe(3);
  }
});

it("never skips mistakes or assisted answers, even immediately after praise", () => {
  const deck = new PetMessageDeck(() => 0.99);
  expect(deck.next("good")).toBeNull();
  expect(deck.next("good")).toBeNull();
  expect(deck.next("good")?.kind).toBe("good");
  expect(deck.next("bad")?.kind).toBe("bad");
  expect(deck.next("good")).toBeNull();
  expect(deck.next("bad")?.kind).toBe("bad");
  expect(deck.next("help")?.kind).toBe("help");
  expect(deck.next("help")?.kind).toBe("help");
  expect(deck.next("bad")?.kind).toBe("bad");
});

it("uses every phrase in a category before repeating, with no adjacent repeat across decks", () => {
  for (const kind of ["good", "bad", "help"] as MessageKind[]) {
    const deck = new PetMessageDeck(() => 0);
    const count = PET_MESSAGES.en[kind].length;
    const indices = Array.from({ length: count }, () => deck.next(kind)!.index);
    expect(new Set(indices).size).toBe(count);
    expect(deck.next(kind)!.index).not.toBe(indices.at(-1));
  }
});

it("provides thirty distinct messages for each result in every language", () => {
  for (const lang of ["uk", "pl", "en"] as const) {
    for (const kind of ["good", "bad", "help"] as const) {
      expect(PET_MESSAGES[lang][kind]).toHaveLength(30);
      expect(new Set(PET_MESSAGES[lang][kind]).size).toBe(30);
      expect(PET_MESSAGES[lang][kind].every((message) => message.length > 10 && message.length < 110)).toBe(true);
    }
  }
});
