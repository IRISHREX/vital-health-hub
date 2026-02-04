import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { transferPatient, dischargePatient, getAvailableBeds, calculateBedCharges } from '@/lib/admissions';
import { getDoctors } from '@/lib/doctors';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function AdmissionActionModal({ admission, isOpen, onClose, onActionComplete }) {
  const [mode, setMode] = useState('view'); // view, transfer, discharge
  const [loading, setLoading] = useState(false);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [formData, setFormData] = useState({
    newBedId: '',
    transferReason: '',
    dischargingDoctorId: '',
    dischargeReason: '',
    notes: '',
  });

  if (!admission || admission.status !== 'ADMITTED') return null;

  const currentBed = admission.bed;

  // Load data when mode changes
  React.useEffect(() => {
    if (mode === 'transfer') {
      loadTransferData();
    } else if (mode === 'discharge') {
      loadDischargeData();
    }
  }, [mode]);

  const loadTransferData = async () => {
    try {
      const beds = await getAvailableBeds();
      setAvailableBeds(beds.filter((b) => b._id !== currentBed._id));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load available beds',
        variant: 'destructive',
      });
    }
  };

  const loadDischargeData = async () => {
    try {
      const doctorsData = await getDoctors({ limit: 100 });
      setDoctors(doctorsData.data?.doctors || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load doctors',
        variant: 'destructive',
      });
    }
  };

  const handleTransfer = async () => {
    if (!formData.newBedId) {
      toast({
        title: 'Error',
        description: 'Please select a destination bed',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await transferPatient(admission._id, {
        newBedId: formData.newBedId,
        transferReason: formData.transferReason,
      });

      toast({
        title: 'Success',
        description: `Patient transferred successfully. Previous bed charges: ₹${response.data.oldBedCharges}`,
      });

      if (onActionComplete) {
        onActionComplete(response.data.admission);
      }

      handleClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to transfer patient',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    if (!formData.dischargingDoctorId) {
      toast({
        title: 'Error',
        description: 'Please select a discharging doctor',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await dischargePatient(admission._id, {
        dischargingDoctorId: formData.dischargingDoctorId,
        dischargeReason: formData.dischargeReason,
        notes: formData.notes,
      });

      const totalCharges = response.data.totalBedCharges;

      toast({
        title: 'Success',
        description: `Patient discharged successfully. Total bed charges: ₹${totalCharges}`,
      });

      if (onActionComplete) {
        onActionComplete(response.data.admission);
      }

      handleClose();
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

  const handleClose = () => {
    setMode('view');
    setFormData({
      newBedId: '',
      transferReason: '',
      dischargingDoctorId: '',
      dischargeReason: '',
      notes: '',
    });
    onClose();
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      handleClose();
    }
  };

  const getPreviewBedInfo = () => {
    const newBed = availableBeds.find((b) => b._id === formData.newBedId);
    if (!newBed) return null;

    const chargeInfo = calculateBedCharges(
      admission.bedAllocations?.[admission.bedAllocations.length - 1]?.allocatedFrom || admission.admissionDate,
      new Date(),
      currentBed.pricePerDay
    );

    return {
      currentBed,
      newBed,
      currentBedCharges: chargeInfo,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' && `Admission Details - ${admission.admissionId}`}
            {mode === 'transfer' && 'Transfer Patient'}
            {mode === 'discharge' && 'Discharge Patient'}
          </DialogTitle>
          {mode !== 'view' && (
            <DialogDescription>
              {mode === 'transfer' && 'Select a new bed and provide transfer reason'}
              {mode === 'discharge' && 'Complete the discharge process and generate final invoice'}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* VIEW MODE */}
        {mode === 'view' && (
          <div className="space-y-4">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-sm font-semibold">
                    {admission.patient?.firstName} {admission.patient?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Patient ID</p>
                  <p className="text-sm font-semibold">{admission.patient?.patientId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Admission Date</p>
                  <p className="text-sm font-semibold">{new Date(admission.admissionDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Admission Type</p>
                  <Badge variant="outline" className="capitalize">
                    {admission.admissionType}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Current Bed Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Bed Allocation</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bed Number</p>
                  <p className="text-sm font-semibold">{currentBed?.bedNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bed Type</p>
                  <p className="text-sm font-semibold capitalize">{currentBed?.bedType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ward</p>
                  <p className="text-sm font-semibold">{currentBed?.ward}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Price Per Day</p>
                  <p className="text-sm font-semibold">₹{currentBed?.pricePerDay}</p>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnosis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Primary Diagnosis</p>
                  <p className="text-sm">{admission.diagnosis?.primary || 'Not specified'}</p>
                </div>
                {admission.symptoms?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Symptoms</p>
                    <div className="flex gap-2 flex-wrap">
                      {admission.symptoms.map((symptom, idx) => (
                        <Badge key={idx} variant="secondary">
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bed Allocation History */}
            {admission.bedAllocations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bed Allocation History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {admission.bedAllocations.map((alloc, idx) => (
                      <div key={idx} className="text-sm p-2 border rounded">
                        <p className="font-semibold">{alloc.bed?.bedNumber || 'N/A'}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(alloc.allocatedFrom).toLocaleString()} -{' '}
                          {new Date(alloc.allocatedTo).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* TRANSFER MODE */}
        {mode === 'transfer' && (
          <div className="space-y-4">
            {/* Current Bed Info */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-600">Current Bed</p>
                <p className="text-lg font-semibold">{currentBed?.bedNumber}</p>
                <p className="text-xs text-gray-600">
                  {currentBed?.bedType.toUpperCase()} - {currentBed?.ward}
                </p>
              </CardContent>
            </Card>

            {/* Destination Bed Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Destination Bed *</label>
              <Select value={formData.newBedId} onValueChange={(value) => setFormData((prev) => ({ ...prev, newBedId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an available bed" />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map((bed) => (
                    <SelectItem key={bed._id} value={bed._id}>
                      {bed.bedNumber} ({bed.bedType.toUpperCase()}, {bed.ward}) - ₹{bed.pricePerDay}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview Bed Info */}
            {getPreviewBedInfo()?.newBed && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-600">Destination Bed</p>
                  <p className="text-lg font-semibold">{getPreviewBedInfo().newBed.bedNumber}</p>
                  <p className="text-xs text-gray-600">
                    {getPreviewBedInfo().newBed.bedType.toUpperCase()} - {getPreviewBedInfo().newBed.ward}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Transfer Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Transfer Reason</label>
              <Textarea
                placeholder="Enter reason for transfer"
                value={formData.transferReason}
                onChange={(e) => setFormData((prev) => ({ ...prev, transferReason: e.target.value }))}
                className="min-h-20"
              />
            </div>

            {/* Charges Preview */}
            {getPreviewBedInfo() && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Charges for Current Bed</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Days Allocated:</span>
                      <span className="font-semibold">{getPreviewBedInfo().currentBedCharges.days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate Per Day:</span>
                      <span className="font-semibold">₹{currentBed?.pricePerDay}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span>Total Charge:</span>
                      <span className="font-bold">₹{getPreviewBedInfo().currentBedCharges.amount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* DISCHARGE MODE */}
        {mode === 'discharge' && (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold">Important</p>
                <p>This action will finalize the admission and generate the invoice.</p>
              </div>
            </div>

            {/* Current Status */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Patient</p>
                  <p className="font-semibold">
                    {admission.patient?.firstName} {admission.patient?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Bed</p>
                  <p className="font-semibold">{currentBed?.bedNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Admitted Since</p>
                  <p className="font-semibold">{new Date(admission.admissionDate).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Discharging Doctor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discharging Doctor *</label>
              <Select
                value={formData.dischargingDoctorId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, dischargingDoctorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor._id} value={doctor._id}>
                      Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discharge Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discharge Reason</label>
              <input
                type="text"
                placeholder="e.g., Fully recovered, Referred to another facility"
                value={formData.dischargeReason}
                onChange={(e) => setFormData((prev) => ({ ...prev, dischargeReason: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Discharge Notes</label>
              <Textarea
                placeholder="Additional notes or follow-up instructions"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="min-h-24"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <DialogFooter>
          {mode === 'view' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setMode('transfer')}>Transfer Patient</Button>
              <Button variant="destructive" onClick={() => setMode('discharge')}>
                Discharge Patient
              </Button>
            </>
          )}

          {mode === 'transfer' && (
            <>
              <Button variant="outline" onClick={() => setMode('view')} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleTransfer} disabled={loading || !formData.newBedId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Transfer
              </Button>
            </>
          )}

          {mode === 'discharge' && (
            <>
              <Button variant="outline" onClick={() => setMode('view')} disabled={loading}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleDischarge} disabled={loading || !formData.dischargingDoctorId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Discharge
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
