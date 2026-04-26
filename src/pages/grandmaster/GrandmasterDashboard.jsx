import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPlatformStats, getRecentOnboarded, getAllOrgStats } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, CreditCard, TrendingUp, AlertTriangle,
  Users, Bed, Hospital, Settings2, ArrowRight
} from 'lucide-react';

export default function GrandmasterDashboard() {
  const navigate = useNavigate();
  const { data: statsRes } = useQuery({ queryKey: ['gm-stats'], queryFn: getPlatformStats });
  const { data: recentRes } = useQuery({ queryKey: ['gm-recent'], queryFn: getRecentOnboarded });
  const { data: orgStatsRes, isLoading: orgsLoading } = useQuery({
    queryKey: ['gm-all-org-stats'],
    queryFn: getAllOrgStats,
    staleTime: 30 * 1000,
  });

  const stats = statsRes?.data || {};
  const orgs = stats.organizations || {};
  const subs = stats.subscriptions || {};
  const revenue = stats.revenue || {};
  const recent = recentRes?.data || [];
  const orgList = orgStatsRes?.data || [];

  const kpis = [
    { label: 'Total Organizations', value: orgs.total || 0, icon: Building2, color: 'text-primary' },
    { label: 'Active Subscriptions', value: subs.active || 0, icon: CreditCard, color: 'text-green-500' },
    { label: 'Monthly Revenue', value: `₹${(revenue.monthly || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Upcoming Renewals', value: stats.upcomingRenewals || 0, icon: AlertTriangle, color: 'text-yellow-500' },
  ];

  const statusColor = { active: 'default', suspended: 'destructive', onboarding: 'secondary', deactivated: 'outline' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
        <p className="text-muted-foreground">Overview of all organizations and subscriptions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-accent ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown + Revenue */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Organization Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Active', value: orgs.active, cls: 'bg-green-500' },
              { label: 'Suspended', value: orgs.suspended, cls: 'bg-destructive' },
              { label: 'Onboarding', value: orgs.onboarding, cls: 'bg-yellow-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${s.cls}`} />
                  <span className="text-sm text-foreground">{s.label}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{s.value || 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Overview</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-lg font-bold text-foreground">₹{(revenue.total || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="text-lg font-bold text-green-600">₹{(revenue.monthly || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expired Subs</span>
              <span className="text-sm font-medium text-destructive">{subs.expired || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Hospital Dashboards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Hospital Dashboards</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Live snapshot for every organization. Click an org to manage or impersonate.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/grandmaster/organizations')}>
            All Organizations <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <p className="text-sm text-muted-foreground">Loading hospital data…</p>
          ) : orgList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations onboarded yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orgList.map((org) => {
                const s = org.stats || {};
                const occupancy = s.beds ? Math.round((s.occupiedBeds / s.beds) * 100) : 0;
                return (
                  <div
                    key={org._id}
                    className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
                          <Hospital className="h-3.5 w-3.5 text-primary shrink-0" />
                          {org.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {org.slug} · {org.type?.replace('_', ' ')}
                        </p>
                      </div>
                      <Badge variant={statusColor[org.status] || 'secondary'} className="text-[10px]">
                        {org.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat icon={Users} label="Patients" value={s.patients} />
                      <Stat icon={Users} label="Staff" value={s.users} />
                      <Stat icon={Hospital} label="Admitted" value={s.activeAdmissions} />
                      <Stat icon={Bed} label="Bed Occ." value={`${occupancy}%`} sub={`${s.occupiedBeds || 0}/${s.beds || 0}`} />
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => navigate(`/grandmaster/organizations/${org._id}/control`)}
                      >
                        <Settings2 className="mr-1.5 h-3 w-3" /> Manage
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Recently Onboarded</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations yet</p>
          ) : (
            <div className="space-y-3">
              {recent.map((org) => (
                <div key={org._id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.adminDetails?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor[org.status] || 'secondary'}>{org.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-md bg-accent/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-semibold text-foreground leading-tight">
        {value ?? 0}{sub && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
