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
import { createInvoice } from "@/lib/invoices";
import { getPatients } from "@/lib/patients";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const invoiceSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  totalAmount: z.coerce.number().min(1, "Total amount must be greater than 0"),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
  invoiceType: z.enum(["opd", "ipd"]),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface AddInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddInvoiceDialog({ isOpen, onClose }: AddInvoiceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: patientsData } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const patients = patientsData?.data?.patients || [];

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patient: "",
      totalAmount: 0,
      invoiceType: "opd",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: InvoiceFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to create an invoice.");
      }
      const category = values.invoiceType === 'opd' ? 'doctor_fee' : 'bed_charges';
      const invoiceData = {
        patient: values.patient,
        type: values.invoiceType,
        items: [{
          description: "Service Charge",
          category: category as "bed_charges" | "doctor_fee" | "nursing" | "medication" | "procedure" | "lab_test" | "radiology" | "surgery" | "other",
          quantity: 1,
          unitPrice: values.totalAmount,
          discount: 0,
          tax: 0,
          amount: values.totalAmount,
        }],
        subtotal: values.totalAmount,
        totalTax: 0,
        totalAmount: values.totalAmount,
        dueDate: values.dueDate.toISOString(),
        notes: values.notes || "",
      };
      return createInvoice(invoiceData);
    },
    onSuccess: () => {
      toast({
        title: "Invoice Created",
        description: "The new invoice has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create invoice.",
      });
    },
  });

  const onSubmit = (values: InvoiceFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Enter the details for the new invoice. This is a simplified form.
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient: any) => (
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
                      <SelectItem value="opd">OPD (Outpatient)</SelectItem>
                      <SelectItem value="ipd">IPD (Inpatient)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invoice
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
