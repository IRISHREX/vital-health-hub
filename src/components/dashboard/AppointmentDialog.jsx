import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createAppointment, updateAppointment, getAppointments } from "@/lib/appointments";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getHospitalSettings } from "@/lib/settings";
import { printAppointmentReceipt } from "@/lib/appointment-receipt";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import PatientAutocomplete, { patientLabel } from "@/components/shared/PatientAutocomplete";
import DoctorAutocomplete, { doctorAutocompleteLabel } from "@/components/shared/DoctorAutocomplete";
import PatientDialog from "@/components/dashboard/PatientDialog";

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  appointmentDate: z.string()
    .min(1, "Date is required")
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      "Appointment date cannot be in the past"
    ),
  priority: z.enum(["normal", "urgent", "emergency"]).optional(),
  fee: z.coerce.number().min(0, "Fee must be ≥ 0").optional(),
  paymentMode: z.enum(["pending", "cash", "card", "upi", "net_banking"]).optional(),
  referredByName: z.string().optional().or(z.literal("")),
  referredByDoctorId: z.string().optional().or(z.literal("")),
  reason: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().optional(),
  type: z.enum(["opd", "follow_up", "consultation", "emergency", "telemedicine"]).optional(),
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded"]).optional(),
});

export default function AppointmentDialog({ isOpen, onClose, appointment, mode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  const { data: patientsData, refetch: refetchPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  // Estimate next serial no. for today
  const { data: todaysApptsRes } = useQuery({
    queryKey: ["appointments", "serial-today"],
    queryFn: () => getAppointments({ date: getTodayDateString() }),
    enabled: isOpen && mode === "create",
  });
  const nextSerial = (todaysApptsRes?.data?.appointments?.length || 0) + 1;

  const patients = patientsData?.data?.patients || [];
  const allDoctors = doctorsData?.data?.doctors || [];
  const referralDoctors = allDoctors.filter((d) => d.doctorType === "referral");
  const isDoctorUser = user?.role === "doctor";
  const loggedInDoctor = useMemo(
    () =>
      allDoctors.find(
        (d) =>
          d?.user?._id === user?._id ||
          String(d?.user?.email || "").toLowerCase() === String(user?.email || "").toLowerCase()
      ) || null,
    [allDoctors, user?._id, user?.email]
  );
  const doctors = isDoctorUser
    ? (loggedInDoctor ? [loggedInDoctor] : [])
    : allDoctors.filter((d) => (d.doctorType || "hospital") !== "referral" && d.availabilityStatus === "available");

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      appointmentDate: "",
      priority: "normal",
      fee: 0,
      paymentMode: "pending",
      referredByName: "",
      referredByDoctorId: "",
      reason: "",
      notes: "",
      type: "opd",
      status: "scheduled",
    },
  });

  useEffect(() => {
    if (appointment && mode === "edit") {
      const dateTime = appointment.appointmentDate ? new Date(appointment.appointmentDate) : null;
      const editDoctorId = isDoctorUser ? (loggedInDoctor?._id || "") : (appointment.doctor?._id || appointment.doctorId || "");
      form.reset({
        patientId: appointment.patient?._id || appointment.patientId || "",
        doctorId: editDoctorId,
        appointmentDate: dateTime ? dateTime.toISOString().split("T")[0] : "",
        priority: appointment.priority || "normal",
        fee: appointment.fee ?? 0,
        paymentMode: appointment.paymentMode || "pending",
        referredByName: appointment.referredBy?.name || "",
        referredByDoctorId: appointment.referredBy?.doctor?._id || appointment.referredBy?.doctor || "",
        reason: appointment.reason || "",
        notes: appointment.notes || "",
        type: appointment.type || "opd",
        status: appointment.status || "scheduled",
      });
    } else {
      form.reset({
        patientId: "",
        doctorId: isDoctorUser ? (loggedInDoctor?._id || "") : "",
        appointmentDate: getTodayDateString(),
        priority: "normal",
        fee: 0,
        paymentMode: "pending",
        referredByName: "",
        referredByDoctorId: "",
        reason: "",
        notes: "",
        type: "opd",
        status: "scheduled",
      });
    }
  }, [appointment, mode, form, isDoctorUser, loggedInDoctor?._id]);

  // When doctor changes, prefill fee from doctor's consultationFee
  const watchedDoctorId = form.watch("doctorId");
  const watchedPaymentMode = form.watch("paymentMode");
  useEffect(() => {
    if (mode === "create" && watchedDoctorId) {
      const doc = allDoctors.find((d) => d._id === watchedDoctorId);
      const docFee = doc?.consultationFee?.opd;
      if (docFee && !form.getValues("fee")) {
        form.setValue("fee", docFee);
      }
    }
  }, [watchedDoctorId, allDoctors, mode, form]);

  // Auto-confirm status when payment mode is set to a non-pending mode
  useEffect(() => {
    if (watchedPaymentMode && watchedPaymentMode !== "pending") {
      const current = form.getValues("status");
      if (current === "scheduled") form.setValue("status", "confirmed");
    }
  }, [watchedPaymentMode, form]);

  const buildPayload = (data) => {
    const selectedDoctorId = isDoctorUser ? loggedInDoctor?._id : data.doctorId;
    return {
      patientId: data.patientId,
      doctorId: selectedDoctorId,
      doctor: selectedDoctorId,
      appointmentDate: `${data.appointmentDate}T10:00:00`,
      reason: data.reason || "",
      notes: data.notes || "",
      type: data.type || "opd",
      status: data.status || "scheduled",
      priority: data.priority || "normal",
      fee: data.fee !== undefined ? Number(data.fee) : undefined,
      paymentMode: data.paymentMode || "pending",
      paymentStatus: data.paymentMode && data.paymentMode !== "pending" ? "paid" : "pending",
      referredBy: (data.referredByName || data.referredByDoctorId)
        ? { name: data.referredByName || "", doctor: data.referredByDoctorId || undefined }
        : undefined,
    };
  };

  const createMutation = useMutation({
    mutationFn: (data) => createAppointment(buildPayload(data)),
    onSuccess: (response, variables) => {
      toast({ title: "Success", description: "Appointment booked successfully." }); playSound('success');
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      try {
        const created = response?.data?.appointment || response?.data || response;
        if (created) {
          const patientObj = patients.find((p) => p._id === variables?.patientId) || created.patient;
          const doctorObj = allDoctors.find((d) => d._id === (variables?.doctorId)) || created.doctor;
          // Merge so phone/patientId from list fills any gaps in the newly-created payload
          const mergedPatient = { ...(patientObj || {}), ...(created.patient || {}) };
          const mergedDoctor = { ...(doctorObj || {}), ...(created.doctor || {}) };
          printAppointmentReceipt(
            { ...created, patient: mergedPatient, doctor: mergedDoctor },
            hospitalRes?.data || {}
          );
        }
      } catch (e) { /* non-fatal */ }
      handleClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to book appointment." }); playSound('error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateAppointment(appointment._id, buildPayload(data)),
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment updated successfully." }); playSound('update');
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      handleClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update appointment." }); playSound('error');
    },
  });

  const onSubmit = (values) => {
    if (isDoctorUser && !loggedInDoctor?._id) {
      toast({ variant: "destructive", title: "Error", description: "Doctor profile is not linked to your account." });
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

  const handleNewPatientClose = async () => {
    setNewPatientOpen(false);
    const fresh = await refetchPatients();
    // Auto-select newest patient
    const list = fresh?.data?.data?.patients || [];
    if (list.length > 0) {
      const newest = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (newest?._id) form.setValue("patientId", newest._id);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Book Appointment" : "Edit Appointment"}</DialogTitle>
            <DialogDescription>
              {mode === "create" ? `Serial No. #${nextSerial} (today)` : "Update appointment details."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form} validationId="appointment_dialog">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {mode === "create" && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <span className="text-muted-foreground">Serial No. (today): </span>
                  <span className="font-semibold">#{nextSerial}</span>
                </div>
              )}

              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => {
                  const selected = patients.find((p) => p._id === field.value);
                  return (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Patient Name</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setNewPatientOpen(true)}
                        >
                          <UserPlus className="mr-1 h-3 w-3" /> New Patient
                        </Button>
                      </div>
                      <FormControl>
                        <PatientAutocomplete
                          value={field.value}
                          selectedLabel={selected ? patientLabel(selected) : ""}
                          onSelect={(p) => field.onChange(p?._id || "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => {
                  const selected = doctors.find((d) => d._id === field.value);
                  return (
                    <FormItem>
                      <FormLabel>Select Doctor</FormLabel>
                      <FormControl>
                        <DoctorAutocomplete
                          value={field.value}
                          selectedLabel={selected ? doctorAutocompleteLabel(selected) : ""}
                          onSelect={(d) => field.onChange(d?._id || "")}
                          filterFn={(d) => isDoctorUser ? d._id === loggedInDoctor?._id : (d.doctorType || "hospital") !== "referral" && d.availabilityStatus === "available"}
                          disabled={isDoctorUser}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} min={getTodayDateString()} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor Fees (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => {
                    // Once payment has been recorded (non-pending) on an existing appointment,
                    // lock the payment mode so it can't be reverted to pending or changed.
                    const originallyPaid =
                      mode === "edit" &&
                      appointment?.paymentMode &&
                      appointment.paymentMode !== "pending";
                    // Also lock payment mode once the appointment reaches a terminal state
                    // (cancelled/refunded/no_show/completed) — payments cannot be changed after that.
                    const terminalStatus =
                      mode === "edit" &&
                      ["cancelled", "refunded", "no_show", "completed"].includes(
                        appointment?.status
                      );
                    const locked = originallyPaid || terminalStatus;
                    return (
                      <FormItem>
                        <FormLabel>Payment Mode</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "pending"}
                          disabled={locked}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="net_banking">Net Banking</SelectItem>
                          </SelectContent>
                        </Select>
                        {locked && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {terminalStatus
                              ? `Appointment is ${appointment?.status} — payment mode is locked.`
                              : "Payment already recorded — mode is locked."}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => {
                  const current = field.value || "scheduled";
                  // Allowed forward transitions:
                  //   scheduled → confirmed → cancelled → refunded
                  //   scheduled → cancelled
                  //   confirmed → refunded
                  const allowedByCurrent = {
                    scheduled: ["scheduled", "confirmed", "cancelled"],
                    confirmed: ["confirmed", "cancelled", "refunded"],
                    cancelled: ["cancelled", "refunded"],
                    refunded: ["refunded"],
                    in_progress: ["in_progress", "cancelled", "refunded"],
                    completed: ["completed"],
                    no_show: ["no_show"],
                  };
                  // If payment is pending, only allow cancellation (no refund possible without a payment).
                  // Refund is only meaningful once a payment mode has been set.
                  const isPaymentPending = !watchedPaymentMode || watchedPaymentMode === "pending";
                  let options =
                    mode === "create"
                      ? ["scheduled", "confirmed"]
                      : (allowedByCurrent[current] || ["scheduled", "confirmed", "cancelled", "refunded"]);
                  if (isPaymentPending) {
                    options = options.filter((s) => s !== "refunded");
                  }
                  const label = {
                    scheduled: "Scheduled",
                    confirmed: "Confirmed",
                    cancelled: "Cancelled",
                    refunded: "Refunded",
                    in_progress: "In Progress",
                    completed: "Completed",
                    no_show: "No Show",
                  };
                  return (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={current}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.map((s) => (
                            <SelectItem key={s} value={s}>{label[s] || s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />


              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referredByDoctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred By (Doctor)</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none" ? "" : v)}
                        value={field.value || "__none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none">None</SelectItem>
                          {referralDoctors.map((d) => (
                            <SelectItem key={d._id} value={d._id}>
                              {d.name} {d.specialization ? `(${d.specialization})` : ""}
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
                  name="referredByName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred By (Other)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Dr. Sharma / Self" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message / Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Reason / message / notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Book Appointment" : "Update Appointment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PatientDialog
        isOpen={newPatientOpen}
        onClose={handleNewPatientClose}
        patient={null}
        mode="create"
      />
    </>
  );
}
