"use client";

import { ComponentPropsWithoutRef, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  pendingText?: ReactNode;
}

export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingText ?? "Working..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
