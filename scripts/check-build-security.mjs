import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(root, "dist");
const generatedPath = path.join(root, "src/data/projects.generated.json");
const siteConfigPath = path.join(root, "src/data/site-config.json");
const textExtensions = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".xml",
  ".txt",
  ".map",
  ".svg",
  ".webmanifest",
]);
const allowedProjectKeys = new Set([
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
const allowedUpdateKeys = new Set(["date", "summary"]);
const requiredPngAssets = new Map([
  ["favicon-32x32.png", [32, 32]],
  ["apple-touch-icon.png", [180, 180]],
  ["icons/icon-192.png", [192, 192]],
  ["icons/icon-512.png", [512, 512]],
  ["icons/icon-maskable-512.png", [512, 512]],
]);
const requiredManifestIcons = [
  ["icons/icon-192.png", "192x192", "any"],
  ["icons/icon-512.png", "512x512", "any"],
  ["icons/icon-maskable-512.png", "512x512", "maskable"],
];

async function validatePng(relativePath, expectedSize) {
  const filePath = path.join(distDirectory, relativePath);
  const buffer = await fs.readFile(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");
  const chunkType = buffer.subarray(12, 16).toString("ascii");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  if (signature !== "89504e470d0a1a0a" || chunkType !== "IHDR") {
    throw new Error(`홈 화면 아이콘이 올바른 PNG가 아닙니다: ${relativePath}`);
  }
  if (width !== expectedSize[0] || height !== expectedSize[1]) {
    throw new Error(
      `홈 화면 아이콘 크기가 다릅니다: ${relativePath} (${width}x${height})`,
    );
  }
  if ([4, 6].includes(colorType) || buffer.includes(Buffer.from("tRNS"))) {
    throw new Error(`홈 화면 아이콘 배경은 투명하면 안 됩니다: ${relativePath}`);
  }
}

async function validatePngSize(relativePath, expectedSize, label) {
  const buffer = await fs.readFile(path.join(distDirectory, relativePath));
  const signature = buffer.subarray(0, 8).toString("hex");
  const chunkType = buffer.subarray(12, 16).toString("ascii");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (signature !== "89504e470d0a1a0a" || chunkType !== "IHDR") {
    throw new Error(`${label}이(가) 올바른 PNG가 아닙니다: ${relativePath}`);
  }
  if (width !== expectedSize[0] || height !== expectedSize[1]) {
    throw new Error(
      `${label} 크기가 다릅니다: ${relativePath} (${width}x${height})`,
    );
  }
}

function linkHref(html, relation) {
  const tag = [...html.matchAll(/<link\b[^>]*>/g)].find((match) =>
    match[0].includes(`rel="${relation}"`),
  )?.[0];
  return tag?.match(/href="([^"]+)"/)?.[1] || null;
}

function metaContent(html, attribute, value) {
  const tag = [...html.matchAll(/<meta\b[^>]*>/g)].find((match) =>
    match[0].includes(`${attribute}="${value}"`),
  )?.[0];
  return tag?.match(/content="([^"]*)"/)?.[1] || null;
}

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const filePath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(filePath) : [filePath];
    }),
  );
  return nested.flat();
}

const generated = JSON.parse(await fs.readFile(generatedPath, "utf8"));
const siteConfig = JSON.parse(await fs.readFile(siteConfigPath, "utf8"));
if (!Array.isArray(generated.projects)) {
  throw new Error("생성 데이터의 projects가 목록 형태가 아닙니다.");
}
for (const project of generated.projects) {
  const unknownKey = Object.keys(project).find((key) => !allowedProjectKeys.has(key));
  if (unknownKey) {
    throw new Error(`생성 데이터에 허용되지 않은 항목이 있습니다: ${project.repo || "이름 없음"}.${unknownKey}`);
  }
  if (typeof project.githubUrl !== "string") {
    throw new Error("생성 데이터의 GitHub 주소가 올바르지 않습니다.");
  }
  if (!Array.isArray(project.updateHistory) || project.updateHistory.length === 0) {
    throw new Error(`업데이트 기록이 없습니다: ${project.repo || "이름 없음"}`);
  }
  for (const update of project.updateHistory) {
    if (!update || typeof update !== "object" || Array.isArray(update)) {
      throw new Error(`업데이트 기록 형식이 올바르지 않습니다: ${project.repo}`);
    }
    const unknownUpdateKey = Object.keys(update).find(
      (key) => !allowedUpdateKeys.has(key),
    );
    if (
      unknownUpdateKey ||
      typeof update.date !== "string" ||
      Number.isNaN(Date.parse(update.date)) ||
      typeof update.summary !== "string" ||
      update.summary.trim() === "" ||
      update.summary.length > 240
    ) {
      throw new Error(`업데이트 기록 형식이 올바르지 않습니다: ${project.repo}`);
    }
  }
  if (project.updateHistory[0].date !== project.updatedAt) {
    throw new Error(`최신 업데이트 날짜가 기록 첫 항목과 다릅니다: ${project.repo}`);
  }
  const url = new URL(project.githubUrl);
  const owner = url.pathname.split("/").filter(Boolean)[0];
  if (url.hostname !== "github.com" || owner?.toLowerCase() !== generated.githubUsername.toLowerCase()) {
    throw new Error(`다른 GitHub 계정의 저장소 주소가 포함되어 있습니다: ${project.githubUrl}`);
  }
}

const files = await listFiles(distDirectory);
for (const [relativePath, expectedSize] of requiredPngAssets) {
  await validatePng(relativePath, expectedSize);
}
await validatePngSize(siteConfig.ogImage, [1200, 630], "공유 이미지");

