import { apiFetch } from "./client";
import type { IncidentType } from "@/types";

export const incidentTypesApi = {
  list: async (): Promise<IncidentType[]> => {
    const res = await apiFetch<IncidentType[]>("/incident-types/?page_size=100");
    return res.data;
  },
};
