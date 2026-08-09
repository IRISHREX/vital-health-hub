import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Bell, RefreshCw } from "lucide-react";
import * as he from "@/lib/hrms-employees";

const BUCKET_ORDER = ["overdue", "due_30", "due_60", "due_90"];

export default function ComplianceCenter() {
  const [staffCategory, setStaffCategory] = useState("all");

  const dashboardQ = useQuery({
    queryKey: ["hrms-compliance", staffCategory],
    queryFn: () => he.getComplianceDashboard({ staffCategory: staffCategory === "all" ? undefined : staffCategory }),
  });

  const runAlerts = useMutation({
    mutationFn: () => he.runComplianceAlerts(),
    onSuccess: async (res) => { toast.success(`Alerts sent for ${res.created || 0} item(s)`); await dashboardQ.refetch(); },
    onError: (e) => toast.error(e.message || "Could not run alerts"),
  });

  const aggregate = dashboardQ.data?.aggregate || {};
  const perEmployee = dashboardQ.data?.perEmployee || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />Compliance Center
          </h2>
          <p className="text-sm text-muted-foreground">Licenses, certifications, immunizations, health checks &amp; privileges expiry tracking.</p>
        </div>
        <div className="flex gap-2">
          <Select value={staffCategory} onValueChange={setStaffCategory}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {he.STAFF_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{he.titleCase(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={runAlerts.isPending} onClick={() => runAlerts.mutate()}>
            <Bell className={`mr-2 h-4 w-4 ${runAlerts.isPending ? "animate-pulse" : ""}`} />
            {runAlerts.isPending ? "Running..." : "Run alerts"}
          </Button>
          <Button variant="ghost" onClick={() => dashboardQ.refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {BUCKET_ORDER.map((bucket) => (
          <Card key={bucket}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{he.BUCKET_LABELS[bucket]}</p>
              <p className="text-2xl font-bold">{aggregate[bucket] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Employees needing attention</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Category</TableHead><TableHead>Department</TableHead>
              <TableHead>Worst status</TableHead><TableHead>Items</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {perEmployee.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nothing due — all compliant</TableCell></TableRow>
              ) : perEmployee.map((emp) => (
                <TableRow key={emp.employeeId}>
                  <TableCell>{emp.employeeName} <span className="text-xs text-muted-foreground">({emp.employeeCode})</span></TableCell>
                  <TableCell>{he.titleCase(emp.staffCategory)}</TableCell>
                  <TableCell>{emp.department || "—"}</TableCell>
                  <TableCell><Badge variant={he.bucketBadgeVariant(emp.worstBucket)}>{he.BUCKET_LABELS[emp.worstBucket]}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    {emp.items.map((item, i) => (
                      <Badge key={i} variant={he.bucketBadgeVariant(item.bucket)} className="mb-1">
                        {item.label}: {item.bucket === "overdue" ? "expired" : `${item.daysRemaining}d`}
                      </Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
