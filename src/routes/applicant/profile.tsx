"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Award,
  Briefcase,
  Check,
  Download,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { useUploadResume } from "@/hooks/api/useResumes";

export const Route = createFileRoute("/applicant/profile")({
  head: () => ({
    meta: [
      { title: "My Profile & Resume — TalentTrack AI" },
      {
        name: "description",
        content:
          "Manage your professional profile, experience, education, skills, and resume for AI matching.",
      },
    ],
  }),
  component: ApplicantProfilePage,
});

type ProfileTab =
  "personal" | "experience" | "education" | "skills" | "certifications" | "projects" | "resume";

export function ApplicantProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name || "Aarav Mehta",
    email: user?.email || "aarav.mehta@example.com",
    phone: "+1 (555) 234-5678",
    headline: user?.applicantProfile?.headline || "Senior Frontend Engineer | React & TypeScript",
    location: user?.applicantProfile?.location || "San Jose, CA (Hybrid / Remote)",
    bio: "Passionate software engineer with 5+ years of experience crafting modern, accessible web applications and scalable front-end systems.",
  });

  const [skillsList, setSkillsList] = useState<string[]>([
    "React",
    "TypeScript",
    "Next.js",
    "Tailwind CSS",
    "Redux Toolkit",
    "Node.js",
    "GraphQL",
    "Jest / Playwright",
  ]);
  const [newSkillInput, setNewSkillInput] = useState("");

  const [experiences, setExperiences] = useState([
    {
      id: "exp-1",
      title: "Senior Frontend Engineer",
      company: "CloudTech Solutions",
      location: "San Francisco, CA",
      period: "2022 - Present",
      description:
        "Architected core dashboard UI components, improved page performance by 40%, and led a team of 4 front-end engineers.",
    },
    {
      id: "exp-2",
      title: "Fullstack Web Developer",
      company: "Innovate Labs",
      location: "San Jose, CA",
      period: "2019 - 2022",
      description:
        "Developed responsive user interfaces and backend REST endpoints utilizing React, Node.js, and PostgreSQL.",
    },
  ]);

  const [education, setEducation] = useState([
    {
      id: "edu-1",
      degree: "B.S. in Computer Science",
      institution: "San Jose State University",
      period: "2015 - 2019",
      grade: "GPA 3.8 / 4.0",
    },
  ]);

  const [certifications, setCertifications] = useState([
    {
      id: "cert-1",
      name: "AWS Certified Developer – Associate",
      issuer: "Amazon Web Services",
      year: "2024",
    },
    {
      id: "cert-2",
      name: "Meta Certified Front-End Developer",
      issuer: "Meta / Coursera",
      year: "2023",
    },
  ]);

  const [projects, setProjects] = useState([
    {
      id: "proj-1",
      name: "Design System UI Kit",
      tech: "React, Tailwind, Radix UI",
      description: "Open-source accessible component library downloaded over 20k times.",
    },
    {
      id: "proj-2",
      name: "Real-time Collaboration Canvas",
      tech: "TypeScript, WebSockets, Canvas API",
      description: "Interactive multi-user whiteboard with sub-50ms latency synchronization.",
    },
  ]);

  const [resumeInfo, setResumeInfo] = useState({
    id: (user?.applicantProfile as Record<string, any>)?.[
      "resumeId"
    ] || "",
    fileName: user?.applicantProfile?.resumeFileName || "Aarav_Mehta_Resume_2025.pdf",
    uploadedDate: "Sep 10, 2025",
    fileSize: "1.2 MB",
    mimeType: "application/pdf",
    parsingStatus: "Parsed & Vectorized",
    extractedSkillsCount: 14,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const uploadResumeMutation = useUploadResume();

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    // Frontend validation
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    const allowedExts = [".pdf", ".docx", ".doc"];
    const hasValidExt = allowedExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExt) {
      setUploadError("Invalid file type. Only PDF (.pdf) and Word (.docx) documents are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10 MB limit.");
      return;
    }

    try {
      const uploaded = await uploadResumeMutation.mutateAsync(file);
      const sizeInMB = (uploaded.fileSize / (1024 * 1024)).toFixed(1);
      setResumeInfo({
        id: uploaded.id,
        fileName: uploaded.originalFileName,
        uploadedDate: new Date(uploaded.uploadedAt || uploaded.createdAt || Date.now()).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        fileSize: `${sizeInMB} MB`,
        mimeType: uploaded.mimeType,
        parsingStatus: "Uploaded & Persisted",
        extractedSkillsCount: 12,
      });
      setUploadSuccess(`Resume "${uploaded.originalFileName}" uploaded and saved to private storage!`);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload resume.");
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !skillsList.includes(newSkillInput.trim())) {
      setSkillsList([...skillsList, newSkillInput.trim()]);
      setNewSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const tabs: { key: ProfileTab; label: string; icon: typeof User }[] = [
    { key: "personal", label: "Personal Info", icon: User },
    { key: "experience", label: "Experience", icon: Briefcase },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "skills", label: "Skills", icon: Sparkles },
    { key: "certifications", label: "Certifications", icon: Award },
    { key: "projects", label: "Projects", icon: FileCheck },
    { key: "resume", label: "Resume & Documents", icon: FileText },
  ];

  return (
    <ApplicantLayout>
      <div className="space-y-5 max-w-4xl">
        {/* Page Header */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-surface-green text-brand-green">
                <User className="size-5" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                My Profile & Resume
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Keep your profile updated for accurate semantic AI scoring and recruiter discovery.
            </p>
          </div>

          <Button
            onClick={() => handleSave()}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            {isSaved ? "Saved Successfully" : "Save Changes"}
          </Button>
        </section>

        {/* Profile Completion Callout */}
        <div className="dashboard-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border-brand-blue/20">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-surface-blue text-brand-blue shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-xs sm:text-sm font-bold text-foreground">
                  AI Profile Strength: 85% Completed
                </strong>
                <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green">
                  High Match Potential
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Your resume and skills are parsed. Adding more project details will increase match
                relevance.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("resume")}
            className="text-xs font-semibold shrink-0"
          >
            View Parsed Resume
          </Button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/80 pb-2">
          {tabs.map(({ key, label, icon: TabIcon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-brand-blue text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <TabIcon className="size-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Canvas */}
        <div className="dashboard-card p-5 sm:p-6">
          {/* 1. Personal Info */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
                Personal & Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={personalInfo.name}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                    className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    disabled
                    className="h-9.5 w-full rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Location / Work Preference
                  </label>
                  <input
                    type="text"
                    value={personalInfo.location}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                    className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={personalInfo.headline}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, headline: e.target.value })}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Summary / Bio
                </label>
                <textarea
                  rows={3}
                  value={personalInfo.bio}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, bio: e.target.value })}
                  className="w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                />
              </div>
            </div>
          )}

          {/* 2. Experience */}
          {activeTab === "experience" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground">Work Experience</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    const newExp = {
                      id: `exp-${Date.now()}`,
                      title: "New Role",
                      company: "Company Name",
                      location: "City, Country",
                      period: "2024 - Present",
                      description: "Key responsibilities and achievements in this position.",
                    };
                    setExperiences([newExp, ...experiences]);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Position
                </Button>
              </div>

              <div className="space-y-4">
                {experiences.map((exp, i) => (
                  <div key={exp.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{exp.title}</h3>
                        <p className="text-xs font-semibold text-brand-blue">
                          {exp.company} • {exp.location}
                        </p>
                        <span className="text-[11px] text-muted-foreground">{exp.period}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExperiences(experiences.filter((e) => e.id !== exp.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Education */}
          {activeTab === "education" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground">Education & Degrees</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    const newEdu = {
                      id: `edu-${Date.now()}`,
                      degree: "Degree / Field of Study",
                      institution: "University / Institution",
                      period: "2020 - 2024",
                      grade: "Graduated",
                    };
                    setEducation([...education, newEdu]);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Education
                </Button>
              </div>

              <div className="space-y-3">
                {education.map((edu) => (
                  <div
                    key={edu.id}
                    className="rounded-lg border border-border p-4 flex items-start justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{edu.degree}</h3>
                      <p className="text-xs text-brand-blue font-semibold">{edu.institution}</p>
                      <span className="text-[11px] text-muted-foreground">
                        {edu.period} • {edu.grade}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEducation(education.filter((e) => e.id !== edu.id))}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Skills */}
          {activeTab === "skills" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
                Core Skills & Technical Proficiencies
              </h2>
              <p className="text-xs text-muted-foreground">
                These skills are matched directly with recruiter job requirements and used to
                compute your AI match score.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Type a skill and press Enter (e.g. Docker, Python)..."
                  className="h-9 w-full max-w-sm rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  size="sm"
                  className="bg-brand-blue text-primary-foreground text-xs"
                >
                  Add Skill
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {skillsList.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-blue px-3 py-1.5 text-xs font-semibold text-brand-blue border border-brand-blue/20"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-destructive focus:outline-none cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Certifications */}
          {activeTab === "certifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground">Certifications & Licenses</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    const newCert = {
                      id: `cert-${Date.now()}`,
                      name: "Certification Name",
                      issuer: "Issuing Organization",
                      year: "2024",
                    };
                    setCertifications([...certifications, newCert]);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Certification
                </Button>
              </div>

              <div className="space-y-3">
                {certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-lg border border-border p-4 flex items-start justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{cert.name}</h3>
                      <p className="text-xs text-brand-purple font-semibold">{cert.issuer}</p>
                      <span className="text-[11px] text-muted-foreground">
                        Issued in {cert.year}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCertifications(certifications.filter((c) => c.id !== cert.id))
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Projects */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground">Key Projects & Portfolio</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    const newProj = {
                      id: `proj-${Date.now()}`,
                      name: "Project Title",
                      tech: "Tech Stack Used",
                      description: "Brief summary of results and technical achievements.",
                    };
                    setProjects([...projects, newProj]);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Project
                </Button>
              </div>

              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.id} className="rounded-lg border border-border p-4 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{proj.name}</h3>
                        <span className="text-[11px] font-semibold text-brand-blue">
                          {proj.tech}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProjects(projects.filter((p) => p.id !== proj.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {proj.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Resume & Documents */}
          {activeTab === "resume" && (
            <div className="space-y-5">
              <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
                <FileText className="size-4 text-brand-blue" />
                Resume Management & Parsing
              </h2>

              {/* Feedback messages */}
              {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-surface-green border border-brand-green/30 p-3 text-xs text-brand-green">
                  <Check className="size-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Active Resume Card */}
              <div className="rounded-xl border border-brand-blue/30 bg-surface-blue/30 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-xl bg-brand-blue text-primary-foreground shrink-0 shadow-xs">
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-foreground">
                        {resumeInfo.fileName}
                      </strong>
                      <span className="text-[11px] text-muted-foreground">
                        Uploaded on {resumeInfo.uploadedDate} • {resumeInfo.fileSize} • {resumeInfo.mimeType.includes("pdf") ? "PDF Format" : "DOCX Format"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {resumeInfo.id ? (
                      <a
                        href={`/api/resumes/${resumeInfo.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 px-3 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground gap-1 transition-colors"
                      >
                        <Download className="size-3.5" />
                        Download
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Download className="size-3.5" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand-blue/15 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">AI Extraction Status:</span>
                    <span className="rounded bg-surface-green px-2 py-0.5 text-[10px] font-bold text-brand-green">
                      {resumeInfo.parsingStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Extracted Skills:</span>
                    <span>{resumeInfo.extractedSkillsCount} competencies identified</span>
                  </div>
                </div>
              </div>

              {/* Upload New Resume Box */}
              <label
                htmlFor="profile-resume-upload"
                className={`rounded-xl border-2 border-dashed p-6 text-center space-y-3 block cursor-pointer transition-colors ${
                  uploadResumeMutation.isPending
                    ? "border-brand-blue bg-brand-blue/5 cursor-wait"
                    : "border-border hover:border-brand-blue/60"
                }`}
              >
                <input
                  id="profile-resume-upload"
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeFileSelect}
                  disabled={uploadResumeMutation.isPending}
                  className="hidden"
                />
                <div className="grid size-12 place-items-center rounded-full bg-muted mx-auto text-muted-foreground">
                  {uploadResumeMutation.isPending ? (
                    <Loader2 className="size-6 animate-spin text-brand-blue" />
                  ) : (
                    <Upload className="size-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {uploadResumeMutation.isPending ? "Uploading Resume to Secure S3..." : "Upload Updated Resume"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Drag and drop your PDF or DOCX file here, or click to browse files (Max 10 MB)
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={uploadResumeMutation.isPending}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs pointer-events-none"
                >
                  {uploadResumeMutation.isPending ? "Uploading..." : "Select File"}
                </Button>
              </label>
            </div>
          )}
        </div>
      </div>
    </ApplicantLayout>
  );
}
