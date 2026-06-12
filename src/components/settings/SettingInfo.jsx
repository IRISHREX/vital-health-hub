import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Inline info icon explaining a setting / section.
 * Click (or hover via touch-friendly popover) to reveal purpose + precautions.
 * Reference text is sourced from KT/07_Module_Functionality_Reference.md.
 *
 * Props:
 *   title      - short heading
 *   purpose    - what the setting controls
 *   precaution - optional caution / warning text
 */
export default function SettingInfo({ title, purpose, precaution, side = "right" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${title || "this setting"}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-72 text-sm">
        {title ? <div className="mb-1 font-semibold">{title}</div> : null}
        {purpose ? <p className="text-muted-foreground">{purpose}</p> : null}
        {precaution ? (
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
            <strong>Precaution:</strong> {precaution}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
