import { describe, expect, it } from "vitest";
import generatedJson from "../src/data/projects.generated.json";
import overridesJson from "../src/data/project-overrides.json";
import siteConfigJson from "../src/data/site-config.json";
import {
  validateGeneratedProjects,
  validateProjectOverrides,
  validateSiteConfig,
} from "../src/lib/data-validation";
import { mergeProjects } from "../src/lib/projects";

describe("JSON 설정 검증", () => {
  it("현재 사이트 설정과 프로젝트 데이터를 정상 데이터로 인정한다", () => {
    const site = validateSiteConfig(siteConfigJson);
    expect(site.siteName).toBe("은호랑의 웹 별자리");
    expect(site.aboutNickname).toBe("은호랑");
    expect(validateProjectOverrides(overridesJson)).toHaveLength(overridesJson.length);
    expect(validateGeneratedProjects(generatedJson).projects).toHaveLength(
      generatedJson.projects.length,
    );
  });

  it("검증된 수동 설정이 자동 사이트 주소를 실수로 숨기지 않는다", () => {
    const generated = validateGeneratedProjects(generatedJson);
    const overrides = validateProjectOverrides(overridesJson);
    const projects = mergeProjects(generated.projects, overrides);
    expect(projects.find((project) => project.repo === "question-garden")?.liveUrl).toBe(
      "https://eunhorang.github.io/question-garden/",
    );
    expect(
      projects.find((project) => project.repo === "yeonsudam-teacher-training-manager")
        ?.liveUrl,
    ).toBeNull();
  });

  it("repo가 빠진 수동 설정을 파일 위치가 포함된 오류로 막는다", () => {
    expect(() => validateProjectOverrides([{ title: "저장소 없음" }])).toThrow(
      "project-overrides.json[0].repo",
    );
  });

  it("같은 저장소의 수동 설정이 중복되면 막는다", () => {
    expect(() =>
      validateProjectOverrides([{ repo: "sample" }, { repo: "SAMPLE" }]),
    ).toThrow("같은 저장소 설정이 두 번");
  });

  it("생성 데이터에 private 같은 허용되지 않은 항목이 섞이면 막는다", () => {
    const unsafe = structuredClone(generatedJson) as unknown as {
      projects: Array<Record<string, unknown>>;
    };
    unsafe.projects[0].private = "true";
    expect(() => validateGeneratedProjects(unsafe)).toThrow("지원하지 않는 항목");
  });

  it("사이트 주소와 공유 이미지 파일명이 잘못되면 명확히 알린다", () => {
    expect(() =>
      validateSiteConfig({ ...siteConfigJson, canonicalUrl: "javascript:alert(1)" }),
    ).toThrow("http:// 또는 https://");
    expect(() =>
      validateSiteConfig({ ...siteConfigJson, ogImage: "../secret.png" }),
    ).toThrow("public 폴더 안의 PNG 파일명");
    expect(() =>
      validateSiteConfig({ ...siteConfigJson, siteName: "다른 이름" }),
    ).toThrow("siteName에 적은 사이트 이름을 포함");
  });
});
