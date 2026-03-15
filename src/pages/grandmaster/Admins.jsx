import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/lib/grandmaster-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Users } from 'lucide-react';
import { isValidPhone } from '@/lib/phoneValidation';

export default function Admins() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const { data: adminsRes } = useQuery({ queryKey: ['gm-admins'], queryFn: listAdmins });
  const admins = adminsRes?.data || [];

  const createMut = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-admins'] }); setOpen(false); toast({ title: 'Admin created' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }) => updateAdmin(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gm-admins'] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gm-admins'] }); toast({ title: 'Admin deleted' }); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const phone = fd.get('phone');
    
    // Validate phone number
    if (phone && !isValidPhone(phone)) {
      setPhoneError('Phone number must contain exactly 10 digits');
      return;
    }
    
    setPhoneError('');
    createMut.mutate({
      email: fd.get('email'), password: fd.get('password'),
      firstName: fd.get('firstName'), lastName: fd.get('lastName'),
      role: fd.get('role'), phone: fd.get('phone'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Admins</h1>
          <p className="text-muted-foreground">{admins.length} admins registered</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Admin</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Platform Admin</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input name="firstName" required /></div>
                <div><Label>Last Name</Label><Input name="lastName" required /></div>
              </div>
              <div><Label>Email</Label><Input name="email" type="email" required /></div>
              <div><Label>Password</Label><Input name="password" type="password" required minLength={8} /></div>
              <div><Label>Phone</Label><Input name="phone" placeholder="Enter 10-digit phone number" className={phoneError ? "border-red-500" : ""} /></div>
              <div><Label>Role</Label>
                <Select name="role" defaultValue="platform_admin">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform_admin">Platform Admin</SelectItem>
                    <SelectItem value="grandmaster">Grandmaster</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Create Admin</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {admins.map((admin) => (
          <Card key={admin._id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{admin.firstName} {admin.lastName}</p>
                    <Badge variant={admin.role === 'grandmaster' ? 'default' : 'secondary'}>{admin.role}</Badge>
                    {!admin.isActive && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <Switch checked={admin.isActive} onCheckedChange={(v) => toggleMut.mutate({ id: admin._id, isActive: v })} />
                </div>
                {admin.role !== 'grandmaster' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => { if (confirm('Delete this admin?')) deleteMut.mutate(admin._id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
