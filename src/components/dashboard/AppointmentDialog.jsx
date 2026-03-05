import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createAppointment, updateAppointment } from "@/lib/appointments";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  appointmentDate: z.string().min(1, "Date is required"),
  appointmentTime: z.string().min(1, "Time is required"),
  reason: z.string().min(1, "Reason is required").max(200),
  notes: z.string().optional(),
  type: z.enum(["opd", "follow_up", "consultation", "emergency", "telemedicine"]).optional(),
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]).optional(),
});

export default function AppointmentDialog({ isOpen, onClose, appointment, mode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: patientsData } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  const patients = patientsData?.data?.patients || [];
  const allDoctors = doctorsData?.data?.doctors || [];
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
    : allDoctors.filter((d) => d.availabilityStatus === "available");

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      appointmentDate: "",
      appointmentTime: "",
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
        appointmentTime: dateTime ? dateTime.toTimeString().slice(0, 5) : "",
        reason: appointment.reason || "",
        notes: appointment.notes || "",
        type: appointment.type || "opd",
        status: appointment.status || "scheduled",
      });
    } else {
      form.reset({
        patientId: "",
        doctorId: isDoctorUser ? (loggedInDoctor?._id || "") : "",
        appointmentDate: "",
        appointmentTime: "",
        reason: "",
        notes: "",
        type: "opd",
        status: "scheduled",
      });
    }
  }, [appointment, mode, form, isDoctorUser, loggedInDoctor?._id]);

  const createMutation = useMutation({
    mutationFn: (data) => {
      const combinedDateTime = `${data.appointmentDate}T${data.appointmentTime}:00`;
      const selectedDoctorId = isDoctorUser ? loggedInDoctor?._id : data.doctorId;
      return createAppointment({
        patientId: data.patientId,
        // backend expects doctorId for creation but we also include doctor
        doctorId: selectedDoctorId,
        doctor: selectedDoctorId,
        appointmentDate: combinedDateTime,
        reason: data.reason,
        notes: data.notes,
        type: data.type || "opd",
        status: data.status || "scheduled",
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment booked successfully." });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      handleClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to book appointment." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const combinedDateTime = `${data.appointmentDate}T${data.appointmentTime}:00`;
      const selectedDoctorId = isDoctorUser ? loggedInDoctor?._id : data.doctorId;
      return updateAppointment(appointment._id, {
        patientId: data.patientId,
        // include doctor field so backend updates the reference correctly
        doctorId: selectedDoctorId,
        doctor: selectedDoctorId,
        appointmentDate: combinedDateTime,
        reason: data.reason,
        notes: data.notes,
        type: data.type || "opd",
        status: data.status || "scheduled",
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      handleClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update appointment." });
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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Book Appointment" : "Edit Appointment"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Schedule a new appointment." : "Update appointment details."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
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
                      {patients.map((patient) => (
                        <SelectItem key={patient._id} value={patient._id}>
                          {patient.firstName} {patient.lastName}
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
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isDoctorUser}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor._id} value={doctor._id}>
                          {doctor.name || doctor.user?.firstName} {doctor.user?.lastName} - {doctor.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Regular Checkup" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "edit" && (
              <>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "opd"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="opd">OPD</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="telemedicine">Telemedicine</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "scheduled"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
  );
}
