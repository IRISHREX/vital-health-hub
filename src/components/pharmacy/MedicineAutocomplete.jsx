import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function MedicineAutocomplete({ medicines = [], value, onChange, placeholder = "Select medicine" }) {
  const [open, setOpen] = useState(false);

  const selectedMedicine = useMemo(
    () => medicines.find((m) => m._id === value),
    [medicines, value]
  );

  const getMedicineLabel = (medicine) => {
    if (!medicine) return "";
    const detail = medicine.composition || medicine.genericName || medicine.category;
    return detail ? `${medicine.name} (${detail})` : medicine.name;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedMedicine ? getMedicineLabel(selectedMedicine) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search medicine..." />
          <CommandList>
            <CommandEmpty>No medicine found.</CommandEmpty>
            <CommandGroup>
              {medicines.map((medicine) => (
                <CommandItem
                  key={medicine._id}
                  value={getMedicineLabel(medicine)}
                  onSelect={() => {
                    onChange(medicine._id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${value === medicine._id ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="truncate">{getMedicineLabel(medicine)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
