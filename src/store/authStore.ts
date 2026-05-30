import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
}

interface AuthState {
  user: AuthUser | null;
  access: string | null;
  refresh: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setTokens: (access: string, refresh: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const res = await fetch(`${API_BASE}/auth/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) return false;
          const body = await res.json();
          // LoginView (TokenObtainPairView) returns tokens at the root level,
          // not inside a data envelope like other endpoints.
          const access: string = body.access;
          const refresh: string = body.refresh;
          const user = body.user;
          if (!access || !user) return false;
          set({
            access,
            refresh,
            user: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              role: user.role,
              department: user.department ?? null,
            },
            isAuthenticated: true,
          });
          return true;
        } catch {
          return false;
        }
      },

      logout: () =>
        set({ user: null, access: null, refresh: null, isAuthenticated: false }),

      setTokens: (access, refresh) => set({ access, refresh }),
    }),
    { name: "dt-auth" },
  ),
);
