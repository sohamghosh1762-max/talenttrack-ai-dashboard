"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Send, Search, CheckCheck, Paperclip, Smile, User } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Recruiter Messages & Inbox — TalentTrack AI" },
      { name: "description", content: "Manage recruiter and candidate communication." },
    ],
  }),
  component: MessagesPage,
});

interface MessageThread {
  id: string;
  candidateName: string;
  job: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: { sender: "candidate" | "recruiter"; text: string; time: string }[];
}

const initialThreads: MessageThread[] = [
  {
    id: "thread-1",
    candidateName: "Aarav Mehta",
    job: "Frontend Developer",
    initials: "AM",
    lastMessage:
      "Thanks for the update! I am available on Thursday afternoon for the technical round.",
    time: "10:45 AM",
    unread: true,
    messages: [
      {
        sender: "recruiter",
        text: "Hi Aarav, our engineering team reviewed your profile and would love to schedule a 45-minute technical discussion.",
        time: "10:20 AM",
      },
      {
        sender: "candidate",
        text: "Thanks for the update! I am available on Thursday afternoon for the technical round.",
        time: "10:45 AM",
      },
    ],
  },
  {
    id: "thread-2",
    candidateName: "Priya Nair",
    job: "AI/ML Engineer",
    initials: "PN",
    lastMessage: "I have uploaded the updated portfolio links as requested.",
    time: "Yesterday",
    unread: true,
    messages: [
      {
        sender: "recruiter",
        text: "Hello Priya, could you share the link to your latest Hugging Face or GitHub research repo?",
        time: "Yesterday 2:15 PM",
      },
      {
        sender: "candidate",
        text: "I have uploaded the updated portfolio links as requested.",
        time: "Yesterday 4:30 PM",
      },
    ],
  },
  {
    id: "thread-3",
    candidateName: "Rohit Singh",
    job: "Backend Developer",
    initials: "RS",
    lastMessage: "Looking forward to speaking with the team today.",
    time: "Sep 13",
    unread: false,
    messages: [
      {
        sender: "recruiter",
        text: "Your interview is confirmed for Monday at 3:00 PM PST.",
        time: "Sep 13 9:00 AM",
      },
      {
        sender: "candidate",
        text: "Looking forward to speaking with the team today.",
        time: "Sep 13 11:30 AM",
      },
    ],
  },
];

function MessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>("thread-1");
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMsg = {
      sender: "recruiter" as const,
      text: replyText,
      time: "Just now",
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              messages: [...t.messages, newMsg],
              lastMessage: replyText,
              time: "Just now",
            }
          : t,
      ),
    );
    setReplyText("");
  };

  const filteredThreads = threads.filter((t) =>
    t.candidateName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header Section */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-peach text-brand-red">
                <Mail className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Messages</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Manage recruiter and candidate communication.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-red/10 px-3 py-1.5 text-xs font-semibold text-brand-red border border-brand-red/20">
              2 Unread Messages
            </span>
          </div>
        </section>

        {/* Messaging Interface */}
        <div className="dashboard-card grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] h-[620px] overflow-hidden">
          {/* Threads List Sidebar */}
          <div className="border-r border-border flex flex-col h-full bg-muted/20">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="h-8.5 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-xs outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setThreads((prev) =>
                      prev.map((t) => (t.id === thread.id ? { ...t, unread: false } : t)),
                    );
                  }}
                  className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                    activeThreadId === thread.id
                      ? "bg-surface-blue/70 border-l-4 border-l-brand-blue"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="grid size-9 place-items-center rounded-full bg-brand-blue text-xs font-bold text-primary-foreground shrink-0">
                    {thread.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-foreground truncate">
                        {thread.candidateName}
                      </strong>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {thread.time}
                      </span>
                    </div>
                    <div className="text-[10.5px] font-medium text-brand-blue truncate">
                      {thread.job}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                      {thread.lastMessage}
                    </p>
                  </div>
                  {thread.unread && (
                    <span className="size-2 rounded-full bg-brand-red shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Chat Window */}
          {activeThread ? (
            <div className="flex flex-col h-full bg-card">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-border bg-panel-head/50">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-brand-blue text-xs font-bold text-primary-foreground">
                    {activeThread.initials}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      {activeThread.candidateName}
                    </h3>
                    <span className="text-[10.5px] text-muted-foreground">{activeThread.job}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <User className="size-3 mr-1" />
                    Candidate Profile
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-muted/10">
                {activeThread.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      msg.sender === "recruiter" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.sender === "recruiter"
                          ? "bg-brand-blue text-primary-foreground rounded-br-xs"
                          : "bg-muted text-foreground rounded-bl-xs border border-border/70"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9.5px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                      {msg.time}
                      {msg.sender === "recruiter" && (
                        <CheckCheck className="size-3 text-brand-blue" />
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Message Reply Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-border bg-card flex items-center gap-2"
              >
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1.5"
                  aria-label="Attach document"
                >
                  <Paperclip className="size-4" />
                </button>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a response to candidate..."
                  className="flex-1 h-9 rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 px-3.5 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground"
                >
                  <Send className="size-3.5" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
