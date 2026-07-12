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

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
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

const [siteConfig, overrides, previousCache] = await Promise.all([
  readJson(siteConfigPath, {}),
  readJson(overridesPath, []),
  readJson(generatedPath, null),
]);

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
  process.exitCode = 0;
} else {
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
