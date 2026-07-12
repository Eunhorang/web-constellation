const DEFAULT_API_BASE = "https://api.github.com";
const CACHE_PROJECT_KEYS = new Set([
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
  "archived",
  "fork",
]);

export function isSafeHttpUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(value) {
  return isSafeHttpUrl(value) ? value.trim() : null;
}

export function parseOwnerFromRemote(remoteUrl) {
  if (typeof remoteUrl !== "string") return null;
  const value = remoteUrl.trim();
  const match = value.match(
    /github\.com(?::|\/)([^/]+)\/[^/]+?(?:\.git)?$/i,
  );
  return match?.[1] || null;
}

export function chooseGitHubUsername({
  environmentUsername,
  cliUsername,
  remoteUrl,
  configuredUsername,
}) {
  const candidates = [
    environmentUsername,
    cliUsername,
    parseOwnerFromRemote(remoteUrl),
    configuredUsername,
  ];
  return (
    candidates.find(
      (candidate) =>
        typeof candidate === "string" &&
        candidate.trim() !== "" &&
        !candidate.toLowerCase().includes("your-github-username"),
    )?.trim() || null
  );
}

export function buildDefaultPagesUrl(username, repositoryName) {
  const userSiteName = `${username}.github.io`;
  if (repositoryName.toLowerCase() === userSiteName.toLowerCase()) {
    return `https://${username.toLowerCase()}.github.io/`;
  }
  return `https://${username.toLowerCase()}.github.io/${repositoryName}/`;
}

