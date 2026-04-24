import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "widget_nav_button_position_v1";
const BUTTON_SIZE = 56;
const EDGE_GAP = 20;
const DRAG_THRESHOLD = 6;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getViewportBounds = () => ({
  maxX: Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP),
  maxY: Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP),
});

const getDefaultPosition = () => {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  const { maxX, maxY } = getViewportBounds();
  return {
    x: maxX,
    y: Math.max(EDGE_GAP, maxY - 88),
  };
};

const readStoredPosition = () => {
  if (typeof window === "undefined") {
    return getDefaultPosition();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition();
    const parsed = JSON.parse(raw);
    const { maxX, maxY } = getViewportBounds();
    return {
      x: clamp(Number(parsed?.x ?? maxX), EDGE_GAP, maxX),
      y: clamp(Number(parsed?.y ?? maxY), EDGE_GAP, maxY),
    };
  } catch {
    return getDefaultPosition();
  }
};

export function FloatingNavigatorButton({ open, onToggle }) {
  const buttonRef = useRef(null);
  const dragRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const [position, setPosition] = useState(readStoredPosition);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const { maxX, maxY } = getViewportBounds();
      setPosition((current) => ({
        x: clamp(current.x, EDGE_GAP, maxX),
        y: clamp(current.y, EDGE_GAP, maxY),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  const buttonStyle = useMemo(
    () => ({
      left: `${position.x}px`,
      top: `${position.y}px`,
    }),
    [position],
  );

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };

    buttonRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    if (!dragRef.current.moved) {
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < DRAG_THRESHOLD) return;
      dragRef.current.moved = true;
      setDragging(true);
    }

    const { maxX, maxY } = getViewportBounds();
    setPosition({
      x: clamp(dragRef.current.originX + deltaX, EDGE_GAP, maxX),
      y: clamp(dragRef.current.originY + deltaY, EDGE_GAP, maxY),
    });
  };

  const handlePointerUp = (event) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    buttonRef.current?.releasePointerCapture(event.pointerId);

    const wasDragging = dragRef.current.moved;
    dragRef.current.pointerId = null;
    dragRef.current.moved = false;
    setDragging(false);

    if (!wasDragging) {
      onToggle();
    }
  };

  const handleDoubleClick = () => {
    setPosition(getDefaultPosition());
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-transform duration-200",
        dragging ? "scale-105" : "hover:scale-[1.03]",
      )}
      style={buttonStyle}
    >
      <Button
        ref={buttonRef}
        type="button"
        variant={open ? "default" : "secondary"}
        size="icon"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "h-14 w-14 rounded-2xl border shadow-lg backdrop-blur-md",
          "bg-background/95 text-foreground hover:bg-background",
          "touch-none select-none",
          open && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
          dragging && "cursor-grabbing shadow-2xl",
          !dragging && "cursor-grab",
        )}
        title="Module navigator. Drag to move, double-click to reset."
        aria-label="Open module navigator"
      >
        <LayoutGrid className="h-5 w-5" />
      </Button>
    </div>
  );
}
