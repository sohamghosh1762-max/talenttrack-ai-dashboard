import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  IConversation,
  IMessage,
  CreateConversationInput,
  SendMessageInput,
  ConversationQueryParams,
  MessageQueryParams,
} from "../../server/types/message-types.ts";

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  list: (params?: ConversationQueryParams) => [...conversationKeys.lists(), params ?? {}] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (conversationId: string, params?: MessageQueryParams) =>
    [...conversationKeys.detail(conversationId), "messages", params ?? {}] as const,
  unreadCount: () => [...conversationKeys.all, "unread-count"] as const,
};

/**
 * Hook to retrieve user's conversations list
 */
export function useConversations(
  params?: ConversationQueryParams,
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  return useQuery<IConversation[]>({
    queryKey: conversationKeys.list(params),
    queryFn: async () => {
      const res = await apiClient.get<IConversation[]>("/api/conversations", {
        params: params as Record<string, string | number>,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? 15_000,
    staleTime: 10_000,
  });
}

/**
 * Hook to retrieve a single conversation by ID
 */
export function useConversation(
  id: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery<IConversation>({
    queryKey: conversationKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Conversation ID is required");
      return apiClient.get<IConversation>(`/api/conversations/${id}`);
    },
    enabled: Boolean(id) && (options.enabled ?? true),
    staleTime: 10_000,
  });
}

/**
 * Hook to retrieve messages for a specific conversation
 */
export function useConversationMessages(
  conversationId: string | null | undefined,
  params?: MessageQueryParams,
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  return useQuery<IMessage[]>({
    queryKey: conversationKeys.messages(conversationId || "", params),
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiClient.get<IMessage[]>(`/api/conversations/${conversationId}/messages`, {
        params: params as Record<string, string | number>,
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: Boolean(conversationId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? 5_000,
    staleTime: 2_000,
  });
}

/**
 * Hook to send a message in a conversation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<IMessage, Error, { conversationId: string; data: SendMessageInput }>({
    mutationFn: async ({ conversationId, data }) => {
      return apiClient.post<IMessage>(`/api/conversations/${conversationId}/messages`, data);
    },
    onSuccess: (newMessage, variables) => {
      // Invalidate message list for this conversation
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(variables.conversationId),
      });
      // Invalidate conversations list so lastMessage & ordering updates
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}

/**
 * Hook to mark conversation messages as read
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation<{ markedCount: number }, Error, string>({
    mutationFn: async (conversationId) => {
      return apiClient.patch<{ markedCount: number }>(`/api/conversations/${conversationId}/read`);
    },
    onSuccess: (_, conversationId) => {
      // Invalidate conversation & list to update unread counts
      queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}

/**
 * Hook to create or find a conversation for an application / job
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation<IConversation, Error, CreateConversationInput>({
    mutationFn: async (input) => {
      return apiClient.post<IConversation>("/api/conversations", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}
