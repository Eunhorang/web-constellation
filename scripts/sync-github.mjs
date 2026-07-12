import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  chooseGitHubUsername,
  collectGitHubData,
} from "./github-sync-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedPath = path.join(root, "src/data/projects.generated.json");
const overridesPath = path.join(root, "src/data/project-overrides.json");
const siteConfigPath = path.join(root, "src/data/site-config.json");

async function readJson(filePath, { optional = false, fallback = null } = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (optional && error?.code === "ENOENT") return fallback;
    const relativePath = path.relative(root, filePath);
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${relativePath}을(를) 읽을 수 없습니다. JSON 문법과 파일 권한을 확인하세요. ${reason}`);
  }
}

function runQuietly(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

function validateInputs(siteConfig, overrides) {
  if (!siteConfig || typeof siteConfig !== "object" || Array.isArray(siteConfig)) {
    throw new Error("site-config.json은 JSON 객체여야 합니다.");
  }
  if (!Array.isArray(overrides)) {
    throw new Error("project-overrides.json은 프로젝트 설정 목록이어야 합니다.");
  }
  const repositories = new Set();
  overrides.forEach((override, index) => {
    if (!override || typeof override !== "object" || typeof override.repo !== "string" || !override.repo.trim()) {
      throw new Error(`project-overrides.json의 ${index + 1}번째 항목에 repo가 없습니다.`);
    }
    const key = override.repo.trim().toLowerCase();
    if (repositories.has(key)) {
      throw new Error(`project-overrides.json에 ${override.repo} 설정이 두 번 들어 있습니다.`);
    }
    repositories.add(key);
  });
}

async function main() {
  const [siteConfig, overrides, previousCache] = await Promise.all([
    readJson(siteConfigPath),
    readJson(overridesPath),
    readJson(generatedPath, { optional: true, fallback: null }),
  ]);
  validateInputs(siteConfig, overrides);

  const username = chooseGitHubUsername({
    environmentUsername: process.env.GITHUB_USERNAME,
    cliUsername: runQuietly("gh", ["api", "user", "--jq", ".login"]),
    remoteUrl: runQuietly("git", ["remote", "get-url", "origin"]),
    configuredUsername: siteConfig.githubUsername,
  });
  const apiToken =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    runQuietly("gh", ["auth", "token"]);

  if (!username) {
    console.warn(
      "[sync] GitHub 사용자명을 확인할 수 없습니다. .env.local 또는 site-config.json을 확인하세요.",
    );
    return;
  }

  const result = await collectGitHubData({
    username,
    token: apiToken,
    overrides,
    previousCache,
    onWarning: (message) => console.warn(`[sync] ${message}`),
  });

  if (result.shouldWrite) {
    await writeJsonAtomically(generatedPath, result.data);
  }

  const mode = result.usedCache ? "캐시 사용" : "GitHub 동기화 완료";
  console.log(`[sync] ${mode}: 공개 프로젝트 ${result.data.projects.length}개`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sync] ${message}`);
  process.exitCode = 1;
});
