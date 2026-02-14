import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addPayment, createInvoice, getInvoices } from "@/lib/invoices";
import { getHospitalSettings } from "@/lib/settings";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Eye,
  Loader2,
  Receipt,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import AddInvoiceDialog from "@/components/dashboard/AddInvoiceDialog";
import RestrictedAction from "@/components/permissions/RestrictedAction";

const statusConfig = {
  paid: { label: "Paid", variant: "success", icon: CheckCircle2 },
  partial: { label: "Partial", variant: "warning", icon: Clock },
  pending: { label: "Pending", variant: "warning", icon: Clock },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertCircle },
  refunded: { label: "Refunded", variant: "secondary", icon: AlertCircle },
  draft: { label: "Draft", variant: "default", icon: Clock }
};

const billingOptionConfig = {
  opd: { label: "OPD Billing" },
  ipd: { label: "IPD Billing" },
  emergency: { label: "Emergency Billing" },
  lab: { label: "Lab Billing" },
  radiology: { label: "Radiology Billing" },
  pharmacy: { label: "Pharmacy Billing" },
  other: { label: "Other Billing" }
};

const defaultHospital = {
  hospitalName: "Hospital",
  address: "",
  phone: "",
  email: "",
  website: "",
};

const getPatientName = (invoiceOrPatient) => {
  const patient = invoiceOrPatient?.patient ? invoiceOrPatient.patient : invoiceOrPatient;
  if (!patient) return "Unknown Patient";
  if (typeof patient.name === "string" && patient.name.trim()) return patient.name;
  const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  return fullName || "Unknown Patient";
};

const fileDownload = (fileName, content, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const invoiceToCsvRows = (invoice) => {
  const rows = [];
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  if (items.length === 0) {
    rows.push([
      invoice.invoiceNumber || "",
      getPatientName(invoice),
      invoice.type || "",
      "",
      "",
      "",
      Number(invoice.totalAmount || 0),
      Number(invoice.paidAmount || 0),
      Number(invoice.dueAmount || 0),
      invoice.status || "",
      new Date(invoice.createdAt).toLocaleString()
    ]);
    return rows;
  }

  items.forEach((item) => {
    rows.push([
      invoice.invoiceNumber || "",
      getPatientName(invoice),
      invoice.type || "",
      item.description || "",
      Number(item.quantity || 1),
      Number(item.unitPrice || 0),
      Number(item.amount || 0),
      Number(invoice.paidAmount || 0),
      Number(invoice.dueAmount || 0),
      invoice.status || "",
      new Date(invoice.createdAt).toLocaleString()
    ]);
  });

  return rows;
};

const toCsv = (rows) =>
  rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

const downloadSingleInvoice = (invoice) => {
  const header = [
    "Invoice Number",
    "Patient",
    "Type",
    "Item",
    "Qty",
    "Unit Price",
    "Amount",
    "Paid",
    "Due",
    "Status",
    "Date"
  ];
  const csv = toCsv([header, ...invoiceToCsvRows(invoice)]);
  fileDownload(`${invoice.invoiceNumber || "invoice"}.csv`, csv, "text/csv;charset=utf-8");
};

const downloadPatientInvoices = (patientName, invoices) => {
  const header = [
    "Invoice Number",
    "Patient",
    "Type",
    "Item",
    "Qty",
    "Unit Price",
    "Amount",
    "Paid",
    "Due",
    "Status",
    "Date"
  ];
  const csv = toCsv([header, ...invoices.flatMap((inv) => invoiceToCsvRows(inv))]);
  const safeName = String(patientName || "patient").replace(/[^a-z0-9_-]+/gi, "_");
  fileDownload(`${safeName}_all_invoices.csv`, csv, "text/csv;charset=utf-8");
};

const getGeneratedByLabel = (invoice) => {
  const full = `${invoice?.generatedBy?.firstName || ""} ${invoice?.generatedBy?.lastName || ""}`.trim();
  return full || "System";
};

const addPdfHeaderFooter = (doc, pageNumber, title = "Hospital Invoice", hospitalSettings = defaultHospital) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(14);
  doc.text(String(hospitalSettings.hospitalName || defaultHospital.hospitalName), 14, 14);
  doc.setFontSize(9);
  doc.text(title, 14, 20);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 14, { align: "right" });
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  const contactLine = `Contact: ${hospitalSettings.phone || "-"}${hospitalSettings.email ? ` | ${hospitalSettings.email}` : ""}${hospitalSettings.website ? ` | ${hospitalSettings.website}` : ""}`;
  doc.text(contactLine, 14, pageHeight - 8);
};

