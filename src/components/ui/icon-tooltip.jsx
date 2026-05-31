import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function IconTooltip({ label, children, side = "bottom", align = "center", disabled = false }) {
  if (!label || disabled) return children;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
