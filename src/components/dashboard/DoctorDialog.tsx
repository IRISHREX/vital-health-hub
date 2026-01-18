import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDoctor, updateDoctor } from "@/lib/doctors";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const departments = [
  "Cardiac Care",
  "Respiratory",
  "Surgery",
  "Orthopedics",
  "Neurology",
  "Pediatrics",
  "General Medicine",
  "Dermatology",
  "Ophthalmology",
  "ENT",
];

const doctorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone number required").max(15),
  specialty: z.string().min(1, "Specialty is required"),
  department: z.string().min(1, "Department is required"),
  qualification: z.string().min(1, "Qualification is required"),
  experience: z.coerce.number().min(0, "Experience must be positive"),
  consultationFee: z.coerce.number().min(0, "Fee must be positive"),
  isAvailable: z.boolean(),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

interface DoctorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  doctor?: any;
  mode: "create" | "edit";
}

export default function DoctorDialog({ isOpen, onClose, doctor, mode }: DoctorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "",
      department: "",
      qualification: "",
      experience: 0,
      consultationFee: 500,
      isAvailable: true,
    },
  });

  useEffect(() => {
    if (doctor && mode === "edit") {
      form.reset({
        name: doctor.name || "",
        email: doctor.email || "",
        phone: doctor.phone || "",
        specialty: doctor.specialty || "",
        department: doctor.department || "",
        qualification: doctor.qualification || "",
        experience: doctor.experience || 0,
        consultationFee: doctor.consultationFee || 500,
        isAvailable: doctor.isAvailable ?? true,
      });
    } else {
      form.reset();
    }
  }, [doctor, mode, form]);

  const createMutation = useMutation({
    mutationFn: createDoctor,
    onSuccess: () => {
      toast({ title: "Success", description: "Doctor added successfully." });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to add doctor." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DoctorFormValues) => updateDoctor(doctor._id, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Doctor updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update doctor." });
    },
  });

  const onSubmit = (values: DoctorFormValues) => {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Doctor" : "Edit Doctor"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Enter doctor details." : "Update doctor information."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="doctor@hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cardiologist" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MBBS, MD (Cardiology)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience (years)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consultationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultation Fee (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Available for appointments</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Add Doctor" : "Update Doctor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}