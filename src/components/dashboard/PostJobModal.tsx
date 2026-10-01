"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, CheckCircle, Edit3, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateJob, useUpdateJob } from "@/hooks/api/useJobs";
import type { IJob } from "@/server/types/job-types";
import type { JobOpening } from "@/data/mockData";
import { toast } from "sonner";

interface PostJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobToEdit?: IJob | JobOpening | null;
  onJobCreated?: (newJob: any) => void;
}

export function PostJobModal({ open, onOpenChange, jobToEdit, onJobCreated }: PostJobModalProps) {
  const isEditing = !!jobToEdit;
  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [location, setLocation] = useState("San Francisco, CA (Hybrid)");
  const [type, setType] = useState("Full-Time");
  const [experience, setExperience] = useState("3-5 years");
  const [education, setEducation] = useState("Bachelor's Degree in CS or equivalent");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [minSalary, setMinSalary] = useState<string>("");
  const [maxSalary, setMaxSalary] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (jobToEdit && open) {
      setTitle(jobToEdit.title || "");
      setDepartment(jobToEdit.department || "Engineering");
      setLocation(jobToEdit.location || "Remote");
      setType(
        ("employmentType" in jobToEdit ? jobToEdit.employmentType : (jobToEdit as JobOpening).type) || "Full-Time",
      );
      setExperience(
        ("experienceRequired" in jobToEdit
          ? jobToEdit.experienceRequired
          : (jobToEdit as JobOpening).experience) || "2-4 years",
      );
      setEducation(("education" in jobToEdit ? jobToEdit.education : undefined) || "Bachelor's Degree in CS or equivalent");
      setDescription(jobToEdit.description || "");
      if ("skills" in jobToEdit && Array.isArray(jobToEdit.skills)) {
        setSkills(jobToEdit.skills.join(", "));
      } else {
        setSkills("");
      }
      if ("preferredSkills" in jobToEdit && Array.isArray(jobToEdit.preferredSkills)) {
        setPreferredSkills(jobToEdit.preferredSkills.join(", "));
      } else {
        setPreferredSkills("");
      }
      if ("salaryRange" in jobToEdit && jobToEdit.salaryRange) {
        setMinSalary(jobToEdit.salaryRange.min?.toString() || "");
        setMaxSalary(jobToEdit.salaryRange.max?.toString() || "");
      } else {
        setMinSalary("");
        setMaxSalary("");
      }
    } else if (!open) {
      // Reset form on close
      setTitle("");
      setDepartment("Engineering");
      setLocation("San Francisco, CA (Hybrid)");
      setType("Full-Time");
      setExperience("3-5 years");
      setEducation("Bachelor's Degree in CS or equivalent");
      setDescription("");
      setSkills("");
      setPreferredSkills("");
      setMinSalary("");
      setMaxSalary("");
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [jobToEdit, open]);

  const handleSubmit = async (status: "PUBLISHED" | "DRAFT") => {
    if (!title.trim()) {
      setErrorMessage("Job title is required.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage("Description must be at least 10 characters.");
      return;
    }

    setErrorMessage(null);
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const salaryRange =
      minSalary || maxSalary
        ? {
            min: minSalary ? Number(minSalary) : undefined,
            max: maxSalary ? Number(maxSalary) : undefined,
            currency: "USD",
            isNegotiable: true,
          }
        : undefined;

    try {
      if (isEditing && jobToEdit) {
        await updateJobMutation.mutateAsync({
          id: jobToEdit.id,
          data: {
            title: title.trim(),
            department: department.trim(),
            location: location.trim(),
            employmentType: type as any,
            experienceRequired: experience.trim(),
            description: description.trim(),
            skills: skillList,
            salaryRange,
            status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
          },
        });
        toast.success("Job opening updated successfully!");
      } else {
        const created = await createJobMutation.mutateAsync({
          title: title.trim(),
          department: department.trim(),
          location: location.trim(),
          employmentType: type as any,
          experienceRequired: experience.trim(),
          description: description.trim(),
          skills: skillList,
          salaryRange,
          recruiterId: "", // Automatically assigned on server from session
          status,
        });
        onJobCreated?.(created);
        toast.success(status === "PUBLISHED" ? "Job opening published!" : "Job saved as draft.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
      }, 1000);
    } catch (err: any) {
      const msg = err.message || "Failed to save job opening. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const isPending = createJobMutation.isPending || updateJobMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-brand-blue">
            {isEditing ? <Edit3 className="size-5 font-bold" /> : <Plus className="size-5 font-bold" />}
            <DialogTitle className="text-lg font-bold">
              {isEditing ? "Edit Job Opening" : "Post a New Job Opening"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update role parameters, description, and requirements."
              : "Define role parameters, department allocation, and skill expectations for candidate matching."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95">
            <div className="grid size-14 place-items-center rounded-full bg-surface-green text-brand-green mb-3">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {isEditing ? "Job Details Updated!" : "Job Opening Published!"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              "{title}" changes have been saved to the database.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit("PUBLISHED");
            }}
            className="space-y-3.5 py-1"
          >
            <div>
              <label
                htmlFor="job-title"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Job Title <span className="text-destructive">*</span>
              </label>
              <input
                id="job-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer, Staff Data Scientist"
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="job-department"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Department
                </label>
                <select
                  id="job-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Research">Research</option>
                  <option value="Design">Design</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="job-type"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Employment Type
                </label>
                <select
                  id="job-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="job-location"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Location
                </label>
                <input
                  id="job-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA / Remote"
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>

              <div>
                <label
                  htmlFor="job-exp"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Experience Level
                </label>
                <input
                  id="job-exp"
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 3-5 years"
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="job-min-salary"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Min Salary ($ / yr)
                </label>
                <input
                  id="job-min-salary"
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="e.g. 120000"
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>

              <div>
                <label
                  htmlFor="job-max-salary"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Max Salary ($ / yr)
                </label>
                <input
                  id="job-max-salary"
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="e.g. 160000"
                  className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="job-desc"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Role Description & Key Responsibilities <span className="text-destructive">*</span>
              </label>
              <textarea
                id="job-desc"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe core duties, team mission, and impact..."
                className="w-full rounded-md border border-input bg-card p-2.5 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label htmlFor="job-education" className="block text-xs font-semibold text-foreground mb-1">
                Education Requirement
              </label>
              <input
                id="job-education"
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. Bachelor's in Computer Science or equivalent"
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label htmlFor="job-req" className="block text-xs font-semibold text-foreground mb-1">
                Required Technical Skills (comma separated)
              </label>
              <input
                id="job-req"
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, TypeScript, Python, Node.js, AWS"
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label htmlFor="job-pref" className="block text-xs font-semibold text-foreground mb-1">
                Preferred / Nice-to-Have Skills (comma separated)
              </label>
              <input
                id="job-pref"
                type="text"
                value={preferredSkills}
                onChange={(e) => setPreferredSkills(e.target.value)}
                placeholder="e.g. GraphQL, Docker, Kubernetes, Next.js"
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              {!isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleSubmit("DRAFT")}
                  className="text-xs"
                >
                  Save as Draft
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
                className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    {isEditing ? "Save Changes" : "Publish Job"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
