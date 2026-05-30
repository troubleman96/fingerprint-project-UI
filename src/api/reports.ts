import { apiFetch } from "./client";
import type { DashboardStats } from "@/types";

export const reportsApi = {
  dashboard: async (): Promise<DashboardStats> => {
    const res = await apiFetch<DashboardStats>("/reports/dashboard/");
    return res.data;
  },
};
