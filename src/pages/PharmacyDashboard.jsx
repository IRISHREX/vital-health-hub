import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPharmacyStats, getMedicines, getPrescriptions, getStockHistory, getPharmacyInvoices } from "@/lib/pharmacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pill,
  Package,
  AlertTriangle,
  Search,
  Plus,
  Pencil,
  ArrowUpDown,
  ClipboardList,
  Loader2,
  CalendarClock,
  IndianRupee
} from "lucide-react";
import AddMedicineDialog from "@/components/pharmacy/AddMedicineDialog";
import StockAdjustDialog from "@/components/pharmacy/StockAdjustDialog";
import PrescriptionDialog from "@/components/pharmacy/PrescriptionDialog";
import DispenseDialog from "@/components/pharmacy/DispenseDialog";
import { useVisualAuth } from "@/hooks/useVisualAuth";

const statusColors = {
  active: "warning",
  partially_dispensed: "secondary",
  fully_dispensed: "success",
  cancelled: "destructive"
};

const invoiceStatusVariant = (status) => {
  if (status === "paid") return "success";
  if (status === "partial") return "secondary";
  if (status === "cancelled" || status === "refunded") return "destructive";
  return "warning";
};

const doctorName = (doctor) => {
  if (!doctor) return "Unknown";
  if (doctor.name) return `Dr. ${doctor.name}`;
  const rootName = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
  if (rootName) return `Dr. ${rootName}`;
  const userName = `${doctor.user?.firstName || ""} ${doctor.user?.lastName || ""}`.trim();
  return userName ? `Dr. ${userName}` : "Unknown";
};

