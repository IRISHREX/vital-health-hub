import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useDOBAgeSetting } from "@/hooks/useDOBAgeSetting";
import { DOB_OPTIONS } from "@/lib/dobAgeUtils";
import { toast } from "sonner";

export default function DOBAgeSetting() {
  const { setting, updateDOBAgeSetting } = useDOBAgeSetting();
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState(setting);

  useEffect(() => {
    setLocalSettings(setting);
  }, [setting]);

  const handleOptionChange = (value) => {
    setLocalSettings((prev) => ({
      ...prev,
      option: value,
    }));
  };

  const handleAllowAgeToggle = () => {
    setLocalSettings((prev) => ({
      ...prev,
      allowAgeInput: !prev.allowAgeInput,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateDOBAgeSetting(localSettings);
      toast.success("DOB/Age settings updated successfully");
    } catch (error) {
      console.error("Failed to update DOB/Age settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const optionDescriptions = {
    [DOB_OPTIONS.REQUIRED]: "Date of birth is required for all forms. Users must provide a DOB.",
    [DOB_OPTIONS.OPTIONAL]: "Users can provide either Date of Birth or Age. If age is provided, DOB will be calculated automatically.",
    [DOB_OPTIONS.NONE]: "Do not collect date of birth or age information.",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date of Birth / Age Settings</CardTitle>
        <CardDescription>
          Configure how date of birth and age information is collected across all forms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Option Selection */}
        <div className="space-y-3">
          <Label htmlFor="dob-option" className="text-base font-semibold">
            Collection Method
          </Label>
          <p className="text-sm text-muted-foreground">
            Choose how to handle date of birth / age collection in your system
          </p>

          <Select value={localSettings.option} onValueChange={handleOptionChange} disabled={loading}>
            <SelectTrigger id="dob-option">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DOB_OPTIONS.REQUIRED}>
                <div className="flex flex-col">
                  <span className="font-medium">Required - Date of Birth Only</span>
                  <span className="text-xs text-muted-foreground">Always ask for DOB</span>
                </div>
              </SelectItem>
              <SelectItem value={DOB_OPTIONS.OPTIONAL}>
                <div className="flex flex-col">
                  <span className="font-medium">Optional - DOB or Age</span>
                  <span className="text-xs text-muted-foreground">User can choose between DOB or Age</span>
                </div>
              </SelectItem>
              <SelectItem value={DOB_OPTIONS.NONE}>
                <div className="flex flex-col">
                  <span className="font-medium">None - No Collection</span>
                  <span className="text-xs text-muted-foreground">Don't collect DOB or age</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <AlertCircle className="mb-1 h-4 w-4 inline mr-2" />
            {optionDescriptions[localSettings.option]}
          </div>
        </div>

        {/* Allow Age Input Toggle */}
        {localSettings.option === DOB_OPTIONS.OPTIONAL && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label htmlFor="allow-age" className="text-base font-semibold">
                  Allow Age Input
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, users can enter age instead of date of birth
                </p>
              </div>
              <Switch
                id="allow-age"
                checked={localSettings.allowAgeInput}
                onCheckedChange={handleAllowAgeToggle}
                disabled={loading}
              />
            </div>

            {localSettings.allowAgeInput && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
                <p>
                  ✓ Users can input age, and the system will automatically calculate the date of birth
                  based on the current date.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg border border-muted bg-muted/30 p-4">
          <h4 className="mb-2 font-semibold text-sm">How it works:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              - All forms using date of birth will respect this setting automatically
            </li>
            <li>
              - DOB is calculated from age based on today's date (age in years)
            </li>
            <li>
              - Patient age display will show "X yrs, Y mths" based on the calculated DOB
            </li>
            <li>
              - This setting applies globally across all modules (Patients, Appointments, Lab, etc.)
            </li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2 border-t pt-6">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full gap-2 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
