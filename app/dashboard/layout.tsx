import { DashboardNav } from "@/components/ui/DashboardNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DashboardNav />
      {/* leave room for the floating bar */}
      <div className="h-24" aria-hidden />
    </>
  );
}
