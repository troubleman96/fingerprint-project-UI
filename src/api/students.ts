import { apiFetch, buildQuery, type ApiResponse, type ApiMeta } from "./client";
import type { Student, StudentListItem, CaseListItem } from "@/types";

export interface StudentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  department?: number | string;
  biometric_enrolled?: boolean | string;
  academic_year?: string;
  is_active?: boolean | string;
  ordering?: string;
}

export interface StudentListResponse {
  data: StudentListItem[];
  meta: ApiMeta;
}

export const studentsApi = {
  list: async (params: StudentListParams = {}): Promise<StudentListResponse> => {
    const res = await apiFetch<StudentListItem[]>(
      `/students/${buildQuery({ page_size: 100, ...params })}`,
    );
    return { data: res.data, meta: res.meta! };
  },

  get: async (id: string): Promise<Student> => {
    const res = await apiFetch<Student>(`/students/${id}/`);
    return res.data;
  },

  create: async (payload: FormData | Record<string, unknown>): Promise<Student> => {
    const isForm = payload instanceof FormData;
    const res = await apiFetch<Student>("/students/", {
      method: "POST",
      body: isForm ? payload : JSON.stringify(payload),
    });
    return res.data;
  },

  update: async (
    id: string,
    payload: FormData | Record<string, unknown>,
  ): Promise<Student> => {
    const isForm = payload instanceof FormData;
    const res = await apiFetch<Student>(`/students/${id}/`, {
      method: "PATCH",
      body: isForm ? payload : JSON.stringify(payload),
    });
    return res.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<null>> =>
    apiFetch(`/students/${id}/`, { method: "DELETE" }),

  cases: async (id: string): Promise<CaseListItem[]> => {
    const res = await apiFetch<CaseListItem[]>(`/students/${id}/cases/`);
    return res.data;
  },
};
