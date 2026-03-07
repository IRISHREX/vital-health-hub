import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getKpis,
  getFinancialReport,
  getAdmissionsReport,
  getPrescriptionsReport,
  getBillingReport,
  getAnalyzerReport,
} from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  TrendingUp,
  Users,
  Bed,
  IndianRupee,
  Loader2,
  FileText,
  Pill,
  Activity,
} from "lucide-react";

const getRange = (period) => {
  const end = new Date();
  const start = new Date(end);
  if (period === "week") start.setDate(end.getDate() - 6);
  if (period === "month") start.setMonth(end.getMonth() - 1);
  if (period === "quarter") start.setMonth(end.getMonth() - 3);
  if (period === "year") start.setFullYear(end.getFullYear() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const toCsv = (rows) =>
  rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

const downloadFile = (name, content) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [analyzerDimension, setAnalyzerDimension] = useState("patient");
  const range = useMemo(() => getRange(period), [period]);

  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useQuery({
    queryKey: ["kpis"],
    queryFn: getKpis
  });

  const { data: financialReport, isLoading: financialLoading, isError: financialError } = useQuery({
    queryKey: ["financialReport", period, range.startDate, range.endDate],
    queryFn: () => getFinancialReport({
      startDate: range.startDate,
      endDate: range.endDate,
      groupBy: period === "year" || period === "quarter" ? "month" : "day",
    })
  });

  const { data: admissionsReport, isLoading: admissionsLoading, isError: admissionsError } = useQuery({
    queryKey: ["admissionsReport", period, range.startDate, range.endDate],
    queryFn: () => getAdmissionsReport({
      startDate: range.startDate,
      endDate: range.endDate,
    })
  });

  const { data: prescriptionsData, isLoading: prescriptionsLoading, isError: prescriptionsError } = useQuery({
    queryKey: ["prescriptionsReport", period, range.startDate, range.endDate],
    queryFn: () => getPrescriptionsReport({
      startDate: range.startDate,
      endDate: range.endDate,
      limit: 100,
    })
  });

  const { data: billingData, isLoading: billingLoading, isError: billingError } = useQuery({
    queryKey: ["billingReport", period, range.startDate, range.endDate],
    queryFn: () => getBillingReport({
      startDate: range.startDate,
      endDate: range.endDate,
      limit: 100,
    })
  });

  const { data: analyzerData, isLoading: analyzerLoading, isError: analyzerError } = useQuery({
    queryKey: ["analyzerReport", analyzerDimension, period, range.startDate, range.endDate],
    queryFn: () => getAnalyzerReport({
      dimension: analyzerDimension,
      startDate: range.startDate,
      endDate: range.endDate,
      limit: 25,
    })
  });

  if (kpisLoading || financialLoading || admissionsLoading || prescriptionsLoading || billingLoading || analyzerLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (kpisError || financialError || admissionsError || prescriptionsError || billingError || analyzerError) {
    return <div className="text-red-500 text-center py-8">Error loading reports. Please try again later.</div>;
  }

  if (typeof kpis !== "object" || kpis === null || !Array.isArray(financialReport) || !Array.isArray(admissionsReport)) {
    return <div className="text-red-500 text-center py-8">Inconsistent report data. Please try again later.</div>;
  }

  const financialRows = financialReport.map((item) => ({
    label: typeof item?._id === "string"
      ? item._id
      : `${item?._id?.year || ""}-${String(item?._id?.month || "").padStart(2, "0")}`,
    revenue: Number(item?.totalRevenue || 0),
    invoices: Number(item?.totalInvoices || 0),
  }));

  const monthlyRevenue = financialRows.map((item) => {
    const isMonthKey = /^\d{4}-\d{2}$/.test(item.label);
    const parsedDate = isMonthKey ? new Date(`${item.label}-01`) : new Date(item.label);
    return {
      month: Number.isNaN(parsedDate.getTime())
        ? item.label
        : parsedDate.toLocaleString("default", { month: "short", day: isMonthKey ? undefined : "numeric" }),
      revenue: item.revenue,
    };
  });

  const admissionRows = admissionsReport.map((item) => ({
    date: item?._id || "",
    count: Number(item?.count || 0),
  }));

  const prescriptions = Array.isArray(prescriptionsData?.data) ? prescriptionsData.data : [];
  const bills = Array.isArray(billingData?.data) ? billingData.data : [];
  const analyzerRows = Array.isArray(analyzerData?.data) ? analyzerData.data : [];

  const exportOverview = () => {
    const financialCsv = toCsv([
      ["Label", "Revenue", "Invoices"],
      ...financialRows.map((row) => [row.label, row.revenue, row.invoices]),
    ]);
    const admissionsCsv = toCsv([
      ["Date", "Admissions"],
      ...admissionRows.map((row) => [row.date, row.count]),
    ]);
    downloadFile(`reports_financial_${period}.csv`, financialCsv);
    downloadFile(`reports_admissions_${period}.csv`, admissionsCsv);
  };

  const exportPrescriptions = () => {
    const csv = toCsv([
      ["Date", "Patient", "Doctor", "Mode", "Status", "Medicines"],
      ...prescriptions.map((row) => [
        formatDateTime(row.createdAt),
        row.mode === "external"
          ? (row.externalPatient?.name || "Walk-in")
          : `${row.patient?.firstName || ""} ${row.patient?.lastName || ""}`.trim(),
        row.doctor?.name || `${row.doctor?.user?.firstName || ""} ${row.doctor?.user?.lastName || ""}`.trim() || "-",
        row.mode || "-",
        row.status || "-",
        Array.isArray(row.items) ? row.items.map((item) => item.medicineName).join(" | ") : "-"
      ]),
    ]);
    downloadFile(`reports_prescriptions_${period}.csv`, csv);
  };

  const exportBilling = () => {
    const csv = toCsv([
      ["Invoice", "Date", "Patient", "Type", "Scope", "Status", "Total", "Paid", "Due"],
      ...bills.map((row) => [
        row.invoiceNumber || "-",
        formatDateTime(row.createdAt),
        row.billingScope === "external"
          ? (row.externalPatientInfo?.name || "Walk-in")
          : `${row.patient?.firstName || ""} ${row.patient?.lastName || ""}`.trim(),
        row.type || "-",
        row.billingScope || "-",
        row.status || "-",
        row.totalAmount || 0,
        row.paidAmount || 0,
        row.dueAmount || 0,
      ]),
    ]);
    downloadFile(`reports_billing_${period}.csv`, csv);
  };

  const exportAnalyzer = () => {
    if (!analyzerRows.length) return;
    const keys = Object.keys(analyzerRows[0] || {});
    const csv = toCsv([
      keys,
      ...analyzerRows.map((row) => keys.map((key) => row[key] ?? "")),
    ]);
    downloadFile(`reports_analyzer_${analyzerDimension}_${period}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive hospital performance insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={exportOverview}>
              <Download className="mr-2 h-4 w-4" />
              Download Overview
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Admissions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalAdmissions}</div>
                <p className="text-xs text-muted-foreground">{kpis.newAdmissionsToday} today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Bed Occupancy</CardTitle>
                <Bed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.bedOccupancyRate}%</div>
                <p className="text-xs text-muted-foreground">Total patients: {kpis.totalPatients}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rs {(Number(kpis.totalRevenue || 0) / 100000).toFixed(1)}L</div>
                <p className="text-xs text-muted-foreground">Appointments today: {kpis.appointmentsToday}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Discharged Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.dischargedToday}</div>
                <p className="text-xs text-muted-foreground">&nbsp;</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs ${value}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value) => [`Rs ${Number(value).toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Admissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={admissionRows}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={exportPrescriptions}>
              <Download className="mr-2 h-4 w-4" />
              Download Prescriptions
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Medicines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>
                        {row.mode === "external"
                          ? (row.externalPatient?.name || "Walk-in")
                          : `${row.patient?.firstName || ""} ${row.patient?.lastName || ""}`.trim() || "-"}
                      </TableCell>
                      <TableCell>{row.doctor?.name || `${row.doctor?.user?.firstName || ""} ${row.doctor?.user?.lastName || ""}`.trim() || "-"}</TableCell>
                      <TableCell className="uppercase">{row.mode || "-"}</TableCell>
                      <TableCell className="uppercase">{row.status || "-"}</TableCell>
                      <TableCell>{Array.isArray(row.items) ? row.items.map((item) => item.medicineName).join(", ") : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {prescriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No prescriptions found for selected period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={exportBilling}>
              <Download className="mr-2 h-4 w-4" />
              Download Billing
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Billed</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(billingData?.summary?.totalBilled)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(billingData?.summary?.totalPaid)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Due</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(billingData?.summary?.totalDue)}</div></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                Billing Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{row.invoiceNumber || "-"}</TableCell>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>
                        {row.billingScope === "external"
                          ? (row.externalPatientInfo?.name || "Walk-in")
                          : `${row.patient?.firstName || ""} ${row.patient?.lastName || ""}`.trim() || "-"}
                      </TableCell>
                      <TableCell className="uppercase">{row.type || "-"}</TableCell>
                      <TableCell className="uppercase">{row.status || "-"}</TableCell>
                      <TableCell>{formatCurrency(row.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(row.paidAmount)}</TableCell>
                      <TableCell>{formatCurrency(row.dueAmount)}</TableCell>
                    </TableRow>
                  ))}
                  {bills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">No billing records found for selected period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyzer" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Analyzer</h3>
            </div>
            <div className="flex gap-2">
              <Select value={analyzerDimension} onValueChange={setAnalyzerDimension}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Analyzer Dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient Wise</SelectItem>
                  <SelectItem value="doctor">Doctor Wise</SelectItem>
                  <SelectItem value="nurse">Nurse Wise</SelectItem>
                  <SelectItem value="medicine">Medicine Wise</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportAnalyzer}>
                <Download className="mr-2 h-4 w-4" />
                Download Analyzer
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                {analyzerDimension.charAt(0).toUpperCase() + analyzerDimension.slice(1)} Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    {analyzerDimension === "patient" && (
                      <>
                        <TableHead>Invoices</TableHead>
                        <TableHead>Billed</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Due</TableHead>
                      </>
                    )}
                    {analyzerDimension === "doctor" && (
                      <>
                        <TableHead>Prescriptions</TableHead>
                        <TableHead>Total Items</TableHead>
                      </>
                    )}
                    {analyzerDimension === "nurse" && (
                      <>
                        <TableHead>Vitals Recorded</TableHead>
                        <TableHead>Patients Covered</TableHead>
                      </>
                    )}
                    {analyzerDimension === "medicine" && (
                      <>
                        <TableHead>Prescribed Qty</TableHead>
                        <TableHead>Dispensed Qty</TableHead>
                        <TableHead>Prescription Count</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyzerRows.map((row, index) => (
                    <TableRow key={`${row.key || row.label}-${index}`}>
                      <TableCell>{row.label || row.key || "-"}</TableCell>
                      {analyzerDimension === "patient" && (
                        <>
                          <TableCell>{row.invoiceCount || 0}</TableCell>
                          <TableCell>{formatCurrency(row.totalBilled)}</TableCell>
                          <TableCell>{formatCurrency(row.totalPaid)}</TableCell>
                          <TableCell>{formatCurrency(row.totalDue)}</TableCell>
                        </>
                      )}
                      {analyzerDimension === "doctor" && (
                        <>
                          <TableCell>{row.prescriptionCount || 0}</TableCell>
                          <TableCell>{row.totalItems || 0}</TableCell>
                        </>
                      )}
                      {analyzerDimension === "nurse" && (
                        <>
                          <TableCell>{row.vitalsRecorded || 0}</TableCell>
                          <TableCell>{row.patientsCovered || 0}</TableCell>
                        </>
                      )}
                      {analyzerDimension === "medicine" && (
                        <>
                          <TableCell>{row.prescribedQty || 0}</TableCell>
                          <TableCell>{row.dispensedQty || 0}</TableCell>
                          <TableCell>{row.prescriptionCount || 0}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {analyzerRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No analyzer records found for selected filters.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
