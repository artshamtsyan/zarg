import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-1.5 text-[13px]",
  md: "px-5 py-2 text-[14px]",
  lg: "px-6 py-2.5 text-[15px]",
};

interface PillBaseProps {
  size?: Size;
  className?: string;
  children: ReactNode;
}

type PillButtonProps = PillBaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

// Filled Mild Button — Ghost Blue bg + Outline Blue text/border. Primary CTA.
export const Pill = forwardRef<HTMLButtonElement, PillButtonProps>(function Pill(
  { size = "md", className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "bg-ghost-blue text-outline-blue",
        "border border-outline-blue",
        "rounded-full",
        "transition-colors hover:bg-[#cce7fb] active:bg-[#bcdef9]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

interface PillLinkProps extends PillBaseProps {
  href: string;
  external?: boolean;
}

export function PillLink({ href, external, size = "md", className, children }: PillLinkProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-medium",
    "bg-ghost-blue text-outline-blue",
    "border border-outline-blue",
    "rounded-full",
    "transition-colors hover:bg-[#cce7fb] active:bg-[#bcdef9]",
    sizeClasses[size],
    className
  );
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
