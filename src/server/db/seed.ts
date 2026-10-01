import { connectToDatabase, disconnectDatabase } from "./mongodb.ts";
import { User } from "../models/User.ts";
import { Recruiter } from "../models/Recruiter.ts";
import { Applicant } from "../models/Applicant.ts";
import { Job } from "../models/Job.ts";
import { Application } from "../models/Application.ts";
import { Interview } from "../models/Interview.ts";
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
      User.deleteMany({ email: { $in: ["admin@talenttrack.ai", "rahul.mehta@talenttrack.ai", "aarav.mehta@example.com", "priya.sharma@example.com", "vikram.singh@example.com"] } }),
      Job.deleteMany({ title: { $in: ["Senior Frontend Developer", "Lead Backend Developer", "AI/ML Systems Engineer"] } }),
      Recruiter.deleteMany({}),
      Applicant.deleteMany({}),
      Application.deleteMany({}),
      Interview.deleteMany({}),
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

    await Recruiter.create({
      userId: recruiterUser._id,
      companyName: "TalentTrack Technologies",
      designation: "Principal Talent Acquisition Lead",
      department: "Global Engineering Recruitment",
      phone: "+1 (555) 987-6543",
      website: "https://talenttrack.ai",
    });
    console.log(`[Seed] Created Recruiter: ${recruiterUser.email} (ID: ${recruiterUser._id})`);

    // 3. Seed Applicants
    const applicantUser1 = await User.create({
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

    await Applicant.create({
      userId: applicantUser1._id,
      headline: "Senior Frontend Engineer | React, TypeScript & Next.js",
      phone: "+1 (555) 234-5678",
      location: "San Jose, CA",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"],
      experience: "5 years",
      education: ["B.S. in Computer Science — UC Berkeley (2020)"],
      resume: "Aarav_Mehta_Resume_2026.pdf",
      summary: "Senior Frontend Engineer specializing in responsive web applications and state management architectures.",
    });

    const applicantUser2 = await User.create({
      _id: "65f1a2b3c4d5e6f7a8b9c009",
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      passwordHash: secureHash,
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      applicantProfile: {
        headline: "Lead Backend & Distributed Systems Engineer",
        location: "Austin, TX",
        phone: "+1 (555) 345-6789",
        skills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL", "Docker"],
        experienceYears: "6 years",
        resumeFileName: "Priya_Sharma_Resume.pdf",
      },
    });

    await Applicant.create({
      userId: applicantUser2._id,
      headline: "Lead Backend & Distributed Systems Engineer",
      phone: "+1 (555) 345-6789",
      location: "Austin, TX",
      skills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL", "Docker"],
      experience: "6 years",
      education: ["M.S. in Computer Science — UT Austin (2019)"],
      resume: "Priya_Sharma_Resume.pdf",
      summary: "Passionate Backend Lead focused on high performance API gateways, database optimization, and microservice architecture.",
    });

    const applicantUser3 = await User.create({
      _id: "65f1a2b3c4d5e6f7a8b9c010",
      name: "Vikram Singh",
      email: "vikram.singh@example.com",
      passwordHash: secureHash,
      role: "APPLICANT",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      applicantProfile: {
        headline: "AI/ML Engineer & Natural Language Processing Specialist",
        location: "New York, NY",
        phone: "+1 (555) 456-7890",
        skills: ["Python", "PyTorch", "FastAPI", "Vector Search", "Hugging Face", "LLMs"],
        experienceYears: "4 years",
        resumeFileName: "Vikram_Singh_CV.pdf",
      },
    });

    await Applicant.create({
      userId: applicantUser3._id,
      headline: "AI/ML Engineer & Natural Language Processing Specialist",
      phone: "+1 (555) 456-7890",
      location: "New York, NY",
      skills: ["Python", "PyTorch", "FastAPI", "Vector Search", "Hugging Face", "LLMs"],
      experience: "4 years",
      education: ["B.Tech in Computer Engineering — IIT Bombay (2021)"],
      resume: "Vikram_Singh_CV.pdf",
      summary: "Machine learning researcher and systems developer building generative AI agents and semantic search engines.",
    });

    console.log(`[Seed] Created 3 Applicants: ${applicantUser1.email}, ${applicantUser2.email}, ${applicantUser3.email}`);

    // 4. Seed Production Jobs
    const job1 = await Job.create({
      _id: "65f1a2b3c4d5e6f7a8b9c101",
      title: "Senior Frontend Developer",
      description: "Build high-performance web applications using React, TypeScript, and modern CSS architecture.",
      department: "Engineering",
      location: "San Francisco, CA (Hybrid)",
      employmentType: "Full-Time",
      experienceRequired: "3-5 years",
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
      preferredSkills: ["GraphQL", "Web Workers", "Tailwind CSS v4"],
      education: "Bachelor's Degree in Computer Science or equivalent",
      salaryRange: { min: 140000, max: 180000, currency: "USD", isNegotiable: true },
      recruiterId: recruiterUser._id,
      status: "PUBLISHED",
      applicationsCount: 2,
      deadline: "2026-12-31",
    });

    const job2 = await Job.create({
      _id: "65f1a2b3c4d5e6f7a8b9c102",
      title: "Lead Backend Developer",
      description: "Design scalable REST & GraphQL APIs, microservices, and high-throughput data processing systems.",
      department: "Engineering",
      location: "Austin, TX (Remote)",
      employmentType: "Full-Time",
      experienceRequired: "4+ years",
      skills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL"],
      preferredSkills: ["Redis", "AWS Lambda", "Kafka"],
      education: "Master's or Bachelor's in CS / Software Engineering",
      salaryRange: { min: 150000, max: 195000, currency: "USD", isNegotiable: true },
      recruiterId: recruiterUser._id,
      status: "PUBLISHED",
      applicationsCount: 1,
      deadline: "2026-12-31",
    });

    const job3 = await Job.create({
      _id: "65f1a2b3c4d5e6f7a8b9c103",
      title: "AI/ML Systems Engineer",
      description: "Implement transformer models, embeddings pipelines, and semantic search algorithms.",
      department: "Research",
      location: "New York, NY (Hybrid)",
      employmentType: "Full-Time",
      experienceRequired: "3+ years",
      skills: ["Python", "PyTorch", "Hugging Face", "Vector Search", "FastAPI"],
      preferredSkills: ["CUDA", "LangChain", "Fine-tuning Llama"],
      education: "Master's or Ph.D. in AI / Machine Learning",
      salaryRange: { min: 160000, max: 210000, currency: "USD", isNegotiable: false },
      recruiterId: recruiterUser._id,
      status: "PUBLISHED",
      applicationsCount: 1,
      deadline: "2026-11-30",
    });
    console.log(`[Seed] Created 3 Jobs: "${job1.title}", "${job2.title}", "${job3.title}"`);

    // 5. Seed Applications
    const application1 = await Application.create({
      _id: "65f1a2b3c4d5e6f7a8b9c201",
      jobId: job1._id,
      applicantId: applicantUser1._id,
      recruiterId: recruiterUser._id,
      resumeId: "res_65f1a2b3c4d5e6f7a8b9c008",
      coverLetter: "I have 5+ years of extensive experience building scalable frontend web platforms.",
      status: "Shortlisted",
      currentStage: "INTERVIEW",
      aiScore: 92,
      notes: "Strong technical background with modern React 19 and TanStack router.",
      appliedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    });

    const application2 = await Application.create({
      _id: "65f1a2b3c4d5e6f7a8b9c202",
      jobId: job2._id,
      applicantId: applicantUser2._id,
      recruiterId: recruiterUser._id,
      resumeId: "res_65f1a2b3c4d5e6f7a8b9c009",
      coverLetter: "Lead backend developer with deep experience in Node.js and MongoDB performance tuning.",
      status: "Shortlisted",
      currentStage: "INTERVIEW",
      aiScore: 95,
      notes: "Top candidate for Backend Lead role.",
      appliedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    });

    const application3 = await Application.create({
      _id: "65f1a2b3c4d5e6f7a8b9c203",
      jobId: job3._id,
      applicantId: applicantUser3._id,
      recruiterId: recruiterUser._id,
      resumeId: "res_65f1a2b3c4d5e6f7a8b9c010",
      coverLetter: "Focused on AI agents, RAG architectures, and vector embeddings.",
      status: "Under Review",
      currentStage: "SCREENING",
      aiScore: 89,
      notes: "High potential match for ML systems engineer role.",
      appliedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    });

    console.log(`[Seed] Created 3 Applications.`);

    // 6. Seed Interviews
    const interview1 = await Interview.create({
      _id: "65f1a2b3c4d5e6f7a8b9c301",
      jobId: job1._id,
      applicationId: application1._id,
      applicantId: applicantUser1._id,
      recruiterId: recruiterUser._id,
      candidateName: applicantUser1.name,
      candidateEmail: applicantUser1.email,
      jobRole: job1.title,
      interviewer: "Sarah Jenkins (VP Eng)",
      dateTime: "Tomorrow at 3:00 PM EST",
      interviewType: "Video Call",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      status: "Scheduled",
      notes: "Technical Round: Architecture design and Live React coding.",
    } as any);

    const interview2 = await Interview.create({
      _id: "65f1a2b3c4d5e6f7a8b9c302",
      jobId: job2._id,
      applicationId: application2._id,
      applicantId: applicantUser2._id,
      recruiterId: recruiterUser._id,
      candidateName: applicantUser2.name,
      candidateEmail: applicantUser2.email,
      jobRole: job2.title,
      interviewer: "David Kim (Lead Architect)",
      dateTime: "Oct 3, 2026 at 1:30 PM EST",
      interviewType: "Video Call",
      meetingLink: "https://zoom.us/j/9876543210",
      status: "Scheduled",
      notes: "System Design Round: High throughput API gateway & Mongo indexing.",
    } as any);

    console.log(`[Seed] Created 2 Interviews: ID ${interview1._id} & ID ${interview2._id}`);

    console.log("==================================================");
    console.log("✅ Development Database Seed Complete!");
    console.log("  - 1 Admin user (admin@talenttrack.ai / password123)");
    console.log("  - 1 Recruiter user (rahul.mehta@talenttrack.ai / password123)");
    console.log("  - 3 Applicant users (password123)");
    console.log("  - 3 Active jobs");
    console.log("  - 3 Applications across pipeline stages");
    console.log("  - 2 Scheduled interviews");
    console.log("==================================================");
  } catch (err) {
    console.error("[Seed] Seeding failed with error:", err);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runSeed();

