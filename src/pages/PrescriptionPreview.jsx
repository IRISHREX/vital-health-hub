import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getPrescription, sharePrescription } from "@/lib/pharmacy";
import { getUsers } from "@/lib/users";
import { Download, Printer, Send } from "lucide-react";

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
  const { toast } = useToast();
  const previewRef = useRef(null);

  const [showVitals, setShowVitals] = useState(true);
  const [showFemaleSection, setShowFemaleSection] = useState(true);
  const [showTests, setShowTests] = useState(true);
  const [showAdvice, setShowAdvice] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [accentColor, setAccentColor] = useState("#0f766e");

  const [roleFilter, setRoleFilter] = useState("all");
  const [shareNote, setShareNote] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sharing, setSharing] = useState(false);

  const { data: rxRes, isLoading } = useQuery({
    queryKey: ["prescription", id],
    queryFn: () => getPrescription(id),
    enabled: !!id,
  });

  const { data: usersRes } = useQuery({
    queryKey: ["share-users"],
    queryFn: () => getUsers(),
  });

  const prescription = rxRes?.data || null;
  const users = usersRes?.data?.users || [];
  const shareableRoles = ["doctor", "nurse", "head_nurse", "billing_staff", "hospital_admin", "super_admin"];

  const filteredUsers = useMemo(() => {
    const byRole = users.filter((u) => shareableRoles.includes(u.role));
    if (roleFilter === "all") return byRole;
    return byRole.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

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
    if (!previewRef.current) return;
    const html = previewRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
            h1, h2, h3 { margin: 0 0 8px; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current || !prescription) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    const x = (pageWidth - width) / 2;
    const y = 10;
    pdf.addImage(imgData, "PNG", x, y, width, height);
    pdf.save(`prescription-${prescription._id}.pdf`);
  };

  if (isLoading || !prescription) {
    return <div className="p-6">Loading prescription preview...</div>;
  }

  const patientName = `${prescription.patient?.firstName || ""} ${prescription.patient?.lastName || ""}`.trim();
  const createdAt = prescription.createdAt ? new Date(prescription.createdAt).toLocaleString() : "-";
  const female = prescription.patient?.gender?.toLowerCase() === "female";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prescription Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Customization & Share</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><Checkbox checked={showVitals} onCheckedChange={(v) => setShowVitals(!!v)} /><Label>Show Vitals</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={showFemaleSection} onCheckedChange={(v) => setShowFemaleSection(!!v)} /><Label>Show Female Section</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={showTests} onCheckedChange={(v) => setShowTests(!!v)} /><Label>Show Test Advice</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={showAdvice} onCheckedChange={(v) => setShowAdvice(!!v)} /><Label>Show Advice</Label></div>
            </div>

            <div className="space-y-2">
              <Label>Font Scale</Label>
              <Input type="range" min="0.8" max="1.3" step="0.05" value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10" />
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Send With Acknowledgement</h3>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Real-time Preview</CardTitle></CardHeader>
          <CardContent>
            <div ref={previewRef} className="bg-white rounded border p-6" style={{ fontSize: `${fontScale}rem` }}>
              <div className="border-b pb-3 mb-4" style={{ borderColor: accentColor }}>
                <h2 className="text-xl font-bold" style={{ color: accentColor }}>Clinical Prescription</h2>
                <p className="text-sm">Generated: {createdAt}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <p><strong>Patient:</strong> {patientName || "-"}</p>
                <p><strong>Patient ID:</strong> {prescription.patient?.patientId || "-"}</p>
                <p><strong>Doctor:</strong> {formatDoctor(prescription.doctor)}</p>
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
                  <h3 className="font-semibold mb-2" style={{ color: accentColor }}>Vitals</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
                  <h3 className="font-semibold mb-2" style={{ color: accentColor }}>Female Clinical Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
                <h3 className="font-semibold mb-2" style={{ color: accentColor }}>Medicines</h3>
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
                  <h3 className="font-semibold mb-2" style={{ color: accentColor }}>Suggested Tests</h3>
                  <ul className="list-disc pl-5 text-sm">
                    {prescription.testAdvice.map((t, idx) => (
                      <li key={`${t._id || idx}`}>{t.testName}{t.instructions ? ` - ${t.instructions}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              {showAdvice && (
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: accentColor }}>Advice</h3>
                  <p className="text-sm whitespace-pre-wrap">{prescription.notes || "-"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
