import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchAdminOrganizations,
  fetchAdminOrganizationById,
  createAdminOrganization,
  updateAdminOrganization,
  deleteAdminOrganization,
  createAdminDepartment,
  updateAdminDepartment,
  deleteAdminDepartment,
  assignAdminOrganizationMember,
} from "@/lib/admin-api";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  AssignMemberInput,
  OrganizationQueryParams,
} from "@/server/types/organization-types";

export const adminOrganizationsKeys = {
  all: ["admin", "organizations"] as const,
  list: (params: OrganizationQueryParams) => ["admin", "organizations", "list", params] as const,
  detail: (id: string) => ["admin", "organizations", "detail", id] as const,
};

export function useAdminOrganizations(params: OrganizationQueryParams = {}) {
  return useQuery({
    queryKey: adminOrganizationsKeys.list(params),
    queryFn: () => fetchAdminOrganizations(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useAdminOrganization(id: string | null) {
  return useQuery({
    queryKey: adminOrganizationsKeys.detail(id ?? ""),
    queryFn: () => fetchAdminOrganizationById(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganizationInput) => createAdminOrganization(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationInput }) =>
      updateAdminOrganization(id, data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.detail(variables.id) });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminOrganization(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateDepartmentInput;
    }) => createAdminDepartment(organizationId, data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
      void qc.invalidateQueries({
        queryKey: adminOrganizationsKeys.detail(variables.organizationId),
      });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      organizationId,
      data,
    }: {
      departmentId: string;
      organizationId: string;
      data: UpdateDepartmentInput;
    }) => updateAdminDepartment(departmentId, data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
      void qc.invalidateQueries({
        queryKey: adminOrganizationsKeys.detail(variables.organizationId),
      });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      organizationId,
    }: {
      departmentId: string;
      organizationId: string;
    }) => deleteAdminDepartment(departmentId),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
      void qc.invalidateQueries({
        queryKey: adminOrganizationsKeys.detail(variables.organizationId),
      });
    },
  });
}

export function useAssignMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: AssignMemberInput }) =>
      assignAdminOrganizationMember(organizationId, data),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: adminOrganizationsKeys.all });
      void qc.invalidateQueries({
        queryKey: adminOrganizationsKeys.detail(variables.organizationId),
      });
      // Invalidate users list as well since membership changed
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
