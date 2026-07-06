import { apiFetch } from "./client";

export const authApi = {
  /** Enroll the current user's own fingerprint as a login credential. */
  enrollBiometric: async (template_hash: string, finger_used?: string): Promise<void> => {
    await apiFetch("/auth/biometric/enroll/", {
      method: "POST",
      body: JSON.stringify({ template_hash, finger_used }),
    });
  },
};
