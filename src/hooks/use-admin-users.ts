import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchAdminUsers,
  fetchAdminUserById,
  fetchAdminUserActivity,
  updateAdminUserStatus,
  bulkUpdateAdminUserStatus,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUsersQueryParams,
} from "@/lib/admin-api";
import type { UserStatus, CreateUserInput, UpdateUserInput } from "@/server/types/user-types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const adminUsersKeys = {
  all: ["admin", "users"] as const,
  list: (params: AdminUsersQueryParams) => ["admin", "users", "list", params] as const,
  detail: (id: string) => ["admin", "users", "detail", id] as const,
  activity: (id: string) => ["admin", "users", "activity", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Paginated & filtered user list
 */
export function useAdminUsers(params: AdminUsersQueryParams = {}) {
  return useQuery({
    queryKey: adminUsersKeys.list(params),
    queryFn: () => fetchAdminUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 s — admin data doesn't need to be ultra-fresh
    retry: 2,
  });
}

/**
 * Single user detail
 */
export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: adminUsersKeys.detail(id ?? ""),
    queryFn: () => fetchAdminUserById(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Single user activity log
 */
export function useAdminUserActivity(id: string | null) {
  return useQuery({
    queryKey: adminUsersKeys.activity(id ?? ""),
    queryFn: () => fetchAdminUserActivity(id!),
    enabled: !!id,
    staleTime: 10_000,
    retry: 1,
  });
}

/**
 * Status mutation — invalidates the user list on success
 */
export function useUpdateUserStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateAdminUserStatus(id, status),

    onSuccess: (data) => {
      // Invalidate the list so counts & rows refresh
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all });
      // Update the cached detail for the affected user immediately
      qc.setQueryData(adminUsersKeys.detail(data.user.id), { user: data.user });
    },
  });
}

/**
 * Bulk status mutation — invalidates all user list and detail queries
 */
export function useBulkUpdateUserStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ userIds, status }: { userIds: string[]; status: UserStatus }) =>
      bulkUpdateAdminUserStatus(userIds, status),

    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });
}

/**
 * Create user mutation
 */
export function useCreateAdminUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => createAdminUser(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });
}

/**
 * Update user mutation
 */
export function useUpdateAdminUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => updateAdminUser(id, data),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all });
      qc.setQueryData(adminUsersKeys.detail(data.user.id), { user: data.user });
    },
  });
}

/**
 * Delete user mutation
 */
export function useDeleteAdminUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });
}
