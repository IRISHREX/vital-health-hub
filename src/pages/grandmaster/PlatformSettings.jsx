import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listConfigs, upsertConfig, deleteConfig } from '@/lib/grandmaster-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Settings } from 'lucide-react';

const CATEGORIES = ['general', 'pricing', 'modules', 'notifications', 'security'];

export default function PlatformSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const { data: configsRes } = useQuery({ queryKey: ['gm-configs'], queryFn: () => listConfigs() });
  const configs = configsRes?.data || [];

  const upsertMut = useMutation({
    mutationFn: upsertConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-configs'] }); setOpen(false); toast({ title: 'Config saved' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-configs'] }); toast({ title: 'Config deleted' }); },
  });

  const handleUpsert = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let value = fd.get('value');
    try { value = JSON.parse(value); } catch {} // Try parsing as JSON
    upsertMut.mutate({
      key: fd.get('key'), value, category: fd.get('category'), description: fd.get('description'),
    });
  };

  const filteredConfigs = configs.filter(c => c.category === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground">Global configuration for the platform</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Config</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add/Update Configuration</DialogTitle></DialogHeader>
            <form onSubmit={handleUpsert} className="space-y-4">
              <div><Label>Key</Label><Input name="key" required placeholder="e.g. default_currency" /></div>
              <div><Label>Value</Label><Textarea name="value" required placeholder="String, number, or JSON" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select name="category" defaultValue="general">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Input name="description" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={upsertMut.isPending}>Save Config</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {CATEGORIES.map(c => (
            <TabsTrigger key={c} value={c} className="capitalize">{c}</TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map(c => (
          <TabsContent key={c} value={c} className="space-y-3">
            {filteredConfigs.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No configurations in this category</CardContent></Card>
            ) : (
              filteredConfigs.map((config) => (
                <Card key={config._id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium text-foreground">{config.key}</p>
                          <Badge variant="outline" className="text-xs">{config.category}</Badge>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">
                          {typeof config.value === 'object' ? JSON.stringify(config.value) : String(config.value)}
                        </p>
                        {config.description && <p className="text-xs text-muted-foreground">{config.description}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => deleteMut.mutate(config.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
