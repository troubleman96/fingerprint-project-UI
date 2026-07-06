import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  phone: string | null;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  access: string | null;
  refresh: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithBiometric: (template_hash: string) => Promise<boolean>;
  logout: () => void;
  setTokens: (access: string, refresh: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      // Both /auth/login/ and /auth/biometric/login/ return tokens at the
      // root level, not inside a data envelope like other endpoints.
      const applyAuthResponse = async (res: Response): Promise<boolean> => {
        if (!res.ok) return false;
        const body = await res.json();
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
            phone: user.phone ?? null,
            is_active: user.is_active ?? true,
          },
          isAuthenticated: true,
        });
        return true;
      };

      return {
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
            return await applyAuthResponse(res);
          } catch {
            return false;
          }
        },

        loginWithBiometric: async (template_hash) => {
          try {
            const res = await fetch(`${API_BASE}/auth/biometric/login/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ template_hash }),
            });
            return await applyAuthResponse(res);
          } catch {
            return false;
          }
        },

        logout: () =>
          set({ user: null, access: null, refresh: null, isAuthenticated: false }),

        setTokens: (access, refresh) => set({ access, refresh }),
      };
    },
    { name: "dt-auth" },
  ),
);
