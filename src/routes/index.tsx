"use client";

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Handshake,
  Layers,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { getDefaultRouteForRole } from "@/auth/route-access";

import {
  GoogleLogo,
  MicrosoftLogo,
  AmazonLogo,
  AdobeLogo,
  InfosysLogo,
  TCSLogo,
  FlipkartLogo,
  ZomatoLogo,
} from "@/components/common/CompanyLogos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentTrack AI — Smarter Hiring. Brighter Teams." },
      {
        name: "description",
        content:
          "AI-powered applicant tracking system. Post jobs, attract the right talent, and let AI do the heavy lifting.",
      },
    ],
  }),
  component: PublicHomePage,
});

const featureStrip = [
  {
    title: "Post Jobs Easily",
    desc: "Reach the right talent in minutes.",
    icon: FileText,
    iconBg: "bg-blue-500/10 text-brand-blue",
  },
  {
    title: "AI-Powered Screening",
    desc: "Get intelligent candidate rankings.",
    icon: Sparkles,
    iconBg: "bg-purple-500/10 text-brand-purple",
  },
  {
    title: "Manage Your Pipeline",
    desc: "Track progress, collaborate, hire.",
    icon: TrendingUp,
    iconBg: "bg-emerald-500/10 text-brand-green",
  },
  {
    title: "Find the Right Fit",
    desc: "Save time, hire with confidence.",
    icon: ShieldCheck,
    iconBg: "bg-rose-500/10 text-brand-red",
  },
];

const steps = [
  {
    num: "01",
    title: "Create an Account",
    desc: "Sign up as a job seeker or employer in a few clicks.",
    icon: UserPlus,
    color: "bg-brand-blue text-white",
  },
  {
    num: "02",
    title: "Post or Apply",
    desc: "Companies post jobs, candidates apply with ease.",
    icon: FileCheck2,
    color: "bg-brand-purple text-white",
  },
  {
    num: "03",
    title: "AI Analysis",
    desc: "Our AI scans resumes, extracts key skills, and ranks the best matches.",
    icon: Cpu,
    color: "bg-brand-green text-white",
  },
  {
    num: "04",
    title: "Connect & Hire",
    desc: "Shortlist, interview, and bring the right people onboard.",
    icon: Handshake,
    color: "bg-brand-orange text-white",
  },
];

const testimonials = [
  {
    quote:
      "TalentTrack AI reduced our screening time by 70%. The AI matching is incredibly accurate!",
    name: "Sneha Kapoor",
    role: "HR Manager, TechCorp",
    avatar: "SK",
  },
  {
    quote:
      "I found my dream job within weeks. The platform is simple and really understands my profile.",
    name: "Aarav Mehta",
    role: "Software Engineer",
    avatar: "AM",
  },
  {
    quote:
      "An essential tool for any modern recruitment team. It saves time and helps us find better talent.",
    name: "Rohit Sharma",
    role: "Talent Acquisition Lead, InnovateX",
    avatar: "RS",
  },
];

function PublicHomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nextTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand-blue selection:text-white">
      {/* 1. Header (Exact Visual Match: Clean White Header) */}
      <header className="sticky top-0 z-50 bg-card border-b border-border/80 px-4 sm:px-8 lg:px-14">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-xl bg-brand-blue text-primary-foreground shadow-xs">
              <Users className="size-6 text-white" />
              <Sparkles className="absolute -right-1 -top-1 size-3.5 text-sky-300" />
            </div>
            <div>
              <span className="text-[19px] font-extrabold tracking-tight text-foreground block leading-tight">
                TalentTrack AI
              </span>
              <span className="text-[10px] font-medium text-muted-foreground block">
                Smarter Hiring. Brighter Teams.
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-muted-foreground">
            <Link
              to="/"
              className="relative text-brand-blue font-bold after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand-blue"
            >
              Home
            </Link>
            <a href="#features" className="hover:text-foreground transition-colors">
              Jobs
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              For Employers
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">
              About
            </a>
            <Link
              to="/admin"
              className="hover:text-foreground transition-colors font-semibold text-slate-700"
            >
              Admin Portal
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="Search jobs and recruiters"
            >
              <Search className="size-4.5" />
            </button>

            {isAuthenticated && user ? (
              <Button
                className="h-10 px-5 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs gap-1.5 rounded-lg shadow-sm"
                onClick={() =>
                  navigate({
                    to: getDefaultRouteForRole(user.role),
                  })
                }
              >
                Dashboard ({user.name.split(" ")[0]})
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  asChild
                  className="h-10 px-5 text-xs font-semibold text-brand-blue border-brand-blue/30 hover:bg-surface-blue hover:text-brand-blue rounded-lg"
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button
                  asChild
                  className="h-10 px-5 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted"
            aria-label="Open mobile menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Users className="size-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-3">
            <div className="flex flex-col gap-2.5 text-sm font-medium px-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-brand-blue font-bold py-1"
              >
                Home
              </Link>
              <Link
                to="/register"
                search={{ role: "applicant" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1"
              >
                Jobs
              </Link>
              <Link
                to="/register"
                search={{ role: "recruiter" }}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1"
              >
                For Employers
              </Link>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1">
                How It Works
              </a>
            </div>
            <div className="pt-2 flex gap-2">
              <Button asChild variant="outline" className="flex-1 h-9 text-xs">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="flex-1 h-9 bg-brand-blue text-xs">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section (True Two-Sided Layout Matching Target Reference) */}
      <section className="relative overflow-hidden bg-white min-h-[580px] lg:min-h-[660px] flex items-center border-b border-border/40">
        {/* Right Photograph Panel (Occupies right 52% on desktop, absolute positioned, with soft fade on left edge) */}
        <div className="hidden lg:block absolute top-0 right-0 w-[52%] xl:w-[54%] h-full select-none pointer-events-none overflow-hidden">
          <img
            src="/images/image.png"
            alt="Recruiter using TalentTrack AI ATS platform"
            className="size-full object-cover object-[75%_center]"
            loading="eager"
          />
          {/* Subtle soft gradient fade where the image starts in the center */}
          <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white via-white/80 to-transparent" />

          {/* Handwritten Quote and Curved Arrow (Positioned 40–60px from the right edge) */}
          <div className="absolute top-10 right-12 xl:right-16 flex items-start gap-2 select-none z-10">
            {/* Hand-drawn Curved Arrow pointing to the woman */}
            <svg
              className="w-8 h-16 text-brand-blue/85 -scale-x-100 rotate-12 mt-1"
              viewBox="0 0 32 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6C18 16 26 34 18 52M18 52L10 46M18 52L26 48"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="font-serif italic font-semibold text-brand-blue text-xs sm:text-[13px] leading-tight rotate-3">
              Great
              <br />
              Talent
              <br />
              Builds
              <br />
              Great
              <br />
              Things
            </div>
          </div>
        </div>

        {/* Foreground Content Container (Clean Left Side) */}
        <div className="relative mx-auto max-w-7xl w-full px-4 sm:px-8 lg:px-14 pt-8 pb-12 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-16 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10">
            {/* Left Content Area (Occupies left 6 columns, max-w-[620px]) */}
            <div className="lg:col-span-6 xl:col-span-6 max-w-[620px] space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/25 bg-surface-blue px-4 py-1.5 text-xs font-semibold text-brand-blue shadow-2xs">
                <Sparkles className="size-3.5 text-brand-blue" />
                AI-Powered Applicant Tracking System
              </div>

              {/* Main Heading (Clean on White) */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-foreground leading-[1.12]">
                Hiring Made <br />
                <span className="text-brand-blue">Smarter,</span> Simpler.
              </h1>

              {/* Supporting Text */}
              <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed max-w-xl">
                Post jobs, attract the right talent, and let AI do the heavy lifting. For job
                seekers, find opportunities that match your skills and aspirations — faster than
                ever.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Button
                  asChild
                  className="h-11 sm:h-12 px-6 sm:px-7 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs sm:text-sm rounded-lg shadow-md gap-2"
                >
                  <Link to="/register" search={{ role: "applicant" }}>
                    <span>Find a Job</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="h-11 sm:h-12 px-6 sm:px-7 border-brand-blue/40 text-brand-blue hover:bg-surface-blue font-semibold text-xs sm:text-sm rounded-lg"
                >
                  <Link to="/register" search={{ role: "recruiter" }}>
                    I'm a Recruiter
                  </Link>
                </Button>
              </div>

              {/* Statistics Row with Subtle Vertical Dividers */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x sm:divide-border/60">
                <div className="sm:pr-4">
                  <strong className="block text-2xl sm:text-[28px] font-extrabold text-foreground tracking-tight">
                    500+
                  </strong>
                  <span className="text-[11px] text-muted-foreground">Companies</span>
                </div>
                <div className="sm:px-4">
                  <strong className="block text-2xl sm:text-[28px] font-extrabold text-foreground tracking-tight">
                    50K+
                  </strong>
                  <span className="text-[11px] text-muted-foreground">Job Seekers</span>
                </div>
                <div className="sm:px-4">
                  <strong className="block text-2xl sm:text-[28px] font-extrabold text-foreground tracking-tight">
                    1M+
                  </strong>
                  <span className="text-[11px] text-muted-foreground">Applications Processed</span>
                </div>
                <div className="sm:pl-4">
                  <strong className="block text-2xl sm:text-[28px] font-extrabold text-foreground tracking-tight">
                    4.8/5
                  </strong>
                  <span className="text-[11px] text-muted-foreground">User Satisfaction</span>
                </div>
              </div>
            </div>

            {/* Mobile / Tablet Image Fallback (Stacked vertically below content) */}
            <div className="lg:hidden w-full overflow-hidden rounded-2xl shadow-sm">
              <img
                src="/images/image.png"
                alt="Recruiter using TalentTrack AI ATS platform"
                className="w-full h-[360px] sm:h-[420px] object-cover object-center select-none"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four-Feature Strip */}
      <section id="features" className="py-6 px-4 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureStrip.map((item) => (
              <div
                key={item.title}
                className="dashboard-card p-4.5 rounded-2xl bg-card hover:shadow-md transition-shadow flex items-start gap-3.5"
              >
                <div
                  className={`grid size-10 place-items-center rounded-xl shrink-0 ${item.iconBg}`}
                >
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-tight">{item.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trusted By Innovative Companies */}
      <section className="py-12 border-y border-border/60 bg-muted/20 px-4 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-7xl text-center space-y-6">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] block">
            TRUSTED BY INNOVATIVE COMPANIES
          </span>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-14 opacity-90 transition-all duration-300">
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <GoogleLogo className="h-6.5 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <MicrosoftLogo className="h-5.5 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <AmazonLogo className="h-6.5 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <AdobeLogo className="h-6 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <InfosysLogo className="h-6 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <TCSLogo className="h-6.5 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <FlipkartLogo className="h-6.5 w-auto" />
            </div>
            <div className="flex items-center justify-center h-8 hover:scale-105 transition-transform">
              <ZomatoLogo className="h-6 w-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works (4 Steps) */}
      <section id="how-it-works" className="py-18 px-4 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-7xl text-center space-y-12">
          <div className="space-y-3">
            <span className="inline-block rounded-full bg-surface-blue px-3.5 py-1 text-xs font-bold text-brand-blue uppercase tracking-wider">
              HOW IT WORKS
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
              From Job Posting to Joining — In 4 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="flex flex-col items-center text-center space-y-3 relative group"
              >
                {/* Step Circle with Number */}
                <div className="relative mb-2">
                  <div
                    className={`grid size-14 place-items-center rounded-2xl ${step.color} shadow-lg font-extrabold text-base`}
                  >
                    <step.icon className="size-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -left-2 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold border border-border shadow-xs text-foreground">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                  {step.desc}
                </p>

                {/* Arrow Connector between steps */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 -right-4 text-muted-foreground/40 font-bold">
                    <ArrowRight className="size-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Success Stories (Dark Navy Testimonials Section) */}
      <section
        id="testimonials"
        className="sidebar-gradient text-white py-16 px-4 sm:px-8 lg:px-14"
      >
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                SUCCESS STORIES
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Hear From <br /> Our Community
              </h2>
              <p className="text-xs text-white/70">Real experiences. Real impact.</p>
            </div>

            {/* Carousel Arrow Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevTestimonial}
                className="grid size-9 place-items-center rounded-full border border-white/20 hover:bg-white/10 text-white transition-colors"
                aria-label="Previous testimonial"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextTestimonial}
                className="grid size-9 place-items-center rounded-full border border-white/20 hover:bg-white/10 text-white transition-colors"
                aria-label="Next testimonial"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`rounded-2xl border p-6 flex flex-col justify-between space-y-4 backdrop-blur-md transition-all ${
                  activeTestimonialIdx === i
                    ? "bg-white/15 border-white/30 shadow-xl scale-[1.02]"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <p className="text-xs sm:text-[13px] leading-relaxed text-white/90 italic">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <div className="grid size-8 place-items-center rounded-full bg-brand-blue text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <strong className="block text-xs font-bold text-white">{t.name}</strong>
                    <span className="block text-[10.5px] text-white/60">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA Section */}
      <section className="py-20 px-4 sm:px-8 lg:px-14 bg-gradient-to-b from-surface-blue/30 to-background relative overflow-hidden">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Ready to Build What's Next?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            Join thousands of companies and job seekers who trust TalentTrack AI for smarter hiring.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              size="lg"
              asChild
              className="h-11 px-7 bg-brand-blue hover:bg-brand-blue/90 text-primary-foreground font-semibold text-xs rounded-lg shadow-md gap-2"
            >
              <Link to="/register">
                <span>Get Started Today</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-11 px-6 border-brand-blue/30 text-brand-blue hover:bg-surface-blue font-semibold text-xs rounded-lg gap-2"
            >
              <Link to="/login">
                <Play className="size-3.5 fill-current" />
                <span>Watch Demo</span>
              </Link>
            </Button>
          </div>

          <div className="pt-4 text-xs font-serif italic text-brand-blue rotate-[-2deg]">
            Talent for a Better Tomorrow ↗
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-border bg-card py-12 px-4 sm:px-8 lg:px-14 mt-auto">
        <div className="mx-auto max-w-7xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 text-xs">
          {/* Brand Info */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative grid size-8 place-items-center rounded-lg bg-brand-blue text-white">
                <Users className="size-4.5" />
              </div>
              <span className="text-base font-bold text-foreground">TalentTrack AI</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              Smarter Hiring. Brighter Teams. Next-generation ATS supporting faster, more consistent
              candidate screening.
            </p>
            <span className="block text-[11px] text-muted-foreground/80 pt-2">
              © 2026 TalentTrack AI. All rights reserved.
            </span>
          </div>

          {/* Navigation */}
          <div className="space-y-2.5">
            <strong className="block text-xs font-bold text-foreground">Platform</strong>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  search={{ role: "applicant" }}
                  className="hover:text-foreground"
                >
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  search={{ role: "recruiter" }}
                  className="hover:text-foreground"
                >
                  For Employers
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-2.5">
            <strong className="block text-xs font-bold text-foreground">Support</strong>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Security & Privacy
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-2.5">
            <strong className="block text-xs font-bold text-foreground">Connect</strong>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  Twitter/X
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
