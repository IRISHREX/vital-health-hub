import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  X,
  User,
  Stethoscope,
  Bed,
  Calendar,
  DollarSign,
  History,
  FileText,
  ArrowRight,
  Clock,
  LogOut,
  Loader2,
  AlertTriangle,
  ClipboardList,
  Receipt,
} from 'lucide-react';
import { dischargePatient } from '@/lib/admissions';
import { getFacilities } from '@/lib/facilities';
import { getServiceOrders, createServiceOrder, updateServiceOrder } from '@/lib/serviceOrders';
import { getLedgerEntries, generateProvisionalInvoice } from '@/lib/billingLedger';
import { toast } from '@/hooks/use-toast';

export default function AdmissionDetailsModal({ admission, isOpen, onClose, onDischarge }) {
  if (!admission) return null;

  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeFormData, setDischargeFormData] = useState({
    dischargeReason: '',
    dischargingDoctorId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [orderForm, setOrderForm] = useState({
    facilityId: '',
    serviceId: '',
    type: 'other',
    quantity: 1,
    unitPrice: '',
    notes: ''
  });

  const calculateDays = (startDate, endDate = new Date()) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const los = calculateDays(admission.admissionDate, admission.dischargeDate || new Date());
  const bedAllocations = admission.bedAllocations || [];
  const transferHistory = admission.transferHistory || [];
  const ledgerTotals = ledgerEntries.reduce(
    (acc, entry) => {
      acc.total += entry.amount || 0;
      if (!entry.billed) acc.unbilled += entry.amount || 0;
      acc.count += 1;
      return acc;
    },
    { total: 0, unbilled: 0, count: 0 }
  );
  const selectedFacility = facilities.find((f) => f._id === orderForm.facilityId);
  const availableServices = selectedFacility?.services || [];

  const facilityTypeToOrderType = (facilityType) => {
    switch (facilityType) {
      case 'lab':
        return 'lab';
      case 'radiology':
        return 'radiology';
      case 'ot':
        return 'procedure';
      case 'physiotherapy':
        return 'physiotherapy';
      default:
        return 'other';
    }
  };

  const dischargeReasons = [
    'Recovery - Fit for discharge',
    'Against medical advice',
    'Referred to other facility',
    'Patient request',
    'Deceased',
    'Self discharge',
  ];

  const handleDischargeSubmit = async () => {
    if (!dischargeFormData.dischargeReason || !dischargeFormData.dischargingDoctorId) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in discharge reason and select a doctor',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await dischargePatient(admission._id, {
        dischargeReason: dischargeFormData.dischargeReason,
        dischargingDoctorId: dischargeFormData.dischargingDoctorId,
        notes: dischargeFormData.notes,
      });

      toast({
        title: 'Success',
        description: `Patient ${admission.patient?.firstName} has been successfully discharged`,
        variant: 'success',
      });

      // Reset form
      setDischargeFormData({
        dischargeReason: '',
        dischargingDoctorId: '',
        notes: '',
      });
      setShowDischargeModal(false);

      // Call parent callback if provided
      if (onDischarge) {
        onDischarge(response);
      }

      // Close the modal
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to discharge patient',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const loadServiceOrders = async () => {
    if (!admission?._id) return;
    setServiceLoading(true);
    try {
      const response = await getServiceOrders({ admissionId: admission._id, limit: 50 });
      setServiceOrders(response?.data?.orders || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load service orders',
        variant: 'destructive',
      });
    } finally {
      setServiceLoading(false);
    }
  };

  const loadLedger = async () => {
    if (!admission?._id) return;
    setLedgerLoading(true);
    try {
      const response = await getLedgerEntries({ admissionId: admission._id, limit: 100 });
      setLedgerEntries(response?.data?.entries || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load ledger entries',
        variant: 'destructive',
      });
    } finally {
      setLedgerLoading(false);
    }
  };

  const loadFacilities = async () => {
    if (facilities.length > 0) return;
    try {
      const response = await getFacilities();
      setFacilities(Array.isArray(response) ? response : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load facilities',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isOpen || !admission?._id) return;
    loadServiceOrders();
    loadLedger();
    loadFacilities();
  }, [isOpen, admission?._id]);

  const handleCreateServiceOrder = async () => {
    if (!admission?._id) return;
    const parsedUnitPrice = Number(orderForm.unitPrice);
    if (orderForm.unitPrice === '' || Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      toast({
        title: 'Validation',
        description: 'Please enter a valid unit price',
        variant: 'destructive',
      });
      return;
    }
    setOrderSubmitting(true);
    try {
      await createServiceOrder({
        admissionId: admission._id,
        patientId: admission.patient?._id,
        facilityId: orderForm.facilityId || undefined,
        serviceId: orderForm.serviceId || undefined,
        type: orderForm.type,
        quantity: Number(orderForm.quantity || 1),
        unitPrice: parsedUnitPrice,
        notes: orderForm.notes || undefined,
      });
      toast({ title: 'Success', description: 'Service order created' });
      setOrderForm({
        facilityId: orderForm.facilityId,
        serviceId: '',
        type: orderForm.type,
        quantity: 1,
        unitPrice: '',
        notes: ''
      });
      await loadServiceOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service order',
        variant: 'destructive',
      });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await updateServiceOrder(orderId, { status: 'completed' });
      toast({ title: 'Updated', description: 'Service order marked completed' });
      await Promise.all([loadServiceOrders(), loadLedger()]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update service order',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateInvoice = async () => {
    if (!admission?._id) return;
    setInvoiceGenerating(true);
    try {
      const response = await generateProvisionalInvoice(admission._id);
      toast({
        title: 'Invoice Generated',
        description: `Invoice created with ${response?.data?.attachedCount || 0} ledger items.`,
      });
      await loadLedger();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invoice from ledger',
        variant: 'destructive',
      });
    } finally {
      setInvoiceGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Admission Details - {admission.admissionId}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-full">
          <div className="space-y-6 pr-4">
            {/* Patient Overview */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                <CardTitle className="text-base">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Full Name</p>
                    <p className="text-lg font-semibold">
                      {admission.patient?.firstName} {admission.patient?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {admission.patient?.patientId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Registration Type</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {admission.patient?.registrationType || 'IPD'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-2">
                      Age: {admission.patient?.age || 'N/A'} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contact</p>
                    <p className="text-sm">{admission.patient?.phoneNumber || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {admission.patient?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Blood Group</p>
                    <p className="text-sm font-semibold">
                      {admission.patient?.bloodGroup || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medical History</p>
                    <p className="text-sm">
                      {admission.patient?.medicalHistory || 'None documented'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admission Overview */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
                <CardTitle className="text-base">Admission Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-600">Admission Date</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {new Date(admission.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-medium text-gray-600">Length of Stay</p>
                    </div>
                    <p className="text-sm font-semibold">{los} days</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`w-fit ${
                          admission.status === 'ADMITTED'
                            ? 'bg-blue-100 text-blue-900'
                            : admission.status === 'DISCHARGED'
                            ? 'bg-green-100 text-green-900'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {admission.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                  </div>
                  {admission.dischargeDate && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-gray-600">Discharge Date</p>
                      </div>
                      <p className="text-sm font-semibold">
                        {new Date(admission.dischargeDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medical Details */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Medical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Diagnosis</p>
                      <p className="text-sm p-3 bg-gray-50 rounded-lg">
                        {admission.diagnosis?.primary ||
                          (typeof admission.diagnosis === 'string' ? admission.diagnosis : 'Not specified')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Treatment Plan</p>
                      <p className="text-sm p-3 bg-gray-50 rounded-lg">
                        {admission.treatmentPlan || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Assigned Doctor</p>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold">
                        {admission.doctor?.firstName} {admission.doctor?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {admission.doctor?.specialization || 'General'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Bed History, Transfers, Services, Ledger */}
            <Tabs defaultValue="beds" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="beds">
                  <Bed className="h-4 w-4 mr-2" />
                  Bed Allocations
                </TabsTrigger>
                <TabsTrigger value="transfers">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer History
                </TabsTrigger>
                <TabsTrigger value="services">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Service Orders
                </TabsTrigger>
                <TabsTrigger value="ledger">
                  <Receipt className="h-4 w-4 mr-2" />
                  Billing Ledger
                </TabsTrigger>
              </TabsList>

              <TabsContent value="beds" className="space-y-4">
                {bedAllocations.length > 0 ? (
                  bedAllocations.map((allocation, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Bed Number</p>
                              <p className="font-semibold">{allocation.bed?.bedNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Type</p>
                              <Badge variant="outline" className="capitalize">
                                {allocation.bed?.bedType}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Ward</p>
                              <p className="font-semibold">
                                {allocation.bed?.ward} (Floor {allocation.bed?.floor})
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
                            <div>
                              <p className="font-medium text-gray-600">From</p>
                              <p>
                                {allocation.allocatedFrom
                                  ? new Date(allocation.allocatedFrom).toLocaleDateString()
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">To</p>
                              <p>
                                {allocation.allocatedTo
                                  ? new Date(allocation.allocatedTo).toLocaleDateString()
                                  : 'Current'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Duration</p>
                              <p>
                                {calculateDays(
                                  allocation.allocatedFrom || admission.admissionDate,
                                  allocation.allocatedTo || new Date()
                                )}{' '}
                                days
                              </p>
                            </div>
                          </div>
                          {allocation.chargeAmount && (
                            <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              <span>
                                Charge: <strong>${allocation.chargeAmount}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      No bed allocations found
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                {transferHistory.length > 0 ? (
                  <div className="space-y-3">
                    {transferHistory.map((transfer, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-600">From</p>
                              <p className="font-semibold">
                                Bed {transfer.fromBed?.bedNumber} - {transfer.fromBed?.ward}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-600">To</p>
                              <p className="font-semibold">
                                Bed {transfer.toBed?.bedNumber} - {transfer.toBed?.ward}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
                            <div>
                              <p className="font-medium text-gray-600">Transfer Date</p>
                              <p>
                                {transfer.transferDate
                                  ? new Date(transfer.transferDate).toLocaleDateString()
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Reason</p>
                              <p>{transfer.transferReason || 'Not specified'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      No transfers recorded
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Create Service Order</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Facility</Label>
                        <Select
                          value={orderForm.facilityId}
                          onValueChange={(value) => {
                            const facility = facilities.find((f) => f._id === value);
                            setOrderForm((prev) => ({
                              ...prev,
                              facilityId: value,
                              serviceId: '',
                              unitPrice: '',
                              type: facility ? facilityTypeToOrderType(facility.type) : 'other'
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilities.map((facility) => (
                              <SelectItem key={facility._id} value={facility._id}>
                                {facility.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Service</Label>
                        <Select
                          value={orderForm.serviceId}
                          onValueChange={(value) => {
                            const service = availableServices.find((s) => s._id === value);
                            setOrderForm((prev) => ({
                              ...prev,
                              serviceId: value,
                              unitPrice: service?.price ?? prev.unitPrice
                            }));
                          }}
                          disabled={!availableServices.length}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableServices.map((service) => (
                              <SelectItem key={service._id} value={service._id}>
                                {service.name} {service.price ? `- ₹${service.price}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={orderForm.type}
                          onValueChange={(value) =>
                            setOrderForm((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lab">Lab</SelectItem>
                            <SelectItem value="radiology">Radiology</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="surgery">Surgery</SelectItem>
                            <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={orderForm.quantity}
                          onChange={(e) =>
                            setOrderForm((prev) => ({ ...prev, quantity: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          value={orderForm.unitPrice}
                          onChange={(e) =>
                            setOrderForm((prev) => ({ ...prev, unitPrice: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          placeholder="Optional notes"
                          value={orderForm.notes}
                          onChange={(e) =>
                            setOrderForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleCreateServiceOrder} disabled={orderSubmitting}>
                        {orderSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Create Order'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Service Orders</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {serviceLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : serviceOrders.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-6">
                        No service orders found
                      </div>
                    ) : (
                      serviceOrders.map((order) => (
                        <div key={order._id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="text-sm font-medium">
                              {order.service?.name || 'Service'}{' '}
                              {order.facility?.name ? `(${order.facility?.name})` : ''}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.type} â€¢ Qty {order.quantity} â€¢ ₹{order.totalAmount}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {order.status}
                            </Badge>
                            {order.status !== 'completed' && (
                              <Button size="sm" variant="outline" onClick={() => handleCompleteOrder(order._id)}>
                                Mark Completed
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ledger" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Billing Ledger</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ledgerLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : ledgerEntries.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-6">
                        No ledger entries found
                      </div>
                    ) : (
                      ledgerEntries.map((entry) => (
                        <div key={entry._id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="text-sm font-medium">{entry.description}</p>
                            <p className="text-xs text-gray-500 capitalize">
                              {entry.category.replace('_', ' ')} â€¢ Qty {entry.quantity}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">₹{entry.amount}</p>
                            <Badge variant="outline">
                              {entry.billed ? 'Billed' : 'Unbilled'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Summary Footer */}
            <Card className="border-l-4 border-l-green-600">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Beds Used</p>
                    <p className="text-xl font-bold text-green-600">
                      {bedAllocations.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Transfers</p>
                    <p className="text-xl font-bold text-blue-600">
                      {transferHistory.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Total Charge</p>
                    <p className="text-xl font-bold text-orange-600">
                      ${admission.totalCharge || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Invoice</p>
                    <p className="text-lg font-bold text-purple-600">
                      {admission.invoices?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-3 pt-4 border-t">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="font-medium text-gray-900">Ledger Summary</span>
              <span>Total: ₹{ledgerTotals.total.toFixed(2)}</span>
              <span>Unbilled: ₹{ledgerTotals.unbilled.toFixed(2)}</span>
              <span>Entries: {ledgerTotals.count}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateInvoice}
                disabled={invoiceGenerating || ledgerTotals.unbilled <= 0}
              >
                {invoiceGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Provisional Invoice'
                )}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
          {admission.status === 'ADMITTED' && (
            <div>
              <Button
                variant="destructive"
                onClick={() => setShowDischargeModal(true)}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Discharge Patient
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Discharge Modal */}
      <Dialog open={showDischargeModal} onOpenChange={setShowDischargeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Discharge Patient
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Patient Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Name</p>
                    <p className="text-lg font-semibold">
                      {admission.patient?.firstName} {admission.patient?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Admission Date</p>
                    <p className="text-lg font-semibold">
                      {new Date(admission.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Length of Stay</p>
                    <p className="text-lg font-semibold text-blue-600">{los} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discharge Form */}
            <div className="space-y-4">
              {/* Discharge Reason */}
              <div className="space-y-2">
                <Label htmlFor="discharge-reason" className="font-semibold">
                  Discharge Reason *
                </Label>
                <Select
                  value={dischargeFormData.dischargeReason}
                  onValueChange={(value) =>
                    setDischargeFormData({
                      ...dischargeFormData,
                      dischargeReason: value,
                    })
                  }
                >
                  <SelectTrigger id="discharge-reason">
                    <SelectValue placeholder="Select discharge reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {dischargeReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discharging Doctor */}
              <div className="space-y-2">
                <Label htmlFor="doctor" className="font-semibold">
                  Discharging Doctor *
                </Label>
                <Select
                  value={dischargeFormData.dischargingDoctorId}
                  onValueChange={(value) =>
                    setDischargeFormData({
                      ...dischargeFormData,
                      dischargingDoctorId: value,
                    })
                  }
                >
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Select discharging doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {admission.admittingDoctor && (
                      <SelectItem value={admission.admittingDoctor._id || admission.admittingDoctor}>
                        Dr. {admission.admittingDoctor?.user?.firstName || admission.admittingDoctor?.firstName}{' '}
                        {admission.admittingDoctor?.user?.lastName || admission.admittingDoctor?.lastName}
                      </SelectItem>
                    )}
                    {admission.attendingDoctors?.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id || doctor}>
                        Dr. {doctor?.user?.firstName || doctor?.firstName}{' '}
                        {doctor?.user?.lastName || doctor?.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discharge Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold">
                  Discharge Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any additional discharge notes (instructions, follow-up care, medications, etc.)"
                  value={dischargeFormData.notes}
                  onChange={(e) =>
                    setDischargeFormData({
                      ...dischargeFormData,
                      notes: e.target.value,
                    })
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Discharge Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <Badge className="bg-blue-100 text-blue-900">{admission.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason:</span>
                  <span className="font-medium">{dischargeFormData.dischargeReason || 'Not selected'}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Discharge Date:</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDischargeModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDischargeSubmit}
              disabled={loading || !dischargeFormData.dischargeReason || !dischargeFormData.dischargingDoctorId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
