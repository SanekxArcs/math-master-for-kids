# Game save and device-transfer review

Reviewed 17 October 2026. Scope: local persistence, cloud snapshots, linking a
device, completed levels, pets, round restoration, practice history, retries,
page suspension and signing out. Updated with the simpler child/parent entry
flows, profile isolation and revision-based conflict handling. Source, automated
tests and isolated-browser checks do not certify the deployed backend or transfer
between physical devices.

## Confirmed defects repaired

| Priority | Defect and trigger | Repair |
| --- | --- | --- |
| P1 | A won level was stored only in the local session. The numeric level advances only when “next level” is pressed, so linking a new device could make an already-won level look unfinished. | Include the round in the cloud snapshot and restore it before the game mounts. Preserve won boards beyond the six-hour session expiry. |
| P1 | Play and pet purchases could begin before the first backup arrived. Those actions made a new, incomplete stable newer than the cloud copy. | Gate a fresh device on initial restoration. Previously played devices can continue locally after a short wait if the cloud is unreachable. |
| P1 | Online sign-out deleted the local save after a failed or timed-out backup. | Stop sign-out on an unsuccessful answer upload or game save and leave local data and credentials intact. Display the failure in the confirmation. Explicitly warned offline removal retains its existing behavior. |
| P2 | Animal sleep state was deliberately excluded from snapshots. | Transfer `asleepSince` with the animals. Old snapshots default to awake. |
| P2 | Points, finished/lost/stopped state, the current question, lifelines and removed choices stayed on the old browser. | Serialize the round in the snapshot and use the existing defensive reader on restoration. Transfer the loss-message level too. Child/parent walkthrough completion stays separate and device-local. |
| P2 | A level change before any pet/reward existed could have no newer backup timestamp. Direct `raiseLevel` calls also bypassed stamping. | Stamp level increases at the store operation and allow an empty stable to carry real gameplay changes. |
| P2 | Failed backup writes were swallowed, while the answer-sync badge could look healthy. | Show separate game-backup saved/pending/failure status in English, Polish and Ukrainian. Keep periodic and reconnect retries. |
| P2 | Switching apps before the 800 ms save delay elapsed could suspend the pending write. | Start an immediate latest-state write when the page becomes hidden. Abrupt OS termination still cannot guarantee delivery. |
| P1 | Competing devices relied on device clocks to pick a whole-save winner. | Compare server-owned revisions on every modern write. Show a choice on conflict and retain local recovery copies before either selection. Do not replace an active round through live updates. |
| P1 | Local saves, mastery and queued answers could cross profiles. | Scope stores and credentials by profile, filter each upload by owner and copy legacy data to its original profile without deleting the original. |
| P2 | Per-fact mastery was uploaded to the server but never restored into the new device's adaptive question picker. | Add an authenticated one-time history fetch with retry, local persistence and protection for locally newer answers. Avoid a full-history live subscription. |

## Save coverage after these changes

- Current level and won-level board; round points/streaks/counters, unanswered
  question and spent lifelines. Unfinished rounds retain their existing six-hour
  expiry; won rounds no longer expire.
- Coins and last daily-bonus date.
- Every pet species, names, need/health values, alive/death state, vacation,
  care/play timestamps, accessories owned and worn, selected animal, wish and
  sleep state. Needs still decay from timestamps; transfer does not freeze them.
- Profile locale and parent settings continue to come from the existing settings
  service. Mastery is restored from the server's answer-derived statistics.
- Parent login sessions stay in the current browser tab and are cleared when
  child play opens; admin login sessions stay device-specific. Unsynced offline answers
  remain on the original device until that device connects.

## Simpler startup

- The starter shows the logo, language selector and Child / Parent choices.
- Child: first-time parent-help message and an inline game-code/QR login, with
  no parent PIN. Scanning starts game login immediately. The code-only backend
  action creates a child device token and never a parent session.
  A linked device opens the saved game; a new device/profile gets the child
  walkthrough, independently of whether another device completed it.
- Parent: existing profile login or child profile creation. Successful creation
  signs the parent in and opens the dashboard directly. If only the subsequent
  sign-in fails, retry login without creating a duplicate profile.
- The parent guide explains each dashboard tab and shows the pairing code/QR
  inside the guide. It can be reopened from the dashboard header. Completion
  never dismisses the child's guide.
- Parent login still requires the private PIN. Opening child mode removes
  cached parent sessions and revokes their tokens where the connection permits;
  returning to the dashboard requires parent authentication. Parent sessions
  are not shared through persistent local storage with the child's tab.
- Existing root restore links remain supported; game/pet navigation uses /play.

## Remaining limits

1. **Local storage/IndexedDB failures remain best effort.** The existing
   stable has an in-memory fallback, but round persistence and answer enqueueing
   can fail under blocked/full storage. A missing row is not a successful cloud
   backup. Dedicated storage-health reporting/recovery is outside this patch.
2. **Offline/force-close boundary:** a second device can restore only the latest
   snapshot received by the server. A hidden-page flush is best effort; a force
   quit can interrupt it. Before transferring, keep the original device online
   until “Game saved to your profile” appears. That message covers the game
   snapshot; pending answer history has its separate existing indicator.
3. **Deployment:** the new schema/functions and frontend must both be released.
   Existing snapshots remain readable because new fields are optional. Deploy
   the backend before the frontend. No deployment or production-data mutation
   was performed during this review. Once a revision-based save exists, old
   clients are prevented from replacing it with a partial snapshot. Refresh
   both devices after release.

## Verification

Final checks: all 317 tests across 28 files passed; the production build,
TypeScript checks, PWA generation and whitespace checks passed.

The production build includes TypeScript checking and PWA generation. The test
environment does not implement native canvas/scroll APIs. Isolated Chrome checks
verified the five startup screens at 390 px width with no horizontal overflow,
and exercised real IndexedDB profile separation, mastery, settings, legacy
migration, owner-filtered uploads and sign-out preserving other profiles using
test identities and a fake transport.
No real account or cloud mutation was used for those browser checks.

Regression coverage includes complete animal/wardrobe/wish/sleep transfer,
fresh-device gating, old won-level restoration in the actual game component
without a duplicate coin payout, local offline continuation, first level changes,
hidden-page writes, failed-write retries, online sign-out failure preservation,
mastery restoration, revision conflicts, a device clock behind the server,
preservation of both profile saves, and the separate child/parent entry paths.

Live acceptance after deployment: win a level, keep the summary open, change an
animal's clothes/name, put the animals to sleep, wait for saved status, then link
a clean browser/device with the same game code, without entering a PIN. Verify the same won
level, coins, all animals/clothing/wish/sleep state, and no second reward. Repeat
with an unfinished round and reconnect after an offline edit.
