import { useQuery } from '@tanstack/react-query';
import { getPlatformStats, getRecentOnboarded } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, Users, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

export default function GrandmasterDashboard() {
  const { data: statsRes } = useQuery({ queryKey: ['gm-stats'], queryFn: getPlatformStats });
  const { data: recentRes } = useQuery({ queryKey: ['gm-recent'], queryFn: getRecentOnboarded });

  const stats = statsRes?.data || {};
  const orgs = stats.organizations || {};
  const subs = stats.subscriptions || {};
  const revenue = stats.revenue || {};
  const recent = recentRes?.data || [];

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

      {/* Recent Onboarded */}
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
