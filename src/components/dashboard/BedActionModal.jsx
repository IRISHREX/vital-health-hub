import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateBed, deleteBed } from "@/lib/beds";
import { dischargePatient } from "@/lib/admissions";
import { AlertTriangle, Trash2, Loader2, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statusOptions = [
  { value: "available", label: "Available", color: "bg-emerald-100 text-emerald-900" },
  { value: "occupied", label: "Occupied", color: "bg-red-100 text-red-900" },
  { value: "cleaning", label: "Cleaning", color: "bg-yellow-100 text-yellow-900" },
  { value: "reserved", label: "Reserved", color: "bg-blue-100 text-blue-900" },
  { value: "maintenance", label: "Maintenance", color: "bg-gray-100 text-gray-900" },
  { value: "out_of_service", label: "Out of Service", color: "bg-slate-100 text-slate-900" },
];

export default function BedActionModal({ bed, isOpen, onClose }) {
  const [mode, setMode] = useState("view"); // view, status, assign, discharge, delete
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [dischargeFormData, setDischargeFormData] = useState({
    dischargeReason: '',
    dischargingDoctorId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  if (!bed) return null;

  const currentStatus = statusOptions.find(s => s.value === bed.status);

  const handleStatusChange = async () => {
    if (!selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updateBed(bed._id, { status: selectedStatus });
      toast({
        title: "Success",
        description: `Bed status updated to ${selectedStatus}`,
      });
      setMode("view");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bed status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBed = async () => {
    setLoading(true);
    try {
      await deleteBed(bed._id);
      toast({
        title: "Success",
        description: "Bed deleted successfully",
      });
      setShowDeleteAlert(false);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDischargePatient = async () => {
    if (!dischargeFormData.dischargeReason || !dischargeFormData.dischargingDoctorId) {
      toast({
        title: "Required Fields",
        description: "Please fill in discharge reason and select a doctor",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const currentAdmission = bed.currentAdmission;
      await dischargePatient(currentAdmission, {
        dischargeReason: dischargeFormData.dischargeReason,
        dischargingDoctorId: dischargeFormData.dischargingDoctorId,
        notes: dischargeFormData.notes,
      });

      toast({
        title: "Success",
        description: `Patient has been discharged. Bed will be marked for cleaning.`,
      });

      // Reset form
      setDischargeFormData({
        dischargeReason: '',
        dischargingDoctorId: '',
        notes: '',
      });
      setMode("view");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to discharge patient",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {mode === "view" && (
            <>
              <DialogHeader>
                <DialogTitle>Bed {bed.bedNumber} - Details</DialogTitle>
                <DialogDescription>
                  Manage bed status and patient assignment
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Bed Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bed Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Bed Number
                        </p>
                        <p className="text-sm font-medium">{bed.bedNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Bed Type
                        </p>
                        <Badge variant="secondary">{bed.bedType}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Ward
                        </p>
                        <p className="text-sm font-medium">{bed.ward}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Floor
                        </p>
                        <p className="text-sm font-medium">{bed.floor}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Room Number
                        </p>
                        <p className="text-sm font-medium">
                          {bed.roomNumber || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Price Per Day
                        </p>
                        <p className="text-sm font-medium">
                          ${bed.pricePerDay?.toFixed(2) || "N/A"}
                        </p>
                      </div>
                    </div>

                    {bed.amenities && bed.amenities.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Amenities
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {bed.amenities.map((amenity, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Status
                      </p>
                      <Badge className={`text-sm ${currentStatus?.color}`}>
                        {currentStatus?.label}
                      </Badge>
                    </div>

                    {bed.currentPatient && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Current Patient
                        </p>
                        <div className="rounded-lg bg-blue-50 p-3">
                          <p className="font-medium">
                            {bed.currentPatient.firstName} {bed.currentPatient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {bed.currentPatient.patientId}
                          </p>
                        </div>
                      </div>
                    )}

                    {bed.lastCleaned && (
                      <div className="text-xs text-muted-foreground">
                        <p>Last Cleaned: {new Date(bed.lastCleaned).toLocaleDateString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("status")}
                  className="flex-1"
                >
                  Change Status
                </Button>
                {bed.status === "available" && (
                  <Button
                    onClick={() => setMode("assign")}
                    className="flex-1"
                  >
                    Assign Patient
                  </Button>
                )}
                {bed.status === "occupied" && bed.currentPatient && (
                  <Button
                    variant="destructive"
                    onClick={() => setMode("discharge")}
                    className="flex-1 gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Discharge Patient
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {mode === "status" && (
            <>
              <DialogHeader>
                <DialogTitle>Change Bed Status</DialogTitle>
                <DialogDescription>
                  Select a new status for bed {bed.bedNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    New Status
                  </label>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMode("view")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleStatusChange}
                  disabled={loading || !selectedStatus}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Status
                </Button>
              </DialogFooter>
            </>
          )}

          {mode === "assign" && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Patient to Bed</DialogTitle>
                <DialogDescription>
                  This feature will be available in the next update
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 text-center text-muted-foreground">
                Patient assignment will be implemented soon
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMode("view")}
                >
                  Back
                </Button>
              </DialogFooter>
            </>
          )}

          {mode === "discharge" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-red-600" />
                  Discharge Patient
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Current Patient Info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Patient Name</p>
                        <p className="text-lg font-semibold">
                          {bed.currentPatient?.firstName} {bed.currentPatient?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Patient ID</p>
                        <p className="text-sm">{bed.currentPatient?.patientId}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Discharge Form */}
                <div className="space-y-4">
                  {/* Discharge Reason */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Discharge Reason *</label>
                    <Select
                      value={dischargeFormData.dischargeReason}
                      onValueChange={(value) =>
                        setDischargeFormData({
                          ...dischargeFormData,
                          dischargeReason: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select discharge reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Recovery - Fit for discharge">Recovery - Fit for discharge</SelectItem>
                        <SelectItem value="Against medical advice">Against medical advice</SelectItem>
                        <SelectItem value="Referred to other facility">Referred to other facility</SelectItem>
                        <SelectItem value="Patient request">Patient request</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                        <SelectItem value="Self discharge">Self discharge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Discharging Doctor */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Discharging Doctor *</label>
                    <Select
                      value={dischargeFormData.dischargingDoctorId}
                      onValueChange={(value) =>
                        setDischargeFormData({
                          ...dischargeFormData,
                          dischargingDoctorId: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select discharging doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current Attending Doctor</SelectItem>
                        <SelectItem value="primary">Primary Care Doctor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Discharge Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Discharge Notes</label>
                    <Textarea
                      placeholder="Enter discharge instructions, follow-up care, medications, etc."
                      value={dischargeFormData.notes}
                      onChange={(e) =>
                        setDischargeFormData({
                          ...dischargeFormData,
                          notes: e.target.value,
                        })
                      }
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Summary */}
                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Action Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bed Number:</span>
                      <span className="font-medium">{bed.bedNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discharge Date:</span>
                      <span className="font-medium">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Next Status:</span>
                      <Badge className="bg-yellow-100 text-yellow-900">Cleaning</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("view")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDischargePatient}
                  disabled={loading || !dischargeFormData.dischargeReason || !dischargeFormData.dischargingDoctorId}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Discharge
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Bed
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bed {bed.bedNumber}? This action
              cannot be undone. Make sure no patient is currently assigned to
              this bed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBed}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
