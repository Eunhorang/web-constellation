export type ProjectStatus = "live" | "experiment" | "building" | "archived";
export type ProjectSort = "custom" | "updated" | "name";

export interface AutoProject {
  repo: string;
  title: string;
  description: string;
  githubUrl: string;
  homepageUrl: string | null;
  hasPages: boolean;
  pagesUrl: string | null;
  liveUrl: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  updatedAt: string;
  archived: boolean;
  fork: boolean;
}

export interface ProjectOverride {
  repo: string;
  title?: string;
  description?: string;
  liveUrl?: string;
  githubUrl?: string;
  category?: string;
  status?: ProjectStatus;
  tags?: string[];
  featured?: boolean;
  hidden?: boolean;
  order?: number;
  accent?: string;
  launchedAt?: string;
  note?: string;
}

export interface Project {
  repo: string;
  title: string;
  description: string;
  liveUrl: string | null;
  githubUrl: string;
  category: string;
  status: ProjectStatus;
  tags: string[];
  featured: boolean;
  order: number;
  accent: string;
  launchedAt: string | null;
  note: string | null;
  updatedAt: string;
  language: string | null;
  stars: number;
  sourceOnly: boolean;
}

export interface GeneratedProjects {
  schemaVersion: number;
  githubUsername: string;
  generatedAt: string;
  source: string;
  projects: AutoProject[];
}

export interface SiteConfig {
  siteName: string;
  pageTitle: string;
  englishLabel: string;
  owner: string;
  githubUsername: string;
  repository: string;
  email: string;
  canonicalUrl: string;
  ogImage: string;
  description: string;
  tagline: string;
  heroDescription: string;
  aboutTitle: string;
  aboutText: string;
  blogUrl: string;
  channelUrl: string;
  channelLabel: string;
}

export interface ProjectFilters {
  query: string;
  status: ProjectStatus | "all";
  category: string;
  tag: string;
  sort: ProjectSort;
}
