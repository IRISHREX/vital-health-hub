import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, AlertTriangle, ClipboardList, Receipt, Package } from "lucide-react";
import { getPharmacyStats } from "@/lib/pharmacy";

export default function PharmacyPortalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getPharmacyStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { title: "Total Medicines", value: stats?.totalMedicines ?? "—", icon: Pill, color: "text-blue-500" },
    { title: "Low Stock", value: stats?.lowStock ?? "—", icon: AlertTriangle, color: "text-amber-500" },
    { title: "Prescriptions Today", value: stats?.prescriptionsToday ?? "—", icon: ClipboardList, color: "text-green-500" },
    { title: "Expired Items", value: stats?.expiredMedicines ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground">Pharmacy operations overview</p>
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pharmacy-portal/medicines")}>
          <CardContent className="flex items-center gap-4 p-6">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="font-semibold">Medicines</h3>
              <p className="text-sm text-muted-foreground">Inventory & stock management</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pharmacy-portal/prescriptions")}>
          <CardContent className="flex items-center gap-4 p-6">
            <ClipboardList className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold">Prescriptions</h3>
              <p className="text-sm text-muted-foreground">Dispense & manage prescriptions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pharmacy-portal/billing")}>
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
