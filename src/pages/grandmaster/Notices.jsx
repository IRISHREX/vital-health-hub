import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listNotices, createNotice, updateNotice, deleteNotice, listOrganizations,
} from '@/lib/grandmaster-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Bell, AlertTriangle, Info, Wrench, CreditCard, FileText,
  Pencil, Search, Loader2, EyeOff, Eye,
} from 'lucide-react';

const TYPES = [
  { value: 'info',         label: 'Info',         Icon: Info,          variant: 'default'     },
  { value: 'warning',      label: 'Warning',      Icon: AlertTriangle, variant: 'secondary'   },
  { value: 'critical',     label: 'Critical',     Icon: AlertTriangle, variant: 'destructive' },
  { value: 'maintenance',  label: 'Maintenance',  Icon: Wrench,        variant: 'outline'     },
  { value: 'subscription', label: 'Subscription', Icon: CreditCard,    variant: 'secondary'   },
  { value: 'policy',       label: 'Policy',       Icon: FileText,      variant: 'outline'     },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.value, t]));

const toLocalInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const blankForm = {
  title: '', message: '', type: 'info', scope: 'all',
  targetOrganizations: [], publishAt: '', expiresAt: '', isPublished: true,
};

// ─── Reusable form ─────────────────────────────────────────────────────────
function NoticeForm({ value, onChange, orgs }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <Label>Title *</Label>
        <Input
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Scheduled maintenance window"
          required
          maxLength={200}
        />
      </div>
      <div>
        <Label>Message *</Label>
        <Textarea
          rows={4}
          value={value.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Describe the announcement…"
          required
          maxLength={2000}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={value.type} onValueChange={(v) => set({ type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="inline-flex items-center gap-2 capitalize">
                    <t.Icon className="h-3.5 w-3.5" />{t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Scope</Label>
          <Select value={value.scope} onValueChange={(v) => set({ scope: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              <SelectItem value="specific">Specific Organizations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {value.scope === 'specific' && (
        <div>
          <Label className="mb-1 block">Target Organizations</Label>
          <select
            multiple
            value={value.targetOrganizations}
            onChange={(e) =>
              set({ targetOrganizations: Array.from(e.target.selectedOptions, (o) => o.value) })
            }
            className="w-full rounded border border-border bg-background p-2 text-sm text-foreground h-28"
          >
            {orgs.map((o) => (<option key={o._id} value={o._id}>{o.name}</option>))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Publish at</Label>
          <Input
            type="datetime-local"
            value={value.publishAt}
            onChange={(e) => set({ publishAt: e.target.value })}
          />
        </div>
        <div>
          <Label>Expires at</Label>
          <Input
            type="datetime-local"
            value={value.expiresAt}
            onChange={(e) => set({ expiresAt: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <Label className="cursor-pointer">Published</Label>
          <p className="text-xs text-muted-foreground">When off, hospitals will not see this notice.</p>
        </div>
        <Switch checked={value.isPublished} onCheckedChange={(v) => set({ isPublished: v })} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Notices() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all | published | draft

  const { data: noticesRes, isLoading } = useQuery({
    queryKey: ['gm-notices'], queryFn: () => listNotices({}),
  });
  const { data: orgsRes } = useQuery({
    queryKey: ['gm-orgs-notices'], queryFn: () => listOrganizations({}),
  });
  const notices = noticesRes?.data || [];
  const orgs = orgsRes?.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices.filter((n) => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterStatus === 'published' && !n.isPublished) return false;
      if (filterStatus === 'draft' && n.isPublished) return false;
      if (!q) return true;
      return (
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
      );
    });
  }, [notices, search, filterType, filterStatus]);

  // ─── Mutations ───
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(blankForm); };

  const buildPayload = () => {
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      scope: form.scope,
      isPublished: !!form.isPublished,
    };
    if (form.scope === 'specific') payload.targetOrganizations = form.targetOrganizations;
    if (form.publishAt) payload.publishAt = new Date(form.publishAt).toISOString();
    if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
    return payload;
  };

  const createMut = useMutation({
    mutationFn: createNotice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-notices'] });
      closeDialog();
      toast({ title: 'Notice published' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => updateNotice(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-notices'] });
      closeDialog();
      toast({ title: 'Notice updated' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteNotice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-notices'] });
      toast({ title: 'Notice deleted' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const togglePublishMut = useMutation({
    mutationFn: ({ id, isPublished }) => updateNotice(id, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gm-notices'] }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'Missing fields', description: 'Title and message are required.', variant: 'destructive' });
      return;
    }
    if (form.publishAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.publishAt)) {
      toast({ title: 'Invalid schedule', description: 'Expiry must be after publish time.', variant: 'destructive' });
      return;
    }
    if (form.scope === 'specific' && form.targetOrganizations.length === 0) {
      toast({ title: 'Select organizations', description: 'Choose at least one target organization.', variant: 'destructive' });
      return;
    }
    const payload = buildPayload();
    if (editingId) updateMut.mutate({ id: editingId, body: payload });
    else createMut.mutate(payload);
  };

  const startCreate = () => { setEditingId(null); setForm(blankForm); setDialogOpen(true); };
  const startEdit = (n) => {
    setEditingId(n._id);
    setForm({
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'info',
      scope: n.scope || 'all',
      targetOrganizations: (n.targetOrganizations || []).map((o) => (typeof o === 'string' ? o : o._id)),
      publishAt: toLocalInput(n.publishAt),
      expiresAt: toLocalInput(n.expiresAt),
      isPublished: n.isPublished !== false,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this notice? Hospitals will stop seeing it immediately.')) {
      deleteMut.mutate(id);
    }
  };

  const stats = useMemo(() => ({
    total: notices.length,
    published: notices.filter((n) => n.isPublished).length,
    drafts: notices.filter((n) => !n.isPublished).length,
  }), [notices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Notices</h1>
          <p className="text-muted-foreground text-sm">
            {stats.total} total · {stats.published} published · {stats.drafts} draft
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />New Notice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="capitalize">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {notices.length === 0 ? 'No notices yet — create one to alert hospitals.' : 'No notices match your filters.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((notice) => {
            const meta = TYPE_MAP[notice.type] || TYPE_MAP.info;
            const Icon = meta.Icon;
            const expired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
            return (
              <Card key={notice._id} className={!notice.isPublished ? 'opacity-70' : ''}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{notice.title}</p>
                        <Badge variant={meta.variant} className="capitalize">{notice.type}</Badge>
                        <Badge variant="outline" className="capitalize">{notice.scope}</Badge>
                        {!notice.isPublished && <Badge variant="outline">Draft</Badge>}
                        {expired && <Badge variant="outline" className="text-destructive">Expired</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 break-words">{notice.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notice.createdAt).toLocaleString()} · by {notice.createdBy || 'system'}
                        {notice.expiresAt && ` · expires ${new Date(notice.expiresAt).toLocaleString()}`}
                        {notice.scope === 'specific' && notice.targetOrganizations?.length > 0 && (
                          ` · ${notice.targetOrganizations.length} org(s)`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      title={notice.isPublished ? 'Unpublish' : 'Publish'}
                      onClick={() => togglePublishMut.mutate({ id: notice._id, isPublished: !notice.isPublished })}
                    >
                      {notice.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      title="Edit" onClick={() => startEdit(notice)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      title="Delete" onClick={() => handleDelete(notice._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Notice' : 'New Platform Notice'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update this announcement. Hospitals will see changes within 5 minutes.'
                : 'Compose an announcement or alert that will appear inside hospital dashboards.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <NoticeForm value={form} onChange={setForm} orgs={orgs} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Publish Notice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
