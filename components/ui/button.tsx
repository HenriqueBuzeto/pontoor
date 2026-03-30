import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lux text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ponto-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-ponto-orange text-white shadow-lux hover:bg-ponto-orange-hover hover:shadow-lux-orange hover:-translate-y-0.5",
        secondary:
          "border border-ponto-border bg-ponto-white text-ponto-black shadow-lux hover:bg-ponto-surface hover:border-ponto-muted-soft hover:-translate-y-0.5",
        ghost:
          "hover:bg-ponto-orange-muted hover:text-ponto-black",
        danger:
          "bg-ponto-error text-white shadow-lux hover:opacity-90 active:opacity-95",
      },
      size: {
        sm: "h-9 px-4 text-xs rounded-ponto",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base rounded-lux-xl",
        icon: "h-10 w-10 rounded-lux",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
