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
import { isValidPhone } from "@/lib/phoneValidation";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { getValidationInputClass } from "@/lib/validationPreferences";

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
  const { shouldShowValidation } = useValidationPreferences();
  const isEdit = mode === "edit" && !!nurse?._id;
  const formId = "nurse_dialog";
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    role: "nurse",
  });
  const [errors, setErrors] = useState({});
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
    setErrors({});
  }, [isOpen, isEdit, nurse]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "phone") {
      setErrors((prev) => ({
        ...prev,
        phone: value.trim() && !isValidPhone(value) ? "Phone number must contain exactly 10 digits" : "",
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) nextErrors.lastName = "Last name is required";
    if (!formData.email.trim()) nextErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) nextErrors.email = "Valid email required";
    if (!isEdit && !formData.password.trim()) nextErrors.password = "Password is required";
    if (formData.phone && !isValidPhone(formData.phone)) {
      nextErrors.phone = "Phone number must contain exactly 10 digits";
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    
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
                className={`mt-2 ${getValidationInputClass(shouldShowValidation(formId, "firstName"), errors.firstName)}`}
              />
              {shouldShowValidation(formId, "firstName") && errors.firstName && <p className="mt-1 text-sm text-destructive">{errors.firstName}</p>}
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
                className={`mt-2 ${getValidationInputClass(shouldShowValidation(formId, "lastName"), errors.lastName)}`}
              />
              {shouldShowValidation(formId, "lastName") && errors.lastName && <p className="mt-1 text-sm text-destructive">{errors.lastName}</p>}
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
                className={`mt-2 ${getValidationInputClass(shouldShowValidation(formId, "email"), errors.email)}`}
                disabled={isEdit}
              />
              {shouldShowValidation(formId, "email") && errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
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
                  className={`mt-2 ${getValidationInputClass(shouldShowValidation(formId, "password"), errors.password)}`}
                />
                {shouldShowValidation(formId, "password") && errors.password && <p className="mt-1 text-sm text-destructive">{errors.password}</p>}
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
                placeholder="Enter 10-digit phone number"
                className={`mt-2 ${getValidationInputClass(shouldShowValidation(formId, "phone"), errors.phone)}`}
              />
              {shouldShowValidation(formId, "phone") && errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone}</p>}
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
