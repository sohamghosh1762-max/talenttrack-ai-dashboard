"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  BarChart3, Bell, Bot, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronDown,
  CircleUserRound, Crown, FileSearch, Home, Lightbulb, Mail, Menu, MoreVertical,
  Plus, Search, Send, Settings, SlidersHorizontal, Sparkles, TrendingUp, UserRound,
  Users, XCircle, ClipboardList, LogOut, UserCog,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type Icon = ComponentType<{ className?: string }>;

const navItems: { label: string; icon: Icon; badge?: string }[] = [
  { label: "Dashboard", icon: Home }, { label: "Jobs", icon: BriefcaseBusiness },
  { label: "Applications", icon: Users }, { label: "Candidates", icon: CircleUserRound },
  { label: "Pipeline", icon: SlidersHorizontal }, { label: "AI Screening", icon: Sparkles },
  { label: "Messages", icon: Mail, badge: "2" }, { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const chartData = [
  { date: "Aug 10", applications: 30, shortlisted: 12, interviewed: 2, offered: 0 },
  { date: "Aug 17", applications: 46, shortlisted: 20, interviewed: 6, offered: 1 },
  { date: "Aug 24", applications: 59, shortlisted: 26, interviewed: 10, offered: 2 },
  { date: "Aug 31", applications: 66, shortlisted: 32, interviewed: 14, offered: 3 },
  { date: "Sep 7", applications: 80, shortlisted: 40, interviewed: 19, offered: 6 },
  { date: "Sep 14", applications: 94, shortlisted: 50, interviewed: 25, offered: 10 },
];

const jobs = [
  ["Frontend Developer", "Engineering", "72", "Active", "Aug 20, 2025"],
  ["Backend Developer", "Engineering", "58", "Active", "Aug 18, 2025"],
  ["AI/ML Engineer", "Research", "36", "Active", "Aug 15, 2025"],
  ["Product Designer", "Design", "28", "Active", "Aug 12, 2025"],
  ["DevOps Engineer", "Infrastructure", "18", "Paused", "Aug 10, 2025"],
];

const applicants = [
  { name: "Aarav Mehta", email: "aarav@gmail.com", job: "Frontend Developer", score: 92, status: "Shortlisted", initials: "AM" },
  { name: "Priya Nair", email: "priya@gmail.com", job: "AI/ML Engineer", score: 88, status: "Under Review", initials: "PN" },
  { name: "Rohit Singh", email: "rohit@gmail.com", job: "Backend Developer", score: 76, status: "Interview", initials: "RS" },
  { name: "Sneha Kapoor", email: "sneha@gmail.com", job: "Product Designer", score: 68, status: "Applied", initials: "SK" },
  { name: "Karan Verma", email: "karan@gmail.com", job: "DevOps Engineer", score: 64, status: "Under Review", initials: "KV" },
];

const skills = [
  ["Python", 142, "bg-brand-blue"], ["JavaScript", 118, "bg-brand-purple/55"],
  ["React", 96, "bg-brand-red/55"], ["Node.js", 74, "bg-brand-orange/70"],
  ["Machine Learning", 62, "bg-brand-green/80"], ["AWS", 58, "bg-brand-blue/60"],
] as const;

function Brand() {
  return <div className="flex items-center gap-3 px-1"><div className="relative grid size-9 shrink-0 place-items-center text-sidebar-primary-foreground"><Users className="size-8 text-brand-blue"/><Sparkles className="absolute -right-0.5 -top-0.5 size-3 text-sidebar-primary-foreground"/></div><div className="min-w-0"><div className="truncate text-[18px] font-bold text-sidebar-primary-foreground">TalentTrack AI</div><div className="truncate text-[9px] text-sidebar-foreground/70">Smarter Hiring. Brighter Teams.</div></div></div>;
}

function SidebarContent({ active, onSelect }: { active: string; onSelect: (label: string) => void }) {
  return <div className="sidebar-gradient flex h-full flex-col px-4 py-5 text-sidebar-foreground">
    <Brand />
    <nav className="mt-8 space-y-1.5" aria-label="Main navigation">{navItems.map(({ label, icon: NavIcon, badge }) => <button key={label} onClick={() => onSelect(label)} className={`grid h-11 w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors ${active === label ? "bg-brand-blue text-primary-foreground shadow-sm" : "text-sidebar-foreground/85 hover:bg-sidebar-soft"}`}><NavIcon className="size-[18px]"/><span className="truncate">{label}</span>{badge && <span className="grid size-[19px] place-items-center rounded-full bg-brand-red text-[10px] font-bold text-primary-foreground">{badge}</span>}</button>)}</nav>
    <div className="mt-auto rounded-xl border border-sidebar-border/30 bg-sidebar-soft/65 p-4 text-center shadow-sm"><div className="mb-2 flex items-center gap-2 text-left"><Crown className="size-5 text-brand-orange"/><span className="text-xs font-semibold text-sidebar-primary-foreground">Upgrade to Pro</span></div><p className="px-2 text-[10px] leading-4 text-sidebar-foreground/75">Get advanced AI insights and team collaboration features.</p><Button className="mt-3 h-8 w-full text-[10px] font-semibold" onClick={() => onSelect("Upgrade to Pro")}>Upgrade Now</Button></div>
  </div>;
}

function SectionCard({ title, action, children, className = "" }: { title: string; action?: () => void; children: React.ReactNode; className?: string }) {
  return <section className={`dashboard-card min-w-0 overflow-hidden ${className}`}><div className="flex h-10 items-center justify-between px-3"><h2 className="text-[14px] font-bold">{title}</h2>{action && <Button variant="link" size="sm" className="h-auto p-0 text-[10px] no-underline" onClick={action}>View All</Button>}</div>{children}</section>;
}

function StatusPill({ children }: { children: React.ReactNode }) {
  const value = String(children); const style = value === "Active" || value === "Shortlisted" ? "bg-surface-green text-brand-green" : value === "Under Review" ? "bg-surface-blue text-brand-blue" : value === "Interview" ? "bg-surface-purple text-brand-purple" : value === "Paused" ? "bg-surface-peach text-brand-orange" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-semibold ${style}`}>{children}</span>;
}

export function TalentDashboard() {
  const [active, setActive] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const filteredApplicants = useMemo(() => applicants.filter(a => `${a.name} ${a.email} ${a.job}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const open = (title: string, text: string) => setDialog({ title, text });
  const selectNav = (label: string) => { setActive(label); setMobileOpen(false); if (label !== "Dashboard") open(label, `${label} workspace is ready for recruiter review.`); };

  return <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[255px_minmax(0,1fr)]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[255px] lg:block"><SidebarContent active={active} onSelect={selectNav}/></aside>
    <div className="min-w-0 lg:col-start-2">
      <header className="sticky top-0 z-20 grid h-[70px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-7">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open navigation"><Menu/></Button></SheetTrigger><SheetContent side="left" className="w-[255px] border-0 p-0 [&>button]:text-sidebar-primary-foreground"><SidebarContent active={active} onSelect={selectNav}/></SheetContent></Sheet>
        <label className="relative max-w-[720px]"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={e => setQuery(e.target.value)} className="h-10 w-full rounded-md border border-input bg-card pl-11 pr-4 text-xs outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30" placeholder="Search candidates, jobs, skills..." aria-label="Search candidates, jobs, skills"/></label>
        <div className="flex shrink-0 items-center gap-3 md:gap-5">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label="Notifications"><Bell className="size-5"/><span className="absolute right-1 top-0 grid size-4 place-items-center rounded-full bg-brand-red text-[8px] font-bold text-primary-foreground">3</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-72"><DropdownMenuItem onSelect={() => open("New application", "Aarav Mehta applied for Frontend Developer.")}>New application received</DropdownMenuItem><DropdownMenuItem onSelect={() => open("Interview reminder", "Your interview starts at 3:00 PM today.")}>Interview at 3:00 PM</DropdownMenuItem><DropdownMenuItem onSelect={() => open("AI match complete", "Candidate ranking is ready for review.")}>AI screening completed</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          <div className="grid size-10 place-items-center rounded-full bg-brand-blue text-sm font-bold text-primary-foreground">R</div>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="hidden h-auto gap-3 px-0 text-left sm:flex"><span><span className="block text-xs font-semibold">Rahul Mehta</span><span className="block text-[10px] font-normal text-muted-foreground">Recruiter</span></span><ChevronDown className="size-3 text-muted-foreground"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => open("Profile", "Recruiter profile settings.")}><UserCog/>Profile settings</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={() => open("Sign out", "You remain signed in for this demo.")}><LogOut/>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </header>

      <main className="space-y-3 p-4 md:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><h1 className="truncate text-[23px] font-extrabold leading-tight md:text-[27px]">Welcome back, Rahul! 👋</h1><p className="mt-1 text-[12px] text-muted-foreground md:text-sm">Here's what's happening with your hiring process today.</p></div><div className="hidden items-center gap-6 md:flex"><span className="text-xs text-muted-foreground">Monday, 15 Sep 2025</span><Button className="h-11 px-5" onClick={() => open("Post a New Job", "Create a role, add requirements, and publish it to your hiring pipeline.")}><Plus/>Post a New Job</Button></div><Button size="icon" className="md:hidden" aria-label="Post a new job" onClick={() => open("Post a New Job", "Create a role, add requirements, and publish it to your hiring pipeline.")}><Plus/></Button></div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          [BriefcaseBusiness,"12","Active Job Openings","↑ 3 from last week","bg-surface-blue","text-brand-blue"], [Users,"248","Total Applications","↑ 18% from last week","bg-surface-green","text-brand-green"], [CircleUserRound,"36","Shortlisted Candidates","↑ 6 from last week","bg-surface-purple","text-brand-purple"], [CalendarDays,"8","Interviews Scheduled","↑ 3 this week","bg-surface-peach","text-brand-red"],
        ].map(([KpiIcon,num,label,change,bg,tone]) => <button key={String(label)} onClick={() => open(String(label), `${num} ${String(label).toLowerCase()}. ${change}`)} className={`${bg} grid min-h-[112px] grid-cols-[54px_minmax(0,1fr)] items-center gap-4 rounded-lg border border-border/40 px-4 text-left shadow-sm transition-transform hover:-translate-y-0.5`}><span className={`grid size-[52px] place-items-center rounded-lg bg-card/45 ${tone}`}><KpiIcon className="size-7"/></span><span><strong className="block text-[24px] leading-7">{num}</strong><span className="block text-xs">{label}</span><span className="mt-2 block text-[10px] font-medium text-brand-green">{change}</span></span></button>)}</div>

        <div className="grid gap-3 xl:grid-cols-[1.56fr_1.12fr_.98fr]">
          <SectionCard title="Application Overview" className="h-[278px]"><div className="flex h-8 items-center justify-center gap-6 text-[9px] text-muted-foreground">{[["Applications","bg-brand-blue"],["Shortlisted","bg-brand-green"],["Interviewed","bg-brand-purple"],["Offered","bg-brand-orange"]].map(([l,c])=><span key={l} className="flex items-center gap-2"><i className={`size-2 rounded-full ${c}`}/>{l}</span>)}</div><div className="h-[200px] px-1 pb-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical/><XAxis dataKey="date" tick={{fontSize:9, fill:"var(--muted-foreground)"}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} ticks={[0,20,40,60,80,100]} tick={{fontSize:9, fill:"var(--muted-foreground)"}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{fontSize:10,borderRadius:6,borderColor:"var(--border)"}}/><Line type="monotone" dataKey="applications" stroke="var(--brand-blue)" strokeWidth={2} dot={{r:3,fill:"var(--brand-blue)"}}/><Line type="monotone" dataKey="shortlisted" stroke="var(--brand-green)" strokeWidth={2} dot={{r:3,fill:"var(--brand-green)"}}/><Line type="monotone" dataKey="interviewed" stroke="var(--brand-purple)" strokeWidth={2} dot={{r:3,fill:"var(--brand-purple)"}}/><Line type="monotone" dataKey="offered" stroke="var(--brand-orange)" strokeWidth={2} dot={{r:3,fill:"var(--brand-orange)"}}/></LineChart></ResponsiveContainer></div></SectionCard>
          <SectionCard title="Top Skills in Applications" action={() => open("Top Skills", "Skill extraction summarizes the strongest skills across parsed resumes.")} className="h-[278px]"><div className="space-y-3 px-3 pt-1">{skills.map(([skill,value,color])=><button key={skill} className="grid w-full grid-cols-[92px_minmax(70px,1fr)_28px] items-center gap-2 text-left text-[11px]" onClick={() => open(skill, `${value} applicants have ${skill} identified through resume skill extraction.`)}><span>{skill}</span><span className="h-4 overflow-hidden rounded bg-muted"><span className={`block h-full rounded ${color}`} style={{width:`${value/1.42}%`}}/></span><span className="text-right text-muted-foreground">{value}</span></button>)}</div></SectionCard>
          <SectionCard title="AI Insights" className="h-[278px]"><div className="mx-2 rounded-md bg-panel-head px-2 py-2 text-sm font-bold"><span className="flex items-center gap-2"><Bot className="size-7 text-brand-blue"/>AI Insights</span></div><div className="divide-y divide-border/70 px-3">{[[CheckCircle2,"You have 24 strong candidates for Software Engineer roles.","text-brand-green","bg-surface-green"],[BarChart3,"Applications increased by 18% this week.","text-brand-blue","bg-surface-blue"],[Lightbulb,"Consider reviewing 5 high-potential candidates who match 90%+ with your job descriptions.","text-brand-orange","bg-surface-peach"]].map(([InsightIcon,text,tone,bg])=><button key={String(text)} className="grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 py-3 text-left text-[11px] leading-4" onClick={() => open("AI decision support", String(text))}><span className={`grid size-8 place-items-center rounded-lg ${bg} ${tone}`}><InsightIcon className="size-5"/></span><span>{text}</span></button>)}</div></SectionCard>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.08fr_.92fr]">
          <SectionCard title="Your Job Openings" action={() => open("All Job Openings", "Manage all active, paused, and draft job openings.")}><div className="overflow-x-auto"><table className="w-full min-w-[610px] border-collapse text-left text-[9px]"><thead className="bg-panel-head text-muted-foreground"><tr>{["Job Title","Department","Applications","Status","Created On","Actions"].map(h=><th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{jobs.map(row=><tr key={row[0]} className="border-t border-border/70 hover:bg-muted/35"><td className="px-3 py-2 font-semibold">{row[0]}</td><td className="px-3 py-2 text-muted-foreground">{row[1]}</td><td className="px-3 py-2">{row[2]}</td><td className="px-3 py-2"><StatusPill>{row[3]}</StatusPill></td><td className="px-3 py-2 text-muted-foreground">{row[4]}</td><td className="px-3 py-1"><div className="flex items-center gap-1"><Button size="sm" variant="outline" className="h-7 px-3 text-[9px] text-brand-blue" onClick={() => open(row[0], `View candidates, matching results, and activity for ${row[0]}.`)}>View</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7"><MoreVertical/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => open("Edit job", `Edit ${row[0]}.`)}>Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => open("Duplicate job", `Duplicate ${row[0]}.`)}>Duplicate</DropdownMenuItem><DropdownMenuItem onSelect={() => open("Job status", `Pause or close ${row[0]}.`)}>Change status</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}</tbody></table></div></SectionCard>
          <SectionCard title="Recent Applications" action={() => open("All Applications", "Review every application and recruiter decision-support signal.")}><div className="overflow-x-auto"><table className="w-full min-w-[590px] border-collapse text-left text-[9px]"><thead className="bg-panel-head text-muted-foreground"><tr>{["Candidate","Job Title","Match Score","Status","Applied On"].map(h=><th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{filteredApplicants.map((a,i)=><tr key={a.email} onClick={() => open(a.name, `${a.name} applied for ${a.job}. AI-generated summaries support recruiter review and do not make hiring decisions.`)} className="cursor-pointer border-t border-border/70 hover:bg-muted/35"><td className="px-3 py-1"><div className="flex items-center gap-2"><span className={`grid size-7 place-items-center rounded-full text-[8px] font-bold ${i%2 ? "bg-surface-peach text-brand-orange" : "bg-surface-blue text-brand-blue"}`}>{a.initials}</span><span><strong className="block">{a.name}</strong><span className="text-[8px] text-muted-foreground">{a.email}</span></span></div></td><td className="px-3 py-2 text-muted-foreground">{a.job}</td><td className="px-3 py-2"><button onClick={(e)=>{e.stopPropagation();open("AI Match Analysis", `${a.score}% semantic match based on role criteria, resume experience, and extracted skills. Recruiter review is required.`)}} className={`rounded-md px-2 py-1 font-bold ${a.score>=88?"bg-surface-green text-brand-green":"bg-surface-peach text-brand-orange"}`}>{a.score}%</button></td><td className="px-3 py-2"><StatusPill>{a.status}</StatusPill></td><td className="px-3 py-2 text-muted-foreground">Sep {14-i>12?14-i:12}, 2025</td></tr>)}</tbody></table>{filteredApplicants.length===0&&<div className="p-8 text-center text-xs text-muted-foreground">No matching candidates or jobs.</div>}</div></SectionCard>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.36fr_1fr]">
          <SectionCard title="Hiring Pipeline"><div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-5">{[["Applied","118",BarChart3,"bg-surface-blue","text-brand-blue"],["Screening","46",FileSearch,"bg-surface-purple","text-brand-purple"],["Interview","24",UserRound,"bg-surface-peach","text-brand-orange"],["Offered","8",BriefcaseBusiness,"bg-surface-green","text-brand-green"],["Rejected","32",XCircle,"bg-surface-pink","text-brand-red"]].map(([label,count,StageIcon,bg,tone])=><button key={String(label)} onClick={() => open(`${label} candidates`, `${count} candidates are currently in the ${String(label).toLowerCase()} stage.`)} className={`${bg} min-h-[70px] rounded-md p-3 text-left transition-transform hover:-translate-y-0.5`}><span className={`block text-[11px] font-bold ${tone}`}>{label}</span><span className="mt-3 flex items-center justify-center gap-3"><StageIcon className={`size-4 ${tone}`}/><strong className="text-[13px]">{count}</strong></span></button>)}</div></SectionCard>
          <SectionCard title="Quick Actions"><div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">{[[Plus,"Post a Job"],[Search,"Search Candidates"],[Mail,"Send Message"],[BarChart3,"Generate Report"]].map(([ActionIcon,label])=><button key={String(label)} onClick={() => open(String(label), `${String(label)} workflow opened.`)} className="grid min-h-[70px] place-items-center rounded-md bg-panel-head px-2 py-2 text-center text-[9px] transition-all hover:bg-surface-blue hover:text-brand-blue"><ActionIcon className="size-6 text-brand-blue"/><span>{label}</span></button>)}</div></SectionCard>
        </div>
      </main>
    </div>

    <Dialog open={dialog!==null} onOpenChange={(value)=>!value&&setDialog(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{dialog?.title}</DialogTitle><DialogDescription>{dialog?.text}</DialogDescription></DialogHeader>{dialog?.title==="Post a New Job"&&<div className="grid gap-3"><input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Job title"/><input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Department"/><textarea className="min-h-24 rounded-md border border-input p-3 text-sm" placeholder="Role requirements"/></div>}<DialogFooter><Button variant="outline" onClick={()=>setDialog(null)}>Close</Button>{dialog?.title==="Post a New Job"&&<Button onClick={()=>setDialog({title:"Job draft saved",text:"The new role is saved as a draft for recruiter review."})}>Save Draft</Button>}</DialogFooter></DialogContent></Dialog>
  </div>;
}