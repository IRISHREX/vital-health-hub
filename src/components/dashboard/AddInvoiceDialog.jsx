import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createInvoice, updateInvoice } from "@/lib/invoices";
import { getPatients } from "@/lib/patients";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const invoiceSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  totalAmount: z.coerce.number().min(1, "Total amount must be greater than 0"),
  paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative"),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
  invoiceType: z.enum(["opd", "ipd", "lab", "radiology", "pharmacy", "ot", "other"]),
  status: z.enum(["draft", "pending", "partial", "paid", "overdue", "cancelled"]),
  notes: z.string().optional(),
});

const allInvoiceTypes = ["opd", "ipd", "lab", "radiology", "pharmacy", "ot", "other"];

export default function AddInvoiceDialog({ isOpen, onClose, invoice, mode = "create", allowedBillingTypes = allInvoiceTypes }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: patientsData } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const patients = patientsData?.data?.patients || [];

  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patient: "",
      totalAmount: 0,
      paidAmount: 0,
      invoiceType: "opd",
      status: "pending",
      notes: "",
    },
  });

  useEffect(() => {
    const safeDefaultType = allowedBillingTypes.includes("opd")
      ? "opd"
      : allowedBillingTypes[0] || "opd";

    if (invoice && mode === "edit") {
      form.reset({
        patient: invoice.patient?._id || invoice.patient || "",
        totalAmount: invoice.totalAmount || 0,
        paidAmount: invoice.paidAmount || 0,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
        invoiceType: allowedBillingTypes.includes(invoice.type) ? invoice.type : safeDefaultType,
        status: invoice.status || "pending",
        notes: invoice.notes || "",
      });
    } else {
      form.reset({
        patient: "",
        totalAmount: 0,
        paidAmount: 0,
        invoiceType: safeDefaultType,
        status: "pending",
        notes: "",
      });
    }
  }, [invoice, mode, form, allowedBillingTypes]);

  const createMutation = useMutation({
    mutationFn: (values) => {
      if (!user) {
        throw new Error("You must be logged in to create an invoice.");
      }
      const generatedBy = user._id || user.id;
      if (!generatedBy) {
        throw new Error("Unable to resolve current user id.");
      }
      const dueAmount = values.totalAmount - values.paidAmount;
      const invoiceData = {
        patient: values.patient,
        type: values.invoiceType,
        items: [{
          description: "Service Charge",
          category: values.invoiceType === 'opd' ? 'doctor_fee' : 'admission_fee',
          unitPrice: values.totalAmount,
          amount: values.totalAmount,
        }],
        subtotal: values.totalAmount,
        totalAmount: values.totalAmount,
        paidAmount: values.paidAmount,
        dueAmount: dueAmount,
        dueDate: values.dueDate,
        status: values.status,
        notes: values.notes || "",
        generatedBy
      };
      return createInvoice(invoiceData);
    },
    onSuccess: () => {
      toast({
        title: "Invoice Created",
        description: "The new invoice has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create invoice.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values) => {
      const dueAmount = values.totalAmount - values.paidAmount;
      const invoiceData = {
        patient: values.patient,
        type: values.invoiceType,
        totalAmount: values.totalAmount,
        paidAmount: values.paidAmount,
        dueAmount: dueAmount,
        dueDate: values.dueDate,
        status: values.status,
        notes: values.notes || "",
      };
      return updateInvoice(invoice._id, invoiceData);
    },
    onSuccess: () => {
      toast({
        title: "Invoice Updated",
        description: "The invoice has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update invoice.",
      });
    },
  });

  const onSubmit = (values) => {
    if (!allowedBillingTypes.includes(values.invoiceType)) {
      toast({
        variant: "destructive",
        title: "Not allowed",
        description: "You are not allowed to create/update this billing type.",
      });
      return;
    }
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      handleClose();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Invoice" : "Edit Invoice"}</DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Enter the details for the new invoice." 
              : "Update the invoice details."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={mode === "edit"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient._id} value={patient._id}>
                          {patient.firstName} {patient.lastName} (ID: {patient.patientId || patient._id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoiceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                      {allowedBillingTypes.includes("opd") && <SelectItem value="opd">OPD (Outpatient)</SelectItem>}
                      {allowedBillingTypes.includes("ipd") && <SelectItem value="ipd">IPD (Inpatient)</SelectItem>}
                      {allowedBillingTypes.includes("lab") && <SelectItem value="lab">Lab</SelectItem>}
                      {allowedBillingTypes.includes("radiology") && <SelectItem value="radiology">Radiology</SelectItem>}
                      {allowedBillingTypes.includes("pharmacy") && <SelectItem value="pharmacy">Pharmacy</SelectItem>}
                      {allowedBillingTypes.includes("ot") && <SelectItem value="ot">OT</SelectItem>}
                      {allowedBillingTypes.includes("other") && <SelectItem value="other">Other</SelectItem>}
                  </SelectContent>
                </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5000" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 2000" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Invoice" : "Update Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
