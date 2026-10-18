import { FilterOption } from "@/types/User";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, Plus } from "lucide-react";

export default function FilterPopoverComponent({
  title,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}) {
  const selectedValue = selected[0];

  const selectOne = (value: string) =>
    onChange(selectedValue === value ? [] : [value]);

  const selectedLabel = options.find((o) => o.value === selectedValue)?.label;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed" />
        }
      >
        <Plus className="size-4" />
        {title}
        {selectedValue && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <Badge
              variant="secondary"
              className="rounded-sm px-1.5 font-normal"
            >
              {selectedLabel}
            </Badge>
          </>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          {searchable && (
            <CommandInput placeholder={`Search ${title.toLowerCase()}`} />
          )}
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isOn = selectedValue === o.value;
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => selectOne(o.value)}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                        isOn
                          ? "border-primary bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    {o.dot && (
                      <span
                        className={cn("size-2 shrink-0 rounded-full", o.dot)}
                      />
                    )}
                    <span className="flex-1 truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValue && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="clear-filter"
                    onSelect={() => onChange([])}
                    className="justify-center text-center"
                  >
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
