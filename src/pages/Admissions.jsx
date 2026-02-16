import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  getAdmissions,
  getAdmissionStats,
  formatAdmissionData,
  getStatusColor,
  calculateLengthOfStay,
} from '@/lib/admissions';
import AdmissionForm from '@/components/dashboard/AdmissionForm';
import AdmissionActionModal from '@/components/dashboard/AdmissionActionModal';
import AdmissionTimeline from '@/components/dashboard/AdmissionTimeline';
import AdmissionDetailsModal from '@/components/dashboard/AdmissionDetailsModal';
import PrescriptionDialog from "@/components/pharmacy/PrescriptionDialog";
import PrescriptionHistoryDialog from "@/components/pharmacy/PrescriptionHistoryDialog";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import RestrictedAction from "@/components/permissions/RestrictedAction";
import {
  Plus,
  Search,
  Filter,
  Users,
  Bed,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  History,
  ArrowRight,
  LogOut,
  Eye,
  MoreVertical,
  ClipboardPlus,
} from 'lucide-react';

const statusColors = {
  ADMITTED: 'bg-blue-100 text-blue-900 border-blue-300',
  DISCHARGED: 'bg-green-100 text-green-900 border-green-300',
  TRANSFERRED: 'bg-purple-100 text-purple-900 border-purple-300',
  DECEASED: 'bg-red-100 text-red-900 border-red-300',
};

const statusIcons = {
  ADMITTED: <AlertCircle className="h-4 w-4" />,
  DISCHARGED: <CheckCircle className="h-4 w-4" />,
  TRANSFERRED: <Bed className="h-4 w-4" />,
  DECEASED: <AlertCircle className="h-4 w-4" />,
};

export default function AdmissionsPage() {
  const { canCreate } = useVisualAuth();
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionHistoryOpen, setPrescriptionHistoryOpen] = useState(false);
  const [prescriptionContext, setPrescriptionContext] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const [admissionsData, statsData] = await Promise.all([
        getAdmissions({ 
          status: statusFilter === 'all' ? undefined : statusFilter,
          page,
          limit: 10 
        }),
        getAdmissionStats(),
      ]);

      setAdmissions(admissionsData.data?.admissions || []);
      setStats(statsData.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load admissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, page]);

  const handleAdmissionCreated = (admission) => {
    setAdmissions([admission, ...admissions]);
    setShowAdmissionForm(false);
    toast({
      title: 'Success',
      description: `Admission ${admission.admissionId} created`,
    });
  };

  const handleActionComplete = (updatedAdmission) => {
    setAdmissions(
      admissions.map((a) =>
        a._id === updatedAdmission._id ? updatedAdmission : a
      )
    );
    setSelectedAdmission(null);
    loadData();
    toast({
      title: 'Success',
      description: 'Admission updated successfully',
    });
  };

  const filteredAdmissions = admissions.filter(
    (admission) =>
      admission.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admission.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admission.admissionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Admissions</h1>
          <p className="text-gray-500 mt-1">Manage patient beds and admissions</p>
        </div>
        {canCreate("admissions") && (
          <RestrictedAction module="admissions" feature="create">
            <Button size="lg" onClick={() => setShowAdmissionForm(true)}>
              <Plus className="mr-2 h-5 w-5" />
              New Admission
            </Button>
          </RestrictedAction>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Total Admissions
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">All time admissions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Currently Admitted
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admitted}</div>
              <p className="text-xs text-gray-500 mt-1">Active admissions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Discharged
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.discharged}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.occupancyRate}% occupancy
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Avg Length of Stay
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgLengthOfStay} days</div>
              <p className="text-xs text-gray-500 mt-1">Average LOS</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Admissions</TabsTrigger>
          <TabsTrigger value="discharged">Discharged</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <AdmissionsList
            admissions={filteredAdmissions.filter((a) => a.status === 'ADMITTED')}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedAdmission={selectedAdmission}
            setSelectedAdmission={setSelectedAdmission}
            setDetailsModalOpen={setDetailsModalOpen}
            onOpenPrescription={(admission) => {
              setPrescriptionContext(admission);
              setPrescriptionHistoryOpen(true);
            }}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="discharged" className="space-y-4">
          <AdmissionsList
            admissions={filteredAdmissions.filter((a) => a.status === 'DISCHARGED')}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedAdmission={selectedAdmission}
            setSelectedAdmission={setSelectedAdmission}
            setDetailsModalOpen={setDetailsModalOpen}
            onOpenPrescription={(admission) => {
              setPrescriptionContext(admission);
              setPrescriptionHistoryOpen(true);
            }}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <AdmissionsList
            admissions={filteredAdmissions}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedAdmission={selectedAdmission}
            setSelectedAdmission={setSelectedAdmission}
            setDetailsModalOpen={setDetailsModalOpen}
            onOpenPrescription={(admission) => {
              setPrescriptionContext(admission);
              setPrescriptionHistoryOpen(true);
            }}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAdmissionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AdmissionForm
              onAdmissionCreated={handleAdmissionCreated}
              onClose={() => setShowAdmissionForm(false)}
            />
          </div>
        </div>
      )}

      <AdmissionActionModal
        admission={selectedAdmission}
        isOpen={!!selectedAdmission}
        onClose={() => setSelectedAdmission(null)}
        onActionComplete={handleActionComplete}
      />

      <AdmissionDetailsModal
        admission={selectedAdmission}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />
      <PrescriptionDialog
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        initialPatientId={prescriptionContext?.patient?._id || ""}
        initialDoctorId={prescriptionContext?.doctor?._id || ""}
        initialAdmissionId={prescriptionContext?._id || ""}
        initialEncounterType={prescriptionContext?.patient?.registrationType || "ipd"}
      />
      <PrescriptionHistoryDialog
        open={prescriptionHistoryOpen}
        onOpenChange={setPrescriptionHistoryOpen}
        patient={prescriptionContext?.patient}
        onCreateNew={() => {
          setPrescriptionHistoryOpen(false);
          setPrescriptionOpen(true);
        }}
      />
    </div>
  );
}

