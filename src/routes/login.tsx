import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Mail, Lock, Eye, EyeOff, Fingerprint, Check, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { BiometricSimulator } from "@/components/shared/BiometricSimulator";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { theme, toggleTheme } = useThemeStore();
  const [email, setEmail] = useState("admin@dit.ac.tz");
  const [password, setPassword] = useState("password");
  const [show, setShow] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (login(email, password)) {
      toast.success("Welcome back!");
      navigate({ to: "/app/dashboard" });
    } else {
      setErr("Invalid credentials. Try admin@dit.ac.tz or officer@dit.ac.tz");
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden w-2/5 flex-col justify-between p-10 text-white md:flex" style={{ background: "linear-gradient(135deg, oklch(0.28 0.13 264), oklch(0.45 0.22 264))" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15"><Shield className="h-5 w-5" /></div>
          <span className="text-lg font-bold">DisciplineTrack</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">Secure Student Disciplinary Management</h1>
          <p className="text-white/80">Biometric-backed, immutable, role-based — built for higher learning institutions.</p>
          <ul className="space-y-3">
            {["Biometric fingerprint authentication", "Role-based access control", "Immutable audit trail"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> {t}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">Dar es Salaam Institute of Technology</p>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-6">
        <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold">Sign in to DisciplineTrack</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials or use biometric authentication.</p>
          </div>
          {err && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{err}</div>}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="pl-9" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? "text" : "password"} className="pl-9 pr-9" required />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="rm" /><label htmlFor="rm">Remember me</label>
          </div>
          <Button type="submit" className="w-full">Sign In</Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setBioOpen(true)}>
            <Fingerprint className="h-4 w-4" /> Use Fingerprint Scanner
          </Button>
        </form>
        <Dialog open={bioOpen} onOpenChange={setBioOpen}>
          <DialogContent>
            <DialogTitle>Biometric Login</DialogTitle>
            <BiometricSimulator forceSuccess onResult={(ok) => {
              if (ok) {
                setTimeout(() => {
                  login("admin@dit.ac.tz", "x");
                  setBioOpen(false);
                  navigate({ to: "/app/dashboard" });
                }, 600);
              }
            }} label="Welcome, Amina" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
