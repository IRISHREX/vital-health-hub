import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import {
  calculateAge,
  calculateDOBFromAge,
  formatDOB,
  getAgeDisplay,
  validateDOB,
  validateAge,
} from "@/lib/dobAgeUtils";

/**
 * Reusable DOB/Age Picker with combined date input + Year/Month/Day fields.
 * The Y/M/D inputs are always shown and stay in sync with the date picker.
 */
export default function DOBAgePicker({
  value = null,
  onChange = () => {},
  mode = "required",
  required = false,
  disabled = false,
  error = "",
  label = "Date of Birth",
  showAge = true,
}) {
  const [dobValue, setDobValue] = useState(value || "");
  const [ageValue, setAgeValue] = useState("");
  const [dobError, setDobError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [activeTab, setActiveTab] = useState("dob");

  useEffect(() => {
    if (value) {
      setDobValue(value);
      const age = calculateAge(value);
      setAgeValue(age != null ? String(age) : "");
    } else {
      setDobValue("");
      setAgeValue("");
    }
  }, [value]);

  const parts = useMemo(() => {
    if (!dobValue) return { y: "", m: "", d: "" };
    const [y, m, d] = dobValue.split("-");
    return { y: y || "", m: m || "", d: d || "" };
  }, [dobValue]);

  const commit = (iso) => {
    setDobValue(iso || "");
    if (iso) {
      const age = calculateAge(iso);
      setAgeValue(age != null ? String(age) : "");
      onChange(iso);
    } else {
      setAgeValue("");
      onChange(null);
    }
  };

  const handleDobChange = (e) => {
    const val = e.target.value;
    setDobError("");
    if (!val) return commit(null);
    const v = validateDOB(val);
    if (!v.isValid) { setDobValue(val); setDobError(v.error); return; }
    commit(val);
  };

  const handleAgeChange = (e) => {
    const val = e.target.value;
    setAgeValue(val);
    setAgeError("");
    if (!val) return commit(null);
    const v = validateAge(val);
    if (!v.isValid) { setAgeError(v.error); return; }
    commit(calculateDOBFromAge(val));
  };

  const handlePartChange = (key, raw) => {
    const next = { ...parts, [key]: raw.replace(/\D/g, "") };
    if (!next.y && !next.m && !next.d) return commit(null);
    const y = next.y.padStart(4, "0");
    const m = String(Math.min(12, Math.max(1, Number(next.m) || 1))).padStart(2, "0");
    const dMax = new Date(Number(y), Number(m), 0).getDate();
    const d = String(Math.min(dMax, Math.max(1, Number(next.d) || 1))).padStart(2, "0");
    if (next.y.length < 4) {
      setDobValue(`${next.y}-${next.m}-${next.d}`);
      return;
    }
    const iso = `${y}-${m}-${d}`;
    const v = validateDOB(iso);
    setDobError(v.isValid ? "" : v.error);
    if (v.isValid) commit(iso);
    else setDobValue(iso);
  };

  const displayError = error || dobError || ageError;
  if (mode === "none") return null;

  const ymdInputs = (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label className="text-xs text-muted-foreground">Year</Label>
        <Input type="number" placeholder="YYYY" min="1900" max={new Date().getFullYear()}
          value={parts.y} disabled={disabled}
          onChange={(e) => handlePartChange("y", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Month</Label>
        <Input type="number" placeholder="MM" min="1" max="12"
          value={parts.m} disabled={disabled}
          onChange={(e) => handlePartChange("m", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Day</Label>
        <Input type="number" placeholder="DD" min="1" max="31"
          value={parts.d} disabled={disabled}
          onChange={(e) => handlePartChange("d", e.target.value)} />
      </div>
    </div>
  );

  const dobBlock = (
    <div className="space-y-2">
      <Input
        type="date"
        value={dobValue}
        onChange={handleDobChange}
        disabled={disabled}
        className={dobError ? "border-destructive focus-visible:ring-destructive/20" : ""}
        max={new Date().toISOString().split("T")[0]}
      />
      {showAge && dobValue && !dobError && (
        <div className="text-sm text-muted-foreground">Age: {getAgeDisplay(dobValue)}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-xs text-muted-foreground">(optional)</span>
        )}
      </div>

      {mode === "required" ? dobBlock : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dob">Date of Birth</TabsTrigger>
            <TabsTrigger value="age">Age</TabsTrigger>
          </TabsList>
          <TabsContent value="dob" className="space-y-2">{dobBlock}</TabsContent>
          <TabsContent value="age" className="space-y-2">
            <Input type="number" min="0" max="150" placeholder="Enter age in years"
              value={ageValue} disabled={disabled}
              onChange={handleAgeChange}
              className={ageError ? "border-destructive focus-visible:ring-destructive/20" : ""} />
            {showAge && dobValue && (
              <div className="text-sm text-muted-foreground">DOB: {formatDOB(dobValue)}</div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {displayError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {displayError}
        </div>
      )}
    </div>
  );
}
