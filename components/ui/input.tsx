import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lux border border-ponto-border bg-ponto-white px-4 py-2.5 text-sm text-ponto-black placeholder:text-ponto-muted-soft",
          "transition-all duration-200",
          "focus:border-ponto-orange focus:outline-none focus:ring-2 focus:ring-ponto-orange/20 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.08)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-ponto-surface",
          "hover:border-ponto-muted-soft",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
