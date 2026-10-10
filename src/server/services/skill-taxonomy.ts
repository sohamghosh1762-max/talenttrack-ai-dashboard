import type {
  SkillEvidenceCategory,
  SkillVerificationStatus,
} from "../types/screening-types.ts";
import type { IParsedResumeProfile } from "../types/resume-types.ts";

/**
 * Enterprise Canonical Skill Taxonomy & Aliases Map
 * Maps common variants, misspellings, abbreviations, and informal terms to canonical standards
 */
export const SKILL_ALIASES: Record<string, string> = {
  // Programming Languages
  js: "JavaScript",
  javascript: "JavaScript",
  ecmascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  python3: "Python",
  golang: "Go",
  go: "Go",
  java: "Java",
  csharp: "C#",
  "c#": "C#",
  "c++": "C++",
  cpp: "C++",
  ruby: "Ruby",
  rust: "Rust",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",

  // Frontend & UI
  react: "React",
  reactjs: "React",
  "react.js": "React",
  next: "Next.js",
  nextjs: "Next.js",
  "next.js": "Next.js",
  vue: "Vue.js",
  vuejs: "Vue.js",
  "vue.js": "Vue.js",
  angular: "Angular",
  angularjs: "Angular",
  svelte: "Svelte",
  html: "HTML5",
  html5: "HTML5",
  css: "CSS3",
  css3: "CSS3",
  sass: "Sass",
  scss: "Sass",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  redux: "Redux",
  zustand: "Zustand",
  webpack: "Webpack",
  vite: "Vite",

  // Backend & APIs
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  express: "Express",
  expressjs: "Express",
  "express.js": "Express",
  nestjs: "NestJS",
  nest: "NestJS",
  django: "Django",
  fastapi: "FastAPI",
  flask: "Flask",
  spring: "Spring Boot",
  "spring boot": "Spring Boot",
  graphql: "GraphQL",
  gql: "GraphQL",
  rest: "REST APIs",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  restful: "REST APIs",
  grpc: "gRPC",
  microservices: "Microservices",
  "microservice architecture": "Microservices",

  // Databases & Caching
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  psql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  mysql: "MySQL",
  redis: "Redis",
  elasticsearch: "Elasticsearch",
  elastic: "Elasticsearch",
  dynamodb: "DynamoDB",
  dynamo: "DynamoDB",
  sqlite: "SQLite",
  cassandra: "Cassandra",
  prisma: "Prisma",
  mongoose: "Mongoose",

  // Cloud & DevOps
  aws: "AWS",
  "amazon web services": "AWS",
  gcp: "GCP",
  "google cloud": "GCP",
  "google cloud platform": "GCP",
  azure: "Azure",
  "microsoft azure": "Azure",
  docker: "Docker",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  kube: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  jenkins: "Jenkins",
  "github actions": "GitHub Actions",
  gha: "GitHub Actions",
  gitlab: "GitLab CI",
  "gitlab ci": "GitLab CI",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  "continuous integration": "CI/CD",
  linux: "Linux",
  bash: "Bash",
  shell: "Shell Scripting",

  // Messaging & Streaming
  kafka: "Kafka",
  "apache kafka": "Kafka",
  rabbitmq: "RabbitMQ",
  sqs: "AWS SQS",

  // AI & ML
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  tf: "TensorFlow",
  langchain: "LangChain",
  openai: "OpenAI",
  gemini: "Gemini",
  llm: "LLMs",
  llms: "LLMs",
  nlp: "NLP",
  cv: "Computer Vision",
  "machine learning": "Machine Learning",
  ml: "Machine Learning",
  "deep learning": "Deep Learning",

  // Design & Architecture
  systemdesign: "System Design",
  "system design": "System Design",
  oop: "Object-Oriented Programming",
  tdd: "TDD",
  "test driven development": "TDD",
  jest: "Jest",
  vitest: "Vitest",
  cypress: "Cypress",
  playwright: "Playwright",
  git: "Git",
  agile: "Agile",
  scrum: "Scrum",
};

