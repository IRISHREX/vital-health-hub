import EntityAutocomplete from "./EntityAutocomplete";
import { getPatients } from "@/lib/patients";

const buildLabel = (p) => {
  const name = `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || "Unknown";
  return p?.patientId ? `${name} (${p.patientId})` : name;
};

const buildSubLabel = (p) => {
  const parts = [];
  if (p?.contactNumber || p?.phone) parts.push(p.contactNumber || p.phone);
  if (p?.gender) parts.push(p.gender);
  if (p?.dateOfBirth) {
    const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
    parts.push(`${age} yrs`);
  }
  if (p?.registrationType) parts.push(String(p.registrationType).toUpperCase());
  return parts.join(" · ");
};

const fetchPatients = async (query) => {
  try {
    const params = new URLSearchParams({ search: query, limit: "10" });
    const res = await getPatients(params.toString());
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.patients)) return res.patients;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.patients)) return res.data.patients;
    return [];
  } catch (err) {
    console.error("Failed to fetch patients:", err);
    return [];
  }
};

/**
 * Patient picker with type-ahead search.
 * Props: value, selectedLabel, onSelect(patient), extraParams (object), placeholder, disabled
 */
export default function PatientAutocomplete({
  value,
  selectedLabel,
  onSelect,
  filterFn,
  placeholder = "Search patient by name, phone, or ID...",
  disabled = false,
  allowFreeText = false,
  ...props
}) {
  const fetcher = async (query) => {
    const list = await fetchPatients(query);
    return filterFn ? list.filter(filterFn) : list;
  };
  return (
    <EntityAutocomplete
      value={value}
      selectedLabel={selectedLabel}
      onSelect={onSelect}
      fetcher={fetcher}
      getLabel={buildLabel}
      getSubLabel={buildSubLabel}
      placeholder={placeholder}
      disabled={disabled}
      allowFreeText={allowFreeText}
      emptyMessage="No matching patient found."
      {...props}
    />
  );
}

export { buildLabel as patientLabel };
