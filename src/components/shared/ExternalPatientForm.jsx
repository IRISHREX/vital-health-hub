import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExternalPatientForm({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

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
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            placeholder="Phone number"
            value={data.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Age</Label>
          <Input
            placeholder="e.g. 35 Years"
            value={data.age || ""}
            onChange={(e) => update("age", e.target.value)}
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
