import { useState } from "react";
import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convex";
import { useI18n } from "@/i18n/useI18n";
import { WelcomeShell, WelcomeCard, fieldClass, labelClass } from "@/game/WelcomeShell";
import { primaryActionClass, ghostActionClass } from "@/game/GameDialog";
import type { AdminSession } from "./AdminRoute";

export function AdminPassword({ session, onSession, onCancel }: { session: AdminSession; onSession: (session: AdminSession) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <WelcomeShell><WelcomeCard hero={<span className="text-4xl" aria-hidden>🔐</span>} as="form" className="space-y-4" onSubmit={async (event: React.FormEvent) => {
    event.preventDefault();
    if (!convex || busy || password.length < 12 || password !== confirm) return;
    setBusy(true); setError("");
    try { onSession(await convex.action(api.secure.changeAdminPassword, { token: session.token, currentPassword: current, newPassword: password })); }
    catch (cause) { setError(t(String(cause).includes("ADMIN_PASSWORD_SAME") ? "adminPasswordDifferent" : String(cause).includes("ADMIN_WRONG") ? "adminWrong" : "couldNotSave")); }
    finally { setBusy(false); }
  }}>
    <h1 className="font-display text-2xl font-black">{t(session.mustChangePassword ? "adminFirstPassword" : "adminChangePassword")}</h1>
    <p className="text-sm text-muted-foreground">{t("adminPasswordHelp")}</p>
    {!session.mustChangePassword && <label className={labelClass}>{t("adminCurrentPassword")}
      <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={fieldClass} required />
    </label>}
    <label className={labelClass}>{t("adminNewPassword")}
      <input type="password" name="new-password" autoComplete="new-password" minLength={12} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} className={fieldClass} required />
    </label>
    <label className={labelClass}>{t("repeat")}
      <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={fieldClass} required />
    </label>
    {confirm && confirm !== password && <p role="alert" className="text-sm text-wrong">{t("adminPasswordsMismatch")}</p>}
    {error && <p role="alert" className="text-sm text-wrong">{error}</p>}
    <button type="submit" disabled={busy || password.length < 12 || password !== confirm || (!session.mustChangePassword && !current)} className={primaryActionClass}>{t(busy ? "loading" : "adminSavePassword")}</button>
    <button type="button" onClick={onCancel} className={ghostActionClass}>{t(session.mustChangePassword ? "signOut" : "cancel")}</button>
  </WelcomeCard></WelcomeShell>;
}
