import { Bell, Moon, Sun, Plus, Menu, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "@tanstack/react-router";

export function Topbar({ title, onMenu }: { title: string; onMenu?: () => void }) {
  const { theme, toggleTheme } = useThemeStore();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      {onMenu && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="hidden flex-1 items-center justify-center md:flex">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search students, cases…" className="pl-9" />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" title="Notifications"><Bell className="h-5 w-5" /></Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button onClick={() => navigate({ to: "/app/cases/new" })} className="hidden gap-1.5 sm:inline-flex"><Plus className="h-4 w-4" /> New Case</Button>
        <Button variant="ghost" size="icon" onClick={() => { logout(); navigate({ to: "/login" }); }} title="Logout"><LogOut className="h-5 w-5" /></Button>
      </div>
    </header>
  );
}
