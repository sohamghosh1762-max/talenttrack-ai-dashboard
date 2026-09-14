"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Paperclip, Send } from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/applicant/messages")({
  head: () => ({
    meta: [
      { title: "Candidate Messages — TalentTrack AI" },
      { name: "description", content: "Chat with recruiters and hiring managers." },
    ],
  }),
  component: ApplicantMessagesPage,
});

function ApplicantMessagesPage() {
  const [messages, setMessages] = useState([
    {
      sender: "recruiter",
      name: "Rahul Mehta (TalentTrack Technologies)",
      text: "Hi Aarav, our engineering team reviewed your profile and would love to schedule a 45-minute technical discussion.",
      time: "10:20 AM",
    },
    {
      sender: "applicant",
      name: "You",
      text: "Thanks for the update! I am available on Thursday afternoon for the technical round.",
      time: "10:45 AM",
    },
  ]);
  const [reply, setReply] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: "applicant",
        name: "You",
        text: reply,
        time: "Just now",
      },
    ]);
    setReply("");
  };

  return (
    <ApplicantLayout>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-peach text-brand-red">
              <Mail className="size-5" />
            </span>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Recruiter Messages
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Direct communication with hiring teams.
          </p>
        </div>

        <div className="dashboard-card flex flex-col h-[520px] overflow-hidden">
          <div className="p-3.5 border-b border-border bg-panel-head/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-brand-blue text-xs font-bold text-primary-foreground">
                R
              </div>
              <div>
                <strong className="block text-xs">Rahul Mehta</strong>
                <span className="text-[10px] text-muted-foreground">
                  Senior Technical Recruiter • TalentTrack Technologies
                </span>
              </div>
            </div>
            <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green">
              Active Conversation
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/10">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  m.sender === "applicant" ? "items-end" : "items-start"
                }`}
              >
                <span className="text-[10px] text-muted-foreground mb-1 px-1">{m.name}</span>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.sender === "applicant"
                      ? "bg-brand-blue text-primary-foreground rounded-br-xs"
                      : "bg-card text-foreground rounded-bl-xs border border-border"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9.5px] text-muted-foreground mt-0.5 px-1">{m.time}</span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSend}
            className="p-3 border-t border-border bg-card flex items-center gap-2"
          >
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-1.5"
              aria-label="Attach file"
            >
              <Paperclip className="size-4" />
            </button>
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply to Rahul..."
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
      </div>
    </ApplicantLayout>
  );
}
