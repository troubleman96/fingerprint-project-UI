import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="System and account preferences" />
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system" disabled={!isAdmin}>System</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4 pt-4">
          <div className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Profile</h3>
            <div><Label>Full Name</Label><Input defaultValue={user?.full_name} /></div>
            <div><Label>Email</Label><Input defaultValue={user?.email} /></div>
            <div><Label>Department</Label><Input defaultValue={user?.department} /></div>
            <Button onClick={() => toast.success("Profile saved")} className="w-fit">Save Changes</Button>
          </div>
          <div className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Change Password</h3>
            <div><Label>Current Password</Label><Input type="password" /></div>
            <div><Label>New Password</Label><Input type="password" /></div>
            <div><Label>Confirm New</Label><Input type="password" /></div>
            <Button onClick={() => toast.success("Password changed")} className="w-fit">Update Password</Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="pt-4">
          <div className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["light", "dark"] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)} className={`rounded-xl border-2 p-4 text-left transition-all ${theme === t ? "border-blue-600" : "border-border"}`}>
                  <div className={`mb-2 h-20 rounded ${t === "light" ? "bg-gradient-to-br from-slate-100 to-blue-100" : "bg-gradient-to-br from-slate-800 to-slate-950"}`} />
                  <p className="text-sm font-medium capitalize">{t} Mode</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Changes apply instantly</p>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <div className="grid max-w-xl gap-3 rounded-xl border border-border bg-card p-6">
            {["New case assigned", "Case status changed", "New student registered", "Daily summary email", "Weekly report email"].map((l) => (
              <div key={l} className="flex items-center justify-between"><Label>{l}</Label><Switch defaultChecked /></div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="pt-4">
          <div className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">System Settings</h3>
            <div><Label>Institution Name</Label><Input defaultValue="Dar es Salaam Institute of Technology" /></div>
            <div><Label>Short Code</Label><Input defaultValue="DIT" /></div>
            <div><Label>Academic Year</Label><Input defaultValue="2024/2025" /></div>
            <div><Label>Max Upload (MB)</Label><Input type="number" defaultValue={5} /></div>
            <div><Label>Session Timeout (min)</Label><Input type="number" defaultValue={30} /></div>
            <Button onClick={() => toast.success("Settings saved")} className="w-fit">Save</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
