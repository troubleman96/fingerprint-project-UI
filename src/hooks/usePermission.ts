import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types";

export function usePermission(allowed: Role[]) {
  const user = useAuthStore((s) => s.user);
  return !!user && allowed.includes(user.role);
}
