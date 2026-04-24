import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidPhone } from "@/lib/phoneValidation";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { getValidationInputClass } from "@/lib/validationPreferences";

export default function ExternalPatientForm({ data, onChange, errors = {}, formId }) {
  const [phoneError, setPhoneError] = useState("");
  const { shouldShowValidation } = useValidationPreferences();
  
  const update = (field, value) => onChange({ ...data, [field]: value });
  const showNameValidation = shouldShowValidation(formId, "externalPatient.name");
  const showPhoneValidation = shouldShowValidation(formId, "externalPatient.phone");
  const resolvedPhoneError = phoneError || errors["externalPatient.phone"];
  
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    update("phone", value);
    
    // Validate phone number
    if (value.trim() === "") {
      setPhoneError("");
    } else if (!isValidPhone(value)) {
      setPhoneError("Phone number must contain exactly 10 digits");
    } else {
      setPhoneError("");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-primary">External / Walk-in Patient Details</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Patient Name *</Label>
          <Input
            placeholder="Full name"
            value={data.name || ""}
            onChange={(e) => update("name", e.target.value)}
            className={getValidationInputClass(showNameValidation, errors["externalPatient.name"])}
          />
          {showNameValidation && errors["externalPatient.name"] && (
            <p className="text-xs text-destructive mt-0.5">{errors["externalPatient.name"]}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            placeholder="Enter 10-digit phone number"
            value={data.phone || ""}
            onChange={handlePhoneChange}
            className={getValidationInputClass(showPhoneValidation, resolvedPhoneError)}
          />
          {showPhoneValidation && resolvedPhoneError && (
            <p className="text-xs text-destructive mt-0.5">{resolvedPhoneError}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Age</Label>
          <Input
            type="number"
            placeholder="e.g. 35"
            value={data.age || ""}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow non-negative integers
              if (value === "" || /^\d+$/.test(value)) {
                update("age", value);
              }
            }}
            min="0"
            max="150"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <Select value={data.gender || ""} onValueChange={(v) => update("gender", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Referred By</Label>
          <Input
            placeholder="Dr. / Hospital"
            value={data.referredBy || ""}
            onChange={(e) => update("referredBy", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address</Label>
        <Input
          placeholder="Address"
          value={data.address || ""}
          onChange={(e) => update("address", e.target.value)}
        />
      </div>
    </div>
  );
}
