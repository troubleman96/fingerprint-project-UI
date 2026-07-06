import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, FolderOpen, BarChart3, Fingerprint, ScrollText, UserCog, Settings, Shield, MessageSquare, Download } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const main = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/students", label: "Students", icon: Users },
  { to: "/app/cases", label: "Cases", icon: FolderOpen, badge: 7 },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
] as const;

import type { Role } from "@/types";
const system: { to: string; label: string; icon: any; roles: Role[]; dot?: boolean }[] = [
  { to: "/app/biometric", label: "Biometric Auth", icon: Fingerprint, roles: ["ADMIN", "OFFICER", "STAFF"] },
  { to: "/app/audit", label: "Audit Log", icon: ScrollText, roles: ["ADMIN", "OFFICER"], dot: true },
  { to: "/app/notifications", label: "Notifications", icon: MessageSquare, roles: ["ADMIN"] },
  { to: "/app/export", label: "Export", icon: Download, roles: ["ADMIN"] },
  { to: "/app/users", label: "User Admin", icon: UserCog, roles: ["ADMIN"] },
  { to: "/app/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "OFFICER", "STAFF"] },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col" style={{ backgroundColor: "var(--sidebar-bg)", color: "var(--sidebar-fg)" }}>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/30">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">DisciplineTrack</p>
          <p className="text-[10px] uppercase tracking-wide opacity-60">DT</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Main</p>
        {main.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.to);
          return (
            <Link key={it.to} to={it.to} onClick={onNavigate} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-blue-500/25 border-l-2 border-blue-400 font-semibold" : "hover:bg-white/10"}`}>
              <Icon className="h-4 w-4" />
              <span className="flex-1">{it.label}</span>
              {"badge" in it && it.badge && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold">{it.badge}</span>}
            </Link>
          );
        })}

        <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">System</p>
        {/* Navigation visibility is filtered in the UI by the logged-in mock role. */}
        {system.filter((it) => !user || it.roles.includes(user.role)).map((it) => {
          const Icon = it.icon;
          const active = isActive(it.to);
          return (
            <Link key={it.to} to={it.to} onClick={onNavigate} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-blue-500/25 border-l-2 border-blue-400 font-semibold" : "hover:bg-white/10"}`}>
              <Icon className="h-4 w-4" />
              <span className="flex-1">{it.label}</span>
              {"dot" in it && it.dot && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
              {user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{user.full_name}</p>
              <p className="truncate text-[10px] opacity-60">{user.role} · {user.department}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
