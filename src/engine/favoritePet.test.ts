import { expect, it } from "vitest";
import { NEW_STABLE, adopt, choose, favoritePet, makeFavorite, newPet, orderedPets } from "./pet";

it("pins an owned favorite first without changing the saved pet array", () => {
  const pets = [newPet("horse", "Bella", 1), newPet("cat", "Rudy", 1), newPet("dog", "Max", 1)];
  const source = { ...NEW_STABLE, pets, activeId: "horse" as const };
  const favorite = makeFavorite(source, "dog");
  expect(orderedPets(favorite).map((pet) => pet.id)).toEqual(["dog", "horse", "cat"]);
  expect(favorite.pets).toBe(pets);
  expect(favoritePet(favorite)?.id).toBe("dog");
  expect(favoritePet(choose(favorite, "cat"))?.id).toBe("dog");
  expect(makeFavorite(favorite, "unicorn")).toBe(favorite);
  expect(makeFavorite(favorite, "dog")).toBe(favorite);
});

it("keeps the favorite when another pet is adopted", () => {
  const first = adopt(NEW_STABLE, "horse", "Bella", 1);
  expect(first.favoriteId).toBe("horse");
  const next = adopt({ ...first, coins: 1000 }, "cat", "Rudy", 2);
  expect(next.activeId).toBe("cat");
  expect(favoritePet(next)?.id).toBe("horse");
});
