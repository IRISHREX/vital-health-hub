import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { isValidationUIVisible, isFieldRequiredByPreferences, validationFormRegistry } from "@/lib/validationPreferences";

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

/** Pure: set an error at a (possibly nested) path on a react-hook-form errors object. */
export const setErrorPath = (errors, path, error) => {
  const segments = String(path).split(".");
  let cursor = errors;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!cursor[segment] || typeof cursor[segment] !== "object") {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  const lastSegment = segments[segments.length - 1];
  if (!cursor[lastSegment]) {
    cursor[lastSegment] = error;
  }
  return errors;
};

/** Pure: read a (possibly nested) value from an object by dot-path. */
export const getValueAtPath = (values, path) => {
  const segments = String(path).split(".");
  let cursor = values;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
};

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
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

const fieldLabelsByFormId = validationFormRegistry.reduce((acc, form) => {
  acc[form.id] = form.fields.reduce((fieldAcc, field) => {
    fieldAcc[field.key] = field.label;
    return fieldAcc;
  }, {});
  return acc;
}, {});

/**
 * Zod resolver that honours the tenant's Validation UI settings:
 *  - fields (or whole forms) with validation switched off no longer block submission.
 *  - fields explicitly marked "required" in the Validation UI settings become
 *    mandatory (even though the underlying zod schema treats them as optional),
 *    blocking submission when left empty.
 *
 * This is generic across every form registered in validationFormRegistry.
 */
export const useValidationResolver = (schema, formId) => {
  const { preferences } = useValidationPreferences();

  return useCallback(
    async (values, context, options) => {
      const result = await zodResolver(schema)(values, context, options);
      const errors = result?.errors ? { ...result.errors } : {};

      // Drop errors for fields whose validation UI is hidden by preferences.
      collectErrorPaths(errors).forEach((path) => {
        if (!isValidationUIVisible(preferences, formId, path)) {
          dropErrorPath(errors, path);
        }
      });

      // Inject "required" errors for fields marked mandatory via preferences,
      // regardless of whether the zod schema itself treats them as optional.
      const fieldLabels = fieldLabelsByFormId[formId] || {};
      Object.keys(fieldLabels).forEach((fieldPath) => {
        if (!isFieldRequiredByPreferences(preferences, formId, fieldPath)) return;
        const value = getValueAtPath(values, fieldPath);
        if (!isEmptyValue(value)) return;

        const label = fieldLabels[fieldPath] || fieldPath;
        setErrorPath(errors, fieldPath, { type: "required", message: `${label} is required` });
      });

      const hasErrors = Object.keys(errors).length > 0;
      return { values: hasErrors ? (result?.values ?? {}) : (result?.values ?? values), errors };
    },
    [schema, formId, preferences],
  );
};

export default useValidationResolver;
