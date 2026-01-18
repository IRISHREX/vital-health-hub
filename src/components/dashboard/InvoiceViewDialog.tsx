import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ArrowLeft, Printer } from "lucide-react";
import { getInvoiceById } from "@/lib/invoices";
import { useToast } from "@/components/ui/use-toast";

interface InvoiceViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  onPaymentClick?: (invoice: any) => void;
}

const statusConfig: { [key: string]: { label: string; variant: "success" | "warning" | "destructive" | "default" } } = {
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  draft: { label: "Draft", variant: "default" },
};

export default function InvoiceViewDialog({
  isOpen,
  onClose,
  invoiceId,
  onPaymentClick,
}: InvoiceViewDialogProps) {
  const { toast } = useToast();
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: isOpen && !!invoiceId,
  });

  if (!invoice) return null;

  const statusLabel = statusConfig[invoice.status] || statusConfig.draft;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // This would typically generate a PDF and download it
    toast({
      title: "Coming Soon",
      description: "PDF download functionality coming soon.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Invoice Details</DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden print:hidden"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hidden print:hidden"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading invoice...</div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="border-b pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">INVOICE</h2>
                  <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
                </div>
                <Badge variant={statusLabel.variant} className="text-base py-1 px-3">
                  {statusLabel.label}
                </Badge>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">INVOICE TO</p>
                  <p className="font-semibold text-lg">
                    {invoice.patient.firstName} {invoice.patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Patient ID: {invoice.patient.patientId || invoice.patient._id}
                  </p>
                </div>

                <div className="text-right space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Due Date:</span>{" "}
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="uppercase font-medium">{invoice.type}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="font-semibold mb-3 text-sm">LINE ITEMS</h3>
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="font-bold text-foreground">Description</TableHead>
                    <TableHead className="font-bold text-foreground">Category</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Qty</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Unit Price</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Discount</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Tax</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item: any, index: number) => (
                    <TableRow key={index} className="border-b">
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{(item.unitPrice || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        -{(item.discount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">₹{(item.tax || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(item.amount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <Card className="w-96">
                <CardContent className="pt-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span>₹{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Invoice Discount:</span>
                      <span>-₹{invoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.discountReason && (
                    <div className="text-xs text-muted-foreground pl-4">
                      Reason: {invoice.discountReason}
                    </div>
                  )}
                  <Separator />

                  {invoice.taxDetails && (
                    <div className="space-y-1">
                      {invoice.taxDetails.cgst && (
                        <div className="flex justify-between">
                          <span>CGST ({invoice.taxDetails.cgst.rate || 0}%):</span>
                          <span>₹{(invoice.taxDetails.cgst.amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {invoice.taxDetails.sgst && (
                        <div className="flex justify-between">
                          <span>SGST ({invoice.taxDetails.sgst.rate || 0}%):</span>
                          <span>₹{(invoice.taxDetails.sgst.amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {invoice.totalTax > 0 && (
                    <div className="flex justify-between">
                      <span>Total Tax:</span>
                      <span>₹{invoice.totalTax.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>TOTAL AMOUNT:</span>
                    <span className="text-primary">₹{invoice.totalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Section */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">PAYMENT INFORMATION</h3>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-xs mb-1">Amount Due</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ₹{invoice.dueAmount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-xs mb-1">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{invoice.paidAmount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-xs mb-1">Total Amount</p>
                    <p className="text-2xl font-bold">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {invoice.payments && invoice.payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.payments.map((payment: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(payment.paidAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="capitalize">{payment.method}</TableCell>
                            <TableCell className="font-medium">
                              ₹{payment.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.reference || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-2">NOTES</h3>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between mt-6 print:hidden">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button onClick={() => onPaymentClick?.(invoice)}>
              Record Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
