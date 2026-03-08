import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrganization, getOrgSettingsConfig, updateOrgSettingsTabs,
  updateOrgPaymentConfig, updateOrgBulkPaymentConfig, impersonateOrg,
  proxyList, proxyDelete,
} from '@/lib/grandmaster-api';
import { setAuthToken, setOrgSlug, setUser } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Eye, Settings2, CreditCard, Database, Shield,
  Loader2, Search, Trash2, RefreshCw, ExternalLink
} from 'lucide-react';

const ALL_SETTINGS_TABS = [
  { value: 'general', label: 'General' },
  { value: 'users', label: 'Users' },
  { value: 'security', label: 'Security' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'data', label: 'Data Management' },
  { value: 'visual_access', label: 'Visual Access' },
  { value: 'module_operations', label: 'Module Operations' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'credit', label: 'Credit/Ledger' },
];

const BILLABLE_MODULES = ['billing', 'lab', 'pharmacy', 'radiology', 'ot', 'opd', 'ipd'];

const DATA_RESOURCES = [
  { value: 'patients', label: 'Patients' },
  { value: 'users', label: 'Users' },
  { value: 'beds', label: 'Beds' },
  { value: 'admissions', label: 'Admissions' },
  { value: 'doctors', label: 'Doctors' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'labtests', label: 'Lab Tests' },
  { value: 'vitals', label: 'Vitals' },
  { value: 'tasks', label: 'Tasks' },
];

