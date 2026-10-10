export interface IApplicantPreferences {
  id: string;
  userId: string;
  applicationStatusUpdates: boolean;
  interviewReminders: boolean;
  jobRecommendationAlerts: boolean;
  messageNotifications: boolean;
  emailNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateApplicantPreferencesInput {
  applicationStatusUpdates?: boolean | undefined;
  interviewReminders?: boolean | undefined;
  jobRecommendationAlerts?: boolean | undefined;
  messageNotifications?: boolean | undefined;
  emailNotifications?: boolean | undefined;
}

export const DEFAULT_APPLICANT_PREFERENCES: Omit<
  IApplicantPreferences,
  "id" | "userId" | "createdAt" | "updatedAt"
> = {
  applicationStatusUpdates: true,
  interviewReminders: true,
  jobRecommendationAlerts: true,
  messageNotifications: true,
  emailNotifications: true,
};
