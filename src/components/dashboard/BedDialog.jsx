import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createBed, updateBed } from "@/lib/beds";
import { getPatients } from "@/lib/patients";
import { getNurses } from "@/lib/users";
import { createInvoice } from "@/lib/invoices";
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
import { Loader2, UserPlus } from "lucide-react";

const bedSchema = z.object({
  bedNumber: z.string().min(1, "Bed number is required").max(20),
  bedType: z.enum([
    "icu",
    "ccu",
    "general",
    "semi_private",
    "private",
    "emergency",
    "ventilator",
    "pediatric",
    "maternity",
  ]),
  ward: z.string().min(1, "Ward is required").max(50),
  floor: z.coerce.number().min(0, "Floor must be 0 or higher"),
  status: z.enum(["available", "occupied", "cleaning", "reserved", "maintenance", "out_of_service"]),
  pricePerDay: z.coerce.number().min(0, "Rate must be positive"),
  roomNumber: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export default function BedDialog({ isOpen, onClose, bed, mode, assignMode = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAssignMode, setShowAssignMode] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");

  const { data: patientsData } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const patients = patientsData?.data?.patients || [];
  const availablePatients = patients.filter((p) => !p.assignedBed);

  const { data: nursesData } = useQuery({
    queryKey: ["nurses"],
    queryFn: () => getNurses(),
  });
  const nurses = nursesData?.data?.users || [];

  const form = useForm({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      bedNumber: "",
      bedType: "general",
      ward: "",
      floor: 0,
      status: "available",
      pricePerDay: 1000,
      roomNumber: "",
      amenities: [],
      notes: "",
      nurseInCharge: "none",
    },
  });

  useEffect(() => {
    if (bed && mode === "edit") {
      form.reset({
        bedNumber: bed.bedNumber || "",
        bedType: bed.bedType || "general",
        ward: bed.ward || "",
        floor: bed.floor || 0,
        status: bed.status || "available",
        pricePerDay: bed.pricePerDay || 1000,
        roomNumber: bed.roomNumber || "",
        amenities: bed.amenities || [],
        notes: bed.notes || "",
        nurseInCharge: bed?.nurseInCharge?._id || 'none',
      });
      if (assignMode) {
        setShowAssignMode(true);
      }
    } else {
      form.reset({
        bedNumber: "",
        bedType: "general",
        ward: "",
        floor: 0,
        status: "available",
        pricePerDay: 1000,
        roomNumber: "",
        amenities: [],
        notes: "",
        nurseInCharge: "none",
      });
      setShowAssignMode(false);
    }
  }, [bed?._id, mode, assignMode]);

  const createMutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values };
      if (payload.nurseInCharge === 'none') payload.nurseInCharge = null;
      return createBed(payload);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Bed added successfully." });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      handleClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to add bed." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (payload.nurseInCharge === 'none') payload.nurseInCharge = null;
      return updateBed(bed._id, payload);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Bed updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      handleClose();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update bed." });
    },
  });

  const assignPatientMutation = useMutation({
    mutationFn: async (patientId) => {
      const bedResponse = await updateBed(bed._id, {
        currentPatient: patientId,
        status: "occupied",
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData = {
        patient: patientId,
        type: "ipd",
        items: [
          {
            description: `Bed Charges - ${bed?.bedType?.toUpperCase()} (${bed?.bedNumber})`,
            category: "bed_charges",
            quantity: 1,
            unitPrice: bed?.pricePerDay || 0,
            discount: 0,
            tax: 0,
            amount: bed?.pricePerDay || 0,
          },
        ],
        subtotal: bed?.pricePerDay || 0,
        discountAmount: 0,
        totalTax: 0,
        totalAmount: bed?.pricePerDay || 0,
        dueDate: dueDate.toISOString().split("T")[0],
        notes: `Initial charges for bed ${bed?.bedNumber} assignment`,
      };

      await createInvoice(invoiceData);

      return bedResponse;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Patient assigned to bed and invoice created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign patient to bed.",
      });
    },
  });

  const onSubmit = (values) => {
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowAssignMode(false);
    setSelectedPatient("");
    onClose();
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      handleClose();
    }
  };

  const handleAssignPatient = () => {
    if (!selectedPatient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a patient.",
      });
      return;
    }
    assignPatientMutation.mutate(selectedPatient);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || assignPatientMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showAssignMode
              ? "Assign Patient to Bed"
              : mode === "create"
              ? "Add New Bed"
              : "Edit Bed"}
          </DialogTitle>
          <DialogDescription>
            {showAssignMode
              ? `Assign a patient to ${bed?.bedNumber || "this bed"}`
              : mode === "create"
              ? "Enter bed details."
              : "Update bed information or assign a patient."}
          </DialogDescription>
        </DialogHeader>

        {showAssignMode ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Bed Details</h4>
              <div className="bg-muted p-3 rounded text-sm space-y-1">
                <p>
                  <span className="font-medium">Bed Number:</span> {bed?.bedNumber}
                </p>
                <p>
                  <span className="font-medium">Ward:</span> {bed?.ward}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {bed?.bedType}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select Patient
              </label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {availablePatients.length > 0 ? (
                    availablePatients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName} ({patient.patientId})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available patients
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAssignMode(false);
                  setSelectedPatient("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPatient}
                disabled={isLoading || !selectedPatient}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Patient
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bedNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bed Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ICU-101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nurseInCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nurse In Charge (Optional)</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nurse" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {nurses.map((n) => (
                              <SelectItem key={n._id} value={n._id}>{n.firstName} {n.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bedType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bed Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="icu">ICU</SelectItem>
                            <SelectItem value="ccu">CCU</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="semi_private">
                              Semi-Private
                            </SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="ventilator">Ventilator</SelectItem>
                            <SelectItem value="pediatric">Pediatric</SelectItem>
                            <SelectItem value="maternity">Maternity</SelectItem>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="cleaning">Cleaning</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="out_of_service">
                              Out of Service
                            </SelectItem>
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
                    name="ward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ward</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Ward A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
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
                  name="pricePerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per Day (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="1000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 101" {...field} />
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="Additional notes..."
                          className="w-full p-2 border rounded"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  {mode === "edit" && bed?.status === "available" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAssignMode(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Patient
                    </Button>
                  )}
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {mode === "create" ? "Add Bed" : "Update Bed"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
