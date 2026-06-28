import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-sm border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        destructive:
          "border-arena-no/30 bg-arena-no/5 text-foreground [&>svg]:text-arena-no",
        success:
          "border-arena-yes/30 bg-arena-yes/5 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-1 font-display text-base font-semibold", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
