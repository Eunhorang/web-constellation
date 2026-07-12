import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function withTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function validateSiteUrl(value, label, rootOnly = false) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("http 또는 https 주소가 아닙니다.");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("사용자 정보, 검색어 또는 # 조각을 포함할 수 없습니다.");
    }
    if (rootOnly && url.pathname !== "/") {
      throw new Error("도메인에는 하위 경로를 넣지 마세요.");
    }
    return withTrailingSlash(url.href);
  } catch (error) {
    throw new Error(`[seo] ${label} 값 '${value}'이(가) 올바르지 않습니다. ${error.message}`);
  }
}

const site = JSON.parse(
  await fs.readFile(path.join(root, "src/data/site-config.json"), "utf8"),
);
const generated = JSON.parse(
  await fs.readFile(path.join(root, "src/data/projects.generated.json"), "utf8"),
);
const customDomain = process.env.CUSTOM_DOMAIN?.trim();
const customDomainUrl = customDomain
  ? validateSiteUrl(
      /^https?:\/\//i.test(customDomain) ? customDomain : `https://${customDomain}`,
      "CUSTOM_DOMAIN",
      true,
    )
  : null;
const siteUrl = validateSiteUrl(
  process.env.SITE_URL?.trim() || customDomainUrl || site.canonicalUrl,
  "SITE_URL",
);
const lastModified = String(generated.generatedAt || new Date().toISOString()).slice(
  0,
  10,
);
const publicDirectory = path.join(root, "public");

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

await fs.mkdir(publicDirectory, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(publicDirectory, "robots.txt"), robots, "utf8"),
  fs.writeFile(path.join(publicDirectory, "sitemap.xml"), sitemap, "utf8"),
]);

console.log(`[seo] robots.txt와 sitemap.xml 생성 완료: ${siteUrl}`);
