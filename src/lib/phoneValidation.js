/**
 * Phone number validation utility
 * Validates that phone numbers contain exactly 10 digits
 */

import { z } from "zod";

/**
 * Regex pattern for phone validation
 * Extracts only digits and validates length
 */
export const phoneRegex = /^[0-9\s\-\+()]*$/;

/**
 * Zod schema for phone validation
 * Validates that phone contains exactly 10 digits
 */
export const phoneSchema = z.string()
  .refine(
    (val) => {
      const digitsOnly = val.replace(/\D/g, "");
      return digitsOnly.length === 10;
    },
    { message: "Phone number must contain exactly 10 digits" }
  );

/**
 * Extract only digits from phone number
 */
export const extractDigits = (phone) => {
  return phone.replace(/\D/g, "");
};

/**
 * Validate phone number has exactly 10 digits
 */
export const isValidPhone = (phone) => {
  const digits = extractDigits(phone);
  return digits.length === 10;
};

/**
 * Format phone number for display
 * Converts 10 digits to format: +91 XXXXX XXXXX
 */
export const formatPhoneDisplay = (phone) => {
  const digits = extractDigits(phone);
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};
