import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-muted",
  SENT: "bg-blue-50 text-blue-700",
  VIEWED: "bg-mist text-moss",
  ACCEPTED: "bg-emerald/10 text-emerald",
  DECLINED: "bg-clay/10 text-clay",
  EXPIRED: "bg-slate-100 text-muted",
  VOID: "bg-slate-100 text-muted",
  ISSUED: "bg-blue-50 text-blue-700",
  PARTIAL: "bg-gold/15 text-[#8b5b14]",
  PAID: "bg-emerald/10 text-emerald",
  OVERDUE: "bg-clay/10 text-clay",
  TRIALING: "bg-mist text-moss",
  ACTIVE: "bg-emerald/10 text-emerald",
  PAST_DUE: "bg-clay/10 text-clay",
  CANCELED: "bg-slate-100 text-muted",
  INCOMPLETE: "bg-gold/15 text-[#8b5b14]"
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
        statusTone[status] || "bg-slate-100 text-muted",
        className
      )}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
