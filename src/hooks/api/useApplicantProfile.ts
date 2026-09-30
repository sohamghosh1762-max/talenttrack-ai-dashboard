import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  ApplicantProfileResponse,
  UpdateApplicantProfileInput,
} from "../../server/types/user-types.ts";

export const applicantProfileKeys = {
  all: ["applicant"] as const,
  profile: () => [...applicantProfileKeys.all, "profile"] as const,
};

/**
 * TanStack Query hook to fetch the authenticated applicant's profile data and resume
 */
export function useApplicantProfile(options: { enabled?: boolean } = {}) {
  return useQuery<ApplicantProfileResponse>({
    queryKey: applicantProfileKeys.profile(),
    queryFn: async () => {
      const res = await apiClient.get<ApplicantProfileResponse>("/api/applicant/profile");
      return res;
    },
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

/**
 * TanStack Mutation hook to update the authenticated applicant's profile
 */
export function useUpdateApplicantProfile() {
  const queryClient = useQueryClient();

  return useMutation<ApplicantProfileResponse, Error, UpdateApplicantProfileInput>({
    mutationFn: async (payload: UpdateApplicantProfileInput) => {
      const res = await apiClient.put<ApplicantProfileResponse>("/api/applicant/profile", payload);
      return res;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(applicantProfileKeys.profile(), data);
      queryClient.invalidateQueries({ queryKey: applicantProfileKeys.profile() });
      queryClient.invalidateQueries({ queryKey: ["applicant", "ats-score"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
