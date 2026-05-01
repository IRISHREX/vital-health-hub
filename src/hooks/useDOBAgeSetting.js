import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { DOB_OPTIONS, getDefaultDOBAgeSetting } from "@/lib/dobAgeUtils";

/**
 * Hook to access DOB/Age settings from validation preferences
 * Returns the configured setting for how to handle DOB/Age collection
 */
export const useDOBAgeSetting = () => {
  const { preferences, savePreferences } = useValidationPreferences();

  // Get the DOB/Age setting from preferences
  const setting = preferences?.dobAgeSetting || getDefaultDOBAgeSetting();

  const updateDOBAgeSetting = async (newSetting) => {
    const updated = {
      ...preferences,
      dobAgeSetting: { ...setting, ...newSetting },
    };
    return savePreferences(updated);
  };

  return {
    setting,
    updateDOBAgeSetting,
    mode: setting.option || DOB_OPTIONS.REQUIRED,
    allowAgeInput: setting.allowAgeInput !== false,
  };
};

/**
 * Determine which input mode to show for a form
 * Checks if a specific form requires DOB or allows age alternative
 */
export const useDOBMode = (formId = null) => {
  const { preferences } = useValidationPreferences();
  
  // Check if DOB field is visible in the form
  const formConfig = preferences?.forms?.[formId];
  const isDobRequired = formConfig?.fields?.dateOfBirth !== false;
  
  // Get global DOB setting
  const setting = preferences?.dobAgeSetting || getDefaultDOBAgeSetting();
  
  // Determine mode
  let mode = setting.option || DOB_OPTIONS.REQUIRED;
  
  // If DOB is not enabled in form validation, skip DOB collection
  if (formId && formConfig && !isDobRequired) {
    mode = DOB_OPTIONS.NONE;
  }
  
  return mode;
};
