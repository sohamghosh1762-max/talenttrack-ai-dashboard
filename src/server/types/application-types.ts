export type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN"
  | "Shortlisted"
  | "Under Review";

export type ApplicationStage =
  "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFERED" | "REJECTED" | "WITHDRAWN";

export interface ApplicationJobInfo {
  id: string;
  title: string;
  department?: string | undefined;
  location?: string | undefined;
  type?: string | undefined;
  company?: string | undefined;
  status?: string | undefined;
}

export interface ApplicationApplicantInfo {
  id: string;
  name: string;
  email: string;
  phone?: string | undefined;
  headline?: string | undefined;
  location?: string | undefined;
  skills?: string[] | undefined;
  initials?: string | undefined;
}

export interface ApplicationResumeInfo {
  id: string;
  originalFileName: string;
  mimeType?: string | undefined;
  fileSize?: number | undefined;
  uploadedAt?: string | undefined;
}

export interface HiringManagerFeedbackItem {
  id: string;
  hiringManagerId: string;
  hiringManagerName?: string | undefined;
  overallFeedback: string;
  technicalSkillsRating?: number | undefined; // 1-5
  communicationRating?: number | undefined; // 1-5
  experienceRating?: number | undefined; // 1-5
  roleFitRating?: number | undefined; // 1-5
  strengths?: string[] | string | undefined;
  concerns?: string[] | string | undefined;
  recommendation: "Recommend" | "Maybe" | "Do Not Recommend" | string;
  createdAt: string;
}

export interface HiringDecision {
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedBy?: string | undefined;
  decidedByName?: string | undefined;
  decidedAt?: string | undefined;
  notes?: string | undefined;
}

export interface IApplication {
  id: string; // 24-character hexadecimal MongoDB ObjectId
  jobId: string; // Ref to Job
  applicantId: string; // Ref to User / Applicant
  recruiterId: string; // Ref to User / Recruiter
  resumeId?: string | undefined;
  coverLetter?: string | undefined;
  status: ApplicationStatus;
  currentStage: ApplicationStage;
  aiScore?: number | undefined;
  notes?: string | undefined;
  appliedAt: string;
  updatedAt: string;
  jobTitle?: string | undefined;
  applicantName?: string | undefined;
  applicantEmail?: string | undefined;
  job?: ApplicationJobInfo | undefined;
  applicant?: ApplicationApplicantInfo | undefined;
  resume?: ApplicationResumeInfo | undefined;
  hiringManagerFeedback?: HiringManagerFeedbackItem[] | undefined;
  hiringDecision?: HiringDecision | undefined;
  notesList?: ApplicationNote[] | undefined;
  stageHistory?: StageHistoryItem[] | undefined;
  recruiterFeedback?: RecruiterFeedbackItem[] | undefined;
}

export interface ApplicationNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string | undefined;
  content: string;
  text?: string | undefined;
  createdAt: string;
}

export interface StageHistoryItem {
  fromStage?: string | undefined;
  toStage: string;
  changedBy: string;
  changedByName?: string | undefined;
  changedAt: string;
  reason?: string | undefined;
}

export interface RecruiterFeedbackItem {
  id: string;
  reviewerId: string;
  reviewerName?: string | undefined;
  rating?: number | undefined; // 1-5
  technicalRating?: number | undefined;
  communicationRating?: number | undefined;
  strengths?: string[] | string | undefined;
  weaknesses?: string[] | string | undefined;
  recommendation: "Strong Hire" | "Hire" | "Hold" | "Reject" | string;
  comments?: string | undefined;
  createdAt: string;
}

export interface ApplicationQueryParams {
  page?: number | undefined;
  limit?: number | undefined;
  jobId?: string | undefined;
  jobIds?: string[] | undefined;
  applicantId?: string | undefined;
  recruiterId?: string | undefined;
  status?: ApplicationStatus | string | undefined;
  currentStage?: ApplicationStage | string | undefined;
  stage?: string | undefined;
  search?: string | undefined;
  minScore?: number | undefined;
  maxScore?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  sortBy?:
    ("appliedAt" | "aiScore" | "status" | "applicantName" | "currentStage") | string | undefined;
  sortOrder?: ("asc" | "desc") | string | undefined;
}

export interface PaginatedApplicationsResponse {
  applications: IApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateApplicationInput {
  jobId: string;
  applicantId: string;
  recruiterId?: string | undefined;
  resumeId?: string | undefined;
  coverLetter?: string | undefined;
  notes?: string | undefined;
  currentStage?: ApplicationStage | undefined;
  aiScore?: number | undefined;
}

export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
  currentStage?: ApplicationStage | undefined;
  aiScore?: number | undefined;
  notes?: string | undefined;
  notesList?: ApplicationNote[] | undefined;
  stageHistory?: StageHistoryItem[] | undefined;
  recruiterFeedback?: RecruiterFeedbackItem[] | undefined;
}

export interface BulkApplicationActionInput {
  applicationIds: string[];
  action: "STAGE_CHANGE" | "ADD_NOTE" | "ARCHIVE";
  data?:
    | {
        stage?: ApplicationStage | string | undefined;
        note?: string | undefined;
        reason?: string | undefined;
      }
    | undefined;
}

export interface BulkActionResultItem {
  id: string;
  success: boolean;
  stage?: string | undefined;
  error?: string | undefined;
}

export interface BulkApplicationActionResult {
  total: number;
  totalRequested?: number | undefined;
  succeeded: number;
  failed: number;
  results: BulkActionResultItem[];
}

export interface RecruiterKpis {
  totalCandidates: number;
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  shortlistedCandidates: number;
  interviewsScheduled: number;
  candidatesAwaitingReview: number;
  offersExtended: number;
  offersAccepted: number;
}

export interface StageFunnelItem {
  stage: ApplicationStage;
  label: string;
  count: number;
  conversionRate: number;
}

export interface ApplicationTrendPoint {
  date: string;
  applications: number;
  shortlisted: number;
  interviewed: number;
  offered: number;
}

export interface TopSkillItem {
  name: string;
  count: number;
  maxCount: number;
  colorClass: string;
}

export interface RecruiterAIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  bgClass: string;
  toneClass: string;
}

export interface RecruiterRecentActivity {
  id: string;
  type: "APPLICATION_SUBMITTED" | "STAGE_CHANGED" | "INTERVIEW_SCHEDULED" | "NOTE_ADDED";
  title: string;
  candidateName: string;
  jobTitle?: string | undefined;
  timestamp: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface RecruiterAIInsightSummary {
  avgScore: number;
  topMatchesCount: number;
  items?: RecruiterAIInsight[] | undefined;
  [key: string]: unknown;
}

export interface RecruiterAnalyticsResponse {
  kpis: RecruiterKpis;
  stageFunnel: StageFunnelItem[];
  funnel?: StageFunnelItem[] | undefined;
  applicationTrends: ApplicationTrendPoint[];
  topSkills: TopSkillItem[];
  aiInsights: RecruiterAIInsightSummary;
  recentActivity: RecruiterRecentActivity[];
}