function AdmissionsList({
  admissions,
  searchTerm,
  setSearchTerm,
  selectedAdmission,
  setSelectedAdmission,
  setDetailsModalOpen,
  onOpenPrescription,
  loading,
}) {
  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or admission ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admissions List */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : admissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bed className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No admissions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {admissions.map((admission) => (
            <AdmissionCard
              key={admission._id}
              admission={admission}
              isSelected={selectedAdmission?._id === admission._id}
              onSelect={() => setSelectedAdmission(admission)}
              onViewDetails={() => {
                setSelectedAdmission(admission);
                setDetailsModalOpen(true);
              }}
              onTransfer={() => setSelectedAdmission(admission)}
              onDischarge={() => setSelectedAdmission(admission)}
              onPrescription={() => onOpenPrescription(admission)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdmissionCard({ admission, isSelected, onSelect, onViewDetails, onTransfer, onDischarge, onPrescription }) {
  const formattedData = formatAdmissionData(admission);
  const statusColor = statusColors[admission.status];
  const statusIcon = statusIcons[admission.status];

  const handleViewDetails = (e) => {
    e.stopPropagation();
    onViewDetails();
  };

  const handleTransfer = (e) => {
    e.stopPropagation();
    onTransfer();
  };

  const handleDischarge = (e) => {
    e.stopPropagation();
    onDischarge();
  };
  const handlePrescription = (e) => {
    e.stopPropagation();
    onPrescription();
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Patient Info */}
          <div>
            <p className="text-sm font-medium text-gray-600">Patient</p>
            <p className="font-semibold">
              {admission.patient?.firstName} {admission.patient?.lastName}
            </p>
            <p className="text-xs text-gray-500">{admission.patient?.patientId}</p>
          </div>

          {/* Admission Info */}
          <div>
            <p className="text-sm font-medium text-gray-600">Admission</p>
            <p className="font-semibold">{admission.admissionId}</p>
            <p className="text-xs text-gray-500">
              {new Date(admission.admissionDate).toLocaleDateString()}
            </p>
          </div>

          {/* Registration Type */}
          <div>
            <p className="text-sm font-medium text-gray-600">Registration Type</p>
            <Badge variant="outline" className="mt-1 capitalize">
              {admission.patient?.registrationType || 'ipd'}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">
              {admission.bed?.bedType || 'N/A'}
            </p>
          </div>

          {/* Bed Info */}
          <div>
            <p className="text-sm font-medium text-gray-600">Current Bed</p>
            <p className="font-semibold">{admission.bed?.bedNumber}</p>
            <p className="text-xs text-gray-500">
              Floor {admission.bed?.floor} • Room {admission.bed?.roomNumber}
            </p>
          </div>

          {/* Status and Duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {statusIcon}
              <Badge className={`${statusColor} border`}>
                {admission.status}
              </Badge>
            </div>
            <div className="text-sm">
              <p className="font-medium">{formattedData.lengthOfStay} days</p>
              <p className="text-xs text-gray-500">Length of stay</p>
            </div>
          </div>
        </div>

        {/* Diagnosis and Doctor Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-sm font-medium text-gray-600">Diagnosis</p>
            <p className="text-sm text-gray-700 truncate">
              {admission.diagnosis?.primary ||
                (typeof admission.diagnosis === 'string' ? admission.diagnosis : 'Not specified')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Doctor</p>
            <p className="text-sm text-gray-700">
              {admission.doctor?.firstName} {admission.doctor?.lastName}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleViewDetails}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="View Full Details & History"
            >
              <History className="h-4 w-4 text-blue-600" />
            </button>
            <button
              onClick={handleViewDetails}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="View Details"
            >
              <Eye className="h-4 w-4 text-green-600" />
            </button>
            {admission.status === 'ADMITTED' && (
              <>
                <button
                  onClick={handlePrescription}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Create Prescription"
                >
                  <ClipboardPlus className="h-4 w-4 text-blue-600" />
                </button>
                <button
                  onClick={handleTransfer}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Transfer Bed"
                >
                  <ArrowRight className="h-4 w-4 text-orange-600" />
                </button>
                <button
                  onClick={handleDischarge}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Discharge"
                >
                  <LogOut className="h-4 w-4 text-red-600" />
                </button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}