import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPrescription, getMedicines, requestMedicineStock, sharePrescription } from "@/lib/pharmacy";
import { getLabCatalog } from "@/lib/labTests";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getUsers } from "@/lib/users";
import { getHospitalSettings } from "@/lib/settings";
import { updateAppointment } from "@/lib/appointments";
import { getPrescriptionTemplates, removePrescriptionTemplate, savePrescriptionTemplate } from "@/lib/prescription-templates";
import { downloadPrescriptionPdf, printPrescription } from "@/lib/prescription-export";
import { toast } from "sonner";
import { Plus, Trash2, Download, Printer, Eye, Send, Sparkles, LayoutTemplate } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/AuthContext";

const emptyItem = {
  medicine: "",
  medicineName: "",
  dosage: "",
  frequency: "TID",
  duration: "5 days",
  route: "oral",
  quantity: 1,
  instructions: "",
  stockRequestRaised: false,
};

const emptyVitals = {
  bloodPressure: "",
  pulseRate: "",
  spo2: "",
  temperature: "",
  heightCm: "",
  weightKg: "",
  bmi: "",
  others: "",
};

const emptyFemaleHealth = {
  gravida: "",
  parityA: "",
  parityB: "",
  lmp: "",
  edd: "",
  pog: "",
  lcb: "",
  mod: "",
};

const emptyTest = { testName: "", testType: "", instructions: "" };

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

const doctorName = (doctor) => {
  if (!doctor) return "Unknown";
  if (doctor.name) return doctor.name;
  const root = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
  if (root) return root;
  const user = `${doctor.user?.firstName || ""} ${doctor.user?.lastName || ""}`.trim();
  return user || "Unknown";
};