export interface ExtractedSkillEvidence {
  canonical: string;
  original: string;
  category: SkillEvidenceCategory;
  evidence: string;
  section?: string | undefined;
  confidence: number;
  status: SkillVerificationStatus;
}

export class SkillTaxonomyService {
  /**
   * Normalizes a raw skill string to its canonical taxonomy representation
   */
  public canonicalizeSkill(raw: string): string {
    if (!raw || typeof raw !== "string") return "";
    const clean = raw.trim();
    if (!clean) return "";

    const lower = clean.toLowerCase();
    if (SKILL_ALIASES[lower]) {
      return SKILL_ALIASES[lower]!;
    }

    // Strip common suffixes/prefixes (e.g., "Developer", "Engineering", "Framework")
    const stripped = lower
      .replace(/\s+(framework|library|tools|technology|development|developer)$/i, "")
      .trim();
    if (SKILL_ALIASES[stripped]) {
      return SKILL_ALIASES[stripped]!;
    }

    // Capitalize first letter of words as fallback
    return clean
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  /**
   * Normalizes an array of skills, deduping and canonicalizing
   */
  public normalizeSkillList(skills: string[]): string[] {
    const canonicalSet = new Set<string>();
    for (const s of skills) {
      const canonical = this.canonicalizeSkill(s);
      if (canonical) {
        canonicalSet.add(canonical);
      }
    }
    return Array.from(canonicalSet);
  }

  /**
   * Extracts all verified skills from a parsed resume profile along with concrete evidence citations
   */
  public extractSkillsWithEvidence(
    profile: IParsedResumeProfile,
  ): Map<string, ExtractedSkillEvidence> {
    const evidenceMap = new Map<string, ExtractedSkillEvidence>();

    // 1. Employment Experience (Highest verification category - hands-on practical application)
    if (Array.isArray(profile.experience)) {
      for (const exp of profile.experience) {
        const company = exp.company || "Company";
        const role = exp.role || "Role";
        const descText = Array.isArray(exp.description)
          ? exp.description.join(". ")
          : String(exp.description || "");

        // Check technologies listed in employment
        const techs = Array.isArray(exp.technologies) ? exp.technologies : [];
        for (const t of techs) {
          const canonical = this.canonicalizeSkill(t);
          if (canonical && !evidenceMap.has(canonical.toLowerCase())) {
            evidenceMap.set(canonical.toLowerCase(), {
              canonical,
              original: t,
              category: "employment",
              evidence: `Applied as ${role} at ${company}: "${descText.slice(0, 160)}${descText.length > 160 ? "..." : ""}"`,
              section: "Work Experience",
              confidence: 0.95,
              status: "supported",
            });
          }
        }

        // Check if known skills are mentioned in bullet descriptions
        for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
          const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          if (regex.test(descText) && !evidenceMap.has(canonical.toLowerCase())) {
            evidenceMap.set(canonical.toLowerCase(), {
              canonical,
              original: alias,
              category: "employment",
              evidence: `Evidenced in responsibilities as ${role} at ${company}: "${descText.slice(0, 160)}${descText.length > 160 ? "..." : ""}"`,
              section: "Work Experience",
              confidence: 0.9,
              status: "supported",
            });
          }
        }
      }
    }

    // 2. Technical Projects (Practical evidence)
    if (Array.isArray(profile.projects)) {
      for (const proj of profile.projects) {
        const name = proj.name || "Technical Project";
        const desc = proj.description || "";
        const techs = Array.isArray(proj.technologies) ? proj.technologies : [];

        for (const t of techs) {
          const canonical = this.canonicalizeSkill(t);
          const key = canonical.toLowerCase();
          if (canonical && (!evidenceMap.has(key) || evidenceMap.get(key)!.category !== "employment")) {
            evidenceMap.set(key, {
              canonical,
              original: t,
              category: "project",
              evidence: `Demonstrated in project "${name}": "${desc.slice(0, 140)}${desc.length > 140 ? "..." : ""}"`,
              section: "Projects",
              confidence: 0.85,
              status: "supported",
            });
          }
        }
      }
    }

    // 3. Industry Certifications (Formal credential verification)
    if (Array.isArray(profile.certifications)) {
      for (const cert of profile.certifications) {
        const name = cert.name || "Certification";
        const issuer = cert.issuer || "";
        for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
          const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          if (regex.test(name)) {
            const key = canonical.toLowerCase();
            if (!evidenceMap.has(key)) {
              evidenceMap.set(key, {
                canonical,
                original: alias,
                category: "certification",
                evidence: `Certified credential: ${name} (issued by ${issuer || "Accredited Provider"})`,
                section: "Certifications",
                confidence: 0.9,
                status: "supported",
              });
            }
          }
        }
      }
    }

