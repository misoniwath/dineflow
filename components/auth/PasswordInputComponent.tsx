"use client";
import { useState, useEffect, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  /** Word used in the toggle's accessible name, e.g. "PIN" → "Show PIN". */
  noun?: string;
};

/** Input with a show/hide toggle. Takes every prop an Input does. */
export default function PasswordInputComponent({
  noun = "password",
  className,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="cursor-pointer absolute inset-y-0 right-1 my-auto size-7 text-muted-foreground active:translate-y-0"
        aria-label={show ? `Hide ${noun}` : `Show ${noun}`}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