export default function OrgControlPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ─── Queries ───
  const { data: orgRes, isLoading: orgLoading } = useQuery({
    queryKey: ['gm-org', id],
    queryFn: () => getOrganization(id),
  });
  const org = orgRes?.data || {};

  const { data: settingsRes } = useQuery({
    queryKey: ['gm-org-settings', id],
    queryFn: () => getOrgSettingsConfig(id),
    enabled: !!id,
  });
  const settingsConfig = settingsRes?.data || {};

  // ─── Settings Tabs State ───
  const [allowedTabs, setAllowedTabs] = useState(null);
  const currentTabs = allowedTabs ?? settingsConfig.allowedSettingsTabs ?? ALL_SETTINGS_TABS.map(t => t.value);

  const settingsTabsMut = useMutation({
    mutationFn: (tabs) => updateOrgSettingsTabs(id, tabs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-org-settings', id] });
      toast({ title: 'Settings tabs updated' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // ─── Payment Config State ───
  const rawPaymentConfig = settingsConfig.paymentConfig || {};
  const [paymentConfig, setPaymentConfig] = useState(null);
  const currentPaymentConfig = paymentConfig ?? (typeof rawPaymentConfig === 'object' ? rawPaymentConfig : {});

  const paymentMut = useMutation({
    mutationFn: (config) => updateOrgBulkPaymentConfig(id, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-org-settings', id] });
      toast({ title: 'Payment config saved' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // ─── Impersonation ───
  const impersonateMut = useMutation({
    mutationFn: () => impersonateOrg(id),
    onSuccess: (res) => {
      const { token, orgSlug, user } = res.data;
      // Store impersonation info
      localStorage.setItem('gm_impersonation', JSON.stringify({
        active: true,
        orgName: org.name,
        gmToken: localStorage.getItem('gm_token'),
        gmUser: localStorage.getItem('gm_user'),
      }));
      setAuthToken(token);
      setOrgSlug(orgSlug);
      setUser(user);
      // Navigate to hospital dashboard
      window.location.href = '/';
    },
    onError: (err) => toast({ title: 'Impersonation failed', description: err.message, variant: 'destructive' }),
  });

  // ─── Remote CRUD ───
  const [activeResource, setActiveResource] = useState('patients');
  const [dataSearch, setDataSearch] = useState('');

  const { data: proxyRes, isLoading: proxyLoading, refetch: refetchProxy } = useQuery({
    queryKey: ['gm-proxy', id, activeResource, dataSearch],
    queryFn: () => proxyList(id, activeResource, { search: dataSearch || undefined, limit: 50 }),
    enabled: !!id,
  });
  const proxyData = proxyRes?.data || [];
  const proxyMeta = proxyRes?.meta || {};

  const deleteMut = useMutation({
    mutationFn: (recordId) => proxyDelete(id, activeResource, recordId),
    onSuccess: () => {
      refetchProxy();
      toast({ title: 'Record deleted' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // ─── Payment Config Helpers ───
  const togglePaymentMethod = (module, method) => {
    const updated = { ...currentPaymentConfig };
    if (!updated[module]) updated[module] = { allowedMethods: ['cash', 'card', 'upi', 'insurance', 'bank_transfer'], enablePartialPayment: true, enableRefunds: true };
    const methods = updated[module].allowedMethods || [];
    updated[module] = {
      ...updated[module],
      allowedMethods: methods.includes(method) ? methods.filter(m => m !== method) : [...methods, method],
    };
    setPaymentConfig(updated);
  };

  const togglePaymentOption = (module, key) => {
    const updated = { ...currentPaymentConfig };
    if (!updated[module]) updated[module] = { allowedMethods: [], enablePartialPayment: true, enableRefunds: true };
    updated[module] = { ...updated[module], [key]: !updated[module][key] };
    setPaymentConfig(updated);
  };

  if (orgLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/grandmaster/organizations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{org.name || 'Organization'}</h1>
              <Badge variant={org.status === 'active' ? 'default' : 'destructive'}>{org.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{org.type?.replace('_', ' ')} · {org.dbName} · {org.enabledModules?.length || 0} modules</p>
          </div>
        </div>
        <Button
          onClick={() => impersonateMut.mutate()}
          disabled={impersonateMut.isPending || org.status !== 'active'}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          {impersonateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
          View as Hospital
        </Button>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="gap-2"><Settings2 className="h-4 w-4" />Settings Control</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" />Payment Config</TabsTrigger>
          <TabsTrigger value="data" className="gap-2"><Database className="h-4 w-4" />Hospital Data</TabsTrigger>
          <TabsTrigger value="overview" className="gap-2"><Shield className="h-4 w-4" />Overview</TabsTrigger>
        </TabsList>

        {/* ═══ Settings Control Tab ═══ */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings Tab Visibility</CardTitle>
              <CardDescription>Control which settings tabs this hospital can see and access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_SETTINGS_TABS.map((tab) => (
                  <label key={tab.value} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent transition-colors">
                    <Checkbox
                      checked={currentTabs.includes(tab.value)}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...currentTabs, tab.value]
                          : currentTabs.filter(t => t !== tab.value);
                        setAllowedTabs(updated);
                      }}
                    />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={() => settingsTabsMut.mutate(allowedTabs || currentTabs)}
                disabled={settingsTabsMut.isPending}
              >
                {settingsTabsMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Settings Access
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Payment Config Tab ═══ */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods per Module</CardTitle>
              <CardDescription>Configure which payment methods are available for each billable module</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {BILLABLE_MODULES.map((mod) => {
                    const modConfig = currentPaymentConfig[mod] || {
                      allowedMethods: ['cash', 'card', 'upi', 'insurance', 'bank_transfer'],
                      enablePartialPayment: true,
                      enableRefunds: true,
                    };
                    return (
                      <div key={mod} className="rounded-lg border border-border p-4 space-y-3">
                        <h4 className="font-semibold capitalize text-foreground">{mod}</h4>
                        <div className="flex flex-wrap gap-2">
                          {PAYMENT_METHODS.map((pm) => (
                            <label key={pm.value} className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                              modConfig.allowedMethods?.includes(pm.value)
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:bg-accent'
                            }`}>
                              <Checkbox
                                checked={modConfig.allowedMethods?.includes(pm.value)}
                                onCheckedChange={() => togglePaymentMethod(mod, pm.value)}
                                className="h-3.5 w-3.5"
                              />
                              {pm.label}
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-6 pt-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={modConfig.enablePartialPayment !== false}
                              onCheckedChange={() => togglePaymentOption(mod, 'enablePartialPayment')}
                            />
                            <Label className="text-xs">Partial Payment</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={modConfig.enableRefunds !== false}
                              onCheckedChange={() => togglePaymentOption(mod, 'enableRefunds')}
                            />
                            <Label className="text-xs">Refunds</Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <Button
                className="mt-4"
                onClick={() => paymentMut.mutate(currentPaymentConfig)}
                disabled={paymentMut.isPending}
              >
                {paymentMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Payment Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Hospital Data (Remote CRUD) Tab ═══ */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hospital Data Explorer</CardTitle>
                  <CardDescription>Browse, search, and manage records in this hospital's database</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchProxy()}>
                  <RefreshCw className="mr-2 h-4 w-4" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={activeResource} onValueChange={setActiveResource}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATA_RESOURCES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search records..."
                    className="pl-9"
                    value={dataSearch}
                    onChange={(e) => setDataSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {proxyMeta.total != null ? `${proxyMeta.total} total records` : ''}
              </div>

              <ScrollArea className="h-[400px]">
                {proxyLoading ? (
                  <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : proxyData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No records found</div>
                ) : (
                  <div className="space-y-2">
                    {proxyData.map((record) => (
                      <div key={record._id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {record.firstName && record.lastName
                              ? `${record.firstName} ${record.lastName}`
                              : record.name || record.email || record.title || record._id}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {record.email && `${record.email} · `}
                            {record.role && `Role: ${record.role} · `}
                            {record.status && `Status: ${record.status} · `}
                            ID: {record._id}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => {
                            if (confirm(`Delete this ${activeResource} record?`)) {
                              deleteMut.mutate(record._id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Overview Tab ═══ */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Organization Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ['Name', org.name],
                  ['Type', org.type?.replace('_', ' ')],
                  ['Status', org.status],
                  ['Database', org.dbName],
                  ['Admin Email', org.adminDetails?.email],
                  ['Admin Name', `${org.adminDetails?.firstName || ''} ${org.adminDetails?.lastName || ''}`],
                  ['Phone', org.phone || '–'],
                  ['Email', org.email || '–'],
                  ['Max Users', org.maxUsers],
                  ['Max Beds', org.maxBeds],
                  ['Created', org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '–'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Enabled Modules</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(org.enabledModules || []).map((mod) => (
                    <Badge key={mod} variant="secondary" className="capitalize">{mod}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
