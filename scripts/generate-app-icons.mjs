import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public/favicon.svg");
const iconDirectory = path.join(root, "public/icons");
const targets = [
  [32, path.join(root, "public/favicon-32x32.png")],
  [180, path.join(root, "public/apple-touch-icon.png")],
  [192, path.join(iconDirectory, "icon-192.png")],
  [512, path.join(iconDirectory, "icon-512.png")],
  [512, path.join(iconDirectory, "icon-maskable-512.png")],
];

if (!fs.existsSync(source)) {
  throw new Error("[icons] public/favicon.svg 파일이 없습니다.");
}
fs.mkdirSync(iconDirectory, { recursive: true });

try {
  for (const [size, output] of targets) {
    execFileSync(
      "magick",
      [
        "-density",
        "768",
        source,
        "-background",
        "#F4F2EC",
        "-alpha",
        "remove",
        "-alpha",
        "off",
        "-resize",
        `${size}x${size}`,
        "-strip",
        "-depth",
        "8",
        "-define",
        "png:compression-level=9",
        output,
      ],
      { stdio: "inherit" },
    );
  }
  console.log("[icons] 32·180·192·512px 홈 화면 아이콘 생성 완료");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(
      "[icons] ImageMagick의 magick 명령을 찾지 못했습니다. Mac에서 brew install imagemagick을 먼저 실행하세요.",
    );
  }
  process.exitCode = 1;
}
