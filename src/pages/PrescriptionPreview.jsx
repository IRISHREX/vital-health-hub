import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getPrescription, sharePrescription } from "@/lib/pharmacy";
import { getUsers } from "@/lib/users";
import { getHospitalSettings } from "@/lib/settings";
import { downloadPrescriptionPdf, printPrescription } from "@/lib/prescription-export";
import {
  Download,
  Printer,
  Send,
  Bold,
  Italic,
  Underline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SlidersHorizontal,
} from "lucide-react";

const defaultHospital = {
  hospitalName: "Hospital",
  registrationNumber: "",
  address: "",
  phone: "",
  email: "",
  website: "",
};

const formatDoctor = (doctor) => {
  if (!doctor) return "N/A";
  if (doctor.name) return `Dr. ${doctor.name}`;
  const root = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
  if (root) return `Dr. ${root}`;
  const user = `${doctor.user?.firstName || ""} ${doctor.user?.lastName || ""}`.trim();
  return user ? `Dr. ${user}` : "N/A";
};

export default function PrescriptionPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const previewRef = useRef(null);
  const draftPrescription = location.state?.draftPrescription || null;
  const isDraftMode = id === "draft";

  const [showVitals, setShowVitals] = useState(true);
  const [showFemaleSection, setShowFemaleSection] = useState(true);
  const [showTests, setShowTests] = useState(true);
  const [showAdvice, setShowAdvice] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showDoctorDetails, setShowDoctorDetails] = useState(true);
  const [fontSizePx, setFontSizePx] = useState("16");
  const [textAlign, setTextAlign] = useState("left");
  const [lineHeight, setLineHeight] = useState("1.6");
  const [wordSpacing, setWordSpacing] = useState("normal");
  const [letterSpacing, setLetterSpacing] = useState("normal");
  const [textColor, setTextColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#ffffff");

  const [roleFilter, setRoleFilter] = useState("all");
  const [shareNote, setShareNote] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: rxRes, isLoading } = useQuery({
    queryKey: ["prescription", id],
    queryFn: () => getPrescription(id),
    enabled: !!id && !isDraftMode,
  });

  const { data: usersRes } = useQuery({
    queryKey: ["share-users"],
    queryFn: () => getUsers(),
  });
  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  const prescription = isDraftMode ? draftPrescription : (rxRes?.data || null);
  const users = usersRes?.data?.users || [];
  const hospitalSettings = useMemo(() => {
    const raw = hospitalRes?.data || {};
    return {
      hospitalName: raw.hospitalName || defaultHospital.hospitalName,
      registrationNumber: raw.registrationNumber || defaultHospital.registrationNumber,
      address: raw.address || defaultHospital.address,
      phone: raw.phone || defaultHospital.phone,
      email: raw.email || defaultHospital.email,
      website: raw.website || defaultHospital.website,
    };
  }, [hospitalRes?.data]);
  const shareableRoles = ["doctor", "nurse", "head_nurse", "billing_staff", "hospital_admin", "super_admin"];

  const filteredUsers = useMemo(() => {
    const byRole = users.filter((u) => shareableRoles.includes(u.role));
    if (roleFilter === "all") return byRole;
    return byRole.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const previewTypographyStyle = useMemo(() => ({
    fontSize: `${fontSizePx}px`,
    textAlign,
    lineHeight,
    wordSpacing: wordSpacing === "normal" ? "normal" : `${wordSpacing}px`,
    letterSpacing: letterSpacing === "normal" ? "normal" : `${letterSpacing}px`,
    color: textColor,
    backgroundColor: highlightColor,
  }), [
    fontSizePx,
    textAlign,
    lineHeight,
    wordSpacing,
    letterSpacing,
    textColor,
    highlightColor,
  ]);

  const applyEditorCommand = (command, value = null) => {
    const previewNode = previewRef.current;
    if (!previewNode) return;
    previewNode.focus();
    try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(command, false, value);
    } catch {
      // ignore command failures for unsupported browser commands
    }
  };

  const applyAlignment = (align) => {
    setTextAlign(align);
    if (align === "left") applyEditorCommand("justifyLeft");
    if (align === "center") applyEditorCommand("justifyCenter");
    if (align === "right") applyEditorCommand("justifyRight");
    if (align === "justify") applyEditorCommand("justifyFull");
  };

  const toggleRecipient = (userId) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (!prescription?._id) return;
    if (selectedRecipients.length === 0) {
      toast({ title: "Select recipients", description: "Choose at least one user", variant: "destructive" });
      return;
    }
    setSharing(true);
    try {
      await sharePrescription(prescription._id, {
        recipientIds: selectedRecipients,
        note: shareNote,
      });
      toast({ title: "Shared", description: "Prescription sent with acknowledgement required" });
      setSelectedRecipients([]);
      setShareNote("");
    } catch (error) {
      toast({ title: "Share failed", description: error?.message || "Failed to share prescription", variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    if (!prescription) return;
    printPrescription(prescription, {
      hospitalSettings,
      showVitals,
      showFemaleSection,
      showTests,
      showAdvice,
      showHeader,
      showFooter,
      showDoctorDetails,
    });
  };

  const handleDownloadPdf = () => {
    if (!prescription) return;
    downloadPrescriptionPdf(prescription, {
      hospitalSettings,
      showVitals,
      showFemaleSection,
      showTests,
      showAdvice,
      showHeader,
      showFooter,
      showDoctorDetails,
    });
  };

  if (isDraftMode && !draftPrescription) {
    return <div className="p-3 sm:p-6">No draft data found. Save prescription first and open preview again.</div>;
  }

  if ((isLoading && !isDraftMode) || !prescription) {
    return <div className="p-3 sm:p-6">Loading prescription preview...</div>;
  }

  const patientName = `${prescription.patient?.firstName || ""} ${prescription.patient?.lastName || ""}`.trim();
  const createdAt = prescription.createdAt ? new Date(prescription.createdAt).toLocaleString() : "-";
  const female = prescription.patient?.gender?.toLowerCase() === "female";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prescription Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditorOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />Editor
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        </div>
      </div>

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Advanced Editor</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Document Controls</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showHeader} onCheckedChange={(v) => setShowHeader(!!v)} /><Label>Header</Label></div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showFooter} onCheckedChange={(v) => setShowFooter(!!v)} /><Label>Footer</Label></div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showDoctorDetails} onCheckedChange={(v) => setShowDoctorDetails(!!v)} /><Label>Doctor Details</Label></div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showVitals} onCheckedChange={(v) => setShowVitals(!!v)} /><Label>Vitals</Label></div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showFemaleSection} onCheckedChange={(v) => setShowFemaleSection(!!v)} /><Label>Female Section</Label></div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showTests} onCheckedChange={(v) => setShowTests(!!v)} /><Label>Test Advice</Label></div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showAdvice} onCheckedChange={(v) => setShowAdvice(!!v)} /><Label>Advice</Label></div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Menu</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-2 rounded-md border bg-background p-3">
                <Label>Edit Size</Label>
                <Select value={fontSizePx} onValueChange={setFontSizePx}>
                  <SelectTrigger><SelectValue placeholder="Font size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 px</SelectItem>
                    <SelectItem value="14">14 px</SelectItem>
                    <SelectItem value="16">16 px</SelectItem>
                    <SelectItem value="18">18 px</SelectItem>
                    <SelectItem value="20">20 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border bg-background p-3">
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    setTextColor(color);
                    applyEditorCommand("foreColor", color);
                  }}
                  className="h-10"
                />
              </div>
              <div className="space-y-2 rounded-md border bg-background p-3">
                <Label className="flex items-center gap-2"><Highlighter className="h-4 w-4" />Highlighter</Label>
                <Input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    setHighlightColor(color);
                    applyEditorCommand("hiliteColor", color);
                  }}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyEditorCommand("bold")}
              >
                <Bold className="mr-1 h-4 w-4" />Bold
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyEditorCommand("italic")}
              >
                <Italic className="mr-1 h-4 w-4" />Italic
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyEditorCommand("underline")}
              >
                <Underline className="mr-1 h-4 w-4" />Underline
              </Button>
              <Button type="button" variant={textAlign === "left" ? "default" : "outline"} size="sm" onClick={() => applyAlignment("left")}><AlignLeft className="h-4 w-4" /></Button>
              <Button type="button" variant={textAlign === "center" ? "default" : "outline"} size="sm" onClick={() => applyAlignment("center")}><AlignCenter className="h-4 w-4" /></Button>
              <Button type="button" variant={textAlign === "right" ? "default" : "outline"} size="sm" onClick={() => applyAlignment("right")}><AlignRight className="h-4 w-4" /></Button>
              <Button type="button" variant={textAlign === "justify" ? "default" : "outline"} size="sm" onClick={() => applyAlignment("justify")}><AlignJustify className="h-4 w-4" /></Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2 rounded-md border bg-background p-3">
                <Label>Line Spacing</Label>
                <Select value={lineHeight} onValueChange={setLineHeight}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.2">1.2</SelectItem>
                    <SelectItem value="1.4">1.4</SelectItem>
                    <SelectItem value="1.6">1.6</SelectItem>
                    <SelectItem value="1.8">1.8</SelectItem>
                    <SelectItem value="2">2.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border bg-background p-3">
                <Label>Word Spacing</Label>
                <Select value={wordSpacing} onValueChange={setWordSpacing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="1">1 px</SelectItem>
                    <SelectItem value="2">2 px</SelectItem>
                    <SelectItem value="3">3 px</SelectItem>
                    <SelectItem value="4">4 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border bg-background p-3">
                <Label>Letter Spacing</Label>
                <Select value={letterSpacing} onValueChange={setLetterSpacing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="0.5">0.5 px</SelectItem>
                    <SelectItem value="1">1 px</SelectItem>
                    <SelectItem value="1.5">1.5 px</SelectItem>
                    <SelectItem value="2">2 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-3 space-y-3">
            <h3 className="text-sm font-semibold">Share</h3>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Doctor/Nurse/Lab/Pharmacy/Admin)</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="head_nurse">Head Nurse</SelectItem>
                <SelectItem value="billing_staff">Lab/Pharmacy Staff</SelectItem>
                <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
              {filteredUsers.map((u) => (
                <label key={u._id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedRecipients.includes(u._id)} onCheckedChange={() => toggleRecipient(u._id)} />
                  <span>{`${u.firstName || ""} ${u.lastName || ""}`.trim()} ({u.role})</span>
                </label>
              ))}
            </div>
            <Textarea
              value={shareNote}
              onChange={(e) => setShareNote(e.target.value)}
              placeholder="Optional share note"
            />
            <Button onClick={handleShare} disabled={sharing || selectedRecipients.length === 0}>
              <Send className="mr-2 h-4 w-4" />
              {sharing ? "Sending..." : "Send Prescription"}
            </Button>
          </div>
          </div>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader><CardTitle>Real-time Preview</CardTitle></CardHeader>
        <CardContent className="bg-muted/20">
          <div
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning
            className="mx-auto w-full max-w-4xl bg-white rounded-md border p-3 sm:p-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            style={previewTypographyStyle}
          >
              {showHeader && (
                <div className="border-b pb-3 mb-4" style={{ borderColor: textColor }}>
                  <h2 className="text-xl font-bold" style={{ color: textColor }}>{hospitalSettings.hospitalName}</h2>
                  {hospitalSettings.registrationNumber && (
                    <p className="text-sm">Reg No: {hospitalSettings.registrationNumber}</p>
                  )}
                  {hospitalSettings.address && <p className="text-sm">{hospitalSettings.address}</p>}
                  {(hospitalSettings.phone || hospitalSettings.email || hospitalSettings.website) && (
                    <p className="text-sm">
                      {[hospitalSettings.phone, hospitalSettings.email, hospitalSettings.website].filter(Boolean).join(" | ")}
                    </p>
                  )}
                  <p className="text-sm font-semibold mt-1">Prescription (Rx)</p>
                  <p className="text-sm">Generated: {createdAt}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
                <p><strong>Patient:</strong> {patientName || "-"}</p>
                <p><strong>Patient ID:</strong> {prescription.patient?._id || "-"}</p>
                {showDoctorDetails && <p><strong>Doctor:</strong> {formatDoctor(prescription.doctor)}</p>}
                <p><strong>Encounter:</strong> {(prescription.encounterType || "opd").toUpperCase()}</p>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <p><strong>Complaints:</strong> {(prescription.complaints || []).join(", ") || "-"}</p>
                <p><strong>Medical History:</strong> {(prescription.medicalHistory || []).join(", ") || "-"}</p>
                <p><strong>Diagnosis:</strong> {prescription.diagnosis || "-"}</p>
                <p><strong>Follow-up:</strong> {prescription.followUpDate ? new Date(prescription.followUpDate).toLocaleDateString() : "-"}</p>
              </div>

              {showVitals && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2" style={{ color: textColor }}>Vitals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p>BP: {prescription.vitals?.bloodPressure || "-"}</p>
                    <p>PR: {prescription.vitals?.pulseRate || "-"}</p>
                    <p>SpO2: {prescription.vitals?.spo2 || "-"}</p>
                    <p>Temp: {prescription.vitals?.temperature || "-"}</p>
                    <p>Height: {prescription.vitals?.heightCm || "-"}</p>
                    <p>Weight: {prescription.vitals?.weightKg || "-"}</p>
                    <p>BMI: {prescription.vitals?.bmi || "-"}</p>
                  </div>
                </div>
              )}

              {showFemaleSection && female && prescription.femaleHealth && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2" style={{ color: textColor }}>Female Clinical Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p>Gravida: {prescription.femaleHealth?.gravida || "-"}</p>
                    <p>Parity: {`${prescription.femaleHealth?.parityA || "-"}+${prescription.femaleHealth?.parityB || "-"}`}</p>
                    <p>LMP: {prescription.femaleHealth?.lmp ? new Date(prescription.femaleHealth.lmp).toLocaleDateString() : "-"}</p>
                    <p>EDD: {prescription.femaleHealth?.edd ? new Date(prescription.femaleHealth.edd).toLocaleDateString() : "-"}</p>
                    <p>POG: {prescription.femaleHealth?.pog || "-"}</p>
                    <p>LCB/MOD: {`${prescription.femaleHealth?.lcb || "-"} / ${prescription.femaleHealth?.mod || "-"}`}</p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-semibold mb-2" style={{ color: textColor }}>Medicines</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left">Medicine</th>
                      <th className="border p-2 text-left">Dose</th>
                      <th className="border p-2 text-left">Frequency</th>
                      <th className="border p-2 text-left">Route</th>
                      <th className="border p-2 text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(prescription.items || []).map((item, idx) => (
                      <tr key={`${item._id || idx}`}>
                        <td className="border p-2">{item.medicineName || "-"}</td>
                        <td className="border p-2">{item.dosage || "-"}</td>
                        <td className="border p-2">{item.frequency || "-"}</td>
                        <td className="border p-2">{item.route || "-"}</td>
                        <td className="border p-2">{item.duration || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showTests && (prescription.testAdvice || []).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2" style={{ color: textColor }}>Suggested Tests</h3>
                  <ul className="list-disc pl-5 text-sm">
                    {prescription.testAdvice.map((t, idx) => (
                      <li key={`${t._id || idx}`}>{t.testName}{t.instructions ? ` - ${t.instructions}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              {showAdvice && (
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: textColor }}>Advice</h3>
                  <p className="text-sm whitespace-pre-wrap">{prescription.notes || "-"}</p>
                </div>
              )}

              {showFooter && (
                <div className="mt-5 border-t pt-3 text-xs text-muted-foreground">
                  {[hospitalSettings.phone, hospitalSettings.email, hospitalSettings.website].filter(Boolean).join(" | ") || "For queries, contact hospital front desk."}
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
