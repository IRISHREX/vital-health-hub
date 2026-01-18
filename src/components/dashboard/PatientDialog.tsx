import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createPatient, updatePatient } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getBeds } from "@/lib/beds";
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

const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  contactNumber: z.string().min(10, "Valid phone number required").max(15),
  email: z.string().email("Valid email required"),
  address: z.string().min(1, "Address is required").max(200),
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency contact name required"),
    relationship: z.string().min(1, "Relationship required"),
    phone: z.string().min(10, "Valid phone number required"),
  }),
  bloodGroup: z.string().optional(),
  type: z.enum(["IPD", "OPD"]),
  diagnosis: z.string().optional(),
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
      gender: "Male",
      contactNumber: "",
      email: "",
      address: "",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
      bloodGroup: "",
      type: "OPD",
      diagnosis: "",
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
        gender: patient.gender || "Male",
        contactNumber: patient.contactNumber || "",
        email: patient.email || "",
        address: patient.address || "",
        emergencyContact: patient.emergencyContact || { name: "", relationship: "", phone: "" },
        bloodGroup: patient.bloodGroup || "",
        type: patient.type || "OPD",
        diagnosis: patient.diagnosis || "",
        assignedDoctor: patient.assignedDoctor || "",
        assignedBed: patient.assignedBed || "",
      });
    } else {
      form.reset();
    }
  }, [patient, mode, form]);

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      toast({ title: "Success", description: "Patient registered successfully." });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to register patient." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PatientFormValues) => updatePatient(patient._id, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Patient updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
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
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                name="type"
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
                        <SelectItem value="OPD">OPD (Outpatient)</SelectItem>
                        <SelectItem value="IPD">IPD (Admitted)</SelectItem>
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
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnosis</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., General Checkup" {...field} />
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
                      <FormLabel>Assigned Doctor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((doctor: any) => (
                            <SelectItem key={doctor._id} value={doctor._id}>
                              {doctor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.watch("type") === "IPD" && (
                <FormField
                  control={form.control}
                  name="assignedBed"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Assigned Bed</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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