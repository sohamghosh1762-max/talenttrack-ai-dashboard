export type InterviewType = "VIDEO" | "PHONE" | "ONSITE";

export type InterviewStatus =
  "SCHEDULED" | "CONFIRMED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface IInterviewInterviewer {
  id: string;
  name: string;
  email?: string | undefined;
  role?: string | undefined;
  avatarUrl?: string | undefined;
  companyName?: string | undefined;
}

export interface IInterviewJobSummary {
  id: string;
  title: string;
  department?: string | undefined;
  company?: string | undefined;
  location?: string | undefined;
  employmentType?: string | undefined;
}

export interface IInterview {
  id: string;
  applicationId: string;
  jobId: string;
  applicantId: string;
  recruiterId: string;
  hiringManagerId?: string | undefined;
  interviewerIds?: string[] | undefined;
  title: string;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  meetingUrl?: string | undefined;
  location?: string | undefined;
  instructions?: string | undefined;
  status: InterviewStatus;
  notes?: string | undefined;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Enriched presentation fields
  job?: IInterviewJobSummary | undefined;
  applicant?:
    | {
        id: string;
        name: string;
        email: string;
      }
    | undefined;
  interviewer?: IInterviewInterviewer | undefined;
  interviewers?: IInterviewInterviewer[] | undefined;
}

export interface CreateInterviewInput {
  applicationId: string;
  title?: string | undefined;
  type?: InterviewType | undefined;
  scheduledAt: string;
  durationMinutes?: number | undefined;
  timezone?: string | undefined;
  meetingUrl?: string | undefined;
  location?: string | undefined;
  instructions?: string | undefined;
  status?: InterviewStatus | undefined;
  notes?: string | undefined;
  hiringManagerId?: string | undefined;
  interviewerIds?: string[] | undefined;
}

export interface UpdateInterviewInput {
  title?: string | undefined;
  type?: InterviewType | undefined;
  scheduledAt?: string | undefined;
  durationMinutes?: number | undefined;
  timezone?: string | undefined;
  meetingUrl?: string | undefined;
  location?: string | undefined;
  instructions?: string | undefined;
  status?: InterviewStatus | undefined;
  notes?: string | undefined;
}

export interface InterviewQueryParams {
  applicantId?: string | undefined;
  recruiterId?: string | undefined;
  hiringManagerId?: string | undefined;
  applicationId?: string | undefined;
  jobId?: string | undefined;
  status?: InterviewStatus | "ALL" | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}