const downloadInvoicePdf = (invoice, hospitalSettings = defaultHospital) => {
  const doc = new jsPDF();
  addPdfHeaderFooter(doc, 1, "Invoice", hospitalSettings);

  const patientName = getPatientName(invoice);
  const patientId = invoice?.patient?.patientId || "-";
  const billType = (invoice?.type || "other").toUpperCase();
  const referredBy = getGeneratedByLabel(invoice);

  doc.setFontSize(11);
  doc.text(`Invoice Number: ${invoice?.invoiceNumber || "-"}`, 14, 30);
  doc.text(`Patient: ${patientName}`, 14, 36);
  doc.text(`Patient ID: ${patientId}`, 14, 42);
  doc.text(`Bill Type: ${billType}`, 14, 48);
  doc.text(`Referred By: ${referredBy}`, 14, 54);
  doc.text(`Date: ${new Date(invoice?.createdAt).toLocaleString()}`, 14, 60);

  const rows = (invoice?.items || []).map((item) => [
    item?.description || "-",
    Number(item?.quantity || 1),
    Number(item?.unitPrice || 0).toFixed(2),
    Number(item?.amount || 0).toFixed(2)
  ]);

  autoTable(doc, {
    startY: 66,
    head: [["Item", "Qty", "Unit Price", "Amount"]],
    body: rows.length ? rows : [["-", "-", "-", "-"]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 163, 74] }
  });

  const endY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 78;
  doc.setFontSize(10);
  doc.text(`Total: Rs ${Number(invoice?.totalAmount || 0).toLocaleString()}`, 14, endY);
  doc.text(`Paid: Rs ${Number(invoice?.paidAmount || 0).toLocaleString()}`, 14, endY + 6);
  doc.text(`Due: Rs ${Number(invoice?.dueAmount || 0).toLocaleString()}`, 14, endY + 12);
  doc.text(`Status: ${(invoice?.status || "pending").toUpperCase()}`, 14, endY + 18);

  doc.save(`${invoice?.invoiceNumber || "invoice"}.pdf`);
};

