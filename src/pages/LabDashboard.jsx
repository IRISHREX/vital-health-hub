import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getPermissions } from "@/lib/rbac";
import { getLabTests, getLabStats, collectSample, deleteLabTest, generateLabInvoice } from "@/lib/labTests";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, FlaskConical, TestTubes, ClipboardCheck, Clock, Eye, Trash2, FileText, Receipt,
  Activity, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import OrderLabTestDialog from "@/components/lab/OrderLabTestDialog";
import LabTestDetailsDialog from "@/components/lab/LabTestDetailsDialog";
import LabReportDialog from "@/components/lab/LabReportDialog";
import LabCatalogManager from "@/components/lab/LabCatalogManager";
import SampleCollectionQueue from "@/components/lab/SampleCollectionQueue";

const statusColors = {
  ordered: "bg-muted text-muted-foreground",
  sample_collected: "bg-primary/10 text-primary",
  processing: "bg-accent/10 text-accent",
  completed: "bg-[hsl(var(--status-available))]/10 text-[hsl(var(--status-available))]",
  verified: "bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))]",
  delivered: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const priorityColors = {
  routine: "secondary",
  urgent: "default",
  stat: "destructive",
};

export default function LabDashboard() {
  const { user } = useAuth();
  const permissions = getPermissions(user?.role, "lab");

  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("tests");

  // Dialogs
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testsRes, statsRes, patientsRes, doctorsRes] = await Promise.all([
        getLabTests(),
        getLabStats(),
        getPatients(),
        getDoctors(),
      ]);
      setTests(testsRes.data?.tests || []);
      setStats(statsRes.data || {});
      setPatients(patientsRes.data?.patients || []);
      setDoctors(doctorsRes.data?.doctors || []);
    } catch (err) {
      toast.error("Failed to load lab data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCollectSample = async (testId) => {
    try {
      await collectSample(testId);
      toast.success("Sample collected successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (testId) => {
    try {
      await deleteLabTest(testId);
      toast.success("Lab test cancelled");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGenerateInvoice = async (testIds) => {
    try {
      await generateLabInvoice(testIds);
      toast.success("Invoice generated successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      (t.testName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.testId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Clock className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pathology Lab</h1>
          <p className="text-muted-foreground">Lab test management, sample tracking & reports</p>
        </div>
        {permissions.canCreate && (
          <Button onClick={() => setOrderDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Order Lab Test
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.pending || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <TestTubes className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.processing || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-[hsl(var(--status-available))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--status-available))]">{stats.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="samples">Sample Queue</TabsTrigger>
          <TabsTrigger value="catalog">Test Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by test name, ID, or patient..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="sample_collected">Collected</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="hematology">Hematology</SelectItem>
                <SelectItem value="biochemistry">Biochemistry</SelectItem>
                <SelectItem value="microbiology">Microbiology</SelectItem>
                <SelectItem value="pathology">Pathology</SelectItem>
                <SelectItem value="immunology">Immunology</SelectItem>
                <SelectItem value="urine">Urine</SelectItem>
                <SelectItem value="serology">Serology</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.length > 0 ? filteredTests.map((test) => (
                    <TableRow key={test._id}>
                      <TableCell className="font-mono text-sm">{test.testId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.patient?.firstName} {test.patient?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{test.patient?.patientId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.testName}</p>
                          <p className="text-xs text-muted-foreground">{test.testCode}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{test.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={priorityColors[test.priority]} className="capitalize">
                          {test.priority === 'stat' && <AlertTriangle className="mr-1 h-3 w-3" />}
                          {test.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`capitalize ${test.sampleStatus === 'rejected' ? 'bg-destructive/10 text-destructive' : ''}`} variant="outline">
                          {test.sampleStatus?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[test.status]} variant="outline">
                          {test.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View Details" onClick={() => { setSelectedTest(test); setDetailsDialogOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {test.status === 'ordered' && permissions.canEdit && (
                            <Button variant="ghost" size="icon" title="Collect Sample" onClick={() => handleCollectSample(test._id)}>
                              <TestTubes className="h-4 w-4" />
                            </Button>
                          )}
                          {(test.status === 'completed' || test.status === 'verified') && (
                            <Button variant="ghost" size="icon" title="View Report" onClick={() => { setSelectedTest(test); setReportDialogOpen(true); }}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {!test.billed && test.status !== 'cancelled' && permissions.canCreate && (
                            <Button variant="ghost" size="icon" title="Generate Invoice" onClick={() => handleGenerateInvoice([test._id])}>
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                          {test.status === 'ordered' && permissions.canDelete && (
                            <Button variant="ghost" size="icon" title="Cancel" className="text-destructive" onClick={() => handleDelete(test._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No lab tests found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="samples">
          <SampleCollectionQueue tests={tests.filter(t => ['ordered', 'sample_collected'].includes(t.status))} onRefresh={fetchData} permissions={permissions} />
        </TabsContent>

        <TabsContent value="catalog">
          <LabCatalogManager permissions={permissions} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OrderLabTestDialog
        isOpen={orderDialogOpen}
        onClose={() => { setOrderDialogOpen(false); fetchData(); }}
        patients={patients}
        doctors={doctors}
      />
      <LabTestDetailsDialog
        isOpen={detailsDialogOpen}
        onClose={() => { setDetailsDialogOpen(false); fetchData(); }}
        test={selectedTest}
        permissions={permissions}
      />
      <LabReportDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        test={selectedTest}
      />
    </div>
  );
}
