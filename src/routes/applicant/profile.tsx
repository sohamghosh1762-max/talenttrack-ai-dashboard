"use client";

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Award,
  Briefcase,
  Check,
  FileCheck,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { ApplicantLayout } from "@/components/applicant/ApplicantLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { useApplicantProfile, useUpdateApplicantProfile } from "@/hooks/api/useApplicantProfile";
import { calculateProfileCompletion } from "@/lib/applicant-utils";
import type {
  ApplicantExperienceItem,
  ApplicantEducationItem,
  ApplicantCertificationItem,
  ApplicantProjectItem,
} from "@/server/types/user-types";

export const Route = createFileRoute("/applicant/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — TalentTrack AI" },
      {
        name: "description",
        content:
          "Manage your professional profile, experience, education, skills, certifications, and portfolio projects for recruiter discovery.",
      },
    ],
  }),
  component: ApplicantProfilePage,
});

type ProfileTab =
  "personal" | "experience" | "education" | "skills" | "certifications" | "projects";

export function ApplicantProfilePage() {
  const { user: authUser } = useAuth();
  const { data: profileData, isLoading, isError, error, refetch } = useApplicantProfile();
  const updateProfileMutation = useUpdateApplicantProfile();

  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form states initialized empty, populated on fetch
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    headline: "",
    location: "",
    bio: "",
  });

  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [experiences, setExperiences] = useState<ApplicantExperienceItem[]>([]);
  const [education, setEducation] = useState<ApplicantEducationItem[]>([]);
  const [certifications, setCertifications] = useState<ApplicantCertificationItem[]>([]);
  const [projects, setProjects] = useState<ApplicantProjectItem[]>([]);

  // Synchronize local form state with fetched profile data
  useEffect(() => {
    if (profileData) {
      const appProfile = profileData.applicantProfile || (profileData as any) || {};
      setPersonalInfo({
        name: profileData.name || authUser?.name || "",
        email: profileData.email || authUser?.email || "",
        phone: appProfile.phone || "",
        headline: appProfile.headline || "",
        location: appProfile.location || "",
        bio: appProfile.bio || appProfile.summary || "",
      });

      setSkillsList(appProfile.skills || []);

      if (Array.isArray(appProfile.experiences) && appProfile.experiences.length > 0) {
        setExperiences(appProfile.experiences);
      } else if (
        Array.isArray((appProfile as any).experience) &&
        (appProfile as any).experience.length > 0
      ) {
        setExperiences(
          (appProfile as any).experience.map((exp: any, i: number) => ({
            id: exp.id || `exp-${i}`,
            title: exp.title || exp.role || "",
            company: exp.company || "",
            location: exp.location || "",
            period: exp.period || `${exp.startDate || ""} - ${exp.endDate || "Present"}`.trim(),
            description: exp.description || "",
          })),
        );
      } else {
        setExperiences([]);
      }

      if (Array.isArray(appProfile.education)) {
        setEducation(appProfile.education);
      } else {
        setEducation([]);
      }

      if (Array.isArray(appProfile.certifications)) {
        setCertifications(appProfile.certifications);
      } else {
        setCertifications([]);
      }

      if (Array.isArray(appProfile.projects)) {
        setProjects(appProfile.projects);
      } else {
        setProjects([]);
      }
    }
  }, [profileData, authUser]);

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await updateProfileMutation.mutateAsync({
        name: personalInfo.name.trim(),
        phone: personalInfo.phone.trim(),
        headline: personalInfo.headline.trim(),
        location: personalInfo.location.trim(),
        bio: personalInfo.bio.trim(),
        summary: personalInfo.bio.trim(),
        skills: skillsList,
        experiences,
        education,
        certifications,
        projects,
      });

      setSaveSuccess("Profile saved successfully");
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save profile. Please try again.");
    }
  };

  // Skill management
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
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
  ];

  // Loading Skeleton State
  if (isLoading) {
    return (
      <ApplicantLayout>
        <div className="space-y-5 max-w-4xl animate-pulse">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-muted rounded" />
              <div className="h-4 w-72 bg-muted/60 rounded" />
            </div>
            <div className="h-9 w-32 bg-muted rounded" />
          </div>
          <div className="h-20 bg-muted/50 rounded-xl border border-border" />
          <div className="h-10 bg-muted/40 rounded-lg" />
          <div className="h-96 bg-muted/30 rounded-xl border border-border p-6 space-y-4">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-muted/60 rounded" />
              <div className="h-10 bg-muted/60 rounded" />
            </div>
            <div className="h-20 bg-muted/60 rounded" />
          </div>
        </div>
      </ApplicantLayout>
    );
  }

  // Error State
  if (isError) {
    return (
      <ApplicantLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Unable to load your profile</h2>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "A connection error occurred while loading your profile."}
          </p>
          <Button
            onClick={() => refetch()}
            className="h-9 px-4 bg-brand-blue text-primary-foreground text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Try Again
          </Button>
        </div>
      </ApplicantLayout>
    );
  }

  const completion = calculateProfileCompletion(profileData || authUser);

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
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">My Profile</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Keep your profile updated for accurate semantic AI scoring and recruiter discovery.
            </p>
          </div>

          <Button
            onClick={() => handleSave()}
            disabled={updateProfileMutation.isPending}
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="size-4" />
                Saved Successfully
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        </section>

        {/* Global Save Feedback */}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-green border border-brand-green/30 p-3 text-xs text-brand-green">
            <Check className="size-4 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Profile Strength Callout */}
        <div className="dashboard-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border-brand-blue/20">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-surface-blue text-brand-blue shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-xs sm:text-sm font-bold text-foreground">
                  Profile Strength: {completion.percentage}%
                </strong>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    completion.percentage >= 80
                      ? "bg-surface-green text-brand-green"
                      : completion.percentage >= 50
                        ? "bg-surface-amber text-brand-amber"
                        : "bg-surface-peach text-brand-red"
                  }`}
                >
                  {completion.percentage >= 80
                    ? "High Profile Strength"
                    : completion.percentage >= 50
                      ? "Moderate Profile Strength"
                      : "Incomplete Profile"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {completion.nextSuggestion}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
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
                    placeholder="e.g. Jane Doe"
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
                    placeholder="Not provided"
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
                    placeholder="e.g. +1 (555) 000-0000"
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
                    placeholder="e.g. New York, NY (Remote / Hybrid)"
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
                  placeholder="e.g. Fullstack Engineer | TypeScript & Cloud"
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
                  placeholder="Briefly describe your background, core focus, and career goals..."
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
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={() => {
                    const newExp: ApplicantExperienceItem = {
                      id: `exp-${Date.now()}`,
                      title: "Role Title",
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

              {experiences.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No work experience added yet. Click &quot;Add Position&quot; to add your career
                  history.
                </div>
              ) : (
                <div className="space-y-4">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            {exp.title || "Untitled Role"}
                          </h3>
                          <p className="text-xs font-semibold text-brand-blue">
                            {exp.company || "Company"} {exp.location ? `• ${exp.location}` : ""}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {exp.period || "Period"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExperiences(experiences.filter((e) => e.id !== exp.id))}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                          aria-label="Remove experience"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={() => {
                    const newEdu: ApplicantEducationItem = {
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

              {education.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No education history added yet. Click &quot;Add Education&quot; to list your
                  degrees.
                </div>
              ) : (
                <div className="space-y-3">
                  {education.map((edu) => (
                    <div
                      key={edu.id}
                      className="rounded-lg border border-border p-4 flex items-start justify-between"
                    >
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {edu.degree || "Degree"}
                        </h3>
                        <p className="text-xs text-brand-blue font-semibold">
                          {edu.institution || "Institution"}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                          {edu.period} {edu.grade ? `• ${edu.grade}` : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEducation(education.filter((e) => e.id !== edu.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                        aria-label="Remove education"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  placeholder="Type a skill and press Enter (e.g. React, Node.js, Python)..."
                  className="h-9 w-full max-w-sm rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue"
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  size="sm"
                  className="bg-brand-blue text-primary-foreground text-xs cursor-pointer"
                >
                  Add Skill
                </Button>
              </div>

              {skillsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No skills listed yet. Type a skill above to add to your profile.
                </div>
              ) : (
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
                        aria-label={`Remove skill ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={() => {
                    const newCert: ApplicantCertificationItem = {
                      id: `cert-${Date.now()}`,
                      name: "Certification Name",
                      issuer: "Issuing Organization",
                      year: new Date().getFullYear().toString(),
                    };
                    setCertifications([...certifications, newCert]);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Certification
                </Button>
              </div>

              {certifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No certifications listed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="rounded-lg border border-border p-4 flex items-start justify-between"
                    >
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{cert.name}</h3>
                        <p className="text-xs text-brand-purple font-semibold">{cert.issuer}</p>
                        {cert.year && (
                          <span className="text-[11px] text-muted-foreground">
                            Issued in {cert.year}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCertifications(certifications.filter((c) => c.id !== cert.id))
                        }
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                        aria-label="Remove certification"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={() => {
                    const newProj: ApplicantProjectItem = {
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

              {projects.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No portfolio projects added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div key={proj.id} className="rounded-lg border border-border p-4 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{proj.name}</h3>
                          {proj.tech && (
                            <span className="text-[11px] font-semibold text-brand-blue">
                              {proj.tech}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setProjects(projects.filter((p) => p.id !== proj.id))}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                          aria-label="Remove project"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ApplicantLayout>
  );
}