const downloadInvoicesPdfBundle = (patientName, invoices, titleSuffix = "All Invoices", hospitalSettings = defaultHospital) => {
  if (!invoices?.length) return;
  const doc = new jsPDF();
  const safeName = String(patientName || "patient").replace(/[^a-z0-9_-]+/gi, "_");

  let pageNumber = 1;
  addPdfHeaderFooter(doc, pageNumber, titleSuffix, hospitalSettings);
  doc.setFontSize(12);
  doc.text(`Patient: ${patientName}`, 14, 30);
  doc.text(`Total Invoices: ${invoices.length}`, 14, 36);

  let cursorY = 44;
  invoices.forEach((invoice, index) => {
    const needsNewPage = cursorY > 220;
    if (needsNewPage) {
      doc.addPage();
      pageNumber += 1;
      addPdfHeaderFooter(doc, pageNumber, titleSuffix, hospitalSettings);
      cursorY = 28;
    }

    doc.setFontSize(10);
    doc.text(
      `${index + 1}. ${invoice?.invoiceNumber || "-"} | ${(invoice?.type || "other").toUpperCase()} | ${new Date(invoice?.createdAt).toLocaleDateString()} | Referred By: ${getGeneratedByLabel(invoice)}`,
      14,
      cursorY
    );
    cursorY += 4;

    const rows = (invoice?.items || []).map((item) => [
      item?.description || "-",
      Number(item?.quantity || 1),
      Number(item?.unitPrice || 0).toFixed(2),
      Number(item?.amount || 0).toFixed(2)
    ]);

    autoTable(doc, {
      startY: cursorY + 2,
      head: [["Item", "Qty", "Unit Price", "Amount"]],
      body: rows.length ? rows : [["-", "-", "-", "-"]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
      margin: { left: 14, right: 14 }
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 8;
    doc.setFontSize(9);
    doc.text(
      `Total: Rs ${Number(invoice?.totalAmount || 0).toLocaleString()} | Paid: Rs ${Number(invoice?.paidAmount || 0).toLocaleString()} | Due: Rs ${Number(invoice?.dueAmount || 0).toLocaleString()} | Status: ${(invoice?.status || "pending").toUpperCase()}`,
      14,
      cursorY
    );
    cursorY += 10;
  });

  doc.save(`${safeName}_${titleSuffix.replace(/\s+/g, "_").toLowerCase()}.pdf`);
};

const getCareLabel = (invoice) => {
  if (invoice?.admission) return "IPD";
  if (invoice?.patient?.registrationType === "emergency") return "Emergency";
  return "OPD";
};

const getBillingOption = (invoice) => {
  const type = String(invoice?.type || "").toLowerCase();
  if (["opd", "ipd", "emergency", "lab", "radiology", "pharmacy", "other"].includes(type)) return type;
  if (invoice?.admission) return "ipd";
  if (invoice?.patient?.registrationType === "emergency") return "emergency";
  return "opd";
};

const aggregateStatus = (invoices) => {
  const hasDue = invoices.some((inv) => Number(inv.dueAmount || 0) > 0);
  const allPaid = invoices.length > 0 && invoices.every((inv) => inv.status === "paid");
  const hasOverdue = invoices.some((inv) => inv.status === "overdue");
  if (allPaid) return "paid";
  if (hasOverdue) return "overdue";
  if (hasDue) return "partial";
  return "pending";
};

const PatientBillingTable = ({ rows, onOpenPatient, onOpenBulkPay, canEdit, canPay, hospitalSettings }) => {
  if (!rows.length) {
    return (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
              No patient bills found for current filters.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Care</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Download Invoice</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = statusConfig[row.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          return (
            <TableRow key={row.patientId}>
              <TableCell>
                <div className="font-medium">{row.patientName}</div>
                <div className="text-xs text-muted-foreground">{row.patientCode}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {row.careTypes.map((care) => (
                    <Badge key={care} variant="outline">{care}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>Rs {row.total.toLocaleString()}</TableCell>
              <TableCell className="text-status-available">Rs {row.paid.toLocaleString()}</TableCell>
              <TableCell className={row.due > 0 ? "text-status-occupied" : ""}>Rs {row.due.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={status.variant} className="flex w-fit items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => downloadPatientInvoices(row.patientName, row.invoices)}>
                    <Download className="mr-2 h-3 w-3" />CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadInvoicesPdfBundle(row.patientName, row.invoices, "All Invoices", hospitalSettings)}>
                    <Download className="mr-2 h-3 w-3" />PDF
                  </Button>
                </div>
              </TableCell>
              <TableCell>{new Date(row.lastDate).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onOpenPatient(row)}>
                    <Eye className="mr-1 h-3 w-3" />Open
                  </Button>
                  {canPay && row.due > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => onOpenBulkPay(row)}>
                      Pay All
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onOpenPatient(row)}>
                      <Pencil className="mr-1 h-3 w-3" />Manage
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default function Billing() {
  const qc = useQueryClient();
  const { getModulePermissions, canUseFeature } = useVisualAuth();
  const permissions = getModulePermissions("billing");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [careFilter, setCareFilter] = useState("all");
  const [billingOptionFilter, setBillingOptionFilter] = useState("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "cash", reference: "" });
  const [paying, setPaying] = useState(false);

  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [adjustmentRows, setAdjustmentRows] = useState([{ key: "", value: "" }]);
  const [adjustmentDiscount, setAdjustmentDiscount] = useState("");
  const [creatingAdjustment, setCreatingAdjustment] = useState(false);

  const { data: invoicesRes, isLoading, isError } = useQuery({
    queryKey: ["invoices", "patient-centric"],
    queryFn: () => getInvoices()
  });
  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings()
  });

  const invoices = Array.isArray(invoicesRes) ? invoicesRes : [];
  const hospitalSettings = hospitalRes?.data || defaultHospital;

  const allowedBillingOptions = useMemo(() => {
    return Object.keys(billingOptionConfig).filter((option) =>
      canUseFeature("billing", `billing_${option}`)
    );
  }, [canUseFeature]);

  const effectiveBillingOptionFilter =
    billingOptionFilter === "all" || allowedBillingOptions.includes(billingOptionFilter)
      ? billingOptionFilter
      : "all";

  const baseFilteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const option = getBillingOption(invoice);
      if (!allowedBillingOptions.includes(option)) return false;
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      const care = getCareLabel(invoice).toLowerCase();
      if (careFilter !== "all" && care !== careFilter) return false;

      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const invoiceId = String(invoice?.invoiceNumber || "").toLowerCase();
      const patientName = getPatientName(invoice).toLowerCase();
      const patientId = String(invoice?.patient?.patientId || "").toLowerCase();
      return invoiceId.includes(query) || patientName.includes(query) || patientId.includes(query);
    });
  }, [
    invoices,
    allowedBillingOptions,
    statusFilter,
    careFilter,
    searchQuery
  ]);

  const filteredInvoices = useMemo(() => {
    if (effectiveBillingOptionFilter === "all") return baseFilteredInvoices;
    return baseFilteredInvoices.filter((invoice) => getBillingOption(invoice) === effectiveBillingOptionFilter);
  }, [baseFilteredInvoices, effectiveBillingOptionFilter]);

  const billingOptionCounts = useMemo(() => {
    const counts = Object.keys(billingOptionConfig).reduce((acc, option) => {
      acc[option] = 0;
      return acc;
    }, {});
    baseFilteredInvoices.forEach((invoice) => {
      const option = getBillingOption(invoice);
      if (counts[option] !== undefined) counts[option] += 1;
    });
    return counts;
  }, [baseFilteredInvoices]);

  const patientRows = useMemo(() => {
    const grouped = Object.values(
      filteredInvoices.reduce((acc, invoice) => {
        const patientId = invoice?.patient?._id || "unknown";
        if (!acc[patientId]) {
          acc[patientId] = {
            patientId,
            patient: invoice?.patient,
            patientName: getPatientName(invoice),
            patientCode: invoice?.patient?.patientId || "-",
            invoices: [],
            careTypes: new Set(),
            total: 0,
            paid: 0,
            due: 0,
            lastDate: invoice?.createdAt || new Date().toISOString(),
            status: "pending"
          };
        }

        acc[patientId].invoices.push(invoice);
        acc[patientId].careTypes.add(getCareLabel(invoice));
        acc[patientId].total += Number(invoice?.totalAmount || 0);
        acc[patientId].paid += Number(invoice?.paidAmount || 0);
        acc[patientId].due += Number(invoice?.dueAmount || 0);
        if (new Date(invoice?.createdAt) > new Date(acc[patientId].lastDate)) {
          acc[patientId].lastDate = invoice.createdAt;
        }
        return acc;
      }, {})
    ).map((row) => ({
      ...row,
      careTypes: Array.from(row.careTypes),
      invoices: [...row.invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      status: aggregateStatus(row.invoices)
    }));

    return grouped.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  }, [filteredInvoices]);

  const stats = useMemo(() => {
    const total = patientRows.reduce((sum, row) => sum + row.total, 0);
    const paid = patientRows.reduce((sum, row) => sum + row.paid, 0);
    const due = patientRows.reduce((sum, row) => sum + row.due, 0);
    return { total, paid, due, patientCount: patientRows.length };
  }, [patientRows]);

  const selectedPatientRow = useMemo(
    () => patientRows.find((row) => row.patientId === selectedPatientId) || null,
    [patientRows, selectedPatientId]
  );

  const invoicesByType = useMemo(() => {
    if (!selectedPatientRow) return {};
    return selectedPatientRow.invoices.reduce((acc, inv) => {
      const key = (inv.type || "other").toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(inv);
      return acc;
    }, {});
  }, [selectedPatientRow]);

  const adjustmentSubtotal = useMemo(
    () => adjustmentRows.reduce((sum, row) => sum + Math.max(0, Number(row.value || 0)), 0),
    [adjustmentRows]
  );
  const discountAmount = Math.max(0, Number(adjustmentDiscount || 0));
  const adjustmentTotal = Math.max(0, adjustmentSubtotal - discountAmount);

  const openCreateDialog = () => {
    setSelectedInvoice(null);
    setDialogMode("create");
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setDialogMode("edit");
    setIsAddDialogOpen(true);
  };

  const openPayment = ({ mode, invoice, row }) => {
    const due = mode === "single" ? Number(invoice?.dueAmount || 0) : Number(row?.due || 0);
    setPaymentTarget({ mode, invoice, row, due });
    setPaymentForm({ amount: String(due), method: "cash", reference: "" });
    setPaymentDialogOpen(true);
  };

  const applyLocalPaymentCache = (paymentByInvoiceId) => {
    qc.setQueriesData({ queryKey: ["invoices"] }, (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((inv) => {
        const delta = Number(paymentByInvoiceId?.[inv?._id] || 0);
        if (!delta) return inv;

        const total = Number(inv?.totalAmount || 0);
        const prevPaid = Number(inv?.paidAmount || 0);
        const nextPaid = Math.min(total, prevPaid + delta);
        const nextDue = Math.max(0, total - nextPaid);

        let nextStatus = inv?.status || "pending";
        if (nextDue <= 0) nextStatus = "paid";
        else if (nextPaid > 0) nextStatus = "partial";
        else if (nextStatus !== "overdue") nextStatus = "pending";

        return {
          ...inv,
          paidAmount: nextPaid,
          dueAmount: nextDue,
          status: nextStatus
        };
      });
    });
  };

  const applyPaymentToPatientInvoices = async (row, amount, method, reference) => {
    let remaining = amount;
    const applied = {};
    const dueInvoices = [...row.invoices]
      .filter((inv) => Number(inv?.dueAmount || 0) > 0)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const inv of dueInvoices) {
      if (remaining <= 0) break;
      const due = Number(inv.dueAmount || 0);
      const payAmount = Math.min(due, remaining);
      if (payAmount > 0) {
        await addPayment(inv._id, { amount: payAmount, method, reference });
        applied[inv._id] = Number(applied[inv._id] || 0) + payAmount;
        remaining -= payAmount;
      }
    }

    if (remaining > 0) throw new Error("Amount exceeds total due for this patient.");
    return applied;
  };

  const submitPayment = async () => {
    if (!paymentTarget) return;
    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    try {
      setPaying(true);
      let localApplied = {};
      if (paymentTarget.mode === "single") {
        await addPayment(paymentTarget.invoice._id, {
          amount,
          method: paymentForm.method,
          reference: paymentForm.reference
        });
        localApplied = { [paymentTarget.invoice._id]: amount };
      } else {
        localApplied = await applyPaymentToPatientInvoices(
          paymentTarget.row,
          amount,
          paymentForm.method,
          paymentForm.reference
        );
      }
      applyLocalPaymentCache(localApplied);
      toast.success("Payment recorded");
      setPaymentDialogOpen(false);
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      await qc.refetchQueries({ queryKey: ["invoices"] });
    } catch (error) {
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      await qc.refetchQueries({ queryKey: ["invoices"] });
      toast.error(error.message || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  const openPatientDialog = (row) => {
    setSelectedPatientId(row.patientId);
    setAdjustmentRows([{ key: "", value: "" }]);
    setAdjustmentDiscount("");
    setPatientDialogOpen(true);
  };

  const addAdjustmentRow = () => setAdjustmentRows((prev) => [...prev, { key: "", value: "" }]);
  const removeAdjustmentRow = (index) =>
    setAdjustmentRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  const updateAdjustmentRow = (index, field, value) =>
    setAdjustmentRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));

  const createAdjustmentInvoice = async () => {
    if (!selectedPatientRow?.patient?._id) return toast.error("Patient not selected");

    const validRows = adjustmentRows
      .map((row) => ({ key: String(row.key || "").trim(), value: Number(row.value || 0) }))
      .filter((row) => row.key && row.value > 0);

    if (!validRows.length) return toast.error("Add at least one valid bill row");
    if (adjustmentTotal <= 0) return toast.error("Final total must be greater than 0");

    try {
      setCreatingAdjustment(true);
      const possibleAdmissionInvoice = selectedPatientRow.invoices.find((inv) => inv?.admission?._id);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await createInvoice({
        patient: selectedPatientRow.patient._id,
        admission: possibleAdmissionInvoice?.admission?._id,
        type: "other",
        items: validRows.map((row) => ({
          description: row.key,
          category: "other",
          quantity: 1,
          unitPrice: row.value,
          amount: row.value,
          discount: 0,
          tax: 0
        })),
        subtotal: adjustmentSubtotal,
        discountAmount,
        totalTax: 0,
        totalAmount: adjustmentTotal,
        dueDate: dueDate.toISOString(),
        notes: "Custom adjustment added from consolidated billing"
      });

      toast.success("Adjustment bill created");
      setAdjustmentRows([{ key: "", value: "" }]);
      setAdjustmentDiscount("");
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      await qc.refetchQueries({ queryKey: ["invoices"] });
    } catch (error) {
      toast.error(error.message || "Failed to create adjustment bill");
    } finally {
      setCreatingAdjustment(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError) return <div className="text-red-500 text-center py-8">Error loading billing data.</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing Center</h1>
            <p className="text-muted-foreground">Unified patient billing with OPD, IPD, Lab, Radiology, Pharmacy and all invoice actions</p>
          </div>
          {permissions.canCreate && (
            <RestrictedAction module="billing" feature="create">
              <Button onClick={openCreateDialog} disabled={!allowedBillingOptions.length}>
                <Plus className="mr-2 h-4 w-4" />Create Invoice
              </Button>
            </RestrictedAction>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Bill</CardTitle><Receipt className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs {(stats.total / 100000).toFixed(1)}L</div></CardContent></Card>
          <Card className="border-status-available/30 bg-status-available/5"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Paid</CardTitle><IndianRupee className="h-4 w-4 text-status-available" /></CardHeader><CardContent><div className="text-2xl font-bold text-status-available">Rs {(stats.paid / 100000).toFixed(1)}L</div></CardContent></Card>
          <Card className="border-status-occupied/30 bg-status-occupied/5"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Due</CardTitle><AlertCircle className="h-4 w-4 text-status-occupied" /></CardHeader><CardContent><div className="text-2xl font-bold text-status-occupied">Rs {(stats.due / 100000).toFixed(1)}L</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Patients</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.patientCount}</div></CardContent></Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by patient/invoice ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={careFilter} onValueChange={setCareFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Care" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Care</SelectItem>
              <SelectItem value="opd">OPD</SelectItem>
              <SelectItem value="ipd">IPD</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!allowedBillingOptions.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No billing category is permitted for your account. Ask admin to enable billing options in Settings.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Billing Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                <button
                  type="button"
                  onClick={() => setBillingOptionFilter("all")}
                  className={`rounded-lg border p-3 text-left ${effectiveBillingOptionFilter === "all" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                >
                  <p className="text-xs text-muted-foreground">All Allowed</p>
                  <p className="text-sm font-semibold">{baseFilteredInvoices.length} invoices</p>
                </button>
                {allowedBillingOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setBillingOptionFilter(option)}
                    className={`rounded-lg border p-3 text-left ${effectiveBillingOptionFilter === option ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                  >
                    <p className="text-xs text-muted-foreground">{billingOptionConfig[option].label}</p>
                    <p className="text-sm font-semibold">{billingOptionCounts[option] || 0} invoices</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {allowedBillingOptions.length > 0 && (
          <Card><CardContent className="p-0">
            <PatientBillingTable
              rows={patientRows}
              onOpenPatient={openPatientDialog}
              onOpenBulkPay={(row) => openPayment({ mode: "bulk", row })}
              canEdit={permissions.canEdit}
              canPay={permissions.canCreate || permissions.canEdit}
              hospitalSettings={hospitalSettings}
            />
          </CardContent></Card>
        )}
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{paymentTarget?.mode === "single" ? "Pay Invoice" : "Pay Patient Dues"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{paymentTarget?.mode === "single" ? `Invoice: ${paymentTarget?.invoice?.invoiceNumber || "-"}` : `Patient: ${paymentTarget?.row?.patientName || "-"}`}</p>
            <p className="text-sm text-muted-foreground">Total Due: Rs {Number(paymentTarget?.due || 0).toLocaleString()}</p>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" min="0" value={paymentForm.amount} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Method</Label><Select value={paymentForm.method} onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, method: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="net_banking">Net Banking</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="insurance">Insurance</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Reference</Label><Input placeholder="Txn/Ref No." value={paymentForm.reference} onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button><Button onClick={submitPayment} disabled={paying}>{paying ? "Saving..." : "Save Payment"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={patientDialogOpen} onOpenChange={(open) => {
        setPatientDialogOpen(open);
        if (!open) setSelectedPatientId("");
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Patient Billing - {selectedPatientRow?.patientName || "-"}</DialogTitle></DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-bold">Rs {Number(selectedPatientRow?.total || 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="font-bold text-status-available">Rs {Number(selectedPatientRow?.paid || 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Due</p><p className="font-bold text-status-occupied">Rs {Number(selectedPatientRow?.due || 0).toLocaleString()}</p></CardContent></Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => selectedPatientRow && downloadPatientInvoices(selectedPatientRow.patientName, selectedPatientRow.invoices)}><Download className="mr-2 h-4 w-4" />Download All CSV</Button>
            <Button variant="outline" onClick={() => selectedPatientRow && downloadInvoicesPdfBundle(selectedPatientRow.patientName, selectedPatientRow.invoices, "All Invoices", hospitalSettings)}><Download className="mr-2 h-4 w-4" />Download All PDF</Button>
            {(permissions.canCreate || permissions.canEdit) && Number(selectedPatientRow?.due || 0) > 0 && <Button variant="outline" onClick={() => openPayment({ mode: "bulk", row: selectedPatientRow })}>Pay All Dues</Button>}
            {permissions.canCreate && (
              <RestrictedAction module="billing" feature="create">
                <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />Create Separate Invoice</Button>
              </RestrictedAction>
            )}
          </div>

          {Object.entries(invoicesByType).map(([type, typeInvoices]) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{type} Bills</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => downloadPatientInvoices(`${selectedPatientRow?.patientName || "patient"}_${type}`, typeInvoices)}>
                      <Download className="mr-1 h-3 w-3" />{type} CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadInvoicesPdfBundle(selectedPatientRow?.patientName || "patient", typeInvoices, `${type} Invoices`, hospitalSettings)}>
                      <Download className="mr-1 h-3 w-3" />{type} PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Download</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeInvoices.map((inv) => {
                      const status = statusConfig[inv.status] || statusConfig.pending;
                      return (
                        <TableRow key={inv._id}>
                          <TableCell className="font-medium">{inv.invoiceNumber || "-"}</TableCell>
                          <TableCell>Rs {Number(inv.totalAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-status-available">Rs {Number(inv.paidAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className={Number(inv.dueAmount || 0) > 0 ? "text-status-occupied" : ""}>Rs {Number(inv.dueAmount || 0).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => downloadSingleInvoice(inv)}><Download className="mr-1 h-3 w-3" />CSV</Button>
                              <Button variant="ghost" size="sm" onClick={() => downloadInvoicePdf(inv, hospitalSettings)}><Download className="mr-1 h-3 w-3" />PDF</Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {(permissions.canCreate || permissions.canEdit) && Number(inv.dueAmount || 0) > 0 && <Button size="sm" variant="outline" onClick={() => openPayment({ mode: "single", invoice: inv })}>Pay</Button>}
                              {permissions.canEdit && <Button size="sm" variant="ghost" onClick={() => openEditDialog(inv)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {permissions.canCreate && canUseFeature("billing", "billing_other") && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Add/Adjust Bills (key/value + discount)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {adjustmentRows.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-7" placeholder="Charge key (e.g. Procedure, Service, Consumable)" value={row.key} onChange={(e) => updateAdjustmentRow(index, "key", e.target.value)} />
                    <Input className="col-span-3" type="number" min="0" placeholder="Amount" value={row.value} onChange={(e) => updateAdjustmentRow(index, "value", e.target.value)} />
                    <Button className="col-span-2" variant="outline" onClick={() => removeAdjustmentRow(index)}>Remove</Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <RestrictedAction module="billing" feature="create">
                    <Button variant="outline" onClick={addAdjustmentRow}>Add Row</Button>
                  </RestrictedAction>
                  <Label>Discount</Label>
                  <Input className="w-44" type="number" min="0" value={adjustmentDiscount} onChange={(e) => setAdjustmentDiscount(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Rows Subtotal</p><p className="font-semibold">Rs {adjustmentSubtotal.toLocaleString()}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Discount</p><p className="font-semibold">Rs {discountAmount.toLocaleString()}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Net New Bill</p><p className="font-bold">Rs {adjustmentTotal.toLocaleString()}</p></CardContent></Card>
                </div>
                <div className="flex justify-end">
                  <RestrictedAction module="billing" feature="create">
                    <Button onClick={createAdjustmentInvoice} disabled={creatingAdjustment}>{creatingAdjustment ? "Creating..." : "Create Adjustment Bill"}</Button>
                  </RestrictedAction>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      <AddInvoiceDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setSelectedInvoice(null);
          qc.invalidateQueries({ queryKey: ["invoices"] });
        }}
        invoice={selectedInvoice}
        mode={dialogMode}
        allowedBillingTypes={allowedBillingOptions}
      />
    </>
  );
}
