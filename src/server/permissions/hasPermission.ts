import { type Permission } from "./definitions.ts";
import { ROLE_PERMISSIONS, normalizeRole } from "./roles.ts";

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const normalized = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS[role.toUpperCase()] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role possesses ANY of the specified permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

/**
 * Check if a role possesses ALL of the specified permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

/**
 * Retrieve all granted permissions for a given role
 */
export function getRolePermissions(role: string): Permission[] {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS[role.toUpperCase()] || [];
}
