import { apiFetch, buildQuery, type ApiMeta } from "./client";
import type {
  CaseListItem,
  DisciplinaryCase,
  CaseNote,
  CaseDocument,
  CaseStatus,
  CaseOutcome,
} from "@/types";

export interface CaseListParams {
  page?: number;
  page_size?: number;
  search?: string;
  student?: string;
  incident_type?: number | string;
  status?: CaseStatus | string;
  severity?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}

export interface CaseListResponse {
  data: CaseListItem[];
  meta: ApiMeta;
}

export interface CaseCreatePayload {
  student: string;
  incident_type: number;
  severity: string;
  description: string;
  date_of_incident: string;
  location?: string;
  assigned_to?: number;
}

export interface CaseTransitionPayload {
  status: CaseStatus;
  outcome?: CaseOutcome;
  outcome_notes?: string;
}

export const casesApi = {
  list: async (params: CaseListParams = {}): Promise<CaseListResponse> => {
    const res = await apiFetch<CaseListItem[]>(
      `/cases/${buildQuery({ page_size: 100, ...params })}`,
    );
    return { data: res.data, meta: res.meta! };
  },

  get: async (id: string): Promise<DisciplinaryCase> => {
    const res = await apiFetch<DisciplinaryCase>(`/cases/${id}/`);
    return res.data;
  },

  create: async (payload: CaseCreatePayload): Promise<DisciplinaryCase> => {
    const res = await apiFetch<DisciplinaryCase>("/cases/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  update: async (
    id: string,
    payload: Partial<CaseCreatePayload & { outcome_notes: string }>,
  ): Promise<DisciplinaryCase> => {
    const res = await apiFetch<DisciplinaryCase>(`/cases/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  transition: async (
    id: string,
    payload: CaseTransitionPayload,
  ): Promise<DisciplinaryCase> => {
    const res = await apiFetch<DisciplinaryCase>(`/cases/${id}/transition/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  notes: async (id: string): Promise<CaseNote[]> => {
    const res = await apiFetch<CaseNote[]>(`/cases/${id}/notes/`);
    return res.data;
  },

  addNote: async (id: string, body: string): Promise<CaseNote> => {
    const res = await apiFetch<CaseNote>(`/cases/${id}/notes/`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    return res.data;
  },

  documents: async (id: string): Promise<CaseDocument[]> => {
    const res = await apiFetch<CaseDocument[]>(`/cases/${id}/documents/`);
    return res.data;
  },

  uploadDocument: async (id: string, file: File, description?: string): Promise<CaseDocument> => {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    const res = await apiFetch<CaseDocument>(`/cases/${id}/documents/`, {
      method: "POST",
      body: form,
    });
    return res.data;
  },
};
