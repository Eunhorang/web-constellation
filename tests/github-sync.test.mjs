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
    pushed_at: "2026-07-01T00:00:00.000Z",
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
    language: "TypeScript",
    topics: [],
    stars: 0,
    updatedAt: "2026-07-01T00:00:00.000Z",
    updateHistory: [
      {
        date: "2026-07-01T00:00:00.000Z",
        summary: "업데이트 기록 수집을 시작했습니다.",
      },
    ],
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

  it("일반 저장소 활동 시각보다 실제 코드 push 시각을 마지막 업데이트로 사용한다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("code-date", {
            pushed_at: "2026-07-02T03:00:00.000Z",
            updated_at: "2026-07-03T04:00:00.000Z",
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result.data.projects[0].updatedAt).toBe(
      "2026-07-02T03:00:00.000Z",
    );
    expect(result.data.projects[0].updateHistory).toEqual([
      {
        date: "2026-07-02T03:00:00.000Z",
        summary: "새 웹사이트가 공개 프로젝트 목록에 등록되었습니다.",
      },
    ]);
  });

  it("새 코드가 확인되면 이전 업데이트 날짜를 지우지 않고 앞에 누적한다", async () => {
    const previousCache = cacheWith([
      cachedProject("history-site", {
        updateHistory: [
          {
            date: "2026-07-01T00:00:00.000Z",
            summary: "업데이트 기록 수집을 시작했습니다.",
          },
        ],
      }),
    ]);
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("history-site", {
            description: "새 설명",
            homepage: "https://example.com/history-site/",
            pushed_at: "2026-07-02T00:00:00.000Z",
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      previousCache,
      fetchImpl,
      apiBase: "https://api.example.com",
    });
    const [latest, previous] = result.data.projects[0].updateHistory;

    expect(latest.date).toBe("2026-07-02T00:00:00.000Z");
    expect(latest.summary).toContain("새 코드가 반영");
    expect(latest.summary).toContain("프로젝트 설명");
    expect(latest.summary).toContain("공개 사이트 주소");
    expect(previous.date).toBe("2026-07-01T00:00:00.000Z");
  });

  it("코드 push 시각이 같으면 동기화할 때마다 기록을 중복 추가하지 않는다", async () => {
    const previousCache = cacheWith([
      cachedProject("same-code", {
        updateHistory: [
          {
            date: "2026-07-01T00:00:00.000Z",
            summary: "이미 확인한 최신 코드입니다.",
          },
        ],
      }),
    ]);
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("same-code", {
            updated_at: "2026-07-05T00:00:00.000Z",
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      previousCache,
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result.data.projects[0].updateHistory).toEqual(
      previousCache.projects[0].updateHistory,
    );
  });

  it("설명에서 삭제한 문구는 같은 코드 날짜의 누적 기록에도 남기지 않는다", async () => {
    const previousCache = cacheWith([
      cachedProject("metadata-safe", {
        description: "삭제해야 할 이전 공개 설명",
        updateHistory: [
          {
            date: "2026-07-01T00:00:00.000Z",
            summary:
              "업데이트 기록 수집을 시작했습니다. 현재 코드의 주요 내용: 삭제해야 할 이전 공개 설명",
          },
        ],
      }),
    ]);
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("metadata-safe", {
            description: "개인정보를 제거한 새 설명",
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      previousCache,
      fetchImpl,
      apiBase: "https://api.example.com",
    });
    const serialized = JSON.stringify(result.data.projects[0].updateHistory);

    expect(result.data.projects[0].updateHistory[0].summary).toBe(
      "프로젝트 공개 정보가 변경되었습니다. 바뀐 항목: 프로젝트 설명.",
    );
    expect(serialized).not.toContain("삭제해야 할 이전 공개 설명");
  });

  it("이전 형식 캐시는 과거를 추측하지 않고 현재 코드부터 기록을 시작한다", async () => {
    const legacyProject = cachedProject("legacy-cache");
    delete legacyProject.updateHistory;
    const previousCache = cacheWith([legacyProject]);
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("legacy-cache", {
            pushed_at: "2026-06-30T23:59:00.000Z",
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      previousCache,
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result.data.projects[0].updateHistory).toEqual([
      {
        date: "2026-06-30T23:59:00.000Z",
        summary: "업데이트 기록 수집을 시작한 현재 최신 코드입니다.",
      },
    ]);
  });

  it("pushed_at이 없는 빈 저장소는 updated_at을 보조 날짜로 사용한다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          repository("empty-repo", {
            pushed_at: null,
            updated_at: "2026-07-04T00:00:00.000Z",
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await collectGitHubData({
      username: "test",
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(result.data.projects[0].updatedAt).toBe(
      "2026-07-04T00:00:00.000Z",
    );
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

  it("이전 형식 캐시는 API 실패 중에도 기준 기록을 추가해 빌드를 계속할 수 있다", async () => {
    const legacyProject = cachedProject("legacy-fallback");
    delete legacyProject.updateHistory;
    const result = await collectGitHubData({
      username: "test",
      previousCache: cacheWith([legacyProject]),
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
    });

    expect(result.usedCache).toBe(true);
    expect(result.shouldWrite).toBe(true);
    expect(result.data.projects[0].updateHistory).toEqual([
      {
        date: "2026-07-01T00:00:00.000Z",
        summary: "마지막 정상 캐시를 기준으로 업데이트 기록을 시작했습니다.",
      },
    ]);
  });

  it("API 실패 중에도 예전 설명 원문을 누적 기록에서 제거한다", async () => {
    const result = await collectGitHubData({
      username: "test",
      previousCache: cacheWith([
        cachedProject("privacy-fallback", {
          updateHistory: [
            {
              date: "2026-07-01T00:00:00.000Z",
              summary:
                "업데이트 기록 수집을 시작했습니다. 현재 코드의 주요 내용: 삭제할 공개 설명",
            },
          ],
        }),
      ]),
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
    });

    expect(result.usedCache).toBe(true);
    expect(result.shouldWrite).toBe(true);
    expect(result.data.projects[0].updateHistory[0].summary).toBe(
      "업데이트 기록 수집을 시작한 코드 기준입니다.",
    );
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

  it("유효한 homepage가 있으면 Pages 상세 API를 호출하지 않는다", async () => {
    const fetchImpl = vi.fn(async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/pages")) {
        return new Response(JSON.stringify({ html_url: "https://pages.example.com/" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify([
          repository("homepage-site", {
            homepage: " https://homepage.example.com/site/ ",
            has_pages: true,
          }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await collectGitHubData({
      username: "test",
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.data.projects[0].liveUrl).toBe(
      "https://homepage.example.com/site/",
    );
  });

  it("수동 liveUrl 주소와 링크 숨김 빈 문자열이면 Pages 상세 API를 호출하지 않는다", async () => {
    const requestedPages = [];
    const fetchImpl = vi.fn(async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/pages")) {
        requestedPages.push(url.pathname);
        return new Response(JSON.stringify({ html_url: "https://pages.example.com/" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify([
          repository("manual-site", { has_pages: true }),
          repository("source-only", { has_pages: true }),
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    await collectGitHubData({
      username: "test",
      overrides: [
        { repo: "manual-site", liveUrl: "https://manual.example.com/" },
        { repo: "source-only", liveUrl: "" },
      ],
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(requestedPages).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("잘못된 수동 liveUrl은 생략 조건으로 보지 않고 Pages 상세 API를 조회한다", async () => {
    const fetchImpl = vi.fn(async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/pages")) {
        return new Response(
          JSON.stringify({ html_url: "https://pages.example.com/site/" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify([repository("invalid-manual", { has_pages: true })]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await collectGitHubData({
      username: "test",
      overrides: [{ repo: "invalid-manual", liveUrl: "not-a-web-url" }],
      fetchImpl,
      apiBase: "https://api.example.com",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.data.projects[0].liveUrl).toBe(
      "https://pages.example.com/site/",
    );
  });

  it("private 변형이나 임의 비밀 필드가 섞인 캐시는 거부한다", () => {
    expect(isValidCache(cacheWith([cachedProject("one", { private: "true" })]), "test")).toBe(false);
    expect(isValidCache(cacheWith([cachedProject("one", { visibility: "PRIVATE" })]), "test")).toBe(false);
    expect(isValidCache(cacheWith([cachedProject("one", { secret: "do-not-publish" })]), "test")).toBe(false);
    expect(
      isValidCache(
        cacheWith([
          cachedProject("one", {
            updateHistory: [
              {
                date: "2026-07-01T00:00:00.000Z",
                summary: "정상처럼 보이는 기록",
                secret: "do-not-publish",
              },
            ],
          }),
        ]),
        "test",
      ),
    ).toBe(false);
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
