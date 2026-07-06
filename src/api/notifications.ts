import { apiFetch, buildQuery, type ApiMeta } from "./client";

export interface SmsLogEntry {
  id: number;
  recipient: string;
  message: string;
  provider: string;
  status: "SENT" | "FAILED" | "LOGGED";
  error: string;
  case_number: string | null;
  created_at: string;
}

export interface SmsLogListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  provider?: string;
  ordering?: string;
}

export interface SmsLogListResponse {
  data: SmsLogEntry[];
  meta: ApiMeta;
}

export const notificationsApi = {
  list: async (params: SmsLogListParams = {}): Promise<SmsLogListResponse> => {
    const res = await apiFetch<SmsLogEntry[]>(
      `/notifications/sms-logs/${buildQuery({ page_size: 100, ...params })}`,
    );
    return { data: res.data, meta: res.meta! };
  },

  balance: async (): Promise<number | null> => {
    const res = await apiFetch<{ balance: number | null }>("/notifications/balance/");
    return res.data.balance;
  },
};
