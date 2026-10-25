import type { UserRole } from "./auth-types";

/**
 * Canonical platform roles supported across the application.
 */
export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  ADMIN: "ADMIN",
  RECRUITER: "RECRUITER",
  HIRING_MANAGER: "HIRING_MANAGER",
  INTERVIEWER: "INTERVIEWER",
  APPLICANT: "APPLICANT",
} as const;

export type CanonicalUserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Normalize any role string (case-insensitive, handling legacy aliases)
 * into a canonical UserRole.
 */
export function normalizeRole(role: string | null | undefined): CanonicalUserRole | null {
  if (!role) return null;
  const upper = role.trim().toUpperCase();

  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "SUPERADMIN") {
    return USER_ROLES.ADMIN;
  }
  if (upper === "ORG_ADMIN" || upper === "ORGADMIN") {
    return USER_ROLES.ORG_ADMIN;
  }
  if (upper === "RECRUITER") {
    return USER_ROLES.RECRUITER;
  }
  if (upper === "HIRING_MANAGER" || upper === "HIRINGMANAGER") {
    return USER_ROLES.HIRING_MANAGER;
  }
  if (upper === "INTERVIEWER") {
    return USER_ROLES.INTERVIEWER;
  }
  if (upper === "APPLICANT") {
    return USER_ROLES.APPLICANT;
  }

  return null;
}

/**
 * Check if a user's role satisfies any of the allowed target roles.
 * Includes canonical alias handling (e.g., ADMIN satisfies SUPER_ADMIN & vice-versa).
 */
