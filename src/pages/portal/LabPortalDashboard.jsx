import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Clock, CheckCircle, AlertTriangle, FileText, Receipt } from "lucide-react";
import { getLabStats } from "@/lib/labTests";

export default function LabPortalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getLabStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { title: "Total Tests", value: stats?.totalTests ?? "—", icon: FlaskConical, color: "text-emerald-500" },
    { title: "Pending", value: stats?.pendingTests ?? stats?.pending ?? "—", icon: Clock, color: "text-amber-500" },
    { title: "Completed Today", value: stats?.completedToday ?? "—", icon: CheckCircle, color: "text-green-500" },
    { title: "Critical Results", value: stats?.criticalResults ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Lab Dashboard</h1>
        <p className="text-muted-foreground">Pathology Lab overview and quick actions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/lab-portal/tests")}>
          <CardContent className="flex items-center gap-4 p-6">
            <FlaskConical className="h-8 w-8 text-emerald-500" />
            <div>
              <h3 className="font-semibold">Lab Tests</h3>
              <p className="text-sm text-muted-foreground">Manage test orders & workflow</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/lab-portal/reports")}>
          <CardContent className="flex items-center gap-4 p-6">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="font-semibold">Reports</h3>
              <p className="text-sm text-muted-foreground">Generate & view lab reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/lab-portal/billing")}>
          <CardContent className="flex items-center gap-4 p-6">
            <Receipt className="h-8 w-8 text-violet-500" />
            <div>
              <h3 className="font-semibold">Billing</h3>
              <p className="text-sm text-muted-foreground">Invoices & payment tracking</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
