import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listOrganizations, onboardOrganization, updateOrgModules, suspendOrganization, reactivateOrganization, deleteOrganization } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Building2, Pencil, Ban, Play, Trash2, Settings2, Eye, ExternalLink } from 'lucide-react';

const ALL_MODULES = [
  'dashboard', 'beds', 'admissions', 'patients', 'doctors', 'nurses',
  'appointments', 'facilities', 'billing', 'reports', 'notifications',
  'settings', 'tasks', 'vitals', 'lab', 'pharmacy', 'radiology', 'ot'
];

const ORG_TYPES = [
  { value: 'nursing_home', label: 'Nursing Home' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'diagnostic_center', label: 'Diagnostic Center' },
  { value: 'clinic', label: 'Clinic' },
];

const statusColor = { active: 'default', suspended: 'destructive', onboarding: 'secondary', deactivated: 'outline' };

export default function Organizations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [moduleDialogOrg, setModuleDialogOrg] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);

  const { data: orgRes, isLoading, error } = useQuery({
    queryKey: ['gm-orgs', search, statusFilter],
    queryFn: () => listOrganizations({ search, status: statusFilter === 'all' ? undefined : statusFilter }),
  });
  const orgs = orgRes?.data || [];

  // Show error if API request fails
  if (error) {
    console.error('API Error:', error);
  }

  const onboardMut = useMutation({
    mutationFn: onboardOrganization,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-orgs'] }); setOnboardOpen(false); toast({ title: 'Organization onboarded!' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const moduleMut = useMutation({
    mutationFn: ({ id, modules }) => updateOrgModules(id, modules),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-orgs'] }); setModuleDialogOrg(null); toast({ title: 'Modules updated' }); },
  });

  const suspendMut = useMutation({
    mutationFn: (id) => suspendOrganization(id, 'Suspended by Grandmaster'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-orgs'] }); toast({ title: 'Organization suspended' }); },
  });

  const reactivateMut = useMutation({
    mutationFn: reactivateOrganization,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-orgs'] }); toast({ title: 'Organization reactivated' }); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-orgs'] }); toast({ title: 'Organization deleted' }); },
  });

  const handleOnboard = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onboardMut.mutate({
      name: fd.get('name'),
      type: fd.get('type'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      databaseUrl: String(fd.get('databaseUrl') || '').trim() || undefined,
      adminPassword: String(fd.get('adminPassword') || ''),
      address: { city: fd.get('city'), state: fd.get('state') },
      adminDetails: {
        firstName: fd.get('adminFirst'),
        lastName: fd.get('adminLast'),
        email: fd.get('adminEmail'),
        phone: fd.get('adminPhone'),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground">{orgs.length} organizations registered</p>
        </div>
        <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Onboard Organization</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Onboard New Organization</DialogTitle></DialogHeader>
            <form onSubmit={handleOnboard} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Organization Name</Label><Input name="name" required /></div>
                <div><Label>Type</Label>
                  <Select name="type" defaultValue="hospital">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ORG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Phone</Label><Input name="phone" /></div>
                <div><Label>Email</Label><Input name="email" type="email" /></div>
                <div className="col-span-2">
                  <Label>Database URL (optional)</Label>
                  <Input name="databaseUrl" placeholder="mongodb+srv://user:pass@cluster/dbname?retryWrites=true&w=majority" />
                </div>
                <div><Label>City</Label><Input name="city" /></div>
                <div><Label>State</Label><Input name="state" /></div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-sm font-semibold text-foreground mb-2">Administrator Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name</Label><Input name="adminFirst" required /></div>
                  <div><Label>Last Name</Label><Input name="adminLast" required /></div>
                  <div><Label>Email</Label><Input name="adminEmail" type="email" required /></div>
                  <div><Label>Phone</Label><Input name="adminPhone" /></div>
                  <div className="col-span-2">
                    <Label>Super Admin Password</Label>
                    <Input name="adminPassword" type="password" minLength={8} required />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={onboardMut.isPending}>
                {onboardMut.isPending ? 'Onboarding...' : 'Onboard Organization'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search organizations..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {error && (
          <Card className="border-destructive"><CardContent className="p-4 text-destructive text-sm">Error loading organizations: {error.message}</CardContent></Card>
        )}
        {isLoading && (
          <Card><CardContent className="p-4 text-center text-muted-foreground">Loading organizations...</CardContent></Card>
        )}
        {orgs.map((org) => (
          <Card key={org._id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{org.name}</p>
                    <Badge variant={statusColor[org.status]}>{org.status}</Badge>
                    <Badge variant="outline" className="text-xs">{org.type?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admin: {org.adminDetails?.email} · DB: {org.dbName} · Modules: {org.enabledModules?.length || 0}
                  </p>
                  {org.activeSubscription && (
                    <p className="text-xs text-green-600">Plan: {org.activeSubscription.plan?.name || 'N/A'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Control Panel" onClick={() => navigate(`/grandmaster/organizations/${org._id}`)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setModuleDialogOrg(org); setSelectedModules(org.enabledModules || []); }}>
                  <Settings2 className="h-4 w-4" />
                </Button>
                {org.status === 'active' ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600" onClick={() => suspendMut.mutate(org._id)}>
                    <Ban className="h-4 w-4" />
                  </Button>
                ) : org.status === 'suspended' ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => reactivateMut.mutate(org._id)}>
                    <Play className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Delete this organization?')) deleteMut.mutate(org._id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && orgs.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No organizations found</CardContent></Card>
        )}
      </div>

      {/* Module Control Dialog */}
      <Dialog open={!!moduleDialogOrg} onOpenChange={() => setModuleDialogOrg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Module Control – {moduleDialogOrg?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {ALL_MODULES.map((mod) => (
              <label key={mod} className="flex items-center gap-2 rounded-lg border border-border p-2 cursor-pointer hover:bg-accent">
                <Checkbox checked={selectedModules.includes(mod)} onCheckedChange={(c) => {
                  setSelectedModules(prev => c ? [...prev, mod] : prev.filter(m => m !== mod));
                }} />
                <span className="text-sm capitalize">{mod}</span>
              </label>
            ))}
          </div>
          <Button onClick={() => moduleMut.mutate({ id: moduleDialogOrg._id, modules: selectedModules })} disabled={moduleMut.isPending}>
            Save Modules
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
