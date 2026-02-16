import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getDashboard } from '@/lib/dashboard';
import { getAssignedPatients, getAssignedAppointments, handoverPatient } from '@/lib/nurse';
import { getMyTasks, getTasks, completeTask, updateTask } from '@/lib/tasks';
import { getVitalsFeed, updateVital as updateVitalApi, deleteVital as deleteVitalApi } from '@/lib/vitals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import QuickVitalDialog from '@/components/dashboard/QuickVitalDialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { getNurses } from '@/lib/users';
import { getBeds } from '@/lib/beds';
import { toast } from 'sonner';
import {
  Activity, Bed as BedIcon, Calendar, ClipboardList, Users, Heart, ArrowRightLeft,
  CheckCircle2, Clock, AlertTriangle, Search, Eye, UserPlus, XCircle, History,
  Thermometer, Stethoscope, Shield
} from 'lucide-react';
import PersonalPermissionsPanel from '@/components/permissions/PersonalPermissionsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [stats, setStats] = useState({ assignedPatients: 0, todaysAppointments: 0, recentVitals: 0 });
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isQuickVitalOpen, setIsQuickVitalOpen] = useState(false);
  const [isVitalsFeedOpen, setIsVitalsFeedOpen] = useState(false);
  const [defaultVitalPatientId, setDefaultVitalPatientId] = useState('');
  const [pendingVitalsTaskId, setPendingVitalsTaskId] = useState('');
  const [vitalSearch, setVitalSearch] = useState('');
  const [vitalPriority, setVitalPriority] = useState('all');
  const [vitalSort, setVitalSort] = useState('desc');
  const [vitalStartDate, setVitalStartDate] = useState('');
  const [vitalEndDate, setVitalEndDate] = useState('');
  const [editingVital, setEditingVital] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [handoverTarget, setHandoverTarget] = useState({});
  const [handoverLoading, setHandoverLoading] = useState({});

  const { data: nursesRes } = useQuery({ queryKey: ['nurses'], queryFn: () => getNurses(), enabled: !!user });
  const nurses = nursesRes?.data?.users || [];
  const initialSelectedNurse = location?.state?.selectedNurseId || '';
  const [selectedNurse, setSelectedNurse] = useState(initialSelectedNurse);
  const [nurseTasks, setNurseTasks] = useState([]);
  const { data: bedsRes } = useQuery({ queryKey: ['beds'], queryFn: getBeds });
  const allBeds = bedsRes?.data?.beds || [];

  const canSelectNurse = user && ['super_admin', 'hospital_admin', 'doctor', 'head_nurse'].includes(user.role);
  const isHeadNurse = user?.role === 'head_nurse';
  const nurseIdToQuery = canSelectNurse ? ((selectedNurse && selectedNurse !== 'all') ? selectedNurse : null) : null;
  const dashboardNurseScope = canSelectNurse ? (selectedNurse || (isHeadNurse ? 'all' : null)) : null;

  useEffect(() => {
    if (!canSelectNurse) return;
    const incomingNurseId = location?.state?.selectedNurseId;
    if (incomingNurseId) {
      setSelectedNurse(incomingNurseId);
      return;
    }
    if (!selectedNurse) setSelectedNurse('all');
  }, [canSelectNurse, location?.state?.selectedNurseId, selectedNurse]);

  const vitalsFeedQuery = useQuery({
    queryKey: ['vitals-feed', nurseIdToQuery || 'self', vitalSearch, vitalPriority, vitalSort, vitalStartDate, vitalEndDate],
    queryFn: () => getVitalsFeed({
      page: 1,
      limit: 200,
      search: vitalSearch,
      priority: vitalPriority,
      sort: vitalSort,
      startDate: vitalStartDate || undefined,
      endDate: vitalEndDate || undefined,
      recordedBy: nurseIdToQuery || undefined
    }),
    enabled: isVitalsFeedOpen
  });

  const completeMutation = useMutation({
    mutationFn: ({ id }) => completeTask(id),
    onSuccess: () => { toast.success('Task completed'); refreshData(); },
    onError: (err) => { toast.error(err?.message || 'Failed to complete task'); }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTask(id, { status }),
    onSuccess: () => { toast.success('Task updated'); refreshData(); }
  });

  const updateVitalMutation = useMutation({
    mutationFn: ({ id, payload }) => updateVitalApi(id, payload),
    onSuccess: () => {
      toast.success('Vital updated');
      setEditingVital(null);
      refreshData();
      if (isVitalsFeedOpen) vitalsFeedQuery.refetch();
    },
    onError: (err) => toast.error(err?.message || 'Failed to update vital')
  });

  const deleteVitalMutation = useMutation({
    mutationFn: (id) => deleteVitalApi(id),
    onSuccess: () => {
      toast.success('Vital deleted');
      refreshData();
      if (isVitalsFeedOpen) vitalsFeedQuery.refetch();
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete vital')
  });

  const handleCompleteTask = (task) => {
    if (task.type === 'vitals' && task.patient?._id) {
      setPendingVitalsTaskId(task._id);
      setDefaultVitalPatientId(task.patient._id);
      setIsQuickVitalOpen(true);
      return;
    }

    completeMutation.mutate({ id: task._id });
  };

  const refreshData = async () => {
    try {
      const [dashResult, patientsResult, appointmentsResult, tasksResult] = await Promise.allSettled([
        getDashboard('nurse', { nurseId: dashboardNurseScope || undefined }),
        getAssignedPatients(nurseIdToQuery),
        getAssignedAppointments(nurseIdToQuery),
        canSelectNurse
          ? (nurseIdToQuery ? getTasks({ assignedTo: nurseIdToQuery }) : getTasks({}))
          : getMyTasks(),
      ]);

      if (dashResult.status === 'fulfilled') {
        setStats(dashResult.value?.data || {});
      }
      if (patientsResult.status === 'fulfilled') {
        setPatients(patientsResult.value?.data || []);
      }
      if (appointmentsResult.status === 'fulfilled') {
        setAppointments(appointmentsResult.value?.data || []);
      }
      if (tasksResult.status === 'fulfilled') {
        const tasks = tasksResult.value?.data?.tasks || tasksResult.value?.data || [];
        setNurseTasks(Array.isArray(tasks) ? tasks : []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));
  }, [selectedNurse, user]);

  const handleHandover = async (patientId) => {
    const toNurseId = handoverTarget[patientId];
    if (!toNurseId) return;
    setHandoverLoading(prev => ({ ...prev, [patientId]: true }));
    try {
      await handoverPatient({ patientId, toNurseId });
      toast.success('Handover request sent');
      setHandoverTarget(prev => ({ ...prev, [patientId]: '' }));
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Handover failed');
    } finally {
      setHandoverLoading(prev => ({ ...prev, [patientId]: false }));
    }
  };

  const nurseForRooms = selectedNurse && selectedNurse !== 'all'
    ? nurses.find(n => n._id === selectedNurse)
    : nurses.find(n => n._id === (user?.id || user?._id));
  const assignedRooms = nurseForRooms?.assignedRooms || user?.assignedRooms || [];
  const bedsForRooms = allBeds.filter(b => assignedRooms.some(r => r.ward === b.ward && Number(r.floor) === Number(b.floor) && r.roomNumber === b.roomNumber));
  const bedsForNurse = allBeds.filter(b => (b.nurseInCharge?._id || b.nurseInCharge) === (selectedNurse && selectedNurse !== 'all' ? selectedNurse : (user?.id || user?._id)));
  const visibleBeds = Array.from(new Map([...bedsForRooms, ...bedsForNurse].map(b => [b._id, b])).values());

  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return patients;
    return patients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.patientId || '').toLowerCase().includes(q));
  }, [patients, searchQuery]);

  const pendingTasks = nurseTasks.filter(t => t.status === 'pending' || t.status === 'overdue');
  const inProgressTasks = nurseTasks.filter(t => t.status === 'in-progress');
  const completedTasks = nurseTasks.filter(t => t.status === 'completed');
  const vitalsFeed = vitalsFeedQuery.data?.data?.vitals || [];

  const priorityColor = (p) => {
    const map = { urgent: 'bg-destructive/10 text-destructive border-destructive', high: 'bg-destructive/10 text-destructive border-destructive', medium: 'bg-[hsl(var(--status-cleaning))]/10 text-[hsl(var(--status-cleaning))] border-[hsl(var(--status-cleaning))]', low: 'bg-[hsl(var(--status-available))]/10 text-[hsl(var(--status-available))] border-[hsl(var(--status-available))]' };
    return map[p] || map.medium;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading dashboard...</div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nurse Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || 'Nurse'} — {isHeadNurse ? 'Head Nurse' : 'Staff Nurse'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/nurse/patients')} variant="outline" size="sm">
            <Users className="mr-1.5 h-4 w-4" /> My Patients
          </Button>
          <Button onClick={() => setIsQuickVitalOpen(true)} size="sm">
            <Thermometer className="mr-1.5 h-4 w-4" /> Record Vital
          </Button>
        </div>
      </div>

      {/* Nurse selector */}
      {canSelectNurse && (
        <Card className="p-3">
          <div className="flex items-center gap-4">
            <Select value={selectedNurse} onValueChange={setSelectedNurse}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by nurse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nurses</SelectItem>
                {nurses.map(n => (
                  <SelectItem key={n._id} value={n._id}>{n.firstName} {n.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {selectedNurse && selectedNurse !== 'all' ? `Viewing: ${nurses.find(n => n._id === selectedNurse)?.firstName || ''} ${nurses.find(n => n._id === selectedNurse)?.lastName || ''}` : 'All Nurses'}
            </span>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Assigned Patients', value: patients.length, icon: Users, color: 'text-primary' },
          { label: "Today's Appointments", value: appointments.length, icon: Calendar, color: 'text-accent' },
          { label: 'Vitals (24h)', value: stats.recentVitals || 0, icon: Heart, color: 'text-destructive', clickable: true },
          { label: 'Pending Tasks', value: pendingTasks.length, icon: AlertTriangle, color: 'text-[hsl(var(--status-cleaning))]' },
          { label: 'Rooms Assigned', value: assignedRooms.length, icon: BedIcon, color: 'text-[hsl(var(--status-reserved))]' },
        ].map(kpi => (
          <Card
            key={kpi.label}
            className={kpi.clickable ? 'cursor-pointer hover:border-primary/40' : ''}
            onClick={kpi.clickable ? () => setIsVitalsFeedOpen(true) : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <span className="text-2xl font-bold">{kpi.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks <Badge variant="secondary" className="ml-1 text-xs">{nurseTasks.length}</Badge></TabsTrigger>
          <TabsTrigger value="patients" className="text-xs sm:text-sm">Patients</TabsTrigger>
          <TabsTrigger value="scheduler" className="text-xs sm:text-sm">Scheduler</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs sm:text-sm"><Shield className="h-3 w-3 mr-1" />Permissions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Patients */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Assigned Patients</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('patients')}><Eye className="h-4 w-4 mr-1" /> View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patients.slice(0, 6).map(p => (
                    <div key={p._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/patients/${p._id}`)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.patientId}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{p.status || 'active'}</Badge>
                    </div>
                  ))}
                  {patients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No patients assigned</p>}
                </div>
              </CardContent>
            </Card>

            {/* Today's Appointments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Today's Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {appointments.slice(0, 6).map(a => (
                    <div key={a._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{a.patient?.firstName} {a.patient?.lastName}</p>
                        <p className="text-xs text-muted-foreground">{a.doctor?.user?.firstName || a.doctor?.name} — {new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{a.status || 'scheduled'}</Badge>
                    </div>
                  ))}
                  {appointments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No appointments</p>}
                </div>
              </CardContent>
            </Card>

            {/* Rooms & Beds */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BedIcon className="h-4 w-4 text-muted-foreground" /> Rooms & Beds ({visibleBeds.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {visibleBeds.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {visibleBeds.map(b => (
                      <div key={b._id} className={`p-3 rounded-lg border ${b.status === 'available' ? 'border-[hsl(var(--status-available))]/30 bg-[hsl(var(--status-available))]/5' : b.status === 'occupied' ? 'border-[hsl(var(--status-occupied))]/30 bg-[hsl(var(--status-occupied))]/5' : 'border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{b.bedNumber}</span>
                          <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.ward} • Floor {b.floor} • Room {b.roomNumber || '-'}</p>
                        {b.currentPatient && (
                          <p className="text-xs mt-1 text-primary cursor-pointer" onClick={() => navigate(`/patients/${b.currentPatient._id}`)}>{b.currentPatient.firstName} {b.currentPatient.lastName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-4">No beds in assigned rooms</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-3 grid-cols-3 mb-4">
            <Card className="border-[hsl(var(--status-cleaning))]/30"><CardContent className="p-3 text-center"><p className="text-xl font-bold">{pendingTasks.length}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
            <Card className="border-primary/30"><CardContent className="p-3 text-center"><p className="text-xl font-bold">{inProgressTasks.length}</p><p className="text-xs text-muted-foreground">In Progress</p></CardContent></Card>
            <Card className="border-[hsl(var(--status-available))]/30"><CardContent className="p-3 text-center"><p className="text-xl font-bold">{completedTasks.length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
          </div>

          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            {['pending', 'in-progress', 'history'].map(status => (
              <TabsContent key={status} value={status} className="space-y-2 mt-3">
                {(status === 'pending' ? pendingTasks : status === 'in-progress' ? inProgressTasks : completedTasks).map(task => (
                  <Card key={task._id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{task.title}</span>
                            <Badge variant="outline" className={`text-xs ${priorityColor(task.priority)}`}>{task.priority}</Badge>
                            {task.type && <Badge variant="secondary" className="text-xs">{task.type}</Badge>}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {task.patient && <span>{task.patient.firstName} {task.patient.lastName}</span>}
                            {task.room && <span>Room: {task.room}</span>}
                            {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(task.dueDate).toLocaleString()}</span>}
                            {task.assignedTo && <span>→ {task.assignedTo.firstName} {task.assignedTo.lastName}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {task.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: task._id, status: 'in-progress' })}>Start</Button>
                          )}
                          {task.status === 'in-progress' && (
                            <Button size="sm" onClick={() => handleCompleteTask(task)}><CheckCircle2 className="h-3 w-3 mr-1" />Done</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(status === 'pending' ? pendingTasks : status === 'in-progress' ? inProgressTasks : completedTasks).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No {status === 'history' ? 'completed' : status} tasks</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Patients Tab with actions */}
        <TabsContent value="patients" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search patients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <span className="text-sm text-muted-foreground">{filteredPatients.length} patients</span>
          </div>
          <div className="space-y-2">
            {filteredPatients.map(p => (
              <Card key={p._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-muted-foreground">{p.patientId} • {p.phone || 'No phone'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.status || 'active'}</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${p._id}`)}><Eye className="h-3 w-3 mr-1" />View</Button>
                      <Button size="sm" variant="outline" onClick={() => { setIsQuickVitalOpen(true); }}><Thermometer className="h-3 w-3 mr-1" />Vital</Button>
                      {/* Handover */}
                      <div className="flex items-center gap-1">
                        <Select value={handoverTarget[p._id] || ''} onValueChange={v => setHandoverTarget(prev => ({ ...prev, [p._id]: v }))}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue placeholder="Transfer to" />
                          </SelectTrigger>
                          <SelectContent>
                            {nurses.filter(n => n._id !== (user?.id || user?._id)).map(n => (
                              <SelectItem key={n._id} value={n._id}>{n.firstName} {n.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="secondary" disabled={!handoverTarget[p._id] || handoverLoading[p._id]} onClick={() => handleHandover(p._id)}>
                          <ArrowRightLeft className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredPatients.length === 0 && <p className="text-center text-muted-foreground py-8">No patients found</p>}
          </div>
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Weekly Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const isToday = new Date().getDay() === (i === 6 ? 0 : i + 1);
                  return (
                    <div key={day} className={`p-3 rounded-lg border text-center ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p>
                      <p className="text-lg font-bold mt-1">{isToday ? appointments.length : '-'}</p>
                      <p className="text-[10px] text-muted-foreground">{isToday ? 'appointments' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Assigned Rooms</CardTitle></CardHeader>
              <CardContent>
                {assignedRooms.length > 0 ? (
                  <Table className="text-xs">
                    <TableHeader><TableRow><TableHead>Ward</TableHead><TableHead>Floor</TableHead><TableHead>Room</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {assignedRooms.map((r, i) => (
                        <TableRow key={i}><TableCell>{r.ward}</TableCell><TableCell>{r.floor}</TableCell><TableCell>{r.roomNumber}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">No rooms assigned</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Shift Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Patients Managed</span><span className="font-medium">{patients.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tasks Completed Today</span><span className="font-medium">{completedTasks.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vitals Recorded</span><span className="font-medium">{stats.recentVitals || 0}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending Tasks</span><span className="font-medium">{pendingTasks.length}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Permissions Tab (Head Nurse) */}
        <TabsContent value="permissions">
          <PersonalPermissionsPanel
            role={user?.role}
            userId={user?.id || user?._id}
            roleType="nurse"
          />
        </TabsContent>
      </Tabs>

      <QuickVitalDialog
        isOpen={isQuickVitalOpen}
        onClose={() => {
          setIsQuickVitalOpen(false);
          setDefaultVitalPatientId('');
          setPendingVitalsTaskId('');
        }}
        patients={patients}
        defaultPatientId={defaultVitalPatientId}
        onRecorded={() => {
          refreshData();
          if (isVitalsFeedOpen) vitalsFeedQuery.refetch();
          if (pendingVitalsTaskId) {
            completeMutation.mutate({ id: pendingVitalsTaskId });
          }
        }}
      />

      <Dialog open={isVitalsFeedOpen} onOpenChange={setIsVitalsFeedOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Vitals Feed</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Input
              placeholder="Search patient name or ID"
              value={vitalSearch}
              onChange={(e) => setVitalSearch(e.target.value)}
            />
            <Select value={vitalPriority} onValueChange={setVitalPriority}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Input type="datetime-local" value={vitalStartDate} onChange={(e) => setVitalStartDate(e.target.value)} />
            <Input type="datetime-local" value={vitalEndDate} onChange={(e) => setVitalEndDate(e.target.value)} />
            <Select value={vitalSort} onValueChange={setVitalSort}>
              <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {vitalsFeed.length} entries
          </div>

          <div className="max-h-[55vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>HR</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>SpO2</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitalsFeedQuery.isFetching && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Loading vitals...</TableCell></TableRow>
                )}
                {!vitalsFeedQuery.isFetching && vitalsFeed.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No vitals found for selected filters</TableCell></TableRow>
                )}
                {!vitalsFeedQuery.isFetching && vitalsFeed.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell>{new Date(v.recordedAt || v.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{v.patientName || `${v?.patient?.firstName || ''} ${v?.patient?.lastName || ''}`.trim()} ({v?.patient?.patientId || '-'})</TableCell>
                    <TableCell>{v?.heartRate?.value ?? '-'}</TableCell>
                    <TableCell>{v?.bloodPressure?.systolic ?? '-'} / {v?.bloodPressure?.diastolic ?? '-'}</TableCell>
                    <TableCell>{v?.temperature?.value ?? '-'}</TableCell>
                    <TableCell>{v?.oxygenSaturation?.value ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={v.priorityLabel === 'urgent' ? 'destructive' : v.priorityLabel === 'high' ? 'default' : 'secondary'}>
                        {v.priorityLabel || 'normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>{`${v?.recordedBy?.firstName || ''} ${v?.recordedBy?.lastName || ''}`.trim() || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingVital({
                            _id: v._id,
                            patientId: v?.patient?._id || '',
                            heartRate: v?.heartRate?.value ?? '',
                            systolic: v?.bloodPressure?.systolic ?? '',
                            diastolic: v?.bloodPressure?.diastolic ?? '',
                            temperature: v?.temperature?.value ?? '',
                            oxygenSaturation: v?.oxygenSaturation?.value ?? '',
                            respiratoryRate: v?.respiratoryRate?.value ?? '',
                            notes: v?.notes || ''
                          })}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const ok = window.confirm('Delete this vital record?');
                            if (ok) deleteVitalMutation.mutate(v._id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingVital} onOpenChange={(o) => { if (!o) setEditingVital(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vital</DialogTitle>
          </DialogHeader>
          {editingVital && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Input type="number" placeholder="Heart Rate" value={editingVital.heartRate} onChange={(e) => setEditingVital((p) => ({ ...p, heartRate: e.target.value }))} />
                <Input type="number" placeholder="Systolic" value={editingVital.systolic} onChange={(e) => setEditingVital((p) => ({ ...p, systolic: e.target.value }))} />
                <Input type="number" placeholder="Diastolic" value={editingVital.diastolic} onChange={(e) => setEditingVital((p) => ({ ...p, diastolic: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input type="number" step="0.1" placeholder="Temperature" value={editingVital.temperature} onChange={(e) => setEditingVital((p) => ({ ...p, temperature: e.target.value }))} />
                <Input type="number" placeholder="SpO2" value={editingVital.oxygenSaturation} onChange={(e) => setEditingVital((p) => ({ ...p, oxygenSaturation: e.target.value }))} />
                <Input type="number" placeholder="Respiratory Rate" value={editingVital.respiratoryRate} onChange={(e) => setEditingVital((p) => ({ ...p, respiratoryRate: e.target.value }))} />
              </div>
              <Input placeholder="Notes" value={editingVital.notes} onChange={(e) => setEditingVital((p) => ({ ...p, notes: e.target.value }))} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingVital(null)}>Cancel</Button>
                <Button
                  onClick={() => updateVitalMutation.mutate({
                    id: editingVital._id,
                    payload: {
                      patientId: editingVital.patientId,
                      heartRate: Number(editingVital.heartRate),
                      bloodPressure: `${Number(editingVital.systolic)}/${Number(editingVital.diastolic)}`,
                      temperature: Number(editingVital.temperature),
                      oxygenSaturation: Number(editingVital.oxygenSaturation),
                      respiratoryRate: Number(editingVital.respiratoryRate),
                      notes: editingVital.notes
                    }
                  })}
                  disabled={updateVitalMutation.isPending}
                >
                  {updateVitalMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
