import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        accent: "bg-accent text-white shadow-sm hover:bg-accent-hover",
        secondary: "bg-sage text-primary hover:bg-sage-hover",
        outline: "border border-line bg-card text-ink hover:bg-sage-light hover:border-sage",
        ghost: "text-muted hover:bg-sage-light hover:text-ink",
        danger: "bg-danger text-white hover:bg-danger-hover",
        "danger-ghost": "text-danger hover:bg-danger-soft",
      },
      size: {
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        md: "h-11 px-4 text-[15px] [&_svg]:size-[18px]",
        lg: "h-12 px-5 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-[18px]",
        "icon-sm": "size-8 rounded-lg [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
