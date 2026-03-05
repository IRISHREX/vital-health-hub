import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPlans, createPlan, updatePlan, deletePlan, listSubscriptions, createSubscription, recordPayment, cancelSubscription, listOrganizations, checkExpiredSubscriptions } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, CreditCard, Package, Trash2, DollarSign, XCircle, RefreshCw } from 'lucide-react';

const ALL_MODULES = [
  'dashboard', 'beds', 'admissions', 'patients', 'doctors', 'nurses',
  'appointments', 'facilities', 'billing', 'reports', 'notifications',
  'settings', 'tasks', 'vitals', 'lab', 'pharmacy', 'radiology', 'ot'
];

export default function Subscriptions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [planOpen, setPlanOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [paymentSubId, setPaymentSubId] = useState(null);
  const [planModules, setPlanModules] = useState(['dashboard', 'patients']);

  const { data: plansRes } = useQuery({ queryKey: ['gm-plans'], queryFn: () => listPlans({}) });
  const { data: subsRes } = useQuery({ queryKey: ['gm-subs'], queryFn: () => listSubscriptions({}) });
  const { data: orgsRes } = useQuery({ queryKey: ['gm-orgs-sub'], queryFn: () => listOrganizations({}) });

  const plans = plansRes?.data || [];
  const subs = subsRes?.data || [];
  const orgs = orgsRes?.data || [];

  const createPlanMut = useMutation({
    mutationFn: createPlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-plans'] }); setPlanOpen(false); toast({ title: 'Plan created' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deletePlanMut = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-plans'] }); toast({ title: 'Plan deleted' }); },
  });

  const createSubMut = useMutation({
    mutationFn: createSubscription,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-subs'] }); setSubOpen(false); toast({ title: 'Subscription created' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const paymentMut = useMutation({
    mutationFn: ({ id, data }) => recordPayment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-subs'] }); setPaymentSubId(null); toast({ title: 'Payment recorded' }); },
  });

  const cancelMut = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-subs'] }); toast({ title: 'Subscription cancelled' }); },
  });

  const expireMut = useMutation({
    mutationFn: checkExpiredSubscriptions,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['gm-subs'] }); toast({ title: res.message || 'Checked' }); },
  });

  const handleCreatePlan = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    createPlanMut.mutate({
      name: fd.get('name'), code: fd.get('code'), description: fd.get('description'),
      priceMonthly: Number(fd.get('priceMonthly')), priceYearly: Number(fd.get('priceYearly')),
      maxUsers: Number(fd.get('maxUsers') || 50), maxBeds: Number(fd.get('maxBeds') || 100),
      includedModules: planModules,
    });
  };

  const handleCreateSub = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    createSubMut.mutate({
      organization: fd.get('organization'), plan: fd.get('plan'),
      billingCycle: fd.get('billingCycle'), startDate: fd.get('startDate'),
    });
  };

  const handlePayment = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    paymentMut.mutate({
      id: paymentSubId,
      data: { amount: Number(fd.get('amount')), method: fd.get('method'), reference: fd.get('reference') }
    });
  };

  const statusColor = { active: 'default', expired: 'destructive', cancelled: 'outline', trial: 'secondary', grace_period: 'secondary' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Subscriptions & Plans</h1>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">{plans.length} plans configured</p>
            <Dialog open={planOpen} onOpenChange={setPlanOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Plan</Button></DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Subscription Plan</DialogTitle></DialogHeader>
                <form onSubmit={handleCreatePlan} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Plan Name</Label><Input name="name" required /></div>
                    <div><Label>Code</Label><Input name="code" required placeholder="e.g. BASIC" /></div>
                    <div><Label>Description</Label><Input name="description" /></div>
                    <div><Label>Monthly Price (₹)</Label><Input name="priceMonthly" type="number" required /></div>
                    <div><Label>Yearly Price (₹)</Label><Input name="priceYearly" type="number" required /></div>
                    <div><Label>Max Users</Label><Input name="maxUsers" type="number" defaultValue={50} /></div>
                    <div><Label>Max Beds</Label><Input name="maxBeds" type="number" defaultValue={100} /></div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Included Modules</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALL_MODULES.map((mod) => (
                        <label key={mod} className="flex items-center gap-2 rounded border border-border p-1.5 cursor-pointer text-xs">
                          <Checkbox checked={planModules.includes(mod)} onCheckedChange={(c) => setPlanModules(p => c ? [...p, mod] : p.filter(m => m !== mod))} />
                          <span className="capitalize">{mod}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createPlanMut.isPending}>Create Plan</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge variant="outline">{plan.code}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-semibold text-foreground">₹{plan.priceMonthly?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yearly</span>
                    <span className="font-semibold text-foreground">₹{plan.priceYearly?.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.includedModules?.map(m => <Badge key={m} variant="secondary" className="text-[10px] capitalize">{m}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground">Max: {plan.maxUsers} users, {plan.maxBeds} beds</p>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm('Delete?')) deletePlanMut.mutate(plan._id); }}>
                    <Trash2 className="mr-1 h-3 w-3" />Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">{subs.length} subscriptions</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => expireMut.mutate()}>
                <RefreshCw className="mr-1 h-3 w-3" />Check Expired
              </Button>
              <Dialog open={subOpen} onOpenChange={setSubOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Assign Subscription</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign Subscription</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateSub} className="space-y-4">
                    <div><Label>Organization</Label>
                      <select name="organization" required className="w-full rounded border border-border bg-background p-2 text-sm text-foreground">
                        <option value="">Select...</option>
                        {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div><Label>Plan</Label>
                      <select name="plan" required className="w-full rounded border border-border bg-background p-2 text-sm text-foreground">
                        <option value="">Select...</option>
                        {plans.map(p => <option key={p._id} value={p._id}>{p.name} – ₹{p.priceMonthly}/mo</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Billing Cycle</Label>
                        <Select name="billingCycle" defaultValue="monthly">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Start Date</Label><Input name="startDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createSubMut.isPending}>Assign</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-3">
            {subs.map((sub) => (
              <Card key={sub._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{sub.organization?.name || 'N/A'}</p>
                      <Badge variant={statusColor[sub.status]}>{sub.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sub.plan?.name} · {sub.billingCycle} · ₹{sub.amount?.toLocaleString()} ·
                      {new Date(sub.startDate).toLocaleDateString()} – {new Date(sub.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Payments: {sub.payments?.length || 0}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPaymentSubId(sub._id)}>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </Button>
                    {sub.status === 'active' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelMut.mutate(sub._id)}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={!!paymentSubId} onOpenChange={() => setPaymentSubId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div><Label>Amount (₹)</Label><Input name="amount" type="number" required /></div>
            <div><Label>Method</Label>
              <Select name="method" defaultValue="bank_transfer">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input name="reference" /></div>
            <Button type="submit" className="w-full" disabled={paymentMut.isPending}>Record Payment</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
