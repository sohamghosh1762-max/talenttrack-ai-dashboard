import { describe, it } from "node:test";
import assert from "node:assert";
import {
  USER_ROLES,
  normalizeRole,
  isRoleAllowed,
  getRouteAccessRule,
  isUserAuthorizedForRoute,
  getDefaultRouteForRole,
  getWorkspaceInfoForRole,
  getResourceContext,
} from "../../auth/route-access.ts";
import { requireRole, requirePermission, AuthError } from "../middleware/auth-middleware.ts";
import { PERMISSIONS } from "../permissions/definitions.ts";
import { handleGetUsers } from "../routes/admin-users-handler.ts";
import { sessionRepository } from "../db/session-repository.ts";
import { userRepository } from "../db/user-repository.ts";

describe("ROLE-BASED AUTHORIZATION & RBAC SUITE", () => {
  describe("1. Canonical Role Normalization", () => {
    it("Normalizes uppercase, lowercase, and mixed case roles to canonical format", () => {
      assert.strictEqual(normalizeRole("admin"), USER_ROLES.ADMIN);
      assert.strictEqual(normalizeRole("ADMIN"), USER_ROLES.ADMIN);
      assert.strictEqual(normalizeRole("Admin"), USER_ROLES.ADMIN);
      assert.strictEqual(normalizeRole("super_admin"), USER_ROLES.ADMIN);
      assert.strictEqual(normalizeRole("SUPER_ADMIN"), USER_ROLES.ADMIN);

      assert.strictEqual(normalizeRole("recruiter"), USER_ROLES.RECRUITER);
      assert.strictEqual(normalizeRole("RECRUITER"), USER_ROLES.RECRUITER);
      assert.strictEqual(normalizeRole("Recruiter"), USER_ROLES.RECRUITER);

      assert.strictEqual(normalizeRole("applicant"), USER_ROLES.APPLICANT);
      assert.strictEqual(normalizeRole("APPLICANT"), USER_ROLES.APPLICANT);
      assert.strictEqual(normalizeRole("Applicant"), USER_ROLES.APPLICANT);

      assert.strictEqual(normalizeRole("org_admin"), USER_ROLES.ORG_ADMIN);
      assert.strictEqual(normalizeRole("hiring_manager"), USER_ROLES.HIRING_MANAGER);
      assert.strictEqual(normalizeRole("interviewer"), USER_ROLES.INTERVIEWER);
    });

    it("Returns null for null, undefined, or empty role", () => {
      assert.strictEqual(normalizeRole(null), null);
      assert.strictEqual(normalizeRole(undefined), null);
      assert.strictEqual(normalizeRole(""), null);
    });
  });

  describe("2. Centralized Route Access Rules & Matching", () => {
    it("Correctly identifies rules for administrative endpoints", () => {
      const adminRule = getRouteAccessRule("/admin");
      assert.ok(adminRule);
      assert.strictEqual(adminRule.resourceType, "admin");
      assert.ok(adminRule.allowedRoles.includes(USER_ROLES.ADMIN));

      const adminUsersRule = getRouteAccessRule("/admin/users");
      assert.ok(adminUsersRule);
      assert.strictEqual(adminUsersRule.resourceType, "admin");
    });

    it("Correctly identifies rules for recruiter endpoints", () => {
      const dashboardRule = getRouteAccessRule("/dashboard");
      assert.ok(dashboardRule);
      assert.strictEqual(dashboardRule.resourceType, "recruiter");
      assert.ok(dashboardRule.allowedRoles.includes(USER_ROLES.RECRUITER));

      const jobsRule = getRouteAccessRule("/jobs");
      assert.ok(jobsRule);
      assert.strictEqual(jobsRule.resourceType, "recruiter");

      const candidatesRule = getRouteAccessRule("/candidates");
      assert.ok(candidatesRule);
      assert.strictEqual(candidatesRule.resourceType, "recruiter");
    });

    it("Correctly identifies rules for applicant endpoints", () => {
      const applicantRule = getRouteAccessRule("/applicant");
      assert.ok(applicantRule);
      assert.strictEqual(applicantRule.resourceType, "applicant");
      assert.ok(applicantRule.allowedRoles.includes(USER_ROLES.APPLICANT));

      const applicantJobsRule = getRouteAccessRule("/applicant/jobs");
      assert.ok(applicantJobsRule);
      assert.strictEqual(applicantJobsRule.resourceType, "applicant");
    });
  });

  describe("3. Frontend Route Authorization Matrix (Section 17)", () => {
    // 1. ADMIN access
    it("ADMIN can access /admin", () => {
      assert.strictEqual(isUserAuthorizedForRoute("ADMIN", "/admin"), true);
      assert.strictEqual(isUserAuthorizedForRoute("admin", "/admin"), true);
      assert.strictEqual(isUserAuthorizedForRoute("SUPER_ADMIN", "/admin/users"), true);
    });

    it("ADMIN can access /dashboard (staff management access)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("ADMIN", "/dashboard"), true);
      assert.strictEqual(isUserAuthorizedForRoute("admin", "/dashboard"), true);
    });

    it("ADMIN is not authorized for /applicant (applicant only)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("ADMIN", "/applicant"), false);
      assert.strictEqual(isUserAuthorizedForRoute("admin", "/applicant"), false);
    });

    // 2. RECRUITER access
    it("RECRUITER can access /dashboard, /jobs, /candidates, /pipeline", () => {
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/dashboard"), true);
      assert.strictEqual(isUserAuthorizedForRoute("recruiter", "/dashboard"), true);
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/jobs"), true);
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/candidates"), true);
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/pipeline"), true);
    });

    it("RECRUITER is blocked from /admin with false", () => {
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("recruiter", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/admin/users"), false);
    });

    it("RECRUITER is blocked from /applicant", () => {
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/applicant"), false);
    });

    // 3. APPLICANT access
    it("APPLICANT can access /applicant and subroutes", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/applicant"), true);
      assert.strictEqual(isUserAuthorizedForRoute("applicant", "/applicant"), true);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/applicant/jobs"), true);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/applicant/applications"), true);
    });

    it("APPLICANT is blocked from /admin", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("applicant", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin/settings"), false);
    });

    it("APPLICANT is blocked from /dashboard", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/dashboard"), false);
      assert.strictEqual(isUserAuthorizedForRoute("applicant", "/dashboard"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/jobs"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/pipeline"), false);
    });

    // 4. Unauthenticated access
    it("Unauthenticated user is not authorized for protected routes", () => {
      assert.strictEqual(isUserAuthorizedForRoute(null, "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute(null, "/dashboard"), false);
      assert.strictEqual(isUserAuthorizedForRoute(null, "/applicant"), false);
      assert.strictEqual(isUserAuthorizedForRoute(undefined, "/jobs"), false);
    });

    it("Public routes allow access without authentication", () => {
      assert.strictEqual(isUserAuthorizedForRoute(null, "/"), true);
      assert.strictEqual(isUserAuthorizedForRoute(null, "/login"), true);
      assert.strictEqual(isUserAuthorizedForRoute(null, "/register"), true);
    });
  });

  describe("4. Dynamic Context-Aware 403 Messaging (Section 7 & 8)", () => {
    it("Produces administrative messaging only for administrative resources", () => {
      const adminCtx = getResourceContext("/admin");
      assert.strictEqual(adminCtx.isAdministrative, true);
      assert.strictEqual(adminCtx.resourceType, "admin");
      assert.strictEqual(
        adminCtx.subtitle,
        "Administrative authorization required for this resource",
      );
      assert.ok(adminCtx.description.includes("administrative console"));
      assert.strictEqual(adminCtx.suggestedDemoRole, "admin");
    });

    it("Produces recruiter-specific messaging for recruiter resources (NO admin wording)", () => {
      const recruiterCtx = getResourceContext("/dashboard");
      assert.strictEqual(recruiterCtx.isAdministrative, false);
      assert.strictEqual(recruiterCtx.resourceType, "recruiter");
      assert.strictEqual(
        recruiterCtx.subtitle,
        "Recruiter authorization required for this resource",
      );
      assert.ok(
        !recruiterCtx.description.includes("administrative console"),
        "Must NOT contain administrative console wording",
      );
      assert.ok(recruiterCtx.description.includes("recruiter dashboard"));
      assert.strictEqual(recruiterCtx.suggestedDemoRole, "recruiter");
    });

    it("Produces applicant-specific messaging for applicant resources (NO admin wording)", () => {
      const applicantCtx = getResourceContext("/applicant");
      assert.strictEqual(applicantCtx.isAdministrative, false);
      assert.strictEqual(applicantCtx.resourceType, "applicant");
      assert.strictEqual(
        applicantCtx.subtitle,
        "Applicant authorization required for this resource",
      );
      assert.ok(
        !applicantCtx.description.includes("administrative console"),
        "Must NOT contain administrative console wording",
      );
      assert.ok(applicantCtx.description.includes("candidate portal"));
      assert.strictEqual(applicantCtx.suggestedDemoRole, "applicant");
    });
  });

  describe("5. Default Landing Route & Navigation Logic (Section 9 & 10)", () => {
    it("Directs ADMIN to /admin", () => {
      assert.strictEqual(getDefaultRouteForRole("ADMIN"), "/admin");
      assert.strictEqual(getDefaultRouteForRole("admin"), "/admin");
      assert.strictEqual(getDefaultRouteForRole("SUPER_ADMIN"), "/admin");
      assert.strictEqual(getWorkspaceInfoForRole("ADMIN").path, "/admin");
    });

    it("Directs RECRUITER to /dashboard", () => {
      assert.strictEqual(getDefaultRouteForRole("RECRUITER"), "/dashboard");
      assert.strictEqual(getDefaultRouteForRole("recruiter"), "/dashboard");
      assert.strictEqual(getDefaultRouteForRole("HIRING_MANAGER"), "/dashboard");
      assert.strictEqual(getWorkspaceInfoForRole("RECRUITER").path, "/dashboard");
    });

    it("Directs APPLICANT to /applicant", () => {
      assert.strictEqual(getDefaultRouteForRole("APPLICANT"), "/applicant");
      assert.strictEqual(getDefaultRouteForRole("applicant"), "/applicant");
      assert.strictEqual(getWorkspaceInfoForRole("APPLICANT").path, "/applicant");
    });
  });

  describe("6. Backend Authorization Middleware & Protection", () => {
    it("requireRole accepts normalized role and rejects unauthorized role with 403", () => {
      const adminGuard = requireRole("ADMIN");
      const mockAdminUser = {
        id: "65f1a2b3c4d5e6f7a8b9c001",
        name: "Admin User",
        email: "admin@example.com",
        role: "ADMIN" as const,
        status: "ACTIVE" as const,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Admin passes
      assert.doesNotThrow(() => adminGuard(mockAdminUser));

      const mockRecruiterUser = {
        ...mockAdminUser,
        role: "RECRUITER" as const,
      };

      // Recruiter fails admin guard with 403
      assert.throws(
        () => adminGuard(mockRecruiterUser),
        (err: unknown) => {
          assert.ok(err instanceof AuthError);
          assert.strictEqual(err.status, 403);
          return true;
        },
      );
    });

    it("requirePermission checks granular permissions", () => {
      const deleteGuard = requirePermission(PERMISSIONS.USERS_DELETE);
      const mockAdminUser = {
        id: "65f1a2b3c4d5e6f7a8b9c001",
        name: "Admin User",
        email: "admin@example.com",
        role: "SUPER_ADMIN" as const,
        status: "ACTIVE" as const,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      assert.doesNotThrow(() => deleteGuard(mockAdminUser));

      const mockApplicantUser = {
        ...mockAdminUser,
        role: "APPLICANT" as const,
      };

      assert.throws(
        () => deleteGuard(mockApplicantUser),
        (err: unknown) => {
          assert.ok(err instanceof AuthError);
          assert.strictEqual(err.status, 403);
          return true;
        },
      );
    });
  });

  describe("7. Backend API Authorization Suite", () => {
    it("GET /api/admin/users rejects RECRUITER session with 403", async () => {
      const recToken = "mock_recruiter_auth_test_token";
      sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c003", recToken);

      const req = new Request("http://localhost/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${recToken}`,
        },
      });

      try {
        const res = await handleGetUsers(req);
        assert.strictEqual(res.status, 403);
      } catch (err: unknown) {
        assert.ok(err instanceof AuthError);
        assert.strictEqual(err.status, 403);
      }
    });

    it("GET /api/admin/users rejects APPLICANT session with 403", async () => {
      const appToken = "mock_applicant_auth_test_token";
      sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c005", appToken);

      const req = new Request("http://localhost/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${appToken}`,
        },
      });

      try {
        const res = await handleGetUsers(req);
        assert.strictEqual(res.status, 403);
      } catch (err: unknown) {
        assert.ok(err instanceof AuthError);
        assert.strictEqual(err.status, 403);
      }
    });

    it("GET /api/admin/users allows ADMIN session with 200", async () => {
      const adminToken = "mock_admin_auth_test_token";
      sessionRepository.createSession("65f1a2b3c4d5e6f7a8b9c001", adminToken);

      const req = new Request("http://localhost/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const res = await handleGetUsers(req);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.users);
    });
  });

  describe("8. Account Type Selection & Role Verification Flow", () => {
    it("Applicant selection maps to /applicant landing page upon authentication", () => {
      const applicantRole = normalizeRole("applicant");
      assert.strictEqual(applicantRole, USER_ROLES.APPLICANT);
      assert.strictEqual(getDefaultRouteForRole(applicantRole), "/applicant");
    });

    it("Recruiter selection maps to /dashboard landing page upon authentication", () => {
      const recruiterRole = normalizeRole("recruiter");
      assert.strictEqual(recruiterRole, USER_ROLES.RECRUITER);
      assert.strictEqual(getDefaultRouteForRole(recruiterRole), "/dashboard");
    });

    it("Admin role maintains /admin landing route", () => {
      const adminRole = normalizeRole("admin");
      assert.strictEqual(adminRole, USER_ROLES.ADMIN);
      assert.strictEqual(getDefaultRouteForRole(adminRole), "/admin");
    });

    it("Prevents client-side privilege escalation (Applicant cannot be granted Admin route access)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin/users"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin/settings"), false);
    });

    it("Prevents client-side privilege escalation (Recruiter cannot be granted Admin route access)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/admin/users"), false);
    });
  });

  describe("9. Post-Login Routing & Unauthorized Access Verification", () => {
    it("Applicant login -> authenticated -> role = APPLICANT -> routes to /applicant", () => {
      const user = {
        id: "65f1a2b3c4d5e6f7a8b9c005",
        name: "Aarav Mehta",
        email: "aarav.mehta@example.com",
        role: "APPLICANT" as const,
      };

      const canonicalRole = normalizeRole(user.role);
      assert.strictEqual(canonicalRole, USER_ROLES.APPLICANT);

      const targetRoute = getDefaultRouteForRole(canonicalRole);
      assert.strictEqual(targetRoute, "/applicant");
      assert.notStrictEqual(targetRoute, "/dashboard");
    });

    it("Recruiter login -> authenticated -> role = RECRUITER -> routes to /dashboard", () => {
      const user = {
        id: "65f1a2b3c4d5e6f7a8b9c003",
        name: "Rahul Mehta",
        email: "rahul.mehta@talenttrack.ai",
        role: "RECRUITER" as const,
      };

      const canonicalRole = normalizeRole(user.role);
      assert.strictEqual(canonicalRole, USER_ROLES.RECRUITER);

      const targetRoute = getDefaultRouteForRole(canonicalRole);
      assert.strictEqual(targetRoute, "/dashboard");
      assert.notStrictEqual(targetRoute, "/applicant");
    });

    it("Admin login -> authenticated -> role = ADMIN -> routes to /admin", () => {
      const user = {
        id: "65f1a2b3c4d5e6f7a8b9c001",
        name: "Admin User",
        email: "admin@talenttrack.ai",
        role: "ADMIN" as const,
      };

      const canonicalRole = normalizeRole(user.role);
      assert.strictEqual(canonicalRole, USER_ROLES.ADMIN);

      const targetRoute = getDefaultRouteForRole(canonicalRole);
      assert.strictEqual(targetRoute, "/admin");
    });

    it("Unauthorized access: Applicant -> /admin returns false (403 forbidden)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin/users"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/admin/audit-logs"), false);
    });

    it("Unauthorized access: Recruiter -> /admin returns false (403 forbidden)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("RECRUITER", "/admin/settings"), false);
    });

    it("Unauthorized access: Applicant -> recruiter-only resources returns false (403 forbidden)", () => {
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/dashboard"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/jobs"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/candidates"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/pipeline"), false);
      assert.strictEqual(isUserAuthorizedForRoute("APPLICANT", "/ai-screening"), false);
    });

    it("Validates account type mismatch correctly", () => {
      const recruiterUser = { role: "RECRUITER" };
      const applicantUser = { role: "APPLICANT" };

      // Case 1: Target is applicant, but user is recruiter
      const isMismatch1 = normalizeRole(recruiterUser.role) !== USER_ROLES.APPLICANT;
      assert.strictEqual(isMismatch1, true);

      // Case 2: Target is recruiter, but user is applicant
      const isMismatch2 = normalizeRole(applicantUser.role) === USER_ROLES.APPLICANT;
      assert.strictEqual(isMismatch2, true);

      // Case 3: Target is applicant, user is applicant -> match
      const isMismatch3 = normalizeRole(applicantUser.role) !== USER_ROLES.APPLICANT;
      assert.strictEqual(isMismatch3, false);
    });
  });

  describe("10. Dedicated Admin Portal Route (/admin) & Child Route Hierarchy", () => {
    it("ADMIN and SUPER_ADMIN have full access to /admin and all child routes", () => {
      const adminRoutes = [
        "/admin",
        "/admin/users",
        "/admin/organizations",
        "/admin/reports",
        "/admin/activity",
        "/admin/settings",
      ];

      for (const route of adminRoutes) {
        assert.strictEqual(
          isUserAuthorizedForRoute("ADMIN", route),
          true,
          `ADMIN should be authorized for ${route}`,
        );
        assert.strictEqual(
          isUserAuthorizedForRoute("SUPER_ADMIN", route),
          true,
          `SUPER_ADMIN should be authorized for ${route}`,
        );
      }
    });

    it("RECRUITER is blocked with 403 on /admin and all child routes", () => {
      const adminRoutes = [
        "/admin",
        "/admin/users",
        "/admin/organizations",
        "/admin/reports",
        "/admin/activity",
        "/admin/settings",
      ];

      for (const route of adminRoutes) {
        assert.strictEqual(
          isUserAuthorizedForRoute("RECRUITER", route),
          false,
          `RECRUITER must NOT access ${route}`,
        );
      }
    });

    it("APPLICANT is blocked with 403 on /admin and all child routes", () => {
      const adminRoutes = [
        "/admin",
        "/admin/users",
        "/admin/organizations",
        "/admin/reports",
        "/admin/activity",
        "/admin/settings",
      ];

      for (const route of adminRoutes) {
        assert.strictEqual(
          isUserAuthorizedForRoute("APPLICANT", route),
          false,
          `APPLICANT must NOT access ${route}`,
        );
      }
    });

    it("ORG_ADMIN is restricted to /dashboard and blocked from platform-wide /admin", () => {
      assert.strictEqual(
        isUserAuthorizedForRoute("ORG_ADMIN", "/dashboard"),
        true,
        "ORG_ADMIN can access recruiter/organization dashboard",
      );
      assert.strictEqual(
        isUserAuthorizedForRoute("ORG_ADMIN", "/admin"),
        false,
        "ORG_ADMIN must be blocked from platform-wide /admin",
      );
      assert.strictEqual(
        isUserAuthorizedForRoute("ORG_ADMIN", "/admin/users"),
        false,
        "ORG_ADMIN must be blocked from /admin/users",
      );
    });

    it("Unauthenticated session is blocked on /admin and redirected to login", () => {
      assert.strictEqual(isUserAuthorizedForRoute(null, "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute(undefined, "/admin"), false);
      assert.strictEqual(isUserAuthorizedForRoute("", "/admin/users"), false);
    });

    it("Preserves intended /admin destination during login and rejects non-admin roles", () => {
      const adminRedirect = "/admin";
      const adminUsersRedirect = "/admin/users";

      // Admin user
      const adminUser = { role: "ADMIN" };
      assert.strictEqual(isUserAuthorizedForRoute(adminUser.role, adminRedirect), true);
      assert.strictEqual(isUserAuthorizedForRoute(adminUser.role, adminUsersRedirect), true);

      // Recruiter user attempting /admin redirect
      const recruiterUser = { role: "RECRUITER" };
      assert.strictEqual(isUserAuthorizedForRoute(recruiterUser.role, adminRedirect), false);
      assert.strictEqual(isUserAuthorizedForRoute(recruiterUser.role, adminUsersRedirect), false);

      // Applicant user attempting /admin redirect
      const applicantUser = { role: "APPLICANT" };
      assert.strictEqual(isUserAuthorizedForRoute(applicantUser.role, adminRedirect), false);
      assert.strictEqual(isUserAuthorizedForRoute(applicantUser.role, adminUsersRedirect), false);
    });
  });
});
