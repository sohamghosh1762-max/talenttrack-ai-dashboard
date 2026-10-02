import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  IApplicantPreferences,
  UpdateApplicantPreferencesInput,
} from "../../server/types/preference-types.ts";

export const applicantSettingsKeys = {
  all: ["applicant-settings"] as const,
  detail: () => [...applicantSettingsKeys.all, "detail"] as const,
};

export type ApplicantPreferencesData = Omit<IApplicantPreferences, "id" | "userId">;

/**
 * Hook to retrieve authenticated applicant's persistent settings/preferences
 */
export function useApplicantSettings(
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  return useQuery<ApplicantPreferencesData>({
    queryKey: applicantSettingsKeys.detail(),
    queryFn: async () => {
      const res = await apiClient.get<ApplicantPreferencesData>("/api/applicant/settings");
      return (
        res || {
          applicationStatusUpdates: true,
          interviewReminders: true,
          jobRecommendationAlerts: true,
          messageNotifications: true,
          emailNotifications: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * Hook to update authenticated applicant's settings/preferences
 */
export function useUpdateApplicantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateApplicantPreferencesInput) => {
      return apiClient.patch<ApplicantPreferencesData>("/api/applicant/settings", {
        body: updates,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ApplicantPreferencesData>(applicantSettingsKeys.detail(), (old) => ({
        ...(old || {}),
        ...updated,
      } as ApplicantPreferencesData));
      queryClient.invalidateQueries({ queryKey: applicantSettingsKeys.all });
    },
  });
}
