import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import {
  validateGeneratedProjects,
  validateProjectOverrides,
  validateSiteConfig,
} from "./src/lib/data-validation";
import { mergeProjects } from "./src/lib/projects";
import type { Project, SiteConfig } from "./src/types/project";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function readJson(relativePath: string): unknown {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
    ) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[데이터 설정 오류] ${relativePath}을(를) 읽을 수 없습니다: ${message}`);
  }
}

export function normalizeBasePath(value: string): string {
  if (!value || value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}/`;
}

export function resolveDeployment(
  command: "build" | "serve",
  env: Record<string, string>,
  site: Pick<SiteConfig, "canonicalUrl" | "githubUsername" | "repository">,
  isPreview: boolean,
) {
  if (command === "serve" && !isPreview) {
    return { base: "/", siteUrl: "http://localhost:5173/" };
  }

  const repositoryFromActions = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const repository =
    env.SITE_REPOSITORY || repositoryFromActions || site.repository;
  const username = env.GITHUB_USERNAME || site.githubUsername;
  const customDomain = env.CUSTOM_DOMAIN?.trim();
  const hasActionBasePath = process.env.PAGES_BASE_PATH !== undefined;
  const actionBasePath = process.env.PAGES_BASE_PATH?.trim() ?? "";
  const base = hasActionBasePath
    ? normalizeBasePath(actionBasePath)
    : customDomain || repository.toLowerCase() === `${username}.github.io`.toLowerCase()
      ? "/"
      : normalizeBasePath(repository);
  const customDomainUrl = customDomain
    ? normalizeSiteUrl(
        /^https?:\/\//i.test(customDomain)
          ? customDomain
          : `https://${customDomain}`,
        "CUSTOM_DOMAIN",
        true,
      )
    : null;
  // 커스텀 도메인이 있으면 GitHub Pages 임시 주소보다 대표 주소로 우선합니다.
  const configuredUrl = customDomainUrl || env.SITE_URL?.trim() || site.canonicalUrl;
  const siteUrl = normalizeSiteUrl(configuredUrl, "SITE_URL");

  return { base, siteUrl };
}

function normalizeSiteUrl(value: string, label: string, rootOnly = false): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("http 또는 https 주소가 아닙니다.");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("사용자 정보, 검색어 또는 # 조각을 포함할 수 없습니다.");
    }
    if (rootOnly && url.pathname !== "/") {
      throw new Error("도메인에는 하위 경로를 넣지 마세요.");
    }
    return url.href.endsWith("/") ? url.href : `${url.href}/`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[배포 설정 오류] ${label} 값 '${value}'이(가) 올바르지 않습니다: ${reason}`);
  }
}

function safeJsonForHtml(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMetadataHtml(
  html: string,
  siteUrl: string,
  site: SiteConfig,
  projects: Project[],
): string {
  const graph = [
    {
      "@type": "Person",
      "@id": `${siteUrl}#person`,
      name: site.owner,
      url: siteUrl,
      email: `mailto:${site.email}`,
      sameAs: [`https://github.com/${site.githubUsername}`],
    },
    {
      "@type": "ItemList",
      "@id": `${siteUrl}#projects`,
      name: `${site.owner}의 웹 프로젝트`,
      itemListElement: projects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: project.title,
        description: project.description,
        url: project.liveUrl || project.githubUrl,
      })),
    },
  ];
  const structuredData = safeJsonForHtml({
    "@context": "https://schema.org",
    "@graph": graph,
  });
  const ogImageUrl = new URL(site.ogImage, siteUrl).href;

  return html
    .replaceAll("__SITE_URL__", escapeHtml(siteUrl))
    .replaceAll("__SITE_NAME__", escapeHtml(site.siteName))
    .replaceAll("__PAGE_TITLE__", escapeHtml(site.pageTitle))
    .replaceAll("__SITE_DESCRIPTION__", escapeHtml(site.description))
    .replaceAll("__OG_IMAGE_URL__", escapeHtml(ogImageUrl))
    .replace("__STRUCTURED_DATA__", structuredData);
}

function metadataPlugin(siteUrl: string, site: SiteConfig): Plugin {
  return {
    name: "web-constellation-metadata",
    transformIndexHtml(html) {
      const generated = validateGeneratedProjects(
        readJson("src/data/projects.generated.json"),
      );
      const overrides = validateProjectOverrides(
        readJson("src/data/project-overrides.json"),
      );
      const projects = mergeProjects(generated.projects, overrides);
      return renderMetadataHtml(html, siteUrl, site, projects);
    },
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, projectRoot, [
    "SITE_",
    "GITHUB_USERNAME",
    "CUSTOM_DOMAIN",
  ]);
  const site = validateSiteConfig(readJson("src/data/site-config.json"));
  const ogImagePath = path.join(projectRoot, "public", site.ogImage);
  if (!fs.existsSync(ogImagePath)) {
    throw new Error(
      `[데이터 설정 오류] site-config.json.ogImage: public/${site.ogImage} 파일이 없습니다.`,
    );
  }
  const deployment = resolveDeployment(command, env, site, isPreview === true);

  return {
    base: deployment.base,
    plugins: [react(), tailwindcss(), metadataPlugin(deployment.siteUrl, site)],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      target: "es2022",
      sourcemap: false,
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.{ts,mjs}"],
      coverage: { reporter: ["text", "json", "html"] },
    },
  };
});
