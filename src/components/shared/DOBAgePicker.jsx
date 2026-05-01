import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import {
  calculateAge,
  calculateDOBFromAge,
  formatDOB,
  displayDateToDOB,
  getAgeDisplay,
  validateDOB,
  validateAge,
  DOB_OPTIONS,
} from "@/lib/dobAgeUtils";

/**
 * Reusable DOB/Age Picker Component
 * Supports three modes: DOB required, DOB optional (with age alternative), or no collection
 */
export default function DOBAgePicker({
  value = null,           // ISO date string (YYYY-MM-DD) or null
  onChange = () => {},    // Callback: onChange(isoDateString)
  mode = "required",      // 'required' | 'optional' | 'none'
  required = false,       // Whether field is required
  disabled = false,       // Whether field is disabled
  error = "",             // Error message
  label = "Date of Birth",
  showAge = true,         // Show calculated age display
}) {
  const [dobValue, setDobValue] = useState(value || "");
  const [ageValue, setAgeValue] = useState("");
  const [dobError, setDobError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [activeTab, setActiveTab] = useState("dob");

  // Calculate age from DOB when component mounts or value changes
  useEffect(() => {
    if (value) {
      setDobValue(value);
      const age = calculateAge(value);
      setAgeValue(age ? String(age) : "");
    }
  }, [value]);

  const handleDobChange = (e) => {
    const val = e.target.value;
    setDobValue(val);
    setDobError("");

    if (val) {
      const validation = validateDOB(val);
      if (!validation.isValid) {
        setDobError(validation.error);
      } else {
        const age = calculateAge(val);
        setAgeValue(String(age));
        onChange(val);
      }
    } else {
      setAgeValue("");
      onChange(null);
    }
  };

  const handleAgeChange = (e) => {
    const val = e.target.value;
    setAgeValue(val);
    setAgeError("");

    if (val) {
      const validation = validateAge(val);
      if (!validation.isValid) {
        setAgeError(validation.error);
      } else {
        const dob = calculateDOBFromAge(val);
        setDobValue(dob);
        onChange(dob);
      }
    } else {
      setDobValue("");
      onChange(null);
    }
  };

  const displayError = error || dobError || ageError;

  if (mode === "none") {
    return null;
  }

  return (
    <div className="space-y-3">
      {mode === "required" ? (
        // DOB Required - Simple input
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="dob-input">{label}</Label>
            {required && <span className="text-destructive">*</span>}
          </div>
          <Input
            id="dob-input"
            type="date"
            value={dobValue}
            onChange={handleDobChange}
            disabled={disabled}
            className={displayError ? "border-destructive focus-visible:ring-destructive/20" : ""}
            max={new Date().toISOString().split("T")[0]}
          />
          {showAge && dobValue && (
            <div className="text-sm text-muted-foreground">
              Age: {getAgeDisplay(dobValue)}
            </div>
          )}
          {displayError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {displayError}
            </div>
          )}
        </div>
      ) : mode === "optional" ? (
        // Optional - Tabs for DOB or Age
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{label}</Label>
            {required && <span className="text-destructive">*</span>}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dob">Date of Birth</TabsTrigger>
              <TabsTrigger value="age">Age</TabsTrigger>
            </TabsList>

            <TabsContent value="dob" className="space-y-2">
              <Input
                type="date"
                value={dobValue}
                onChange={handleDobChange}
                disabled={disabled}
                className={dobError ? "border-destructive focus-visible:ring-destructive/20" : ""}
                max={new Date().toISOString().split("T")[0]}
                placeholder="Select date of birth"
              />
              {showAge && dobValue && (
                <div className="text-sm text-muted-foreground">
                  Age: {getAgeDisplay(dobValue)}
                </div>
              )}
              {dobError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {dobError}
                </div>
              )}
            </TabsContent>

            <TabsContent value="age" className="space-y-2">
              <Input
                type="number"
                value={ageValue}
                onChange={handleAgeChange}
                disabled={disabled}
                className={ageError ? "border-destructive focus-visible:ring-destructive/20" : ""}
                placeholder="Enter age in years"
                min="0"
                max="150"
              />
              {showAge && dobValue && (
                <div className="text-sm text-muted-foreground">
                  DOB: {formatDOB(dobValue)}
                </div>
              )}
              {ageError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {ageError}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {displayError && activeTab && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {displayError}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
