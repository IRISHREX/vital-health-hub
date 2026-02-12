import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import AddNurseDialog from "@/components/dashboard/AddNurseDialog";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import RestrictedAction from "@/components/permissions/RestrictedAction";

export default function Nurses() {
  const { canCreate } = useVisualAuth();
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/users/nurses");
      setNurses(res.data.users || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nurse Management
          </h1>
          <p className="text-muted-foreground">
            View and manage nurse accounts.
          </p>
        </div>
        {canCreate("nurses") && (
          <RestrictedAction module="nurses" feature="create">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Nurse
            </Button>
          </RestrictedAction>
        )}
      </div>

      <AddNurseDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchData}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Nurses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nurses.length > 0 ? (
                nurses.map((nurse) => (
                  <TableRow key={nurse._id}>
                    <TableCell>{`${nurse.firstName} ${nurse.lastName}`}</TableCell>
                    <TableCell>{nurse.email}</TableCell>
                    <TableCell>{nurse.role}</TableCell>
                    <TableCell>{nurse.department || "N/A"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="4" className="text-center">
                    No nurses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
