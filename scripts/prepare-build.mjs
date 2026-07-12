import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runScript(name) {
  const result = spawnSync(npmCommand, ["run", name], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

if (process.env.SKIP_GITHUB_SYNC !== "true") {
  runScript("sync");
}
runScript("generate:seo");
