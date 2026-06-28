import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.65rem] font-data uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        primary: "border-pitch-claim-border bg-pitch-claim-bg text-pitch-claim",
        watching: "border-pitch-warrant-border bg-pitch-warrant-bg text-pitch-warrant",
        threat: "border-pitch-rebuttal-border bg-pitch-rebuttal-bg text-pitch-rebuttal",
        success: "border-arena-yes/30 bg-arena-yes/10 text-arena-yes",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
