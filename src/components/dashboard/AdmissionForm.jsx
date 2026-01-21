import { useState, useEffect } from 'react';
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
import { Loader2, User, Bed, Stethoscope, FileText, Building2, X } from 'lucide-react';

export default function AdmissionForm({ onAdmissionCreated, onClose }) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [registrationType, setRegistrationType] = useState('emergency'); // emergency, opd, ipd

  const [formData, setFormData] = useState({
    patientId: '',
    bedId: '',
    admittingDoctorId: '',
    facility: '',
    diagnosis: '',
    treatmentPlan: '',
    notes: '',
  });

  // Load patients and doctors on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingDropdowns(true);
        const [patientsData, doctorsData, bedsData] = await Promise.all([
          getPatients(),
          getDoctors(),
          getAvailableBeds(),
        ]);

        setPatients(patientsData.data?.patients || patientsData.data || []);
        setDoctors(doctorsData.data?.doctors || doctorsData.data || []);
        setAvailableBeds(bedsData?.data?.beds || bedsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form data: ' + error.message,
          variant: 'destructive',
        });
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadData();
  }, []);

  // Filter patients by registration type
  const filteredPatients = patients.filter(
    (patient) => patient.registrationType === registrationType
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation - only patient and diagnosis are required
    if (!formData.patientId || !formData.diagnosis) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields: Patient and Diagnosis',
        variant: 'destructive',
      });
      return;
    }

    // For IPD admission, bed is required
    if (registrationType === 'ipd' && !formData.bedId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a bed for IPD admission',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const admissionPayload = {
        patientId: formData.patientId,
        // Only send bedId for IPD (elective) admissions
        ...(registrationType === 'ipd' && formData.bedId && { bedId: formData.bedId }),
        // Doctor is optional
        ...(formData.admittingDoctorId && { admittingDoctorId: formData.admittingDoctorId }),
        // Map registrationType to admissionType: emergency/opd -> 'emergency', ipd -> 'elective'
        admissionType: registrationType === 'ipd' ? 'elective' : 'emergency',
        diagnosis: formData.diagnosis,
        treatmentPlan: formData.treatmentPlan,
        facility: formData.facility,
        notes: formData.notes,
      };

      const response = await createAdmission(admissionPayload);

      toast({
        title: 'Success',
        description: `${registrationType.toUpperCase()} Patient admitted successfully - ID: ${response.data?.admission?.admissionId || 'Created'}`,
      });

      if (onAdmissionCreated) {
        onAdmissionCreated(response.data?.admission);
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

  if (loadingDropdowns) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Admission Form...</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const selectedPatient = patients.find((p) => p._id === formData.patientId);
  const selectedBed = availableBeds.find((b) => b._id === formData.bedId);
  const selectedDoctor = doctors.find((d) => d._id === formData.admittingDoctorId);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Quick Admission</h2>
          <p className="text-sm text-gray-500 mt-1">Complete admission in one step</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={loading}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Registration Type Selection */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Patient Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'emergency', label: 'Emergency', icon: '🚨' },
                { value: 'opd', label: 'OPD (Out-Patient)', icon: '🏥' },
                { value: 'ipd', label: 'IPD (In-Patient)', icon: '🛏️' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setRegistrationType(type.value);
                    setFormData({ ...formData, patientId: '', bedId: '' });
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    registrationType === type.value
                      ? 'border-blue-600 bg-white shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <p className="font-semibold text-sm">{type.label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Patient Selection */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Select Patient * 
                <Badge className="ml-2" variant="outline">
                  {registrationType === 'emergency' ? 'EMERGENCY' : registrationType === 'opd' ? 'OPD OUTPATIENT' : 'IPD PATIENTS'}
                </Badge>
              </label>
              <Select value={formData.patientId} onValueChange={(value) => handleInputChange('patientId', value)}>
                <SelectTrigger className="border-2">
                  <SelectValue placeholder={`Choose a ${registrationType} patient...`} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName} ({patient.patientId})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500">No {registrationType} patients found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium">{selectedPatient.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Blood Group</p>
                      <p className="font-medium">{selectedPatient.bloodGroup || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Age</p>
                      <p className="font-medium">{selectedPatient.age || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Medical History</p>
                      <p className="font-medium text-xs truncate">
                        {typeof selectedPatient.medicalHistory === 'string'
                          ? selectedPatient.medicalHistory
                          : selectedPatient.medicalHistory?.condition || 'None'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Doctor & Facility Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Stethoscope className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Doctor Assignment</CardTitle>
              <Badge variant="secondary" className="ml-auto">Optional</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={formData.admittingDoctorId} onValueChange={(value) => handleInputChange('admittingDoctorId', value)}>
                <SelectTrigger className="border-2">
                  <SelectValue placeholder="Select doctor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor._id} value={doctor._id}>
                      Dr. {doctor.user?.firstName} {doctor.user?.lastName} ({doctor.specialization})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDoctor && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-3">
                    <p className="text-sm text-gray-600">Specialization</p>
                    <p className="font-semibold">{selectedDoctor.specialization}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Facility */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Facility/Ward</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., ICU, General Ward, Emergency Department"
                value={formData.facility}
                onChange={(e) => handleInputChange('facility', e.target.value)}
                className="border-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Bed Selection (Only for IPD) */}
        {registrationType === 'ipd' && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Bed className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-base">Bed Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={formData.bedId} onValueChange={(value) => handleInputChange('bedId', value)}>
                <SelectTrigger className="border-2">
                  <SelectValue placeholder="Select available bed *" />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.length > 0 ? (
                    availableBeds.map((bed) => (
                      <SelectItem key={bed._id} value={bed._id}>
                        Bed {bed.bedNumber} | {bed.bedType} | Floor {bed.floor} | Room {bed.roomNumber} | ₹{bed.pricePerDay}/day
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500">No beds available</div>
                  )}
                </SelectContent>
              </Select>

              {selectedBed && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Bed Type</p>
                        <p className="font-medium">{selectedBed.bedType}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Location</p>
                        <p className="font-medium">F{selectedBed.floor} R{selectedBed.roomNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Price/Day</p>
                        <p className="font-medium text-orange-600">₹{selectedBed.pricePerDay}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ward</p>
                        <p className="font-medium">{selectedBed.ward}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {/* Medical Information */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <FileText className="h-5 w-5 text-red-600" />
            <CardTitle className="text-base">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Primary Diagnosis *</label>
              <Input
                placeholder="e.g., COVID-19, Pneumonia, Fracture, Fever"
                value={formData.diagnosis}
                onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Treatment Plan</label>
              <Textarea
                placeholder="Detailed treatment plan and procedures"
                value={formData.treatmentPlan}
                onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
                className="min-h-20 border-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Additional Notes</label>
              <Textarea
                placeholder="Any additional notes or special requirements"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="min-h-16 border-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admission Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Type</p>
                <Badge className="mt-1">{registrationType.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-gray-600">Patient</p>
                <p className="font-semibold truncate">{selectedPatient?.firstName || 'Not selected'}</p>
              </div>
              <div>
                <p className="text-gray-600">Doctor</p>
                <p className="font-semibold truncate">Dr. {selectedDoctor?.user?.firstName || 'Not selected'}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <Badge variant="outline" className="mt-1">Ready</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} size="lg" className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Admitting...' : `Admit ${registrationType.toUpperCase()} Patient`}
          </Button>
        </div>
      </form>
    </div>
  );
}
