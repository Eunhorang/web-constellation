import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(root, "dist");
const generatedPath = path.join(root, "src/data/projects.generated.json");
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
  "archived",
  "fork",
]);

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
  const url = new URL(project.githubUrl);
  const owner = url.pathname.split("/").filter(Boolean)[0];
  if (url.hostname !== "github.com" || owner?.toLowerCase() !== generated.githubUsername.toLowerCase()) {
    throw new Error(`다른 GitHub 계정의 저장소 주소가 포함되어 있습니다: ${project.githubUrl}`);
  }
}

const files = await listFiles(distDirectory);
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

console.log(`[security] 공개 프로젝트 ${generated.projects.length}개와 dist 토큰 노출 검사를 통과했습니다.`);
