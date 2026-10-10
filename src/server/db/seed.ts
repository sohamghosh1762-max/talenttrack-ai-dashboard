import { connectToDatabase, disconnectDatabase } from "./mongodb.ts";
import { User } from "../models/User.ts";
import { Recruiter } from "../models/Recruiter.ts";
import { Applicant } from "../models/Applicant.ts";
import { Job } from "../models/Job.ts";
import { Application } from "../models/Application.ts";
import { hashPassword } from "../auth/password.ts";

async function runSeed() {
  console.log("==================================================");
  console.log("  TalentTrack AI — Development Database Seeder  ");
  console.log("==================================================");

  try {
    await connectToDatabase();
    console.log("[Seed] Connected to MongoDB. Preparing collections...");

    // Clean up development seed documents
    await Promise.all([
      User.deleteMany({
        email: {
          $in: ["admin@talenttrack.ai", "rahul.mehta@talenttrack.ai", "aarav.mehta@example.com"],
        },
      }),
      Job.deleteMany({
        title: {
          $in: ["Senior Frontend Developer", "Lead Backend Developer", "AI/ML Systems Engineer"],
        },
      }),
      Recruiter.deleteMany({}),
      Applicant.deleteMany({}),
      Application.deleteMany({}),
    ]);

    console.log("[Seed] Cleared existing demo data.");

    const secureHash = hashPassword("password123");

    // 1. Seed Admin User
    const adminUser = await User.create({
      _id: "65f1a2b3c4d5e6f7a8b9c001",
      name: "Platform Administrator",
      email: "admin@talenttrack.ai",
      passwordHash: secureHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      adminProfile: {
        platformRole: "Super Administrator",
        permissions: ["all"],
        lastLogin: new Date().toISOString(),
      },
    });
    console.log(`[Seed] Created Admin: ${adminUser.email} (ID: ${adminUser._id})`);

    // 2. Seed Recruiter User & Recruiter Profile
    const recruiterUser = await User.create({
      _id: "65f1a2b3c4d5e6f7a8b9c003",
      name: "Rahul Mehta",
      email: "rahul.mehta@talenttrack.ai",
      passwordHash: secureHash,
      role: "RECRUITER",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      recruiterProfile: {
        companyName: "TalentTrack Technologies",
        jobTitle: "Principal Talent Acquisition Lead",
        department: "Global Engineering Recruitment",
      },
    });

    const recruiterDoc = await Recruiter.create({
      userId: recruiterUser._id,
      companyName: "TalentTrack Technologies",
      designation: "Principal Talent Acquisition Lead",
      department: "Global Engineering Recruitment",
      phone: "+1 (555) 987-6543",
      website: "https://talenttrack.ai",
    });
    console.log(`[Seed] Created Recruiter: ${recruiterUser.email} (ID: ${recruiterUser._id})`);

    // 3. Seed Applicant User & Applicant Profile
    const applicantUser = await User.create({
      _id: "65f1a2b3c4d5e6f7a8b9c008",
      name: "Aarav Mehta",
      email: "aarav.mehta@example.com",
      passwordHash: secureHash,
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      applicantProfile: {
        headline: "Senior Frontend Engineer | React, TypeScript & Next.js",
        location: "San Jose, CA",
        phone: "+1 (555) 234-5678",
        skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
        experienceYears: "5 years",
        resumeFileName: "Aarav_Mehta_Resume_2026.pdf",
      },
    });

    const applicantDoc = await Applicant.create({
      userId: applicantUser._id,
      headline: "Senior Frontend Engineer | React, TypeScript & Next.js",
      phone: "+1 (555) 234-5678",
      location: "San Jose, CA",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
      experience: "5 years",
      education: ["B.S. in Computer Science — UC Berkeley (2020)"],
      resume: "Aarav_Mehta_Resume_2026.pdf",
      summary:
        "Senior Frontend Engineer specializing in responsive web applications and state management architectures.",
    });
    console.log(`[Seed] Created Applicant: ${applicantUser.email} (ID: ${applicantUser._id})`);

    // 4. Seed Production Jobs
    const job1 = await Job.create({
      _id: "65f1a2b3c4d5e6f7a8b9c101",
      title: "Senior Frontend Developer",
      description:
        "Build high-performance web applications using React, TypeScript, and modern CSS architecture.",
      department: "Engineering",
      location: "San Francisco, CA (Hybrid)",
      employmentType: "Full-Time",
      experienceRequired: "3-5 years",
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
      salaryRange: { min: 140000, max: 180000, currency: "USD", isNegotiable: true },
      recruiterId: recruiterUser._id,
      status: "PUBLISHED",
      applicationsCount: 1,
      deadline: "2026-12-31",
    });

    const job2 = await Job.create({
      _id: "65f1a2b3c4d5e6f7a8b9c102",
      title: "Lead Backend Developer",
      description:
        "Design scalable REST & GraphQL APIs, microservices, and high-throughput data processing systems.",
      department: "Engineering",
      location: "Austin, TX (Remote)",
      employmentType: "Full-Time",
      experienceRequired: "4+ years",
      skills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL"],
      salaryRange: { min: 150000, max: 195000, currency: "USD", isNegotiable: true },
      recruiterId: recruiterUser._id,
      status: "PUBLISHED",
      applicationsCount: 0,
      deadline: "2026-12-31",
    });

    const job3 = await Job.create({
      _id: "65f1a2b3c4d5e6f7a8b9c103",
      title: "AI/ML Systems Engineer",
      description:
        "Implement transformer models, embeddings pipelines, and semantic search algorithms.",
      department: "Research",
      location: "New York, NY (Hybrid)",
      employmentType: "Full-Time",
      experienceRequired: "3+ years",
      skills: ["Python", "PyTorch", "Hugging Face", "Vector Search", "FastAPI"],
      salaryRange: { min: 160000, max: 210000, currency: "USD", isNegotiable: false },
      recruiterId: recruiterUser._id,
      status: "PUBLISHED",
      applicationsCount: 0,
      deadline: "2026-11-30",
    });
    console.log(`[Seed] Created 3 Jobs: "${job1.title}", "${job2.title}", "${job3.title}"`);

    // 5. Seed Sample Application
    const application1 = await Application.create({
      _id: "65f1a2b3c4d5e6f7a8b9c201",
      jobId: job1._id,
      applicantId: applicantUser._id,
      recruiterId: recruiterUser._id,
      resumeId: "res_65f1a2b3c4d5e6f7a8b9c008",
      coverLetter:
        "I have 5+ years of extensive experience building scalable frontend web platforms.",
      status: "Shortlisted",
      currentStage: "INTERVIEW",
      aiScore: 92,
      notes: "Strong technical background with modern React 19 and TanStack router.",
      appliedAt: new Date().toISOString(),
    });
    console.log(
      `[Seed] Created Application: ID ${application1._id} (Candidate: ${applicantUser.name} -> Job: ${job1.title})`,
    );

    console.log("==================================================");
    console.log("✅ Development Database Seed Complete!");
    console.log("  - 1 Admin user (admin@talenttrack.ai / password123)");
    console.log("  - 1 Recruiter user (rahul.mehta@talenttrack.ai / password123)");
    console.log("  - 1 Applicant user (aarav.mehta@example.com / password123)");
    console.log("  - 3 Active jobs");
    console.log("  - 1 Linked application");
    console.log("==================================================");
  } catch (err) {
    console.error("[Seed] Seeding failed with error:", err);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runSeed();
