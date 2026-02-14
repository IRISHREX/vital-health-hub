import { useState, useEffect } from "react";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { getRadiologyOrders, getRadiologyStats, deleteRadiologyOrder, scheduleOrder, startStudy, completeStudy, deliverRadiologyReport, generateRadiologyInvoice } from "@/lib/radiology";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Clock, Eye, Trash2, FileText, Receipt, Activity, Play, Calendar, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import OrderRadiologyDialog from "@/components/radiology/OrderRadiologyDialog";
import RadiologyReportDialog from "@/components/radiology/RadiologyReportDialog";
import RestrictedAction from "@/components/permissions/RestrictedAction";

const statusColors = {
  ordered: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/10 text-primary",
  in_progress: "bg-accent/10 text-accent-foreground",
  completed: "bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]",
  reported: "bg-[hsl(var(--status-available))]/10 text-[hsl(var(--status-available))]",
  verified: "bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))]",
  delivered: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const studyTypeLabels = {
  xray: "X-Ray", ct_scan: "CT Scan", mri: "MRI", ultrasound: "Ultrasound",
  mammography: "Mammography", fluoroscopy: "Fluoroscopy", pet_scan: "PET Scan",
  dexa: "DEXA", angiography: "Angiography", other: "Other"
};

const priorityVariant = { routine: "secondary", urgent: "default", stat: "destructive" };

export default function RadiologyDashboard() {
  const { getModulePermissions } = useVisualAuth();
  const permissions = getModulePermissions("radiology");

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("orders");

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [ordersRes, statsRes, patientsRes, doctorsRes] = await Promise.all([
        getRadiologyOrders(), getRadiologyStats(), getPatients(), getDoctors()
      ]);
      setOrders(ordersRes.data?.orders || []);
      setStats(statsRes.data || {});
      setPatients(patientsRes.data?.patients || []);
      setDoctors(doctorsRes.data?.doctors || []);
    } catch {
      toast.error("Failed to load radiology data");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (actionFn, id, label, data) => {
    try {
      await actionFn(id, data);
      toast.success(label);
      fetchData(false);
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    try { await deleteRadiologyOrder(id); toast.success("Order cancelled"); fetchData(); } catch (err) { toast.error(err.message); }
  };

  const handleGenerateInvoice = async (orderIds) => {
    try { await generateRadiologyInvoice(orderIds); toast.success("Invoice generated"); fetchData(); } catch (err) { toast.error(err.message); }
  };

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      o.studyName?.toLowerCase().includes(q) ||
      o.orderId?.toLowerCase().includes(q) ||
      o.bodyPart?.toLowerCase().includes(q) ||
      o.patient?.firstName?.toLowerCase().includes(q) ||
      o.patient?.lastName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchType = typeFilter === "all" || o.studyType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const pendingQueue = orders.filter((o) => ["ordered", "scheduled"].includes(o.status));
  const inProgressQueue = orders.filter((o) => o.status === "in_progress");
  const reportQueue = orders.filter((o) => ["completed", "reported"].includes(o.status));

  if (loading) return <div className="flex items-center justify-center h-64"><Clock className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Radiology</h1>
          <p className="text-muted-foreground">Imaging orders, reports & billing</p>
        </div>
        {permissions.canCreate && (
          <RestrictedAction module="radiology" feature="create">
            <Button onClick={() => setOrderDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Order Study</Button>
          </RestrictedAction>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Studies</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total || 0}</div></CardContent></Card>
        <Card className="border-primary/30 bg-primary/5"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle><Clock className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{stats.pending || 0}</div></CardContent></Card>
        <Card className="border-accent/30 bg-accent/5"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">In Progress</CardTitle><Activity className="h-4 w-4 text-accent" /></CardHeader><CardContent><div className="text-2xl font-bold text-accent">{stats.inProgress || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle><CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-available))]" /></CardHeader><CardContent><div className="text-2xl font-bold text-[hsl(var(--status-available))]">{stats.completed || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Today</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.today || 0}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="worklist">Worklist ({pendingQueue.length + inProgressQueue.length})</TabsTrigger>
          <TabsTrigger value="reports">Report Queue ({reportQueue.length})</TabsTrigger>
        </TabsList>

        {/* ALL ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search study, patient, order ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(studyTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Study</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((o) => (
                  <TableRow key={o._id}>
                    <TableCell className="font-mono text-sm">{o.orderId || "-"}</TableCell>
                    <TableCell>
                      <div><p className="font-medium">{o.patient?.firstName} {o.patient?.lastName}</p><p className="text-xs text-muted-foreground">{o.patient?.patientId}</p></div>
                    </TableCell>
                    <TableCell>
                      <div><p className="font-medium">{o.studyName}</p><p className="text-xs text-muted-foreground">{o.bodyPart}</p></div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{studyTypeLabels[o.studyType] || o.studyType}</Badge></TableCell>
                    <TableCell><Badge variant={priorityVariant[o.priority]}>{o.priority}</Badge></TableCell>
                    <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status] || ""}`}>{o.status?.replace(/_/g, " ")}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {o.status === "ordered" && permissions.canEdit && (
                          <Button variant="ghost" size="icon" title="Schedule" onClick={() => handleAction(scheduleOrder, o._id, "Scheduled")}>
                            <Calendar className="h-4 w-4" />
                          </Button>
                        )}
                        {["ordered", "scheduled"].includes(o.status) && permissions.canEdit && (
                          <Button variant="ghost" size="icon" title="Start Study" onClick={() => handleAction(startStudy, o._id, "Study started")}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {o.status === "in_progress" && permissions.canEdit && (
                          <Button variant="ghost" size="icon" title="Complete" onClick={() => handleAction(completeStudy, o._id, "Study completed")}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {["completed", "reported", "verified"].includes(o.status) && (
                          <Button variant="ghost" size="icon" title="Report" onClick={() => { setSelectedOrder(o); setReportDialogOpen(true); }}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {["verified", "delivered"].includes(o.status) && !o.billed && permissions.canCreate && (
                          <Button variant="ghost" size="icon" title="Generate Invoice" onClick={() => handleGenerateInvoice([o._id])}>
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}
                        {["reported", "verified"].includes(o.status) && permissions.canEdit && (
                          <Button variant="ghost" size="icon" title="Deliver" onClick={() => handleAction(deliverRadiologyReport, o._id, "Report delivered")}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {o.status === "ordered" && permissions.canDelete && (
                          <Button variant="ghost" size="icon" title="Cancel" onClick={() => handleDelete(o._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No radiology orders found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* WORKLIST TAB */}
        <TabsContent value="worklist" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Pending / Scheduled ({pendingQueue.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pendingQueue.length === 0 && <p className="text-sm text-muted-foreground">No pending studies.</p>}
                {pendingQueue.map((o) => (
                  <div key={o._id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{o.studyName} — {o.bodyPart}</p>
                      <p className="text-xs text-muted-foreground">{o.patient?.firstName} {o.patient?.lastName} • {studyTypeLabels[o.studyType]}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={priorityVariant[o.priority]}>{o.priority}</Badge>
                      {permissions.canEdit && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(startStudy, o._id, "Study started")}>
                          <Play className="mr-1 h-3 w-3" />Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">In Progress ({inProgressQueue.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {inProgressQueue.length === 0 && <p className="text-sm text-muted-foreground">No studies in progress.</p>}
                {inProgressQueue.map((o) => (
                  <div key={o._id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{o.studyName} — {o.bodyPart}</p>
                      <p className="text-xs text-muted-foreground">{o.patient?.firstName} {o.patient?.lastName} • {o.performedBy?.firstName || "-"}</p>
                    </div>
                    {permissions.canEdit && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(completeStudy, o._id, "Study completed")}>
                        <CheckCircle2 className="mr-1 h-3 w-3" />Complete
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REPORT QUEUE TAB */}
        <TabsContent value="reports" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Study</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportQueue.length > 0 ? reportQueue.map((o) => (
                  <TableRow key={o._id}>
                    <TableCell className="font-mono text-sm">{o.orderId}</TableCell>
                    <TableCell>{o.patient?.firstName} {o.patient?.lastName}</TableCell>
                    <TableCell>{o.studyName} — {o.bodyPart}</TableCell>
                    <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status]}`}>{o.status}</span></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(o); setReportDialogOpen(true); }}>
                        <FileText className="mr-1 h-3 w-3" />{o.status === "completed" ? "Create Report" : "View/Edit Report"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports pending.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OrderRadiologyDialog isOpen={orderDialogOpen} onClose={() => { setOrderDialogOpen(false); fetchData(); }} patients={patients} doctors={doctors} />
      <RadiologyReportDialog isOpen={reportDialogOpen} onClose={() => { setReportDialogOpen(false); setSelectedOrder(null); fetchData(); }} order={selectedOrder} permissions={permissions} />
    </div>
  );
}
