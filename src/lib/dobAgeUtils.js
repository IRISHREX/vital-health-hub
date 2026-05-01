/**
 * Utility functions for Date of Birth and Age calculations
 */

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - ISO string or Date object
 * @returns {number} Age in years
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

/**
 * Calculate date of birth from age
 * @param {number} age - Age in years
 * @returns {string} ISO date string (YYYY-MM-DD format)
 */
export const calculateDOBFromAge = (age) => {
  if (age === null || age === undefined || age === "") return null;
  const today = new Date();
  const dob = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  return dob.toISOString().split("T")[0];
};

/**
 * Format date of birth to display format (DD/MM/YYYY)
 * @param {string|Date} dateOfBirth - ISO string or Date object
 * @returns {string} Formatted date string
 */
export const formatDOB = (dateOfBirth) => {
  if (!dateOfBirth) return "";
  const date = new Date(dateOfBirth);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Convert display format (DD/MM/YYYY) to ISO format
 * @param {string} displayDate - Date in DD/MM/YYYY format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export const displayDateToDOB = (displayDate) => {
  if (!displayDate) return null;
  const [day, month, year] = displayDate.split("/").map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const date = new Date(year, month - 1, day);
  return date.toISOString().split("T")[0];
};

/**
 * Get age display string with years and months
 * @param {string|Date} dateOfBirth - ISO string or Date object
 * @returns {string} Display string like "25 yrs, 3 mths"
 */
export const getAgeDisplay = (dateOfBirth) => {
  if (!dateOfBirth) return "";
  const dob = new Date(dateOfBirth);
  const today = new Date();
  
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (today.getDate() < dob.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  const parts = [];
  if (years > 0) parts.push(`${years} yrs`);
  if (months > 0) parts.push(`${months} mths`);
  
  return parts.length > 0 ? parts.join(", ") : "0 mths";
};

/**
 * Validate DOB (must be in past and not today)
 * @param {string|Date} dateOfBirth - ISO string or Date object
 * @returns {object} { isValid: boolean, error?: string }
 */
export const validateDOB = (dateOfBirth) => {
  if (!dateOfBirth) {
    return { isValid: false, error: "Date of birth is required" };
  }
  
  const dob = new Date(dateOfBirth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dob >= today) {
    return { isValid: false, error: "Date of birth cannot be today or in the future" };
  }
  
  const age = calculateAge(dateOfBirth);
  if (age > 150) {
    return { isValid: false, error: "Age cannot be greater than 150 years" };
  }
  
  return { isValid: true };
};

/**
 * Validate age (must be positive and reasonable)
 * @param {number} age - Age in years
 * @returns {object} { isValid: boolean, error?: string }
 */
export const validateAge = (age) => {
  if (age === null || age === undefined || age === "") {
    return { isValid: false, error: "Age is required" };
  }
  
  const ageNum = Number(age);
  
  if (isNaN(ageNum)) {
    return { isValid: false, error: "Age must be a number" };
  }
  
  if (ageNum < 0) {
    return { isValid: false, error: "Age cannot be negative" };
  }
  
  if (ageNum > 150) {
    return { isValid: false, error: "Age cannot be greater than 150 years" };
  }
  
  return { isValid: true };
};

/**
 * Get DOB configuration option
 * Options: 'required' (must ask for DOB), 'optional' (ask for DOB or age), 'none' (no DOB/age)
 */
export const DOB_OPTIONS = {
  REQUIRED: "required",      // Always ask for DOB
  OPTIONAL: "optional",      // Ask for DOB or Age (calculate DOB from Age)
  NONE: "none",              // Don't collect DOB/age
};

/**
 * Get default DOB/Age setting
 */
export const getDefaultDOBAgeSetting = () => ({
  option: DOB_OPTIONS.REQUIRED,  // 'required' | 'optional' | 'none'
  allowAgeInput: true,            // Allow age input when option is 'optional'
  dateFormat: "YYYY-MM-DD",       // Format for display
});
