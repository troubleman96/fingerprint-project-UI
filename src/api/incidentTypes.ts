import { apiFetch } from "./client";
import type { IncidentType } from "@/types";

export const incidentTypesApi = {
  list: async (): Promise<IncidentType[]> => {
    const res = await apiFetch<IncidentType[]>("/incident-types/");
    return res.data;
  },
};
