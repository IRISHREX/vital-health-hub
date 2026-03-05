import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, getMyTasks, completeTask } from '@/lib/tasks';
import { useAuth } from '@/lib/AuthContext';
import { useVisualAuth } from '@/hooks/useVisualAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import AssignTaskDialog from '@/components/tasks/AssignTaskDialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, Pill, Activity, FileText, CheckCircle2, Clock } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import RestrictedAction from '@/components/permissions/RestrictedAction';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Tasks() {
  const { user } = useAuth();
  const { canCreate } = useVisualAuth();
  const canListAllTasks = ['hospital_admin', 'super_admin', 'doctor'].includes(user?.role);
  const canCreateTask = canCreate('tasks');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: tasksData } = useQuery({
    queryKey: canListAllTasks ? ['tasks'] : ['tasks','my'],
    queryFn: () => (canListAllTasks ? getTasks() : getMyTasks()),
  });

  const tasks = canListAllTasks ? (tasksData?.data?.tasks || []) : (tasksData?.data || []);

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }) => completeTask(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks','my'] });
    },
  });

  const filtered = (tasks || []).filter((task) => {
    const matchesType = filterType === 'all' || task.type === filterType;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesType && matchesPriority;
  });

  const pending = filtered.filter(t => t.status === 'pending' || t.status === 'overdue');
  const inProgress = filtered.filter(t => t.status === 'in-progress');
  const completed = filtered.filter(t => t.status === 'completed');

  const toggleComplete = (id) => {
    completeMutation.mutate({ id });
  };

  const typeIcons = {
    medication: Pill,
    vitals: Activity,
    documentation: FileText,
    procedure: ClipboardList,
    discharge: CheckCircle2,
    other: Clock,
  };

  const priorityStyles = {
    high: 'bg-status-critical/10 text-status-critical border-status-critical',
    medium: 'bg-status-warning/10 text-status-warning border-status-warning',
    low: 'bg-status-normal/10 text-status-normal border-status-normal',
    critical: 'bg-status-critical/10 text-status-critical border-status-critical',
  };

  const statusStyles = {
    pending: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Pending' },
    'in-progress': { bg: 'bg-primary/10', text: 'text-primary', label: 'In Progress' },
    completed: { bg: 'bg-status-normal/10', text: 'text-status-normal', label: 'Completed' },
    overdue: { bg: 'bg-status-critical/10', text: 'text-status-critical', label: 'Overdue' },
  };

  const TaskCard = ({ task }) => {
    const TypeIcon = typeIcons[task.type] || ClipboardList;
    const pStyle = priorityStyles[task.priority] || priorityStyles.medium;
    const sStyle = statusStyles[task.status] || statusStyles.pending;

    return (
      <Card className={`${task.status === 'overdue' ? 'border-status-critical/50' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Checkbox checked={task.status === 'completed'} onCheckedChange={() => toggleComplete(task._id)} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate">{task.title}</span>
                <Badge variant="outline" className={`text-xs ${pStyle}`}>{task.priority}</Badge>
                <Badge className={`text-xs ${sStyle.bg} ${sStyle.text}`}>{sStyle.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {task.patient && <div>{task.patient.firstName} {task.patient.lastName}</div>}
                {task.room && <div>{task.room}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage tasks and assignments</p>
        </div>
        <div className="flex gap-2">
          {canCreateTask && (
            <RestrictedAction module="tasks" feature="create">
              <Button onClick={() => setIsAssignOpen(true)}>New Task</Button>
            </RestrictedAction>
          )}
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-3"> 
            <p className="text-xl font-bold">{(tasks || []).length}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3"> 
            <p className="text-xl font-bold">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3"> 
            <p className="text-xl font-bold">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3"> 
            <p className="text-xl font-bold">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(e) => setFilterType(e)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="medication">Medication</SelectItem>
              <SelectItem value="vitals">Vitals</SelectItem>
              <SelectItem value="documentation">Documentation</SelectItem>
              <SelectItem value="procedure">Procedure</SelectItem>
              <SelectItem value="discharge">Discharge</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={filterPriority} onValueChange={(e) => setFilterPriority(e)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="pending" className="gap-1 sm:gap-2 text-xs sm:text-sm">Pending <Badge variant="secondary" className="ml-1 text-xs">{pending.length}</Badge></TabsTrigger>
          <TabsTrigger value="in-progress" className="gap-1 sm:gap-2 text-xs sm:text-sm">In Progress <Badge variant="secondary" className="ml-1 text-xs">{inProgress.length}</Badge></TabsTrigger>
          <TabsTrigger value="completed" className="gap-1 sm:gap-2 text-xs sm:text-sm">Done <Badge variant="secondary" className="ml-1 text-xs">{completed.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pending.length > 0 ? pending.map(t => <TaskCard key={t._id} task={t} />) : <div className="text-center py-8 text-muted-foreground">No pending tasks</div>}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-3">
          {inProgress.length > 0 ? inProgress.map(t => <TaskCard key={t._id} task={t} />) : <div className="text-center py-8 text-muted-foreground">No tasks in progress</div>}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completed.length > 0 ? completed.map(t => <TaskCard key={t._id} task={t} />) : <div className="text-center py-8 text-muted-foreground">No completed tasks</div>}
        </TabsContent>
      </Tabs>

      {canCreateTask && <AssignTaskDialog open={isAssignOpen} onOpenChange={setIsAssignOpen} />}
    </div>
  );
}
