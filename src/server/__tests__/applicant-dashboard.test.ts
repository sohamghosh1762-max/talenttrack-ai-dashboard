import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateProfileCompletion,
  formatApplicationDate,
  calculateJobMatch,
  getStageStepIndex,
} from "../../lib/applicant-utils.ts";
import type { SafeUser } from "../types/user-types.ts";
import type { IJob } from "../types/job-types.ts";

describe("APPLICANT DASHBOARD DYNAMICS & UTILITY SUITE", () => {
  describe("1. Profile Completion Calculator", () => {
    it("returns 0% and account suggestion when user is null", () => {
      const result = calculateProfileCompletion(null);
      assert.equal(result.percentage, 0);
      assert.equal(result.completedCount, 0);
      assert.equal(result.totalCount, 7);
      assert.ok(result.nextSuggestion.includes("Log in"));
    });

    it("calculates 14% for basic info only", () => {
      const user: Partial<SafeUser> = {
        name: "Test Candidate",
        email: "candidate@example.com",
        applicantProfile: {
          skills: [],
        },
      };
      const result = calculateProfileCompletion(user as SafeUser);
      assert.equal(result.percentage, 14);
      assert.equal(result.completedCount, 1);
      assert.ok(result.nextSuggestion.includes("headline"));
    });

    it("calculates 100% when all profile fields are present", () => {
      const user: Partial<SafeUser> = {
        name: "Test Candidate",
        email: "candidate@example.com",
        applicantProfile: {
          headline: "Senior Frontend Engineer",
          location: "San Jose, CA",
          phone: "+1 555 1234",
          summary: "Passionate engineer crafting scalable web apps.",
          skills: ["React", "TypeScript", "Node.js"],
          experiences: [{ id: "1", title: "Dev", company: "Co", period: "2020-2024" }],
          education: [{ id: "1", degree: "B.S. CS", institution: "Univ", period: "2016-2020" }],
        },
      };
      const result = calculateProfileCompletion(user as SafeUser);
      assert.equal(result.percentage, 100);
      assert.equal(result.completedCount, 7);
      assert.equal(result.nextSuggestion, "Profile 100% complete!");
    });
  });

  describe("2. Application Date Formatter", () => {
    it("handles missing date gracefully", () => {
      assert.equal(formatApplicationDate(undefined), "Recently");
    });

    it("formats recent timestamp as Just now or minutes/hours ago", () => {
      const now = new Date().toISOString();
      assert.equal(formatApplicationDate(now), "Just now");

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      assert.equal(formatApplicationDate(twoHoursAgo), "2h ago");

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      assert.equal(formatApplicationDate(threeDaysAgo), "3 days ago");
    });
  });

  describe("3. Deterministic Job Match Calculator", () => {
    const job: IJob = {
      id: "job-101",
      title: "Senior Frontend Engineer",
      description: "Looking for an expert with React, TypeScript, and modern front-end architectures.",
      department: "Engineering",
      location: "San Francisco, CA",
      employmentType: "Full-Time",
      experienceRequired: "5+ years",
      skills: ["React", "TypeScript", "Tailwind CSS", "Redux Toolkit"],
      recruiterId: "rec-1",
      status: "PUBLISHED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("returns isAvailable false when user has no skills", () => {
      const result = calculateJobMatch(job, []);
      assert.equal(result.isAvailable, false);
      assert.equal(result.matchScore, 0);
      assert.ok(result.explanation.includes("Add skills"));
    });

    it("calculates high match percentage and extracts overlapping skills", () => {
      const candidateSkills = ["React", "TypeScript", "Python"];
      const result = calculateJobMatch(job, candidateSkills);
      assert.equal(result.isAvailable, true);
      assert.ok(result.matchScore >= 80);
      assert.ok(result.matchedSkills.includes("React"));
      assert.ok(result.matchedSkills.includes("TypeScript"));
      assert.ok(!result.matchedSkills.includes("Python"));
      assert.ok(result.explanation.includes("React"));
    });
  });

  describe("4. Pipeline Stage Step Index", () => {
    it("maps linear ATS stages correctly", () => {
      assert.equal(getStageStepIndex("APPLIED"), 0);
      assert.equal(getStageStepIndex("SCREENING"), 1);
      assert.equal(getStageStepIndex("SHORTLISTED"), 1);
      assert.equal(getStageStepIndex("INTERVIEW"), 2);
      assert.equal(getStageStepIndex("OFFERED"), 3);
      assert.equal(getStageStepIndex("REJECTED"), -1);
    });
  });
});
