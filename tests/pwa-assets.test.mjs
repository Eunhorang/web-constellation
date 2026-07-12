import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(root, "public");
const manifest = JSON.parse(
  fs.readFileSync(path.join(publicDirectory, "site.webmanifest"), "utf8"),
);
const siteConfig = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/site-config.json"), "utf8"),
);
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

function pngInfo(relativePath) {
  const buffer = fs.readFileSync(path.join(publicDirectory, relativePath));
  return {
    signature: buffer.subarray(0, 8).toString("hex"),
    chunkType: buffer.subarray(12, 16).toString("ascii"),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
    hasTransparencyChunk: buffer.includes(Buffer.from("tRNS")),
  };
}

describe("모바일 홈 화면 아이콘", () => {
  it("사이트 이름과 GitHub Pages용 상대 경로를 manifest에 사용한다", () => {
    expect(manifest.name).toBe(siteConfig.siteName);
    expect(manifest.description).toBe(siteConfig.description);
    expect(manifest).toMatchObject({
      short_name: "은호랑 별자리",
      id: "./",
      start_url: "./",
      scope: "./",
      display: "standalone",
      background_color: "#F4F2EC",
      theme_color: "#F4F2EC",
    });
    expect(
      manifest.icons.every(
        (icon) =>
          !icon.src.startsWith("/") &&
          !icon.src.includes("..") &&
          !icon.src.includes("%BASE_URL%"),
      ),
    ).toBe(true);
  });

  it.each([
    ["favicon-32x32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icons/icon-192.png", 192],
    ["icons/icon-512.png", 512],
    ["icons/icon-maskable-512.png", 512],
  ])("%s을 필요한 크기의 불투명 PNG로 제공한다", (relativePath, size) => {
    const info = pngInfo(relativePath);
    expect(info).toMatchObject({
      signature: "89504e470d0a1a0a",
      chunkType: "IHDR",
      width: size,
      height: size,
      hasTransparencyChunk: false,
    });
    expect([4, 6]).not.toContain(info.colorType);
  });

  it("HTML에 iPhone·Android용 아이콘 설정을 Pages 하위 경로 형식으로 연결한다", () => {
    expect(indexHtml).toContain('href="%BASE_URL%site.webmanifest"');
    expect(indexHtml).toContain('href="%BASE_URL%apple-touch-icon.png"');
    expect(indexHtml).toContain('href="%BASE_URL%favicon-32x32.png"');
  });
});
