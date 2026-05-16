import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[14px] tracking-[0.35px]",
  md: "px-4 py-2 text-[15px] tracking-[0.4px]",
  lg: "px-5 py-2.5 text-[16px] tracking-[0.4px]",
};

interface PillBaseProps {
  size?: Size;
  className?: string;
  children: ReactNode;
}

type PillButtonProps = PillBaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Pill = forwardRef<HTMLButtonElement, PillButtonProps>(function Pill(
  { size = "md", className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "bg-canvas-white text-storm-gray",
        "rounded-full",
        "transition-opacity hover:opacity-90 active:opacity-80",
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
    "bg-canvas-white text-storm-gray",
    "rounded-full",
    "transition-opacity hover:opacity-90 active:opacity-80",
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
