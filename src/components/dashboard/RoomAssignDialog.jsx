import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { assignRoomToNurse } from "@/lib/nurse";
import { assignNurseByFloor } from "@/lib/beds";
import { getNurses } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RoomAssignDialog({ isOpen, onClose, rooms = [] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nurseId, setNurseId] = useState("");
  const [assignmentType, setAssignmentType] = useState("room");
  const [ward, setWard] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const { data: nursesData } = useQuery({
    queryKey: ["nurses"],
    queryFn: () => getNurses(),
    enabled: isOpen,
  });
  const nurses = nursesData?.data?.users || [];

  const wards = useMemo(() => {
    const set = new Set(rooms.map((r) => r.ward).filter(Boolean));
    return Array.from(set).sort();
  }, [rooms]);

  const floors = useMemo(() => {
    const shouldFilterByWard = ward && ward !== "__all__";
    const set = new Set(
      rooms
        .filter((r) => (shouldFilterByWard ? r.ward === ward : true))
        .map((r) => r.floor)
        .filter((v) => v !== undefined && v !== null)
    );
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms, ward]);

  const roomNumbers = useMemo(() => {
    const shouldFilterByWard = ward && ward !== "__all__";
    return rooms
      .filter((r) => (shouldFilterByWard ? r.ward === ward : true))
      .filter((r) => (floor !== "" ? Number(r.floor) === Number(floor) : true))
      .map((r) => r.roomNumber)
      .filter(Boolean)
      .sort();
  }, [rooms, ward, floor]);

  const assignMutation = useMutation({
    mutationFn: () => {
      if (assignmentType === "floor") {
        return assignNurseByFloor({
          nurseId,
          ward: ward && ward !== "__all__" ? ward : undefined,
          floor: Number(floor),
        });
      }
      return assignRoomToNurse({
        nurseId,
        ward,
        floor: Number(floor),
        roomNumber,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: assignmentType === "floor" ? "Floor assigned to nurse." : "Room assigned to nurse."
      });
      queryClient.invalidateQueries({ queryKey: ["nurses"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign room.",
      });
    },
  });

  const handleClose = () => {
    setNurseId("");
    setAssignmentType("room");
    setWard("");
    setFloor("");
    setRoomNumber("");
    onClose();
  };

  const canSubmit = nurseId && floor !== "" && (assignmentType === "floor" || (ward && roomNumber));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Assign Room to Nurse</DialogTitle>
          <DialogDescription>
            Choose a ward, floor, and room number, then select a nurse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Assignment Type</label>
            <Select
              value={assignmentType}
              onValueChange={(value) => {
                setAssignmentType(value);
                if (value === "floor") {
                  setRoomNumber("");
                  setWard((prev) => prev || "__all__");
                } else if (ward === "__all__") {
                  setWard("");
                }
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select assignment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="floor">Whole Floor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Nurse</label>
            <Select value={nurseId} onValueChange={setNurseId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select nurse" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((n) => (
                  <SelectItem key={n._id} value={n._id}>
                    {n.firstName} {n.lastName} ({n.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Ward {assignmentType === "floor" ? "(optional)" : ""}
            </label>
            <Select
              value={ward}
              onValueChange={(v) => {
                setWard(v);
                setFloor("");
                setRoomNumber("");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={assignmentType === "floor" ? "All wards" : "Select ward"} />
              </SelectTrigger>
              <SelectContent>
                {assignmentType === "floor" && (
                  <SelectItem value="__all__">All wards</SelectItem>
                )}
                {wards.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Floor</label>
            <Select
              value={floor}
              onValueChange={(v) => {
                setFloor(v);
                setRoomNumber("");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    Floor {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "room" && (
            <div>
              <label className="text-sm font-medium">Room Number</label>
              <Select value={roomNumber} onValueChange={setRoomNumber}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {roomNumbers.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => assignMutation.mutate()} disabled={!canSubmit || assignMutation.isPending}>
            {assignmentType === "floor" ? "Assign Floor" : "Assign Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
