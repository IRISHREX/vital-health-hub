import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Scissors, Plus, Calendar, Activity, Clock, DollarSign,
  Search, CheckCircle2, AlertTriangle, Play, Square, Heart,
  FileText, LayoutGrid
} from "lucide-react";
import {
  getSurgeries, getOTRooms, getOTStats, getOTSchedule,
  approveSurgery, patientInOT, startAnesthesia, startSurgeryAction,
  moveToRecovery, completeRecovery, completeSurgeryAction,
  updateChecklist, generateOTInvoice
} from "@/lib/ot";
import CreateSurgeryDialog from "@/components/ot/CreateSurgeryDialog";
import ScheduleSurgeryDialog from "@/components/ot/ScheduleSurgeryDialog";
import EndSurgeryDialog from "@/components/ot/EndSurgeryDialog";
import OTRoomDialog from "@/components/ot/OTRoomDialog";
import { toast } from "sonner";

const statusColors = {
  requested: "bg-muted text-muted-foreground",
  approved: "bg-primary/10 text-primary",
  scheduled: "bg-[hsl(var(--status-reserved))]/10 text-[hsl(var(--status-reserved))]",
  preop_check: "bg-[hsl(var(--status-cleaning))]/10 text-[hsl(var(--status-cleaning))]",
  in_ot: "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]",
  anesthesia_started: "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]",
  surgery_started: "bg-destructive/10 text-destructive",
  surgery_ended: "bg-accent/10 text-accent-foreground",
  recovery: "bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]",
  post_op: "bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]",
  completed: "bg-[hsl(var(--status-available))]/10 text-[hsl(var(--status-available))]",
  cancelled: "bg-destructive/10 text-destructive"
};

const statusLabels = {
  requested: "Requested", approved: "Approved", scheduled: "Scheduled",
  preop_check: "Pre-Op Check", in_ot: "In OT", anesthesia_started: "Anesthesia",
  surgery_started: "Surgery In Progress", surgery_ended: "Surgery Ended",
  recovery: "Recovery", post_op: "Post-Op", completed: "Completed", cancelled: "Cancelled"
};

const urgencyBadge = {
  elective: "bg-muted text-muted-foreground",
  urgent: "bg-[hsl(var(--status-cleaning))]/10 text-[hsl(var(--status-cleaning))]",
  emergency: "bg-destructive/10 text-destructive"
};

