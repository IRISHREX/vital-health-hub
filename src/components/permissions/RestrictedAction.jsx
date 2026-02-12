import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAccessRequest } from "@/lib/settings";
import { toast } from "sonner";
import { useVisualAuth } from "@/hooks/useVisualAuth";

export default function RestrictedAction({ module, feature, children, className = "" }) {
  const { canUseFeature, can, isFeatureRestricted } = useVisualAuth();
  const [requesting, setRequesting] = useState(false);

  const actionMap = {
    view: "canView",
    create: "canCreate",
    edit: "canEdit",
    delete: "canDelete"
  };
  const action = actionMap[String(feature || "").toLowerCase()] || "canView";

  if (!can(module, action)) {
    return null;
  }

  if (canUseFeature(module, feature)) {
    return children;
  }

  if (!isFeatureRestricted(module, feature)) {
    return null;
  }

  const handleRequest = async () => {
    try {
      setRequesting(true);
      await createAccessRequest({ module, feature });
      toast.success("Access request sent to Super Admin");
    } catch (error) {
      toast.error(error.message || "Failed to send access request");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className={`relative inline-flex items-stretch ${className}`}>
      <div className="pointer-events-none opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-background/70 backdrop-blur-[1px]">
        <Button size="sm" variant="outline" onClick={handleRequest} disabled={requesting}>
          {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
          Request Access
        </Button>
      </div>
    </div>
  );
}
