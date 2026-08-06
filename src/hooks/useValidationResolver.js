import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { isValidationUIVisible } from "@/lib/validationPreferences";

/** Pure: delete a (possibly nested) path from a react-hook-form errors object. */
export const dropErrorPath = (errors, path) => {
  const segments = String(path).split(".");
  let cursor = errors;
  for (let i = 0; i < segments.length - 1; i += 1) {
    cursor = cursor?.[segments[i]];
    if (!cursor || typeof cursor !== "object") return errors;
  }
  delete cursor[segments[segments.length - 1]];
  return errors;
};

/** Pure: flatten error paths ("emergencyContact.phone") from an errors tree. */
export const collectErrorPaths = (errors, prefix = "") => {
  if (!errors || typeof errors !== "object") return [];
  return Object.entries(errors).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !("message" in value) && !("type" in value)) {
      return collectErrorPaths(value, path);
    }
    return [path];
  });
};

/**
 * Zod resolver that honours the tenant's Validation UI settings: fields (or whole
 * forms) with validation switched off no longer block submission.
 */
export const useValidationResolver = (schema, formId) => {
  const { preferences } = useValidationPreferences();

  return useCallback(
    async (values, context, options) => {
      const result = await zodResolver(schema)(values, context, options);
      if (!result?.errors || Object.keys(result.errors).length === 0) return result;

      const errors = result.errors;
      collectErrorPaths(errors).forEach((path) => {
        if (!isValidationUIVisible(preferences, formId, path)) {
          dropErrorPath(errors, path);
        }
      });

      return { values: Object.keys(errors).length === 0 ? values : result.values, errors };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema, formId, preferences],
  );
};

export default useValidationResolver;
