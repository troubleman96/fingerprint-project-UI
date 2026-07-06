import { apiFetch } from "./client";
import { useAuthStore } from "@/store/authStore";
import type { DashboardStats } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export type ExportDataset = "students" | "cases";
export type ExportFiletype = "csv" | "json";

export const reportsApi = {
  dashboard: async (): Promise<DashboardStats> => {
    const res = await apiFetch<DashboardStats>("/reports/dashboard/");
    return res.data;
  },

  /** Downloads a dataset export as a file — for handing this institution's data to another institution/system. */
  exportData: async (dataset: ExportDataset, filetype: ExportFiletype): Promise<void> => {
    const { access } = useAuthStore.getState();
    const res = await fetch(
      `${API_BASE}/reports/export/?dataset=${dataset}&filetype=${filetype}`,
      { headers: access ? { Authorization: `Bearer ${access}` } : {} },
    );
    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disciplinetrack_${dataset}.${filetype}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
