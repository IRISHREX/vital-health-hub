import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users as UsersIcon,
  Stethoscope, Lock, Trash2, Check, X, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useVisualAuth } from '@/hooks/useVisualAuth';
import { getUsers } from '@/lib/users';
import { getDoctors } from '@/lib/doctors';
import { getPatients } from '@/lib/patients';
import {
  listEvents, createEvent, updateEvent, deleteEvent, respondInvite,
  createBlock, getDoctorSlots, bookAppointment, ALLOWED_DURATIONS,
} from '@/lib/scheduler';

// ─── helpers ────────────────────────────────────────────────────────────────
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const addDays    = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const sameDay    = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const fmtDate    = (d) => new Date(d).toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short' });
const fmtTime    = (d) => new Date(d).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
const toLocalInput = (d) => {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2,'0');
  return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

const KIND_META = {
  meeting:    { label: 'Meeting',     color: 'bg-primary/15 text-primary border-primary/30' },
  block:      { label: 'Blocked',     color: 'bg-destructive/15 text-destructive border-destructive/30' },
  task:       { label: 'Task',        color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  appointment:{ label: 'Appointment', color: 'bg-accent/15 text-accent border-accent/30' },
  personal:   { label: 'Personal',    color: 'bg-muted text-foreground border-border' },
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Scheduler() {
  const { user } = useAuth();
  const { canCreate } = useVisualAuth();
  const allowedToBook = canCreate('scheduler');
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView]   = useState('week'); // month | week | day
  const [anchor, setAnchor] = useState(new Date());
  const [openEvent, setOpenEvent] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [openBook, setOpenBook]   = useState(false);
  const [detail, setDetail]       = useState(null);

  // Window
  const [from, to] = useMemo(() => {
    if (view === 'day') return [startOfDay(anchor), endOfDay(anchor)];
    if (view === 'week') {
      const start = addDays(anchor, -anchor.getDay());
      return [startOfDay(start), endOfDay(addDays(start, 6))];
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last  = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return [startOfDay(addDays(first, -first.getDay())), endOfDay(addDays(last, 6 - last.getDay()))];
  }, [view, anchor]);

  const { data: eventsRes, isLoading } = useQuery({
    queryKey: ['scheduler-events', from.toISOString(), to.toISOString()],
    queryFn: () => listEvents(from, to),
  });
  const events = eventsRes?.data || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['scheduler-events'] });

  const saveMut = useMutation({
    mutationFn: (payload) => editing?._id && !String(editing._id).includes('__')
      ? updateEvent(editing._id, payload)
      : createEvent(payload),
    onSuccess: () => {
      invalidate(); setOpenEvent(false); setEditing(null);
      toast({ title: editing?._id ? 'Event updated' : 'Event created' });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteEvent(String(id).split('__')[0]),
    onSuccess: () => { invalidate(); setDetail(null); toast({ title: 'Event removed' }); },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const respondMut = useMutation({
    mutationFn: ({ id, status }) => respondInvite(String(id).split('__')[0], status),
    onSuccess: () => { invalidate(); toast({ title: 'Response sent' }); },
  });

  // ─── Header / nav ─────────────────────────────────────────────────────────
  const stepBack    = () => setAnchor(view === 'day' ? addDays(anchor, -1) : view === 'week' ? addDays(anchor, -7) : new Date(anchor.getFullYear(), anchor.getMonth()-1, 1));
  const stepForward = () => setAnchor(view === 'day' ? addDays(anchor, 1)  : view === 'week' ? addDays(anchor, 7)  : new Date(anchor.getFullYear(), anchor.getMonth()+1, 1));

  const headerLabel = useMemo(() => {
    if (view === 'day') return anchor.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (view === 'week') {
      const start = addDays(anchor, -anchor.getDay());
      const end = addDays(start, 6);
      return `${fmtDate(start)} – ${fmtDate(end)}`;
    }
    return anchor.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  }, [view, anchor]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-1">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" /> Scheduler
          </h1>
          <p className="text-sm text-muted-foreground">Global calendar — meetings, blocks, tasks & appointments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stepBack}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setAnchor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stepForward}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="h-9">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          {allowedToBook && (
            <>
              <Button variant="outline" size="sm" onClick={() => setOpenBook(true)}>
                <Stethoscope className="mr-1.5 h-4 w-4" /> Book appointment
              </Button>
              <Button size="sm" onClick={() => { setEditing(null); setOpenEvent(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> New event
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">{headerLabel}</div>

      {/* Calendar body */}
      <Card className="p-2 overflow-x-auto">
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded bg-muted/50" />)}
          </div>
        ) : view === 'month' ? (
          <MonthGrid anchor={anchor} from={from} events={events} onPick={setDetail} />
        ) : view === 'week' ? (
          <WeekGrid anchor={anchor} events={events} onPick={setDetail} />
        ) : (
          <DayList date={anchor} events={events} onPick={setDetail} />
        )}
      </Card>

      {/* Event details dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline" className={KIND_META[detail.kind]?.color}>
                    {KIND_META[detail.kind]?.label || detail.kind}
                  </Badge>
                  {detail.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {fmtDate(detail.start)} • {fmtTime(detail.start)} – {fmtTime(detail.end)}
                </div>
                {detail.location && <div>📍 {detail.location}</div>}
                {detail.description && <p className="whitespace-pre-wrap">{detail.description}</p>}
                {detail.createdBy?.name && <div className="text-xs text-muted-foreground">Created by {detail.createdBy.name}</div>}
                {detail.attendees?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Attendees</div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.attendees.map((a) => (
                        <Badge key={a.user?._id || a.user} variant="secondary" className="text-xs">
                          {a.user?.name || 'User'} · {a.status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Invitee response */}
                {detail.attendees?.some((a) => String(a.user?._id || a.user) === String(user?._id || user?.id)) && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => respondMut.mutate({ id: detail._id, status: 'accepted' })}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondMut.mutate({ id: detail._id, status: 'tentative' })}>
                      Tentative
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondMut.mutate({ id: detail._id, status: 'declined' })}>
                      <X className="mr-1 h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                {allowedToBook && !String(detail._id).includes('__') && (
                  <>
                    <Button variant="outline" onClick={() => { setEditing(detail); setOpenEvent(true); setDetail(null); }}>
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={() => deleteMut.mutate(detail._id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Event create/edit dialog */}
      <EventDialog
        open={openEvent}
        onClose={() => { setOpenEvent(false); setEditing(null); }}
        editing={editing}
        onSubmit={(p) => saveMut.mutate(p)}
        submitting={saveMut.isPending}
      />

      {/* Quick-book appointment dialog */}
      <BookAppointmentDialog open={openBook} onClose={() => setOpenBook(false)} onBooked={invalidate} />
    </div>
  );
}

// ─── MONTH ──────────────────────────────────────────────────────────────────
function MonthGrid({ anchor, from, events, onPick }) {
  const cells = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const monthIdx = anchor.getMonth();
  return (
    <div>
      <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const items = events.filter((e) => sameDay(e.start, day)).slice(0, 3);
          const more = events.filter((e) => sameDay(e.start, day)).length - items.length;
          const inMonth = day.getMonth() === monthIdx;
          const today = sameDay(day, new Date());
          return (
            <div key={day.toISOString()}
              className={`min-h-24 rounded border border-border p-1.5 ${inMonth ? 'bg-background' : 'bg-muted/40 text-muted-foreground'} ${today ? 'ring-2 ring-primary/40' : ''}`}>
              <div className="text-xs font-medium mb-1">{day.getDate()}</div>
              <div className="space-y-1">
                {items.map((e) => (
                  <button key={e._id} onClick={() => onPick(e)}
                    className={`w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${KIND_META[e.kind]?.color}`}>
                    {fmtTime(e.start)} {e.title}
                  </button>
                ))}
                {more > 0 && <div className="text-[10px] text-muted-foreground">+{more} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEEK ───────────────────────────────────────────────────────────────────
function WeekGrid({ anchor, events, onPick }) {
  const start = addDays(anchor, -anchor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayEvents = events.filter((e) => sameDay(e.start, day))
          .sort((a, b) => new Date(a.start) - new Date(b.start));
        const today = sameDay(day, new Date());
        return (
          <div key={day.toISOString()}
            className={`min-h-[260px] rounded border border-border p-2 ${today ? 'ring-2 ring-primary/40' : ''}`}>
            <div className="mb-2 text-xs font-medium">
              {day.toLocaleDateString(undefined, { weekday:'short' })} <span className="text-muted-foreground">{day.getDate()}</span>
            </div>
            <div className="space-y-1.5">
              {dayEvents.length === 0 && <div className="text-[11px] text-muted-foreground/70">—</div>}
              {dayEvents.map((e) => (
                <button key={e._id} onClick={() => onPick(e)}
                  className={`block w-full rounded border px-2 py-1 text-left text-xs ${KIND_META[e.kind]?.color}`}>
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-[10px] opacity-80">{fmtTime(e.start)} – {fmtTime(e.end)}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DAY ────────────────────────────────────────────────────────────────────
function DayList({ date, events, onPick }) {
  const dayEvents = events.filter((e) => sameDay(e.start, date))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  if (dayEvents.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Nothing scheduled for this day.</div>;
  }
  return (
    <div className="space-y-2 p-2">
      {dayEvents.map((e) => (
        <button key={e._id} onClick={() => onPick(e)}
          className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left ${KIND_META[e.kind]?.color}`}>
          <div className="w-20 shrink-0 text-xs font-medium">{fmtTime(e.start)}</div>
          <div className="flex-1">
            <div className="font-medium">{e.title}</div>
            {e.location && <div className="text-[11px] opacity-80">📍 {e.location}</div>}
          </div>
          <Badge variant="outline" className="text-[10px]">{KIND_META[e.kind]?.label}</Badge>
        </button>
      ))}
    </div>
  );
}

// ─── Event create/edit dialog ───────────────────────────────────────────────
function EventDialog({ open, onClose, editing, onSubmit, submitting }) {
  const isEdit = !!editing?._id && !String(editing._id).includes('__');
  const [form, setForm] = useState(() => defaults(editing));

  // Reset on open
  useEffect(() => { if (open) setForm(defaults(editing)); }, [open, editing]);

  const { data: usersRes } = useQuery({ queryKey: ['users-all'], queryFn: getUsers, enabled: open });
  const users = (usersRes?.data?.users || []).filter(u => u.isActive !== false);

  const toggleAttendee = (uid) => {
    setForm((f) => ({
      ...f,
      attendees: f.attendees.includes(uid) ? f.attendees.filter((x) => x !== uid) : [...f.attendees, uid],
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.start || !form.end) return;
    onSubmit({
      kind: form.kind,
      title: form.title,
      description: form.description,
      location: form.location,
      start: new Date(form.start).toISOString(),
      end:   new Date(form.end).toISOString(),
      visibility: form.visibility,
      attendees: form.attendees.map((u) => ({ user: u })),
      recurrence: form.freq === 'none' ? { freq: 'none' } : {
        freq: form.freq, interval: 1, until: form.until ? new Date(form.until).toISOString() : undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit event' : 'New event'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="block">Block (busy)</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — show details</SelectItem>
                  <SelectItem value="busy">Busy — hide details</SelectItem>
                  <SelectItem value="private">Private — only attendees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start *</Label>
              <Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            </div>
            <div><Label>End *</Label>
              <Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div><Label>Repeat</Label>
              <Select value={form.freq} onValueChange={(v) => setForm({ ...form, freq: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.freq !== 'none' && (
            <div>
              <Label>Repeat until</Label>
              <Input type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><UsersIcon className="h-4 w-4" /> Invite attendees</Label>
            <div className="mt-1 max-h-40 overflow-auto rounded border border-border p-2">
              {users.length === 0 && <div className="text-xs text-muted-foreground">No users found</div>}
              {users.map((u) => (
                <label key={u._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                  <input type="checkbox" checked={form.attendees.includes(u._id)} onChange={() => toggleAttendee(u._id)} />
                  <span className="text-sm">{u.name}</span>
                  <span className="text-[11px] text-muted-foreground">· {u.role}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaults(editing) {
  const now = new Date();
  const inHour = new Date(now.getTime() + 60 * 60000);
  return {
    kind: editing?.kind || 'meeting',
    title: editing?.title || '',
    description: editing?.description || '',
    location: editing?.location || '',
    start: toLocalInput(editing?.start || now),
    end:   toLocalInput(editing?.end   || inHour),
    visibility: editing?.visibility || 'public',
    attendees: (editing?.attendees || []).map(a => a.user?._id || a.user).filter(Boolean),
    freq: editing?.recurrence?.freq || 'none',
    until: editing?.recurrence?.until ? new Date(editing.recurrence.until).toISOString().slice(0,10) : '',
  };
}

// ─── Quick-book Appointment dialog ──────────────────────────────────────────
function BookAppointmentDialog({ open, onClose, onBooked }) {
  const { toast } = useToast();
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [date, setDate]         = useState(toLocalInput(new Date()).slice(0, 10));
  const [duration, setDuration] = useState(30);
  const [picked, setPicked]     = useState(null);
  const [reason, setReason]     = useState('');
  const [manualBlock, setManualBlock] = useState({ enabled: false, start: '09:00', end: '10:00' });

  const { data: doctorsRes } = useQuery({ queryKey: ['doctors-all'], queryFn: getDoctors, enabled: open });
  const { data: patientsRes } = useQuery({ queryKey: ['patients-all'], queryFn: () => getPatients(''), enabled: open });
  const doctors = doctorsRes?.data?.doctors || [];
  const patients = patientsRes?.data?.patients || [];

  const slotsQuery = useQuery({
    queryKey: ['doctor-slots', doctorId, date, duration],
    queryFn: () => getDoctorSlots(doctorId, date, duration),
    enabled: open && !!doctorId && !!date,
  });
  const slots = slotsQuery.data?.data?.slots || [];
  const reason404 = slotsQuery.data?.data?.reason;

  const [bookError, setBookError] = useState(null);

  // Clear stale error when key inputs change
  useEffect(() => { setBookError(null); }, [doctorId, date, duration, picked]);

  // If picked slot becomes unavailable after a refetch, clear it
  useEffect(() => {
    if (!picked) return;
    const match = slots.find(s => s.startLabel === picked);
    if (match && !match.available) {
      setPicked(null);
      setBookError(`That slot is no longer available (${match.reasonLabel || 'busy'}). Please pick another.`);
    }
  }, [slots, picked]);

  const bookMut = useMutation({
    mutationFn: () => bookAppointment({
      doctorId, patientId, date, startTime: picked, duration, reason,
    }),
    onSuccess: () => {
      toast({ title: 'Appointment booked' });
      onBooked?.(); onClose(); reset();
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err.message || 'Booking failed';
      setBookError(msg);
      toast({ title: 'Booking failed', description: msg, variant: 'destructive' });
      // Refresh slots so the UI reflects the new conflict
      slotsQuery.refetch();
      setPicked(null);
    },
  });

  const blockMut = useMutation({
    mutationFn: () => createBlock({
      title: 'Manual block',
      doctor: doctorId,
      start: new Date(`${date}T${manualBlock.start}`).toISOString(),
      end:   new Date(`${date}T${manualBlock.end}`).toISOString(),
    }),
    onSuccess: () => { toast({ title: 'Slot blocked' }); slotsQuery.refetch(); onBooked?.(); },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const reset = () => { setDoctorId(''); setPatientId(''); setPicked(null); setReason(''); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Doctor *</Label>
              <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setPicked(null); }}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name || d.userDetails?.name || 'Doctor'} · {d.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name} · {p.patientId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPicked(null); }} />
            </div>
            <div>
              <Label>Duration *</Label>
              <Select value={String(duration)} onValueChange={(v) => { setDuration(Number(v)); setPicked(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALLOWED_DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Default durations are 10 / 20 / 30 min. For longer, use the manual block below.
          </p>

          {/* Booking error banner */}
          {bookError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">Cannot book this slot</AlertTitle>
              <AlertDescription className="text-xs">{bookError}</AlertDescription>
            </Alert>
          )}

          {/* Slots */}
          {doctorId && (
            <div>
              <div className="flex items-center justify-between">
                <Label>Available slots</Label>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm border border-border bg-background" /> Free</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-destructive/40" /> Booked</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-500/40" /> Blocked</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-muted" /> Past</span>
                </div>
              </div>
              {slotsQuery.isFetching ? (
                <div className="text-xs text-muted-foreground py-2">Loading slots…</div>
              ) : reason404 ? (
                <div className="text-xs text-muted-foreground py-2">{reason404}</div>
              ) : slots.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">No slots configured for this day.</div>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-auto rounded border border-border p-2">
                    {slots.map((s) => {
                      const isPicked = picked === s.startLabel;
                      const reasonClass = !s.available
                        ? s.reason === 'appointment'
                          ? 'border-destructive/40 bg-destructive/10 text-destructive line-through cursor-not-allowed'
                          : s.reason === 'block'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 line-through cursor-not-allowed'
                          : s.reason === 'past'
                          ? 'border-border bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60'
                          : 'border-border bg-muted/40 text-muted-foreground line-through cursor-not-allowed'
                        : 'border-border hover:bg-muted';
                      const btn = (
                        <button key={s.startLabel} disabled={!s.available}
                          aria-disabled={!s.available}
                          aria-label={s.available ? `Book ${s.startLabel}` : `${s.startLabel} — ${s.reasonLabel || 'unavailable'}`}
                          onClick={() => { setPicked(s.startLabel); setBookError(null); }}
                          className={`rounded border px-2 py-1 text-xs transition-colors w-full ${isPicked ? 'border-primary bg-primary text-primary-foreground' : reasonClass}`}>
                          {s.startLabel}
                        </button>
                      );
                      if (s.available) return <div key={s.startLabel}>{btn}</div>;
                      return (
                        <Tooltip key={s.startLabel}>
                          <TooltipTrigger asChild><span className="block">{btn}</span></TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {s.reasonLabel || 'Unavailable'}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}
            </div>
          )}

          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Symptoms / purpose" />
          </div>

          {/* Manual block toggle */}
          <details className="rounded border border-border p-2">
            <summary className="cursor-pointer text-sm flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Need longer than 30 min? Block manually
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2 items-end">
              <div><Label>From</Label><Input type="time" value={manualBlock.start} onChange={(e) => setManualBlock({ ...manualBlock, start: e.target.value })} /></div>
              <div><Label>To</Label><Input type="time" value={manualBlock.end} onChange={(e) => setManualBlock({ ...manualBlock, end: e.target.value })} /></div>
              <Button type="button" variant="outline" disabled={!doctorId || blockMut.isPending}
                onClick={() => blockMut.mutate()}>
                Block slot
              </Button>
            </div>
          </details>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button disabled={!doctorId || !patientId || !picked || bookMut.isPending}
            onClick={() => bookMut.mutate()}>
            {bookMut.isPending ? 'Booking…' : 'Confirm booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
