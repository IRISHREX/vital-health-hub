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

export default function NurseDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({ assignedPatients: 0, todaysAppointments: 0, recentVitals: 0 });
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isQuickVitalOpen, setIsQuickVitalOpen] = useState(false);

  const { data: nursesRes } = useQuery({ queryKey: ['nurses'], queryFn: () => getNurses(), enabled: !!user && (['super_admin','hospital_admin','doctor'].includes(user.role)) });
  const nurses = nursesRes?.data?.users || [];
  const [selectedNurse, setSelectedNurse] = useState(user?.role === 'nurse' ? user._id : '');
  const [nurseTasks, setNurseTasks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Determine which nurse to query: selectedNurse (for admin/doctor) or current user
        const nurseIdToQuery = (selectedNurse && selectedNurse !== 'all') ? selectedNurse : (user?.role === 'nurse' ? user._id : null);

        const [dashRes, patientsRes, appointmentsRes, tasksRes] = await Promise.all([
          getDashboard('nurse'),
          getAssignedPatients(nurseIdToQuery),
          getAssignedAppointments(nurseIdToQuery),
          // If we have a nurseId and current user is admin/doctor, request tasks for that nurse. Otherwise, if current user is nurse, get my tasks.
          (nurseIdToQuery && (['super_admin','hospital_admin','doctor'].includes(user?.role))) ? getTasks({ assignedTo: nurseIdToQuery }) : getMyTasks(),
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
  const canSelectNurse = user && (['super_admin','hospital_admin','doctor'].includes(user.role));


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

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Assigned Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vitals in last 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentVitals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasksCount}</div>
            <div className="mt-3">
              <Button onClick={() => navigate('/tasks')}>View Tasks</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {patients.length > 0 ? (
            <Table>
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
                    <TableCell>{p.firstName} {p.lastName}</TableCell>
                    <TableCell>{p.patientId}</TableCell>
                    <TableCell>{p.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div>No patients assigned</div>
          )}
        </CardContent>
      </Card>

      {/* Nurse tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            <div>
              <Button size="sm" variant="outline" onClick={() => navigate(selectedNurse && selectedNurse !== 'all' ? `/tasks?assignedTo=${selectedNurse}` : '/tasks')}>Manage Tasks</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {nurseTasks.length > 0 ? (
            <Table>
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
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.priority}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div>No tasks</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <Table>
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
                    <TableCell>{a.patient.firstName} {a.patient.lastName}</TableCell>
                    <TableCell>{a.doctor.user?.firstName || a.doctor.name}</TableCell>
                    <TableCell>{new Date(a.appointmentDate).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div>No appointments assigned</div>
          )}
        </CardContent>
      </Card>

      <QuickVitalDialog isOpen={isQuickVitalOpen} onClose={() => setIsQuickVitalOpen(false)} patients={patients} />
    </div>
  );
}
