import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createTask } from '@/lib/tasks';
import { getNurses } from '@/lib/users';
import { getPatients } from '@/lib/patients';
import { useToast } from '@/hooks/use-toast';

export default function AssignTaskDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: nursesData } = useQuery({ queryKey: ['nurses'], queryFn: getNurses });
  const { data: patientsData } = useQuery({ queryKey: ['patients'], queryFn: getPatients });

  const nurses = nursesData?.data?.users || [];
  const patients = patientsData?.data?.patients || [];

  const [taskType, setTaskType] = useState('vitals');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => createTask(payload),
    onSuccess: (data) => {
      toast({ title: 'Task created', description: data?.data?.title || 'Task created successfully' });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
      onOpenChange(false);
      // reset
      setTaskType('vitals');
      setPriority('medium');
      setAssignedTo('');
      setPatientId('');
      setTitle('');
      setDescription('');
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to create task' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: title || `${taskType} task for ${patientId}`,
      description,
      type: taskType,
      priority,
      assignedTo: assignedTo || null,
      patient: patientId || null,
      dueDate: dueDate || null,
      room: '',
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign New Task</DialogTitle>
          <DialogDescription>Create and assign a task to a nurse or staff member</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitals">Vital Signs</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="discharge">Discharge</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Record vitals" />
          </div>

          <div>
            <Label>Assign to Nurse</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select nurse" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((n) => (
                  <SelectItem key={n._id} value={n._id}>{n.firstName} {n.lastName} ({n.role || 'Nurse'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Patient (optional)</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Due Date</Label>
            <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Assigning...' : 'Assign Task'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}