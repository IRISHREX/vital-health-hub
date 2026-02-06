import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDashboard } from '@/lib/dashboard';
import { getAssignedPatients, getAssignedAppointments } from '@/lib/nurse';
import { getMyTasks, getTasks } from '@/lib/tasks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import QuickVitalDialog from '@/components/dashboard/QuickVitalDialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { getNurses } from '@/lib/users';
import { getBeds } from '@/lib/beds';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Bed as BedIcon, Calendar, ClipboardList, Users } from 'lucide-react';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({ assignedPatients: 0, todaysAppointments: 0, recentVitals: 0 });
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isQuickVitalOpen, setIsQuickVitalOpen] = useState(false);

  const { data: nursesRes } = useQuery({ queryKey: ['nurses'], queryFn: () => getNurses(), enabled: !!user });
  const nurses = nursesRes?.data?.users || [];
  const [selectedNurse, setSelectedNurse] = useState('');
  const [nurseTasks, setNurseTasks] = useState([]);
  const { data: bedsRes } = useQuery({ queryKey: ['beds'], queryFn: getBeds });
  const allBeds = bedsRes?.data?.beds || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const canQueryOtherNurse = ['super_admin','hospital_admin','doctor','head_nurse'].includes(user?.role);
        const nurseIdToQuery = canQueryOtherNurse
          ? ((selectedNurse && selectedNurse !== 'all') ? selectedNurse : null)
          : null;

        const [dashRes, patientsRes, appointmentsRes, tasksRes] = await Promise.all([
          getDashboard('nurse'),
          getAssignedPatients(nurseIdToQuery),
          getAssignedAppointments(nurseIdToQuery),
          // If we have a nurseId and current user is admin/doctor, request tasks for that nurse. Otherwise, if current user is nurse, get my tasks.
          (nurseIdToQuery && canQueryOtherNurse) ? getTasks({ assignedTo: nurseIdToQuery }) : getMyTasks(),
        ]);

        setStats(dashRes.data || {});
        setPatients(patientsRes.data || []);
        setAppointments(appointmentsRes.data || []);

        // Normalize tasks response
        const tasks = tasksRes?.data?.tasks || tasksRes?.data || tasksRes?.data?.length ? (tasksRes.data.tasks || tasksRes.data) : [];
        setNurseTasks(tasks);
        setMyTasksCount(Array.isArray(tasks) ? tasks.length : (tasksRes?.data?.length || 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedNurse, user]);

  // Show nurse selector for admins and doctors
  const canSelectNurse = user && (['super_admin','hospital_admin','doctor','head_nurse'].includes(user.role));
  const nurseForRooms = selectedNurse && selectedNurse !== 'all'
    ? nurses.find(n => n._id === selectedNurse)
    : nurses.find(n => n._id === (user?.id || user?._id));
  const assignedRooms = nurseForRooms?.assignedRooms || user?.assignedRooms || [];
  const bedsForRooms = allBeds.filter((b) => assignedRooms.some((r) =>
    r.ward === b.ward &&
    Number(r.floor) === Number(b.floor) &&
    r.roomNumber === b.roomNumber
  ));
  const bedsForNurse = allBeds.filter((b) =>
    (b.nurseInCharge?._id || b.nurseInCharge) === (selectedNurse && selectedNurse !== 'all' ? selectedNurse : (user?.id || user?._id))
  );
  const visibleBeds = Array.from(new Map(
    [...bedsForRooms, ...bedsForNurse].map((b) => [b._id, b])
  ).values());


  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nurse Dashboard</h1>
          <p className="text-sm text-muted-foreground">Assigned tasks and quick actions for nurses</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/nurse/patients')}>View Patients</Button>
          <Button onClick={() => navigate('/patients')}>All Patients</Button>
          <Button variant="secondary" onClick={() => setIsQuickVitalOpen(true)}>Quick Record Vital</Button>
        </div>
      </div>

      {/* Nurse selector for admins and doctors */}
      {canSelectNurse && (
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select value={selectedNurse} onValueChange={(val) => setSelectedNurse(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by nurse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nurses</SelectItem>
                {nurses.map((n) => (
                  <SelectItem key={n._id} value={n._id}>{n.firstName} {n.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">Showing data for: {selectedNurse && selectedNurse !== 'all' ? (nurses.find(n => n._id === selectedNurse)?.firstName + ' ' + nurses.find(n => n._id === selectedNurse)?.lastName) : 'All Nurses'}</div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              Assigned Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.assignedPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.todaysAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Vitals in last 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.recentVitals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{myTasksCount}</div>
            <div className="mt-3">
              <Button onClick={() => navigate('/tasks')}>View Tasks</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                Assigned Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patients.length > 0 ? (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map(p => (
                      <TableRow key={p._id} onClick={() => navigate(`/patients/${p._id}`)} className="cursor-pointer">
                        <TableCell className="py-2">{p.firstName} {p.lastName}</TableCell>
                        <TableCell className="py-2">{p.patientId}</TableCell>
                        <TableCell className="py-2">{p.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">No patients assigned</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Tasks
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => navigate(selectedNurse && selectedNurse !== 'all' ? `/tasks?assignedTo=${selectedNurse}` : '/tasks')}>
                  Manage Tasks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {nurseTasks.length > 0 ? (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nurseTasks.map((t) => (
                      <TableRow key={t._id} className="cursor-pointer">
                        <TableCell className="py-2">{t.title}</TableCell>
                        <TableCell className="py-2">{t.priority}</TableCell>
                        <TableCell className="py-2">{t.status}</TableCell>
                        <TableCell className="py-2">{t.dueDate ? new Date(t.dueDate).toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">No tasks</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BedIcon className="h-4 w-4 text-muted-foreground" />
                My Rooms & Beds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="rooms" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rooms">Assigned Rooms</TabsTrigger>
                  <TabsTrigger value="beds">Beds in Rooms</TabsTrigger>
                </TabsList>

                <TabsContent value="rooms" className="mt-4">
                  {assignedRooms.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ward</TableHead>
                          <TableHead>Floor</TableHead>
                          <TableHead>Room</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedRooms.map((r, idx) => (
                          <TableRow key={`${r.ward}-${r.floor}-${r.roomNumber}-${idx}`}>
                            <TableCell className="py-2">{r.ward}</TableCell>
                            <TableCell className="py-2">{r.floor}</TableCell>
                            <TableCell className="py-2">{r.roomNumber}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">No rooms assigned</div>
                  )}
                </TabsContent>

                <TabsContent value="beds" className="mt-4">
                  {visibleBeds.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bed</TableHead>
                          <TableHead>Ward</TableHead>
                          <TableHead>Floor</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Patient</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleBeds.map((b) => (
                          <TableRow
                            key={b._id}
                            className={b.currentPatient ? "cursor-pointer" : ""}
                            onClick={() => {
                              if (b.currentPatient?._id) {
                                navigate(`/patients/${b.currentPatient._id}`);
                              }
                            }}
                          >
                            <TableCell className="py-2">{b.bedNumber}</TableCell>
                            <TableCell className="py-2">{b.ward}</TableCell>
                            <TableCell className="py-2">{b.floor}</TableCell>
                            <TableCell className="py-2">{b.roomNumber || '-'}</TableCell>
                            <TableCell className="py-2">{b.status}</TableCell>
                            <TableCell className="py-2">
                              {b.currentPatient ? `${b.currentPatient.firstName} ${b.currentPatient.lastName}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">No beds found for assigned rooms</div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Today's Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map(a => (
                      <TableRow key={a._id}>
                        <TableCell className="py-2">{a.patient.firstName} {a.patient.lastName}</TableCell>
                        <TableCell className="py-2">{a.doctor.user?.firstName || a.doctor.name}</TableCell>
                        <TableCell className="py-2">{new Date(a.appointmentDate).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">No appointments assigned</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <QuickVitalDialog isOpen={isQuickVitalOpen} onClose={() => setIsQuickVitalOpen(false)} patients={patients} />
    </div>
  );
}
