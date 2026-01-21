import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { createAdmission, getAvailableBeds } from '@/lib/admissions';
import { getPatients } from '@/lib/patients';
import { getDoctors } from '@/lib/doctors';
import { Loader2, User, Bed, Stethoscope, FileText, AlertCircle } from 'lucide-react';

const admissionTypes = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'elective', label: 'Elective' },
  { value: 'transfer', label: 'Transfer' },
];

export default function AdmissionForm({ onAdmissionCreated, onClose }) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    patientId: '',
    bedId: '',
    admittingDoctorId: '',
    attendingDoctors: [],
    admissionType: 'emergency',
    diagnosis: {
      primary: '',
      secondary: [],
    },
    symptoms: [],
    treatmentPlan: '',
    expectedDischargeDate: '',
    notes: '',
  });

  // Load patients and doctors on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingDropdowns(true);
        const [patientsData, doctorsData, bedsData] = await Promise.all([
          getPatients({ limit: 100 }),
          getDoctors({ limit: 100 }),
          getAvailableBeds(),
        ]);

        setPatients(patientsData.data?.patients || []);
        setDoctors(doctorsData.data?.doctors || []);
        setAvailableBeds(bedsData);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.patientId || !formData.bedId || !formData.admittingDoctorId || !formData.admissionType) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await createAdmission({
        ...formData,
        expectedDischargeDate: formData.expectedDischargeDate || undefined,
      });

      toast({
        title: 'Success',
        description: `Patient admitted successfully - Admission ID: ${response.data.admission.admissionId}`,
      });

      if (onAdmissionCreated) {
        onAdmissionCreated(response.data.admission);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admission',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDiagnosisChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      diagnosis: {
        ...prev.diagnosis,
        [field]: value,
      },
    }));
  };

  if (loadingDropdowns) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const selectedPatient = patients.find((p) => p._id === formData.patientId);
  const selectedBed = availableBeds.find((b) => b._id === formData.bedId);
  const selectedDoctor = doctors.find((d) => d._id === formData.admittingDoctorId);

  return (
    <div className="w-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>New Patient Admission</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Step {step} of 3</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Patient & Bed Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Select an available bed for this patient. One bed can only be assigned to one patient at a time.
                </p>
              </div>

              {/* Patient Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Select Patient *
                </label>
                <Select value={formData.patientId} onValueChange={(value) => handleInputChange('patientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        <div className="flex items-center gap-2">
                          <span>{patient.firstName} {patient.lastName}</span>
                          <span className="text-gray-500">({patient.patientId})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPatient && (
                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="pt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium">{selectedPatient.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Blood Group</p>
                        <p className="font-medium">{selectedPatient.bloodGroup}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Bed Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  Select Bed *
                </label>
                <Select value={formData.bedId} onValueChange={(value) => handleInputChange('bedId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose available bed" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((bed) => (
                      <SelectItem key={bed._id} value={bed._id}>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{bed.bedNumber}</span>
                          <span className="text-gray-500">|</span>
                          <Badge variant="secondary" className="text-xs">
                            {bed.bedType.toUpperCase()}
                          </Badge>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-600">{bed.ward}</span>
                          <span className="text-gray-500">|</span>
                          <span className="font-semibold text-green-600">₹{bed.pricePerDay}/day</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBed && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Room</p>
                        <p className="font-medium">{selectedBed.roomNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Floor</p>
                        <p className="font-medium">{selectedBed.floor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amenities</p>
                        <div className="flex gap-1 mt-1">
                          {selectedBed.amenities?.slice(0, 2).map((amenity) => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Doctor & Admission Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-800">
                  Select the doctor responsible for this admission and specify the admission type.
                </p>
              </div>

              {/* Admission Type */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Admission Type *</label>
                <Select value={formData.admissionType} onValueChange={(value) => handleInputChange('admissionType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">🚨 Emergency</span>
                        <span className="text-gray-500">Urgent admission</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="elective">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">📅 Elective</span>
                        <span className="text-gray-500">Planned admission</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="transfer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">↻ Transfer</span>
                        <span className="text-gray-500">From another facility</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admitting Doctor */}
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Admitting Doctor *
                </label>
                <Select value={formData.admittingDoctorId} onValueChange={(value) => handleInputChange('admittingDoctorId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Dr. {doctor.user?.firstName} {doctor.user?.lastName}</span>
                          <span className="text-gray-500">({doctor.specialization})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDoctor && (
                  <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-600">Specialization</p>
                      <p className="font-medium">{selectedDoctor.specialization}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Diagnosis & Treatment */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800">
                  Enter medical information for proper treatment planning.
                </p>
              </div>

              {/* Primary Diagnosis */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Primary Diagnosis</label>
                <Input
                  placeholder="e.g., COVID-19, Pneumonia, Fracture"
                  value={formData.diagnosis.primary}
                  onChange={(e) => handleDiagnosisChange('primary', e.target.value)}
                />
              </div>

              {/* Symptoms */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Symptoms</label>
                <Textarea
                  placeholder="Enter symptoms (comma-separated)"
                  value={formData.symptoms.join(', ')}
                  onChange={(e) =>
                    handleInputChange('symptoms', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                  }
                  className="min-h-20"
                />
              </div>

              {/* Treatment Plan */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Treatment Plan</label>
                <Textarea
                  placeholder="Detailed treatment plan"
                  value={formData.treatmentPlan}
                  onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
                  className="min-h-24"
                />
              </div>

              {/* Expected Discharge Date */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Expected Discharge Date</label>
                <Input
                  type="date"
                  value={formData.expectedDischargeDate}
                  onChange={(e) => handleInputChange('expectedDischargeDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Additional Notes</label>
                <Textarea
                  placeholder="Any additional notes for this admission"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="min-h-20"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                Back
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={() => setStep(step + 1)} disabled={
                (step === 1 && (!formData.patientId || !formData.bedId)) ||
                (step === 2 && (!formData.admittingDoctorId || !formData.admissionType))
              }>
                Next
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Admit Patient
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </div>
  );
}
