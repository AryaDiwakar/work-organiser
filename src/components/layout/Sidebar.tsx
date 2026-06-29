"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FolderKanban,
  ClipboardList,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const adminLinks = [
  { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/admin/clients", label: "Clients", icon: Building2 },
  { href: "/dashboard/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/admin/categories", label: "Categories", icon: FolderKanban },
  { href: "/dashboard/admin/tasks", label: "Adhoc Tasks", icon: ClipboardList },
  { href: "/dashboard/admin/resources", label: "Resources", icon: Users },
  { href: "/dashboard/admin/attendance", label: "Attendance", icon: Clock },
  { href: "/dashboard/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

const resourceLinks = [
  { href: "/dashboard/resource", label: "My Tasks", icon: ClipboardList },
  { href: "/dashboard/resource/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/resource/attendance", label: "Attendance", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const links = role === "SUPER_ADMIN" || role === "ADMIN" ? adminLinks : resourceLinks;

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-700">
        <CalendarDays className="h-6 w-6 text-indigo-400" />
        <span className="text-lg font-bold">Work Organiser</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
