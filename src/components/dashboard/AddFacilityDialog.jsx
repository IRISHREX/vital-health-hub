import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFacility } from "@/lib/facilities";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  type: z.enum(['icu', 'lab', 'ot', 'pharmacy', 'radiology', 'ambulance', 'blood_bank', 'dialysis', 'physiotherapy', 'other']),
  description: z.string().optional(),
  building: z.string().optional(),
  floor: z.coerce.number().optional(),
  capacity: z.coerce.number().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
});

export default function AddFacilityDialog({ isOpen, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      type: "other",
      description: "",
      building: "",
      floor: 0,
      capacity: 0,
      contactNumber: "",
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createFacility,
    onSuccess: () => {
      toast({
        title: "Facility Created",
        description: "The new facility has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create facility.",
      });
    },
  });

  const onSubmit = (values) => {
    const facilityData = {
      name: values.name,
      type: values.type,
      description: values.description || "",
      location: {
        building: values.building || "",
        floor: values.floor || 0
      },
      capacity: values.capacity || 0,
      contactNumber: values.contactNumber || "",
      email: values.email || "",
    };
    mutation.mutate(facilityData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Facility</DialogTitle>
          <DialogDescription>
            Enter the details for the new facility.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., General Ward" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a facility type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="icu">ICU</SelectItem>
                      <SelectItem value="lab">Laboratory</SelectItem>
                      <SelectItem value="ot">Operating Theater</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="radiology">Radiology</SelectItem>
                      <SelectItem value="ambulance">Ambulance</SelectItem>
                      <SelectItem value="blood_bank">Blood Bank</SelectItem>
                      <SelectItem value="dialysis">Dialysis</SelectItem>
                      <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., For non-critical patients" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="building"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Building" {...field} />
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
                      <Input type="number" placeholder="e.g., 3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +91 98765 43210" {...field} />
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
                      <Input type="email" placeholder="facility@hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Facility
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
