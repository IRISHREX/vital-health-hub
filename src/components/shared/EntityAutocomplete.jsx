import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Generic async autocomplete with free-type support.
 *
 * Props:
 *   value          - selected entity id (string)
 *   selectedLabel  - label to show when an entity is selected (string)
 *   onSelect(item) - called with the picked entity (or null when cleared)
 *   onTextChange?  - called with the current text input (free-type mode)
 *   fetcher(query) - async fn returning array of entities
 *   getLabel(item) - primary display label
 *   getSubLabel(item)? - secondary muted line
 *   placeholder
 *   disabled
 *   allowFreeText  - default true; lets user type any value without selecting
 *   minChars       - default 1
 *   debounceMs     - default 300
 *   className
 */
export default function EntityAutocomplete({
  value,
  selectedLabel = "",
  onSelect,
  onTextChange,
  fetcher,
  getLabel,
  getSubLabel,
  placeholder = "Type to search...",
  disabled = false,
  allowFreeText = true,
  minChars = 1,
  debounceMs = 300,
  className,
  emptyMessage = "No matches. Keep typing to use as-is.",
}) {
  const [text, setText] = useState(selectedLabel || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  // Keep text in sync when parent updates the selected label (e.g. edit form prefill)
  useEffect(() => {
    setText(selectedLabel || "");
  }, [selectedLabel]);

  // Click-outside to close
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const runSearch = (query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < minChars) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const reqId = ++requestIdRef.current;
      try {
        const list = await fetcher(query);
        if (reqId !== requestIdRef.current) return; // stale
        setResults(Array.isArray(list) ? list : []);
      } catch {
        if (reqId !== requestIdRef.current) return;
        setResults([]);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    }, debounceMs);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    setOpen(true);
    setActiveIndex(-1);
    if (onTextChange) onTextChange(v);
    // Typing invalidates the previously selected id (unless it still matches)
    if (value && v !== selectedLabel) onSelect?.(null);
    runSearch(v);
  };

  const handlePick = (item) => {
    onSelect?.(item);
    setText(getLabel(item));
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setText("");
    setResults([]);
    onSelect?.(null);
    onTextChange?.("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        handlePick(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown =
    open && (loading || results.length > 0 || (text.length >= minChars && allowFreeText));

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => {
            setOpen(true);
            if (text.length >= minChars && results.length === 0) runSearch(text);
          }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {text && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {text.length < minChars
                ? `Type at least ${minChars} character${minChars > 1 ? "s" : ""}...`
                : emptyMessage}
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((item, idx) => (
                <li key={item._id || item.id || idx}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handlePick(item)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors",
                      idx === activeIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span className="font-medium leading-tight">{getLabel(item)}</span>
                    {getSubLabel && (
                      <span className="text-xs text-muted-foreground leading-tight">
                        {getSubLabel(item)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