export default function PharmacyDashboard() {
  const { getModulePermissions } = useVisualAuth();
  const permissions = getModulePermissions("pharmacy");
  const [tab, setTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortField, setSortField] = useState("-createdAt");
  const [addOpen, setAddOpen] = useState(false);
  const [editMed, setEditMed] = useState(null);
  const [stockMed, setStockMed] = useState(null);
  const [rxOpen, setRxOpen] = useState(false);
  const [dispenseRx, setDispenseRx] = useState(null);

  const { data: stats } = useQuery({ queryKey: ["pharmacy-stats"], queryFn: getPharmacyStats });
  const { data: medsRes, isLoading: medsLoading } = useQuery({
    queryKey: ["medicines", search, catFilter, sortField],
    queryFn: () =>
      getMedicines({
        search: search || undefined,
        category: catFilter === "all" ? undefined : catFilter,
        sort: sortField
      })
  });
  const { data: rxRes, isLoading: rxLoading } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => getPrescriptions()
  });
  const { data: historyRes } = useQuery({
    queryKey: ["stock-history"],
    queryFn: () => getStockHistory(),
    enabled: tab === "stock"
  });
  const { data: invoiceRes, isLoading: invoiceLoading } = useQuery({
    queryKey: ["pharmacy-invoices"],
    queryFn: () => getPharmacyInvoices(),
    enabled: tab === "invoices"
  });

  const s = stats?.data || {};
  const medicines = Array.isArray(medsRes) ? medsRes : medsRes?.data || [];
  const prescriptions = Array.isArray(rxRes) ? rxRes : rxRes?.data || [];
  const stockHistory = Array.isArray(historyRes) ? historyRes : historyRes?.data || [];
  const invoices = Array.isArray(invoiceRes) ? invoiceRes : invoiceRes?.data || [];

  const toggleSort = (field) =>
    setSortField((prev) => (prev === field ? `-${field}` : prev === `-${field}` ? field : field));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pharmacy</h1>
          <p className="text-muted-foreground">Medicine inventory, prescriptions, dispensing and invoices</p>
        </div>
        <div className="flex gap-2">
          {permissions.canCreate && (
          <Button variant="outline" onClick={() => setRxOpen(true)}>
            <ClipboardList className="mr-2 h-4 w-4" />New Prescription
          </Button>
          )}
          {permissions.canCreate && (
          <Button onClick={() => { setEditMed(null); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Medicine
          </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{s.totalMedicines || 0}</div></CardContent>
        </Card>
        <Card className="border-status-occupied/30 bg-status-occupied/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-occupied" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-occupied">{s.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Out of stock: {s.outOfStock || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.expiringIn30 || 0}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">Rs {((s.inventoryValue || 0) / 1000).toFixed(1)}K</div></CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="stock">Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, composition..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {["tablet", "capsule", "syrup", "injection", "ointment", "drops", "inhaler", "powder", "other"].map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {medsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Composition</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("category")}>Category <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("sellingPrice")}>Price <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("stock")}>Stock <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map((med) => (
                      <TableRow key={med._id}>
                        <TableCell>
                          <div className="font-medium">{med.name}</div>
                          {med.genericName && <div className="text-xs text-muted-foreground">{med.genericName}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{med.composition || "-"}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{med.category}</Badge></TableCell>
                        <TableCell>Rs {med.sellingPrice}</TableCell>
                        <TableCell>
                          <span className={med.stock <= med.reorderLevel ? "text-destructive font-bold" : ""}>{med.stock}</span>
                          {med.stock <= med.reorderLevel && <AlertTriangle className="inline ml-1 h-3 w-3 text-destructive" />}
                        </TableCell>
                        <TableCell className="text-sm">{med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {permissions.canEdit && <Button variant="ghost" size="icon" onClick={() => { setEditMed(med); setAddOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                            {permissions.canEdit && <Button variant="ghost" size="icon" onClick={() => setStockMed(med)}><Package className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {medicines.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No medicines found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {rxLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((rx) => {
                      const pName = rx.patient ? `${rx.patient.firstName || ""} ${rx.patient.lastName || ""}`.trim() : "Unknown";
                      return (
                        <TableRow key={rx._id}>
                          <TableCell className="font-medium">{pName}</TableCell>
                          <TableCell>{doctorName(rx.doctor)}</TableCell>
                          <TableCell>{rx.items?.length || 0} medicines</TableCell>
                          <TableCell><Badge variant={statusColors[rx.status] || "default"} className="capitalize">{rx.status?.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {permissions.canCreate && (rx.status === "active" || rx.status === "partially_dispensed") && (
                              <Button size="sm" variant="outline" onClick={() => setDispenseRx(rx)}>Dispense</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {prescriptions.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No prescriptions found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {invoiceLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const patientName = invoice.patient
                        ? `${invoice.patient.firstName || ""} ${invoice.patient.lastName || ""}`.trim()
                        : "Unknown";
                      return (
                        <TableRow key={invoice._id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber || "-"}</TableCell>
                          <TableCell>{patientName}</TableCell>
                          <TableCell>{invoice.items?.length || 0}</TableCell>
                          <TableCell>Rs {Number(invoice.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>Rs {Number(invoice.dueAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={invoiceStatusVariant(invoice.status)} className="capitalize">{invoice.status || "pending"}</Badge>
                          </TableCell>
                          <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                    {invoices.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pharmacy invoices found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Before to After</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell className="font-medium">{h.medicine?.name || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{h.type}</Badge></TableCell>
                      <TableCell>{h.quantity}</TableCell>
                      <TableCell>{h.previousStock} to {h.newStock}</TableCell>
                      <TableCell className="text-sm">{h.reason || "-"}</TableCell>
                      <TableCell className="text-sm">{h.adjustedBy ? `${h.adjustedBy.firstName || ""} ${h.adjustedBy.lastName || ""}`.trim() : "-"}</TableCell>
                      <TableCell className="text-sm">{new Date(h.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {stockHistory.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No stock adjustments yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddMedicineDialog open={addOpen} onOpenChange={setAddOpen} medicine={editMed} />
      {stockMed && <StockAdjustDialog open={!!stockMed} onOpenChange={() => setStockMed(null)} medicine={stockMed} />}
      <PrescriptionDialog open={rxOpen} onOpenChange={setRxOpen} />
      {dispenseRx && <DispenseDialog open={!!dispenseRx} onOpenChange={() => setDispenseRx(null)} prescription={dispenseRx} />}
    </div>
  );
}
