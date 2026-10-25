import type { Lang } from "@/i18n/translations";
import { shuffle, type Rng } from "@/engine/rng";

export type MessageKind = "good" | "bad" | "help";
type Phrase = readonly [uk: string, pl: string, en: string];

const phrases: Record<MessageKind, readonly Phrase[]> = {
  good: [
    ["Оце так! Гарно пораховано!", "Brawo! Dobrze policzone!", "Nice! You worked that out!"],
    ["Ще одна задача розв’язана!", "Kolejne zadanie rozwiązane!", "Another problem solved!"],
    ["Твоя уважність спрацювала!", "Twoja uważność pomogła!", "Your attention paid off!"],
    ["Маленькі кроки дають великі вміння.", "Małe kroki budują wielkie umiejętności.", "Small steps build big skills."],
    ["Ти щойно потренував свій мозок!", "Właśnie ćwiczysz swój mózg!", "You just gave your brain some practice!"],
    ["Можеш пишатися цією роботою.", "Możesz być dumny z tej pracy.", "You can feel proud of that work."],
    ["Ця відповідь на своєму місці!", "Ta odpowiedź pasuje idealnie!", "That answer fits just right!"],
    ["Ура! Числа склалися!", "Hurra! Liczby się zgadzają!", "Hooray! The numbers fit!"],
    ["Цікавий шлях до відповіді, правда?", "Ciekawa droga do odpowiedzi, prawda?", "Finding the answer is an adventure!"],
    ["Твоя практика вже має результат.", "Twoje ćwiczenia dają efekty.", "Your practice is making a difference."],
    ["Лови дружню п’ятірку!", "Przybij piątkę!", "Here's a friendly high five!"],
    ["Цю задачу ти подолав!", "To zadanie już za tobą!", "You figured this one out!"],
    ["Один приклад — ще одне тренування.", "Jedno zadanie to kolejny trening.", "One problem, one more bit of practice."],
    ["Математична пригода триває!", "Matematyczna przygoda trwa!", "Our maths adventure is growing!"],
    ["Знайти відповідь — приємне відчуття!", "Miło znaleźć odpowiedź!", "Finding the answer feels good!"],
    ["Крок за кроком стає зрозуміліше.", "Krok po kroku robi się jaśniej.", "Things get clearer one step at a time."],
    ["Це було вдале тренування!", "To było udane ćwiczenie!", "That was a good bit of practice!"],
    ["Тут усе зійшлося!", "Tutaj wszystko się zgadza!", "Everything adds up here!"],
    ["Твоя відповідь правильна. Чудово!", "Twoja odpowiedź jest poprawna. Świetnie!", "Your answer is right. Well done!"],
    ["Як тобі вдалося це порахувати?", "Jak udało ci się to policzyć?", "How did you work that one out?"],
    ["Ти знайшов потрібне число!", "Masz właściwą liczbę!", "You found the number we needed!"],
    ["Числа люблять уважних дослідників.", "Liczby lubią uważnych odkrywców.", "Numbers reward careful exploring."],
    ["Ось і ще одна маленька перемога!", "To kolejny mały sukces!", "That's another little success!"],
    ["Цікаво, який спосіб ти обрав?", "Ciekawe, jakiego sposobu używasz?", "I wonder which method you used?"],
    ["Гарна робота з числами!", "Dobra robota z liczbami!", "Good work with those numbers!"],
    ["Кожне тренування щось додає.", "Każde ćwiczenie coś daje.", "Every bit of practice adds something."],
    ["Відповідь знайдена. Дай собі п’ять!", "Odpowiedź znaleziona. Przybij sobie piątkę!", "Answer found. Give yourself a high five!"],
    ["Ти впорався з цим прикладом!", "To zadanie udało się rozwiązać!", "You handled this problem!"],
    ["Можна порадіти своєму успіху!", "Możesz ucieszyć się swoim sukcesem!", "Take a moment to enjoy that success!"],
    ["Розуміти числа — це справжнє вміння.", "Rozumienie liczb to prawdziwa umiejętność.", "Understanding numbers is a real skill."],
  ],
  bad: [
    ["Помилки теж допомагають учитися.", "Błędy też pomagają się uczyć.", "Mistakes help us learn too."],
    ["Не поспішай. Можна подумати ще.", "Bez pośpiechu. Masz czas pomyśleć.", "No rush. You can take time to think."],
    ["Спробуй розбити задачу на частини.", "Spróbuj podzielić zadanie na części.", "Try breaking the problem into small parts."],
    ["Тут можна помилятися. Це тренування.", "Tutaj można się mylić. To ćwiczenia.", "It's okay to make mistakes. This is practice."],
    ["Поглянь на знак між числами.", "Spójrz na znak między liczbami.", "Have a look at the sign between the numbers."],
    ["Складний приклад — ще не кінець пригоди.", "Trudne zadanie nie kończy przygody.", "A tricky problem isn't the end of the adventure."],
    ["Можна порахувати на пальцях.", "Możesz policzyć na palcach.", "You can use your fingers to count."],
    ["Нова задача — нова можливість.", "Nowe zadanie to nowa szansa.", "A new problem is a fresh chance."],
    ["Підказка поруч, якщо вона потрібна.", "Podpowiedź jest obok, jeśli jej potrzebujesz.", "A hint is there if you need one."],
    ["Одна помилка не стирає твоїх умінь.", "Jeden błąd nie odbiera twoich umiejętności.", "One mistake doesn't erase what you know."],
    ["Можна спробувати інший спосіб.", "Możesz spróbować innego sposobu.", "You can try a different way."],
    ["Числа іноді плутаються. Розберімося.", "Liczby czasem się mylą. Przyjrzyjmy się im.", "Numbers can get muddled. Let's untangle them."],
    ["Повільно — теж хороший темп.", "Powoli to też dobre tempo.", "Slowly is a good pace too."],
    ["Зроби вдих. Почнемо з малого кроку.", "Weź oddech. Zacznijmy od małego kroku.", "Take a breath. Let's start with a small step."],
    ["Перевір обидва числа ще раз.", "Sprawdź jeszcze raz obie liczby.", "Check both numbers once more."],
    ["Твоя спроба теж була тренуванням.", "Twoja próba też była ćwiczeniem.", "Your attempt was practice too."],
    ["Помилка показує, що ще потренувати.", "Błąd pokazuje, co jeszcze poćwiczyć.", "A mistake shows us what to practise."],
    ["Іноді варто почати рахувати спочатку.", "Czasem warto zacząć liczenie od początku.", "Sometimes it helps to count from the start."],
    ["Можеш попросити дорослого пояснити.", "Możesz poprosić dorosłego o wyjaśnienie.", "You can ask a grown-up to explain."],
    ["Вчитися — це пробувати різні шляхи.", "Nauka to próbowanie różnych dróg.", "Learning means trying different paths."],
    ["Не треба вгадувати. Подумай по кроках.", "Nie musisz zgadywać. Pomyśl krok po kroku.", "You don't have to guess. Think step by step."],
    ["Перепочинок теж допомагає мозку.", "Odpoczynek też pomaga mózgowi.", "A little rest helps your brain too."],
    ["Цей приклад можна розібрати разом.", "To zadanie można rozwiązać razem.", "You can work through this one with someone."],
    ["Спробуй уявити числа як предмети.", "Spróbuj wyobrazić sobie liczby jako przedmioty.", "Try picturing the numbers as objects."],
    ["Наступну задачу можна почати спокійно.", "Następne zadanie możesz zacząć spokojnie.", "You can begin the next problem calmly."],
    ["Важливіше зрозуміти, ніж поспішити.", "Ważniejsze jest zrozumienie niż pośpiech.", "Understanding matters more than rushing."],
    ["Цифри ще стануть зрозумілішими.", "Liczby staną się coraz jaśniejsze.", "The numbers will make more sense with practice."],
    ["Можеш зробити паузу, коли захочеш.", "Możesz zrobić przerwę, kiedy chcesz.", "You can take a break whenever you want."],
    ["Ти не мусиш знати все одразу.", "Nie musisz wiedzieć wszystkiego od razu.", "You don't have to know everything right away."],
    ["Давай шукати зручніший спосіб.", "Poszukajmy wygodniejszego sposobu.", "Let's look for a way that feels easier."],
  ],
  help: [
    ["Підказки — корисні інструменти!", "Podpowiedzi to przydatne narzędzia!", "Hints are useful tools!"],
    ["Попросити допомогу — хороший крок.", "Proszenie o pomoc to dobry krok.", "Asking for help is a good step."],
    ["Тепер спробуй пояснити собі цей крок.", "Teraz spróbuj wyjaśnić sobie ten krok.", "Now try explaining that step to yourself."],
    ["З підказкою теж можна вчитися.", "Z podpowiedzią też można się uczyć.", "You can learn with a hint too."],
    ["Не треба все робити без допомоги.", "Nie musisz robić wszystkiego bez pomocy.", "You don't have to do everything alone."],
    ["Картинки допомагають побачити числа.", "Obrazki pomagają zobaczyć liczby.", "Pictures can help us see the numbers."],
    ["Ти знайшов спосіб рухатися далі.", "Masz sposób, by ruszyć dalej.", "You found a way forward."],
    ["Що в підказці допомогло найбільше?", "Co w podpowiedzi pomogło najbardziej?", "Which part of the hint helped most?"],
    ["Математики теж користуються інструментами.", "Matematycy też korzystają z narzędzi.", "Mathematicians use tools too."],
    ["Малюнок може зробити задачу простішою.", "Rysunek może ułatwić zadanie.", "A drawing can make a problem easier."],
    ["Запам’ятай крок, який допоміг.", "Zapamiętaj krok, który pomógł.", "Remember the step that helped."],
    ["Вчитися з підтримкою — нормально.", "Uczenie się ze wsparciem jest w porządku.", "Learning with support is okay."],
    ["У кожного є свої корисні підказки.", "Każdy ma swoje przydatne podpowiedzi.", "Everyone has tools that help them."],
    ["Відповідь знайдена з допомогою. Це досвід!", "Odpowiedź znaleziona z pomocą. To doświadczenie!", "You found the answer with help. That's experience!"],
    ["Спробуй пригадати, як допомогла підказка.", "Spróbuj przypomnieć sobie, jak pomogła podpowiedź.", "Think about how the hint helped you."],
    ["Можна рахувати вголос, якщо так зручніше.", "Możesz liczyć na głos, jeśli tak wygodniej.", "You can count aloud if that helps."],
    ["Один зрозумілий крок уже має значення.", "Jeden zrozumiały krok już ma znaczenie.", "One step you understand already matters."],
    ["Уміння користуватися допомогою теж важливе.", "Umiejętność korzystania z pomocy też jest ważna.", "Knowing how to use help is a skill too."],
    ["Ти потренувався шукати підтримку.", "Ćwiczysz też szukanie wsparcia.", "You practised finding support too."],
    ["Не всі задачі треба розв’язувати однаково.", "Nie każde zadanie trzeba rozwiązywać tak samo.", "Not every problem needs the same method."],
    ["Підказка може навчити нового способу.", "Podpowiedź może nauczyć nowego sposobu.", "A hint can teach you a new method."],
    ["Спробуй показати числа на пальцях.", "Spróbuj pokazać liczby na palcach.", "Try showing the numbers on your fingers."],
    ["Цей крок можна ще раз проговорити.", "Ten krok możesz jeszcze raz opowiedzieć.", "You can talk through that step again."],
    ["Зручний спосіб у кожного свій.", "Każdy ma swój wygodny sposób.", "Different ways work for different people."],
    ["Інструменти допомагають думати, не заважають.", "Narzędzia pomagają myśleć, nie przeszkadzają.", "Tools help your thinking along."],
    ["Можеш намалювати свій приклад на папері.", "Możesz narysować swoje zadanie na papierze.", "You can draw your own problem on paper."],
    ["Поступово знайомих задач стане більше.", "Stopniowo poznasz coraz więcej zadań.", "More problems will feel familiar with practice."],
    ["Добре мати кілька способів рахувати.", "Dobrze znać kilka sposobów liczenia.", "It's useful to have several ways to count."],
    ["Дай собі час розібратися з підказкою.", "Daj sobie czas na zrozumienie podpowiedzi.", "Give yourself time to understand the hint."],
    ["Тут важливо зрозуміти, як це працює.", "Ważne, by zrozumieć, jak to działa.", "Understanding how it works is what matters."],
  ],
};

