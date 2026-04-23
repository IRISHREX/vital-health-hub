import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { findApplicableRule, createApprovalRequest } from "@/lib/approvals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

/**
 * ApprovalGate
 * Wrap any action button. If the (module, action) has an enabled approval rule,
 * clicking the button opens a dynamic form dialog and submits an approval request
 * instead of running onProceed. If no rule exists (or rule is soft + admin), runs onProceed.
 *
 * Props:
 *  - module: string
 *  - action: 'create'|'edit'|'delete'|'custom'
 *  - onProceed: () => void   (the original action)
 *  - resourceType?: string
 *  - resourceId?: string
 *  - children: ReactNode  (the trigger - rendered as-is, click is intercepted)
 */
export default function ApprovalGate({
  module,
  action,
  onProceed,
  resourceType = "",
  resourceId = "",
  children,
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { data: ruleRes } = useQuery({
    queryKey: ["approval-rule", module, action],
    queryFn: () => findApplicableRule(module, action),
    staleTime: 30_000,
  });
  const rule = ruleRes?.data || null;

  const handleClick = (e) => {
    if (!rule) {
      onProceed?.(e);
      return;
    }
    setFormData({});
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      // Validate required
      for (const f of rule.formFields || []) {
        if (f.required && (formData[f.key] === undefined || formData[f.key] === "" || formData[f.key] === null)) {
          toast.error(`${f.label} is required`);
          setSubmitting(false);
          return;
        }
      }
      await createApprovalRequest({
        ruleId: rule._id,
        formData,
        resourceType,
        resourceId,
      });
      toast.success("Approval request submitted");
      setOpen(false);
      setFormData({});
    } catch (err) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = (
    <span onClick={handleClick} style={{ display: "contents" }}>
      {children}
    </span>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Approval Required: {rule?.name}
            </DialogTitle>
            <DialogDescription>
              {rule?.description || `This action requires approval before proceeding.`}
              <span className="mt-1 block text-xs text-muted-foreground">
                Approver: {rule?.approverType === "email" ? rule?.approverEmail : `Role: ${rule?.approverRole}`}
                {rule?.slaHours ? ` · SLA: ${rule.slaHours}h` : ""}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {(rule?.formFields || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No additional details required. Click Submit to send the request.</p>
            )}
            {(rule?.formFields || []).map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                {field.type === "textarea" && (
                  <Textarea
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                    rows={3}
                  />
                )}
                {field.type === "text" && (
                  <Input
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                )}
                {field.type === "number" && (
                  <Input
                    type="number"
                    placeholder={field.placeholder}
                    value={formData[field.key] ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                )}
                {field.type === "date" && (
                  <Input
                    type="date"
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                )}
                {field.type === "select" && (
                  <Select
                    value={formData[field.key] || ""}
                    onValueChange={(v) => setFormData((p) => ({ ...p, [field.key]: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!formData[field.key]}
                      onCheckedChange={(v) => setFormData((p) => ({ ...p, [field.key]: !!v }))}
                    />
                    <span className="text-sm">{field.placeholder || "Yes"}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
