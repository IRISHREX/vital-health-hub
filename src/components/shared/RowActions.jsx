import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { useRowActionsStyle } from "@/hooks/useRowActionsStyle";

/**
 * Radial fan-out row actions menu.
 *
 * Each action shape:
 *   { icon, label, onClick, variant?, hidden?, disabled? }
 *   variant: 'default' | 'primary' | 'success' | 'destructive' | 'info' | 'warning'
 *
 * Props:
 *   actions   - array of action objects (falsy / hidden entries are filtered)
 *   align     - 'start' | 'end' (default 'end')
 *   radius    - fan radius in px (default 56)
 *   arc       - arc span in degrees (default 140)
 *   className - extra classes for the wrapper
 */

// Module-level constants (avoid re-allocating per render).
const VARIANT_CLASSES = {
  default: "bg-background text-foreground border-border hover:bg-accent",
  primary: "bg-primary text-primary-foreground border-primary/40 hover:bg-primary/90",
  success: "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600",
  destructive: "bg-destructive text-destructive-foreground border-destructive/40 hover:bg-destructive/90",
  info: "bg-sky-500 text-white border-sky-400 hover:bg-sky-600",
  warning: "bg-amber-500 text-white border-amber-400 hover:bg-amber-600",
};

const DEG = Math.PI / 180;

function RowActions({ actions = [], align = "end", radius = 56, arc = 140, className }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const visible = useMemo(() => actions.filter((a) => a && !a.hidden), [actions]);

  // Pre-compute fan positions only when inputs change.
  const positions = useMemo(() => {
    const n = visible.length;
    if (n === 0) return [];
    const span = n === 1 ? 0 : arc;
    const start = 180 - span / 2;
    const step = n === 1 ? 0 : span / (n - 1);
    return visible.map((_, i) => {
      const angle = (start + step * i) * DEG;
      return { tx: Math.cos(angle) * radius, ty: Math.sin(angle) * radius };
    });
  }, [visible, radius, arc]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (visible.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center",
        align === "end" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <IconTooltip label="Actions">
        <button
          type="button"
          aria-label="Row actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className={cn(
            "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open && "bg-accent text-foreground shadow-sm",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </IconTooltip>

      <div
        className="pointer-events-none absolute right-1/2 top-1/2 z-20 h-0 w-0 [transform:translate(50%,-50%)]"
        role="menu"
        aria-hidden={!open}
      >
        {visible.map((a, i) => {
          const { tx, ty } = positions[i];
          const Icon = a.icon;
          return (
            <IconTooltip key={`${a.label}-${i}`} label={a.label} side="top" disabled={!open}>
              <button
                type="button"
                role="menuitem"
                aria-label={a.label}
                disabled={a.disabled}
                tabIndex={open ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  a.onClick?.(e);
                }}
                style={{
                  transform: open
                    ? `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`
                    : "translate(-50%, -50%) scale(0.4)",
                  transitionDelay: open ? `${i * 35}ms` : "0ms",
                }}
                className={cn(
                  "absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-md",
                  "transition-all duration-300 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  VARIANT_CLASSES[a.variant] || VARIANT_CLASSES.default,
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                <span className="sr-only">{a.label}</span>
              </button>
            </IconTooltip>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RowActions);
