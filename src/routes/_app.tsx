import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const titleMap: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/students": "Students",
  "/app/students/new": "Register Student",
  "/app/cases": "Disciplinary Cases",
  "/app/cases/new": "File New Case",
  "/app/biometric": "Biometric Authentication",
  "/app/biometric/enroll": "Enroll Student Fingerprint",
  "/app/reports": "Reports & Analytics",
  "/app/audit": "Audit Log",
  "/app/users": "User Management",
  "/app/users/new": "Create User",
  "/app/settings": "Settings",
};

function AppLayout() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const theme = useThemeStore((s) => s.theme);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Delay auth gating until persisted Zustand state is restored from localStorage.
    // Without this, a valid returning session briefly looks unauthenticated on boot.
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setHydrated(true));
    if (useAuthStore.persist?.hasHydrated?.()) setHydrated(true);
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    // Route protection currently lives on the client. Once a real backend exists,
    // this should be complemented with server-side authorization as well.
    if (hydrated && !isAuth && typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [isAuth, hydrated]);

  if (!hydrated) return null;
  if (!isAuth) return null;

  let title = titleMap[pathname] ?? "DisciplineTrack";
  // Detail pages are dynamic, so derive the topbar title from the path prefix.
  if (pathname.startsWith("/app/students/") && pathname !== "/app/students/new") title = "Student Profile";
  if (pathname.startsWith("/app/cases/") && pathname !== "/app/cases/new") title = "Case Details";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden lg:block"><Sidebar /></div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[220px] p-0">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
