import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function PrescriptionDialog({ isOpen, onClose, patient }) {
  const [vitals, setVitals] = useState({ bp: "", pr: "", spo2: "", temp: "", height: "", weight: "", bmi: "", others: "" });
  const [complain, setComplain] = useState({ presenting: "", history: "", examination: "" });
  const [diagnosis, setDiagnosis] = useState({ provisional: "", medicine: "", tests: "", additional: "" });
  const [followup, setFollowup] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    // reset when opening
    setVitals({ bp: "", pr: "", spo2: "", temp: "", height: "", weight: "", bmi: "", others: "" });
    setComplain({ presenting: "", history: "", examination: "" });
    setDiagnosis({ provisional: "", medicine: "", tests: "", additional: "" });
    setFollowup("");
  }, [isOpen]);

  const handleSave = () => {
    const payload = { patientId: patient?._id || patient?.id || null, vitals, complain, diagnosis, followup };
    console.info("Prescription saved:", payload);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prescription</DialogTitle>
          <DialogDescription>
            {patient ? `${patient.firstName || ''} ${patient.lastName || ''}` : "New Prescription"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="font-medium mb-2">Vitals</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>BP</Label>
                <Input value={vitals.bp} onChange={(e) => setVitals({ ...vitals, bp: e.target.value })} />
              </div>
              <div>
                <Label>PR</Label>
                <Input value={vitals.pr} onChange={(e) => setVitals({ ...vitals, pr: e.target.value })} />
              </div>
              <div>
                <Label>SPO2</Label>
                <Input value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} />
              </div>
              <div>
                <Label>Temp</Label>
                <Input value={vitals.temp} onChange={(e) => setVitals({ ...vitals, temp: e.target.value })} />
              </div>
              <div>
                <Label>Height</Label>
                <Input value={vitals.height} onChange={(e) => setVitals({ ...vitals, height: e.target.value })} />
              </div>
              <div>
                <Label>Weight</Label>
                <Input value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} />
              </div>
              <div>
                <Label>BMI</Label>
                <Input value={vitals.bmi} onChange={(e) => setVitals({ ...vitals, bmi: e.target.value })} />
              </div>
              <div>
                <Label>Others</Label>
                <Input value={vitals.others} onChange={(e) => setVitals({ ...vitals, others: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">Complain</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Presenting complain</Label>
                <Textarea value={complain.presenting} onChange={(e) => setComplain({ ...complain, presenting: e.target.value })} />
              </div>
              <div>
                <Label>Medical History</Label>
                <Textarea value={complain.history} onChange={(e) => setComplain({ ...complain, history: e.target.value })} />
              </div>
              <div>
                <Label>On Examination</Label>
                <Textarea value={complain.examination} onChange={(e) => setComplain({ ...complain, examination: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">Diagnosis</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Provisional Diagnosis</Label>
                <Textarea value={diagnosis.provisional} onChange={(e) => setDiagnosis({ ...diagnosis, provisional: e.target.value })} />
              </div>
              <div>
                <Label>Medicine Advice</Label>
                <Textarea value={diagnosis.medicine} onChange={(e) => setDiagnosis({ ...diagnosis, medicine: e.target.value })} />
              </div>
              <div>
                <Label>Test Advice</Label>
                <Textarea value={diagnosis.tests} onChange={(e) => setDiagnosis({ ...diagnosis, tests: e.target.value })} />
              </div>
              <div>
                <Label>Additional Advice</Label>
                <Textarea value={diagnosis.additional} onChange={(e) => setDiagnosis({ ...diagnosis, additional: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">Followup</h3>
            <div>
              <Label>Followup date</Label>
              <Input type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onClose()}>Cancel</Button>
            <Button onClick={handleSave}>Save Prescription</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