export function isRoleAllowed(
  userRole: string | null | undefined,
  allowedRoles: (string | UserRole)[],
): boolean {
  if (!userRole || !allowedRoles || allowedRoles.length === 0) {
    return false;
  }

  const normalizedUser = normalizeRole(userRole);
  if (!normalizedUser) return false;

  return allowedRoles.some((target) => {
    const normalizedTarget = normalizeRole(target);
    if (!normalizedTarget) return false;

    // Direct equality match
    if (normalizedUser === normalizedTarget) return true;

    // Administrator hierarchy compatibility
    if (
      (normalizedTarget === USER_ROLES.ADMIN || normalizedTarget === USER_ROLES.SUPER_ADMIN) &&
      (normalizedUser === USER_ROLES.ADMIN || normalizedUser === USER_ROLES.SUPER_ADMIN)
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Route access specification interface.
 */
export interface RouteAccessRule {
  pathPrefix: string;
  allowedRoles: CanonicalUserRole[];
  resourceType: "admin" | "recruiter" | "applicant" | "general";
  resourceName: string;
}

/**
 * Centralized Route Authorization Configuration.
 * Single source of truth for frontend route access throughout TalentTrack AI.
 */
export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  // 1. Platform Administration Area
  {
    pathPrefix: "/admin",
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    resourceType: "admin",
    resourceName: "Platform Administration Console",
  },
  // 2. Recruiter & Staff Management Area
  {
    pathPrefix: "/dashboard",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Recruiter Dashboard",
  },
  {
    pathPrefix: "/jobs",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Job Openings",
  },
  {
    pathPrefix: "/candidates",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Candidate Directory",
  },
  {
    pathPrefix: "/pipeline",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Hiring Pipeline",
  },
  {
    pathPrefix: "/applications",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Applications Manager",
  },
  {
    pathPrefix: "/ai-screening",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "AI Candidate Screening",
  },
  {
    pathPrefix: "/messages",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Recruiter Communications",
  },
  {
    pathPrefix: "/interviews",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Recruiter Interviews",
  },
  {
    pathPrefix: "/reports",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Recruitment Reports",
  },
  {
    pathPrefix: "/settings",
    allowedRoles: [
      USER_ROLES.RECRUITER,
      USER_ROLES.HIRING_MANAGER,
      USER_ROLES.ORG_ADMIN,
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
    ],
    resourceType: "recruiter",
    resourceName: "Recruiter Settings",
  },
  // 3. Hiring Manager Workspace Area
  {
    pathPrefix: "/hiring-manager",
    allowedRoles: [USER_ROLES.HIRING_MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
    resourceType: "recruiter",
    resourceName: "Hiring Manager Workspace",
  },
  // 4. Candidate / Applicant Area
  {
    pathPrefix: "/applicant",
    allowedRoles: [USER_ROLES.APPLICANT],
    resourceType: "applicant",
    resourceName: "Candidate Portal",
  },
];

/**
 * Match a URL pathname against the centralized route access rules.
 */
export function getRouteAccessRule(pathname: string): RouteAccessRule | undefined {
  const cleanPath = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";

  // Match most specific prefix first
  const sortedRules = [...ROUTE_ACCESS_RULES].sort(
    (a, b) => b.pathPrefix.length - a.pathPrefix.length,
  );

  return sortedRules.find((rule) => {
    if (rule.pathPrefix === cleanPath) return true;
    if (cleanPath.startsWith(`${rule.pathPrefix}/`)) return true;
    return false;
  });
}

/**
 * Determine if a user's role has access to a specific route pathname.
 */
export function isUserAuthorizedForRoute(
  userRole: string | null | undefined,
  pathname: string,
): boolean {
  const rule = getRouteAccessRule(pathname);
  if (!rule) {
    // Unrestricted / public route
    return true;
  }
  return isRoleAllowed(userRole, rule.allowedRoles);
}

/**
 * Determine the default landing route for an authenticated user role.
 */
export function getDefaultRouteForRole(userRole: string | null | undefined): string {
  const norm = normalizeRole(userRole);
  switch (norm) {
    case USER_ROLES.ADMIN:
    case USER_ROLES.SUPER_ADMIN:
      return "/admin";
    case USER_ROLES.HIRING_MANAGER:
      return "/hiring-manager";
    case USER_ROLES.ORG_ADMIN:
    case USER_ROLES.RECRUITER:
    case USER_ROLES.INTERVIEWER:
      return "/dashboard";
    case USER_ROLES.APPLICANT:
      return "/applicant";
    default:
      return "/";
  }
}

/**
 * Get the workspace display label and route path for a role.
 */
export function getWorkspaceInfoForRole(userRole: string | null | undefined): {
  name: string;
  path: string;
} {
  const norm = normalizeRole(userRole);
  switch (norm) {
    case USER_ROLES.ADMIN:
    case USER_ROLES.SUPER_ADMIN:
      return { name: "Admin Console", path: "/admin" };
    case USER_ROLES.HIRING_MANAGER:
      return { name: "Hiring Manager Workspace", path: "/hiring-manager" };
    case USER_ROLES.ORG_ADMIN:
    case USER_ROLES.RECRUITER:
    case USER_ROLES.INTERVIEWER:
      return { name: "Recruiter Dashboard", path: "/dashboard" };
    case USER_ROLES.APPLICANT:
      return { name: "Candidate Portal", path: "/applicant" };
    default:
      return { name: "Home Page", path: "/" };
  }
}

/**
 * Context-aware authorization metadata for 403 pages based on attempted path and required roles.
 */
export function getResourceContext(
  attemptedPath: string = "/",
  explicitRequiredRole?: string,
): {
  isAdministrative: boolean;
  resourceType: "admin" | "recruiter" | "applicant" | "general";
  title: string;
  subtitle: string;
  description: string;
  requiredRoleLabel: string;
  securityNotice: string;
  suggestedDemoRole: "admin" | "recruiter" | "applicant";
} {
  const rule = getRouteAccessRule(attemptedPath);
  const cleanPath = attemptedPath.toLowerCase();

  const isExplicitAdmin =
    explicitRequiredRole &&
    (explicitRequiredRole.toUpperCase().includes("ADMIN") ||
      explicitRequiredRole.toUpperCase().includes("SUPER_ADMIN"));

  const isExplicitRecruiter =
    explicitRequiredRole &&
    (explicitRequiredRole.toUpperCase().includes("RECRUITER") ||
      explicitRequiredRole.toUpperCase().includes("HIRING_MANAGER"));

  const isExplicitApplicant =
    explicitRequiredRole && explicitRequiredRole.toUpperCase().includes("APPLICANT");

  if (rule?.resourceType === "admin" || cleanPath.startsWith("/admin") || isExplicitAdmin) {
    return {
      isAdministrative: true,
      resourceType: "admin",
      title: "Access Restricted",
      subtitle: "Administrative authorization required for this resource",
      description:
        "You do not have permission to view or manage the TalentTrack AI platform administrative console. Platform security policies restrict this area exclusively to accounts with verified Administrator credentials.",
      requiredRoleLabel: explicitRequiredRole?.toUpperCase() || "ADMIN",
      securityNotice:
        "All unauthorized access attempts to administrative endpoints are captured with timestamp and IP origin in the platform compliance log.",
      suggestedDemoRole: "admin",
    };
  }

  if (
    rule?.resourceType === "recruiter" ||
    cleanPath.startsWith("/dashboard") ||
    cleanPath.startsWith("/jobs") ||
    cleanPath.startsWith("/candidates") ||
    cleanPath.startsWith("/pipeline") ||
    cleanPath.startsWith("/applications") ||
    cleanPath.startsWith("/ai-screening") ||
    isExplicitRecruiter
  ) {
    return {
      isAdministrative: false,
      resourceType: "recruiter",
      title: "Access Restricted",
      subtitle: "Recruiter authorization required for this resource",
      description:
        "You do not have permission to access the TalentTrack AI recruiter dashboard and talent management tools. Access to this workspace requires Recruiter or Hiring Manager credentials.",
      requiredRoleLabel: explicitRequiredRole?.toUpperCase() || "RECRUITER",
      securityNotice:
        "Access to recruiter tools and candidate pipelines requires an authorized employer account.",
      suggestedDemoRole: "recruiter",
    };
  }

  if (
    rule?.resourceType === "applicant" ||
    cleanPath.startsWith("/applicant") ||
    isExplicitApplicant
  ) {
    return {
      isAdministrative: false,
      resourceType: "applicant",
      title: "Access Restricted",
      subtitle: "Applicant authorization required for this resource",
      description:
        "You do not have permission to access the TalentTrack AI candidate portal. Access to this area requires a registered Applicant account.",
      requiredRoleLabel: explicitRequiredRole?.toUpperCase() || "APPLICANT",
      securityNotice:
        "Access to job seeker profiles and personal applications requires an authenticated candidate account.",
      suggestedDemoRole: "applicant",
    };
  }

  return {
    isAdministrative: false,
    resourceType: "general",
    title: "Access Restricted",
    subtitle: "Elevated authorization required for this resource",
    description:
      "Your account is authenticated, but it does not have permission to access this resource. Please verify your permissions or contact your organization administrator.",
    requiredRoleLabel: explicitRequiredRole?.toUpperCase() || "AUTHORIZED ROLE",
    securityNotice:
      "Unauthorized access attempts are monitored and recorded to ensure platform data security.",
    suggestedDemoRole: "admin",
  };
}
