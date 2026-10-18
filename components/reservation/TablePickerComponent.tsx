import { useState } from "react";
import { useFloor } from "@/stores/FloorStore";
import { useReservations, formatTime } from "@/stores/ReservationStore";
import { cn } from "@/lib/utils";
import { Reservation } from "@/types/Reservation";

import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export default function TablePickerComponent({
  reservation,
  today,
}: {
  reservation: Reservation;
  today: string;
}) {
  const { tables, zones } = useFloor();
  const { assignTable, tableConflict } = useReservations();
  const [open, setOpen] = useState(false);

  const current = tables.find((t) => t.id === reservation.tableId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              !current && "border-dashed text-amber-700 dark:text-amber-400",
            )}
          />
        }
      >
        {current ? (
          <>
            Table {current.number}
            <span className="text-xs font-normal text-muted-foreground">
              {current.zone}
            </span>
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Assign table
          </>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search tables or areas" />
          <CommandList>
            <CommandEmpty>No tables found.</CommandEmpty>
            {zones.map((zone) => {
              const inZone = tables
                .filter((t) => t.zone === zone)
                .sort((a, b) => a.number - b.number);
              if (inZone.length === 0) return null;
              return (
                <CommandGroup key={zone} heading={zone}>
                  {inZone.map((t) => {
                    if (!t.id) return null;
                    const tooSmall = t.seats < reservation.party;
                    const clash = tableConflict(
                      t.id,
                      reservation.date,
                      reservation.time,
                      reservation.id,
                    );
                    const inUse =
                      reservation.date === today && t.status === "occupied";
                    const isCurrent = t.id === reservation.tableId;
                    const hint = tooSmall
                      ? "Too small"
                      : clash
                        ? `Booked ${formatTime(clash.time)}`
                        : inUse
                          ? "In use now"
                          : "";
                    return (
                      <CommandItem
                        key={t.id}
                        value={`Table ${t.number} ${zone}`}
                        disabled={tooSmall || !!clash}
                        onSelect={() => {
                          if (!t.id) return null;
                          assignTable(reservation.id, t.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            isCurrent ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1">Table {t.number}</span>
                        <span className="text-xs text-muted-foreground">
                          {hint ? `${hint} · ` : ""}
                          {t.seats} seats
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
            {reservation.tableId && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="remove-table"
                    className="justify-center"
                    onSelect={() => {
                      assignTable(reservation.id, null);
                      setOpen(false);
                    }}
                  >
                    Remove table
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
