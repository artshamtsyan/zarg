import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GhostBaseProps {
  className?: string;
  children: ReactNode;
}

const baseClasses = cn(
  "inline-flex items-center justify-center",
  "bg-transparent text-ghost-white",
  "border border-ghost-white",
  "rounded-[10px]",
  "px-3.5 py-2 text-[15px] tracking-[0.4px] font-medium",
  "transition-colors hover:bg-[rgba(229,229,229,0.06)] active:bg-[rgba(229,229,229,0.12)]",
  "disabled:opacity-50 disabled:cursor-not-allowed"
);

type GhostButtonProps = GhostBaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Ghost = forwardRef<HTMLButtonElement, GhostButtonProps>(function Ghost(
  { className, children, ...rest },
  ref
) {
  return (
    <button ref={ref} className={cn(baseClasses, className)} {...rest}>
      {children}
    </button>
  );
});

interface GhostLinkProps extends GhostBaseProps {
  href: string;
  external?: boolean;
}

export function GhostLink({ href, external, className, children }: GhostLinkProps) {
  if (external) {
    return (
      <a href={href} className={cn(baseClasses, className)} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(baseClasses, className)}>
      {children}
    </Link>
  );
}
