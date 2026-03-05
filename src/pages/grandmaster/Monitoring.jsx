import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listOrganizations, getOrgStats } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Users, Activity, Database } from 'lucide-react';

export default function Monitoring() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const { data: orgsRes } = useQuery({ queryKey: ['gm-orgs-mon'], queryFn: () => listOrganizations({}) });
  const { data: orgStatsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['gm-org-stats', selectedOrg?._id],
    queryFn: () => getOrgStats(selectedOrg._id),
    enabled: !!selectedOrg,
  });

  const orgs = orgsRes?.data || [];
  const orgStats = orgStatsRes?.data || {};
  const statusColor = { active: 'default', suspended: 'destructive', onboarding: 'secondary' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organization Monitoring</h1>
        <p className="text-muted-foreground">Monitor usage and health of each organization</p>
      </div>

      <div className="grid gap-3">
        {orgs.map((org) => (
          <Card key={org._id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedOrg(org)}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{org.name}</p>
                    <Badge variant={statusColor[org.status]}>{org.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{org.type?.replace('_', ' ')} · {org.enabledModules?.length} modules</p>
                </div>
              </div>
              <Button variant="outline" size="sm">View Stats</Button>
            </CardContent>
          </Card>
        ))}
        {orgs.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No organizations to monitor</CardContent></Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedOrg?.name} – Statistics</DialogTitle></DialogHeader>
          {statsLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Users', value: orgStats.stats?.users || 0, icon: Users },
                  { label: 'Patients', value: orgStats.stats?.patients || 0, icon: Activity },
                  { label: 'Beds', value: orgStats.stats?.beds || 0, icon: Building2 },
                  { label: 'Database', value: selectedOrg?.dbName || 'N/A', icon: Database },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <s.icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {orgStats.subscription && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Active Subscription</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Plan:</span> <span className="text-foreground">{orgStats.subscription.plan?.name}</span></p>
                    <p><span className="text-muted-foreground">Status:</span> <Badge variant="default">{orgStats.subscription.status}</Badge></p>
                    <p><span className="text-muted-foreground">Ends:</span> <span className="text-foreground">{new Date(orgStats.subscription.endDate).toLocaleDateString()}</span></p>
                  </CardContent>
                </Card>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Enabled Modules</p>
                <div className="flex flex-wrap gap-1">
                  {selectedOrg?.enabledModules?.map(m => <Badge key={m} variant="secondary" className="text-xs capitalize">{m}</Badge>)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
