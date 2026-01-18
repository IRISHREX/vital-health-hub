import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPayment } from "@/lib/invoices";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Payment amount must be greater than 0"),
  method: z.enum(["cash", "card", "upi", "net_banking", "cheque", "insurance"]),
  reference: z.string().optional().default(""),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Credit/Debit Card" },
  { value: "upi", label: "UPI" },
  { value: "net_banking", label: "Net Banking" },
  { value: "cheque", label: "Cheque" },
  { value: "insurance", label: "Insurance" },
];

const statusConfig: { [key: string]: { label: string; variant: "success" | "warning" | "destructive" | "default" } } = {
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  draft: { label: "Draft", variant: "default" },
};

export default function PaymentManagementDialog({
  isOpen,
  onClose,
  invoice,
}: PaymentManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: undefined,
      method: "cash",
      reference: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PaymentFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to record payment.");
      }
      return addPayment(invoice._id, {
        amount: values.amount,
        method: values.method,
        reference: values.reference,
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
      form.reset({
        amount: 0,
        method: "cash",
        reference: "",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record payment.",
      });
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    if (values.amount > invoice.dueAmount) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: `Payment amount cannot exceed due amount (₹${invoice.dueAmount.toFixed(2)}).`,
      });
      return;
    }
    mutation.mutate(values);
  };

  if (!invoice) return null;

  const statusLabel = statusConfig[invoice.status] || statusConfig.draft;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Management</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="payment" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment">Record Payment</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Payment Tab */}
          <TabsContent value="payment" className="mt-4">
            {invoice.status === "paid" ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>This invoice is already fully paid.</p>
              </div>
            ) : invoice.status === "cancelled" || invoice.status === "refunded" ? (
              <div className="text-center py-6 text-destructive">
                <p>Cannot record payment for {invoice.status} invoice.</p>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-medium">₹{invoice.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid Amount:</span>
                        <span className="font-medium text-green-600">₹{invoice.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Due Amount:</span>
                        <span className="font-bold text-lg">₹{invoice.dueAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount (₹) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder={`Max: ₹${invoice.dueAmount.toFixed(2)}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
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
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Transaction ID, Cheque Number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Record Payment
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice ID:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={statusLabel.variant}>
                    {statusLabel.label}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium uppercase">{invoice.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created Date:</span>
                  <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {invoice.payments && invoice.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invoice.payments.map((payment: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          ₹{payment.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.method} • {new Date(payment.paidAt).toLocaleDateString()}
                        </p>
                      </div>
                      {payment.reference && (
                        <span className="text-xs text-muted-foreground">
                          Ref: {payment.reference}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amount Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>-₹{invoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>₹{invoice.totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>₹{invoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="text-green-600">₹{invoice.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Due:</span>
                  <span className="text-orange-600">₹{invoice.dueAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