const manifest = JSON.parse(
  await fs.readFile(path.join(distDirectory, "site.webmanifest"), "utf8"),
);
if (
  typeof manifest.name !== "string" ||
  typeof manifest.short_name !== "string" ||
  manifest.start_url !== "./" ||
  manifest.scope !== "./" ||
  manifest.display !== "standalone" ||
  !Array.isArray(manifest.icons)
) {
  throw new Error("모바일 웹앱 manifest의 필수 설정이 올바르지 않습니다.");
}
if (
  manifest.name !== siteConfig.siteName ||
  manifest.description !== siteConfig.description
) {
  throw new Error("모바일 웹앱 이름 또는 설명이 site-config.json과 다릅니다.");
}
for (const icon of manifest.icons) {
  if (
    typeof icon?.src !== "string" ||
    icon.src.startsWith("/") ||
    icon.src.includes("..") ||
    icon.src.includes("%BASE_URL%")
  ) {
    throw new Error(`manifest 아이콘 경로는 안전한 상대 경로여야 합니다: ${icon?.src}`);
  }
}
for (const [src, sizes, purpose] of requiredManifestIcons) {
  const icon = manifest.icons.find((candidate) => candidate?.src === src);
  if (
    !icon ||
    icon.sizes !== sizes ||
    icon.type !== "image/png" ||
    icon.purpose !== purpose
  ) {
    throw new Error(`manifest 아이콘 설정이 부족합니다: ${src}`);
  }
}

const indexHtml = await fs.readFile(path.join(distDirectory, "index.html"), "utf8");
const manifestHref = linkHref(indexHtml, "manifest");
const appleIconHref = linkHref(indexHtml, "apple-touch-icon");
const canonicalUrl = linkHref(indexHtml, "canonical");
const ogUrl = metaContent(indexHtml, "property", "og:url");
const ogImageUrl = metaContent(indexHtml, "property", "og:image");
const applicationName = metaContent(indexHtml, "name", "application-name");
const appleAppTitle = metaContent(indexHtml, "name", "apple-mobile-web-app-title");
if (!manifestHref?.endsWith("/site.webmanifest")) {
  throw new Error("빌드 HTML에 웹앱 manifest 경로가 올바르게 연결되지 않았습니다.");
}
const basePrefix = manifestHref.slice(0, -"site.webmanifest".length);
if (appleIconHref !== `${basePrefix}apple-touch-icon.png`) {
  throw new Error("Apple 홈 화면 아이콘과 manifest의 배포 경로가 다릅니다.");
}
if (!canonicalUrl || canonicalUrl !== ogUrl) {
  throw new Error("canonical 주소와 Open Graph 대표 주소가 일치하지 않습니다.");
}
if (new URL(siteConfig.ogImage, canonicalUrl).href !== ogImageUrl) {
  throw new Error("Open Graph 공유 이미지 주소가 대표 주소와 일치하지 않습니다.");
}
if (
  applicationName !== manifest.short_name ||
  appleAppTitle !== manifest.short_name
) {
  throw new Error("브라우저 앱 이름과 site.webmanifest의 short_name이 다릅니다.");
}
if (
  !indexHtml.includes('<div id="root"><div id="top"') ||
  !indexHtml.includes('<main id="main-content"') ||
  !indexHtml.includes('<h1 id="hero-title"')
) {
  throw new Error("빌드 HTML에 미리 생성된 제목과 본문이 없습니다.");
}

const [robots, sitemap] = await Promise.all([
  fs.readFile(path.join(distDirectory, "robots.txt"), "utf8"),
  fs.readFile(path.join(distDirectory, "sitemap.xml"), "utf8"),
]);
const expectedSitemapUrl = new URL("sitemap.xml", canonicalUrl).href;
if (!robots.includes(`Sitemap: ${expectedSitemapUrl}`)) {
  throw new Error("robots.txt의 sitemap 주소가 대표 주소와 다릅니다.");
}
if (!sitemap.includes(`<loc>${canonicalUrl}</loc>`)) {
  throw new Error("sitemap.xml의 페이지 주소가 대표 주소와 다릅니다.");
}

const currentTokens = [process.env.GITHUB_TOKEN, process.env.GH_TOKEN].filter(
  (token) => typeof token === "string" && token.length >= 20,
);
const forbiddenMarkers = [
  "VITE_GITHUB_TOKEN",
  "github_pat_",
  "ghp_",
  "gho_",
  "ghs_",
  "ghu_",
  "ghr_",
  "__SITE_URL__",
  "__SITE_NAME__",
  "__PAGE_TITLE__",
  "__SITE_DESCRIPTION__",
  "__OG_IMAGE_URL__",
  "__STRUCTURED_DATA__",
  "%BASE_URL%",
  "정주의 웹 별자리",
];

for (const filePath of files) {
  if (!textExtensions.has(path.extname(filePath))) continue;
  const content = await fs.readFile(filePath, "utf8");
  if (forbiddenMarkers.some((marker) => content.includes(marker))) {
    throw new Error(`클라이언트 빌드에 금지된 토큰 표식이 있습니다: ${path.relative(root, filePath)}`);
  }
  if (currentTokens.some((token) => content.includes(token))) {
    throw new Error(`클라이언트 빌드에 GitHub 토큰이 포함되어 있습니다: ${path.relative(root, filePath)}`);
  }
}

console.log(
  `[security] 공개 프로젝트 ${generated.projects.length}개, 프리렌더·SEO·아이콘·dist 토큰 검사를 통과했습니다.`,
);