function humanizeRepositoryName(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isPublicRepository(repository) {
  return (
    repository &&
    repository.private === false &&
    repository.visibility === "public"
  );
}

export function shouldIncludeRepository(repository, override) {
  if (!isPublicRepository(repository)) return false;
  if (repository.fork && !override) return false;
  if (repository.archived && override?.status !== "archived") return false;
  return true;
}

export function resolveAutomaticLiveUrl({
  homepage,
  pagesUrl,
  hasPages,
  username,
  repositoryName,
}) {
  return (
    normalizeUrl(homepage) ||
    normalizeUrl(pagesUrl) ||
    (hasPages ? buildDefaultPagesUrl(username, repositoryName) : null)
  );
}

export function normalizeRepository(repository, { username, pagesUrl }) {
  const githubUrl = normalizeUrl(repository.html_url);
  if (!githubUrl) return null;
  const normalizedPagesUrl = normalizeUrl(pagesUrl);

  return {
    repo: String(repository.name),
    title: humanizeRepositoryName(String(repository.name)),
    description:
      typeof repository.description === "string" && repository.description.trim()
        ? repository.description.trim()
        : "설명이 아직 등록되지 않은 공개 소스 프로젝트입니다.",
    githubUrl,
    homepageUrl: normalizeUrl(repository.homepage),
    hasPages: repository.has_pages === true,
    pagesUrl: normalizedPagesUrl,
    liveUrl: resolveAutomaticLiveUrl({
      homepage: repository.homepage,
      pagesUrl: normalizedPagesUrl,
      hasPages: repository.has_pages === true,
      username,
      repositoryName: String(repository.name),
    }),
    language:
      typeof repository.language === "string" ? repository.language : null,
    topics: Array.isArray(repository.topics)
      ? repository.topics.filter((topic) => typeof topic === "string")
      : [],
    stars:
      typeof repository.stargazers_count === "number"
        ? repository.stargazers_count
        : 0,
    updatedAt:
      typeof repository.updated_at === "string"
        ? repository.updated_at
        : new Date(0).toISOString(),
    archived: repository.archived === true,
    fork: repository.fork === true,
  };
}

function githubHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "web-constellation-sync",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchJsonWithTimeout(fetchImpl, input, options, timeoutMs, resource) {
  const controller = new AbortController();
  let response;
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      // AbortController와 연결되지 않은 테스트·대체 fetch의 본문도 가능하면 닫습니다.
      // response.json()이 이미 스트림을 잠금한 경우의 실패는 요청 실패를 덮지 않게 무시합니다.
      try {
        const cancellation = response?.body?.cancel();
        if (cancellation) void cancellation.catch(() => {});
      } catch {
        // 이미 response.json()이 잠금한 스트림은 AbortController로 중단합니다.
      }
      reject(new Error(`${resource} 요청 시간이 ${timeoutMs}ms를 초과했습니다.`));
    }, timeoutMs);
  });
  const requestAndBody = (async () => {
    response = await fetchImpl(input, { ...options, signal: controller.signal });
    if (!response.ok) throw await responseError(response, resource);
    return response.json();
  })();

  try {
    return await Promise.race([requestAndBody, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function responseError(response, resource) {
  const remaining = response.headers?.get?.("x-ratelimit-remaining");
  const rateHint = remaining === "0" ? " (GitHub API 요청 한도 소진)" : "";
  return new Error(`${resource} 요청 실패: HTTP ${response.status}${rateHint}`);
}

export async function fetchAllPublicRepositories({
  username,
  token,
  fetchImpl = globalThis.fetch,
  apiBase = DEFAULT_API_BASE,
  timeoutMs = 15_000,
}) {
  const repositories = [];

  for (let page = 1; page <= 100; page += 1) {
    const endpoint = new URL(
      `/users/${encodeURIComponent(username)}/repos`,
      apiBase,
    );
    endpoint.searchParams.set("type", "owner");
    endpoint.searchParams.set("sort", "updated");
    endpoint.searchParams.set("direction", "desc");
    endpoint.searchParams.set("per_page", "100");
    endpoint.searchParams.set("page", String(page));

    const pageItems = await fetchJsonWithTimeout(
      fetchImpl,
      endpoint,
      { headers: githubHeaders(token) },
      timeoutMs,
      "공개 저장소 목록",
    );
    if (!Array.isArray(pageItems)) {
      throw new Error("GitHub 공개 저장소 응답 형식이 올바르지 않습니다.");
    }
    repositories.push(...pageItems);
    if (pageItems.length < 100) break;
  }

  return repositories;
}

export async function fetchPagesUrl({
  username,
  repositoryName,
  token,
  fetchImpl = globalThis.fetch,
  apiBase = DEFAULT_API_BASE,
  timeoutMs = 8_000,
}) {
  const endpoint = new URL(
    `/repos/${encodeURIComponent(username)}/${encodeURIComponent(repositoryName)}/pages`,
    apiBase,
  );
  const data = await fetchJsonWithTimeout(
    fetchImpl,
    endpoint,
    { headers: githubHeaders(token) },
    timeoutMs,
    `${repositoryName} Pages`,
  );
  return normalizeUrl(data?.html_url);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function emptyCache(username, now) {
  return {
    schemaVersion: 1,
    githubUsername: username,
    generatedAt: now,
    source: "empty-fallback",
    projects: [],
  };
}

function isNullableUrl(value) {
  return value === null || isSafeHttpUrl(value);
}

function isExpectedGitHubUrl(value, username, repositoryName) {
  if (!isSafeHttpUrl(value)) return false;
  const url = new URL(value);
  const parts = url.pathname.split("/").filter(Boolean);
  return (
    url.hostname.toLowerCase() === "github.com" &&
    parts.length === 2 &&
    parts[0].toLowerCase() === username.toLowerCase() &&
    parts[1].replace(/\.git$/i, "").toLowerCase() === repositoryName.toLowerCase()
  );
}

function sanitizeCachedProject(project, username) {
  if (!project || typeof project !== "object" || Array.isArray(project)) return null;
  if (Object.keys(project).some((key) => !CACHE_PROJECT_KEYS.has(key))) return null;
  if (typeof project.repo !== "string" || project.repo.trim() === "") return null;
  if (typeof project.title !== "string" || project.title.trim() === "") return null;
  if (typeof project.description !== "string" || project.description.trim() === "") {
    return null;
  }
  if (!isExpectedGitHubUrl(project.githubUrl, username, project.repo)) return null;
  if (!isNullableUrl(project.homepageUrl)) return null;
  if (!isNullableUrl(project.liveUrl) || !isNullableUrl(project.pagesUrl)) return null;
  if (typeof project.hasPages !== "boolean") return null;
  if (project.language !== null && typeof project.language !== "string") return null;
  if (!Array.isArray(project.topics) || project.topics.some((topic) => typeof topic !== "string")) {
    return null;
  }
  if (!Number.isInteger(project.stars) || project.stars < 0) return null;
  if (typeof project.updatedAt !== "string" || Number.isNaN(Date.parse(project.updatedAt))) {
    return null;
  }
  if (typeof project.archived !== "boolean" || typeof project.fork !== "boolean") {
    return null;
  }

  return {
    repo: project.repo.trim(),
    title: project.title.trim(),
    description: project.description.trim(),
    githubUrl: project.githubUrl.trim(),
    homepageUrl: project.homepageUrl === null ? null : project.homepageUrl.trim(),
    hasPages: project.hasPages,
    pagesUrl: project.pagesUrl === null ? null : project.pagesUrl.trim(),
    liveUrl: project.liveUrl === null ? null : project.liveUrl.trim(),
    language: project.language === null ? null : project.language.trim(),
    topics: project.topics.map((topic) => topic.trim()).filter(Boolean),
    stars: project.stars,
    updatedAt: project.updatedAt,
    archived: project.archived,
    fork: project.fork,
  };
}

export function sanitizeCache(cache, username) {
  if (!cache || typeof cache !== "object" || Array.isArray(cache)) return null;
  if (
    Object.keys(cache).some(
      (key) => !["schemaVersion", "githubUsername", "generatedAt", "source", "projects"].includes(key),
    )
  ) {
    return null;
  }
  if (cache.schemaVersion !== 1) return null;
  if (
    typeof cache.githubUsername !== "string" ||
    cache.githubUsername.toLowerCase() !== username.toLowerCase()
  ) {
    return null;
  }
  if (typeof cache.generatedAt !== "string" || Number.isNaN(Date.parse(cache.generatedAt))) {
    return null;
  }
  if (typeof cache.source !== "string" || !Array.isArray(cache.projects)) return null;
  const projects = cache.projects.map((project) => sanitizeCachedProject(project, username));
  if (projects.some((project) => project === null)) return null;
  const repositories = new Set();
  for (const project of projects) {
    const key = project.repo.toLowerCase();
    if (repositories.has(key)) return null;
    repositories.add(key);
  }

  return {
    schemaVersion: 1,
    githubUsername: cache.githubUsername,
    generatedAt: cache.generatedAt,
    source: cache.source,
    projects,
  };
}

export function isValidCache(cache, username) {
  return sanitizeCache(cache, username) !== null;
}

export async function collectGitHubData({
  username,
  token,
  overrides = [],
  previousCache = null,
  fetchImpl = globalThis.fetch,
  apiBase = DEFAULT_API_BASE,
  repositoriesTimeoutMs = 15_000,
  pagesTimeoutMs = 8_000,
  now = new Date().toISOString(),
  onWarning = () => {},
}) {
  const safePreviousCache = sanitizeCache(previousCache, username);
  if (previousCache && !safePreviousCache) {
    onWarning("기존 캐시 검증에 실패해 안전한 빈 캐시로 대체합니다.");
  }

  try {
    const repositories = await fetchAllPublicRepositories({
      username,
      token,
      fetchImpl,
      apiBase,
      timeoutMs: repositoriesTimeoutMs,
    });
    const overrideByRepo = new Map(
      overrides.map((override) => [String(override.repo).toLowerCase(), override]),
    );
    const included = repositories.filter((repository) =>
      shouldIncludeRepository(
        repository,
        overrideByRepo.get(String(repository.name).toLowerCase()),
      ),
    );
    const previousByRepo = new Map(
      (safePreviousCache?.projects || []).map((project) => [
        String(project.repo).toLowerCase(),
        project,
      ]),
    );

    const projects = await mapWithConcurrency(included, 6, async (repository) => {
      let pagesUrl = null;
      if (repository.has_pages === true) {
        try {
          pagesUrl = await fetchPagesUrl({
            username,
            repositoryName: repository.name,
            token,
            fetchImpl,
            apiBase,
            timeoutMs: pagesTimeoutMs,
          });
        } catch (error) {
          pagesUrl = previousByRepo.get(String(repository.name).toLowerCase())?.pagesUrl;
          onWarning(
            `${repository.name}: Pages 상세 정보를 읽지 못해 기본 주소를 사용합니다. ${error.message}`,
          );
        }
      }
      return normalizeRepository(repository, { username, pagesUrl });
    });

    return {
      data: {
        schemaVersion: 1,
        githubUsername: username,
        generatedAt: now,
        source: "github",
        projects: projects.filter(Boolean),
      },
      usedCache: false,
      shouldWrite: true,
    };
  } catch (error) {
    onWarning(`GitHub 동기화 실패: ${error.message}`);
    if (safePreviousCache) {
      return { data: safePreviousCache, usedCache: true, shouldWrite: false };
    }
    return {
      data: emptyCache(username, now),
      usedCache: true,
      shouldWrite: true,
    };
  }
}
