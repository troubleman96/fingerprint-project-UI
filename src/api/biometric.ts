import { apiFetch } from "./client";

export interface EnrollPayload {
  reg_number: string;
  template_hash: string;
  finger_used?: string;
  quality_score?: number;
}

export interface VerifyResult {
  student_id: string;
  reg_number: string;
  full_name: string;
  department: string;
}

export const biometricApi = {
  enroll: async (payload: EnrollPayload): Promise<void> => {
    await apiFetch("/biometric/enroll/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verify: async (
    template_hash: string,
    workstation_id?: string,
  ): Promise<VerifyResult | null> => {
    try {
      const res = await apiFetch<VerifyResult>("/biometric/verify/", {
        method: "POST",
        body: JSON.stringify({ template_hash, workstation_id }),
      });
      return res.data;
    } catch {
      return null;
    }
  },
};
