import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createPatient, updatePatient } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getBeds } from "@/lib/beds";
import { createInvoice, getInvoices, updateInvoice } from "@/lib/invoices";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
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

const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  contactNumber: z.string().min(10, "Valid phone number required").max(15),
  email: z.string().email("Valid email required").optional(),
  address: z.string().min(1, "Address is required").max(200),
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency contact name required"),
    relationship: z.string().min(1, "Relationship required"),
    phone: z.string().min(10, "Valid phone number required"),
  }),
  bloodGroup: z.string().optional(),
  registrationType: z.enum(["opd", "ipd", "emergency"]),
  medicalHistory: z.string().optional(),
  assignedDoctor: z.string().optional(),
  assignedBed: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  mode: "create" | "edit";
}

export default function PatientDialog({ isOpen, onClose, patient, mode }: PatientDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  const { data: bedsData } = useQuery({
    queryKey: ["beds"],
    queryFn: getBeds,
  });

  const doctors = doctorsData?.data?.doctors || [];
  const beds = (bedsData?.data?.beds || []).filter((b: any) => b.status === "available");

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "male",
      contactNumber: "",
      email: "",
      address: "",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
      bloodGroup: "",
      registrationType: "opd",
      medicalHistory: "",
      assignedDoctor: "",
      assignedBed: "",
    },
  });

  useEffect(() => {
    if (patient && mode === "edit") {
      form.reset({
        firstName: patient.firstName || "",
        lastName: patient.lastName || "",
        dateOfBirth: patient.dateOfBirth?.split("T")[0] || "",
        gender: (patient.gender || "male").toLowerCase(),
        contactNumber: patient.phone || "",
        email: patient.email || "",
        address: patient.address?.street ? `${patient.address.street}, ${patient.address.city}` : patient.address || "",
        emergencyContact: patient.emergencyContact || { name: "", relationship: "", phone: "" },
        bloodGroup: patient.bloodGroup || "",
        registrationType: patient.registrationType || "opd",
        medicalHistory: patient.medicalHistory?.[0]?.condition || "",
        assignedDoctor: patient.assignedDoctor || "",
        assignedBed: patient.assignedBed || "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "male",
        contactNumber: "",
        email: "",
        address: "",
        emergencyContact: {
          name: "",
          relationship: "",
          phone: "",
        },
        bloodGroup: "",
        registrationType: "opd",
        medicalHistory: "",
        assignedDoctor: "",
        assignedBed: "",
      });
    }
  }, [patient, mode, form]);

  const createMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      const medicalHistory = values.medicalHistory 
        ? [{ condition: values.medicalHistory, diagnosedDate: new Date() }]
        : [];
      
      // Create patient first
      const patientData = await createPatient({
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        phone: values.contactNumber,
        email: values.email || "",
        address: values.address,
        emergencyContact: values.emergencyContact,
        bloodGroup: values.bloodGroup || null,
        registrationType: values.registrationType,
        medicalHistory,
        assignedDoctor: values.assignedDoctor || null,
        assignedBed: values.assignedBed || null,
      });

      // Auto-create invoice with default values (0s)
      if (patientData?.data?._id || patientData?._id) {
        const patientId = patientData?.data?._id || patientData?._id;
        const invoiceData = {
          patient: patientId,
          type: values.registrationType,
          items: [],
          subtotal: 0,
          totalAmount: 0,
          dueAmount: 0,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: 'draft',
          notes: `Invoice auto-created for ${values.firstName} ${values.lastName}`,
          generatedBy: user?.id || ""
        };
        await createInvoice(invoiceData);
      }

      return patientData;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Patient registered successfully." });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to register patient." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PatientFormValues) => {
      const medicalHistory = data.medicalHistory 
        ? [{ condition: data.medicalHistory, diagnosedDate: new Date() }]
        : [];
      
      const updatedPatient = await updatePatient(patient._id, {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        phone: data.contactNumber,
        email: data.email || "",
        address: data.address,
        emergencyContact: data.emergencyContact,
        bloodGroup: data.bloodGroup || null,
        registrationType: data.registrationType,
        medicalHistory,
        assignedDoctor: data.assignedDoctor || null,
        assignedBed: data.assignedBed || null,
      });

      // If doctor or bed was assigned, update the invoice
      if (data.assignedDoctor || data.assignedBed) {
        try {
          const invoicesResponse = await getInvoices({ patientId: patient._id });
          const invoices = invoicesResponse?.data?.invoices || [];
          if (invoices.length > 0) {
            const invoice = invoices[0];
            const updateData: any = {};
            if (data.assignedBed) {
              updateData.status = 'pending';
            }
            if (Object.keys(updateData).length > 0) {
              await updateInvoice(invoice._id, updateData);
            }
          }
        } catch (error) {
          console.error('Error updating invoice:', error);
          // Don't fail the patient update if invoice update fails
        }
      }

      return updatedPatient;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Patient updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update patient." });
    },
  });

  const onSubmit = (values: PatientFormValues) => {
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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Register New Patient" : "Edit Patient"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Enter patient details to register." : "Update patient information."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full address..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="opd">OPD (Outpatient)</SelectItem>
                        <SelectItem value="ipd">IPD (Admitted)</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Spouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Medical Information</h4>
                <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="medicalHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical History</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Diabetes, Hypertension" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedDoctor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Doctor (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((doctor: any) => (
                            <SelectItem key={doctor._id} value={doctor._id}>
                              {doctor.user?.firstName} {doctor.user?.lastName} ({doctor.specialization})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.watch("registrationType") === "ipd" && (
                <FormField
                  control={form.control}
                  name="assignedBed"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Assigned Bed (Required for IPD)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bed" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {beds.map((bed: any) => (
                            <SelectItem key={bed._id} value={bed._id}>
                              {bed.bedNumber} - {bed.ward} ({bed.bedType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Register Patient" : "Update Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}