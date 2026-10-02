"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mail,
  Send,
  Search,
  Briefcase,
  User as UserIcon,
  MessageSquare,
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Building2,
  Check,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/auth/AuthProvider";
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
} from "@/hooks/api/useConversations";
import type { IConversation, IMessage } from "@/server/types/message-types";

export const Route = createFileRoute("/applicant/messages")({
  head: () => ({
    meta: [
      { title: "Messages — TalentTrack AI" },
      { name: "description", content: "Direct communication with hiring teams and recruiters." },
    ],
  }),
  component: ApplicantMessagesPage,
});

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToday) return timeString;
  if (isYesterday) return `Yesterday, ${timeString}`;

  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeString}`;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ApplicantMessagesPage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useConversations();

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useConversationMessages(selectedConversationId);

  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkConversationRead();

  // Automatically select first conversation on desktop if none selected and data available
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      const first = conversations[0];
      if (first?.id) {
        setSelectedConversationId(first.id);
      }
    }
  }, [conversations, selectedConversationId]);

  // Selected conversation object
  const activeConversation: IConversation | undefined = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId);
  }, [conversations, selectedConversationId]);

  // Mark conversation read on select
  useEffect(() => {
    if (selectedConversationId && activeConversation && (activeConversation.unreadCount ?? 0) > 0) {
      markReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId, activeConversation?.unreadCount]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const pName = c.participant?.name?.toLowerCase() || "";
      const pRole = c.participant?.role?.toLowerCase() || "";
      const pCompany = c.participant?.companyName?.toLowerCase() || "";
      const jTitle = c.job?.title?.toLowerCase() || "";
      const lastMsg = c.lastMessageText?.toLowerCase() || "";
      return (
        pName.includes(q) ||
        pRole.includes(q) ||
        pCompany.includes(q) ||
        jTitle.includes(q) ||
        lastMsg.includes(q)
      );
    });
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setShowMobileChat(true);
    // Mark as read
    markReadMutation.mutate(id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || !selectedConversationId || sendMessageMutation.isPending) return;

    if (trimmed.length > 3000) {
      toast.error("Message exceeds maximum length of 3000 characters.");
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        data: { text: trimmed },
      });
      setMessageText("");
      inputRef.current?.focus();
    } catch (err: any) {
      const msg = err?.message || "Message could not be sent. Please retry.";
      toast.error(msg);
    }
  };

  const isCurrentApplicantSender = (msg: IMessage): boolean => {
    if (user?.id && msg.senderId === user.id) return true;
    if (msg.sender?.role?.toUpperCase() === "APPLICANT") return true;
    return false;
  };

  return (
    <ApplicantLayout>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue shadow-xs">
                <Mail className="size-5" />
              </span>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  Recruiter Messages
                </h1>
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="h-5 px-2 text-xs font-semibold">
                    {totalUnread} new
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Direct, real-time messaging with hiring teams regarding your submitted applications.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchConversations()}
            disabled={isLoadingConversations}
            className="self-start sm:self-auto gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoadingConversations ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Main Messenger Container */}
        <div className="dashboard-card h-[calc(100vh-13.5rem)] min-h-[560px] max-h-[760px] flex overflow-hidden border border-border/80 rounded-xl bg-card shadow-xs">
          {/* ========================================================= */}
          {/* LEFT PANEL: Conversation List */}
          {/* ========================================================= */}
          <div
            className={`w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col border-r border-border bg-card transition-all duration-200 ${
              showMobileChat ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border/70 bg-card/60 backdrop-blur-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="h-9 pl-8.5 pr-3 text-xs bg-muted/30 focus-visible:ring-1 focus-visible:ring-brand-blue"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {isLoadingConversations ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg">
                      <Skeleton className="size-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isConversationsError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="size-8 text-destructive mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Unable to load conversations at this time.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchConversations()}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-muted mx-auto text-muted-foreground">
                    <MessageSquare className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">
                      {searchQuery ? "No matching conversations" : "No conversations yet"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                      {searchQuery
                        ? "Try refining your search terms."
                        : "Recruiters will be able to contact you here regarding your job applications."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Button asChild size="sm" variant="outline" className="text-xs mt-2">
                      <Link to="/applicant/applications">View My Applications</Link>
                    </Button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === selectedConversationId;
                  const hasUnread = (conv.unreadCount || 0) > 0;
                  const participantName = conv.participant?.name || "Hiring Team";
                  const roleLabel = conv.participant?.role || "Recruiter";
                  const initials =
                    conv.participant?.initials ||
                    participantName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) ||
                    "HR";

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 relative ${
                        isSelected
                          ? "bg-brand-blue/10 border-l-3 border-l-brand-blue"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`grid size-10 place-items-center rounded-full text-xs font-bold shadow-xs ${
                            isSelected
                              ? "bg-brand-blue text-primary-foreground"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {initials}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-brand-blue ring-2 ring-card" />
                        )}
                      </div>

                      {/* Info & Last Message */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4
                            className={`text-xs font-semibold truncate ${
                              hasUnread ? "text-foreground font-bold" : "text-foreground"
                            }`}
                          >
                            {participantName}
                          </h4>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 font-medium">
                            {formatRelativeTime(conv.lastMessageAt || conv.updatedAt)}
                          </span>
                        </div>

                        {/* Job Position Pill */}
                        {conv.job?.title && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate mb-1">
                            <Briefcase className="size-3 flex-shrink-0 text-brand-blue" />
                            <span className="truncate">{conv.job.title}</span>
                          </div>
                        )}

                        {/* Last Message Snippet */}
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-[11px] truncate leading-tight ${
                              hasUnread
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {conv.lastMessageText || "Started a new conversation"}
                          </p>
                          {hasUnread && (
                            <Badge
                              variant="default"
                              className="size-4.5 p-0 flex items-center justify-center rounded-full text-[10px] font-bold bg-brand-blue text-primary-foreground flex-shrink-0"
                            >
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT PANEL: Active Conversation Chat Thread */}
          {/* ========================================================= */}
          <div
            className={`flex-1 flex flex-col bg-muted/5 min-w-0 ${
              !showMobileChat ? "hidden md:flex" : "flex"
            }`}
          >
            {activeConversation ? (
              <>
                {/* Thread Top Bar */}
                <div className="p-3.5 border-b border-border bg-card/90 backdrop-blur-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMobileChat(false)}
                      className="md:hidden size-8 p-0"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>

                    <div className="grid size-9 place-items-center rounded-full bg-brand-blue/15 text-brand-blue font-bold text-xs flex-shrink-0 border border-brand-blue/20">
                      {activeConversation.participant?.initials ||
                        activeConversation.participant?.name?.charAt(0) ||
                        "R"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-semibold text-foreground truncate">
                          {activeConversation.participant?.name || "Recruiter"}
                        </strong>
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 py-0 font-medium">
                          {activeConversation.participant?.role || "Recruiter"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate mt-0.5">
                        {activeConversation.participant?.companyName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-2.5" />
                            {activeConversation.participant.companyName}
                          </span>
                        )}
                        {activeConversation.job?.title && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate text-foreground/80 font-medium">
                              <Briefcase className="size-2.5 text-brand-blue" />
                              {activeConversation.job.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeConversation.job?.id && (
                    <Button asChild variant="outline" size="sm" className="hidden sm:flex h-7 px-2.5 text-[11px] gap-1">
                      <Link to="/applicant/jobs/$jobId" params={{ jobId: activeConversation.job.id }}>
                        Job Details
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-muted/15">
                  {isLoadingMessages ? (
                    <div className="space-y-4 p-2">
                      <div className="flex items-start gap-2 max-w-[70%]">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-14 w-60 rounded-2xl" />
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <Skeleton className="h-12 w-48 rounded-2xl" />
                      </div>
                      <div className="flex items-start gap-2 max-w-[70%]">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-10 w-52 rounded-2xl" />
                      </div>
                    </div>
                  ) : isMessagesError ? (
                    <div className="p-8 text-center space-y-2">
                      <AlertCircle className="size-7 text-destructive mx-auto" />
                      <p className="text-xs text-muted-foreground">Unable to load messages.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetchMessages()}
                        className="text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                      <MessageSquare className="size-8 text-muted-foreground/60" />
                      <p className="text-xs font-medium text-foreground">No messages yet</p>
                      <p className="text-[11px] max-w-[260px] leading-relaxed">
                        Send a message below to connect with {activeConversation.participant?.name || "the hiring team"}.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = isCurrentApplicantSender(m);
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${
                            isMe ? "items-end" : "items-start"
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground mb-1 px-1.5 font-medium">
                            {isMe ? "You" : m.sender?.name || activeConversation.participant?.name || "Recruiter"}
                          </span>

                          <div
                            className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed break-words shadow-xs ${
                              isMe
                                ? "bg-brand-blue text-primary-foreground rounded-br-xs font-normal"
                                : "bg-card text-foreground rounded-bl-xs border border-border/80"
                            }`}
                          >
                            {m.text}
                          </div>

                          <div className="flex items-center gap-1 mt-1 px-1.5 text-[9.5px] text-muted-foreground">
                            <span>{formatTime(m.createdAt)}</span>
                            {isMe && (
                              <span>
                                {m.readAt ? (
                                  <CheckCheck className="size-3 text-brand-blue" />
                                ) : (
                                  <Check className="size-3 text-muted-foreground" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-border bg-card flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Type your reply to ${activeConversation.participant?.name || "recruiter"}...`}
                      disabled={sendMessageMutation.isPending}
                      maxLength={3000}
                      className="h-10 rounded-lg border border-input bg-card px-3 text-xs outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="h-10 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-medium flex items-center gap-1.5"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="size-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              /* No Conversation Selected Placeholder */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                  <Mail className="size-7" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Select a conversation</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
                  Choose a conversation from the left sidebar to view message history and send replies.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ApplicantLayout>
  );
}
