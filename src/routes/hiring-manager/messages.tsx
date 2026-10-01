"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Mail,
  MessageSquare,
  Send,
  User,
  Users,
} from "lucide-react";
import { HiringManagerLayout } from "@/components/hiring-manager/HiringManagerLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";

export const Route = createFileRoute("/hiring-manager/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Hiring Manager" },
      { name: "description", content: "Collaborate with recruiters and talent leads." },
    ],
  }),
  component: HiringManagerMessagesPage,
});

function HiringManagerMessagesPage() {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "m1",
      sender: "Talent Acquisition Team",
      role: "Recruiter",
      time: "Today, 10:30 AM",
      text: "Hi! We've shortlisted 3 candidates for your Senior Full Stack Engineer role. Please take a look at their profiles and let us know your recommendation.",
      isSelf: false,
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: user?.name || "Hiring Manager",
        role: "Hiring Manager",
        time: "Just now",
        text: messageText.trim(),
        isSelf: true,
      },
    ]);
    setMessageText("");
  };

  return (
    <HiringManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Mail className="size-6 text-brand-blue" />
            <span>Recruiter Collaboration & Messages</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Direct communication channel with recruiters managing your open requisitions.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col h-[520px]">
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-lg ${msg.isSelf ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className="grid size-8 place-items-center rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs shrink-0">
                  {msg.sender.charAt(0)}
                </div>
                <div
                  className={`p-3.5 rounded-2xl space-y-1 text-xs ${
                    msg.isSelf
                      ? "bg-brand-blue text-primary-foreground rounded-tr-none"
                      : "bg-muted/60 text-foreground border border-border rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                    <span className="font-bold">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="pt-4 border-t border-border flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message to recruiters..."
              className="flex-1 h-10 rounded-xl border border-input bg-card px-3 text-xs text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
            <Button
              type="submit"
              disabled={!messageText.trim()}
              className="h-10 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold px-4 gap-1.5 cursor-pointer"
            >
              <span>Send</span>
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </HiringManagerLayout>
  );
}
