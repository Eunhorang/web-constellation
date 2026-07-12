import { describe, expect, it } from "vitest";
import {
  filterProjects,
  getFeaturedProjects,
  mergeProjects,
} from "../src/lib/projects";
import type {
  AutoProject,
  ProjectFilters,
  ProjectOverride,
} from "../src/types/project";

function automaticProject(
  repo: string,
  overrides: Partial<AutoProject> = {},
): AutoProject {
  return {
    repo,
    title: repo,
    description: `${repo} 자동 설명`,
    githubUrl: `https://github.com/test/${repo}`,
    homepageUrl: null,
    hasPages: true,
    pagesUrl: `https://test.github.io/${repo}/`,
    liveUrl: `https://test.github.io/${repo}/`,
    language: "TypeScript",
    topics: ["react"],
    stars: 0,
    updatedAt: "2026-07-01T00:00:00.000Z",
    archived: false,
    fork: false,
    ...overrides,
  };
}

const allFilters: ProjectFilters = {
  query: "",
  status: "all",
  category: "all",
  tag: "all",
  sort: "custom",
};

describe("프로젝트 자동 데이터와 수동 설정 병합", () => {
  it("수동 제목, 설명, 상태, 태그가 자동 값보다 우선한다", () => {
    const overrides: ProjectOverride[] = [
      {
        repo: "alpha",
        title: "알파 교실",
        description: "교실에서 쓰는 도구",
        category: "교육",
        status: "building",
        tags: ["학습지"],
      },
    ];
    const [project] = mergeProjects([automaticProject("alpha")], overrides);

    expect(project).toMatchObject({
      title: "알파 교실",
      description: "교실에서 쓰는 도구",
      category: "교육",
      status: "building",
      tags: ["학습지"],
    });
  });

  it("hidden이 true인 프로젝트를 화면 데이터에서 제외한다", () => {
    const projects = mergeProjects(
      [automaticProject("visible"), automaticProject("hidden")],
      [{ repo: "hidden", hidden: true }],
    );

    expect(projects.map((project) => project.repo)).toEqual(["visible"]);
  });

  it("캐시의 archived와 fork는 현재 수동 설정이 있을 때만 표시한다", () => {
    const cached = [
      automaticProject("archived", { archived: true }),
      automaticProject("fork", { fork: true }),
      automaticProject("normal"),
    ];

    expect(mergeProjects(cached, []).map((project) => project.repo)).toEqual([
      "normal",
    ]);
    expect(
      mergeProjects(cached, [
        { repo: "archived", status: "archived" },
        { repo: "fork", status: "experiment" },
      ]).map((project) => project.repo),
    ).toEqual(["archived", "fork", "normal"]);
  });

  it("수동 liveUrl을 자동 Pages 주소보다 우선하고 빈 문자열이면 방문 링크를 숨긴다", () => {
    const custom = mergeProjects(
      [automaticProject("custom")],
      [{ repo: "custom", liveUrl: "https://custom.example.com/" }],
    )[0];
    const sourceOnly = mergeProjects(
      [automaticProject("source")],
      [{ repo: "source", liveUrl: "" }],
    )[0];

    expect(custom.liveUrl).toBe("https://custom.example.com/");
    expect(sourceOnly.liveUrl).toBeNull();
    expect(sourceOnly.sourceOnly).toBe(true);
  });

  it("대표 프로젝트를 order 오름차순으로 최대 3개 정렬한다", () => {
    const automatic = ["one", "two", "three", "four"].map((repo) =>
      automaticProject(repo),
    );
    const overrides = [
      { repo: "one", featured: true, order: 4 },
      { repo: "two", featured: true, order: 1 },
      { repo: "three", featured: true, order: 2 },
      { repo: "four", featured: true, order: 3 },
    ];
    const featured = getFeaturedProjects(mergeProjects(automatic, overrides));

    expect(featured.map((project) => project.repo)).toEqual([
      "two",
      "three",
      "four",
    ]);
  });
});

describe("프로젝트 탐색", () => {
  const projects = mergeProjects(
    [automaticProject("math-tool"), automaticProject("writing-note")],
    [
      {
        repo: "math-tool",
        title: "수학 학습지",
        description: "곱셈 연습 자료",
        category: "교육",
        status: "live",
        tags: ["수학", "학습지"],
      },
      {
        repo: "writing-note",
        title: "글쓰기 노트",
        description: "생각을 기록하는 실험",
        category: "글쓰기",
        status: "experiment",
        tags: ["기록", "React"],
      },
    ],
  );

  it("프로젝트명과 설명을 검색한다", () => {
    expect(
      filterProjects(projects, { ...allFilters, query: "곱셈" }).map(
        (project) => project.repo,
      ),
    ).toEqual(["math-tool"]);
    expect(
      filterProjects(projects, { ...allFilters, query: "글쓰기" }).map(
        (project) => project.repo,
      ),
    ).toEqual(["writing-note"]);
  });

  it("상태 필터를 적용한다", () => {
    expect(
      filterProjects(projects, { ...allFilters, status: "experiment" }).map(
        (project) => project.repo,
      ),
    ).toEqual(["writing-note"]);
  });

  it("태그 필터를 적용한다", () => {
    expect(
      filterProjects(projects, { ...allFilters, tag: "학습지" }).map(
        (project) => project.repo,
      ),
    ).toEqual(["math-tool"]);
  });
});