export default function PrescriptionDialog({
  open,
  onOpenChange,
  initialPatientId = "",
  initialDoctorId = "",
  initialAdmissionId = "",
  initialAppointmentId = "",
  initialEncounterType = "opd",
}) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savedPrescription, setSavedPrescription] = useState(null);
  const [formWidth, setFormWidth] = useState(56);

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [encounterType, setEncounterType] = useState("opd");
  const [admissionId, setAdmissionId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [complaints, setComplaints] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [vitals, setVitals] = useState({ ...emptyVitals });
  const [femaleHealth, setFemaleHealth] = useState({ ...emptyFemaleHealth });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [testAdvice, setTestAdvice] = useState([{ ...emptyTest }]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");

  const [shareRoleFilter, setShareRoleFilter] = useState("all");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [shareNote, setShareNote] = useState("");

  const { data: patientsData } = useQuery({ queryKey: ["patients"], queryFn: () => getPatients(), enabled: open });
  const { data: doctorsData } = useQuery({ queryKey: ["doctors"], queryFn: () => getDoctors(), enabled: open });
  const { data: medsData } = useQuery({ queryKey: ["medicines-all"], queryFn: () => getMedicines({ limit: 1000 }), enabled: open });
  const { data: labCatalogData } = useQuery({ queryKey: ["lab-catalog-all"], queryFn: () => getLabCatalog({ active: "true", limit: 1000 }), enabled: open });
  const { data: usersData } = useQuery({ queryKey: ["users"], queryFn: () => getUsers(), enabled: open });
  const { data: hospitalRes } = useQuery({ queryKey: ["hospital-settings"], queryFn: () => getHospitalSettings(), enabled: open });

  const patients = Array.isArray(patientsData) ? patientsData : patientsData?.data?.patients || [];
  const doctors = Array.isArray(doctorsData) ? doctorsData : doctorsData?.data?.doctors || [];
  const medicines = Array.isArray(medsData) ? medsData : medsData?.data || [];
  const labCatalog = labCatalogData?.data?.tests || [];
  const users = usersData?.data?.users || usersData?.users || [];
  const hospitalSettings = hospitalRes?.data || {};
  const selectedPatient = patients.find((p) => p?._id === patientId);
  const selectedDoctor = doctors.find((d) => d?._id === doctorId);
  const isFemale = selectedPatient?.gender?.toLowerCase() === "female";

  const shareableUsers = useMemo(() => {
    const roles = ["doctor", "nurse", "head_nurse", "billing_staff", "hospital_admin", "super_admin"];
    const target = users.filter((u) => roles.includes(u.role));
    if (shareRoleFilter === "all") return target;
    return target.filter((u) => u.role === shareRoleFilter);
  }, [users, shareRoleFilter]);

  const medicineNameSuggestions = useMemo(
    () => unique(medicines.map((m) => m?.name).filter(Boolean)),
    [medicines]
  );
  const testNameSuggestions = useMemo(
    () => unique(labCatalog.map((t) => t?.testName || t?.name).filter(Boolean)),
    [labCatalog]
  );

  const getPatientLabel = (patient) => {
    const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();
    return patient?.patientId ? `${fullName} (${patient.patientId})` : fullName || "Unknown";
  };

  const filteredDoctors = doctors.filter((doctor) =>
    doctorName(doctor).toLowerCase().includes(doctorSearch.toLowerCase())
  );
  const loggedInDoctor = useMemo(
    () =>
      doctors.find(
        (d) =>
          d?.user?._id === user?._id ||
          String(d?.user?.email || "").toLowerCase() === String(user?.email || "").toLowerCase()
      ) || null,
    [doctors, user?._id, user?.email]
  );
  const isDoctorUser = user?.role === "doctor";

  const complaintSuggestions = useMemo(() => unique(templates.flatMap((t) => t?.complaints || [])), [templates]);
  const medicalHistorySuggestions = useMemo(() => unique(templates.flatMap((t) => t?.medicalHistory || [])), [templates]);
  const diagnosisSuggestions = useMemo(() => unique(templates.map((t) => t?.diagnosis).filter(Boolean)), [templates]);

  useEffect(() => {
    if (!open) return;
    setTemplates(getPrescriptionTemplates());
    setPatientId(initialPatientId || "");
    setDoctorId(initialDoctorId || "");
    setAdmissionId(initialAdmissionId || "");
    setAppointmentId(initialAppointmentId || "");
    setEncounterType(initialEncounterType || "opd");
    setDoctorSearch("");
    setSavedPrescription(null);
    setSelectedRecipients([]);
    setShareNote("");
    setVitals({ ...emptyVitals });
    setFemaleHealth({ ...emptyFemaleHealth });
  }, [open, initialAdmissionId, initialAppointmentId, initialDoctorId, initialEncounterType, initialPatientId]);

  useEffect(() => {
    if (!open) return;
    if (!isDoctorUser) return;
    if (initialDoctorId) return;
    if (!doctorId && loggedInDoctor?._id) {
      setDoctorId(loggedInDoctor._id);
    }
  }, [open, isDoctorUser, initialDoctorId, doctorId, loggedInDoctor?._id]);

  useEffect(() => {
    const heightM = Number(vitals.heightCm) / 100;
    const weight = Number(vitals.weightKg);
    if (heightM > 0 && weight > 0) {
      const nextBmi = (weight / (heightM * heightM)).toFixed(2);
      if (nextBmi !== vitals.bmi) setVitals((prev) => ({ ...prev, bmi: nextBmi }));
    } else if (vitals.bmi) {
      setVitals((prev) => ({ ...prev, bmi: "" }));
    }
  }, [vitals.heightCm, vitals.weightKg, vitals.bmi]);

  useEffect(() => {
    if (!femaleHealth.lmp) return;
    const lmpDate = new Date(femaleHealth.lmp);
    if (Number.isNaN(lmpDate.getTime())) return;
    const eddDate = new Date(lmpDate);
    eddDate.setMonth(eddDate.getMonth() + 9);
    eddDate.setDate(eddDate.getDate() + 7);
    const edd = eddDate.toISOString().slice(0, 10);
    const today = new Date();
    const days = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    const pog = `${weeks}w ${remDays}d`;
    setFemaleHealth((prev) => ({ ...prev, edd, pog }));
  }, [femaleHealth.lmp]);

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, idx) => idx !== index));
  const addTestRow = () => setTestAdvice((prev) => [...prev, { ...emptyTest }]);
  const removeTestRow = (index) => setTestAdvice((prev) => prev.filter((_, idx) => idx !== index));

  const updateItem = (index, field, value) =>
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "medicineName") {
          const normalized = String(value || "").trim().toLowerCase();
          const exact = medicines.find(
            (m) => String(m?.name || "").trim().toLowerCase() === String(value || "").trim().toLowerCase()
          );
          if (exact) {
            updated.medicine = exact._id;
            updated.medicineName = exact.name;
          } else {
            const prefixMatches = medicines.filter((m) =>
              String(m?.name || "").trim().toLowerCase().startsWith(normalized)
            );
            if (normalized && prefixMatches.length === 1) {
              updated.medicine = prefixMatches[0]._id;
              updated.medicineName = prefixMatches[0].name;
            } else {
              updated.medicine = "";
            }
          }
        }
        return updated;
      })
    );

  const updateTest = (index, field, value) =>
    setTestAdvice((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  const updateVitals = (field, value) =>
    setVitals((prev) => ({ ...prev, [field]: value }));
  const updateFemaleHealth = (field, value) =>
    setFemaleHealth((prev) => ({ ...prev, [field]: value }));

  const applyTemplate = () => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;
    setComplaints((template.complaints || []).join(", "));
    setMedicalHistory((template.medicalHistory || []).join(", "));
    setDiagnosis(template.diagnosis || "");
    setNotes(template.notes || "");
    setVitals({ ...emptyVitals, ...(template.vitals || {}) });
    setFemaleHealth({ ...emptyFemaleHealth, ...(template.femaleHealth || {}) });
    setItems(Array.isArray(template.items) && template.items.length ? template.items.map((it) => ({ ...emptyItem, ...it })) : [{ ...emptyItem }]);
    setTestAdvice(Array.isArray(template.testAdvice) && template.testAdvice.length ? template.testAdvice.map((t) => ({ ...emptyTest, ...t })) : [{ ...emptyTest }]);
  };

  const handleSaveTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return toast.error("Template name is required");
    const id = savePrescriptionTemplate({
      name,
      complaints: parseList(complaints),
      medicalHistory: parseList(medicalHistory),
      diagnosis: diagnosis || "",
      notes: notes || "",
      vitals,
      femaleHealth: isFemale ? femaleHealth : {},
      items,
      testAdvice,
    });
    setTemplates(getPrescriptionTemplates());
    setSelectedTemplateId(id);
    setNewTemplateName("");
    toast.success("Template saved");
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplateId) return;
    removePrescriptionTemplate(selectedTemplateId);
    setTemplates(getPrescriptionTemplates());
    setSelectedTemplateId("");
    toast.success("Template removed");
  };

  const draftPreviewRx = useMemo(
    () => ({
      _id: savedPrescription?._id || "draft",
      createdAt: savedPrescription?.createdAt || new Date().toISOString(),
      patient: selectedPatient,
      doctor: selectedDoctor,
      encounterType,
      complaints: parseList(complaints),
      medicalHistory: parseList(medicalHistory),
      diagnosis,
      followUpDate,
      vitals,
      femaleHealth,
      items,
      testAdvice,
      notes,
    }),
    [savedPrescription, selectedPatient, selectedDoctor, encounterType, complaints, medicalHistory, diagnosis, followUpDate, vitals, femaleHealth, items, testAdvice, notes]
  );

  const handleSavePrescription = async () => {
    const cleanedItems = items
      .filter((it) => it.medicine || it.medicineName?.trim())
      .map((it) => ({
        ...it,
        medicine: it.medicine || undefined,
        medicineName: (it.medicineName || "").trim(),
        dosage: String(it.dosage || "").trim() || "As directed",
        frequency: String(it.frequency || "").trim() || "TID",
        duration: String(it.duration || "").trim() || "5 days",
        route: String(it.route || "").trim() || "oral",
        quantity: Number(it.quantity || 1),
        stockRequestRaised: !it.medicine,
      }));
    const cleanedTests = testAdvice
      .filter((t) => t.testName?.trim())
      .map((t) => ({ testName: t.testName.trim(), testType: t.testType || "", instructions: t.instructions || "" }));

    if (!patientId || !doctorId || cleanedItems.length === 0) {
      return toast.error("Patient, doctor and at least one medicine are required");
    }

    setLoading(true);
    try {
      const response = await createPrescription({
        patient: patientId,
        doctor: doctorId,
        admission: admissionId || undefined,
        encounterType,
        complaints: parseList(complaints),
        medicalHistory: parseList(medicalHistory),
        diagnosis: diagnosis || undefined,
        followUpDate: followUpDate || undefined,
        vitals,
        femaleHealth: isFemale ? femaleHealth : undefined,
        notes,
        testAdvice: cleanedTests,
        items: cleanedItems,
      });

      const created = response?.data || null;
      setSavedPrescription(created);

      const customNames = unique(cleanedItems.filter((it) => !it.medicine).map((it) => it.medicineName));
      await Promise.all(
        customNames.map((medicineName) =>
          requestMedicineStock({
            medicineName,
            patientId,
            encounterType,
            reason: `Requested from prescription flow (${encounterType.toUpperCase()})`,
          }).catch(() => null)
        )
      );

      if (appointmentId) {
        await updateAppointment(appointmentId, { status: "completed" }).catch(() => null);
        qc.invalidateQueries({ queryKey: ["appointments"] });
      }

      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-stats"] });

      toast.success(appointmentId ? "Prescription saved. Appointment marked completed." : "Prescription saved.");
    } catch (error) {
      toast.error(error?.message || "Failed to save prescription");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!savedPrescription?._id) return toast.error("Save prescription first");
    if (selectedRecipients.length === 0) return toast.error("Select at least one recipient");
    setSharing(true);
    try {
      await sharePrescription(savedPrescription._id, {
        recipientIds: selectedRecipients,
        note: shareNote,
      });
      toast.success("Prescription sent (acknowledgement required)");
      setSelectedRecipients([]);
      setShareNote("");
    } catch (error) {
      toast.error(error?.message || "Failed to send prescription");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:max-w-[96vw] xl:max-w-[92vw] h-[92vh] sm:h-[90vh] overflow-hidden p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>Create Clinical Prescription</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!isMobile && (
            <>
              <Label className="text-xs">Editor/Preview Size</Label>
              <Input
                type="range"
                min="40"
                max="70"
                step="1"
                value={formWidth}
                onChange={(e) => setFormWidth(Number(e.target.value))}
                className="w-56"
              />
            </>
          )}
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <Button onClick={handleSavePrescription} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/prescriptions/${savedPrescription?._id || "draft"}/preview`,
                  { state: { draftPrescription: draftPreviewRx } }
                )
              }
            >
              <Eye className="mr-2 h-4 w-4" />Preview
            </Button>
            <Button variant="outline" onClick={() => printPrescription(draftPreviewRx, { hospitalSettings })}>
              <Printer className="mr-2 h-4 w-4" />Print
            </Button>
            <Button variant="outline" onClick={() => downloadPrescriptionPdf(draftPreviewRx, { hospitalSettings })}>
              <Download className="mr-2 h-4 w-4" />Download
            </Button>
            <Button variant="outline" onClick={handleSend} disabled={!savedPrescription?._id || sharing}>
              <Send className="mr-2 h-4 w-4" />{sharing ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4 overflow-hidden lg:flex-row">
          <div
            style={{ width: isMobile ? "100%" : `${formWidth}%` }}
            className="h-full overflow-y-auto pr-0 lg:pr-2 space-y-4"
          >
            <div className="border rounded-lg p-3 space-y-3 bg-accent/5 border-accent/30">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <Label className="text-base font-semibold">Medical Advice Template</Label>
              </div>
              <p className="text-xs text-muted-foreground">Save and apply structured clinical templates quickly.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select saved template" /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={applyTemplate} disabled={!selectedTemplateId}>
                  <LayoutTemplate className="mr-2 h-4 w-4" />Apply Template
                </Button>
                <Button variant="destructive" onClick={handleDeleteTemplate} disabled={!selectedTemplateId}>Delete Template</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder="New template name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
                <Button onClick={handleSaveTemplate}>Save Current As Template</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Patient *</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p._id} value={p._id}>{getPatientLabel(p)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Doctor *</Label>
                <Input className="mb-2" placeholder="Type doctor name to search" value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} />
                <Select value={doctorId} onValueChange={setDoctorId} disabled={isDoctorUser && !!loggedInDoctor?._id}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{filteredDoctors.map((d) => <SelectItem key={d._id} value={d._id}>Dr. {doctorName(d)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Encounter Type</Label>
                <Select value={encounterType} onValueChange={setEncounterType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opd">OPD</SelectItem>
                    <SelectItem value="ipd">IPD</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Follow-up Date</Label>
                <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Presenting Complaints</Label>
                <Input list="complaint-suggestions" value={complaints} onChange={(e) => setComplaints(e.target.value)} />
                <datalist id="complaint-suggestions">{complaintSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
              </div>
              <div>
                <Label>Medical History</Label>
                <Input list="medical-history-suggestions" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
                <datalist id="medical-history-suggestions">{medicalHistorySuggestions.map((value) => <option key={value} value={value} />)}</datalist>
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Input list="diagnosis-suggestions" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                <datalist id="diagnosis-suggestions">{diagnosisSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
              </div>
              <div>
                <Label>Advice / Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-base font-semibold">Vitals</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">BP (mmHg)</Label>
                  <Input
                    placeholder="120/80"
                    value={vitals.bloodPressure}
                    onChange={(e) => updateVitals("bloodPressure", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Pulse Rate</Label>
                  <Input
                    placeholder="72"
                    value={vitals.pulseRate}
                    onChange={(e) => updateVitals("pulseRate", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">SpO2 (%)</Label>
                  <Input
                    placeholder="98"
                    value={vitals.spo2}
                    onChange={(e) => updateVitals("spo2", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Temperature</Label>
                  <Input
                    placeholder="98.6 F"
                    value={vitals.temperature}
                    onChange={(e) => updateVitals("temperature", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Height (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="170"
                    value={vitals.heightCm}
                    onChange={(e) => updateVitals("heightCm", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="65"
                    value={vitals.weightKg}
                    onChange={(e) => updateVitals("weightKg", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">BMI (auto)</Label>
                  <Input value={vitals.bmi} readOnly />
                </div>
              </div>
              <div>
                <Label className="text-xs">Other Vitals/Findings</Label>
                <Textarea
                  rows={2}
                  value={vitals.others}
                  onChange={(e) => updateVitals("others", e.target.value)}
                  placeholder="Any additional observations"
                />
              </div>
            </div>

            {isFemale && (
              <div className="border rounded-lg p-3 space-y-3">
                <Label className="text-base font-semibold">Female Clinical Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Gravida</Label>
                    <Input value={femaleHealth.gravida} onChange={(e) => updateFemaleHealth("gravida", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Parity A</Label>
                    <Input value={femaleHealth.parityA} onChange={(e) => updateFemaleHealth("parityA", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Parity B</Label>
                    <Input value={femaleHealth.parityB} onChange={(e) => updateFemaleHealth("parityB", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">LMP</Label>
                    <Input type="date" value={femaleHealth.lmp} onChange={(e) => updateFemaleHealth("lmp", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">EDD (auto)</Label>
                    <Input type="date" value={femaleHealth.edd} readOnly />
                  </div>
                  <div>
                    <Label className="text-xs">POG (auto)</Label>
                    <Input value={femaleHealth.pog} readOnly />
                  </div>
                  <div>
                    <Label className="text-xs">LCB</Label>
                    <Input value={femaleHealth.lcb} onChange={(e) => updateFemaleHealth("lcb", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Mode of Delivery</Label>
                    <Input value={femaleHealth.mod} onChange={(e) => updateFemaleHealth("mod", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Medicine Advice</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item #{index + 1}</span>
                    {items.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Medicine (custom allowed)</Label>
                      <Input list="medicine-name-suggestions" value={item.medicineName} onChange={(e) => updateItem(index, "medicineName", e.target.value)} />
                    </div>
                    <Input placeholder="Dosage" value={item.dosage} onChange={(e) => updateItem(index, "dosage", e.target.value)} />
                    <Select value={item.frequency} onValueChange={(value) => updateItem(index, "frequency", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OD">OD</SelectItem><SelectItem value="BD">BD</SelectItem><SelectItem value="TID">TID</SelectItem><SelectItem value="QID">QID</SelectItem><SelectItem value="SOS">SOS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={item.route} onValueChange={(value) => updateItem(index, "route", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="oral">Oral</SelectItem><SelectItem value="iv">IV</SelectItem><SelectItem value="im">IM</SelectItem><SelectItem value="topical">Topical</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Duration" value={item.duration} onChange={(e) => updateItem(index, "duration", e.target.value)} />
                    <Input type="number" min="1" placeholder="Quantity" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                  </div>
                  <Input placeholder="Instructions" value={item.instructions} onChange={(e) => updateItem(index, "instructions", e.target.value)} />
                </div>
              ))}
              <datalist id="medicine-name-suggestions">{medicineNameSuggestions.map((name) => <option key={name} value={name} />)}</datalist>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Suggested Tests (Lab)</Label>
                <Button variant="outline" size="sm" onClick={addTestRow}><Plus className="h-4 w-4 mr-1" />Add Test</Button>
              </div>
              {testAdvice.map((row, index) => (
                <div key={index} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input list="lab-test-name-suggestions" placeholder="Test Name" value={row.testName} onChange={(e) => updateTest(index, "testName", e.target.value)} />
                  <Input placeholder="Test Type" value={row.testType} onChange={(e) => updateTest(index, "testType", e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="Instructions" value={row.instructions} onChange={(e) => updateTest(index, "instructions", e.target.value)} />
                    {testAdvice.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeTestRow(index)}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                </div>
              ))}
              <datalist id="lab-test-name-suggestions">{testNameSuggestions.map((name) => <option key={name} value={name} />)}</datalist>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-base font-semibold">Send Recipients</Label>
              <Select value={shareRoleFilter} onValueChange={setShareRoleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="head_nurse">Head Nurse</SelectItem>
                  <SelectItem value="billing_staff">Lab/Pharmacy</SelectItem>
                  <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="max-h-28 overflow-y-auto space-y-1 border rounded p-2">
                {shareableUsers.map((u) => (
                  <label key={u._id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedRecipients.includes(u._id)}
                      onCheckedChange={() =>
                        setSelectedRecipients((prev) =>
                          prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id]
                        )
                      }
                    />
                    <span>{`${u.firstName || ""} ${u.lastName || ""}`.trim()} ({u.role})</span>
                  </label>
                ))}
              </div>
              <Textarea placeholder="Send note (optional)" value={shareNote} onChange={(e) => setShareNote(e.target.value)} rows={2} />
            </div>
          </div>

          <div
            style={{ width: isMobile ? "100%" : `${100 - formWidth}%` }}
            className="h-full overflow-y-auto border rounded-lg p-3 sm:p-4 bg-background"
          >
            <h3 className="font-semibold text-lg mb-3">Live Preview</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Patient:</strong> {selectedPatient ? getPatientLabel(selectedPatient) : "-"}</p>
              <p><strong>Doctor:</strong> {doctorName(selectedDoctor)}</p>
              <p><strong>Encounter:</strong> {encounterType.toUpperCase()}</p>
              <p><strong>Status:</strong> {savedPrescription?._id ? "Saved" : "Draft"}</p>
              <hr />
              <p><strong>Complaints:</strong> {parseList(complaints).join(", ") || "-"}</p>
              <p><strong>Medical History:</strong> {parseList(medicalHistory).join(", ") || "-"}</p>
              <p><strong>Diagnosis:</strong> {diagnosis || "-"}</p>
              <p><strong>Follow-up:</strong> {followUpDate || "-"}</p>
              <p><strong>Vitals:</strong> {[
                vitals.bloodPressure ? `BP ${vitals.bloodPressure}` : "",
                vitals.pulseRate ? `PR ${vitals.pulseRate}` : "",
                vitals.spo2 ? `SpO2 ${vitals.spo2}` : "",
                vitals.temperature ? `Temp ${vitals.temperature}` : "",
                vitals.bmi ? `BMI ${vitals.bmi}` : ""
              ].filter(Boolean).join(" | ") || "-"}</p>
            </div>
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Medicines</h4>
              <div className="space-y-1 text-xs">
                {items.filter((it) => it.medicineName).length === 0 ? (
                  <p className="text-muted-foreground">No medicine added.</p>
                ) : (
                  items.filter((it) => it.medicineName).map((it, idx) => (
                    <div key={idx} className="border rounded p-2">
                      <p className="font-medium">{it.medicineName}</p>
                      <p>{it.dosage || "-"} | {it.frequency || "-"} | {it.route || "-"} | {it.duration || "-"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Tests</h4>
              <div className="space-y-1 text-xs">
                {testAdvice.filter((t) => t.testName).length === 0 ? (
                  <p className="text-muted-foreground">No tests added.</p>
                ) : (
                  testAdvice.filter((t) => t.testName).map((t, idx) => (
                    <div key={idx} className="border rounded p-2">
                      <p className="font-medium">{t.testName}</p>
                      <p>{t.testType || "-"} {t.instructions ? `| ${t.instructions}` : ""}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Advice</h4>
              <p className="text-xs whitespace-pre-wrap">{notes || "-"}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
