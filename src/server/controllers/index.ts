/**
 * Server Controllers Registry
 *
 * Controllers handle request parsing, invoke service layer operations,
 * and format standardized API responses.
 *
 * Future phase controller modules:
 * - AuthController (/api/auth)
 * - OrganizationController (/api/organizations)
 * - JobController (/api/jobs)
 * - CandidateController (/api/candidates)
 * - ResumeController (/api/resumes)
 * - ApplicationController (/api/applications)
 * - ScreeningController (/api/screening)
 * - InterviewController (/api/interviews)
 * - MessageController (/api/messages)
 * - ReportController (/api/reports)
 * - AdminController (/api/admin)
 */

export interface BaseController {
  readonly routePrefix: string;
}
