import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Download, FileText, Clock, DollarSign } from 'lucide-react';

export default function DischargeSummary({ admission, invoice }) {
  if (!admission || admission.status !== 'DISCHARGED') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Patient is not discharged yet.</AlertDescription>
      </Alert>
    );
  }

  const calculateDays = (from, to) => {
    return Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
  };

  const totalDays = calculateDays(admission.admissionDate, admission.dischargeDate);
  const totalCost = invoice?.totalAmount || 0;
  const dischargedByDoctor = admission.dischargingDoctor;

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800 ml-2">
          <p className="font-semibold">Patient Successfully Discharged</p>
          <p className="text-sm mt-1">
            {admission.patient?.firstName} {admission.patient?.lastName} has been discharged from hospital.
          </p>
        </AlertDescription>
      </Alert>

      {/* Discharge Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Discharge Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Discharge Date & Time</p>
              <p className="font-semibold text-lg">
                {new Date(admission.dischargeDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(admission.dischargeDate).toLocaleTimeString('en-IN')}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-1">Length of Stay</p>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="font-semibold text-lg">{totalDays} days</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Discharged By</p>
              {dischargedByDoctor ? (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="font-semibold">Dr. {dischargedByDoctor.user?.firstName} {dischargedByDoctor.user?.lastName}</p>
                  <p className="text-sm text-gray-600">{dischargedByDoctor.specialization}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Not specified</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
              <p className="font-semibold text-lg">#{invoice?.invoiceNumber}</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Total Charges</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-2xl text-green-600">₹{totalCost.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-1">Payment Status</p>
              <Badge
                className={
                  invoice?.status === 'paid'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : invoice?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }
              >
                {invoice?.status?.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discharge Notes */}
      {admission.dischargeNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discharge Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-blue-500">
              <p className="text-gray-700 whitespace-pre-line">{admission.dischargeNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bed Allocation History */}
      {admission.bedAllocations && admission.bedAllocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bed Allocation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {admission.bedAllocations.map((allocation, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">
                        {idx === 0 ? '🛏️ Initial Allocation' : `📍 Transfer ${idx}`}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Bed: <span className="font-medium">{allocation.bed?.bedNumber}</span>
                        {' • '}
                        {allocation.bed?.bedType?.toUpperCase()}
                        {' • '}
                        {allocation.bed?.ward}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">₹{allocation.totalCost}</p>
                      <p className="text-sm text-gray-600">@ ₹{allocation.dailyRate}/day</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded p-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">From</p>
                      <p className="font-medium">
                        {new Date(allocation.startDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">To</p>
                      <p className="font-medium">
                        {new Date(allocation.endDate || admission.dischargeDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-medium">
                        {calculateDays(
                          allocation.startDate,
                          allocation.endDate || admission.dischargeDate
                        )}{' '}
                        days
                      </p>
                    </div>
                  </div>

                  {allocation.transferReason && (
                    <div className="mt-3 text-sm">
                      <p className="text-gray-600 mb-1">Reason for {idx === 0 ? 'Admission' : 'Transfer'}</p>
                      <p className="text-gray-700 italic">{allocation.transferReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Diagnosis</p>
            <p className="font-medium text-gray-900">{admission.diagnosis?.primary || 'Not specified'}</p>
          </div>

          {admission.treatmentPlan && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Treatment Plan</p>
              <p className="text-gray-700 whitespace-pre-line">{admission.treatmentPlan}</p>
            </div>
          )}

          {admission.symptoms && admission.symptoms.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Symptoms</p>
              <div className="flex flex-wrap gap-2">
                {admission.symptoms.map((symptom, idx) => (
                  <Badge key={idx} variant="outline">{symptom}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Discharge Summary
        </Button>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          View Invoice
        </Button>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <CheckCircle className="h-4 w-4" />
          Mark as Printed
        </Button>
      </div>
    </div>
  );
}
