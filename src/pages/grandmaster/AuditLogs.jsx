import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAuditLogs, getAuditLogStats } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Loader2, Eye, Shield, Database, CreditCard,
  Settings2, Trash2, UserPlus, Edit, Power, RefreshCw,
  ChevronLeft, ChevronRight, Clock, Activity
} from 'lucide-react';

const ACTION_CONFIG = {
  impersonate_org:      { label: 'Impersonation', icon: Eye, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  update_settings_tabs: { label: 'Settings Tabs Updated', icon: Settings2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  update_payment_config:{ label: 'Payment Config Updated', icon: CreditCard, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  proxy_create:         { label: 'Remote Create', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  proxy_update:         { label: 'Remote Update', icon: Edit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  proxy_delete:         { label: 'Remote Delete', icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10' },
  onboard_org:          { label: 'Org Onboarded', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  update_org:           { label: 'Org Updated', icon: Edit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  update_org_modules:   { label: 'Modules Updated', icon: Database, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  suspend_org:          { label: 'Org Suspended', icon: Power, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  reactivate_org:       { label: 'Org Reactivated', icon: RefreshCw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  delete_org:           { label: 'Org Deleted', icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10' },
  create_admin:         { label: 'Admin Created', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  update_admin:         { label: 'Admin Updated', icon: Edit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  delete_admin:         { label: 'Admin Deleted', icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10' },
  create_notice:        { label: 'Notice Created', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  update_notice:        { label: 'Notice Updated', icon: Edit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  delete_notice:        { label: 'Notice Deleted', icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10' },
  upsert_config:        { label: 'Config Updated', icon: Settings2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  delete_config:        { label: 'Config Deleted', icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10' },
};

const ALL_ACTIONS = Object.keys(ACTION_CONFIG);

const formatDate = (d) => {
  if (!d) return '–';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const limit = 30;

  const params = { page, limit };
  if (actionFilter !== 'all') params.action = actionFilter;

  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['gm-audit-logs', page, actionFilter],
    queryFn: () => listAuditLogs(params),
  });

  const { data: statsRes } = useQuery({
    queryKey: ['gm-audit-stats'],
    queryFn: getAuditLogStats,
  });

  const logs = logsRes?.data || [];
  const meta = logsRes?.meta || {};
  const stats = statsRes?.data || {};
  const totalPages = Math.ceil((meta.total || 0) / limit);

  const filteredLogs = searchQuery.trim()
    ? logs.filter((log) => {
        const q = searchQuery.toLowerCase();
        return (
          (log.actor?.email || '').toLowerCase().includes(q) ||
          (log.actor?.name || '').toLowerCase().includes(q) ||
          (log.targetOrg?.name || '').toLowerCase().includes(q) ||
          (log.targetOrg?.slug || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q)
        );
      })
    : logs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">Track all grandmaster actions across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total ?? '–'}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.last24h ?? '–'}</p>
                <p className="text-xs text-muted-foreground">Last 24 Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2.5">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(stats.byAction?.proxy_delete || 0) + (stats.byAction?.delete_org || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Destructive Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by actor, org name, or action..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ALL_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_CONFIG[a].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <CardDescription>{meta.total ?? 0} total events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No audit logs found</div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted' };
                  const Icon = config.icon;
                  return (
                    <button
                      key={log._id}
                      type="button"
                      className="w-full flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className={`mt-0.5 rounded-lg p-2 ${config.bg} shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{config.label}</span>
                          {log.targetOrg?.name && (
                            <Badge variant="outline" className="text-xs">{log.targetOrg.name}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          by {log.actor?.name || log.actor?.email || 'Unknown'}
                          {log.details?.resource && ` · ${log.details.resource}`}
                          {log.details?.recordId && ` #${String(log.details.recordId).slice(-6)}`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {timeAgo(log.createdAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <p className="font-medium">{ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actor</p>
                  <p className="font-medium">{selectedLog.actor?.name || '–'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.actor?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target Organization</p>
                  <p className="font-medium">{selectedLog.targetOrg?.name || '–'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.targetOrg?.slug || ''}</p>
                </div>
                {selectedLog.ip && (
                  <div>
                    <p className="text-muted-foreground">IP Address</p>
                    <p className="font-medium font-mono text-xs">{selectedLog.ip}</p>
                  </div>
                )}
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Details</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
