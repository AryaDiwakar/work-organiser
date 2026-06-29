"use client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !isAdminRole(session.user?.role as string)) {
    redirect("/dashboard/resource");
  }

  return <>{children}</>;
}
