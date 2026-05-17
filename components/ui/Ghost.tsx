import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GhostBaseProps {
  className?: string;
  children: ReactNode;
}

// Ghost Primary Button — Outline Blue border, Ink text, transparent bg.
const baseClasses = cn(
  "inline-flex items-center justify-center",
  "bg-transparent text-ink",
  "border border-outline-blue",
  "rounded-full",
  "px-5 py-2 text-[14px] font-medium",
  "transition-colors hover:bg-ghost-blue active:bg-[#cce7fb]",
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
