import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald text-white">
        <Leaf className="h-5 w-5" />
      </span>
      <span className={cn("text-xl", dark ? "text-white" : "text-ink")}>Pestimator</span>
    </Link>
  );
}
