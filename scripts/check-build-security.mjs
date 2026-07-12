import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(root, "dist");
const generatedPath = path.join(root, "src/data/projects.generated.json");
const textExtensions = new Set([".html", ".js", ".css", ".json", ".xml", ".txt", ".map"]);

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
const unsafeProject = generated.projects?.find(
  (project) => project.private === true || project.visibility === "private",
);
if (unsafeProject) {
  throw new Error("생성 데이터에 비공개 저장소 정보가 포함되어 있습니다.");
}

const files = await listFiles(distDirectory);
const currentToken = process.env.GITHUB_TOKEN;
const forbiddenMarkers = [
  "VITE_GITHUB_TOKEN",
  "github_pat_",
  "ghp_",
  "gho_",
  "ghs_",
  "ghu_",
  "ghr_",
];

for (const filePath of files) {
  if (!textExtensions.has(path.extname(filePath))) continue;
  const content = await fs.readFile(filePath, "utf8");
  if (forbiddenMarkers.some((marker) => content.includes(marker))) {
    throw new Error(`클라이언트 빌드에 금지된 토큰 표식이 있습니다: ${path.relative(root, filePath)}`);
  }
  if (currentToken && currentToken.length >= 20 && content.includes(currentToken)) {
    throw new Error(`클라이언트 빌드에 GitHub 토큰이 포함되어 있습니다: ${path.relative(root, filePath)}`);
  }
}

console.log(`[security] 공개 프로젝트 ${generated.projects.length}개와 dist 토큰 노출 검사를 통과했습니다.`);
