const OWNER = "math_master_active_profile";
const LEGACY = "math_master_legacy_profile";
const SAVES = ["stable", "level", "session", "lost_from", "onboarded", "settings", "backup_base"];
let fallbackProfile: string | null = null;

export function activeProfile(): string {
  if (fallbackProfile) return fallbackProfile;
  try { return localStorage.getItem(OWNER) ?? "guest"; } catch { return "guest"; }
}

export function legacyProfile(): string {
  try { return localStorage.getItem(LEGACY) ?? "guest"; } catch { return "guest"; }
}

export function profileKey(key: string, profile = activeProfile()): string {
  return profile === "guest" ? key : `${key}:${profile}`;
}

/** Copy legacy saves once. Never delete or reuse another profile's saves. */
export function activateProfile(profile: string, migrateLegacy = false): void {
  try {
    if (migrateLegacy && localStorage.getItem(LEGACY) === null) {
      for (const part of SAVES) {
        const key = `math_master_${part}`;
        const value = localStorage.getItem(key);
        if (value !== null && localStorage.getItem(profileKey(key, profile)) === null) {
          localStorage.setItem(profileKey(key, profile), value);
        }
      }
      localStorage.setItem(LEGACY, profile);
    }
    if (!migrateLegacy && localStorage.getItem(LEGACY) === null) localStorage.setItem(LEGACY, "guest");
    localStorage.setItem(OWNER, profile);
    fallbackProfile = profile;
  } catch { fallbackProfile = profile; }
  window.dispatchEvent(new Event("math-master-profile"));
}

export function belongsToProfile(row: { profileId?: string }, profile = activeProfile()): boolean {
  return (row.profileId ?? legacyProfile()) === profile;
}
