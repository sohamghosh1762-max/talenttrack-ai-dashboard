import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";

export interface RecruiterSettingsData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  companyName: string;
  phone?: string;
  website?: string;
  notificationPreferences?: {
    emailAlerts: boolean;
    aiAlerts: boolean;
    interviewReminders: boolean;
  };
}

export function useRecruiterSettings(options: { enabled?: boolean } = {}) {
  return useQuery<RecruiterSettingsData>({
    queryKey: ["recruiter", "settings"],
    queryFn: async () => {
      return apiClient.get<RecruiterSettingsData>("/api/recruiter/settings");
    },
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdateRecruiterSettings() {
  const queryClient = useQueryClient();
  return useMutation<RecruiterSettingsData, Error, Partial<RecruiterSettingsData>>({
    mutationFn: async (payload) => {
      return apiClient.patch<RecruiterSettingsData>("/api/recruiter/settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter", "settings"] });
    },
  });
}

export function useChangePassword() {
  return useMutation<{ success: boolean }, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: async (payload) => {
      return apiClient.post<{ success: boolean }>("/api/recruiter/settings/change-password", payload);
    },
  });
}
