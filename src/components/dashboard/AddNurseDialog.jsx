import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/lib/users";

const departments = [
  "Cardiac Care",
  "Respiratory",
  "Surgery",
  "Orthopedics",
  "Neurology",
  "Pediatrics",
  "General Medicine",
];

export default function AddNurseDialog({ isOpen, onClose, onSuccess, nurse = null, mode = "create" }) {
  const { toast } = useToast();
  const isEdit = mode === "edit" && !!nurse?._id;
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    role: "nurse",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit) {
      setFormData({
        firstName: nurse?.firstName || "",
        lastName: nurse?.lastName || "",
        email: nurse?.email || "",
        password: "",
        phone: nurse?.phone || "",
        department: nurse?.department || "",
        role: nurse?.role || "nurse",
      });
      return;
    }
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      department: "",
      role: "nurse",
    });
  }, [isOpen, isEdit, nurse]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          phone: formData.phone,
          department: formData.department,
        };
        await updateUser(nurse._id, payload);
        toast({ title: "Success", description: "Nurse updated successfully." });
      } else {
        await apiClient.post("/auth/register", formData);
        toast({ title: "Success", description: "Nurse created successfully." });
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || (isEdit ? "Failed to update nurse." : "Failed to create nurse."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Nurse" : "Add New Nurse"}</DialogTitle>
          <DialogDescription>
            Enter nurse details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-2"
                required
                disabled={isEdit}
              />
            </div>
            {!isEdit && (
              <div>
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="department" className="text-sm font-medium">
                Department
              </Label>
              <Select
                onValueChange={(value) => handleSelectChange("department", value)}
                defaultValue={formData.department}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div>
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <Select
                onValueChange={(value) => handleSelectChange("role", value)}
                defaultValue={formData.role}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="head_nurse">Head Nurse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Nurse")}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