export default function OTDashboard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: statsRes } = useQuery({ queryKey: ["ot-stats"], queryFn: getOTStats });
  const { data: surgeriesRes, isLoading } = useQuery({ queryKey: ["surgeries", statusFilter], queryFn: () => getSurgeries(statusFilter !== "all" ? { status: statusFilter } : {}) });
  const { data: roomsRes } = useQuery({ queryKey: ["ot-rooms"], queryFn: () => getOTRooms({}) });
  const { data: scheduleRes } = useQuery({ queryKey: ["ot-schedule", scheduleDate], queryFn: () => getOTSchedule({ date: scheduleDate }) });

  const stats = statsRes?.data || {};
  const surgeries = surgeriesRes?.data?.surgeries || [];
  const rooms = roomsRes?.data || [];
  const scheduleItems = scheduleRes?.data || [];

  const filteredSurgeries = surgeries.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.procedureName?.toLowerCase().includes(q) ||
      s.patient?.firstName?.toLowerCase().includes(q) ||
      s.patient?.lastName?.toLowerCase().includes(q) ||
      s.surgeryId?.toLowerCase().includes(q);
  });

  // Quick action mutations
  const quickAction = useMutation({
    mutationFn: ({ id, action, data }) => {
      const actions = { approve: approveSurgery, patientInOT, startAnesthesia: (id) => startAnesthesia(id, data), startSurgery: startSurgeryAction, moveToRecovery: (id) => moveToRecovery(id, data), completeRecovery: (id) => completeRecovery(id, data), complete: completeSurgeryAction };
      return actions[action](id);
    },
    onSuccess: (_, { actionLabel }) => {
      toast.success(actionLabel || "Action completed");
      queryClient.invalidateQueries({ queryKey: ["surgeries"] });
      queryClient.invalidateQueries({ queryKey: ["ot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ot-schedule"] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Action failed")
  });

  const checklistMutation = useMutation({
    mutationFn: ({ surgeryId, itemId, completed }) => updateChecklist(surgeryId, { itemId, completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surgeries"] }),
    onError: (err) => toast.error(err?.response?.data?.message || "Failed")
  });

  const invoiceMutation = useMutation({
    mutationFn: (surgeryId) => generateOTInvoice(surgeryId),
    onSuccess: () => {
      toast.success("OT invoice generated");
      queryClient.invalidateQueries({ queryKey: ["surgeries"] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Invoice generation failed")
  });

  const getNextAction = (surgery) => {
    const map = {
      requested: { label: "Approve", action: "approve", icon: CheckCircle2 },
      approved: { label: "Schedule", action: "openSchedule", icon: Calendar },
      scheduled: { label: "Patient In OT", action: "patientInOT", icon: Activity },
      preop_check: { label: "Patient In OT", action: "patientInOT", icon: Activity },
      in_ot: { label: "Start Anesthesia", action: "startAnesthesia", icon: Heart },
      anesthesia_started: { label: "Start Surgery", action: "startSurgery", icon: Play },
      surgery_started: { label: "End Surgery", action: "openEnd", icon: Square },
      surgery_ended: { label: "Move to Recovery", action: "moveToRecovery", icon: Activity },
      recovery: { label: "Complete Recovery", action: "completeRecovery", icon: CheckCircle2 },
      post_op: { label: "Mark Completed", action: "complete", icon: CheckCircle2 }
    };
    return map[surgery.status];
  };

  const handleAction = (surgery, actionInfo) => {
    if (actionInfo.action === "openSchedule") {
      setSelectedSurgery(surgery);
      setScheduleOpen(true);
    } else if (actionInfo.action === "openEnd") {
      setSelectedSurgery(surgery);
      setEndOpen(true);
    } else {
      quickAction.mutate({ id: surgery._id, action: actionInfo.action, actionLabel: actionInfo.label });
    }
  };

  const kpis = [
    { label: "Total Surgeries", value: stats.total || 0, icon: Scissors, color: "text-primary" },
    { label: "Scheduled / Pending", value: stats.scheduled || 0, icon: Calendar, color: "text-[hsl(var(--status-reserved))]" },
    { label: "In Progress", value: stats.inProgress || 0, icon: Activity, color: "text-[hsl(var(--status-cleaning))]" },
    { label: "Today's Surgeries", value: stats.todayCount || 0, icon: Clock, color: "text-accent" },
    { label: "OT Rooms", value: `${stats.availableRooms || 0}/${stats.totalRooms || 0}`, icon: LayoutGrid, color: "text-[hsl(var(--status-available))]" },
    { label: "Total Revenue", value: `₹${((stats.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-[hsl(var(--chart-3))]" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scissors className="h-7 w-7 text-primary" /> Operating Theatre
          </h1>
          <p className="text-sm text-muted-foreground">Manage surgeries, OT rooms, scheduling & billing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRoomOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add OT Room
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Surgery
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="kpi-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">All Surgeries</TabsTrigger>
          <TabsTrigger value="schedule">OT Schedule</TabsTrigger>
          <TabsTrigger value="active">Active / In OT</TabsTrigger>
          <TabsTrigger value="rooms">OT Rooms</TabsTrigger>
        </TabsList>

        {/* All Surgeries Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by patient, procedure, ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading surgeries...</div>
          ) : filteredSurgeries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No surgeries found</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredSurgeries.map((s) => {
                const nextAction = getNextAction(s);
                return (
                  <Card key={s._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-foreground">{s.procedureName}</span>
                            <Badge variant="outline" className="text-xs font-mono">{s.surgeryId}</Badge>
                            <Badge className={`text-xs ${statusColors[s.status]}`}>{statusLabels[s.status]}</Badge>
                            <Badge className={`text-xs ${urgencyBadge[s.urgency]}`}>{s.urgency}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Patient: <span className="text-foreground">{s.patient?.firstName} {s.patient?.lastName}</span></span>
                            <span>Surgeon: <span className="text-foreground">{s.primarySurgeon?.name || "—"}</span></span>
                            {s.otRoom && <span>OT: <span className="text-foreground">{s.otRoom?.roomNumber}</span></span>}
                            {s.scheduledDate && <span>Date: <span className="text-foreground">{new Date(s.scheduledDate).toLocaleDateString()}</span></span>}
                            {s.scheduledStartTime && <span>Time: <span className="text-foreground">{s.scheduledStartTime}</span></span>}
                            <span>Est. Duration: <span className="text-foreground">{s.estimatedDuration}min</span></span>
                            {s.totalCharges > 0 && <span>Charges: <span className="text-foreground">₹{s.totalCharges?.toLocaleString()}</span></span>}
                          </div>

                          {/* Pre-op checklist inline for scheduled */}
                          {(s.status === 'scheduled' || s.status === 'preop_check') && s.preOpChecklist?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {s.preOpChecklist.map((item) => (
                                <button
                                  key={item._id}
                                  onClick={() => checklistMutation.mutate({ surgeryId: s._id, itemId: item._id, completed: !item.completed })}
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${item.completed ? 'bg-[hsl(var(--status-available))]/10 border-[hsl(var(--status-available))]/30 text-[hsl(var(--status-available))]' : 'bg-muted border-border text-muted-foreground hover:border-primary'}`}
                                >
                                  <Checkbox checked={item.completed} className="h-3 w-3 pointer-events-none" />
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {s.status === 'completed' && !s.billed && s.totalCharges > 0 && (
                            <Button variant="outline" size="sm" onClick={() => invoiceMutation.mutate(s._id)} disabled={invoiceMutation.isPending}>
                              <FileText className="h-4 w-4 mr-1" /> Invoice
                            </Button>
                          )}
                          {nextAction && (
                            <Button size="sm" onClick={() => handleAction(s, nextAction)} disabled={quickAction.isPending}>
                              <nextAction.icon className="h-4 w-4 mr-1" /> {nextAction.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* OT Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-48" />
            <span className="text-sm text-muted-foreground">{scheduleItems.length} surgeries scheduled</span>
          </div>
          {scheduleItems.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No surgeries scheduled for this date</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {scheduleItems.map((s) => (
                <Card key={s._id} className="border-l-4" style={{ borderLeftColor: `hsl(var(--chart-${Math.floor(Math.random() * 5) + 1}))` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{s.procedureName}</p>
                        <p className="text-sm text-muted-foreground">{s.patient?.firstName} {s.patient?.lastName}</p>
                      </div>
                      <Badge className={`text-xs ${statusColors[s.status]}`}>{statusLabels[s.status]}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <span>Time: <span className="text-foreground">{s.scheduledStartTime || "TBD"} - {s.scheduledEndTime || "TBD"}</span></span>
                      <span>OT Room: <span className="text-foreground">{s.otRoom?.roomNumber || "TBD"}</span></span>
                      <span>Surgeon: <span className="text-foreground">{s.primarySurgeon?.name || "—"}</span></span>
                      <span>Anesthetist: <span className="text-foreground">{s.anesthetist?.name || "—"}</span></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active / In OT Tab */}
        <TabsContent value="active" className="space-y-4">
          {(() => {
            const active = surgeries.filter(s => ['in_ot', 'anesthesia_started', 'surgery_started', 'surgery_ended', 'recovery'].includes(s.status));
            if (active.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground">No active surgeries in OT</CardContent></Card>;
            return active.map(s => {
              const nextAction = getNextAction(s);
              return (
                <Card key={s._id} className="border-l-4 border-l-destructive">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{s.procedureName}</h3>
                        <p className="text-muted-foreground">{s.patient?.firstName} {s.patient?.lastName} • {s.surgeryId}</p>
                      </div>
                      <Badge className={`${statusColors[s.status]} text-sm`}>{statusLabels[s.status]}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Surgeon</p>
                        <p className="font-medium text-foreground">{s.primarySurgeon?.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">OT Room</p>
                        <p className="font-medium text-foreground">{s.otRoom?.roomNumber || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Anesthesia</p>
                        <p className="font-medium text-foreground capitalize">{s.anesthesiaType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration Est.</p>
                        <p className="font-medium text-foreground">{s.estimatedDuration} min</p>
                      </div>
                    </div>
                    {/* Timeline */}
                    {s.timestamps && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                        {s.timestamps.patientArrivedAt && <span>Arrived: <span className="text-foreground">{new Date(s.timestamps.patientArrivedAt).toLocaleTimeString()}</span></span>}
                        {s.timestamps.anesthesiaStartedAt && <span>Anesthesia: <span className="text-foreground">{new Date(s.timestamps.anesthesiaStartedAt).toLocaleTimeString()}</span></span>}
                        {s.timestamps.incisionAt && <span>Incision: <span className="text-foreground">{new Date(s.timestamps.incisionAt).toLocaleTimeString()}</span></span>}
                        {s.timestamps.closureAt && <span>Closure: <span className="text-foreground">{new Date(s.timestamps.closureAt).toLocaleTimeString()}</span></span>}
                        {s.timestamps.patientOutAt && <span>Out: <span className="text-foreground">{new Date(s.timestamps.patientOutAt).toLocaleTimeString()}</span></span>}
                      </div>
                    )}
                    {nextAction && (
                      <Button onClick={() => handleAction(s, nextAction)} disabled={quickAction.isPending}>
                        <nextAction.icon className="h-4 w-4 mr-1" /> {nextAction.label}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            });
          })()}
        </TabsContent>

        {/* OT Rooms Tab */}
        <TabsContent value="rooms" className="space-y-4">
          {rooms.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No OT rooms configured. Add one to get started.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-foreground">{room.roomNumber} - {room.name}</CardTitle>
                      <Badge className={room.status === 'available' ? 'status-available' : room.status === 'in_use' ? 'status-occupied' : room.status === 'cleaning' ? 'status-cleaning' : 'bg-muted text-muted-foreground'}>
                        {room.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>Type: <span className="text-foreground capitalize">{room.type}</span></p>
                    <p>Floor: <span className="text-foreground">{room.floor}</span></p>
                    <p>Rate: <span className="text-foreground">₹{room.pricePerHour}/hr</span></p>
                    {room.equipment?.length > 0 && (
                      <p>Equipment: <span className="text-foreground">{room.equipment.map(e => e.name).join(', ')}</span></p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSurgeryDialog open={createOpen} onOpenChange={setCreateOpen} />
      {selectedSurgery && (
        <>
          <ScheduleSurgeryDialog open={scheduleOpen} onOpenChange={(v) => { setScheduleOpen(v); if (!v) setSelectedSurgery(null); }} surgery={selectedSurgery} otRooms={rooms} />
          <EndSurgeryDialog open={endOpen} onOpenChange={(v) => { setEndOpen(v); if (!v) setSelectedSurgery(null); }} surgery={selectedSurgery} />
        </>
      )}
      <OTRoomDialog open={roomOpen} onOpenChange={setRoomOpen} />
    </div>
  );
}
