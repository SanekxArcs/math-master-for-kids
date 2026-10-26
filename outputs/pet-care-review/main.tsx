import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "@fontsource-variable/nunito";
import "../../src/index.css";
import { I18nProvider } from "../../src/i18n/useI18n";
import { PetsScreen } from "../../src/pets/PetsScreen";
import { NEW_STABLE, newPet } from "../../src/engine";

// Isolated local review origin: no account, sync, or child's saved progress.
if (!localStorage.getItem("pet-care-review-v1")) {
  const now = Date.now();
  localStorage.setItem("math_master_lang", "uk");
  localStorage.setItem("math_master_stable", JSON.stringify({ ...NEW_STABLE, coins: 125,
    pets: [{ ...newPet("horse", "Іскра", now), food: 35, clean: 45, happy: 70, health: 60 }, newPet("cat", "Рудик", now)],
    activeId: "horse", favoriteId: "horse", savedAt: now }));
  localStorage.setItem("math_master_session", JSON.stringify({ savedAt: now, score: { rawPoints: 40, goodStreak: 2, badStreak: 0, bestStreak: 3, correct: 4, wrong: 1 } }));
  localStorage.setItem("pet-care-review-v1", "yes");
}
createRoot(document.getElementById("root")!).render(<I18nProvider><MemoryRouter initialEntries={["/pets"]}><PetsScreen /></MemoryRouter></I18nProvider>);
