import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine, Clock, CheckCircle, FileText, Receipt } from "lucide-react";
import { getRadiologyStats } from "@/lib/radiology";

export default function RadiologyPortalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getRadiologyStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { title: "Total Orders", value: stats?.totalOrders ?? "—", icon: ScanLine, color: "text-purple-500" },
    { title: "Pending", value: stats?.pendingOrders ?? stats?.pending ?? "—", icon: Clock, color: "text-amber-500" },
    { title: "Completed Today", value: stats?.completedToday ?? "—", icon: CheckCircle, color: "text-green-500" },
    { title: "Reports Pending", value: stats?.reportsPending ?? 0, icon: FileText, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Radiology Dashboard</h1>
        <p className="text-muted-foreground">Imaging center overview and quick actions</p>
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/radiology-portal/orders")}>
          <CardContent className="flex items-center gap-4 p-6">
            <ScanLine className="h-8 w-8 text-purple-500" />
            <div>
              <h3 className="font-semibold">Radiology Orders</h3>
              <p className="text-sm text-muted-foreground">Manage imaging orders & workflow</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/radiology-portal/reports")}>
          <CardContent className="flex items-center gap-4 p-6">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="font-semibold">Reports</h3>
              <p className="text-sm text-muted-foreground">Generate & review imaging reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/radiology-portal/billing")}>
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
