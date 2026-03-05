import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listNotices, createNotice, updateNotice, deleteNotice, listOrganizations } from '@/lib/grandmaster-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Bell, AlertTriangle, Info, Wrench, CreditCard, FileText } from 'lucide-react';

const typeIcons = { info: Info, warning: AlertTriangle, critical: AlertTriangle, maintenance: Wrench, subscription: CreditCard, policy: FileText };
const typeColors = { info: 'default', warning: 'secondary', critical: 'destructive', maintenance: 'outline', subscription: 'secondary', policy: 'outline' };

export default function Notices() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('all');

  const { data: noticesRes } = useQuery({ queryKey: ['gm-notices'], queryFn: () => listNotices({}) });
  const { data: orgsRes } = useQuery({ queryKey: ['gm-orgs-notices'], queryFn: () => listOrganizations({}) });
  const notices = noticesRes?.data || [];
  const orgs = orgsRes?.data || [];

  const createMut = useMutation({
    mutationFn: createNotice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-notices'] }); setOpen(false); toast({ title: 'Notice sent' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteNotice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-notices'] }); toast({ title: 'Notice deleted' }); },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title'), message: fd.get('message'), type: fd.get('type'), scope,
    };
    if (scope === 'specific') {
      data.targetOrganizations = fd.getAll('targets');
    }
    createMut.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Notices</h1>
          <p className="text-muted-foreground">{notices.length} notices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Send Notice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Send Platform Notice</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Title</Label><Input name="title" required /></div>
              <div><Label>Message</Label><Textarea name="message" required rows={4} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select name="type" defaultValue="info">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(typeIcons).map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Scope</Label>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      <SelectItem value="specific">Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {scope === 'specific' && (
                <div>
                  <Label className="mb-1 block">Target Organizations</Label>
                  <select name="targets" multiple className="w-full rounded border border-border bg-background p-2 text-sm text-foreground h-24">
                    {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Send Notice</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {notices.map((notice) => {
          const Icon = typeIcons[notice.type] || Bell;
          return (
            <Card key={notice._id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{notice.title}</p>
                      <Badge variant={typeColors[notice.type]}>{notice.type}</Badge>
                      <Badge variant="outline">{notice.scope}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notice.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notice.createdAt).toLocaleString()} · by {notice.createdBy}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                  onClick={() => deleteMut.mutate(notice._id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {notices.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No notices sent yet</CardContent></Card>
        )}
      </div>
    </div>
  );
}
