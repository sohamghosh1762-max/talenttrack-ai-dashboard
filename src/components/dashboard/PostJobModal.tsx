"use client";

import { useState } from "react";
import { Plus, Sparkles, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PostJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated?: (newJob: {
    title: string;
    department: string;
    location: string;
    type: string;
  }) => void;
}

export function PostJobModal({ open, onOpenChange, onJobCreated }: PostJobModalProps) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [location, setLocation] = useState("San Francisco, CA (Hybrid)");
  const [type, setType] = useState("Full-Time");
  const [experience, setExperience] = useState("3-5 years");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (status: "Active" | "Draft") => {
    if (!title.trim()) return;

    onJobCreated?.({
      title,
      department,
      location,
      type,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onOpenChange(false);
      // Reset form
      setTitle("");
      setDescription("");
      setRequirements("");
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-brand-blue">
            <Plus className="size-5 font-bold" />
            <DialogTitle className="text-lg font-bold">Post a New Job Opening</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Define role parameters, department allocation, and skill expectations for AI candidate
            matching.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95">
            <div className="grid size-14 place-items-center rounded-full bg-surface-green text-brand-green mb-3">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">Job Opening Published!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              "{title}" has been added to your hiring pipeline and is ready for AI screening.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit("Active");
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

            <div>
              <label
                htmlFor="job-desc"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Role Description & Key Responsibilities
              </label>
              <textarea
                id="job-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe core duties, team mission, and impact..."
                className="w-full rounded-md border border-input bg-card p-2.5 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label htmlFor="job-req" className="block text-xs font-semibold text-foreground mb-1">
                Required Technical Skills (Used for AI Matching)
              </label>
              <input
                id="job-req"
                type="text"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="e.g. React, TypeScript, Python, Node.js, AWS"
                className="h-9.5 w-full rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSubmit("Draft")}
                className="text-xs"
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold gap-1.5"
              >
                <Sparkles className="size-3.5" />
                Publish Job
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
