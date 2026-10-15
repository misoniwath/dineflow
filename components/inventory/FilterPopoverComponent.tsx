import { FilterOption } from "@/types/Inventory";

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
  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );

  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed" />
        }
      >
        <Plus className="size-4" />
        {title}
        {selected.length > 0 && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            {selected.length <= 2 ? (
              selectedLabels.map((l) => (
                <Badge
                  key={l}
                  variant="secondary"
                  className="rounded-sm px-1.5 font-normal"
                >
                  {l}
                </Badge>
              ))
            ) : (
              <Badge
                variant="secondary"
                className="rounded-sm px-1.5 font-normal"
              >
                {selected.length} selected
              </Badge>
            )}
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
                const isOn = selected.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    // cmdk filters on `value`, so use the visible label
                    value={o.label}
                    onSelect={() => toggle(o.value)}
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
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {o.count}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
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
