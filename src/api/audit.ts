import { apiFetch, buildQuery, type ApiMeta } from "./client";
import type { AuditEntry } from "@/types";

export interface AuditListParams {
  page?: number;
  page_size?: number;
  search?: string;
  action?: string;
  resource_type?: string;
  user?: number;
  ordering?: string;
}

export interface AuditListResponse {
  data: AuditEntry[];
  meta: ApiMeta;
}

export const auditApi = {
  list: async (params: AuditListParams = {}): Promise<AuditListResponse> => {
    const res = await apiFetch<AuditEntry[]>(
      `/audit/${buildQuery({ page_size: 100, ...params })}`,
    );
    return { data: res.data, meta: res.meta! };
  },
};
