import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontDirectory = path.join(
  root,
  "node_modules/pretendard/dist/public/static",
);
const regularFont = path.join(fontDirectory, "Pretendard-Regular.otf");
const semiboldFont = path.join(fontDirectory, "Pretendard-SemiBold.otf");
const boldFont = path.join(fontDirectory, "Pretendard-Bold.otf");
const site = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/site-config.json"), "utf8"),
);
if (
  typeof site.ogImage !== "string" ||
  !/^[a-z0-9][a-z0-9._-]*\.png$/i.test(site.ogImage)
) {
  throw new Error(
    "[og] site-config.json의 ogImage에는 public 폴더 안의 PNG 파일명만 입력하세요.",
  );
}
for (const field of ["siteName", "englishLabel", "tagline"]) {
  if (typeof site[field] !== "string" || site[field].trim() === "") {
    throw new Error(`[og] site-config.json의 ${field} 값이 비어 있습니다.`);
  }
}
const [titleTop, ...titleRest] = site.siteName.trim().split(/\s+/);
const titleBottom = titleRest.join(" ");
const publicDirectory = path.resolve(root, "public");
const output = path.resolve(publicDirectory, site.ogImage);
if (path.dirname(output) !== publicDirectory) {
  throw new Error("[og] 공유 이미지는 public 폴더 바로 아래에만 만들 수 있습니다.");
}
const legacyOutput = path.join(publicDirectory, "og-image.png");

const args = [
  "-size",
  "1200x630",
  "xc:#F4F2EC",
  "-fill",
  "#FAF9F5",
  "-stroke",
  "#2025221F",
  "-strokewidth",
  "1",
  "-draw",
  "roundrectangle 730,78 1110,552 22,22",
  "-fill",
  "none",
  "-stroke",
  "#20252212",
  "-draw",
  "path 'M 785,78 L 785,552 M 840,78 L 840,552 M 895,78 L 895,552 M 950,78 L 950,552 M 1005,78 L 1005,552 M 1060,78 L 1060,552 M 730,133 L 1110,133 M 730,188 L 1110,188 M 730,243 L 1110,243 M 730,298 L 1110,298 M 730,353 L 1110,353 M 730,408 L 1110,408 M 730,463 L 1110,463 M 730,518 L 1110,518'",
  "-stroke",
  "#66766A52",
  "-draw",
  "circle 920,283 920,145 circle 920,283 920,205 path 'M 810,205 L 1008,181 L 1042,356 L 850,420 Z M 810,205 L 1042,356'",
  "-fill",
  "#66766A",
  "-stroke",
  "#FAF9F5",
  "-strokewidth",
  "5",
  "-draw",
  "circle 810,205 810,193 circle 1008,181 1008,167",
  "-fill",
  "#8A6D55",
  "-draw",
  "circle 1042,356 1042,343",
  "-fill",
  "#718294",
  "-draw",
  "circle 850,420 850,407",
  "-fill",
  "#202522",
  "-stroke",
  "none",
  "-draw",
  "circle 920,283 920,276",
  "-stroke",
  "#8A6D55",
  "-strokewidth",
  "2",
  "-draw",
  "path 'M 690,155 L 718,155 M 704,141 L 704,169'",
  "-stroke",
  "none",
  "-font",
  regularFont,
  "-pointsize",
  "24",
  "-fill",
  "#46554A",
  "-kerning",
  "1",
  "-annotate",
  "+88+132",
  site.englishLabel,
  "-font",
  boldFont,
  "-pointsize",
  "82",
  "-fill",
  "#202522",
  "-kerning",
  "-3",
  "-annotate",
  "+84+286",
  titleTop,
  "-annotate",
  "+84+382",
  titleBottom,
  "-fill",
  "#66766A",
  "-draw",
  "roundrectangle 90,414 158,420 3,3",
  "-font",
  regularFont,
  "-pointsize",
  "30",
  "-fill",
  "#46554A",
  "-kerning",
  "-1",
  "-annotate",
  "+88+482",
  site.tagline,
  "-font",
  semiboldFont,
  "-pointsize",
  "17",
  "-fill",
  "#68716C",
  "-kerning",
  "1",
  "-annotate",
  "+762+522",
  "ARCHIVE · CONNECTED COORDINATES",
  "-strip",
  "-depth",
  "8",
  "-define",
  "png:compression-level=9",
  output,
];

try {
  execFileSync("magick", args, { stdio: "inherit" });
  if (output !== legacyOutput) fs.copyFileSync(output, legacyOutput);
  console.log(`[og] 1200×630 공유 이미지 생성 완료: ${output}`);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error("[og] ImageMagick의 magick 명령을 찾지 못했습니다. 기존 PNG는 그대로 사용할 수 있습니다.");
  }
  process.exitCode = 1;
}
