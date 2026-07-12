import type {
  AutoProject,
  Project,
  ProjectFilters,
  ProjectOverride,
  ProjectSort,
  ProjectStatus,
} from "../types/project";

const DEFAULT_ACCENTS = ["#66766a", "#8a6d55", "#718294", "#7a6f86"];
const VALID_STATUSES = new Set<ProjectStatus>([
  "live",
  "experiment",
  "building",
  "archived",
]);

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  live: "운영 중",
  experiment: "실험 중",
  building: "준비 중",
  archived: "보관됨",
};

export const SORT_LABELS: Record<ProjectSort, string> = {
  custom: "사용자 지정 순서",
  updated: "최근 업데이트순",
  name: "이름순",
};

export const DEFAULT_FILTERS: ProjectFilters = {
  query: "",
  status: "all",
  category: "all",
  tag: "all",
  sort: "custom",
};

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function safeUrlOrNull(value: unknown): string | null {
  return isSafeHttpUrl(value) ? value.trim() : null;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeAccent(value: unknown, repo: string): string {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }
  return DEFAULT_ACCENTS[hashString(repo) % DEFAULT_ACCENTS.length];
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanTags(value: unknown, fallback: string[]): string[] {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(
    new Set(
      source
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

function projectStatus(
  override: ProjectOverride | undefined,
  automatic: AutoProject,
  liveUrl: string | null,
): ProjectStatus {
  if (override?.status && VALID_STATUSES.has(override.status)) {
    return override.status;
  }
  if (automatic.archived) return "archived";
  return liveUrl ? "live" : "experiment";
}

function compareCustom(a: Project, b: Project): number {
  return (
    a.order - b.order ||
    Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
    a.title.localeCompare(b.title, "ko")
  );
}

export function mergeProjects(
  automaticProjects: AutoProject[],
  overrides: ProjectOverride[],
): Project[] {
  const overrideByRepo = new Map(
    overrides.map((override) => [override.repo.toLowerCase(), override]),
  );

  return automaticProjects
    .map((automatic): Project | null => {
      const override = overrideByRepo.get(automatic.repo.toLowerCase());
      if (automatic.fork && !override) return null;
      if (automatic.archived && override?.status !== "archived") return null;
      if (override?.hidden === true) return null;

      const hasManualLiveUrl = override?.liveUrl !== undefined;
      const liveUrl = hasManualLiveUrl
        ? safeUrlOrNull(override.liveUrl)
        : safeUrlOrNull(automatic.liveUrl);
      const githubUrl =
        safeUrlOrNull(override?.githubUrl) || safeUrlOrNull(automatic.githubUrl);
      if (!githubUrl) return null;

      const fallbackTags = [
        ...(automatic.topics || []),
        ...(automatic.language ? [automatic.language] : []),
      ];
      const tags = cleanTags(override?.tags, fallbackTags);

      return {
        repo: automatic.repo,
        title: cleanText(override?.title, automatic.title),
        description: cleanText(override?.description, automatic.description),
        liveUrl,
        githubUrl,
        category: cleanText(
          override?.category,
          liveUrl ? "웹 프로젝트" : "소스 프로젝트",
        ),
        status: projectStatus(override, automatic, liveUrl),
        tags: tags.length > 0 ? tags : ["웹"],
        featured: override?.featured === true,
        order:
          typeof override?.order === "number" && Number.isFinite(override.order)
            ? override.order
            : 999,
        accent: normalizeAccent(override?.accent, automatic.repo),
        launchedAt:
          typeof override?.launchedAt === "string"
            ? override.launchedAt
            : null,
        note: typeof override?.note === "string" ? override.note : null,
        updatedAt: automatic.updatedAt,
        language: automatic.language,
        stars: automatic.stars,
        sourceOnly: liveUrl === null,
      };
    })
    .filter((project): project is Project => project !== null)
    .sort(compareCustom);
}

export function getFeaturedProjects(projects: Project[]): Project[] {
  return projects.filter((project) => project.featured).sort(compareCustom).slice(0, 3);
}

function searchableText(project: Project): string {
  return [
    project.title,
    project.description,
    project.repo,
    project.category,
    ...project.tags,
  ]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("ko");
}

export function sortProjects(
  projects: Project[],
  sort: ProjectSort,
): Project[] {
  return [...projects].sort((a, b) => {
    if (sort === "name") return a.title.localeCompare(b.title, "ko");
    if (sort === "updated") {
      return (
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        a.title.localeCompare(b.title, "ko")
      );
    }
    return compareCustom(a, b);
  });
}

export function filterProjects(
  projects: Project[],
  filters: ProjectFilters,
): Project[] {
  const normalizedQuery = filters.query
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("ko");

  const filtered = projects.filter((project) => {
    if (normalizedQuery && !searchableText(project).includes(normalizedQuery)) {
      return false;
    }
    if (filters.status !== "all" && project.status !== filters.status) {
      return false;
    }
    if (filters.category !== "all" && project.category !== filters.category) {
      return false;
    }
    if (filters.tag !== "all" && !project.tags.includes(filters.tag)) {
      return false;
    }
    return true;
  });

  return sortProjects(filtered, filters.sort);
}

export function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

export function projectIdToken(repo: string): string {
  return encodeURIComponent(repo.trim().toLocaleLowerCase("en-US"));
}

export function projectElementId(repo: string): string {
  return `project-${projectIdToken(repo)}`;
}

export function formatKoreanDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미상";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
