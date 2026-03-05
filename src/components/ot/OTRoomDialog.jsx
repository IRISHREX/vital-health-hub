import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOTRoom } from "@/lib/ot";
import { toast } from "sonner";

export default function OTRoomDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    roomNumber: "", name: "", type: "general", floor: 0, pricePerHour: 0, notes: ""
  });

  const mutation = useMutation({
    mutationFn: (data) => createOTRoom(data),
    onSuccess: () => {
      toast.success("OT Room created");
      queryClient.invalidateQueries({ queryKey: ["ot-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["ot-stats"] });
      onOpenChange(false);
      setForm({ roomNumber: "", name: "", type: "general", floor: 0, pricePerHour: 0, notes: "" });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed")
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add OT Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, floor: Number(form.floor), pricePerHour: Number(form.pricePerHour) }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Room Number *</Label>
              <Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Major OT 1" required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['general', 'major', 'minor', 'cardiac', 'neuro', 'ortho', 'ophthalmic', 'ent'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Price per Hour (₹)</Label>
              <Input type="number" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Add Room"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
