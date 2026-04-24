import { useEffect, useState } from "react";
import EntityAutocomplete from "./EntityAutocomplete";
import { getDoctors } from "@/lib/doctors";

const doctorName = (d) => {
  if (!d) return "Doctor";
  return (
    d.name ||
    `${d?.user?.firstName || ""} ${d?.user?.lastName || ""}`.trim() ||
    "Doctor"
  );
};

const buildLabel = (d) => `Dr. ${doctorName(d)}`;
const buildSubLabel = (d) => {
  const parts = [];
  if (d?.specialization) parts.push(d.specialization);
  if (d?.department) parts.push(d.department);
  if (d?.availabilityStatus) parts.push(d.availabilityStatus);
  return parts.join(" · ");
};

/**
 * Doctor picker with type-ahead. The doctors API returns the full list,
 * so we cache it once and filter client-side per keystroke.
 *
 * Props: value, selectedLabel, onSelect(doctor), filterFn, placeholder, disabled
 */
export default function DoctorAutocomplete({
  value,
  selectedLabel,
  onSelect,
  filterFn,
  placeholder = "Search doctor by name or specialization...",
  disabled = false,
  allowFreeText = false,
  ...props
}) {
  const [cache, setCache] = useState(null);

  useEffect(() => {
    let mounted = true;
    getDoctors()
      .then((res) => {
        const list = res?.data?.doctors || res?.doctors || [];
        if (mounted) setCache(list);
      })
      .catch(() => mounted && setCache([]));
    return () => {
      mounted = false;
    };
  }, []);

  const fetcher = async (query) => {
    const list = cache || [];
    const q = query.toLowerCase();
    return list
      .filter((d) => {
        const name = doctorName(d).toLowerCase();
        const spec = String(d?.specialization || "").toLowerCase();
        const dept = String(d?.department || "").toLowerCase();
        return name.includes(q) || spec.includes(q) || dept.includes(q);
      })
      .filter((d) => (filterFn ? filterFn(d) : true))
      .slice(0, 15);
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
      emptyMessage="No matching doctor found."
      {...props}
    />
  );
}

export { doctorName, buildLabel as doctorAutocompleteLabel };
