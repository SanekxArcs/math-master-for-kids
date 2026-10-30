<p align="center">
  <img src="public/pwa-192.png" width="96" alt="Math Master icon" />
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/transparent.svg?title=Math+Master&subtitle=Math+practice+for+kids+7%2B+with+combos,+pets+and+a+parent+dashboard&mode=dark&align=center" />
    <img alt="Math Master" src="https://shieldcn.dev/header/transparent.svg?title=Math+Master&subtitle=Math+practice+for+kids+7%2B+with+combos,+pets+and+a+parent+dashboard&mode=light&align=center" />
  </picture>
</p>

<p align="center">
  <a href="https://github.com/SanekxArcs/math-trening-7plus-years-/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/SanekxArcs/math-trening-7plus-years-.svg?variant=secondary" /></a>
  <a href="https://github.com/SanekxArcs/math-trening-7plus-years-/commits/main"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/SanekxArcs/math-trening-7plus-years-.svg?variant=secondary" /></a>
  <img alt="Version 2.0.0" src="https://shieldcn.dev/badge/version-2.0.0-6D28D9.svg?variant=secondary" />
  <img alt="React 19" src="https://shieldcn.dev/badge/React-19-61DAFB.svg?variant=secondary&logo=react" />
  <img alt="Convex backend" src="https://shieldcn.dev/badge/backend-Convex-EE342F.svg?variant=secondary&logo=convex" />
  <img alt="PWA offline first" src="https://shieldcn.dev/badge/PWA-offline%20first-16A34A.svg?variant=secondary&logo=pwa" />
  <img alt="Languages PL EN UK" src="https://shieldcn.dev/badge/languages-PL%20%E2%80%A2%20EN%20%E2%80%A2%20UK-F59E0B.svg?variant=secondary" />
</p>

<p align="center">
  A child taps answers, builds combos, earns coins and looks after a pet.<br/>
  A parent watches progress from any device, sees which facts are weak, and tunes the difficulty live.
</p>

---

## The loop

1. **Answer.** Tap the right tile, or type it on a numpad in expert mode. Correct answers in a row raise a combo multiplier, wrong ones cost escalating penalties.
2. **Reach the goal.** Each of the 20 levels has a points goal that grows. Fall to minus 25% of the goal and the run restarts at level 1.
3. **Get paid.** Winning a level pays coins. A daily streak adds more.
4. **Spend.** Coins buy food, care and toys for a pet, and clothes from a 31-item wardrobe. Pets get hungry, dirty and sad over time, can get sick, and can be revived.
5. **Prestige.** Trade completed levels once for a permanent coin multiplier and start again faster.

Nothing in the game is random for its own sake. Wrong answer choices stay close to the real one, and the next question leans toward facts the child keeps missing.

## For the child

- **Four operations** with operand limits set by the parent, plus a toggle for 0 and 1.
- **Four difficulties.** Easy and medium show 2 or 4 tiles, hard shows 6, expert needs a typed answer. Base points 5, 10, 15, 25. Fast answers earn 1.25×.
- **Combos.** ×2 from 5 in a row, ×3 from 15, ×4 from 30.
- **Hints that teach.** Ten-frames for + and −, dot groups for × and ÷, sharing into boxes for division, an animated count-together, a drawable times-zero hint, and a 50:50 with a cooldown. A hint costs the streak, so it is a choice.
- **Adaptive practice.** Per-fact mastery with a 21-day half-life weights the next question toward weak facts. Parents can switch it off.
- **Six pets** to choose from: horse, cat, dog, bunny, unicorn, tiger. Rename, pet, feed, bathe, put to sleep, pick a favourite, save up for a wish. A 20-second catch game for fun, with no coins and no way to lose.
- **Sessions that survive.** Close the tab mid-round and come back within six hours. Won rounds never expire.
- **Feel.** Synthesized sounds with no audio files, confetti on combos and wins, motion animations with a reduced-motion setting, and an onboarding walkthrough with scenes. Dark mode follows the system.

## For the parent

A dashboard at `/parent` that works from the parent's own phone, not the child's tablet:

