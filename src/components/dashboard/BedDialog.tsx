import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBed, updateBed } from "@/lib/beds";
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
import { Loader2 } from "lucide-react";

const bedTypes = [
  "ICU",
  "CCU",
  "General",
  "Semi-Private",
  "Private",
  "Emergency",
  "Ventilator",
];

const bedSchema = z.object({
  bedNumber: z.string().min(1, "Bed number is required").max(20),
  bedType: z.string().min(1, "Bed type is required"),
  ward: z.string().min(1, "Ward is required").max(50),
  floor: z.coerce.number().min(0, "Floor must be 0 or higher"),
  status: z.enum(["available", "occupied", "cleaning", "reserved"]),
  dailyRate: z.coerce.number().min(0, "Rate must be positive"),
});

type BedFormValues = z.infer<typeof bedSchema>;

interface BedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bed?: any;
  mode: "create" | "edit";
}

export default function BedDialog({ isOpen, onClose, bed, mode }: BedDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BedFormValues>({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      bedNumber: "",
      bedType: "General",
      ward: "",
      floor: 0,
      status: "available",
      dailyRate: 1000,
    },
  });

  useEffect(() => {
    if (bed && mode === "edit") {
      form.reset({
        bedNumber: bed.bedNumber || "",
        bedType: bed.bedType || "General",
        ward: bed.ward || "",
        floor: bed.floor || 0,
        status: bed.status || "available",
        dailyRate: bed.dailyRate || 1000,
      });
    } else {
      form.reset({
        bedNumber: "",
        bedType: "General",
        ward: "",
        floor: 0,
        status: "available",
        dailyRate: 1000,
      });
    }
  }, [bed, mode, form]);

  const createMutation = useMutation({
    mutationFn: createBed,
    onSuccess: () => {
      toast({ title: "Success", description: "Bed added successfully." });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to add bed." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BedFormValues) => updateBed(bed._id, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Bed updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update bed." });
    },
  });

  const onSubmit = (values: BedFormValues) => {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Bed" : "Edit Bed"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Enter bed details." : "Update bed information."}
          </DialogDescription>
        </DialogHeader>
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
                        {bedTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
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
              name="dailyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Rate (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
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
                {mode === "create" ? "Add Bed" : "Update Bed"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}