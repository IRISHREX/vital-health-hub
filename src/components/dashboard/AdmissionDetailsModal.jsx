import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  X,
  User,
  Stethoscope,
  Bed,
  Calendar,
  DollarSign,
  History,
  FileText,
  ArrowRight,
  Clock,
  LogOut,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { dischargePatient } from '@/lib/admissions';
import { toast } from '@/hooks/use-toast';

export default function AdmissionDetailsModal({ admission, isOpen, onClose, onDischarge }) {
  if (!admission) return null;

  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeFormData, setDischargeFormData] = useState({
    dischargeReason: '',
    dischargingDoctorId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const calculateDays = (startDate, endDate = new Date()) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const los = calculateDays(admission.admissionDate, admission.dischargeDate || new Date());
  const bedAllocations = admission.bedAllocations || [];
  const transferHistory = admission.transferHistory || [];

  const dischargeReasons = [
    'Recovery - Fit for discharge',
    'Against medical advice',
    'Referred to other facility',
    'Patient request',
    'Deceased',
    'Self discharge',
  ];

  const handleDischargeSubmit = async () => {
    if (!dischargeFormData.dischargeReason || !dischargeFormData.dischargingDoctorId) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in discharge reason and select a doctor',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await dischargePatient(admission._id, {
        dischargeReason: dischargeFormData.dischargeReason,
        dischargingDoctorId: dischargeFormData.dischargingDoctorId,
        notes: dischargeFormData.notes,
      });

      toast({
        title: 'Success',
        description: `Patient ${admission.patient?.firstName} has been successfully discharged`,
        variant: 'success',
      });

      // Reset form
      setDischargeFormData({
        dischargeReason: '',
        dischargingDoctorId: '',
        notes: '',
      });
      setShowDischargeModal(false);

      // Call parent callback if provided
      if (onDischarge) {
        onDischarge(response);
      }

      // Close the modal
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to discharge patient',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Admission Details - {admission.admissionId}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-full">
          <div className="space-y-6 pr-4">
            {/* Patient Overview */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                <CardTitle className="text-base">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Full Name</p>
                    <p className="text-lg font-semibold">
                      {admission.patient?.firstName} {admission.patient?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {admission.patient?.patientId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Registration Type</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {admission.patient?.registrationType || 'IPD'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-2">
                      Age: {admission.patient?.age || 'N/A'} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contact</p>
                    <p className="text-sm">{admission.patient?.phoneNumber || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {admission.patient?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Blood Group</p>
                    <p className="text-sm font-semibold">
                      {admission.patient?.bloodGroup || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medical History</p>
                    <p className="text-sm">
                      {admission.patient?.medicalHistory || 'None documented'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admission Overview */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
                <CardTitle className="text-base">Admission Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-600">Admission Date</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {new Date(admission.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-medium text-gray-600">Length of Stay</p>
                    </div>
                    <p className="text-sm font-semibold">{los} days</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`w-fit ${
                          admission.status === 'ADMITTED'
                            ? 'bg-blue-100 text-blue-900'
                            : admission.status === 'DISCHARGED'
                            ? 'bg-green-100 text-green-900'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {admission.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                  </div>
                  {admission.dischargeDate && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-gray-600">Discharge Date</p>
                      </div>
                      <p className="text-sm font-semibold">
                        {new Date(admission.dischargeDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medical Details */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Medical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Diagnosis</p>
                      <p className="text-sm p-3 bg-gray-50 rounded-lg">
                        {admission.diagnosis?.primary ||
                          (typeof admission.diagnosis === 'string' ? admission.diagnosis : 'Not specified')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Treatment Plan</p>
                      <p className="text-sm p-3 bg-gray-50 rounded-lg">
                        {admission.treatmentPlan || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Assigned Doctor</p>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold">
                        {admission.doctor?.firstName} {admission.doctor?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {admission.doctor?.specialization || 'General'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Bed History and Transfers */}
            <Tabs defaultValue="beds" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="beds">
                  <Bed className="h-4 w-4 mr-2" />
                  Bed Allocations
                </TabsTrigger>
                <TabsTrigger value="transfers">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="beds" className="space-y-4">
                {bedAllocations.length > 0 ? (
                  bedAllocations.map((allocation, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Bed Number</p>
                              <p className="font-semibold">{allocation.bed?.bedNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Type</p>
                              <Badge variant="outline" className="capitalize">
                                {allocation.bed?.bedType}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Ward</p>
                              <p className="font-semibold">
                                {allocation.bed?.ward} (Floor {allocation.bed?.floor})
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
                            <div>
                              <p className="font-medium text-gray-600">From</p>
                              <p>
                                {new Date(allocation.allocatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">To</p>
                              <p>
                                {allocation.releasedAt
                                  ? new Date(allocation.releasedAt).toLocaleDateString()
                                  : 'Current'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Duration</p>
                              <p>
                                {calculateDays(
                                  allocation.allocatedAt,
                                  allocation.releasedAt
                                )}{' '}
                                days
                              </p>
                            </div>
                          </div>
                          {allocation.chargeAmount && (
                            <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              <span>
                                Charge: <strong>${allocation.chargeAmount}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      No bed allocations found
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                {transferHistory.length > 0 ? (
                  <div className="space-y-3">
                    {transferHistory.map((transfer, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-600">From</p>
                              <p className="font-semibold">
                                Bed {transfer.fromBed?.bedNumber} - {transfer.fromBed?.ward}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-600">To</p>
                              <p className="font-semibold">
                                Bed {transfer.toBed?.bedNumber} - {transfer.toBed?.ward}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
                            <div>
                              <p className="font-medium text-gray-600">Transfer Date</p>
                              <p>
                                {new Date(transfer.transferredAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Reason</p>
                              <p>{transfer.reason || 'Not specified'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      No transfers recorded
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Summary Footer */}
            <Card className="border-l-4 border-l-green-600">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Beds Used</p>
                    <p className="text-xl font-bold text-green-600">
                      {bedAllocations.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Transfers</p>
                    <p className="text-xl font-bold text-blue-600">
                      {transferHistory.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Total Charge</p>
                    <p className="text-xl font-bold text-orange-600">
                      ${admission.totalCharge || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Invoice</p>
                    <p className="text-lg font-bold text-purple-600">
                      {admission.invoices?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {admission.status === 'ADMITTED' && (
              <Button
                variant="destructive"
                onClick={() => setShowDischargeModal(true)}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Discharge Patient
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Discharge Modal */}
      <Dialog open={showDischargeModal} onOpenChange={setShowDischargeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Discharge Patient
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Patient Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Name</p>
                    <p className="text-lg font-semibold">
                      {admission.patient?.firstName} {admission.patient?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Admission Date</p>
                    <p className="text-lg font-semibold">
                      {new Date(admission.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Length of Stay</p>
                    <p className="text-lg font-semibold text-blue-600">{los} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discharge Form */}
            <div className="space-y-4">
              {/* Discharge Reason */}
              <div className="space-y-2">
                <Label htmlFor="discharge-reason" className="font-semibold">
                  Discharge Reason *
                </Label>
                <Select
                  value={dischargeFormData.dischargeReason}
                  onValueChange={(value) =>
                    setDischargeFormData({
                      ...dischargeFormData,
                      dischargeReason: value,
                    })
                  }
                >
                  <SelectTrigger id="discharge-reason">
                    <SelectValue placeholder="Select discharge reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {dischargeReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discharging Doctor */}
              <div className="space-y-2">
                <Label htmlFor="doctor" className="font-semibold">
                  Discharging Doctor *
                </Label>
                <Select
                  value={dischargeFormData.dischargingDoctorId}
                  onValueChange={(value) =>
                    setDischargeFormData({
                      ...dischargeFormData,
                      dischargingDoctorId: value,
                    })
                  }
                >
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Select discharging doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {admission.admittingDoctor && (
                      <SelectItem value={admission.admittingDoctor._id || admission.admittingDoctor}>
                        Dr. {admission.admittingDoctor?.user?.firstName || admission.admittingDoctor?.firstName}{' '}
                        {admission.admittingDoctor?.user?.lastName || admission.admittingDoctor?.lastName}
                      </SelectItem>
                    )}
                    {admission.attendingDoctors?.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id || doctor}>
                        Dr. {doctor?.user?.firstName || doctor?.firstName}{' '}
                        {doctor?.user?.lastName || doctor?.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discharge Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold">
                  Discharge Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any additional discharge notes (instructions, follow-up care, medications, etc.)"
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
                <CardTitle className="text-sm">Discharge Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <Badge className="bg-blue-100 text-blue-900">{admission.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason:</span>
                  <span className="font-medium">{dischargeFormData.dischargeReason || 'Not selected'}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Discharge Date:</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDischargeModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDischargeSubmit}
              disabled={loading || !dischargeFormData.dischargeReason || !dischargeFormData.dischargingDoctorId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
