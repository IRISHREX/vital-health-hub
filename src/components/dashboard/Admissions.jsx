import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Bed, CheckCircle, TrendingUp, Clock, AlertCircle, Loader2, Search, Filter, Plus, Calendar, Activity, DollarSign } from 'lucide-react';
import { getAdmissions, getAdmissionStats } from '@/lib/admissions';
import { toast } from '@/hooks/use-toast';
import AdmissionForm from './AdmissionForm';
import AdmissionActionModal from './AdmissionActionModal';
import AdmissionTimeline from './AdmissionTimeline';
import BedUtilizationGrid from './BedUtilizationGrid';

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showBedGrid, setShowBedGrid] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [admissionsData, statsData] = await Promise.all([
        getAdmissions({ limit: 50 }),
        getAdmissionStats(),
      ]);

      setAdmissions(admissionsData || []);
      setStats(statsData || {});
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

  const filteredAdmissions = admissions.filter((admission) => {
    const matchesSearch =
      admission.patient?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admission.patient?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admission.patient?.patientId.includes(searchTerm) ||
      admission.admissionId.includes(searchTerm);

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && admission.status === 'ADMITTED') ||
      (activeTab === 'discharged' && admission.status === 'DISCHARGED');

    return matchesSearch && matchesTab;
  });

  const statusColors = {
    ADMITTED: 'bg-blue-100 text-blue-800 border-blue-300',
    DISCHARGED: 'bg-green-100 text-green-800 border-green-300',
    TRANSFERRED: 'bg-purple-100 text-purple-800 border-purple-300',
    DECEASED: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusIcons = {
    ADMITTED: <Activity className="h-3 w-3" />,
    DISCHARGED: <CheckCircle className="h-3 w-3" />,
    TRANSFERRED: <Bed className="h-3 w-3" />,
    DECEASED: <AlertCircle className="h-3 w-3" />,
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Patient Admissions</h1>
          <p className="text-gray-600 mt-2 text-lg">Manage patient beds, admissions, and hospital operations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowBedGrid(true)}
            className="gap-2"
          >
            <Bed className="h-5 w-5" />
            Bed Utilization
          </Button>
          <Button size="lg" onClick={() => setShowAdmissionForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5" />
            New Admission
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Admissions</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalAdmissions || 0}</div>
            <p className="text-xs text-gray-600 mt-2">All time admissions</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Active Beds</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.activeAdmissions || 0}</div>
            <p className="text-xs text-gray-600 mt-2">Current inpatients</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Discharged</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.dischargedAdmissions || 0}</div>
            <p className="text-xs text-gray-600 mt-2">This month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Avg. Stay</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.avgLengthOfStay || 0}</div>
            <p className="text-xs text-gray-600 mt-2">Days on average</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Revenue</CardTitle>
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">₹{stats?.totalRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-gray-600 mt-2">Total billing</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by patient name, ID, or admission ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Button variant="outline" className="gap-2 h-10">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </Button>
            <Button variant="outline" className="gap-2 h-10" onClick={() => loadData()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="active" className="gap-2">
                <Activity className="h-4 w-4" />
                Active ({admissions.filter(a => a.status === 'ADMITTED').length})
              </TabsTrigger>
              <TabsTrigger value="discharged" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Discharged ({admissions.filter(a => a.status === 'DISCHARGED').length})
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" />
                All ({admissions.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredAdmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg text-gray-600 font-medium">No admissions found</p>
                <p className="text-gray-500 mt-2">
                  {activeTab === 'all' ? 'Get started by creating a new admission.' : `No ${activeTab} admissions at the moment.`}
                </p>
                {activeTab === 'all' && (
                  <Button
                    className="mt-4 gap-2"
                    onClick={() => setShowAdmissionForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Create Admission
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredAdmissions.map((admission) => (
                  <Card
                    key={admission._id}
                    className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                    onClick={() => {
                      setSelectedAdmission(admission);
                      setShowActionModal(true);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {admission.patient?.firstName} {admission.patient?.lastName}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            Admission: {admission.admissionId}
                          </p>
                        </div>
                        <Badge className={`${statusColors[admission.status]} border flex items-center gap-1`}>
                          {statusIcons[admission.status]}
                          {admission.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Patient & Bed Info */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase">Patient ID</p>
                          <p className="font-medium text-gray-900 mt-1">{admission.patient?.patientId}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase">Bed</p>
                          <p className="font-medium text-gray-900 mt-1">{admission.bed?.bedNumber}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase">Ward</p>
                          <p className="font-medium text-gray-900 mt-1">{admission.bed?.ward}</p>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-600">Admitted</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(admission.admissionDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <div>
                            <p className="text-xs text-gray-600">Duration</p>
                            <p className="text-sm font-medium text-gray-900">
                              {Math.ceil(
                                (new Date(admission.dischargeDate || new Date()) -
                                  new Date(admission.admissionDate)) /
                                  (1000 * 60 * 60 * 24)
                              )}{' '}
                              days
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Diagnosis */}
                      {admission.diagnosis?.primary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 mb-1">DIAGNOSIS</p>
                          <p className="text-sm font-medium text-blue-900">{admission.diagnosis.primary}</p>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdmission(admission);
                          setShowActionModal(true);
                        }}
                      >
                        View & Manage
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Modals */}
      <Dialog open={showAdmissionForm} onOpenChange={setShowAdmissionForm}>
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <AdmissionForm
            onAdmissionCreated={(newAdmission) => {
              setAdmissions([newAdmission, ...admissions]);
              setShowAdmissionForm(false);
            }}
            onClose={() => setShowAdmissionForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showBedGrid} onOpenChange={setShowBedGrid}>
        <DialogContent className="max-w-6xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bed Utilization Dashboard</DialogTitle>
          </DialogHeader>
          <BedUtilizationGrid />
        </DialogContent>
      </Dialog>

      {selectedAdmission && (
        <AdmissionActionModal
          admission={selectedAdmission}
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedAdmission(null);
          }}
          onActionComplete={() => {
            loadData();
            setShowActionModal(false);
          }}
        />
      )}
    </div>
  );
}
