import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Radial fan-out row actions menu.
 *
 * Usage:
 *   <RowActions
 *     actions={[
 *       { icon: Eye, label: "View", onClick: () => ..., variant: "default" },
 *       { icon: Pencil, label: "Edit", onClick: () => ..., hidden: !canEdit },
 *       { icon: Trash2, label: "Delete", onClick: () => ..., variant: "destructive" },
 *     ]}
 *   />
 *
 * Each action: { icon, label, onClick, variant?: 'default'|'destructive'|'primary'|'success', hidden?: boolean, disabled?: boolean }
 */
export default function RowActions({ actions = [], align = "end", className }) {
  const visible = actions.filter((a) => a && !a.hidden);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (visible.length === 0) return null;

  // Pre-compute positions on a fan that opens to the LEFT of the trigger.
  // Distribute icons along an arc spanning 140° centered on 180° (left).
  const radius = 56;
  const arc = visible.length === 1 ? 0 : 140;
  const start = 180 - arc / 2;
  const step = visible.length === 1 ? 0 : arc / (visible.length - 1);

  const variantClasses = {
    default: "bg-background text-foreground border-border hover:bg-accent",
    primary: "bg-primary text-primary-foreground border-primary/40 hover:bg-primary/90",
    success: "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600",
    destructive: "bg-destructive text-destructive-foreground border-destructive/40 hover:bg-destructive/90",
    info: "bg-sky-500 text-white border-sky-400 hover:bg-sky-600",
    warning: "bg-amber-500 text-white border-amber-400 hover:bg-amber-600",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center",
        align === "end" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all",
          "hover:bg-accent hover:text-foreground",
          open && "bg-accent text-foreground shadow-sm",
        )}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {/* Fan-out items */}
      <div
        className={cn(
          "pointer-events-none absolute right-1/2 top-1/2 z-20 h-0 w-0",
          "[transform:translate(50%,-50%)]",
        )}
        aria-hidden={!open}
      >
        {visible.map((a, i) => {
          const angle = (start + step * i) * (Math.PI / 180);
          const tx = Math.cos(angle) * radius;
          const ty = Math.sin(angle) * radius;
          const Icon = a.icon;
          return (
            <button
              key={`${a.label}-${i}`}
              type="button"
              title={a.label}
              aria-label={a.label}
              disabled={a.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                a.onClick?.(e);
              }}
              style={{
                transform: open
                  ? `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`
                  : `translate(-50%, -50%) scale(0.4)`,
                transitionDelay: open ? `${i * 35}ms` : "0ms",
              }}
              className={cn(
                "absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-md",
                "transition-all duration-300 ease-out",
                open
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0",
                "disabled:cursor-not-allowed disabled:opacity-40",
                variantClasses[a.variant || "default"],
              )}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <span className="sr-only">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
