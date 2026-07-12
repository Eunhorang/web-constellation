import { afterEach, describe, expect, it } from "vitest";
import { resolveDeployment } from "../vite.config";

const site = {
  canonicalUrl: "https://eunhorang.github.io/web-constellation/",
  githubUsername: "Eunhorang",
  repository: "web-constellation",
  owner: "이정주",
  email: "owner@example.com",
  siteName: "은호랑의 웹 별자리",
  description: "테스트 설명",
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
});
