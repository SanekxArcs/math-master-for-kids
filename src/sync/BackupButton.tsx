import { createContext, useContext } from "react";
import { CloudCheck, CloudOff, CloudUpload, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";

export const BackupControl = createContext<{
  save: () => void;
  saving: boolean;
  failed: boolean;
  pending: boolean;
} | null>(null);

export function BackupButton() {
  const control = useContext(BackupControl);
  const { t } = useI18n();
  if (!control) return null;
  const label = t(control.saving ? "backupSaving" : "backupSaveNow");
  const status = t(control.saving ? "backupSaving" : control.failed ? "backupFailed" : control.pending ? "backupPending" : "backupSaved");
  const Icon = control.saving ? Loader2 : control.failed ? CloudOff : control.pending ? CloudUpload : CloudCheck;
  return <button
    type="button"
    aria-label={label}
    aria-busy={control.saving}
    title={`${label} · ${status}`}
    disabled={control.saving}
    onClick={control.save}
    className={cn(
      "flex size-10 shrink-0 items-center justify-center rounded-full border-b-4 border-black/15 bg-linear-to-b from-secondary to-accent text-primary shadow-[0_4px_12px_-6px_var(--primary)]",
      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2 disabled:cursor-wait disabled:opacity-60",
      control.failed && "text-wrong",
    )}
  ><Icon className={cn("size-5", control.saving && "animate-spin")} aria-hidden="true" /></button>;
}
