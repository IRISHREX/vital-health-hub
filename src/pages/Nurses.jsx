import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, Trash2, Users, UserCheck, Shield, Phone, Mail, Building } from "lucide-react";
import AddNurseDialog from "@/components/dashboard/AddNurseDialog";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import RestrictedAction from "@/components/permissions/RestrictedAction";
import { useNavigate } from "react-router-dom";
import { deleteUser } from "@/lib/users";
import { toast } from "sonner";

export default function Nurses() {
  const { canCreate, canEdit, canDelete } = useVisualAuth();
  const navigate = useNavigate();
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/users/nurses");
      setNurses(res.data?.users || []);
    } catch (err) { setError(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredNurses = nurses.filter(n => {
    const q = searchQuery.toLowerCase();
    return `${n.firstName} ${n.lastName}`.toLowerCase().includes(q) || (n.email || '').toLowerCase().includes(q) || (n.department || '').toLowerCase().includes(q);
  });

  const headNurses = nurses.filter(n => n.role === 'head_nurse');
  const staffNurses = nurses.filter(n => n.role === 'nurse');

  const openCreateDialog = () => {
    setDialogMode("create");
    setSelectedNurse(null);
    setDialogOpen(true);
  };

  const openEditDialog = (nurse) => {
    setDialogMode("edit");
    setSelectedNurse(nurse);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedNurse(null);
    setDialogMode("create");
  };

  const handleDeleteNurse = async (nurse) => {
    const label = `${nurse?.firstName || ""} ${nurse?.lastName || ""}`.trim() || "this nurse";
    const ok = window.confirm(`Delete ${label}?`);
    if (!ok) return;
    try {
      await deleteUser(nurse._id);
      toast.success("Nurse deleted");
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to delete nurse");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading nurses...</div></div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nurse Management</h1>
          <p className="text-muted-foreground">Manage nurse accounts, assignments, and roles</p>
        </div>
        {canCreate("nurses") && (
          <RestrictedAction module="nurses" feature="create">
            <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />Add Nurse</Button>
          </RestrictedAction>
        )}
      </div>

      <AddNurseDialog isOpen={dialogOpen} onClose={closeDialog} onSuccess={fetchData} nurse={selectedNurse} mode={dialogMode} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nurses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{nurses.length}</div><p className="text-xs text-muted-foreground">Registered staff</p></CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Head Nurses</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{headNurses.length}</div><p className="text-xs text-muted-foreground">Senior nursing staff</p></CardContent>
        </Card>
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Nurses</CardTitle>
            <UserCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-accent">{staffNurses.length}</div><p className="text-xs text-muted-foreground">Active nurses</p></CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, email, department..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Nurse Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredNurses.length > 0 ? (
          filteredNurses.map(nurse => (
            <Card key={nurse._id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-accent/10 text-accent text-sm">
                      {nurse.firstName?.[0]}{nurse.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{nurse.firstName} {nurse.lastName}</h3>
                      <Badge variant={nurse.role === 'head_nurse' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {nurse.role === 'head_nurse' ? 'Head Nurse' : 'Nurse'}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" /><span className="truncate">{nurse.email}</span></div>
                      {nurse.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{nurse.phone}</div>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building className="h-3 w-3" />{nurse.department || 'General'}</div>
                    </div>
                    {nurse.assignedRooms?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {nurse.assignedRooms.slice(0, 3).map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{r.ward} F{r.floor} R{r.roomNumber}</Badge>
                        ))}
                        {nurse.assignedRooms.length > 3 && <Badge variant="outline" className="text-[10px]">+{nurse.assignedRooms.length - 3}</Badge>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="View Nurse" aria-label="View nurse details" onClick={() => navigate('/nurse', { state: { selectedNurseId: nurse._id } })}><Eye className="h-4 w-4" /></Button>
                  {canEdit("nurses") && <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Nurse" aria-label="Edit nurse" onClick={() => openEditDialog(nurse)}><Pencil className="h-4 w-4" /></Button>}
                  {canDelete("nurses") && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive" title="Delete Nurse" aria-label="Delete nurse" onClick={() => handleDeleteNurse(nurse)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-8">No nurses found.</p>
        )}
      </div>
    </div>
  );
}
