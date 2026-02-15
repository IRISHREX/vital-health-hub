import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVital } from "@/lib/vitals";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const vitalSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  heartRate: z.coerce.number().min(0),
  systolic: z.coerce.number().min(0),
  diastolic: z.coerce.number().min(0),
  temperature: z.coerce.number().min(0),
  oxygenSaturation: z.coerce.number().min(0).max(100),
  respiratoryRate: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export default function QuickVitalDialog({ isOpen, onClose, patients = [], defaultPatientId = "", onRecorded }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(vitalSchema),
    defaultValues: {
      patientId: "",
      heartRate: 80,
      systolic: 120,
      diastolic: 80,
      temperature: 98.6,
      oxygenSaturation: 98,
      respiratoryRate: 16,
      notes: "",
    },
  });

  useEffect(() => {
    if (patients.length === 1) {
      form.setValue('patientId', patients[0]._id);
    }
  }, [patients]);

  useEffect(() => {
    if (defaultPatientId) {
      form.setValue('patientId', defaultPatientId);
    }
  }, [defaultPatientId, form]);

  const createMutation = useMutation({
    mutationFn: (data) => createVital(data),
    onSuccess: (res) => {
      toast({ title: 'Success', description: 'Vital recorded' });
      // invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      if (onRecorded) onRecorded(res);
      handleClose();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to record vital' });
    },
  });

  const onSubmit = (values) => {
    const payload = {
      patientId: values.patientId,
      heartRate: values.heartRate,
      bloodPressure: `${values.systolic}/${values.diastolic}`,
      temperature: values.temperature,
      oxygenSaturation: values.oxygenSaturation,
      respiratoryRate: values.respiratoryRate,
      notes: values.notes,
    };
    createMutation.mutate(payload);
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

  const isLoading = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Record Vital</DialogTitle>
          <DialogDescription>Record vitals quickly for a patient</DialogDescription>
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
                      {patients.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName} - {p.patientId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="heartRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Heart Rate (bpm)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="systolic" render={({ field }) => (
                <FormItem>
                  <FormLabel>Systolic (mmHg)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="diastolic" render={({ field }) => (
                <FormItem>
                  <FormLabel>Diastolic (mmHg)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="temperature" render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature (°F)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="oxygenSaturation" render={({ field }) => (
                <FormItem>
                  <FormLabel>SpO2 (%)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="respiratoryRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Respiratory Rate</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
