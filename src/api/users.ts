import { apiFetch, buildQuery, type ApiMeta } from "./client";
import type { User } from "@/types";

export interface UserListResponse {
  data: User[];
  meta: ApiMeta;
}

export interface UserCreatePayload {
  email: string;
  full_name: string;
  role: string;
  password: string;
  department?: string;
  phone?: string;
  is_active?: boolean;
}

export const usersApi = {
  list: async (
    params: { search?: string; page_size?: number } = {},
  ): Promise<UserListResponse> => {
    const res = await apiFetch<User[]>(
      `/users/${buildQuery({ page_size: 100, ...params })}`,
    );
    return { data: res.data, meta: res.meta! };
  },

  get: async (id: number): Promise<User> => {
    const res = await apiFetch<User>(`/users/${id}/`);
    return res.data;
  },

  create: async (payload: UserCreatePayload): Promise<User> => {
    const res = await apiFetch<User>("/users/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  update: async (id: number, payload: Partial<UserCreatePayload>): Promise<User> => {
    const res = await apiFetch<User>(`/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deactivate: async (id: number) =>
    apiFetch(`/users/${id}/`, { method: "DELETE" }),
};
