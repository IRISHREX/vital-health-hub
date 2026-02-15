import React, { useMemo, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getHospitalSettings } from "@/lib/settings";
import { Download, FileText, Printer, Eye, EyeOff } from 'lucide-react';

const invoiceStatusColors = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  overdue: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

const defaultHospital = {
  hospitalName: "Hospital",
  address: "",
  phone: "",
  email: "",
  website: "",
};

export default function InvoicePreview({ invoice, admission, onClose }) {
  const [expanded, setExpanded] = useState(true);
  const [printMode, setPrintMode] = useState(false);
  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  const hospitalSettings = useMemo(() => {
    const raw = hospitalRes?.data || {};
    return {
      hospitalName: raw.hospitalName || defaultHospital.hospitalName,
      address: raw.address || defaultHospital.address,
      phone: raw.phone || defaultHospital.phone,
      email: raw.email || defaultHospital.email,
      website: raw.website || defaultHospital.website,
    };
  }, [hospitalRes?.data]);

  if (!invoice || !admission) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No invoice data available
        </CardContent>
      </Card>
    );
  }

  const statusColor = invoiceStatusColors[invoice.status?.toLowerCase()] || invoiceStatusColors.pending;

  return (
    <div className={`w-full ${printMode ? 'bg-white p-8' : ''}`}>
      {!printMode && (
        <Card className="mb-4 border-2 border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold">Invoice #{invoice.invoiceNumber}</p>
                <p className="text-sm text-gray-600">for {admission.patient?.firstName} {admission.patient?.lastName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpanded(!expanded)}
                className="gap-2"
              >
                {expanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {expanded ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {expanded && (
        <Card className={printMode ? 'border-0 shadow-none' : ''}>
          <CardHeader className={printMode ? 'pb-6' : 'border-b'}>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">Invoice</CardTitle>
                <p className="text-lg text-gray-600 mt-1">#{invoice.invoiceNumber}</p>
                <p className="text-sm font-medium mt-2">{hospitalSettings.hospitalName}</p>
                {hospitalSettings.address && <p className="text-xs text-gray-600">{hospitalSettings.address}</p>}
                {(hospitalSettings.phone || hospitalSettings.email || hospitalSettings.website) && (
                  <p className="text-xs text-gray-600">
                    {[hospitalSettings.phone, hospitalSettings.email, hospitalSettings.website].filter(Boolean).join(" | ")}
                  </p>
                )}
              </div>
              <Badge className={`${statusColor} border text-sm px-3 py-1`}>
                {invoice.status?.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Invoice Details
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600">Invoice Date:</span>{' '}
                      <span className="font-medium">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Due Date:</span>{' '}
                      <span className="font-medium">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Admission ID:</span>{' '}
                      <span className="font-medium">{admission.admissionId}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Patient Information
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {admission.patient?.firstName} {admission.patient?.lastName}
                    </p>
                    <p className="text-gray-600">ID: {admission.patient?.patientId}</p>
                    <p className="text-gray-600">Phone: {admission.patient?.phone}</p>
                    <p className="text-gray-600">Age: {admission.patient?.age} years</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Medical Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Medical Information
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Diagnosis</p>
                    <p className="font-medium">{admission.diagnosis?.primary || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Admission Date</p>
                    <p className="font-medium">
                      {new Date(admission.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-medium">{admission.status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">
                      {admission.status === 'DISCHARGED' ? 'Discharge Date' : 'Length of Stay'}
                    </p>
                    <p className="font-medium">
                      {admission.status === 'DISCHARGED'
                        ? new Date(admission.dischargeDate).toLocaleDateString()
                        : `${Math.ceil(
                            (new Date(admission.dischargeDate || new Date()) - new Date(admission.admissionDate)) /
                              (1000 * 60 * 60 * 24)
                          )} days`}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Charges Breakdown */}
              <div>
                <p className="text-sm font-semibold mb-4">Charges Breakdown</p>

                <div className="space-y-3">
                  {/* Primary Bed Charge */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">Primary Bed Allocation</p>
                        <p className="text-xs text-gray-600">
                          Bed: {admission.bedAllocations?.[0]?.bed?.bedNumber || 'N/A'} •{' '}
                          {admission.bedAllocations?.[0]?.bed?.ward || 'N/A'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {admission.bedAllocations?.[0]?.bed?.bedType?.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 rounded p-2 mb-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rate</span>
                        <span className="font-medium">
                          ₹{admission.bedAllocations?.[0]?.dailyRate || 0}/day
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium">
                          {Math.ceil(
                            (new Date(admission.bedAllocations?.[0]?.endDate || new Date(admission.dischargeDate)) -
                              new Date(admission.bedAllocations?.[0]?.startDate)) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-sm font-bold text-blue-600">
                        ₹{admission.bedAllocations?.[0]?.totalCost || 0}
                      </span>
                    </div>
                  </div>

                  {/* Transfer Charges */}
                  {admission.bedAllocations && admission.bedAllocations.length > 1 && (
                    <div className="space-y-2">
                      {admission.bedAllocations.slice(1).map((allocation, idx) => (
                        <div key={idx} className="bg-white border border-orange-100 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">Transfer {idx + 1}</p>
                              <p className="text-xs text-gray-600">
                                To Bed: {allocation.bed?.bedNumber} • {allocation.bed?.ward}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs bg-orange-50">
                              TRANSFER
                            </Badge>
                          </div>

                          <div className="bg-gray-50 rounded p-2 mb-2 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rate</span>
                              <span className="font-medium">₹{allocation.dailyRate}/day</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Duration</span>
                              <span className="font-medium">
                                {Math.ceil(
                                  (new Date(allocation.endDate || new Date(admission.dischargeDate)) -
                                    new Date(allocation.startDate)) /
                                    (1000 * 60 * 60 * 24)
                                )}{' '}
                                days
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-sm font-medium">Subtotal</span>
                            <span className="text-sm font-bold text-orange-600">₹{allocation.totalCost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Service Charges */}
                  {invoice.serviceCharges && invoice.serviceCharges.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="font-semibold text-sm mb-2">Service & Other Charges</p>
                      {invoice.serviceCharges.map((charge, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{charge.description}</span>
                          <span className="font-medium">₹{charge.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="font-medium">₹{invoice.subtotal || 0}</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">Discount</span>
                    <span className="font-medium text-green-600">-₹{invoice.discount}</span>
                  </div>
                )}

                {invoice.tax > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">Tax (GST)</span>
                    <span className="font-medium">₹{invoice.tax}</span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold">Total Amount Due</span>
                  <span className="text-2xl font-bold text-blue-600">₹{invoice.totalAmount || 0}</span>
                </div>

                {invoice.paidAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                      <span className="text-gray-700">Amount Paid</span>
                      <span className="font-medium text-green-600">₹{invoice.paidAmount}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Balance Due</span>
                      <span className="font-medium text-orange-600">
                        ₹{(invoice.totalAmount || 0) - (invoice.paidAmount || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              {invoice.notes && (
                <>
                  <Separator />
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Notes</p>
                    <p className="text-sm text-yellow-900">{invoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>

          {!printMode && (
            <div className="border-t px-6 py-4 flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
