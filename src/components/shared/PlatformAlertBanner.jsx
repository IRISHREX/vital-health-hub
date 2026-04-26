import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Wrench, CreditCard, FileText, Bell, X } from "lucide-react";
import { getPlatformNotices } from "@/lib/platformNotices";
import { getAuthToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const TYPE_META = {
  info:         { Icon: Info,           tone: "border-primary/40 bg-primary/5 text-foreground",        accent: "text-primary" },
  warning:      { Icon: AlertTriangle,  tone: "border-amber-500/40 bg-amber-500/5 text-foreground",    accent: "text-amber-600 dark:text-amber-400" },
  critical:     { Icon: AlertTriangle,  tone: "border-destructive/50 bg-destructive/10 text-foreground", accent: "text-destructive" },
  maintenance:  { Icon: Wrench,         tone: "border-muted-foreground/30 bg-muted/40 text-foreground", accent: "text-muted-foreground" },
  subscription: { Icon: CreditCard,     tone: "border-primary/40 bg-primary/5 text-foreground",        accent: "text-primary" },
  policy:       { Icon: FileText,       tone: "border-border bg-card text-foreground",                  accent: "text-foreground" },
};

const STORAGE_KEY = "dismissed_platform_notices";

const readDismissed = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
};

export default function PlatformAlertBanner() {
  const isAuthed = !!getAuthToken();
  const [dismissed, setDismissed] = useState(readDismissed);

  // Keep tab-to-tab state coherent.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setDismissed(readDismissed()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data } = useQuery({
    queryKey: ["platform-notices"],
    queryFn: getPlatformNotices,
    enabled: isAuthed,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 0,
  });

  const visible = useMemo(() => {
    const list = data?.data || [];
    return list.filter((n) => !dismissed.includes(n._id));
  }, [data, dismissed]);

  if (!visible.length) return null;

  const dismiss = (id) => {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-2 px-3 pt-3 sm:px-4 lg:px-6">
      {visible.map((notice) => {
        const meta = TYPE_META[notice.type] || TYPE_META.info;
        const Icon = meta.Icon;
        return (
          <div
            key={notice._id}
            role="alert"
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 shadow-sm",
              meta.tone
            )}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.accent)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{notice.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">{notice.message}</p>
              {notice.expiresAt && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Valid until {new Date(notice.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
            {notice.type !== "critical" && (
              <button
                type="button"
                onClick={() => dismiss(notice._id)}
                aria-label="Dismiss notice"
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