    // 4. Skills list & Summary (Mentioned / self-declared without explicit context)
    const rawSkills = Array.isArray(profile.skills) ? profile.skills : [];
    for (const s of rawSkills) {
      const canonical = this.canonicalizeSkill(s);
      const key = canonical.toLowerCase();
      if (canonical && !evidenceMap.has(key)) {
        evidenceMap.set(key, {
          canonical,
          original: s,
          category: "summary",
          evidence: `Listed in technical skills inventory without detailed employment role linkage.`,
          section: "Skills",
          confidence: 0.65,
          status: "partially_supported",
        });
      }
    }

    if (profile.summary) {
      for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
        const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(profile.summary)) {
          const key = canonical.toLowerCase();
          if (!evidenceMap.has(key)) {
            evidenceMap.set(key, {
              canonical,
              original: alias,
              category: "summary",
              evidence: `Referenced in professional summary: "${profile.summary.slice(0, 120)}..."`,
              section: "Summary",
              confidence: 0.6,
              status: "partially_supported",
            });
          }
        }
      }
    }

    return evidenceMap;
  }

  /**
   * Calculates total professional experience years from employment dates
   */
  public calculateExperienceYears(experience: IParsedResumeProfile["experience"]): number {
    if (!Array.isArray(experience) || experience.length === 0) {
      return 0;
    }

    let totalMonths = 0;
    const now = new Date();

    for (const exp of experience) {
      if (!exp.startDate) continue;

      let startYear = 0;
      let startMonth = 1;

      const startParts = exp.startDate.split(/[-/]/);
      if (startParts.length >= 1 && startParts[0]) {
        startYear = parseInt(startParts[0], 10);
      }
      if (startParts.length >= 2 && startParts[1]) {
        startMonth = parseInt(startParts[1], 10) || 1;
      }

      if (isNaN(startYear) || startYear < 1970 || startYear > now.getFullYear() + 1) {
        continue;
      }

      let endYear = now.getFullYear();
      let endMonth = now.getMonth() + 1;

      if (exp.endDate && !/present|current/i.test(exp.endDate)) {
        const endParts = exp.endDate.split(/[-/]/);
        if (endParts.length >= 1 && endParts[0]) {
          const parsedEndYear = parseInt(endParts[0], 10);
          if (!isNaN(parsedEndYear) && parsedEndYear >= 1970) {
            endYear = parsedEndYear;
          }
        }
        if (endParts.length >= 2 && endParts[1]) {
          endMonth = parseInt(endParts[1], 10) || 12;
        }
      }

      const diff = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (diff > 0 && diff < 600) {
        totalMonths += diff;
      }
    }

    // Default to at least 1-2 years if records exist but missing granular months
    if (totalMonths === 0 && experience.length > 0) {
      return experience.length * 1.5;
    }

    const calculatedYears = Math.round((totalMonths / 12) * 10) / 10;
    return Math.max(0, calculatedYears);
  }
}

export const skillTaxonomyService = new SkillTaxonomyService();

export const canonicalizeSkill = (skill: string): string =>
  skillTaxonomyService.canonicalizeSkill(skill);

export const normalizeSkillList = (skills: string[]): string[] =>
  skillTaxonomyService.normalizeSkillList(skills);

export const extractSkillsWithEvidence = (
  profile: IParsedResumeProfile,
): Map<string, ExtractedSkillEvidence> =>
  skillTaxonomyService.extractSkillsWithEvidence(profile);

export const calculateExperienceYears = (
  experience: NonNullable<IParsedResumeProfile["experience"]>,
): number => skillTaxonomyService.calculateExperienceYears(experience);
