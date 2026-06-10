"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-line bg-white p-8 text-center shadow-subtle">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-clay/10">
        <AlertTriangle className="h-6 w-6 text-clay" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Something didn&apos;t go through</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {error.message && !error.digest
          ? error.message
          : "The last action could not be completed. Your data is safe — please try again."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/app/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
