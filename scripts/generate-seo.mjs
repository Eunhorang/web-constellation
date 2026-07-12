import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function withTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

const site = JSON.parse(
  await fs.readFile(path.join(root, "src/data/site-config.json"), "utf8"),
);
const generated = JSON.parse(
  await fs.readFile(path.join(root, "src/data/projects.generated.json"), "utf8"),
);
const siteUrl = withTrailingSlash(process.env.SITE_URL?.trim() || site.canonicalUrl);
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
