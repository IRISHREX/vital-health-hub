import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleSurgery } from "@/lib/ot";
import { toast } from "sonner";

export default function ScheduleSurgeryDialog({ open, onOpenChange, surgery, otRooms }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    otRoom: surgery?.otRoom?._id || "",
    scheduledDate: surgery?.scheduledDate ? new Date(surgery.scheduledDate).toISOString().split("T")[0] : "",
    scheduledStartTime: surgery?.scheduledStartTime || "",
    scheduledEndTime: surgery?.scheduledEndTime || ""
  });

  const mutation = useMutation({
    mutationFn: (data) => scheduleSurgery(surgery._id, data),
    onSuccess: () => {
      toast.success("Surgery scheduled");
      queryClient.invalidateQueries({ queryKey: ["surgeries"] });
      queryClient.invalidateQueries({ queryKey: ["ot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ot-schedule"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Scheduling failed")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.otRoom || !form.scheduledDate || !form.scheduledStartTime) {
      toast.error("OT room, date, and start time are required");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Schedule Surgery</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground">{surgery?.procedureName}</p>
            <p className="text-xs text-muted-foreground">
              {surgery?.patient?.firstName} {surgery?.patient?.lastName} • {surgery?.surgeryId}
            </p>
          </div>

          <div className="space-y-2">
            <Label>OT Room *</Label>
            <Select value={form.otRoom} onValueChange={(v) => setForm({ ...form, otRoom: v })}>
              <SelectTrigger><SelectValue placeholder="Select OT room" /></SelectTrigger>
              <SelectContent>
                {(otRooms || []).filter(r => r.status === 'available' || r._id === form.otRoom).map(r => (
                  <SelectItem key={r._id} value={r._id}>{r.roomNumber} - {r.name} ({r.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="time" value={form.scheduledStartTime} onChange={(e) => setForm({ ...form, scheduledStartTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={form.scheduledEndTime} onChange={(e) => setForm({ ...form, scheduledEndTime: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Scheduling..." : "Schedule"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
