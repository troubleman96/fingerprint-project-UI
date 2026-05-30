import { apiFetch, buildQuery } from "./client";
import type { Department } from "@/types";

export const departmentsApi = {
  list: async (params: { search?: string } = {}): Promise<Department[]> => {
    const res = await apiFetch<Department[]>(
      `/departments/${buildQuery({ page_size: 200, ...params })}`,
    );
    return res.data;
  },

  get: async (id: number): Promise<Department> => {
    const res = await apiFetch<Department>(`/departments/${id}/`);
    return res.data;
  },

  create: async (payload: { name: string; code: string }): Promise<Department> => {
    const res = await apiFetch<Department>("/departments/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};
