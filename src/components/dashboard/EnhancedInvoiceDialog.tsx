import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createInvoice } from "@/lib/invoices";
import { getPatients } from "@/lib/patients";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.enum([
    "bed_charges",
    "doctor_fee",
    "nursing",
    "medication",
    "procedure",
    "lab_test",
    "radiology",
    "surgery",
    "other",
  ]),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be greater than or equal to 0"),
  discount: z.coerce.number().min(0, "Discount must be greater than or equal to 0").default(0),
  tax: z.coerce.number().min(0, "Tax must be greater than or equal to 0").default(0),
});

const invoiceSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  type: z.enum(["opd", "ipd", "pharmacy", "lab", "other"]),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  discountAmount: z.coerce.number().min(0, "Discount must be greater than or equal to 0").default(0),
  discountReason: z.string().optional(),
  cgstRate: z.coerce.number().min(0).max(100).default(0),
  sgstRate: z.coerce.number().min(0).max(100).default(0),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface EnhancedInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEM_CATEGORIES = [
  { value: "bed_charges", label: "Bed Charges" },
  { value: "doctor_fee", label: "Doctor Fee" },
  { value: "nursing", label: "Nursing Care" },
  { value: "medication", label: "Medication" },
  { value: "procedure", label: "Procedure" },
  { value: "lab_test", label: "Lab Test" },
  { value: "radiology", label: "Radiology" },
  { value: "surgery", label: "Surgery" },
  { value: "other", label: "Other" },
];

export default function EnhancedInvoiceDialog({
  isOpen,
  onClose,
}: EnhancedInvoiceDialogProps) {
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
      type: "opd",
      items: [
        {
          description: "",
          category: "doctor_fee",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          tax: 0,
        },
      ],
      discountAmount: 0,
      discountReason: "",
      cgstRate: 9,
      sgstRate: 9,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate totals
  const watchItems = form.watch("items");
  const watchDiscountAmount = form.watch("discountAmount");
  const watchCGST = form.watch("cgstRate");
  const watchSGST = form.watch("sgstRate");

  const itemsSubtotal = watchItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
    const itemDiscount = item.discount || 0;
    return sum + (itemTotal - itemDiscount);
  }, 0);

  const subtotalBeforeTax = itemsSubtotal - watchDiscountAmount;
  const cgstAmount = (subtotalBeforeTax * watchCGST) / 100;
  const sgstAmount = (subtotalBeforeTax * watchSGST) / 100;
  const totalTax = cgstAmount + sgstAmount;
  const totalAmount = subtotalBeforeTax + totalTax;

  const calculations = {
    itemsSubtotal,
    subtotalBeforeTax,
    cgstAmount,
    sgstAmount,
    totalTax,
    totalAmount,
  };

  const mutation = useMutation({
    mutationFn: (values: InvoiceFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to create an invoice.");
      }

      const invoiceData = {
        patient: values.patient,
        type: values.type,
        items: values.items.map((item) => ({
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          tax: item.tax || 0,
          amount:
            item.quantity * item.unitPrice - (item.discount || 0) + (item.tax || 0),
        })),
        subtotal: calculations.itemsSubtotal,
        discountAmount: values.discountAmount,
        discountReason: values.discountReason || "",
        taxDetails: {
          cgst: { rate: watchCGST, amount: calculations.cgstAmount },
          sgst: { rate: watchSGST, amount: calculations.sgstAmount },
        },
        totalTax: calculations.totalTax,
        totalAmount: calculations.totalAmount,
        dueDate: values.dueDate.toISOString().split('T')[0],
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
      form.reset({
        patient: "",
        type: "opd",
        items: [
          {
            description: "",
            category: "doctor_fee",
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            tax: 0,
          },
        ],
        discountAmount: 0,
        discountReason: "",
        cgstRate: 9,
        sgstRate: 9,
        notes: "",
      });
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
    if (calculations.totalAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Total invoice amount must be greater than 0.",
      });
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create a detailed invoice with multiple line items, taxes, and discounts.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basics" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              {/* Basics Tab */}
              <TabsContent value="basics" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="patient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient *</FormLabel>
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="opd">OPD (Outpatient)</SelectItem>
                          <SelectItem value="ipd">IPD (Inpatient)</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="lab">Laboratory</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                      <FormLabel>Due Date *</FormLabel>
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Item {index + 1}</CardTitle>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Doctor Consultation" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ITEM_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0.01" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Price (₹)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.discount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Discount (₹)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.tax`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Item Tax (₹)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            Item Total: ₹
                            {(
                              watchItems[index]?.quantity * watchItems[index]?.unitPrice -
                              (watchItems[index]?.discount || 0) +
                              (watchItems[index]?.tax || 0)
                            ).toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      append({
                        description: "",
                        category: "doctor_fee",
                        quantity: 1,
                        unitPrice: 0,
                        discount: 0,
                        tax: 0,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Discount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Reason</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Loyalty discount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="cgstRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CGST Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sgstRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SGST Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items Subtotal:</span>
                        <span>₹{calculations.itemsSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="text-red-600">-₹{watchDiscountAmount.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-medium">
                        <span>Subtotal (before tax):</span>
                        <span>₹{calculations.subtotalBeforeTax.toFixed(2)}</span>
                      </div>

                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-muted-foreground">
                          <span>CGST ({watchCGST}%):</span>
                          <span>₹{calculations.cgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>SGST ({watchSGST}%):</span>
                          <span>₹{calculations.sgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total Tax:</span>
                          <span>₹{calculations.totalTax.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Total Amount:</span>
                        <span className="text-primary">₹{calculations.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Invoice
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
