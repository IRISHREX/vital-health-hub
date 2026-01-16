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
  "location.building": z.string().optional(),
  "location.floor": z.coerce.number().optional(),
  capacity: z.coerce.number().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

interface AddFacilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFacilityDialog({ isOpen, onClose }: AddFacilityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      type: "other",
      description: "",
      "location.building": "",
      "location.floor": 0,
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

  const onSubmit = (values: FacilityFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
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
