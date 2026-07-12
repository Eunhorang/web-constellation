import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

interface SiteConfig {
  canonicalUrl: string;
  githubUsername: string;
  repository: string;
  owner: string;
  email: string;
  siteName: string;
  description: string;
}

interface GeneratedProject {
  repo: string;
  title: string;
  description: string;
  githubUrl: string;
  liveUrl: string | null;
}

interface GeneratedData {
  projects: GeneratedProject[];
}

interface ProjectOverride {
  repo: string;
  title?: string;
  description?: string;
  liveUrl?: string;
  githubUrl?: string;
  hidden?: boolean;
  order?: number;
}

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
  ) as T;
}

export function normalizeBasePath(value: string): string {
  if (!value || value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}/`;
}

export function resolveDeployment(
  command: "build" | "serve",
  env: Record<string, string>,
  site: SiteConfig,
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
  const configuredUrl = env.SITE_URL?.trim() || site.canonicalUrl;
  const siteUrl = configuredUrl.endsWith("/")
    ? configuredUrl
    : `${configuredUrl}/`;

  return { base, siteUrl };
}

function safeJsonForHtml(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? value.trim()
      : null;
  } catch {
    return null;
  }
}

function projectsForMetadata(
  generated: GeneratedProject[],
  overrides: ProjectOverride[],
) {
  const overrideByRepo = new Map(
    overrides.map((override) => [override.repo.toLowerCase(), override]),
  );
  return generated
    .map((project) => {
      const override = overrideByRepo.get(project.repo.toLowerCase());
      if (override?.hidden) return null;
      const hasManualLiveUrl =
        override !== undefined &&
        Object.prototype.hasOwnProperty.call(override, "liveUrl");
      return {
        repo: project.repo,
        title: override?.title?.trim() || project.title,
        description: override?.description?.trim() || project.description,
        githubUrl: safeHttpUrl(override?.githubUrl) || project.githubUrl,
        liveUrl: hasManualLiveUrl
          ? safeHttpUrl(override.liveUrl)
          : safeHttpUrl(project.liveUrl),
        order:
          typeof override?.order === "number" && Number.isFinite(override.order)
            ? override.order
            : 999,
      };
    })
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "ko"));
}

function metadataPlugin(siteUrl: string, site: SiteConfig): Plugin {
  return {
    name: "web-constellation-metadata",
    transformIndexHtml(html) {
      const generated = readJson<GeneratedData>(
        "src/data/projects.generated.json",
      );
      const overrides = readJson<ProjectOverride[]>(
        "src/data/project-overrides.json",
      );
      const projects = projectsForMetadata(generated.projects, overrides);
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

      return html
        .replaceAll("__SITE_URL__", siteUrl)
        .replaceAll("__SITE_NAME__", site.siteName)
        .replaceAll("__SITE_DESCRIPTION__", site.description)
        .replace("__STRUCTURED_DATA__", structuredData);
    },
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, projectRoot, [
    "SITE_",
    "GITHUB_USERNAME",
    "CUSTOM_DOMAIN",
  ]);
  const site = readJson<SiteConfig>("src/data/site-config.json");
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