function localized(index: 0 | 1 | 2): Record<MessageKind, readonly string[]> {
  return { good: phrases.good.map((p) => p[index]), bad: phrases.bad.map((p) => p[index]), help: phrases.help.map((p) => p[index]) };
}
export const PET_MESSAGES: Record<Lang, Record<MessageKind, readonly string[]>> = {
  uk: localized(0), pl: localized(1), en: localized(2),
};

/** Mistakes/help always get a response. Unassisted successes have gaps of 1–3 answers. */
export class PetMessageDeck {
  private remaining: number;
  private bags: Record<MessageKind, number[]> = { good: [], bad: [], help: [] };
  private previous: Partial<Record<MessageKind, number>> = {};
  private rng: Rng;
  constructor(rng: Rng = Math.random) { this.rng = rng; this.remaining = this.gap(); }
  private gap() { return 1 + Math.floor(this.rng() * 3); }
  next(kind: MessageKind): { kind: MessageKind; index: number } | null {
    if (kind === "good" && --this.remaining > 0) return null;
    this.remaining = this.gap();
    if (this.bags[kind].length === 0) {
      this.bags[kind] = shuffle(this.rng, Array.from({ length: phrases[kind].length }, (_, i) => i));
      const last = this.bags[kind].length - 1;
      if (this.bags[kind][last] === this.previous[kind]) {
        [this.bags[kind][0], this.bags[kind][last]] = [this.bags[kind][last]!, this.bags[kind][0]!];
      }
    }
    const index = this.bags[kind].pop()!;
    this.previous[kind] = index;
    return { kind, index };
  }
}
