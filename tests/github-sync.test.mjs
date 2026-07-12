import { describe, expect, it, vi } from "vitest";
import {
  buildDefaultPagesUrl,
  chooseGitHubUsername,
  collectGitHubData,
  fetchAllPublicRepositories,
  isValidCache,
  parseOwnerFromRemote,
  resolveAutomaticLiveUrl,
} from "../scripts/github-sync-core.mjs";

function repository(name, overrides = {}) {
  return {
    name,
    description: `${name} description`,
    html_url: `https://github.com/test/${name}`,
    homepage: null,
    has_pages: false,
    language: "TypeScript",
    topics: [],
    stargazers_count: 0,
    updated_at: "2026-07-01T00:00:00.000Z",
    archived: false,
    fork: false,
    private: false,
    visibility: "public",
    ...overrides,
  };
}

function cachedProject(name, overrides = {}) {
  return {
    repo: name,
    title: name,
    description: `${name} description`,
    githubUrl: `https://github.com/test/${name}`,
    homepageUrl: null,
    hasPages: false,
    pagesUrl: null,
    liveUrl: null,
    language: null,
    topics: [],
    stars: 0,
    updatedAt: "2026-07-01T00:00:00.000Z",
    archived: false,
    fork: false,
    ...overrides,
  };
}

function cacheWith(projects) {
  return {
    schemaVersion: 1,
    githubUsername: "test",
    generatedAt: "2026-07-01T00:00:00.000Z",
    source: "github",
    projects,
  };
}

function hangingJsonResponse() {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("["));
      // 헤더는 받았지만 JSON 본문이 끝나지 않는 서버를 재현합니다.
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("GitHub 사용자명 확인", () => {
  it("환경 변수, CLI, origin, 설정 파일 순서로 선택한다", () => {
    expect(
      chooseGitHubUsername({
        environmentUsername: "environment-user",
        cliUsername: "cli-user",
        remoteUrl: "https://github.com/remote-user/repo.git",
        configuredUsername: "config-user",
      }),
    ).toBe("environment-user");
    expect(parseOwnerFromRemote("git@github.com:Eunhorang/repo.git")).toBe(
      "Eunhorang",
    );
  });
});

describe("GitHub 저장소 수집", () => {
  it("100개를 넘는 저장소를 페이지네이션으로 모두 읽는다", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      repository(`repo-${index}`),
    );
    const fetchImpl = vi.fn(async (input) => {
      const page = new URL(input).searchParams.get("page");
      return new Response(JSON.stringify(page === "1" ? firstPage : [repository("last")]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await fetchAllPublicRepositories({
      username: "test",
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result).toHaveLength(101);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("private repository를 생성 JSON 후보에서 제외한다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("public"),
          repository("private", { private: true, visibility: "private" }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result.data.projects.map((project) => project.repo)).toEqual(["public"]);
    expect(JSON.stringify(result.data)).not.toContain('"private"');
  });

  it("hidden 프로젝트는 자동 캐시에 남겨 API 실패 뒤에도 다시 표시할 수 있게 한다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([repository("hidden-public")]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await collectGitHubData({
      username: "test",
      overrides: [{ repo: "hidden-public", hidden: true }],
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result.data.projects.map((project) => project.repo)).toEqual([
      "hidden-public",
    ]);
  });

  it("GitHub API가 실패하면 마지막 정상 캐시를 그대로 사용한다", async () => {
    const previousCache = cacheWith([cachedProject("cached", { title: "Cached" })]);
    const warnings = [];
    const result = await collectGitHubData({
      username: "test",
      previousCache,
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
      onWarning: (message) => warnings.push(message),
    });

    expect(result.data).toEqual(previousCache);
    expect(result.usedCache).toBe(true);
    expect(result.shouldWrite).toBe(false);
    expect(warnings[0]).toContain("GitHub 동기화 실패");
  });

  it("응답이 멈춘 요청도 제한 시간이 지나면 캐시로 전환한다", async () => {
    const previousCache = cacheWith([cachedProject("cached")]);
    const result = await collectGitHubData({
      username: "test",
      previousCache,
      repositoriesTimeoutMs: 10,
      fetchImpl: async () => new Promise(() => {}),
    });

    expect(result.usedCache).toBe(true);
    expect(result.data.projects[0].repo).toBe("cached");
  });

  it("JSON 본문이 끝나지 않아도 저장소 목록 요청을 중단하고 캐시를 쓴다", async () => {
    const previousCache = cacheWith([cachedProject("cached")]);
    const result = await collectGitHubData({
      username: "test",
      previousCache,
      repositoriesTimeoutMs: 10,
      fetchImpl: async () => hangingJsonResponse(),
    });

    expect(result.usedCache).toBe(true);
    expect(result.data.projects[0].repo).toBe("cached");
  });

  it("Pages JSON 본문이 끝나지 않으면 기본 Pages 주소로 계속한다", async () => {
    const warnings = [];
    const fetchImpl = vi.fn(async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/pages")) return hangingJsonResponse();
      return new Response(
        JSON.stringify([repository("site", { has_pages: true })]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await collectGitHubData({
      username: "test",
      fetchImpl,
      apiBase: "https://api.example.com",
      pagesTimeoutMs: 10,
      onWarning: (message) => warnings.push(message),
    });

    expect(result.usedCache).toBe(false);
    expect(result.data.projects[0].liveUrl).toBe("https://test.github.io/site/");
    expect(warnings.join(" ")).toContain("Pages 상세 정보를 읽지 못해");
  });

  it("private 변형이나 임의 비밀 필드가 섞인 캐시는 거부한다", () => {
    expect(isValidCache(cacheWith([cachedProject("one", { private: "true" })]), "test")).toBe(false);
    expect(isValidCache(cacheWith([cachedProject("one", { visibility: "PRIVATE" })]), "test")).toBe(false);
    expect(isValidCache(cacheWith([cachedProject("one", { secret: "do-not-publish" })]), "test")).toBe(false);
  });

  it("private 표시가 있는 기존 캐시는 API 실패 시 사용하지 않는다", async () => {
    const privateCache = {
      schemaVersion: 1,
      githubUsername: "test",
      generatedAt: "2026-07-01T00:00:00.000Z",
      source: "github",
      projects: [
        {
          repo: "secret",
          title: "Secret",
          description: "private data",
          githubUrl: "https://github.com/test/secret",
          pagesUrl: null,
          liveUrl: null,
          updatedAt: "2026-07-01T00:00:00.000Z",
          archived: false,
          fork: false,
          private: true,
          visibility: "private",
        },
      ],
    };
    const warnings = [];
    const result = await collectGitHubData({
      username: "test",
      previousCache: privateCache,
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
      onWarning: (message) => warnings.push(message),
    });

    expect(result.data.projects).toEqual([]);
    expect(result.shouldWrite).toBe(true);
    expect(warnings.join(" ")).toContain("기존 캐시 검증에 실패");
  });

  it("Pages API가 없어도 has_pages 기본 주소를 만든다", () => {
    expect(
      resolveAutomaticLiveUrl({
        homepage: null,
        pagesUrl: null,
        hasPages: true,
        username: "Eunhorang",
        repositoryName: "web-constellation",
      }),
    ).toBe("https://eunhorang.github.io/web-constellation/");
    expect(buildDefaultPagesUrl("Eunhorang", "Eunhorang.github.io")).toBe(
      "https://eunhorang.github.io/",
    );
  });
});
