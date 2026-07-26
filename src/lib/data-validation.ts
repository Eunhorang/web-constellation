import type {
  AutoProject,
  GeneratedProjects,
  ProjectOverride,
  ProjectStatus,
  ProjectUpdate,
  SiteConfig,
} from "../types/project";

const PROJECT_STATUSES = new Set<ProjectStatus>([
  "live",
  "experiment",
  "building",
  "archived",
]);

const AUTO_PROJECT_KEYS = new Set([
  "repo",
  "title",
  "description",
  "githubUrl",
  "homepageUrl",
  "hasPages",
  "pagesUrl",
  "liveUrl",
  "language",
  "topics",
  "stars",
  "updatedAt",
  "updateHistory",
  "archived",
  "fork",
]);

const OVERRIDE_KEYS = new Set([
  "repo",
  "title",
  "description",
  "liveUrl",
  "githubUrl",
  "category",
  "status",
  "tags",
  "featured",
  "hidden",
  "order",
  "accent",
  "launchedAt",
  "note",
]);

const SITE_CONFIG_KEYS = new Set([
  "siteName",
  "pageTitle",
  "englishLabel",
  "owner",
  "githubUsername",
  "repository",
  "email",
  "canonicalUrl",
  "ogImage",
  "description",
  "tagline",
  "heroDescription",
  "aboutTitle",
  "aboutNickname",
  "aboutText",
  "blogUrl",
  "channelUrl",
  "channelLabel",
]);

