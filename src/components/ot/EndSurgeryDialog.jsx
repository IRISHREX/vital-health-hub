import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endSurgeryAction } from "@/lib/ot";
import { toast } from "sonner";

export default function EndSurgeryDialog({ open, onOpenChange, surgery }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    operativeNotes: "",
    complications: "",
    bloodLoss: ""
  });

  const mutation = useMutation({
    mutationFn: (data) => endSurgeryAction(surgery._id, data),
    onSuccess: () => {
      toast.success("Surgery ended, patient moving to recovery");
      queryClient.invalidateQueries({ queryKey: ["surgeries"] });
      queryClient.invalidateQueries({ queryKey: ["ot-stats"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed")
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">End Surgery - Operative Notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Operative Notes</Label>
            <Textarea value={form.operativeNotes} onChange={(e) => setForm({ ...form, operativeNotes: e.target.value })} rows={4} placeholder="Describe procedure performed..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Complications</Label>
              <Input value={form.complications} onChange={(e) => setForm({ ...form, complications: e.target.value })} placeholder="None" />
            </div>
            <div className="space-y-2">
              <Label>Blood Loss</Label>
              <Input value={form.bloodLoss} onChange={(e) => setForm({ ...form, bloodLoss: e.target.value })} placeholder="e.g. 100ml" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "End Surgery"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
