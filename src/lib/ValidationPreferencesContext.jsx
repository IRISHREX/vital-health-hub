import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getUserPreferences, updateUserPreferences } from "@/lib/settings";
import { useAuth } from "@/lib/AuthContext";
import {
  createDefaultValidationPreferences,
  isValidationUIVisible,
  normalizeValidationPreferences,
} from "@/lib/validationPreferences";

const STORAGE_KEY = "validation-preferences";

const ValidationPreferencesContext = createContext(undefined);

const readStoredPreferences = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeValidationPreferences(raw ? JSON.parse(raw) : undefined);
  } catch {
    return createDefaultValidationPreferences();
  }
};

export function ValidationPreferencesProvider({ children }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(readStoredPreferences);
  const [isLoading, setIsLoading] = useState(true);

  const persistLocal = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!user?._id) {
      const fallback = readStoredPreferences();
      setPreferences(fallback);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }

    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await getUserPreferences();
        const next = normalizeValidationPreferences(response?.data?.validationPreferences);
        if (!mounted) return;
        setPreferences(next);
        persistLocal(next);
      } catch (error) {
        console.error("Failed to load validation preferences:", error);
        if (!mounted) return;
        setPreferences(readStoredPreferences());
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, [persistLocal, user?._id]);

  const savePreferences = useCallback(
    async (nextPreferences) => {
      const normalized = normalizeValidationPreferences(nextPreferences);
      setPreferences(normalized);
      persistLocal(normalized);
      await updateUserPreferences({ validationPreferences: normalized });
      return normalized;
    },
    [persistLocal],
  );

  const shouldShowValidation = useCallback(
    (formId, fieldName) => isValidationUIVisible(preferences, formId, fieldName),
    [preferences],
  );

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      savePreferences,
      shouldShowValidation,
    }),
    [preferences, isLoading, savePreferences, shouldShowValidation],
  );

  return (
    <ValidationPreferencesContext.Provider value={value}>
      {children}
    </ValidationPreferencesContext.Provider>
  );
}

export function useValidationPreferences() {
  const context = useContext(ValidationPreferencesContext);
  if (!context) {
    throw new Error("useValidationPreferences must be used within a ValidationPreferencesProvider");
  }
  return context;
}
