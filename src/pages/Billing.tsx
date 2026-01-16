import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getInvoices } from "@/lib/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  Receipt,
  IndianRupee,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import AddInvoiceDialog from "@/components/dashboard/AddInvoiceDialog";

const statusConfig: { [key: string]: { label: string; variant: "success" | "warning" | "destructive" | "default"; icon: React.ElementType }} = {
    paid: { label: "Paid", variant: "success", icon: CheckCircle2 },
    partial: { label: "Partial", variant: "warning", icon: Clock },
    pending: { label: "Pending", variant: "warning", icon: Clock },
    overdue: { label: "Overdue", variant: "destructive", icon: AlertCircle },
    cancelled: { label: "Cancelled", variant: "destructive", icon: AlertCircle },
    draft: { label: "Draft", variant: "default", icon: Clock },
};

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: invoices, isLoading, isError } = useQuery({
    queryKey: ['invoices', { status: statusFilter }],
    queryFn: () => getInvoices({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isError) {
    return <div className="text-red-500 text-center py-8">Error loading invoices. Please try again later.</div>;
  }

  // Defensive check to ensure invoices is an array
  if (!Array.isArray(invoices)) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const filteredInvoices = invoices.filter((invoice: any) => 
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalRevenue: invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0),
    collected: invoices.reduce((sum: number, inv: any) => sum + inv.paidAmount, 0),
    pending: invoices
      .filter((i: any) => i.status !== "paid")
      .reduce((sum: number, inv: any) => sum + inv.dueAmount, 0),
    paidCount: invoices.filter((i: any) => i.status === "paid").length,
    pendingCount: invoices.filter((i: any) => i.status !== "paid").length,
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Billing & Invoices
            </h1>
            <p className="text-muted-foreground">
              Manage patient billing and payment tracking
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{(stats.totalRevenue / 100000).toFixed(1)}L
              </div>
              <p className="text-xs text-muted-foreground">All invoices</p>
            </CardContent>
          </Card>
          <Card className="border-status-available/30 bg-status-available/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <IndianRupee className="h-4 w-4 text-status-available" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-available">
                ₹{(stats.collected / 100000).toFixed(1)}L
              </div>
              <p className="text-xs text-muted-foreground">{stats.paidCount} paid invoices</p>
            </CardContent>
          </Card>
          <Card className="border-status-occupied/30 bg-status-occupied/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-status-occupied" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-occupied">
                ₹{(stats.pending / 100000).toFixed(1)}L
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCount} pending invoices
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.collected / stats.totalRevenue) * 100).toFixed(0)}%
              </div>
              <Progress
                value={(stats.collected / stats.totalRevenue) * 100}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice ID or patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice: any) => {
                  const config = statusConfig[invoice.status] || statusConfig.draft;
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.patient.name}</TableCell>
                      <TableCell>
                        ₹{invoice.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-status-available">
                        ₹{invoice.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={invoice.dueAmount > 0 ? "text-status-occupied" : ""}
                      >
                        ₹{invoice.dueAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={config.variant}
                          className="flex w-fit items-center gap-1"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AddInvoiceDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />
    </>
  );
}
