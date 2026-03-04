import { Button } from "@/components/ui/button";
import { Building2, UserRoundPlus } from "lucide-react";

export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1">
      <Button
        type="button"
        size="sm"
        variant={mode === "internal" ? "default" : "ghost"}
        className="gap-1.5 text-xs"
        onClick={() => onChange("internal")}
      >
        <Building2 className="h-3.5 w-3.5" />
        Internal (Hospital)
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === "external" ? "default" : "ghost"}
        className="gap-1.5 text-xs"
        onClick={() => onChange("external")}
      >
        <UserRoundPlus className="h-3.5 w-3.5" />
        External (Walk-in)
      </Button>
    </div>
  );
}
