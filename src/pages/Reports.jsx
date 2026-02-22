import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getKpis, getFinancialReport, getAdmissionsReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Loader2
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

export default function Reports() {
  const [period, setPeriod] = useState("month");
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

  if (kpisLoading || financialLoading || admissionsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (kpisError || financialError || admissionsError) {
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

  const handleExport = () => {
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
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Admissions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalAdmissions}</div>
            <p className="text-xs text-muted-foreground">{kpis.newAdmissionsToday} today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Bed Occupancy
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">
              Discharged Today
            </CardTitle>
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
    </div>
  );
}
