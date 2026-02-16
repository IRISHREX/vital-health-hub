import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAssignedPatients, getAssignedPatientPrescriptions, handoverPatient } from '@/lib/nurse';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Activity, Hash, Phone, User, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNurses } from '@/lib/users';
import { dischargePatient } from '@/lib/admissions';
import PrescriptionHistoryDialog from '@/components/pharmacy/PrescriptionHistoryDialog';
import { useAuth } from '@/lib/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VIEW_STATE_KEY = 'nursePatients.viewState.v1';

const readViewState = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(VIEW_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export default function NursePatients() {
  const savedState = readViewState();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(savedState.selectedId || "");
  const [query, setQuery] = useState(savedState.query || "");
  const [nurses, setNurses] = useState([]);
  const [handoverTo, setHandoverTo] = useState("");
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [dischargeLoading, setDischargeLoading] = useState(false);
  const [prescriptionHistoryOpen, setPrescriptionHistoryOpen] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState(savedState.selectedNurseId || "all");
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSelectNurse = ['super_admin', 'hospital_admin', 'doctor', 'head_nurse'].includes(user?.role);

  const loadPatients = async (nurseId = "") => {
    const res = await getAssignedPatients(nurseId || undefined);
    const nextPatients = res.data || [];
    setPatients(nextPatients);
    if (!nextPatients.find((p) => p._id === selectedId)) {
      setSelectedId(nextPatients[0]?._id || "");
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        await loadPatients(canSelectNurse && selectedNurseId !== "all" ? selectedNurseId : "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedNurseId, canSelectNurse]);

  useEffect(() => {
    const fetchNurses = async () => {
      try {
        const res = await getNurses();
        const nextNurses = res?.data?.users || [];
        setNurses(nextNurses);
        if (canSelectNurse && !selectedNurseId) {
          setSelectedNurseId("all");
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNurses();
  }, [canSelectNurse, selectedNurseId]);

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      String(p.patientId || "").toLowerCase().includes(q) ||
      String(p.phone || "").toLowerCase().includes(q)
    );
  }, [patients, query]);

  useEffect(() => {
    if (!filteredPatients.length) {
      setSelectedId("");
      return;
    }
    if (!selectedId) {
      setSelectedId(filteredPatients[0]._id);
    }
  }, [filteredPatients, selectedId]);

  const selectedPatient = useMemo(
    () => filteredPatients.find((p) => p._id === selectedId) || null,
    [filteredPatients, selectedId]
  );
  const currentAdmissionId = typeof selectedPatient?.currentAdmission === "string"
    ? selectedPatient.currentAdmission
    : selectedPatient?.currentAdmission?._id || "";

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        VIEW_STATE_KEY,
        JSON.stringify({
          selectedId,
          query,
          selectedNurseId,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [selectedId, query, selectedNurseId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Assigned Patients</h1>
        </div>
        <div className="flex items-center gap-2">
          {canSelectNurse && (
            <div className="w-56">
              <Select value={selectedNurseId} onValueChange={setSelectedNurseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select nurse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nurses</SelectItem>
                  {nurses.map((n) => (
                    <SelectItem key={n._id} value={n._id}>
                      {n.firstName} {n.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="w-64">
            <Input
              placeholder="Search name / ID / phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No patients assigned</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Patient List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[560px] overflow-y-auto">
                {filteredPatients.map((p) => {
                  const active = (selectedPatient?._id || selectedId) === p._id;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setSelectedId(p._id)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-muted/60 ${
                        active ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{p.firstName} {p.lastName}</div>
                        <Badge variant="outline" className="text-[10px] uppercase">{p.status || "active"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.patientId || "N/A"}</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Patient Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">
                    {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Select a patient"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedPatient?.patientId || "N/A"}
                  </div>
                </div>
                <Button
                  onClick={() => selectedPatient?._id && navigate(`/patients/${selectedPatient._id}`)}
                  size="sm"
                  disabled={!selectedPatient?._id}
                >
                  View Patient
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedPatient?._id}
                  onClick={() => setPrescriptionHistoryOpen(true)}
                >
                  View Prescriptions
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Patient ID:</span>
                  <span className="font-medium">{selectedPatient?.patientId || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{selectedPatient?.status || "active"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{selectedPatient?.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{selectedPatient?.registrationType || "N/A"}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Handover Patient</div>
                  <div className="flex gap-2">
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={handoverTo}
                      onChange={(e) => setHandoverTo(e.target.value)}
                    >
                      <option value="">Select nurse</option>
                      {nurses.map((n) => (
                        <option key={n._id} value={n._id}>
                          {n.firstName} {n.lastName}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={!handoverTo || handoverLoading || !selectedPatient?._id}
                      onClick={async () => {
                        if (!selectedPatient?._id) return;
                        try {
                          setHandoverLoading(true);
                          await handoverPatient({ patientId: selectedPatient._id, toNurseId: handoverTo });
                          setHandoverTo("");
                          await loadPatients(canSelectNurse && selectedNurseId !== "all" ? selectedNurseId : "");
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setHandoverLoading(false);
                        }
                      }}
                    >
                      {handoverLoading ? "Requesting..." : "Request Handover"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Discharge Patient</div>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Discharge reason"
                    value={dischargeReason}
                    onChange={(e) => setDischargeReason(e.target.value)}
                  />
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Notes (optional)"
                    rows={2}
                    value={dischargeNotes}
                    onChange={(e) => setDischargeNotes(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!currentAdmissionId || !dischargeReason || dischargeLoading}
                    onClick={async () => {
                      if (!currentAdmissionId) return;
                      try {
                        setDischargeLoading(true);
                        await dischargePatient(currentAdmissionId, {
                          dischargeReason,
                          notes: dischargeNotes,
                        });
                        setDischargeReason("");
                        setDischargeNotes("");
                        await loadPatients(canSelectNurse && selectedNurseId !== "all" ? selectedNurseId : "");
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setDischargeLoading(false);
                      }
                    }}
                  >
                    {dischargeLoading ? "Discharging..." : "Discharge"}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Click a patient in the list to see details.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <PrescriptionHistoryDialog
        open={prescriptionHistoryOpen}
        onOpenChange={setPrescriptionHistoryOpen}
        patient={selectedPatient}
        showCreate={false}
        fetchPrescriptions={getAssignedPatientPrescriptions}
      />
    </div>
  );
}
