"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
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
  CalendarCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Key,
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
  { href: "/dashboard/admin/leaves", label: "Leaves", icon: CalendarCheck },
  { href: "/dashboard/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/admin/credentials", label: "Credentials", icon: Key },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

const resourceLinks = [
  { href: "/dashboard/resource", label: "My Tasks", icon: ClipboardList },
  { href: "/dashboard/resource/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/resource/attendance", label: "Attendance", icon: Clock },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdminView = role === "SUPER_ADMIN" || role === "ADMIN";

  const links = isAdminView
    ? (isSuperAdmin ? adminLinks : adminLinks.filter((l) => !["Leaves", "Attendance", "Resources", "Settings"].includes(l.label)))
    : resourceLinks;

  return (
    <div className={cn("flex h-full flex-col bg-gray-900 text-white transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className={cn("flex h-16 items-center border-b border-gray-700", collapsed ? "justify-center px-2" : "gap-2 px-4")}>
        {!collapsed && (
          <>
            <Image src="/godigitell.png" alt="godigitell" width={28} height={28} className="rounded" />
            <span className="text-base font-bold">godigitell</span>
          </>
        )}
        {collapsed && (
          <Image src="/godigitell.png" alt="godigitell" width={24} height={24} className="rounded" />
        )}
      </div>
      <button
        onClick={onToggle}
        className="mx-2 mt-2 flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
