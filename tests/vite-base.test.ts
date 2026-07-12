import { afterEach, describe, expect, it } from "vitest";
import { renderMetadataHtml, resolveDeployment } from "../vite.config";
import type { Project, SiteConfig } from "../src/types/project";

const site: SiteConfig = {
  canonicalUrl: "https://eunhorang.github.io/web-constellation/",
  githubUsername: "Eunhorang",
  repository: "web-constellation",
  owner: "이정주",
  email: "owner@example.com",
  siteName: "은호랑의 웹 별자리",
  pageTitle: "은호랑의 웹 별자리 | 테스트",
  englishLabel: "WEB CONSTELLATION",
  ogImage: "og-image-eunhorang.png",
  description: "테스트 설명",
  tagline: "테스트 문구",
  heroDescription: "테스트 소개",
  aboutTitle: "만든 사람",
  aboutNickname: "은호랑",
  aboutText: "테스트 소개",
  blogUrl: "",
  channelUrl: "",
  channelLabel: "",
};

const originalPagesBasePath = process.env.PAGES_BASE_PATH;
const originalGitHubRepository = process.env.GITHUB_REPOSITORY;

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnvironment("PAGES_BASE_PATH", originalPagesBasePath);
  restoreEnvironment("GITHUB_REPOSITORY", originalGitHubRepository);
});

describe("GitHub Pages base 경로", () => {
  it("일반 프로젝트 저장소는 저장소 이름을 하위 경로로 사용한다", () => {
    const result = resolveDeployment("build", {}, site, false);
    expect(result.base).toBe("/web-constellation/");
  });

  it("configure-pages가 빈 base_path를 주면 커스텀 도메인 루트로 처리한다", () => {
    process.env.PAGES_BASE_PATH = "";
    const result = resolveDeployment(
      "build",
      { SITE_URL: "https://constellation.example/" },
      site,
      false,
    );
    expect(result.base).toBe("/");
    expect(result.siteUrl).toBe("https://constellation.example/");
  });

  it("개발 서버는 루트, 프로덕션 미리보기는 Pages 하위 경로를 쓴다", () => {
    expect(resolveDeployment("serve", {}, site, false).base).toBe("/");
    expect(resolveDeployment("serve", {}, site, true).base).toBe(
      "/web-constellation/",
    );
  });

  it("CUSTOM_DOMAIN만 있어도 검색·공유 주소를 해당 도메인으로 맞춘다", () => {
    const result = resolveDeployment(
      "build",
      { CUSTOM_DOMAIN: "constellation.example.com" },
      site,
      false,
    );
    expect(result).toEqual({
      base: "/",
      siteUrl: "https://constellation.example.com/",
    });
  });

  it("잘못된 SITE_URL은 조용히 배포하지 않고 설명 있는 오류를 낸다", () => {
    expect(() =>
      resolveDeployment("build", { SITE_URL: "not-a-url" }, site, false),
    ).toThrow("배포 설정 오류");
  });
});

describe("빌드 메타데이터", () => {
  it("배포 하위 경로와 수동 liveUrl을 HTML과 구조화 데이터에 반영한다", () => {
    const project: Project = {
      repo: "sample",
      title: "샘플 프로젝트",
      description: "수동 설정을 검증하는 프로젝트",
      liveUrl: "https://custom.example.com/sample/",
      githubUrl: "https://github.com/Eunhorang/sample",
      category: "도구",
      status: "live",
      tags: [],
      featured: false,
      order: 1,
      accent: "#66766A",
      launchedAt: null,
      note: null,
      updatedAt: "2026-07-01T00:00:00.000Z",
      language: "TypeScript",
      stars: 0,
      sourceOnly: false,
    };
    const html = [
      "<title>__PAGE_TITLE__</title>",
      '<meta property="og:url" content="__SITE_URL__" />',
      '<meta property="og:image" content="__OG_IMAGE_URL__" />',
      '<script type="application/ld+json">__STRUCTURED_DATA__</script>',
    ].join("");
    const output = renderMetadataHtml(
      html,
      "https://eunhorang.github.io/web-constellation/",
      site,
      [project],
    );

    expect(output).not.toContain("__PAGE_TITLE__");
    expect(output).toContain(
      "https://eunhorang.github.io/web-constellation/og-image-eunhorang.png",
    );
    const json = output.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/,
    )?.[1];
    expect(json).toBeDefined();
    const structuredData = JSON.parse(json ?? "{}");
    expect(structuredData["@graph"][1].itemListElement[0].url).toBe(
      "https://custom.example.com/sample/",
    );
  });
});