| Tab | What it shows |
|---|---|
| **Overview** | Stat tiles, a 14-day chart, accuracy by operation, most-missed facts with the wrong answers given, week-over-week suggestions, and a holiday switch that pauses pet decay |
| **Tables** | A mastery grid per difficulty |
| **History** | The full attempt log |
| **Settings** | Operations, limits, difficulty, timer, hints, adaptive mode, sound. Changes land on the child's device live |
| **Account** | PIN, name, locale |

There is a guided walkthrough the first time.

### Pairing without accounts

No emails, no passwords for kids.

- The parent creates a child profile and gets a **6-character pairing code** and a **PIN**.
- The child's device links with the code alone, shown as a QR code that opens a `/pair` link. Scanning uses the Barcode Detection API with a jsQR fallback.
- The parent dashboard needs code plus PIN. Its session lives only in that browser tab, and opening child mode revokes it.

An owner page at `/admin` behind a password shows usage and live activity, and can block, unblock or delete profiles. The first login forces a password change, and logins are rate-limited and lock after too many attempts.

## Offline first, synced always

The app is a PWA and keeps working with no network. Durability comes from the data model, not from caching:

- **Dexie (IndexedDB)** holds an outbox of attempts, device identity, a mirror of settings for offline starts, and per-fact mastery. Game, pet and session state live in localStorage, scoped per profile.
- **Convex** holds profiles, devices, settings, attempts, fact stats, and a full save snapshot with a server revision.
- The outbox drains when the device comes online, with a 30-second backstop. Uploads are idempotent by client id.
- Saves use compare-and-save on the server revision. On a real conflict the user picks which save to keep, and local recovery copies are kept.
- The page saves the moment it goes hidden. A fresh device waits for its first restore before play.

Tabs left open across a deploy are handled too. If a lazy chunk is gone, the page updates the service worker and reloads once, never while offline and never losing game data. The worker refreshes open parent and admin tabs on activation but leaves an active game alone.

The app also runs with no Convex backend configured, as a purely local game.

## Run it

Requirements: Node 22, pnpm, a free [Convex](https://convex.dev) project for sync.

```sh
pnpm install
cp .env.example .env.local     # CONVEX_DEPLOYMENT, CONVEX_DEPLOY_KEY, VITE_CONVEX_URL
pnpm convex                    # Convex dev backend, in one terminal
pnpm dev                       # Vite, in another
```

Set `ADMIN_PASSWORD` in the Convex environment for the first `/admin` login.

```sh
pnpm test            # Vitest, 43 test files: engine, sync, components
pnpm typecheck
pnpm build           # tsc -b && vite build
pnpm icons           # redraws the PWA icons from code
node scripts/verify-backend.mjs   # 26 end-to-end checks against the dev deployment
```

Deploy the Convex backend before the frontend. New snapshot fields are optional, so old clients keep working. `vercel.json` serves `dist` as a single-page app, caches `/assets` for a year and never caches the service worker, the manifest or `index.html`. Vercel runs no functions; Convex is the whole backend.

## Routes

| Route | Page |
|---|---|
| `/` | Start: logo, language, Child or Parent |
| `/play` | The game |
| `/pets` | Pets, shop and wardrobe |
| `/pair` | Landing page for a scanned QR code |
| `/parent/*` | Parent dashboard |
| `/admin` | Owner page |

Parent and admin bundles are lazy-loaded and kept out of the precache, so they never land on a child's tablet by accident.

## Project layout

```
src/engine/     Pure, unit-tested math: problems, distractors, scoring, levels, mastery, pets
src/game/       Play screen, hints, prestige, daily streak, sounds, confetti
src/pets/       Pet view, supply shop, wardrobe, catch game
src/parent/     Dashboard tabs and suggestions
src/admin/      Owner page
src/pair/       QR code pairing
src/sync/       Dexie database, outbox, snapshot sync
src/i18n/       Polish, English, Ukrainian strings with typed keys
convex/         Schema, parent and admin functions, secure session handling
scripts/        Icon generator, backend verification
PLAN.md         The rewrite plan from the original vanilla JS game, phase by phase
SYNC_REVIEW.md  How sync and conflict handling work, with the test inventory
```

## Stack

React 19, React Router 7, Vite 8, TypeScript 7, Tailwind 4, Radix UI, motion, Zustand, Dexie 4, Convex, vite-plugin-pwa, Vitest with Testing Library. Package manager pnpm.