function invalid(path: string, message: string): never {
  throw new Error(`[데이터 설정 오류] ${path}: ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid(path, "JSON 객체 형태여야 합니다.");
  }
  return value as Record<string, unknown>;
}

function knownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
) {
  const unknownKey = Object.keys(value).find((key) => !allowed.has(key));
  if (unknownKey) {
    invalid(`${path}.${unknownKey}`, "지원하지 않는 항목입니다. 철자를 확인하세요.");
  }
}

function stringValue(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    return invalid(path, allowEmpty ? "문자열이어야 합니다." : "비어 있지 않은 글자여야 합니다.");
  }
  return value.trim();
}

function optionalString(
  value: unknown,
  path: string,
  allowEmpty = false,
): string | undefined {
  return value === undefined ? undefined : stringValue(value, path, allowEmpty);
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") return invalid(path, "true 또는 false여야 합니다.");
  return value;
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  return value === undefined ? undefined : booleanValue(value, path);
}

function numberValue(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalid(path, "유효한 숫자여야 합니다.");
  }
  return value;
}

function httpUrl(value: unknown, path: string): string {
  const raw = stringValue(value, path);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return invalid(path, "올바른 웹 주소가 아닙니다.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return invalid(path, "http:// 또는 https:// 주소만 사용할 수 있습니다.");
  }
  return raw;
}

function optionalUrl(
  value: unknown,
  path: string,
  allowEmpty = false,
): string | undefined {
  if (value === undefined) return undefined;
  if (allowEmpty && value === "") return "";
  return httpUrl(value, path);
}

function nullableUrl(value: unknown, path: string): string | null {
  return value === null ? null : httpUrl(value, path);
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : stringValue(value, path);
}

function dateTime(value: unknown, path: string): string {
  const raw = stringValue(value, path);
  if (Number.isNaN(Date.parse(raw))) return invalid(path, "올바른 날짜와 시간이어야 합니다.");
  return raw;
}

function dateOnly(value: unknown, path: string): string {
  const raw = stringValue(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return invalid(path, "YYYY-MM-DD 형식이어야 합니다.");
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    return invalid(path, "실제로 존재하는 날짜여야 합니다.");
  }
  return raw;
}

function projectUpdateHistory(value: unknown, path: string): ProjectUpdate[] {
  if (!Array.isArray(value) || value.length === 0) {
    return invalid(path, "업데이트 기록이 한 건 이상 있어야 합니다.");
  }

  const seenDates = new Set<string>();
  return value.map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const item = record(entry, entryPath);
    knownKeys(item, new Set(["date", "summary"]), entryPath);
    const date = dateTime(item.date, `${entryPath}.date`);
    const summary = stringValue(item.summary, `${entryPath}.summary`);
    if (summary.length > 240) {
      invalid(`${entryPath}.summary`, "240자 이하로 간단히 작성해야 합니다.");
    }
    if (seenDates.has(date)) {
      invalid(`${entryPath}.date`, "같은 업데이트 날짜가 두 번 들어 있습니다.");
    }
    seenDates.add(date);
    return { date, summary };
  });
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return invalid(path, "글자 목록이어야 합니다.");
  return value.map((item, index) => stringValue(item, `${path}[${index}]`));
}

function validateAutoProject(value: unknown, index: number): AutoProject {
  const path = `projects.generated.json.projects[${index}]`;
  const item = record(value, path);
  knownKeys(item, AUTO_PROJECT_KEYS, path);

  const stars = numberValue(item.stars, `${path}.stars`);
  if (!Number.isInteger(stars) || stars < 0) {
    invalid(`${path}.stars`, "0 이상의 정수여야 합니다.");
  }
  const updatedAt = dateTime(item.updatedAt, `${path}.updatedAt`);
  const updateHistory = projectUpdateHistory(
    item.updateHistory,
    `${path}.updateHistory`,
  );
  if (updateHistory[0].date !== updatedAt) {
    invalid(
      `${path}.updateHistory[0].date`,
      "첫 기록은 updatedAt과 같은 최신 날짜여야 합니다.",
    );
  }

  return {
    repo: stringValue(item.repo, `${path}.repo`),
    title: stringValue(item.title, `${path}.title`),
    description: stringValue(item.description, `${path}.description`),
    githubUrl: httpUrl(item.githubUrl, `${path}.githubUrl`),
    homepageUrl: nullableUrl(item.homepageUrl, `${path}.homepageUrl`),
    hasPages: booleanValue(item.hasPages, `${path}.hasPages`),
    pagesUrl: nullableUrl(item.pagesUrl, `${path}.pagesUrl`),
    liveUrl: nullableUrl(item.liveUrl, `${path}.liveUrl`),
    language: nullableString(item.language, `${path}.language`),
    topics: stringArray(item.topics, `${path}.topics`),
    stars,
    updatedAt,
    updateHistory,
    archived: booleanValue(item.archived, `${path}.archived`),
    fork: booleanValue(item.fork, `${path}.fork`),
  };
}

export function validateGeneratedProjects(value: unknown): GeneratedProjects {
  const root = record(value, "projects.generated.json");
  knownKeys(
    root,
    new Set(["schemaVersion", "githubUsername", "generatedAt", "source", "projects"]),
    "projects.generated.json",
  );
  if (numberValue(root.schemaVersion, "projects.generated.json.schemaVersion") !== 1) {
    invalid("projects.generated.json.schemaVersion", "지원하는 값은 1입니다.");
  }
  if (!Array.isArray(root.projects)) {
    invalid("projects.generated.json.projects", "프로젝트 목록이어야 합니다.");
  }
  const projects = root.projects.map(validateAutoProject);
  const seen = new Set<string>();
  projects.forEach((project, index) => {
    const key = project.repo.toLocaleLowerCase("en-US");
    if (seen.has(key)) {
      invalid(`projects.generated.json.projects[${index}].repo`, "같은 저장소가 두 번 들어 있습니다.");
    }
    seen.add(key);
  });

  return {
    schemaVersion: 1,
    githubUsername: stringValue(root.githubUsername, "projects.generated.json.githubUsername"),
    generatedAt: dateTime(root.generatedAt, "projects.generated.json.generatedAt"),
    source: stringValue(root.source, "projects.generated.json.source"),
    projects,
  };
}

function validateOverride(value: unknown, index: number): ProjectOverride {
  const path = `project-overrides.json[${index}]`;
  const item = record(value, path);
  knownKeys(item, OVERRIDE_KEYS, path);
  const status = optionalString(item.status, `${path}.status`) as ProjectStatus | undefined;
  if (status && !PROJECT_STATUSES.has(status)) {
    invalid(`${path}.status`, "live, experiment, building, archived 중 하나여야 합니다.");
  }
  const accent = optionalString(item.accent, `${path}.accent`);
  if (accent && !/^#[0-9a-f]{6}$/i.test(accent)) {
    invalid(`${path}.accent`, "#66766A처럼 6자리 색상값을 사용하세요.");
  }

  return {
    repo: stringValue(item.repo, `${path}.repo`),
    title: optionalString(item.title, `${path}.title`),
    description: optionalString(item.description, `${path}.description`),
    liveUrl: optionalUrl(item.liveUrl, `${path}.liveUrl`, true),
    githubUrl: optionalUrl(item.githubUrl, `${path}.githubUrl`),
    category: optionalString(item.category, `${path}.category`),
    status,
    tags: item.tags === undefined ? undefined : stringArray(item.tags, `${path}.tags`),
    featured: optionalBoolean(item.featured, `${path}.featured`),
    hidden: optionalBoolean(item.hidden, `${path}.hidden`),
    order: item.order === undefined ? undefined : numberValue(item.order, `${path}.order`),
    accent,
    launchedAt: item.launchedAt === undefined ? undefined : dateOnly(item.launchedAt, `${path}.launchedAt`),
    note: optionalString(item.note, `${path}.note`, true),
  };
}

export function validateProjectOverrides(value: unknown): ProjectOverride[] {
  if (!Array.isArray(value)) {
    return invalid("project-overrides.json", "프로젝트 설정 목록이어야 합니다.");
  }
  const overrides = value.map(validateOverride);
  const seen = new Set<string>();
  overrides.forEach((override, index) => {
    const key = override.repo.toLocaleLowerCase("en-US");
    if (seen.has(key)) {
      invalid(`project-overrides.json[${index}].repo`, "같은 저장소 설정이 두 번 들어 있습니다.");
    }
    seen.add(key);
  });
  return overrides;
}

export function validateSiteConfig(value: unknown): SiteConfig {
  const path = "site-config.json";
  const item = record(value, path);
  knownKeys(item, SITE_CONFIG_KEYS, path);
  const siteName = stringValue(item.siteName, `${path}.siteName`);
  const pageTitle = stringValue(item.pageTitle, `${path}.pageTitle`);
  if (!pageTitle.includes(siteName)) {
    invalid(`${path}.pageTitle`, "siteName에 적은 사이트 이름을 포함해야 합니다.");
  }
  const email = stringValue(item.email, `${path}.email`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    invalid(`${path}.email`, "올바른 이메일 주소를 입력하세요.");
  }
  const ogImage = stringValue(item.ogImage, `${path}.ogImage`);
  if (!/^[a-z0-9][a-z0-9._-]*\.png$/i.test(ogImage)) {
    invalid(`${path}.ogImage`, "public 폴더 안의 PNG 파일명만 입력하세요.");
  }

  return {
    siteName,
    pageTitle,
    englishLabel: stringValue(item.englishLabel, `${path}.englishLabel`),
    owner: stringValue(item.owner, `${path}.owner`),
    githubUsername: stringValue(item.githubUsername, `${path}.githubUsername`),
    repository: stringValue(item.repository, `${path}.repository`),
    email,
    canonicalUrl: httpUrl(item.canonicalUrl, `${path}.canonicalUrl`),
    ogImage,
    description: stringValue(item.description, `${path}.description`),
    tagline: stringValue(item.tagline, `${path}.tagline`),
    heroDescription: stringValue(item.heroDescription, `${path}.heroDescription`),
    aboutTitle: stringValue(item.aboutTitle, `${path}.aboutTitle`),
    aboutNickname: stringValue(item.aboutNickname, `${path}.aboutNickname`),
    aboutText: stringValue(item.aboutText, `${path}.aboutText`),
    blogUrl: optionalUrl(item.blogUrl, `${path}.blogUrl`, true) ?? "",
    channelUrl: optionalUrl(item.channelUrl, `${path}.channelUrl`, true) ?? "",
    channelLabel: optionalString(item.channelLabel, `${path}.channelLabel`, true) ?? "",
  };
}
