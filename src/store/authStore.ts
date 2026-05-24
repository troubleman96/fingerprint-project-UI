import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";
import { users } from "@/data/mock";

interface AuthUser { id: number; email: string; full_name: string; role: Role; department: string; }

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (email) => {
        // Demo-only auth: existence of the email in mock users is treated as success.
        // Replace this with a real auth API before relying on it for production access.
        const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
        if (!u) return false;
        set({ user: { id: u.id, email: u.email, full_name: u.full_name, role: u.role, department: u.department }, isAuthenticated: true });
        return true;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "dt-auth" }
  )
);
